import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { eq, desc, count, sql } from "drizzle-orm";

import { createServer, type Server } from "http";
import { storage } from "./lib/storage";
import { setupAuth, isAuthenticated } from "./localAuth";

// Define authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}
import {
  insertCategorySchema,
  insertProductSchema,
  insertInventoryItemSchema,
  insertOrderSchema,
  insertProductionScheduleItemSchema,
  insertCustomerSchema,
  insertPartySchema,
  insertAssetSchema,
  insertExpenseSchema,
  loginLogs,
  ledgerTransactions,
  auditLogs,
} from "@shared/schema";
import {
  notifyNewPublicOrder,
  getNotificationRecipients,
} from "./notifications";
import { format } from "date-fns";
import { db } from "./db";
import { requirePermission, requireRead, requireWrite, requireReadWrite, requireSuperAdmin } from "./permissionMiddleware";
import { unitConverter } from "./lib/unitConversion";

// Audit logging middleware
const auditLogger = (action: string, resource: string) => {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData: any;
    let oldValues: any;
    
    // Capture old values for updates
    if (action === 'UPDATE' && req.params.id) {
      try {
        const resourceId = parseInt(req.params.id);
        switch (resource) {
          case 'staff':
            oldValues = await storage.getStaffById(resourceId);
            break;
          case 'product':
            oldValues = await storage.getProductById(resourceId);
            break;
          case 'customer':
            oldValues = await storage.getCustomerById(resourceId);
            break;
          // Add more resources as needed
        }
      } catch (error) {
        console.warn('Failed to capture old values for audit log:', error);
      }
    }

    // Override response methods to capture response data
    res.send = function(data: any) {
      responseData = data;
      return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue with the request
    res.on('finish', async () => {
      try {
        if (req.user && res.statusCode < 400) {
          const auditLogData = {
            userId: req.user.id,
            userEmail: req.user.email,
            userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            action,
            resource,
            resourceId: req.params.id || (responseData?.id ? responseData.id.toString() : null),
            details: {
              method: req.method,
              url: req.originalUrl,
              body: action !== 'READ' ? req.body : undefined,
              query: req.query,
            },
            oldValues: oldValues || null,
            newValues: action !== 'DELETE' ? responseData : null,
            ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
            userAgent: req.get('User-Agent') || null,
            status: res.statusCode < 400 ? 'success' : 'failed',
          };

          await storage.createAuditLog(auditLogData);
        }
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    });

    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🔧 Setting up routes...");

  // Database test endpoint (remove in production)
  app.get("/api/test/db", async (req, res) => {
    try {
      console.log("🔍 Testing database connection...");

      // Test database connection
      const testUsers = await storage.getAllUsers();
      console.log("✅ Database connected. Found", testUsers.length, "users");

      // Ensure default users exist
      await storage.ensureDefaultAdmin();

      res.json({
        success: true,
        message: "Database is working",
        userCount: testUsers.length,
        users: testUsers.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
        })),
      });
    } catch (error) {
      console.error("❌ Database test failed:", error);
      res.status(500).json({
        success: false,
        message: "Database test failed",
        error: error.message,
      });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Media management routes
  app.get("/api/media", isAuthenticated, async (req, res) => {
    try {
      const images = await storage.getMediaItems();
      res.json(images);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.post("/api/media/upload", isAuthenticated, async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const file = Array.isArray(req.files.image)
        ? req.files.image[0]
        : req.files.image;

      // Validate file type
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File must be an image" });
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return res
          .status(400)
          .json({ message: "File size must be less than 5MB" });
      }

      const mediaItem = await storage.uploadMedia(file, req.user.id);
      res.json(mediaItem);
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.delete("/api/media/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteMedia(id);
      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent orders for dashboard
  app.get("/api/dashboard/recent-orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getRecentOrders(5);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      res.status(500).json({ message: "Failed to fetch recent orders" });
    }
  });

  // Today's production schedule
  app.get(
    "/api/dashboard/production-schedule",
    isAuthenticated,
    async (req, res) => {
      try {
        const schedule = await storage.getTodayProductionSchedule();
        res.json(schedule);
      } catch (error) {
        console.error("Error fetching production schedule:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch production schedule" });
      }
    },
  );

  // Get production schedule by date
  app.get(
    "/api/production-schedule",
    isAuthenticated,
    async (req, res) => {
      try {
        const { date } = req.query;
        let schedule;
        
        if (date) {
          schedule = await storage.getProductionScheduleByDate(date as string);
        } else {
          schedule = await storage.getProductionSchedule();
        }
        
        res.json(schedule);
      } catch (error) {
        console.error("Error fetching production schedule:", error);
        res.status(500).json({ message: "Failed to fetch production schedule" });
      }
    },
  );

  // Low stock items
  app.get("/api/dashboard/low-stock", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Categories
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      // Transform the data
      const transformedData = {
        name: req.body.name.trim(),
        description: req.body.description ? req.body.description.trim() : null,
      };

      console.log("Creating category with data:", transformedData);
      const category = await storage.createCategory(transformedData);
      console.log("Category created successfully:", category);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({
        message: "Failed to create category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Products
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProductsWithIngredients();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      const ingredients = await storage.getProductIngredients(id);
      res.json({ ...product, ingredients });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      const { ingredients, ...productData } = req.body;

      // Ensure required fields are present
      if (!productData.name) {
        return res.status(400).json({ message: "Product name is required" });
      }

      if (!productData.price || isNaN(parseFloat(productData.price))) {
        return res.status(400).json({ message: "Valid price is required" });
      }

      if (!productData.cost || isNaN(parseFloat(productData.cost))) {
        return res.status(400).json({ message: "Valid cost is required" });
      }

      if (!productData.margin || isNaN(parseFloat(productData.margin))) {
        return res.status(400).json({ message: "Valid margin is required" });
      }

      // Transform the data
      const transformedData = {
        name: productData.name.trim(),
        description: productData.description || null,
        categoryId: productData.categoryId || null,
        price: parseFloat(productData.price).toString(),
        cost: parseFloat(productData.cost).toString(),
        margin: parseFloat(productData.margin).toString(),
        sku: productData.sku || null,
        isActive: true,
      };

      console.log("Creating product with data:", transformedData);

      const product = await storage.createProduct(transformedData);

      // Add ingredients if provided
      if (ingredients && ingredients.length > 0) {
        for (const ingredient of ingredients) {
          await storage.createProductIngredient({
            productId: product.id,
            inventoryItemId: ingredient.inventoryItemId,
            quantity: ingredient.quantity,
          });
        }
      }

      console.log("Product created successfully:", product);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { ingredients, ...productData } = req.body;

      const product = await storage.updateProduct(id, productData);

      // Update ingredients if provided
      if (ingredients) {
        await storage.deleteProductIngredients(id);
        for (const ingredient of ingredients) {
          await storage.createProductIngredient({
            productId: id,
            inventoryItemId: ingredient.inventoryItemId,
            quantity: ingredient.quantity,
          });
        }
      }

      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Calculate product cost with unit conversions
  app.get("/api/products/:id/calculate-cost", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const costCalculation = await unitConverter.calculateProductCost(productId);
      res.json(costCalculation);
    } catch (error) {
      console.error("Error calculating product cost:", error);
      res.status(500).json({ message: "Failed to calculate product cost" });
    }
  });

  // Update product cost automatically
  app.post("/api/products/:id/update-cost", isAuthenticated, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      await unitConverter.updateProductCost(productId);
      res.json({ message: "Product cost updated successfully" });
    } catch (error) {
      console.error("Error updating product cost:", error);
      res.status(500).json({ message: "Failed to update product cost" });
    }
  });

  // Units
  app.get("/api/units", isAuthenticated, async (req, res) => {
    try {
      const units = await storage.getUnits();
      // Ensure we always return an array with proper structure
      const unitsArray = Array.isArray(units) ? units : [];
      console.log("Fetched units:", unitsArray.length, "units");
      
      // Return consistent response format
      res.json({
        success: true,
        data: unitsArray,
        count: unitsArray.length
      });
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch units",
        error: error instanceof Error ? error.message : "Unknown error",
        data: []
      });
    }
  });

  app.post("/api/units", isAuthenticated, async (req, res) => {
    try {
      if (!req.body.name?.trim()) {
        return res.status(400).json({ message: "Unit name is required" });
      }
      if (!req.body.abbreviation?.trim()) {
        return res.status(400).json({ message: "Unit abbreviation is required" });
      }
      if (!req.body.type?.trim()) {
        return res.status(400).json({ message: "Unit type is required" });
      }

      const transformedData = {
        name: req.body.name.trim(),
        abbreviation: req.body.abbreviation.trim(),
        type: req.body.type.trim(),
        isActive: true,
      };

      // Check if unit with same name or abbreviation already exists
      const existingUnits = await storage.getUnits();
      const duplicateName = existingUnits.find(
        (unit: any) => unit.name.toLowerCase() === transformedData.name.toLowerCase()
      );
      const duplicateAbbr = existingUnits.find(
        (unit: any) => unit.abbreviation.toLowerCase() === transformedData.abbreviation.toLowerCase()
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: `Unit name "${transformedData.name}" already exists` });
      }
      if (duplicateAbbr) {
        return res.status(400).json({ message: `Unit abbreviation "${transformedData.abbreviation}" already exists` });
      }

      const unit = await storage.createUnit(transformedData);
      console.log("Unit created successfully:", unit);
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating unit:", error);
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        res.status(400).json({ message: "A unit with this name or abbreviation already exists" });
      } else {
        res.status(500).json({ 
          message: "Failed to create unit",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.put("/api/units/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // If only updating isActive status
      if (
        req.body.hasOwnProperty("isActive") &&
        Object.keys(req.body).length === 1
      ) {
        const transformedData = {
          isActive: req.body.isActive,
        };
        const unit = await storage.updateUnit(id, transformedData);
        res.json(unit);
        return;
      }

      // Full unit update validation
      if (!req.body.name) {
        return res.status(400).json({ message: "Unit name is required" });
      }
      if (!req.body.abbreviation) {
        return res
          .status(400)
          .json({ message: "Unit abbreviation is required" });
      }
      if (!req.body.type) {
        return res.status(400).json({ message: "Unit type is required" });
      }

      const transformedData = {
        name: req.body.name.trim(),
        abbreviation: req.body.abbreviation.trim(),
        type: req.body.type.trim(),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      const unit = await storage.updateUnit(id, transformedData);
      res.json(unit);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUnit(id);
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // Inventory Categories
  app.get("/api/inventory-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getInventoryCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      res.status(500).json({ message: "Failed to fetch inventory categories" });
    }
  });

  app.post("/api/inventory-categories", isAuthenticated, async (req, res) => {
    try {
      if (!req.body.name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const transformedData = {
        name: req.body.name.trim(),
        description: req.body.description ? req.body.description.trim() : null,
      };

      const category = await storage.createInventoryCategory(transformedData);
      res.json(category);
    } catch (error) {
      console.error("Error creating inventory category:", error);
      res.status(500).json({ message: "Failed to create inventory category" });
    }
  });

  app.put(
    "/api/inventory-categories/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);

        if (!req.body.name) {
          return res.status(400).json({ message: "Category name is required" });
        }

        const transformedData = {
          name: req.body.name.trim(),
          description: req.body.description
            ? req.body.description.trim()
            : null,
        };

        const category = await storage.updateInventoryCategory(
          id,
          transformedData,
        );
        res.json(category);
      } catch (error) {
        console.error("Error updating inventory category:", error);
        res
          .status(500)
          .json({ message: "Failed to update inventory category" });
      }
    },
  );

  app.delete(
    "/api/inventory-categories/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteInventoryCategory(id);
        res.json({ message: "Inventory category deleted successfully" });
      } catch (error) {
        console.error("Error deleting inventory category:", error);
        res
          .status(500)
          .json({ message: "Failed to delete inventory category" });
      }
    },
  );

  

  // Unit Conversions
  app.get("/api/unit-conversions", isAuthenticated, async (req, res) => {
    try {
      const conversions = await storage.getUnitConversions();
      res.json(conversions);
    } catch (error) {
      console.error("Error fetching unit conversions:", error);
      res.status(500).json({ message: "Failed to fetch unit conversions" });
    }
  });

  app.post("/api/unit-conversions", isAuthenticated, async (req, res) => {
    try {
      if (!req.body.fromUnitId || !req.body.toUnitId || !req.body.conversionFactor) {
        return res.status(400).json({ message: "From unit, to unit, and conversion factor are required" });
      }

      const transformedData = {
        fromUnitId: parseInt(req.body.fromUnitId),
        toUnitId: parseInt(req.body.toUnitId),
        conversionFactor: req.body.conversionFactor.toString(),
        formula: req.body.formula || null,
        isActive: true,
      };

      const conversion = await storage.createUnitConversion(transformedData);
      res.json(conversion);
    } catch (error) {
      console.error("Error creating unit conversion:", error);
      res.status(500).json({
        message: "Failed to create unit conversion",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/unit-conversions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transformedData = {
        fromUnitId: parseInt(req.body.fromUnitId),
        toUnitId: parseInt(req.body.toUnitId),
        conversionFactor: req.body.conversionFactor.toString(),
        formula: req.body.formula || null,
        isActive: req.body.isActive ?? true,
      };

      const conversion = await storage.updateUnitConversion(id, transformedData);
      res.json(conversion);
    } catch (error) {
      console.error("Error updating unit conversion:", error);
      res.status(500).json({ message: "Failed to update unit conversion" });
    }
  });

  app.delete("/api/unit-conversions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUnitConversion(id);
      res.json({ message: "Unit conversion deleted successfully" });
    } catch (error) {
      console.error("Error deleting unit conversion:", error);
      res.status(500).json({ message: "Failed to delete unit conversion" });
    }
  });

  // Inventory
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Ingredients (filtered inventory items suitable for recipes)
  app.get("/api/ingredients", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();

      // Filter items that are suitable as ingredients
      const ingredients = items.filter((item: any) => 
        item.name && (
          item.group === 'raw-materials' || 
          item.group === 'ingredients' || 
          item.group === 'flour' ||
          item.group === 'dairy' ||
          item.group === 'sweeteners' ||
          item.group === 'spices' ||
          item.group === 'leavening' ||
          item.group === 'extracts' ||
          item.group === 'chocolate' ||
          item.group === 'nuts' ||
          item.group === 'fruits' ||
          !item.group || 
          item.name.toLowerCase().includes('flour') ||
          item.name.toLowerCase().includes('sugar') ||
          item.name.toLowerCase().includes('butter') ||
          item.name.toLowerCase().includes('milk') ||
          item.name.toLowerCase().includes('egg') ||
          item.name.toLowerCase().includes('chocolate') ||
          item.name.toLowerCase().includes('vanilla') ||
          item.name.toLowerCase().includes('salt') ||
          item.name.toLowerCase().includes('baking')
        )
      );

      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ message: "Failed to fetch ingredients" });
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Item name is required" });
      }

      if (!req.body.currentStock || isNaN(parseFloat(req.body.currentStock))) {
        return res
          .status(400)
          .json({ message: "Valid current stock is required" });
      }

      if (!req.body.minLevel || isNaN(parseFloat(req.body.minLevel))) {
        return res
          .status(400)
          .json({ message: "Valid minimum level is required" });
      }

      // Check for either unit or unitId
      if (!req.body.unit && !req.body.unitId) {
        return res.status(400).json({ message: "Unit is required" });
      }

      if (!req.body.costPerUnit || isNaN(parseFloat(req.body.costPerUnit))) {
        return res
          .status(400)
          .json({ message: "Valid cost per unit is required" });
      }

      // Transform the data
      const transformedData = {
        name: req.body.name.trim(),
        currentStock: parseFloat(req.body.currentStock).toString(),
        minLevel: parseFloat(req.body.minLevel).toString(),
        unit: req.body.unit ? req.body.unit.trim() : "pcs",
        unitId: req.body.unitId ? parseInt(req.body.unitId) : null,
        costPerUnit: parseFloat(req.body.costPerUnit).toString(),
        previousQuantity: req.body.previousQuantity
          ? parseFloat(req.body.previousQuantity).toString()
          : "0",
        previousAmount: req.body.previousAmount
          ? parseFloat(req.body.previousAmount).toString()
          : "0",
        defaultPrice: req.body.defaultPrice
          ? parseFloat(req.body.defaultPrice).toString()
          : "0",
        group: req.body.group ? req.body.group.trim() : null,
        openingQuantity: req.body.openingQuantity
          ? parseFloat(req.body.openingQuantity).toString()
          : parseFloat(req.body.currentStock).toString(),
        openingRate: req.body.openingRate
          ? parseFloat(req.body.openingRate).toString()
          : parseFloat(req.body.costPerUnit).toString(),
        openingValue: req.body.openingValue
          ? parseFloat(req.body.openingValue).toString()
          : "0",
        supplier: req.body.supplier ? req.body.supplier.trim() : null,
        company: req.body.company ? req.body.company.trim() : null,
        location: req.body.location ? req.body.location.trim() : null,
        notes: req.body.notes ? req.body.notes.trim() : null,
        dateAdded: req.body.dateAdded
          ? new Date(req.body.dateAdded)
          : new Date(),
        lastRestocked: req.body.lastRestocked
          ? new Date(req.body.lastRestocked)
          : new Date(),
      };

      console.log("Creating inventory item with data:", transformedData);
      const item = await storage.createInventoryItem(transformedData);
      console.log("Inventory item created successfully:", item);
      res.json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({
        message: "Failed to create inventory item",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateInventoryItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInventoryItem(id);
      res.json({ message: "Inventory item deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      const items = await storage.getOrderItems(id);
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!orderData.customerName) {
        return res.status(400).json({ message: "Customer name is required" });
      }

      if (!orderData.totalAmount || isNaN(parseFloat(orderData.totalAmount))) {
        return res
          .status(400)
          .json({ message: "Valid total amount is required" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order items are required" });
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Transform the data
      const transformedData = {
        orderNumber,
        customerName: orderData.customerName.trim(),
        customerEmail: orderData.customerEmail
          ? orderData.customerEmail.trim()
          : null,
        customerPhone: orderData.customerPhone
          ? orderData.customerPhone.trim()
          : null,
        status: orderData.status || "pending",
        totalAmount: parseFloat(orderData.totalAmount).toString(),
        paymentMethod: orderData.paymentMethod || "cash",
        orderDate: orderData.orderDate
          ? new Date(orderData.orderDate)
          : new Date(),
        dueDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
        notes: orderData.notes ? orderData.notes.trim() : null,
        createdBy: userId,
      };

      console.log("Creating order with data:", transformedData);
      const order = await storage.createOrder(transformedData);

      // Add order items with unit information
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          throw new Error("Invalid order item data");
        }

        // Get product details to fetch unit information
        const product = await storage.getProductById(parseInt(item.productId));
        
        await storage.createOrderItem({
          orderId: order.id,
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          unit: product?.unit || item.unit || null,
          unitId: product?.unitId || item.unitId || null,
          unitPrice: parseFloat(item.unitPrice).toString(),
          totalPrice: (
            parseInt(item.quantity) * parseFloat(item.unitPrice)
          ).toString(),
        });
      }

      console.log("Order created successfully:", order);
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.updateOrder(id, req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Production schedule
  app.get("/api/production", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getProductionSchedule();
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching production schedule:", error);
      res.status(500).json({ message: "Failed to fetch production schedule" });
    }
  });

  app.post("/api/production", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Validate required fields
      if (!req.body.productId) {
        return res.status(400).json({ message: "Product is required" });
      }

      if (!req.body.quantity || isNaN(parseInt(req.body.quantity))) {
        return res.status(400).json({ message: "Valid quantity is required" });
      }

      if (!req.body.scheduledDate) {
        return res.status(400).json({ message: "Scheduled date is required" });
      }

      // Transform the data
      const transformedData = {
        productId: parseInt(req.body.productId),
        quantity: parseInt(req.body.quantity),
        scheduledDate: new Date(req.body.scheduledDate),
        startTime: req.body.startTime ? new Date(req.body.startTime) : null,
        endTime: req.body.endTime ? new Date(req.body.endTime) : null,
        status: req.body.status || "scheduled",
        assignedTo: req.body.assignedTo || userId,
        notes: req.body.notes ? req.body.notes.trim() : null,
      };

      console.log(
        "Creating production schedule item with data:",
        transformedData,
      );
      const item = await storage.createProductionScheduleItem(transformedData);
      console.log("Production schedule item created successfully:", item);
      res.json(item);
    } catch (error) {
      console.error("Error creating production schedule item:", error);
      res.status(500).json({
        message: "Failed to create production schedule item",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/production/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateProductionScheduleItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating production schedule item:", error);
      res
        .status(500)
        .json({ message: "Failed to update production schedule item" });
    }
  });

  // Analytics
  app.get("/api/analytics/sales", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analytics = await storage.getSalesAnalytics(start, end);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({ 
          message: "Customer name is required",
          errors: { name: "Customer name is required" }
        });
      }

      // Transform the data with proper field mapping
      const transformedData = {
        name: req.body.name.trim(),
        email: req.body.email ? req.body.email.trim() : null,
        phone: req.body.phone ? req.body.phone.trim() : null,
        address: req.body.address ? req.body.address.trim() : null,
        openingBalance: req.body.openingBalance && !isNaN(parseFloat(req.body.openingBalance))
          ? parseFloat(req.body.openingBalance).toString()
          : "0.00",
        currentBalance: req.body.openingBalance && !isNaN(parseFloat(req.body.openingBalance))
          ? parseFloat(req.body.openingBalance).toString()
          : "0.00",
        totalOrders: 0,
        totalSpent: "0.00",
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      console.log("Creating customer with data:", transformedData);
      const customer = await storage.createCustomer(transformedData);
      console.log("Customer created successfully:", customer);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      
      // Handle specific database errors
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        res.status(400).json({
          message: "A customer with this name or email already exists",
          error: "Duplicate entry"
        });
      } else if (error.message?.includes('not null constraint')) {
        res.status(400).json({
          message: "Required fields are missing",
          error: error.message
        });
      } else {
        res.status(500).json({
          message: "Failed to create customer",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  app.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.updateCustomer(id, req.body);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Party routes
  app.get("/api/parties", isAuthenticated, async (req, res) => {
    try {
      const parties = await storage.getParties();
      res.json(parties);
    } catch (error) {
      console.error("Error fetching parties:", error);
      res.status(500).json({ message: "Failed to fetch parties" });
    }
  });

  app.post("/api/parties", isAuthenticated, async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({ 
          message: "Party name is required",
          errors: { name: "Party name is required" }
        });
      }

      if (!req.body.type || !req.body.type.trim()) {
        return res.status(400).json({ 
          message: "Party type is required",
          errors: { type: "Party type is required" }
        });
      }

      // Transform the data with proper field mapping
      const transformedData = {
        name: req.body.name.trim(),
        type: req.body.type.trim(),
        contactPerson: req.body.contactPerson ? req.body.contactPerson.trim() : null,
        email: req.body.email ? req.body.email.trim() : null,
        phone: req.body.phone ? req.body.phone.trim() : null,
        address: req.body.address ? req.body.address.trim() : null,
        taxId: req.body.taxId ? req.body.taxId.trim() : null,
        notes: req.body.notes ? req.body.notes.trim() : null,
        openingBalance: req.body.openingBalance && !isNaN(parseFloat(req.body.openingBalance))
          ? parseFloat(req.body.openingBalance).toString()
          : "0.00",
        currentBalance: req.body.openingBalance && !isNaN(parseFloat(req.body.openingBalance))
          ? parseFloat(req.body.openingBalance).toString()
          : "0.00",
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      console.log("Creating party with data:", transformedData);
      const party = await storage.createParty(transformedData);
      console.log("Party created successfully:", party);
      res.status(201).json(party);
    } catch (error) {
      console.error("Error creating party:", error);
      
      // Handle specific database errors
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        res.status(400).json({
          message: "A party with this name already exists",
          error: "Duplicate entry"
        });
      } else if (error.message?.includes('not null constraint')) {
        res.status(400).json({
          message: "Required fields are missing",
          error: error.message
        });
      } else {
        res.status(500).json({
          message: "Failed to create party",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  app.put("/api/parties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const party = await storage.updateParty(id, req.body);
      res.json(party);
    } catch (error) {
      console.error("Error updating party:", error);
      res.status(500).json({ message: "Failed to update party" });
    }
  });

  app.delete("/api/parties/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteParty(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting party:", error);
      res.status(500).json({ message: "Failed to delete party" });
    }
  });

  // Ledger Transaction Routes
  app.get("/api/ledger/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      if (!['customer', 'party'].includes(entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const transactions = await storage.getLedgerTransactions(
        parseInt(entityId), 
        entityType as 'customer' | 'party'
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching ledger transactions:", error);
      res.status(500).json({ message: "Failed to fetch ledger transactions" });
    }
  });

  // Customer ledger endpoint for compatibility
  app.get("/api/ledger/customer/:id", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const transactions = await storage.getLedgerTransactions(entityId, 'customer');
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching customer ledger:", error);
      res.status(500).json({ message: "Failed to fetch customer ledger" });
    }
  });

  // Party ledger endpoint for compatibility
  app.get("/api/ledger/party/:id", isAuthenticated, async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const transactions = await storage.getLedgerTransactions(entityId, 'party');
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching party ledger:", error);
      res.status(500).json({ message: "Failed to fetch party ledger" });
    }
  });

  app.post("/api/ledger", isAuthenticated, async (req: any, res) => {
    try {
      const {
        customerOrPartyId,
        entityType,
        transactionDate,
        description,
        referenceNumber,
        debitAmount,
        creditAmount,
        transactionType,
        paymentMethod,
        notes,
      } = req.body;

      if (!['customer', 'party'].includes(entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      // Calculate running balance
      const currentTransactions = await storage.getLedgerTransactions(
        customerOrPartyId, 
        entityType
      );

      const lastBalance = currentTransactions.length > 0 
        ? parseFloat(currentTransactions[currentTransactions.length - 1].runningBalance)
        : 0;

      const debit = parseFloat(debitAmount || '0');
      const credit = parseFloat(creditAmount || '0');
      const runningBalance = lastBalance + debit - credit;

      const transactionData = {
        customerOrPartyId,
        entityType,
        transactionDate: new Date(transactionDate),
        description,
        referenceNumber,
        debitAmount: debit.toString(),
        creditAmount: credit.toString(),
        runningBalance: runningBalance.toString(),
        transactionType,
        paymentMethod,
        notes,
        createdBy: req.user?.id,
      };

      const transaction = await storage.createLedgerTransaction(transactionData);

      // Update entity's current balance
      await storage.recalculateRunningBalance(customerOrPartyId, entityType);

      res.json(transaction);
    } catch (error) {
      console.error("Error creating ledger transaction:", error);
      res.status(500).json({ message: "Failed to create ledger transaction" });
    }
  });

  app.put("/api/ledger/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      const transaction = await storage.updateLedgerTransaction(id, updateData);

      // Recalculate running balances for affected entity
      if (transaction.length > 0) {
        await storage.recalculateRunningBalance(
          transaction[0].customerOrPartyId, 
          transaction[0].entityType as 'customer' | 'party'
        );
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error updating ledger transaction:", error);
      res.status(500).json({ message: "Failed to update ledger transaction" });
    }
  });

  app.delete("/api/ledger/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get transaction details before deletion
      const transactionToDelete = await db
        .select()
        .from(ledgerTransactions)
        .where(eq(ledgerTransactions.id, id))
        .limit(1);

      if (transactionToDelete.length === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      await storage.deleteLedgerTransaction(id);

      // Recalculate running balances
      await storage.recalculateRunningBalance(
        transactionToDelete[0].customerOrPartyId, 
        transactionToDelete[0].entityType as 'customer' | 'party'
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ledger transaction:", error);
      res.status(500).json({ message: "Failed to delete ledger transaction" });
    }
  });

  // Assets
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const {
        name,
        category,
        description,
        location,
        condition,
        purchaseDate,
        purchasePrice,
        currentValue,
      } = req.body;

      if (!name || !category) {
        return res.status(400).json({ message: "Name and category are required" });
      }

      const assetData = {
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        condition: condition || "good",
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? purchasePrice.toString() : null,
        currentValue: currentValue ? currentValue.toString() : null,
        isActive: true,
      };

      console.log("Creating asset with data:", assetData);
      const asset = await storage.createAsset(assetData);
      console.log("Asset created successfully:", asset);
      res.json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({
        message: "Failed to create asset",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const {
        name,
        category,
        description,
        location,
        condition,
        purchaseDate,
        purchasePrice,
        currentValue,
      } = req.body;

      const assetData = {
        name: name?.trim(),
        category: category?.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        condition: condition || "good",
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? purchasePrice.toString() : null,
        currentValue: currentValue ? currentValue.toString() : null,
      };

      const asset = await storage.updateAsset(id, assetData);
      res.json(asset);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAsset(id);
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Bills
  app.get("/api/bills", isAuthenticated, async (req, res) => {
    try {
      const bills = await storage.getBills();
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  app.post("/api/bills", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.createBill(req.body);
      res.json(bill);
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(500).json({ message: "Failed to create bill" });
    }
  });

  app.delete("/api/bills/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBill(parseInt(req.params.id));
      res.json({ message: "Bill deleted successfully" });
    } catch (error) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ message: "Failed to delete bill" });
    }
  });

  // Settings
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
      console.log("Updating settings with data:", req.body);

      // Handle theme color specifically
      if (req.body.themeColor) {
        await storage.updateOrCreateSetting("themeColor", req.body.themeColor);
      }

      // Handle other settings
      const settings = await storage.updateSettings(req.body);
      console.log("Updated settings:", settings);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Expense routes
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { description, amount, category, date } = req.body;

      if (!description || !description.trim()) {
        return res
          .status(400)
          .json({ message: "Expense description is required" });
      }

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount).toString(),
        category,
        date: date ? new Date(date) : new Date(),
      };

      console.log("Creating expense with data:", expenseData);
      const expense = await storage.createExpense(expenseData);
      console.log("Expense created successfully:", expense);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({
        message: "Failed to create expense",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { description, amount, category, date } = req.body;

      if (!description || !description.trim()) {
        return res
          .status(400)
          .json({ message: "Expense description is required" });
      }

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount).toString(),
        category,
        date: date ? new Date(date) : new Date(),
      };

      const expense = await storage.updateExpense(id, expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExpense(id);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Admin user management routes
  const isAdmin = (req: any, res: any, next: any) => {
    console.log("Checking admin access for user:", req.user);
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
      return next();
    }
    console.log("Access denied - user role:", req.user?.role);
    res.status(403).json({ message: "Access denied. Admin role required." });
  };

  const isSuperAdmin = (req: any, res: any, next: any) => {
    console.log("Checking superadmin access for user:", req.user);
    if (req.user && req.user.role === "super_admin") {
      return next();
    }
    console.log("Access denied - user role:", req.user?.role);
    res.status(403).json({ message: "Access denied. Super Admin role required." });
  };

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.upsertUser({
        id: `user_${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "staff",
      });

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put(
    "/api/admin/users/:id",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { email, password, firstName, lastName, role } = req.body;

        const updateData: any = {
          email,
          firstName,
          lastName,
          role,
        };

        // Only update password if provided
        if (password) {
          const bcrypt = require("bcrypt");
          updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await storage.updateUser(id, updateData);
        res.json(user);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    },
  );

  app.delete(
    "/api/admin/users/:id",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteUser(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    },
  );

  // Permission management routes
  app.get("/api/permissions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/permissions/role/:role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { role } = req.params;
      const permissions = await storage.getRolePermissions(role);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.put("/api/permissions/role/:role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { role } = req.params;
      const { permissionIds } = req.body;
      await storage.setRolePermissions(role, permissionIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating role permissions:", error);
      res.status(500).json({ message: "Failed to update role permissions" });
    }
  });

  app.get("/api/permissions/user/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  app.put("/api/permissions/user/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { permissionUpdates } = req.body;
      await storage.setUserPermissions(userId, permissionUpdates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  app.get("/api/auth/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Profile management routes
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email, currentPassword, newPassword } =
        req.body;

      const updateData: any = {
        firstName,
        lastName,
        email,
      };

      // If password change is requested, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            message: "Current password is required to change password",
          });
        }
        const user = await storage.getUser(userId);
        const bcrypt = require("bcrypt");
        const isValidPassword = await bcrypt.compare(
          currentPassword,
          user.password || "",
        );
        if (!isValidPassword) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      const user = await storage.updateUser(userId, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const { customerId, items, ...orderData } = req.body;

      console.log("Creating order with data:", {
        customerId,
        items,
        orderData,
      });

      if (!items || items.length === 0) {
        return res
          .status(400)
          .json({ message: "Order must have at least one item" });
      }

      // Calculate total from items
      let calculatedTotal = 0;
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) {
          return res.status(400).json({
            message: "All items must have productId, quantity, and price",
          });
        }
        calculatedTotal += parseFloat(item.price) * parseInt(item.quantity);
      }

      const order = await storage.createOrder({
        customerId: customerId || null,
        status: orderData.status || "pending",
        total: calculatedTotal.toString(),
        notes: orderData.notes || null,
        dueDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
      });

      console.log("Order created:", order);

      // Add order items
      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price).toString(),
        });
      }

      console.log("Order items added successfully");
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (!req.body.name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const transformedData = {
        name: req.body.name.trim(),
        description: req.body.description ? req.body.description.trim() : null,
      };

      const category = await storage.updateCategory(id, transformedData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Notification system routes
  const hasNotificationAccess = (req: any, res: any, next: any) => {
    if (
      req.user &&
      ["admin", "supervisor", "manager"].includes(req.user.role)
    ) {
      return next();
    }
    res.status(403).json({
      message: "Access denied. Admin, Supervisor, or Manager role required.",
    });
  };

  // In-memory storage for push subscriptions (in production, use database)
  const pushSubscriptions = new Map<string, any>();

  app.post(
    "/api/notifications/subscribe",
    isAuthenticated,
    hasNotificationAccess,
    async (req: any, res) => {
      try {
        const { subscription } = req.body;
        const userId = req.user.id;

        pushSubscriptions.set(userId, subscription);
        res.json({ success: true });
      } catch (error) {
        console.error("Error saving push subscription:", error);
        res.status(500).json({ message: "Failed to save subscription" });
      }
    },
  );

  app.post(
    "/api/notifications/unsubscribe",
    isAuthenticated,
    hasNotificationAccess,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        pushSubscriptions.delete(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error removing push subscription:", error);
        res.status(500).json({ message: "Failed to remove subscription" });
      }
    },
  );

  app.put(
    "/api/notifications/rules",
    isAuthenticated,
    hasNotificationAccess,
    async (req: any, res) => {
      try {
        const { rules } = req.body;
        const userId = req.user.id;

        // In production, save rules to database
        res.json({ success: true });
      } catch (error) {
        console.error("Error updating notification rules:", error);
        res.status(500).json({ message: "Failed to update rules" });
      }
    },
  );

  app.post(
    "/api/notifications/test",
    isAuthenticated,
    hasNotificationAccess,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const subscription = pushSubscriptions.get(userId);

        if (!subscription) {
          return res.status(400).json({ message: "No subscription found" });
        }

        // Simulate successful notification send
        console.log("Test notification sent to user:", userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error sending test notification:", error);
        res.status(500).json({ message: "Failed to send test notification" });
      }
    },
  );

  // Sales routes (using orders as sales)
  app.get("/api/sales", isAuthenticated, async (req, res) => {
    try {
      const sales = await storage.getOrders();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const {
        customerId,
        customerName,
        totalAmount,
        paymentMethod,
        status,
        items,
      } = req.body;

      const orderData = {
        orderNumber: `SALE-${Date.now()}`,
        customerName,
        totalAmount,
        status: status || "completed",
        createdBy: userId,
        notes: `Payment: ${paymentMethod}`,
      };

      const order = await storage.createOrder(orderData);

      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      res.json(order);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  // Purchases routes (using expenses as purchases)
  app.get("/api/purchases", isAuthenticated, async (req, res) => {
    try {
      const purchases = await storage.getPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const {
        partyId,
        supplierName,
        totalAmount,
        paymentMethod,
        status,
        items,
      } = req.body;

      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Purchase items are required" });
      }

      // Create expense record for the purchase
      const purchaseData = {
        partyId: partyId || null,
        supplierName,
        totalAmount,
        paymentMethod,
        status: "completed",
        items,
        createdBy: req.user?.id,
      };

      const purchase = await storage.createPurchase(purchaseData);
      res.json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Public order form endpoint (no authentication required)
  app.post("/api/public/orders", async (req, res) => {
    try {
      const {
        customerName,
        customerEmail,
        customerPhone,
        deliveryDate,
        deliveryAddress,
        specialInstructions,
        items,
      } = req.body;

      // Validate required fields
      if (
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !deliveryDate ||
        !deliveryAddress
      ) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be filled",
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one item is required",
        });
      }

      // Generate order number
      const orderNumber = `PUB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Calculate total amount
      const totalAmount = items.reduce(
        (sum: number, item: any) => sum + item.totalPrice,
        0,
      );

      // Create order
      const order = await storage.createOrder({
        orderNumber,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        totalAmount: totalAmount.toString(),
        paymentMethod: "pending",
        orderDate: new Date(),
        dueDate: new Date(deliveryDate),
        notes: `Delivery Address: ${deliveryAddress.trim()}${specialInstructions ? `\nSpecial Instructions: ${specialInstructions.trim()}` : ""}`,
        status: "pending",
        createdBy: null, // Public order, no user ID
      });

      // Create order items
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          throw new Error("Invalid item data");
        }

        await storage.createOrderItem({
          orderId: order.id,
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice).toString(),
          totalPrice: parseFloat(item.totalPrice).toString(),
        });
      }

      console.log("📦 New public order received:", orderNumber);

      // Send notifications about new public order
      try {
        await notifyNewPublicOrder({
          orderNumber,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          totalAmount,
          deliveryDate,
          itemCount: items.length,
        });
      } catch (notificationError) {
        console.error("Failed to send notifications:", notificationError);
        // Don't fail the order creation if notifications fail
      }

      res.json({
        success: true,
        orderNumber,
        message:
          "Order submitted successfully! We will contact you soon with confirmation.",
      });
    } catch (error) {
      console.error("Error creating public order:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit order. Please try again.",
      });
    }
  });

  // Enhanced production schedule endpoints
  app.get(
    "/api/production-schedule/:date",
    isAuthenticated,
    async (req, res) => {
      try {
        const { date } = req.params;
        const scheduleItems = await storage.getProductionScheduleByDate(date);
        res.json(scheduleItems);
      } catch (error) {
        console.error("Error fetching production schedule:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch production schedule" });
      }
    },
  );

  app.get(
    "/api/production-schedule/today",
    isAuthenticated,
    async (req, res) => {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const scheduleItems = await storage.getProductionScheduleByDate(today);
        res.json(scheduleItems);
      } catch (error) {
        console.error("Error fetching today's production schedule:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch today's production schedule" });
      }
    },
  );

  app.post("/api/production-schedule", isAuthenticated, async (req, res) => {
    try {
      const {
        productId,
        scheduledDate,
        targetQuantity,
        targetAmount,
        unit,
        priority,
        notes,
        targetPackets,
      } = req.body;

      const scheduleItem = await storage.createProductionScheduleItem({
        productId,
        scheduledDate: new Date(scheduledDate),
        quantity: targetQuantity || 1,
        targetQuantity: targetQuantity || targetAmount || 1,
        targetAmount: targetAmount ? targetAmount.toString() : "1",
        unit: unit || "kg",
        targetPackets,
        priority: priority || "medium",
        notes,
        status: "pending",
        assignedTo: (req as any).user?.id,
      });

      res.json(scheduleItem);
    } catch (error) {
      console.error("Error creating production schedule:", error);
      res.status(500).json({ message: "Failed to create production schedule" });
    }
  });

  app.put("/api/production-schedule/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.scheduledDate) {
        updateData.scheduledDate = new Date(updateData.scheduledDate);
      }
      if (updateData.targetAmount) {
        updateData.targetAmount = updateData.targetAmount.toString();
      }

      const updatedItem = await storage.updateProductionScheduleItem(
        parseInt(id),
        updateData,
      );
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating production schedule:", error);
      res.status(500).json({ message: "Failed to update production schedule" });
    }
  });

  const upload = multer({ storage });
  // Media upload endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res
          .status(400)
          .json({ message: "Invalid file type. Only images are allowed." });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl, filename: req.file.filename });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // ============ Notifications Routes ============

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotifications((req as any).user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.put(
    "/api/notifications/mark-all-read",
    isAuthenticated,
    async (req, res) => {
      try {
        await storage.markAllNotificationsAsRead(req.user.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ error: "Failed to mark all notifications as read" });
      }
    },
  );

  app.post(
    "/api/notifications/subscribe",
    isAuthenticated,
    async (req, res) => {
      try {
        const { subscription, userId } = req.body;
        await storage.saveNotificationSubscription(
          userId || req.user.id,
          subscription,
        );
        res.json({ success: true });
      } catch (error) {
        console.error("Error saving notification subscription:", error);
        res.status(500).json({ error: "Failed to save subscription" });
      }
    },
  );

  app.post(
    "/api/notifications/unsubscribe",
    isAuthenticated,
    async (req, res) => {
      try {
        const { userId } = req.body;
        await storage.removeNotificationSubscription(userId || req.user.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error removing notification subscription:", error);
        res.status(500).json({ error: "Failed to remove subscription" });
      }
    },
  );

  app.put("/api/notifications/rules", isAuthenticated, async (req, res) => {
    try {
      const { userId, rules } = req.body;
      await storage.saveNotificationSettings(userId || req.user.id, rules);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving notification rules:", error);
      res.status(500).json({ error: "Failed to save notification rules" });
    }
  });

  app.post("/api/notifications/test", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      // Send a test notification
      await storage.createNotification({
        userId: userId || req.user.id,
        type: "system",
        title: "Test Notification",
        description: "This is a test notification to verify your settings.",
        priority: "medium",
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // ============ Company Settings Routes ============

  app.get("/api/settings", async (req, res) => {
    try {
      const allSettings = await storage.getSettings();
      console.log("Fetched settings:", allSettings);

      // Convert settings array to object format
      const settings: any = {};
      allSettings.forEach((setting: any) => {
        settings[setting.key] = setting.value;
      });

      // Ensure default values are set if not present
      const defaultSettings = {
        companyName: "Sweet Treats Bakery",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "info@sweettreatsbakery.com",
        companyLogo: "",
        themeColor: "#8B4513",
        currency: "USD",
        timezone: "UTC",
        emailNotifications: true,
        lowStockAlerts: true,
        orderNotifications: true,
        productionReminders: true,
        twoFactorAuth: false,
        sessionTimeout: 60,
        passwordPolicy: "medium",
      };

      const mergedSettings = { ...defaultSettings, ...settings };

      res.json({
        success: true,
        settings: mergedSettings,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const settingsData = req.body;
      console.log("Updating settings with data:", settingsData);

      // Update each setting individually
      const updatePromises = [];
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== null && value !== undefined) {
          updatePromises.push(
            storage.updateOrCreateSetting(key, String(value)),
          );
        }
      }

      await Promise.all(updatePromises);

      // Fetch updated settings
      const allSettings = await storage.getSettings();
      const settings: any = {};
      allSettings.forEach((setting: any) => {
        settings[setting.key] = setting.value;
      });

      // Ensure default values are maintained
      const defaultSettings = {
        companyName: "Sweet Treats Bakery",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "info@sweettreatsbakery.com",
        companyLogo: "",
        themeColor: "#8B4513",
        currency: "USD",
        timezone: "UTC",
        emailNotifications: true,
        lowStockAlerts: true,
        orderNotifications: true,
        productionReminders: true,
        twoFactorAuth: false,
        sessionTimeout: 60,
        passwordPolicy: "medium",
      };

      const mergedSettings = { ...defaultSettings, ...settings };

      res.json({
        success: true,
        message: "Settings updated successfully",
        settings: mergedSettings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Superadmin-only: Update user roles
  app.put("/api/admin/users/:id/role", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['super_admin', 'admin', 'manager', 'supervisor', 'marketer', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUser(id, { role });
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Login logs routes (admin only)
  app.get("/api/login-logs", isAuthenticated, requireWrite("admin"), async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(loginLogs);
      const total = totalResult[0].count;

      // Get paginated logs
      const logs = await db
        .select()
        .from(loginLogs)
        .orderBy(desc(loginLogs.loginTime))
        .limit(limit)
        .offset(offset);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching login logs:", error);
      res.status(500).json({ message: "Failed to fetch login logs" });
    }
  });

  // Login logs analytics
  app.get("/api/login-logs/analytics", isAuthenticated, requireWrite("admin"), async (req: any, res) => {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      // Get success/failure counts
      const successCount = await db
        .select({ count: count() })
        .from(loginLogs)
        .where(sql`${loginLogs.status} = 'success' AND ${loginLogs.loginTime} >= ${last30Days}`);

      const failureCount = await db
        .select({ count: count() })
        .from(loginLogs)
        .where(sql`${loginLogs.status} = 'failed' AND ${loginLogs.loginTime} >= ${last30Days}`);

      // Get top login locations
      const topLocations = await db
        .select({
          location: loginLogs.location,
          count: count(),
        })
        .from(loginLogs)
        .where(sql`${loginLogs.loginTime} >= ${last30Days}`)
        .groupBy(loginLogs.location)
        .orderBy(desc(count()))
        .limit(10);

      // Get device types
      const deviceTypes = await db
        .select({
          deviceType: loginLogs.deviceType,
          count: count(),
        })
        .from(loginLogs)
        .where(sql`${loginLogs.loginTime} >= ${last30Days}`)
        .groupBy(loginLogs.deviceType)
        .orderBy(desc(count()));

      res.json({
        successCount: successCount[0].count,
        failureCount: failureCount[0].count,
        topLocations,
        deviceTypes,
      });
    } catch (error) {
      console.error("Error fetching login analytics:", error);
      res.status(500).json({ message: "Failed to fetch login analytics" });
    }
  });

  // Login analytics endpoint
  app.get("/api/admin/login-analytics", requireWrite("admin"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Convert dates to proper string format if they exist
      const formattedStartDate = startDate ? new Date(startDate as string).toISOString() : undefined;
      const formattedEndDate = endDate ? new Date(endDate as string).toISOString() : undefined;

      const analytics = await storage.getLoginAnalytics(
        formattedStartDate,
        formattedEndDate
      );

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching login analytics:", error);
      res.status(500).json({ message: "Failed to fetch login analytics" });
    }
  });

  // Staff management routes
  app.get("/api/staff", isAuthenticated, requireRead("staff"), auditLogger('READ', 'staff'), async (req, res) => {
    try {
      const staffList = await storage.getStaff();
      res.json(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/:id", isAuthenticated, requireRead("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const staffMember = await storage.getStaffById(id);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error fetching staff member:", error);
      res.status(500).json({ message: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff", isAuthenticated, requireWrite("staff"), auditLogger('CREATE', 'staff'), async (req: any, res) => {
    try {
      const {
        staffId,
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth,
        hireDate,
        position,
        department,
        employmentType,
        salary,
        hourlyRate,
        bankAccount,
        emergencyContact,
        emergencyPhone,
        notes,
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !position || !department || !employmentType || !hireDate) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      // Auto-generate staff ID if not provided
      let finalStaffId = staffId;
      if (!finalStaffId) {
        const timestamp = Date.now().toString().slice(-6);
        const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        finalStaffId = `EMP${initials}${timestamp}`;
      }

      // Check if staff ID already exists
      try {
        const existingStaff = await storage.getStaffByStaffId(finalStaffId);
        if (existingStaff) {
          return res.status(400).json({ message: "Staff ID already exists" });
        }
      } catch (err) {
        // Staff ID doesn't exist, which is good
      }

      const staffData = {
        staffId: finalStaffId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        hireDate: new Date(hireDate),
        position: position.trim(),
        department: department.trim(),
        employmentType: employmentType.trim(),
        salary: salary && !isNaN(parseFloat(salary)) ? parseFloat(salary).toString() : null,
        hourlyRate: hourlyRate && !isNaN(parseFloat(hourlyRate)) ? parseFloat(hourlyRate).toString() : null,
        bankAccount: bankAccount?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        emergencyPhone: emergencyPhone?.trim() || null,
        notes: notes?.trim() || null,
        status: "active",
      };

      console.log("Creating staff member with data:", staffData);
      const newStaff = await storage.createStaff(staffData);
      console.log("Staff member created successfully:", newStaff);
      res.json(newStaff);
    } catch (error) {
      console.error("Error creating staff member:", error);
      if (error.message?.includes('duplicate key')) {
        res.status(400).json({ message: "Staff ID already exists" });
      } else {
        res.status(500).json({ 
          message: "Failed to create staff member",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.put("/api/staff/:id", isAuthenticated, requireWrite("staff"), auditLogger('UPDATE', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      // Validate required fields
      if (!updateData.firstName || !updateData.lastName || !updateData.position || !updateData.department) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      // Process dates
      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }
      if (updateData.hireDate) {
        updateData.hireDate = new Date(updateData.hireDate);
      }
      if (updateData.terminationDate) {
        updateData.terminationDate = new Date(updateData.terminationDate);
      }

      // Process numeric fields
      if (updateData.salary && !isNaN(parseFloat(updateData.salary))) {
        updateData.salary = parseFloat(updateData.salary).toString();
      } else {
        updateData.salary = null;
      }
      
      if (updateData.hourlyRate && !isNaN(parseFloat(updateData.hourlyRate))) {
        updateData.hourlyRate = parseFloat(updateData.hourlyRate).toString();
      } else {
        updateData.hourlyRate = null;
      }

      // Trim string fields
      ['firstName', 'lastName', 'email', 'phone', 'address', 'position', 'department', 'employmentType', 'bankAccount', 'emergencyContact', 'emergencyPhone', 'notes'].forEach(field => {
        if (updateData[field]) {
          updateData[field] = updateData[field].trim();
        }
      });

      console.log("Updating staff member with data:", updateData);
      const updatedStaff = await storage.updateStaff(id, updateData);
      console.log("Staff member updated successfully:", updatedStaff);
      res.json(updatedStaff);
    } catch (error) {
      console.error("Error updating staff member:", error);
      res.status(500).json({ 
        message: "Failed to update staff member",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/staff/:id", isAuthenticated, requireWrite("staff"), auditLogger('DELETE', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStaff(id);
      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", isAuthenticated, requireRead("staff"), async (req, res) => {
    try {
      const { staffId, startDate, endDate } = req.query;
      
      const attendanceRecords = await storage.getAttendance(
        staffId ? parseInt(staffId as string) : undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const attendanceData = req.body;
      
      if (attendanceData.date) {
        attendanceData.date = new Date(attendanceData.date);
      }
      if (attendanceData.clockIn) {
        attendanceData.clockIn = new Date(attendanceData.clockIn);
      }
      if (attendanceData.clockOut) {
        attendanceData.clockOut = new Date(attendanceData.clockOut);
      }
      if (attendanceData.breakStart) {
        attendanceData.breakStart = new Date(attendanceData.breakStart);
      }
      if (attendanceData.breakEnd) {
        attendanceData.breakEnd = new Date(attendanceData.breakEnd);
      }

      const newAttendance = await storage.createAttendance(attendanceData);
      res.json(newAttendance);
    } catch (error) {
      console.error("Error creating attendance record:", error);
      res.status(500).json({ message: "Failed to create attendance record" });
    }
  });

  app.post("/api/attendance/clock-in", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const { staffId } = req.body;
      const attendance = await storage.clockIn(staffId);
      res.json(attendance);
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: error.message || "Failed to clock in" });
    }
  });

  app.post("/api/attendance/clock-out", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const { staffId } = req.body;
      const attendance = await storage.clockOut(staffId);
      res.json(attendance);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: error.message || "Failed to clock out" });
    }
  });

  app.put("/api/attendance/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      if (updateData.clockIn) {
        updateData.clockIn = new Date(updateData.clockIn);
      }
      if (updateData.clockOut) {
        updateData.clockOut = new Date(updateData.clockOut);
      }

      const updatedAttendance = await storage.updateAttendance(id, updateData);
      res.json(updatedAttendance);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  app.delete("/api/attendance/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAttendance(id);
      res.json({ message: "Attendance record deleted successfully" });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      res.status(500).json({ message: "Failed to delete attendance" });
    }
  });

  // Salary payment routes
  app.get("/api/salary-payments", isAuthenticated, requireRead("staff"), async (req, res) => {
    try {
      const { staffId } = req.query;
      const payments = await storage.getSalaryPayments(
        staffId ? parseInt(staffId as string) : undefined
      );
      res.json(payments);
    } catch (error) {
      console.error("Error fetching salary payments:", error);
      res.status(500).json({ message: "Failed to fetch salary payments" });
    }
  });

  app.post("/api/salary-payments", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const paymentData = req.body;
      
      if (paymentData.payPeriodStart) {
        paymentData.payPeriodStart = new Date(paymentData.payPeriodStart);
      }
      if (paymentData.payPeriodEnd) {
        paymentData.payPeriodEnd = new Date(paymentData.payPeriodEnd);
      }
      if (paymentData.paymentDate) {
        paymentData.paymentDate = new Date(paymentData.paymentDate);
      }

      // Convert numeric fields to strings
      ['basicSalary', 'overtimePay', 'bonus', 'allowances', 'deductions', 'tax', 'netPay'].forEach(field => {
        if (paymentData[field]) {
          paymentData[field] = parseFloat(paymentData[field]).toString();
        }
      });

      const newPayment = await storage.createSalaryPayment(paymentData);
      res.json(newPayment);
    } catch (error) {
      console.error("Error creating salary payment:", error);
      res.status(500).json({ message: "Failed to create salary payment" });
    }
  });

  app.put("/api/salary-payments/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.payPeriodStart) {
        updateData.payPeriodStart = new Date(updateData.payPeriodStart);
      }
      if (updateData.payPeriodEnd) {
        updateData.payPeriodEnd = new Date(updateData.payPeriodEnd);
      }
      if (updateData.paymentDate) {
        updateData.paymentDate = new Date(updateData.paymentDate);
      }

      const updatedPayment = await storage.updateSalaryPayment(id, updateData);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating salary payment:", error);
      res.status(500).json({ message: "Failed to update salary payment" });
    }
  });

  // Leave request routes
  app.get("/api/leave-requests", isAuthenticated, requireRead("staff"), async (req, res) => {
    try {
      const { staffId } = req.query;
      const requests = await storage.getLeaveRequests(
        staffId ? parseInt(staffId as string) : undefined
      );
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post("/api/leave-requests", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const requestData = req.body;
      
      if (requestData.startDate) {
        requestData.startDate = new Date(requestData.startDate);
      }
      if (requestData.endDate) {
        requestData.endDate = new Date(requestData.endDate);
      }

      const newRequest = await storage.createLeaveRequest(requestData);
      res.json(newRequest);
    } catch (error) {
      console.error("Error creating leave request:", error);
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });

  app.put("/api/leave-requests/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }
      if (updateData.reviewedDate) {
        updateData.reviewedDate = new Date(updateData.reviewedDate);
      }

      const updatedRequest = await storage.updateLeaveRequest(id, updateData);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating leave request:", error);
      res.status(500).json({ message: "Failed to update leave request" });
    }
  });

  // Audit logs routes
  app.get("/api/audit-logs", isAuthenticated, requireWrite("admin"), async (req: any, res) => {
    try {
      const {
        userId,
        action,
        resource,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const filters = {
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit),
        offset: offset,
      };

      const auditLogs = await storage.getAuditLogs(filters);
      
      // Get total count for pagination
      const totalResult = await db.select({ count: count() }).from(auditLogs);
      const total = totalResult[0]?.count || 0;

      res.json({
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit-logs/export", isAuthenticated, requireWrite("admin"), async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      
      // Format logs for export
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString()
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      res.status(500).json({ message: "Failed to export audit logs" });
    }
  });

  app.get("/api/security/metrics", isAuthenticated, requireWrite("admin"), async (req, res) => {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      // Get failed logins in last 24 hours
      const failedLogins = await db
        .select({ count: count() })
        .from(loginLogs)
        .where(sql`${loginLogs.status} = 'failed' AND ${loginLogs.loginTime} >= ${last24Hours}`);

      // Get failed operations in last 24 hours
      const failedOperations = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(sql`${auditLogs.status} = 'failed' AND ${auditLogs.timestamp} >= ${last24Hours}`);

      // Get unique active users in last 24 hours
      const activeUsers = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(sql`${auditLogs.timestamp} >= ${last24Hours}`)
        .groupBy(auditLogs.userId);

      res.json({
        failedLogins: failedLogins[0]?.count || 0,
        failedOperations: failedOperations[0]?.count || 0,
        activeUsers: activeUsers.length || 0,
      });
    } catch (error) {
      console.error("Error fetching security metrics:", error);
      res.status(500).json({ message: "Failed to fetch security metrics" });
    }
  });

  app.get("/api/audit-logs/suspicious", isAuthenticated, requireWrite("admin"), async (req, res) => {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const suspiciousLogs = await db
        .select()
        .from(auditLogs)
        .where(sql`${auditLogs.status} = 'failed' AND ${auditLogs.timestamp} >= ${last24Hours}`)
        .orderBy(desc(auditLogs.timestamp))
        .limit(20);

      res.json({ auditLogs: suspiciousLogs });
    } catch (error) {
      console.error("Error fetching suspicious activities:", error);
      res.status(500).json({ message: "Failed to fetch suspicious activities" });
    }
  });

  app.get("/api/audit-logs/analytics", isAuthenticated, requireWrite("admin"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const filters = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
      };

      const logs = await storage.getAuditLogs(filters);

      // Analyze the logs
      const analytics = {
        totalActions: logs.length,
        actionsByType: logs.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {}),
        actionsByResource: logs.reduce((acc: any, log: any) => {
          acc[log.resource] = (acc[log.resource] || 0) + 1;
          return acc;
        }, {}),
        actionsByUser: logs.reduce((acc: any, log: any) => {
          acc[log.userName] = (acc[log.userName] || 0) + 1;
          return acc;
        }, {}),
        recentActions: logs.slice(0, 10),
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching audit analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit analytics" });
    }
  });

  // Staff schedule routes
  app.get("/api/staff-schedules", isAuthenticated, requireRead("staff"), async (req, res) => {
    try {
      const { staffId, date } = req.query;
      const schedules = await storage.getStaffSchedules(
        staffId ? parseInt(staffId as string) : undefined,
        date ? new Date(date as string) : undefined
      );
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching staff schedules:", error);
      res.status(500).json({ message: "Failed to fetch staff schedules" });
    }
  });

  app.post("/api/staff-schedules", isAuthenticated, requireWrite("staff"), async (req: any, res) => {
    try {
      const scheduleData = req.body;
      
      if (scheduleData.date) {
        scheduleData.date = new Date(scheduleData.date);
      }
      if (scheduleData.shiftStart) {
        scheduleData.shiftStart = new Date(scheduleData.shiftStart);
      }
      if (scheduleData.shiftEnd) {
        scheduleData.shiftEnd = new Date(scheduleData.shiftEnd);
      }

      scheduleData.createdBy = req.user?.id;

      const newSchedule = await storage.createStaffSchedule(scheduleData);
      res.json(newSchedule);
    } catch (error) {
      console.error("Error creating staff schedule:", error);
      res.status(500).json({ message: "Failed to create staff schedule" });
    }
  });

  app.put("/api/staff-schedules/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      if (updateData.shiftStart) {
        updateData.shiftStart = new Date(updateData.shiftStart);
      }
      if (updateData.shiftEnd) {
        updateData.shiftEnd = new Date(updateData.shiftEnd);
      }

      const updatedSchedule = await storage.updateStaffSchedule(id, updateData);
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error updating staff schedule:", error);
      res.status(500).json({ message: "Failed to update staff schedule" });
    }
  });

  app.delete("/api/staff-schedules/:id", isAuthenticated, requireWrite("staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStaffSchedule(id);
      res.json({ message: "Staff schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting staff schedule:", error);
      res.status(500).json({ message: "Failed to delete staff schedule" });
    }
  });

  // Register enhanced routes for comprehensive system features
  // Enhanced routes functionality integrated above

  const httpServer = createServer(app);
  return httpServer;
}