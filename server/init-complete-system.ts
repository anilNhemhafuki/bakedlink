import { db } from "./db.js";
import { testDatabaseConnection } from "./db.js";
import {
  units,
  permissions,
  rolePermissions,
  inventoryCategories,
  categories,
  users,
  auditLogs,
  loginLogs
} from "../shared/schema.js";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

export async function initializeCompleteSystem() {
  try {
    console.log("🔄 Initializing complete system...");

    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    // 1. Initialize Units first (required by many other tables)
    console.log("📏 Initializing units...");
    const existingUnits = await db.select().from(units);
    if (existingUnits.length === 0) {
      const defaultUnits = [
        { name: "Kilogram", abbreviation: "kg", type: "weight", baseUnit: "gram", conversionFactor: "1000", isActive: true },
        { name: "Gram", abbreviation: "g", type: "weight", baseUnit: "gram", conversionFactor: "1", isActive: true },
        { name: "Pound", abbreviation: "lbs", type: "weight", baseUnit: "gram", conversionFactor: "453.592", isActive: true },
        { name: "Ounce", abbreviation: "oz", type: "weight", baseUnit: "gram", conversionFactor: "28.3495", isActive: true },

        { name: "Liter", abbreviation: "L", type: "volume", baseUnit: "milliliter", conversionFactor: "1000", isActive: true },
        { name: "Milliliter", abbreviation: "ml", type: "volume", baseUnit: "milliliter", conversionFactor: "1", isActive: true },
        { name: "Cup", abbreviation: "cup", type: "volume", baseUnit: "milliliter", conversionFactor: "240", isActive: true },
        { name: "Tablespoon", abbreviation: "tbsp", type: "volume", baseUnit: "milliliter", conversionFactor: "15", isActive: true },
        { name: "Teaspoon", abbreviation: "tsp", type: "volume", baseUnit: "milliliter", conversionFactor: "5", isActive: true },

        { name: "Piece", abbreviation: "pcs", type: "count", baseUnit: "piece", conversionFactor: "1", isActive: true },
        { name: "Dozen", abbreviation: "dz", type: "count", baseUnit: "piece", conversionFactor: "12", isActive: true },
        { name: "Pack", abbreviation: "pack", type: "count", baseUnit: "piece", conversionFactor: "1", isActive: true },
        { name: "Box", abbreviation: "box", type: "count", baseUnit: "piece", conversionFactor: "1", isActive: true },
        { name: "Bag", abbreviation: "bag", type: "count", baseUnit: "piece", conversionFactor: "1", isActive: true },
        { name: "Bottle", abbreviation: "btl", type: "count", baseUnit: "piece", conversionFactor: "1", isActive: true },

        { name: "Meter", abbreviation: "m", type: "length", baseUnit: "centimeter", conversionFactor: "100", isActive: true },
        { name: "Centimeter", abbreviation: "cm", type: "length", baseUnit: "centimeter", conversionFactor: "1", isActive: true },
        { name: "Inch", abbreviation: "in", type: "length", baseUnit: "centimeter", conversionFactor: "2.54", isActive: true },

        { name: "Celsius", abbreviation: "°C", type: "temperature", baseUnit: "celsius", conversionFactor: "1", isActive: true },
        { name: "Fahrenheit", abbreviation: "°F", type: "temperature", baseUnit: "celsius", conversionFactor: "1", isActive: true }
      ];

      await db.insert(units).values(defaultUnits);
      console.log("✅ Units initialized");
    } else {
      console.log("✅ Units already exist");
    }

    // 2. Initialize Permissions
    console.log("🔐 Initializing permissions...");
    const existingPermissions = await db.select().from(permissions).catch(() => []);
    if (existingPermissions.length === 0) {
      const defaultPermissions = [
        // Dashboard permissions
        { name: "dashboard_read", resource: "dashboard", action: "read", description: "View dashboard" },
        { name: "dashboard_write", resource: "dashboard", action: "write", description: "Modify dashboard" },

        // Product permissions
        { name: "products_read", resource: "products", action: "read", description: "View products" },
        { name: "products_write", resource: "products", action: "write", description: "Create/edit products" },
        { name: "products_delete", resource: "products", action: "delete", description: "Delete products" },

        // Inventory permissions
        { name: "inventory_read", resource: "inventory", action: "read", description: "View inventory" },
        { name: "inventory_write", resource: "inventory", action: "write", description: "Manage inventory" },
        { name: "inventory_delete", resource: "inventory", action: "delete", description: "Delete inventory items" },

        // Order permissions
        { name: "orders_read", resource: "orders", action: "read", description: "View orders" },
        { name: "orders_write", resource: "orders", action: "write", description: "Create/edit orders" },
        { name: "orders_delete", resource: "orders", action: "delete", description: "Delete orders" },

        // Purchase permissions
        { name: "purchases_read", resource: "purchases", action: "read", description: "View purchases" },
        { name: "purchases_write", resource: "purchases", action: "write", description: "Create/edit purchases" },
        { name: "purchases_delete", resource: "purchases", action: "delete", description: "Delete purchases" },

        // Customer permissions
        { name: "customers_read", resource: "customers", action: "read", description: "View customers" },
        { name: "customers_write", resource: "customers", action: "write", description: "Manage customers" },
        { name: "customers_delete", resource: "customers", action: "delete", description: "Delete customers" },

        // Staff permissions
        { name: "staff_read", resource: "staff", action: "read", description: "View staff" },
        { name: "staff_write", resource: "staff", action: "write", description: "Manage staff" },
        { name: "staff_delete", resource: "staff", action: "delete", description: "Delete staff" },

        // Financial permissions
        { name: "expenses_read", resource: "expenses", action: "read", description: "View expenses" },
        { name: "expenses_write", resource: "expenses", action: "write", description: "Manage expenses" },
        { name: "reports_read", resource: "reports", action: "read", description: "View reports" },

        // Admin permissions
        { name: "admin_users", resource: "admin", action: "write", description: "Manage system users" },
        { name: "admin_settings", resource: "admin", action: "write", description: "Manage system settings" },
        { name: "admin_audit", resource: "admin", action: "read", description: "View audit logs" },

        // Units permissions
        { name: "units_read", resource: "units", action: "read", description: "View units" },
        { name: "units_write", resource: "units", action: "write", description: "Manage units" },
        { name: "units_delete", resource: "units", action: "delete", description: "Delete units" }
      ];

      const insertedPermissions = await db.insert(permissions).values(defaultPermissions).returning();
      console.log("✅ Permissions initialized");

      // 3. Initialize Role Permissions
      console.log("👥 Initializing role permissions...");
      const rolePermissionData = [];

      // Super Admin - all permissions
      insertedPermissions.forEach(permission => {
        rolePermissionData.push({ role: "super_admin", permissionId: permission.id });
      });

      // Admin - most permissions except super admin functions
      const adminPermissions = insertedPermissions.filter(p => 
        !p.name.includes("admin_users") && !p.name.includes("admin_audit")
      );
      adminPermissions.forEach(permission => {
        rolePermissionData.push({ role: "admin", permissionId: permission.id });
      });

      // Manager - operational permissions
      const managerPermissions = insertedPermissions.filter(p => 
        p.name.includes("_read") || 
        p.name.includes("orders_") || 
        p.name.includes("inventory_") || 
        p.name.includes("products_") ||
        p.name.includes("customers_") ||
        p.name.includes("staff_read") ||
        p.name.includes("reports_")
      );
      managerPermissions.forEach(permission => {
        rolePermissionData.push({ role: "manager", permissionId: permission.id });
      });

      // Staff - basic permissions
      const staffPermissions = insertedPermissions.filter(p => 
        p.name.includes("dashboard_read") ||
        p.name.includes("products_read") ||
        p.name.includes("inventory_read") ||
        p.name.includes("orders_read") ||
        p.name.includes("customers_read")
      );
      staffPermissions.forEach(permission => {
        rolePermissionData.push({ role: "staff", permissionId: permission.id });
      });

      await db.insert(rolePermissions).values(rolePermissionData);
      console.log("✅ Role permissions initialized");
    } else {
      console.log("✅ Permissions already exist");
    }

    // 4. Initialize Categories
    console.log("📂 Initializing categories...");
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Cakes", description: "Birthday, wedding, and specialty cakes" },
        { name: "Pastries", description: "Croissants, danishes, and sweet pastries" },
        { name: "Bread", description: "Fresh baked breads and rolls" },
        { name: "Cookies", description: "Assorted cookies and biscuits" },
        { name: "Desserts", description: "Puddings, tarts, and specialty desserts" },
        { name: "Beverages", description: "Coffee, tea, and other drinks" }
      ];

      await db.insert(categories).values(defaultCategories);
      console.log("✅ Categories initialized");
    } else {
      console.log("✅ Categories already exist");
    }

    // 5. Initialize Inventory Categories
    console.log("📦 Initializing inventory categories...");
    const existingInvCategories = await db.select().from(inventoryCategories);
    if (existingInvCategories.length === 0) {
      const defaultInvCategories = [
        { name: "Flour & Grains", description: "Basic baking ingredients", isActive: true },
        { name: "Dairy Products", description: "Milk, butter, cheese products", isActive: true },
        { name: "Sweeteners", description: "Sugar, honey, artificial sweeteners", isActive: true },
        { name: "Spices & Flavoring", description: "Vanilla, cinnamon, extracts", isActive: true },
        { name: "Packaging", description: "Boxes, bags, wrapping materials", isActive: true },
        { name: "Fruits & Nuts", description: "Fresh and dried fruits, nuts", isActive: true }
      ];

      await db.insert(inventoryCategories).values(defaultInvCategories);
      console.log("✅ Inventory categories initialized");
    } else {
      console.log("✅ Inventory categories already exist");
    }

    // 6. Initialize System Users
    console.log("👤 Initializing system users...");
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      const defaultUsers = [
        {
          email: "superadmin@merobakesoft.com",
          firstName: "Super",
          lastName: "Admin",
          role: "super_admin",
          password: await bcrypt.hash("admin123", 10),
        },
        {
          email: "admin@merobakesoft.com",
          firstName: "System",
          lastName: "Admin",
          role: "admin",
          password: await bcrypt.hash("admin123", 10),
        },
        {
          email: "manager@merobakesoft.com",
          firstName: "Bakery",
          lastName: "Manager",
          role: "manager",
          password: await bcrypt.hash("manager123", 10),
        },
        {
          email: "staff@merobakesoft.com",
          firstName: "Staff",
          lastName: "Member",
          role: "staff",
          password: await bcrypt.hash("staff123", 10),
        },
      ];

      await db.insert(users).values(defaultUsers);
      console.log("✅ System users initialized");
    } else {
      console.log("✅ System users already exist");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 COMPLETE SYSTEM INITIALIZATION SUCCESSFUL");
    console.log("=".repeat(60));
    console.log("🔑 LOGIN CREDENTIALS:");
    console.log("📧 Super Admin: superadmin@merobakesoft.com / admin123");
    console.log("📧 Admin: admin@merobakesoft.com / admin123");
    console.log("📧 Manager: manager@merobakesoft.com / manager123");
    console.log("📧 Staff: staff@merobakesoft.com / staff123");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ System initialization failed:", error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeCompleteSystem()
    .then(() => {
      console.log("✅ Initialization complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Initialization failed:", error);
      process.exit(1);
    });
}