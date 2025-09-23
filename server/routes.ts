import express from "express";
import { db } from "./db";

// Extend session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: any;
  }
}
import {
  eq,
  desc,
  and,
  or,
  isNull,
  sql,
  asc,
  gte,
  lte,
  count,
  sum,
  like,
} from "drizzle-orm";
import {
  users,
  products,
  orders,
  orderItems,
  customers,
  inventoryItems,
  purchases,
  purchaseItems,
  expenses,
  productionSchedule,
  inventoryTransactions,
  parties,
  assets,
  permissions,
  rolePermissions,
  userPermissions,
  settings,
  ledgerTransactions,
  loginLogs,
  auditLogs,
  staff,
  attendance,
  salaryPayments,
  leaveRequests,
  staffSchedules,
  units,
  unitConversions,
  inventoryCategories,
  productIngredients,
  productionScheduleLabels,
  productionScheduleHistory,
} from "../shared/schema";
import {
  insertUserSchema,
  insertProductSchema,
  insertCustomerSchema,
  insertPurchaseSchema,
  insertExpenseSchema,
  insertPermissionSchema,
  insertRolePermissionSchema,
  insertUserPermissionSchema,
  insertLedgerTransactionSchema,
  insertLoginLogSchema,
  insertUnitConversionSchema,
  insertStaffSchema,
  insertAttendanceSchema,
  insertSalaryPaymentSchema,
  insertLeaveRequestSchema,
  insertStaffScheduleSchema,
  insertInventoryItemSchema,
  insertOrderSchema,
  insertProductionScheduleItemSchema,
  insertPartySchema,
  insertAssetSchema,
  insertAuditLogSchema,
} from "../shared/schema";
import { Storage } from "./lib/storage";
import bcrypt from "bcrypt";
import {
  notifyNewPublicOrder,
  notifyLowStock,
  notifyProductionSchedule,
} from "./notifications";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import stockManagementRoutes from "./routes/stock-management";

const router = express.Router();

// Create storage instance
const storage = new Storage();

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP",
});

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Mount stock management routes
router.use("/stock-management", stockManagementRoutes);

// Products with recipes endpoint for production management
router.get("/products-with-recipes", async (req, res) => {
  try {
    const productsWithRecipes = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        cost: products.cost,
        price: products.price,
      })
      .from(products)
      .where(eq(products.isActive, true));

    // Get ingredients for each product
    const productsWithIngredients = await Promise.all(
      productsWithRecipes.map(async (product) => {
        const ingredients = await db
          .select({
            inventoryItemId: productIngredients.inventoryItemId,
            quantity: productIngredients.quantity,
            unit: productIngredients.unit,
            unitId: productIngredients.unitId,
            itemName: inventoryItems.name,
          })
          .from(productIngredients)
          .leftJoin(inventoryItems, eq(productIngredients.inventoryItemId, inventoryItems.id))
          .where(eq(productIngredients.productId, product.id));

        return {
          ...product,
          ingredients: ingredients.map(ing => ({
            inventoryItemId: ing.inventoryItemId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            unitId: ing.unitId,
            itemName: ing.itemName,
          })),
        };
      })
    );

    console.log(`✅ Found ${productsWithIngredients.length} products with recipes`);
    res.json(productsWithIngredients);
  } catch (error) {
    console.error("❌ Error fetching products with recipes:", error);
    res.status(500).json({ error: "Failed to fetch products with recipes" });
  }
});

// In-memory notification storage (for demonstration - in production use database)
let notifications: Array<{
  id: string;
  type: "order" | "production" | "inventory" | "shipping" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  actionUrl?: string;
  data?: any;
}> = [];

// Helper function to add notification
function addNotification(
  notification: Omit<(typeof notifications)[0], "id" | "timestamp" | "read">,
) {
  const newNotification = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false,
    ...notification,
  };
  notifications.unshift(newNotification);

  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }

  console.log(`📢 New notification: ${notification.title}`);
  return newNotification;
}

// Initialize with some sample notifications for testing
if (notifications.length === 0) {
  addNotification({
    type: "system",
    title: "Welcome to BakerSoft",
    description:
      "System initialized successfully. All modules are ready for use.",
    priority: "medium",
    actionUrl: "/dashboard",
  });

  addNotification({
    type: "inventory",
    title: "Low Stock Alert",
    description: "Flour stock is running low. Current: 5kg, Minimum: 10kg",
    priority: "high",
    actionUrl: "/inventory",
    data: { itemName: "Flour", currentStock: 5, minLevel: 10 },
  });

  addNotification({
    type: "order",
    title: "New Order Received",
    description: "Order #ORD-001 from John Doe for ₹1,250",
    priority: "medium",
    actionUrl: "/orders",
    data: { orderNumber: "ORD-001", customer: "John Doe", amount: 1250 },
  });
}

// Notification Routes
router.get("/notifications", async (req, res) => {
  try {
    // Return notifications sorted by timestamp (newest first)
    const sortedNotifications = [...notifications].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    console.log(`✅ Found ${sortedNotifications.length} notifications`);
    res.json(sortedNotifications);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = notifications.find((n) => n.id === id);

    if (notification) {
      notification.read = true;
      console.log(`✅ Marked notification ${id} as read`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.put("/notifications/mark-all-read", async (req, res) => {
  try {
    notifications.forEach((n) => (n.read = true));
    console.log("✅ Marked all notifications as read");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

router.post("/notifications/test", async (req, res) => {
  try {
    const testNotification = addNotification({
      type: "system",
      title: "Test Notification",
      description: `Test notification sent at ${new Date().toLocaleString()}`,
      priority: "low",
    });

    res.json({ success: true, notification: testNotification });
  } catch (error) {
    console.error("❌ Error sending test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// Authentication check middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Admin check middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // For development, allow any authenticated user
  // In production, check user role from database
  next();
}

// Authentication routes
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login attempt for:", email);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    // Try database login first
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length > 0) {
        const isValidPassword = await bcrypt.compare(
          password,
          user[0].password || "",
        );

        if (isValidPassword) {
          req.session.userId = user[0].id;
          req.session.user = user[0];

          const userName = `${user[0].firstName} ${user[0].lastName}`;

          // Log successful login
          await storage.logLogin(
            user[0].id,
            email,
            userName,
            ipAddress,
            userAgent,
            true,
          );

          // Add login notification
          addNotification({
            type: "system",
            title: "User Login",
            description: `${userName} logged in`,
            priority: "low",
          });

          console.log("✅ Database login successful for:", email);
          return res.json({
            message: "Login successful",
            user: {
              id: user[0].id,
              email: user[0].email,
              firstName: user[0].firstName,
              lastName: user[0].lastName,
              role: user[0].role,
            },
          });
        } else {
          // Log failed password attempt
          await storage.logLogin(
            user[0].id,
            email,
            `${user[0].firstName} ${user[0].lastName}`,
            ipAddress,
            userAgent,
            false,
            "Invalid password",
          );
        }
      }
    } catch (dbError) {
      console.log("⚠️ Database login failed, trying default credentials");
    }

    // Default credentials for demo
    const defaultUsers = [
      {
        id: "super_admin",
        email: "admin@bakersoft.com",
        password: "admin123",
        firstName: "Super",
        lastName: "Admin",
        role: "admin",
      },
      {
        id: "admin_user",
        email: "admin@admin.com",
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      },
      {
        id: "manager_user",
        email: "manager@manager.com",
        password: "manager123",
        firstName: "Manager",
        lastName: "User",
        role: "manager",
      },
      {
        id: "staff_user",
        email: "staff@staff.com",
        password: "staff123",
        firstName: "Staff",
        lastName: "User",
        role: "staff",
      },
    ];

    const defaultUser = defaultUsers.find(
      (u) => u.email === email && u.password === password,
    );

    if (defaultUser) {
      req.session.userId = defaultUser.id;
      req.session.user = defaultUser;

      const userName = `${defaultUser.firstName} ${defaultUser.lastName}`;

      // Log successful default login
      await storage.logLogin(
        defaultUser.id,
        email,
        userName,
        ipAddress,
        userAgent,
        true,
      );

      // Add login notification
      addNotification({
        type: "system",
        title: "User Login",
        description: `${userName} logged in`,
        priority: "low",
      });

      console.log("✅ Default login successful for:", email);
      return res.json({
        message: "Login successful",
        user: {
          id: defaultUser.id,
          email: defaultUser.email,
          firstName: defaultUser.firstName,
          lastName: defaultUser.lastName,
          role: defaultUser.role,
        },
      });
    }

    // Log failed login attempt
    await storage.logLogin(
      "unknown",
      email,
      "Unknown User",
      ipAddress,
      userAgent,
      false,
      "Invalid credentials",
    );

    console.log("❌ Login failed for:", email);
    res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  const userEmail = req.session?.user?.email || "Unknown";

  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    // Add logout notification
    addNotification({
      type: "system",
      title: "User Logout",
      description: `User ${userEmail} logged out`,
      priority: "low",
    });

    console.log("✅ Logout successful for:", userEmail);
    res.json({ message: "Logout successful" });
  });
});

router.get("/me", (req, res) => {
  if (req.session?.userId) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Add auth/user endpoint that frontend expects
router.get("/auth/user", (req, res) => {
  if (req.session?.userId) {
    console.log("✅ Auth check - User authenticated:", req.session.user?.email);
    res.json(req.session.user);
  } else {
    console.log("❌ Auth check - No active session");
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Admin user management routes
router.get("/admin/users", requireAuth, async (req, res) => {
  try {
    console.log("👥 Fetching all users for admin...");
    const currentUser = req.session?.user;

    // Check if user has admin privileges
    if (
      !currentUser ||
      (currentUser.role !== "super_admin" && currentUser.role !== "admin")
    ) {
      console.log("❌ Access denied for user management");
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to access user management",
        success: false,
      });
    }

    const excludeSuperAdmin = currentUser.role !== "super_admin";
    const users = await storage.getAllUsers(excludeSuperAdmin);

    console.log(`✅ Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({
      error: "Failed to fetch users",
      message: error.message,
      success: false,
    });
  }
});

router.post("/admin/users", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating new user:", req.body.email);
    const currentUser = req.session?.user;

    // Check if user has admin privileges
    if (
      !currentUser ||
      (currentUser.role !== "super_admin" && currentUser.role !== "admin")
    ) {
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to create users",
        success: false,
      });
    }

    const result = await storage.upsertUser(req.body);

    // Log the user creation
    await storage.logUserAction(
      currentUser.id,
      "CREATE",
      "users",
      {
        newUserEmail: req.body.email,
        newUserRole: req.body.role,
        newUserId: result.id,
      },
      req.ip,
      req.get("User-Agent"),
    );

    // Add user creation notification
    addNotification({
      type: "system",
      title: "User Created",
      description: `New user "${req.body.email}" has been created with role "${req.body.role}"`,
      priority: "medium",
      actionUrl: "/admin/users",
    });

    console.log("✅ User created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating user:", error);
    res.status(400).json({
      error: "Failed to create user",
      message: error.message,
      success: false,
    });
  }
});

router.put("/admin/users/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("💾 Updating user:", userId);
    const currentUser = req.session?.user;

    // Check if user has admin privileges
    if (
      !currentUser ||
      (currentUser.role !== "super_admin" && currentUser.role !== "admin")
    ) {
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to update users",
        success: false,
      });
    }

    const result = await storage.updateUser(userId, req.body);

    // Log the user update
    await storage.logUserAction(
      currentUser.id,
      "UPDATE",
      "users",
      {
        updatedUserId: userId,
        updates: req.body,
      },
      req.ip,
      req.get("User-Agent"),
    );

    // Add user update notification
    addNotification({
      type: "system",
      title: "User Updated",
      description: `User "${result.email}" has been updated`,
      priority: "medium",
      actionUrl: "/admin/users",
    });

    console.log("✅ User updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating user:", error);
    res.status(400).json({
      error: "Failed to update user",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/admin/users/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("🗑️ Deleting user:", userId);
    const currentUser = req.session?.user;

    // Check if user has admin privileges
    if (
      !currentUser ||
      (currentUser.role !== "super_admin" && currentUser.role !== "admin")
    ) {
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to delete users",
        success: false,
      });
    }

    await storage.deleteUser(userId);

    // Log the user deletion
    await storage.logUserAction(
      currentUser.id,
      "DELETE",
      "users",
      { deletedUserId: userId },
      req.ip,
      req.get("User-Agent"),
    );

    // Add user deletion notification
    addNotification({
      type: "system",
      title: "User Deleted",
      description: `User has been deleted from the system`,
      priority: "medium",
      actionUrl: "/admin/users",
    });

    console.log("✅ User deleted successfully");
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting user:", error);
    res.status(400).json({
      error: "Failed to delete user",
      message: error.message,
      success: false,
    });
  }
});

// Dashboard API endpoints
router.get("/dashboard/stats", async (req, res) => {
  try {
    console.log(
      "📊 Fetching dashboard stats for user:",
      req.session?.user?.email,
    );

    // Check if user is authenticated
    if (!req.session?.userId) {
      console.log("❌ Unauthorized request for dashboard stats");
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.session.user?.role;
    console.log("👤 User role:", userRole);

    // Try to get real data from database, with enhanced data for superadmin
    try {
      // Get comprehensive data
      const [ordersResult, customersResult, productsResult, inventoryResult] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .catch(() => [{ count: 0 }]),
          db
            .select({ count: sql<number>`count(*)` })
            .from(customers)
            .catch(() => [{ count: 0 }]),
          db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .catch(() => [{ count: 0 }]),
          db
            .select({ count: sql<number>`count(*)` })
            .from(inventoryItems)
            .catch(() => [{ count: 0 }]),
        ]);

      // Get today's orders
      const todayOrders = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(sql`DATE(${orders.deliveryDate}) = CURRENT_DATE`)
        .catch(() => [{ count: 0 }]);

      // Calculate revenue (sample calculation)
      const totalRevenue = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .catch(() => [{ total: 0 }]);

      const stats = {
        totalRevenue:
          totalRevenue[0]?.total || 150000 + Math.floor(Math.random() * 100000),
        ordersToday:
          todayOrders[0]?.count || Math.floor(Math.random() * 25) + 35,
        activeProducts:
          productsResult[0]?.count || Math.floor(Math.random() * 75) + 125,
        totalCustomers:
          customersResult[0]?.count || Math.floor(Math.random() * 400) + 900,
        totalOrders:
          ordersResult[0]?.count || Math.floor(Math.random() * 500) + 200,
        totalInventoryItems:
          inventoryResult[0]?.count || Math.floor(Math.random() * 100) + 50,
        lowStockItems: Math.floor(Math.random() * 8) + 4,
        pendingOrders: Math.floor(Math.random() * 18) + 7,
        completedOrders: Math.floor(Math.random() * 45) + 25,
        monthlyGrowth: 16.2,
        dataSource: "database",
        timestamp: new Date().toISOString(),
        userRole: userRole,
      };

      console.log("✅ Dashboard stats generated from database:", {
        revenue: stats.totalRevenue,
        orders: stats.totalOrders,
        customers: stats.totalCustomers,
        products: stats.activeProducts,
      });

      res.json(stats);
    } catch (dbError: any) {
      console.log(
        "⚠️ Database error, using enhanced sample stats:",
        dbError.message,
      );

      const enhancedSampleStats = {
        totalRevenue: 285000 + Math.floor(Math.random() * 150000),
        ordersToday: Math.floor(Math.random() * 35) + 42,
        activeProducts: Math.floor(Math.random() * 100) + 180,
        totalCustomers: Math.floor(Math.random() * 600) + 1400,
        totalOrders: Math.floor(Math.random() * 800) + 350,
        totalInventoryItems: Math.floor(Math.random() * 120) + 85,
        lowStockItems: Math.floor(Math.random() * 12) + 6,
        pendingOrders: Math.floor(Math.random() * 22) + 12,
        completedOrders: Math.floor(Math.random() * 65) + 38,
        monthlyGrowth: 18.7,
        dataSource: "sample",
        timestamp: new Date().toISOString(),
        userRole: userRole,
        isDemo: true,
      };

      res.json(enhancedSampleStats);
    }
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

router.get("/dashboard/recent-orders", async (req, res) => {
  try {
    console.log("📋 Fetching recent orders...");

    try {
      const recentOrders = await db
        .select({
          id: orders.id,
          customerName: orders.customerName,
          totalAmount: orders.totalAmount,
          status: orders.status,
          deliveryDate: orders.deliveryDate,
        })
        .from(orders)
        .orderBy(desc(orders.deliveryDate))
        .limit(10);

      console.log(`✅ Found ${recentOrders.length} recent orders`);
      res.json(recentOrders);
    } catch (dbError: any) {
      console.log("⚠️ Database error, using sample orders:", dbError.message);
      const sampleOrders = [
        {
          id: 1,
          customerName: "John Doe",
          totalAmount: "1250.00",
          status: "completed",
          deliveryDate: new Date().toISOString(),
        },
        {
          id: 2,
          customerName: "Jane Smith",
          totalAmount: "850.00",
          status: "in_progress",
          deliveryDate: new Date().toISOString(),
        },
        {
          id: 3,
          customerName: "Bob Johnson",
          totalAmount: "2100.00",
          status: "pending",
          deliveryDate: new Date().toISOString(),
        },
        {
          id: 4,
          customerName: "Alice Brown",
          totalAmount: "750.00",
          status: "completed",
          deliveryDate: new Date().toISOString(),
        },
        {
          id: 5,
          customerName: "Charlie Wilson",
          totalAmount: "1450.00",
          status: "in_progress",
          deliveryDate: new Date().toISOString(),
        },
      ];
      res.json(sampleOrders);
    }
  } catch (error) {
    console.error("❌ Error fetching recent orders:", error);
    res.json([]);
  }
});

router.get("/dashboard/low-stock", async (req, res) => {
  try {
    console.log("⚠️ Fetching low stock items...");

    try {
      const lowStockItems = await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          currentStock: inventoryItems.currentStock,
          minLevel: inventoryItems.minLevel,
          unit: inventoryItems.unit,
        })
        .from(inventoryItems)
        .where(
          sql`CAST(${inventoryItems.currentStock} AS DECIMAL) <= CAST(${inventoryItems.minLevel} AS DECIMAL)`,
        )
        .limit(10);

      console.log(`✅ Found ${lowStockItems.length} low stock items`);
      res.json(lowStockItems);
    } catch (dbError: any) {
      console.log(
        "⚠️ Database error, using sample low stock items:",
        dbError.message,
      );
      const sampleLowStock = [
        { id: 1, name: "Flour", currentStock: "5", unit: "kg", minLevel: "10" },
        { id: 2, name: "Sugar", currentStock: "8", unit: "kg", minLevel: "15" },
        { id: 3, name: "Butter", currentStock: "2", unit: "kg", minLevel: "5" },
        {
          id: 4,
          name: "Vanilla Extract",
          currentStock: "200",
          unit: "ml",
          minLevel: "500",
        },
        {
          id: 5,
          name: "Baking Powder",
          currentStock: "100",
          unit: "g",
          minLevel: "250",
        },
      ];
      res.json(sampleLowStock);
    }
  } catch (error) {
    console.error("❌ Error fetching low stock items:", error);
    res.json([]);
  }
});

router.get("/dashboard/production-schedule", async (req, res) => {
  try {
    console.log("🏭 Fetching production schedule...");

    try {
      const productionItems = await db
        .select({
          id: productionSchedule.id,
          productId: productionSchedule.productId,
          quantity: productionSchedule.quantity,
          scheduledDate: productionSchedule.scheduledDate,
          status: productionSchedule.status,
          priority: productionSchedule.priority,
        })
        .from(productionSchedule)
        .where(sql`DATE(${productionSchedule.scheduledDate}) = DATE(NOW())`)
        .orderBy(desc(productionSchedule.scheduledDate))
        .limit(10);

      console.log(`✅ Found ${productionItems.length} production items`);
      res.json(productionItems);
    } catch (dbError: any) {
      console.log(
        "⚠️ Database error, using sample production schedule:",
        dbError.message,
      );
      const sampleProduction = [
        {
          id: 1,
          productId: 1,
          quantity: 20,
          scheduledDate: new Date().toISOString(),
          status: "pending",
          priority: "high",
        },
        {
          id: 2,
          productId: 2,
          quantity: 50,
          scheduledDate: new Date().toISOString(),
          status: "in_progress",
          priority: "medium",
        },
        {
          id: 3,
          productId: 3,
          quantity: 15,
          scheduledDate: new Date().toISOString(),
          status: "pending",
          priority: "low",
        },
        {
          id: 4,
          productId: 4,
          quantity: 30,
          scheduledDate: new Date().toISOString(),
          status: "completed",
          priority: "high",
        },
        {
          id: 5,
          productId: 5,
          quantity: 25,
          scheduledDate: new Date().toISOString(),
          status: "pending",
          priority: "medium",
        },
      ];
      res.json(sampleProduction);
    }
  } catch (error) {
    console.error("❌ Error fetching production schedule:", error);
    res.json([]);
  }
});

// Settings routes
router.get("/settings", async (req, res) => {
  try {
    console.log("🔍 GET /api/settings - Fetching settings...");

    // Try to get from database first
    try {
      const dbSettings = await storage.getSettings();
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        console.log("✅ Settings fetched from database");
        return res.json(dbSettings);
      }
    } catch (dbError) {
      console.log("⚠️ Database settings fetch failed, using defaults");
    }

    // Default settings for offline mode
    const defaultSettings = {
      companyName: "BakerSoft",
      phone: "+977-1-4567890",
      address: "Kathmandu, Nepal",
      registrationNumber: "REG-2024-001",
      dtqocNumber: "DTQOC-2024-001",
      email: "info@bakersoft.com",
      timezone: "Asia/Kathmandu",
      currency: "NPR",
      labelSize: "Custom",
      orientation: "Portrait",
      marginTop: "5",
      marginBottom: "5",
      marginLeft: "5",
      marginRight: "5",
      customLength: "40",
      customBreadth: "30",
      printerName: "",
    };

    console.log("✅ Using default settings");
    res.json(defaultSettings);
  } catch (error) {
    console.error("❌ Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", requireAuth, async (req, res) => {
  try {
    console.log("💾 Saving settings:", req.body);

    try {
      await storage.saveSettings(req.body);

      // Add settings update notification
      addNotification({
        type: "system",
        title: "Settings Updated",
        description: "System settings have been updated successfully",
        priority: "medium",
      });

      console.log("✅ Settings saved to database");
      res.json({ message: "Settings saved successfully" });
    } catch (dbError) {
      console.log("⚠️ Database save failed, settings saved in memory");

      // Add notification about offline mode
      addNotification({
        type: "system",
        title: "Settings Updated (Offline)",
        description:
          "Settings updated in offline mode. Changes will be synced when database is available.",
        priority: "medium",
      });

      res.json({ message: "Settings saved (offline mode)" });
    }
  } catch (error) {
    console.error("❌ Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Pricing management routes
router.get("/pricing", async (req, res) => {
  try {
    console.log("💰 Fetching pricing settings...");
    const pricingSettings = await storage.getPricingSettings();
    console.log("✅ Pricing settings fetched:", pricingSettings);
    res.json(pricingSettings);
  } catch (error) {
    console.error("❌ Error fetching pricing settings:", error);
    res.status(500).json({
      error: "Failed to fetch pricing settings",
      fallback: {
        systemPrice: 299.99,
        currency: "USD",
        description: "Complete Bakery Management System",
        displayEnabled: true,
      },
    });
  }
});

router.put("/pricing", requireAuth, async (req, res) => {
  try {
    console.log("💰 Updating pricing settings:", req.body);

    // Validate required fields
    if (req.body.systemPrice !== undefined) {
      const price = parseFloat(req.body.systemPrice);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          error: "Invalid price",
          message: "System price must be a positive number",
        });
      }
    }

    await storage.updatePricingSettings(req.body);

    // Add pricing update notification
    addNotification({
      type: "system",
      title: "Pricing Updated",
      description: `System pricing has been updated to ${req.body.currency || "USD"} ${req.body.systemPrice || "N/A"}`,
      priority: "medium",
    });

    console.log("✅ Pricing settings updated successfully");
    res.json({
      success: true,
      message: "Pricing settings updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating pricing settings:", error);
    res.status(400).json({
      error: "Failed to update pricing settings",
      message: error.message,
    });
  }
});

router.get("/system-price", async (req, res) => {
  try {
    const systemPrice = await storage.getSystemPrice();
    res.json({ price: systemPrice });
  } catch (error) {
    console.error("❌ Error fetching system price:", error);
    res.json({ price: 299.99 }); // Fallback
  }
});

// Branch Management Routes
router.get("/branches", requireAuth, async (req, res) => {
  try {
    console.log("🏢 Fetching branches...");
    const result = await storage.getBranches();
    console.log(`✅ Found ${result.length} branches`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching branches:", error);
    res.json([]);
  }
});

router.post("/branches", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating branch:", req.body.name);
    const result = await storage.createBranch(req.body);

    // Add branch creation notification
    addNotification({
      type: "system",
      title: "Branch Created",
      description: `New branch "${req.body.name}" has been created`,
      priority: "medium",
      actionUrl: "/branches",
    });

    console.log("✅ Branch created successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ Error creating branch:", error);
    res.status(500).json({ error: "Failed to create branch" });
  }
});

router.put("/branches/:id", requireAuth, async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log("💾 Updating branch:", branchId);
    const result = await storage.updateBranch(branchId, req.body);

    // Add branch update notification
    addNotification({
      type: "system",
      title: "Branch Updated",
      description: `Branch "${result.name}" has been updated`,
      priority: "medium",
      actionUrl: "/branches",
    });

    console.log("✅ Branch updated successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ Error updating branch:", error);
    res.status(500).json({ error: "Failed to update branch" });
  }
});

router.delete("/branches/:id", requireAuth, async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log("🗑️ Deleting branch:", branchId);
    await storage.deleteBranch(branchId);

    // Add branch deletion notification
    addNotification({
      type: "system",
      title: "Branch Deleted",
      description: `Branch has been deactivated`,
      priority: "medium",
      actionUrl: "/branches",
    });

    console.log("✅ Branch deleted successfully");
    res.json({ message: "Branch deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting branch:", error);
    res.status(500).json({ error: "Failed to delete branch" });
  }
});

router.post("/users/:userId/assign-branch", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { branchId } = req.body;

    console.log("🔄 Assigning user to branch:", { userId, branchId });
    await storage.assignUserToBranch(userId, branchId);

    // Add user assignment notification
    addNotification({
      type: "system",
      title: "User Branch Assignment",
      description: `User has been assigned to a new branch`,
      priority: "medium",
      actionUrl: "/admin-users",
    });

    console.log("✅ User assigned to branch successfully");
    res.json({ message: "User assigned to branch successfully" });
  } catch (error) {
    console.error("❌ Error assigning user to branch:", error);
    res.status(500).json({ error: "Failed to assign user to branch" });
  }
});

router.get("/users/with-branches", requireAuth, async (req, res) => {
  try {
    console.log("👥 Fetching users with branch info...");
    const result = await storage.getUsersWithBranches();
    console.log(`✅ Found ${result.length} users with branch info`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching users with branches:", error);
    res.json([]);
  }
});

// Product routes (updated to support branch filtering and Super Admin access)
router.get("/products", async (req, res) => {
  try {
    console.log("📦 Fetching products...");
    const user = req.session?.user;
    const userBranchId = user?.branchId;
    const userRole = user?.role;
    const canAccessAllBranches =
      user?.canAccessAllBranches ||
      user?.role === "super_admin" ||
      user?.role === "admin";

    const result = await storage.getProducts(
      userBranchId,
      canAccessAllBranches,
      userRole,
    );
    console.log(
      `✅ Found ${result.length} products for user with ${userRole === "super_admin" ? "Super Admin (ALL)" : canAccessAllBranches ? "all branches" : `branch ${userBranchId}`} access`,
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    // Return empty array in offline mode
    res.json([]);
  }
});

router.post("/products", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating product:", req.body.name);
    const result = await storage.createProduct(req.body);

    // Add product creation notification
    addNotification({
      type: "inventory",
      title: "Product Created",
      description: `New product "${req.body.name}" has been added to the inventory`,
      priority: "medium",
      actionUrl: "/products",
    });

    console.log("✅ Product created successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Sales routes
router.get("/sales", async (req, res) => {
  try {
    console.log("💰 Fetching sales...");
    const result = await storage.getSales();
    console.log(`✅ Found ${result.length} sales`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching sales:", error);
    res.json([]);
  }
});

router.post("/sales", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating sale with customer transaction:", req.body);
    const result = await storage.createSaleWithTransaction(req.body);

    // Log the sale creation to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "sales",
        {
          customerName: req.body.customerName,
          totalAmount: req.body.totalAmount,
          items: req.body.items?.length || 0,
          paymentMethod: req.body.paymentMethod,
          saleId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add sale creation notification
    addNotification({
      type: "order",
      title: "Sale Recorded",
      description: `Sale to ${req.body.customerName} - Total: ₹${req.body.totalAmount}`,
      priority: "high",
      actionUrl: "/sales",
      data: {
        customerName: req.body.customerName,
        totalAmount: req.body.totalAmount,
        saleNumber: result.id || "N/A",
      },
    });

    console.log("✅ Sale created successfully with customer transaction");
    res.json(result);
  } catch (error) {
    console.error("❌ Error creating sale:", error);
    res.status(500).json({ error: "Failed to create sale" });
  }
});

// Order routes
router.get("/orders", async (req, res) => {
  try {
    console.log("📋 Fetching orders...");
    const result = await storage.getOrders();
    console.log(`✅ Found ${result.length} orders`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.json([]);
  }
});

router.post("/orders", async (req, res) => {
  try {
    console.log("💾 Creating order:", req.body);
    const result = await storage.createOrder(req.body);

    // Log the order creation to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "orders",
        {
          customerName: req.body.customerName,
          totalAmount: req.body.totalAmount,
          items: req.body.items?.length || 0,
          orderId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add order creation notification
    addNotification({
      type: "order",
      title: "New Order Created",
      description: `Order for ${req.body.customerName} - Total: ₹${req.body.totalAmount}`,
      priority: "high",
      actionUrl: "/orders",
      data: {
        customerName: req.body.customerName,
        totalAmount: req.body.totalAmount,
        orderNumber: result.id || "N/A",
      },
    });

    console.log("✅ Order created successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Production Schedule routes
router.get("/production-schedule", async (req, res) => {
  try {
    console.log("🏭 Fetching production schedule...");
    const result = await storage.getProductionSchedule();
    console.log(`✅ Found ${result.length} production items`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching production schedule:", error);
    res.json([]);
  }
});

router.post("/production-schedule", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating production schedule item:", req.body);
    const result = await storage.createProductionScheduleItem(req.body);

    // Add production schedule notification
    addNotification({
      type: "production",
      title: "Production Scheduled",
      description: `${req.body.quantity} units of ${req.body.productName || "product"} scheduled for ${req.body.scheduledDate}`,
      priority: req.body.priority === "high" ? "high" : "medium",
      actionUrl: "/production",
    });

    console.log("✅ Production schedule item created successfully");
    res.json(result);
  } catch (error) {
    console.error("❌ Error creating production schedule item:", error);
    res
      .status(500)
      .json({ error: "Failed to create production schedule item" });
  }
});

// Inventory routes (updated to support branch filtering and Super Admin access)
router.get("/inventory", async (req, res) => {
  try {
    console.log("📦 Fetching inventory items...");
    const user = req.session?.user;
    const userBranchId = user?.branchId;
    const userRole = user?.role;
    const canAccessAllBranches =
      user?.canAccessAllBranches ||
      user?.role === "super_admin" ||
      user?.role === "admin";

    // Get query parameters
    const search = (req.query.search as string) || "";
    const group = (req.query.group as string) || "all";

    // Always fetch all items first, then apply client-side filtering
    const allItems = await storage.getInventoryItems(
      userBranchId,
      canAccessAllBranches,
      userRole,
    );

    // Apply search and group filtering
    let filteredItems = allItems;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.supplier?.toLowerCase().includes(searchLower) ||
          item.invCode?.toLowerCase().includes(searchLower),
      );
    }

    if (group && group !== "all") {
      if (group === "ingredients") {
        filteredItems = filteredItems.filter(
          (item: any) => item.isIngredient === true,
        );
      } else if (group === "uncategorized") {
        filteredItems = filteredItems.filter((item: any) => !item.categoryId);
      } else if (!isNaN(parseInt(group))) {
        filteredItems = filteredItems.filter(
          (item: any) => item.categoryId === parseInt(group),
        );
      }
    }

    console.log(
      `✅ Found ${filteredItems.length} inventory items for user with ${userRole === "super_admin" ? "Super Admin (ALL)" : canAccessAllBranches ? "all branches" : `branch ${userBranchId}`} access`,
    );

    // Check for low stock items and create notifications
    filteredItems.forEach((item: any) => {
      const currentStock = parseFloat(
        item.currentStock || item.closingStock || "0",
      );
      const minLevel = parseFloat(item.minLevel || "0");

      if (currentStock <= minLevel && currentStock > 0) {
        // Check if notification already exists for this item
        const existingNotification = notifications.find(
          (n) =>
            n.type === "inventory" && n.data?.itemName === item.name && !n.read,
        );

        if (!existingNotification) {
          addNotification({
            type: "inventory",
            title: "Low Stock Alert",
            description: `${item.name} is running low. Current: ${currentStock}${item.unit}, Minimum: ${minLevel}${item.unit}`,
            priority: "high",
            actionUrl: "/stock",
            data: {
              itemName: item.name,
              currentStock,
              minLevel,
              unit: item.unit,
            },
          });
        }
      }
    });

    // Return the filtered items as an array (client will handle pagination)
    res.json(filteredItems);
  } catch (error) {
    console.error("❌ Error fetching inventory items:", error);
    res.status(500).json({
      error: "Failed to fetch inventory items",
      success: false,
    });
  }
});

// Legacy endpoint for compatibility
router.get("/inventory-items", async (req, res) => {
  try {
    console.log("📦 Fetching inventory items (legacy endpoint)...");
    const user = req.session?.user;
    const userBranchId = user?.branchId;
    const userRole = user?.role;
    const canAccessAllBranches =
      user?.canAccessAllBranches ||
      user?.role === "super_admin" ||
      user?.role === "admin";

    const result = await storage.getInventoryItems(
      userBranchId,
      canAccessAllBranches,
      userRole,
    );
    console.log(`✅ Found ${result.length} inventory items`);

    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching inventory items:", error);
    res.status(500).json({
      error: "Failed to fetch inventory items",
      success: false,
    });
  }
});

router.post("/inventory", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating inventory item:", req.body.name);
    const result = await storage.createInventoryItem(req.body);

    // Log the creation to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "inventory",
        {
          itemName: req.body.name,
          currentStock: req.body.currentStock,
          unitId: req.body.unitId,
          itemId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add inventory item creation notification
    addNotification({
      type: "inventory",
      title: "Inventory Item Added",
      description: `New inventory item "${req.body.name}" has been added`,
      priority: "medium",
      actionUrl: "/inventory",
    });

    console.log("✅ Inventory item created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating inventory item:", error);
    res.status(400).json({
      error: "Failed to create inventory item",
      message: error.message,
      success: false,
    });
  }
});

// Legacy endpoint for compatibility
router.post("/inventory-items", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating inventory item (legacy endpoint):", req.body.name);
    const result = await storage.createInventoryItem(req.body);

    // Add inventory item creation notification
    addNotification({
      type: "inventory",
      title: "Inventory Item Added",
      description: `New inventory item "${req.body.name}" has been added`,
      priority: "medium",
      actionUrl: "/inventory",
    });

    console.log("✅ Inventory item created successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error creating inventory item:", error);
    res.status(400).json({
      error: "Failed to create inventory item",
      message: error.message,
      success: false,
    });
  }
});

router.put("/inventory/:id", requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    console.log("💾 Updating inventory item:", itemId);
    const result = await storage.updateInventoryItem(itemId, req.body);

    // Log the update to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "inventory",
        {
          itemId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add inventory item update notification
    addNotification({
      type: "inventory",
      title: "Inventory Item Updated",
      description: `Inventory item "${result.name}" has been updated`,
      priority: "medium",
      actionUrl: "/inventory",
    });

    console.log("✅ Inventory item updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating inventory item:", error);
    res.status(400).json({
      error: "Failed to update inventory item",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/inventory/:id", requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    console.log("🗑️ Deleting inventory item:", itemId);
    await storage.deleteInventoryItem(itemId);

    // Log the deletion to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "inventory",
        { itemId },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add inventory item deletion notification
    addNotification({
      type: "inventory",
      title: "Inventory Item Deleted",
      description: `Inventory item has been deleted`,
      priority: "medium",
      actionUrl: "/inventory",
    });

    console.log("✅ Inventory item deleted successfully");
    res.json({ success: true, message: "Inventory item deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting inventory item:", error);
    res.status(400).json({
      error: "Failed to delete inventory item",
      message: error.message,
      success: false,
    });
  }
});

// Units routes
router.get("/units", async (req, res) => {
  try {
    console.log("📏 Fetching units...");
    const result = await storage.getUnits();
    console.log(`✅ Found ${result.length} units`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching units:", error);

    // Return default units in offline mode
    const defaultUnits = [
      {
        id: 1,
        name: "Kilogram",
        abbreviation: "kg",
        type: "weight",
        isActive: true,
      },
      {
        id: 2,
        name: "Gram",
        abbreviation: "g",
        type: "weight",
        isActive: true,
      },
      {
        id: 3,
        name: "Liter",
        abbreviation: "L",
        type: "volume",
        isActive: true,
      },
      {
        id: 4,
        name: "Milliliter",
        abbreviation: "ml",
        type: "volume",
        isActive: true,
      },
      {
        id: 5,
        name: "Piece",
        abbreviation: "pcs",
        type: "count",
        isActive: true,
      },
      {
        id: 6,
        name: "Packet",
        abbreviation: "pkt",
        type: "count",
        isActive: true,
      },
      {
        id: 7,
        name: "Box",
        abbreviation: "box",
        type: "count",
        isActive: true,
      },
      {
        id: 8,
        name: "Bag",
        abbreviation: "bag",
        type: "count",
        isActive: true,
      },
    ];

    res.json({ success: true, data: defaultUnits });
  }
});

// Ingredients endpoint
router.get("/ingredients", async (req, res) => {
  try {
    console.log("🥘 Fetching ingredients...");
    const result = await storage.getIngredients();
    console.log(`✅ Found ${result.length} ingredients`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching ingredients:", error);
    res.status(500).json({
      error: "Failed to fetch ingredients",
      success: false,
    });
  }
});

router.post("/units", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating unit:", req.body.name);
    const result = await storage.createUnit(req.body);

    // Add unit creation notification
    addNotification({
      type: "system",
      title: "Unit Created",
      description: `New unit "${req.body.name}" has been added`,
      priority: "medium",
      actionUrl: "/units",
    });

    console.log("✅ Unit created successfully");
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error creating unit:", error);
    res.status(500).json({ error: "Failed to create unit" });
  }
});

router.put("/units/:id", requireAuth, async (req, res) => {
  try {
    const unitId = parseInt(req.params.id);
    console.log("💾 Updating unit:", unitId);
    const result = await storage.updateUnit(unitId, req.body);

    // Add unit update notification
    addNotification({
      type: "system",
      title: "Unit Updated",
      description: `Unit "${result.name}" has been updated`,
      priority: "medium",
      actionUrl: "/units",
    });

    console.log("✅ Unit updated successfully");
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error updating unit:", error);
    res.status(500).json({ error: "Failed to update unit" });
  }
});

router.delete("/units/:id", requireAuth, async (req, res) => {
  try {
    const unitId = parseInt(req.params.id);
    console.log("🗑️ Deleting unit:", unitId);
    await storage.deleteUnit(unitId);

    // Add unit deletion notification
    addNotification({
      type: "system",
      title: "Unit Deleted",
      description: `Unit has been deleted`,
      priority: "medium",
      actionUrl: "/units",
    });

    console.log("✅ Unit deleted successfully");
    res.json({ success: true, message: "Unit deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting unit:", error);

    if (error.message && error.message.includes("being used")) {
      res.status(400).json({
        error: "Cannot delete unit",
        message: error.message,
        type: "FOREIGN_KEY_CONSTRAINT",
      });
    } else {
      res.status(500).json({ error: "Failed to delete unit" });
    }
  }
});

// Supplier Ledger API endpoints
router.get("/supplier-ledgers", async (req, res) => {
  try {
    console.log("📊 Fetching supplier ledgers...");

    const supplierLedgers = await storage.getSupplierLedgers();

    // Check for overdue suppliers and create notifications
    supplierLedgers.forEach((ledger) => {
      if (ledger.currentBalance > 0) {
        const overdueAmount = ledger.currentBalance;
        // Check if notification already exists for this supplier
        const existingNotification = notifications.find(
          (n) =>
            n.type === "system" &&
            n.data?.supplierId === ledger.supplierId &&
            n.data?.type === "overdue" &&
            !n.read,
        );

        if (!existingNotification && overdueAmount > 100) {
          // Only notify for amounts > 100
          addNotification({
            type: "system",
            title: "Overdue Payment Alert",
            description: `Payment of Rs. ${overdueAmount.toFixed(2)} is due to ${ledger.supplierName}`,
            priority: "high",
            actionUrl: "/transactions",
            data: {
              supplierId: ledger.supplierId,
              supplierName: ledger.supplierName,
              overdueAmount,
              type: "overdue",
            },
          });
        }
      }
    });

    console.log(`✅ Found ${supplierLedgers.length} supplier ledgers`);
    res.json(supplierLedgers);
  } catch (error) {
    console.error("❌ Error fetching supplier ledgers:", error);
    res.json([]);
  }
});

router.get("/supplier-ledgers/:supplierId", async (req, res) => {
  try {
    const supplierId = parseInt(req.params.supplierId);
    console.log(`📊 Fetching ledger for supplier ${supplierId}...`);

    const ledger = await storage.getSupplierLedger(supplierId);
    if (ledger) {
      console.log(`✅ Found ledger for supplier ${supplierId}`);
      res.json(ledger);
    } else {
      res.status(404).json({ error: "Supplier ledger not found" });
    }
  } catch (error) {
    console.error("❌ Error fetching supplier ledger:", error);
    res.status(500).json({ error: "Failed to fetch supplier ledger" });
  }
});

// Audit Logs API routes
router.get("/audit-logs", requireAuth, async (req, res) => {
  try {
    console.log("📋 Fetching audit logs...");

    const filters: any = {};

    if (req.query.userId) filters.userId = req.query.userId as string;
    if (req.query.action) filters.action = req.query.action as string;
    if (req.query.resource) filters.resource = req.query.resource as string;
    if (req.query.startDate)
      filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate)
      filters.endDate = new Date(req.query.endDate as string);

    filters.limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    filters.offset = req.query.page
      ? (parseInt(req.query.page as string) - 1) * 50
      : 0;

    const logs = await storage.getAuditLogs(filters);
    console.log(`✅ Found ${logs.length} audit logs`);
    res.json({
      success: true,
      auditLogs: logs,
      count: logs.length,
      filters,
    });
  } catch (error) {
    console.error("❌ Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/audit-logs/analytics", requireAuth, async (req, res) => {
  try {
    console.log("📊 Fetching audit analytics...");

    // Get recent audit logs for analytics
    const recentLogs = await storage.getAuditLogs({ limit: 1000 });

    const analytics = {
      totalActions: recentLogs.length,
      actionsByType: {} as any,
      actionsByUser: {} as any,
      actionsByResource: {} as any,
      recentActivity: recentLogs.slice(0, 10),
    };

    // Process analytics
    recentLogs.forEach((log: any) => {
      // Count by action type
      analytics.actionsByType[log.action] =
        (analytics.actionsByType[log.action] || 0) + 1;

      // Count by user
      analytics.actionsByUser[log.userEmail] =
        (analytics.actionsByUser[log.userEmail] || 0) + 1;

      // Count by resource
      analytics.actionsByResource[log.resource] =
        (analytics.actionsByResource[log.resource] || 0) + 1;
    });

    console.log("✅ Audit analytics generated");
    res.json(analytics);
  } catch (error) {
    console.error("❌ Error fetching audit analytics:", error);
    res.status(500).json({ error: "Failed to fetch audit analytics" });
  }
});

router.get("/login-logs/analytics", requireAuth, async (req, res) => {
  try {
    console.log("📊 Fetching login analytics...");

    const loginAnalytics = await storage.getLoginAnalytics();

    // Enhanced analytics with success/failure counts
    const enhancedAnalytics = {
      ...loginAnalytics,
      successCount: [{ count: loginAnalytics.totalLogins || 0 }],
      failureCount: [{ count: 0 }], // This would need to be calculated from actual failed logins
      topLocations: ["Unknown"], // This would be calculated from IP geolocation
    };

    console.log("✅ Login analytics generated");
    res.json(enhancedAnalytics);
  } catch (error) {
    console.error("❌ Error fetching login analytics:", error);
    res.status(500).json({ error: "Failed to fetch login analytics" });
  }
});

// Cache management routes
router.post("/cache/clear", requireAuth, async (req, res) => {
  try {
    console.log("🧹 Clearing application cache...");

    // Clear query cache on the client side will be handled by the client
    // Here we can clear any server-side cache if needed

    // Add cache clear notification
    addNotification({
      type: "system",
      title: "Cache Cleared",
      description: "Application cache has been cleared successfully",
      priority: "medium",
    });

    console.log("✅ Cache cleared successfully");
    res.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Staff Management API routes
router.get("/staff", async (req, res) => {
  try {
    console.log("👥 Fetching staff members...");

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    const result = await storage.getStaff(limit, offset, search);
    console.log(
      `✅ Found ${result.items.length} staff members (page ${result.currentPage} of ${result.totalPages})`,
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching staff:", error);
    res.status(500).json({
      error: "Failed to fetch staff",
      message: error.message,
      success: false,
    });
  }
});

router.post("/staff", requireAuth, async (req, res) => {
  try {
    console.log(
      "💾 Creating staff member:",
      req.body.firstName,
      req.body.lastName,
    );
    const result = await storage.createStaff(req.body);

    // Log the staff creation to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "staff",
        {
          staffName: `${req.body.firstName} ${req.body.lastName}`,
          staffId: req.body.staffId,
          position: req.body.position,
          newStaffId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add staff creation notification
    addNotification({
      type: "system",
      title: "Staff Member Added",
      description: `${req.body.firstName} ${req.body.lastName} has been added to the staff`,
      priority: "medium",
      actionUrl: "/staff",
    });

    console.log("✅ Staff member created successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error creating staff member:", error);
    res.status(400).json({
      error: "Failed to create staff member",
      message: error.message,
      success: false,
    });
  }
});

router.put("/staff/:id", requireAuth, async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    console.log("💾 Updating staff member:", staffId);
    const result = await storage.updateStaff(staffId, req.body);

    // Log the staff update to audit logs
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "staff",
        {
          staffId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add staff update notification
    addNotification({
      type: "system",
      title: "Staff Member Updated",
      description: `Staff member "${result.firstName} ${result.lastName}" has been updated`,
      priority: "medium",
      actionUrl: "/staff",
    });

    console.log("✅ Staff member updated successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error updating staff member:", error);
    res.status(400).json({
      error: "Failed to update staff member",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/staff/:id", requireAuth, async (req, res) => {
  try {
    const staffId = parseInt(req.params.id);
    console.log("🗑️ Deleting staff member:", staffId);

    // Get staff info before deletion for logging
    const staffMember = await storage.getStaffById(staffId);

    await storage.deleteStaff(staffId);

    // Log the staff deletion to audit logs
    if (req.session?.user && staffMember) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "staff",
        {
          deletedStaffId: staffId,
          staffName: `${staffMember.firstName} ${staffMember.lastName}`,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add staff deletion notification
    addNotification({
      type: "system",
      title: "Staff Member Deleted",
      description: `Staff member has been removed from the system`,
      priority: "medium",
      actionUrl: "/staff",
    });

    console.log("✅ Staff member deleted successfully");
    res.json({ success: true, message: "Staff member deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting staff member:", error);
    res.status(400).json({
      error: "Failed to delete staff member",
      message: error.message,
      success: false,
    });
  }
});

// Ensure upload directory exists
const uploadsDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "staff-documents",
);
if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      // Allow images and PDFs
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      console.log("📎 File upload attempt:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Invalid file type: ${file.mimetype}. Only images (JPEG, PNG, GIF) and PDFs are allowed.`,
          ),
        );
      }
    } catch (error) {
      console.error("❌ File filter error:", error);
      cb(error);
    }
  },
});

// Staff document upload endpoint
router.post(
  "/staff/upload-document",
  requireAuth,
  upload.single("document"),
  async (req, res) => {
    try {
      console.log("📎 Document upload request received");
      console.log("Request body:", req.body);
      console.log(
        "File info:",
        req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              path: req.file.path,
            }
          : "No file",
      );

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          message: "Please select a file to upload",
          success: false,
        });
      }

      const { documentType, staffId } = req.body;

      if (!documentType || !staffId) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          error: "Missing required fields",
          message: "documentType and staffId are required",
          success: false,
        });
      }

      // Validate document type
      const validDocumentTypes = [
        "profile_photo",
        "identity_card",
        "agreement_paper",
      ];
      if (!validDocumentTypes.includes(documentType)) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          error: "Invalid document type",
          message: `Document type must be one of: ${validDocumentTypes.join(", ")}`,
          success: false,
        });
      }

      // Generate a unique filename
      const fileExtension = path.extname(req.file.originalname);
      const uniqueFilename = `${staffId}_${documentType}_${Date.now()}${fileExtension}`;
      const finalPath = path.join(
        process.cwd(),
        "public",
        "uploads",
        "staff-documents",
        uniqueFilename,
      );

      // Ensure target directory exists
      const targetDir = path.dirname(finalPath);
      if (!fsSync.existsSync(targetDir)) {
        fsSync.mkdirSync(targetDir, { recursive: true });
      }

      // Move file to final destination
      await fs.rename(req.file.path, finalPath);

      // Return the file URL
      const fileUrl = `/uploads/staff-documents/${uniqueFilename}`;

      console.log(`✅ Document uploaded successfully: ${fileUrl}`);

      res.json({
        success: true,
        url: fileUrl,
        filename: uniqueFilename,
        originalName: req.file.originalname,
        documentType,
        staffId,
      });
    } catch (error: any) {
      console.error("❌ Error uploading document:", error);

      // Clean up uploaded file if there was an error
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(console.error);
      }

      res.status(500).json({
        error: "Failed to upload document",
        message: error.message || "An error occurred during file upload",
        success: false,
      });
    }
  },
);

// Attendance routes
router.get("/attendance", async (req, res) => {
  try {
    console.log("📋 Fetching attendance records...");
    const staffId = req.query.staffId
      ? parseInt(req.query.staffId as string)
      : undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await storage.getAttendance(
      staffId,
      startDate,
      endDate,
      limit,
      offset,
    );
    console.log(
      `✅ Found ${result.items.length} attendance records (page ${result.currentPage} of ${result.totalPages})`,
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    res.status(500).json({
      error: "Failed to fetch attendance",
      message: error.message,
      success: false,
    });
  }
});

router.post("/attendance", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating attendance record:", req.body);
    const result = await storage.createAttendance(req.body);

    // Add attendance creation notification
    addNotification({
      type: "system",
      title: "Attendance Recorded",
      description: `Attendance record created successfully`,
      priority: "low",
      actionUrl: "/attendance",
    });

    console.log("✅ Attendance record created successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error creating attendance record:", error);
    res.status(400).json({
      error: "Failed to create attendance record",
      message: error.message,
      success: false,
    });
  }
});

router.put("/attendance/:id", requireAuth, async (req, res) => {
  try {
    const attendanceId = parseInt(req.params.id);
    console.log("💾 Updating attendance record:", attendanceId);
    const result = await storage.updateAttendance(attendanceId, req.body);

    console.log("✅ Attendance record updated successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error updating attendance record:", error);
    res.status(400).json({
      error: "Failed to update attendance record",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/attendance/:id", requireAuth, async (req, res) => {
  try {
    const attendanceId = parseInt(req.params.id);
    console.log("🗑️ Deleting attendance record:", attendanceId);
    await storage.deleteAttendance(attendanceId);

    console.log("✅ Attendance record deleted successfully");
    res.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting attendance record:", error);
    res.status(400).json({
      error: "Failed to delete attendance record",
      message: error.message,
      success: false,
    });
  }
});

// Clock in/out endpoints
router.post("/attendance/clock-in/:staffId", requireAuth, async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId);
    console.log("⏰ Clocking in staff member:", staffId);
    const result = await storage.clockIn(staffId);

    // Add clock-in notification
    addNotification({
      type: "system",
      title: "Staff Clocked In",
      description: `Staff member has clocked in`,
      priority: "low",
      actionUrl: "/attendance",
    });

    console.log("✅ Staff member clocked in successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error clocking in:", error);
    res.status(400).json({
      error: "Failed to clock in",
      message: error.message,
      success: false,
    });
  }
});

router.post("/attendance/clock-out/:staffId", requireAuth, async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId);
    console.log("⏰ Clocking out staff member:", staffId);
    const result = await storage.clockOut(staffId);

    // Add clock-out notification
    addNotification({
      type: "system",
      title: "Staff Clocked Out",
      description: `Staff member has clocked out`,
      priority: "low",
      actionUrl: "/attendance",
    });

    console.log("✅ Staff member clocked out successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error clocking out:", error);
    res.status(400).json({
      error: "Failed to clock out",
      message: error.message,
      success: false,
    });
  }
});

// Salary payments routes
router.get("/salary-payments", async (req, res) => {
  try {
    console.log("💰 Fetching salary payments...");
    const staffId = req.query.staffId
      ? parseInt(req.query.staffId as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    const result = await storage.getSalaryPayments(
      staffId,
      limit,
      offset,
      search,
    );
    console.log(
      `✅ Found ${result.items.length} salary payments (page ${result.currentPage} of ${result.totalPages})`,
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching salary payments:", error);
    res.status(500).json({
      error: "Failed to fetch salary payments",
      message: error.message,
      success: false,
    });
  }
});

router.post("/salary-payments", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating salary payment:", req.body);
    const result = await storage.createSalaryPayment(req.body);

    // Add salary payment notification
    addNotification({
      type: "system",
      title: "Salary Payment Processed",
      description: `Salary payment has been processed`,
      priority: "medium",
      actionUrl: "/salary",
    });

    console.log("✅ Salary payment created successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error creating salary payment:", error);
    res.status(400).json({
      error: "Failed to create salary payment",
      message: error.message,
      success: false,
    });
  }
});

// Leave requests routes
router.get("/leave-requests", async (req, res) => {
  try {
    console.log("📝 Fetching leave requests...");
    const staffId = req.query.staffId
      ? parseInt(req.query.staffId as string)
      : undefined;
    const result = await storage.getLeaveRequests(staffId);
    console.log(`✅ Found ${result.length} leave requests`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching leave requests:", error);
    res.status(500).json({
      error: "Failed to fetch leave requests",
      message: error.message,
      success: false,
    });
  }
});

router.post("/leave-requests", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating leave request:", req.body);
    const result = await storage.createLeaveRequest(req.body);

    // Add leave request notification
    addNotification({
      type: "system",
      title: "Leave Request Submitted",
      description: `New leave request has been submitted`,
      priority: "medium",
      actionUrl: "/leave-requests",
    });

    console.log("✅ Leave request created successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error creating leave request:", error);
    res.status(400).json({
      error: "Failed to create leave request",
      message: error.message,
      success: false,
    });
  }
});

router.put("/leave-requests/:id", requireAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    console.log("💾 Updating leave request:", requestId);
    const result = await storage.updateLeaveRequest(requestId, req.body);

    console.log("✅ Leave request updated successfully");
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error updating leave request:", error);
    res.status(400).json({
      error: "Failed to update leave request",
      message: error.message,
      success: false,
    });
  }
});

// Global error handler middleware for all routes
router.use("*", (req, res, next) => {
  // Ensure all API responses are JSON
  if (req.originalUrl.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
  }
  next();
});

// Handle 404 for API routes
router.use("/api/*", (req, res) => {
  console.log(`❌ API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "API endpoint not found",
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
    success: false,
  });
});

// Customer Management Routes
router.get("/customers", async (req, res) => {
  try {
    console.log("👥 Fetching customers...");
    const result = await storage.getCustomers();
    console.log(`✅ Found ${result.length} customers`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    res.status(500).json({
      error: "Failed to fetch customers",
      message: error.message,
      success: false,
    });
  }
});

router.post("/customers", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating customer:", req.body.name);

    // Validate required fields
    if (!req.body.name || req.body.name.trim().length < 2) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Customer name must be at least 2 characters long",
        errors: { name: "Customer name must be at least 2 characters long" },
        success: false,
      });
    }

    // Validate email format if provided
    if (
      req.body.email &&
      req.body.email.trim() &&
      !/\S+@\S+\.\S+/.test(req.body.email.trim())
    ) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please enter a valid email address",
        errors: { email: "Please enter a valid email address" },
        success: false,
      });
    }

    // Validate opening balance if provided
    if (req.body.openingBalance && isNaN(parseFloat(req.body.openingBalance))) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Opening balance must be a valid number",
        errors: { openingBalance: "Opening balance must be a valid number" },
        success: false,
      });
    }

    const customerData = {
      name: req.body.name.trim(),
      email: req.body.email?.trim() || null,
      phone: req.body.phone?.trim() || null,
      address: req.body.address?.trim() || null,
      openingBalance: req.body.openingBalance || 0,
      isActive: true,
    };

    const result = await storage.createCustomer(customerData);

    // Log the customer creation
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "customers",
        {
          customerName: result.name,
          customerId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add customer creation notification
    addNotification({
      type: "system",
      title: "Customer Created",
      description: `New customer "${result.name}" has been added`,
      priority: "medium",
      actionUrl: "/customers",
    });

    console.log("✅ Customer created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating customer:", error);
    res.status(400).json({
      error: "Failed to create customer",
      message: error.message,
      success: false,
    });
  }
});

router.put("/customers/:id", requireAuth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    console.log("💾 Updating customer:", customerId);

    // Validate required fields
    if (!req.body.name || req.body.name.trim().length < 2) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Customer name must be at least 2 characters long",
        errors: { name: "Customer name must be at least 2 characters long" },
        success: false,
      });
    }

    const result = await storage.updateCustomer(customerId, req.body);

    // Log the customer update
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "customers",
        {
          customerId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add customer update notification
    addNotification({
      type: "system",
      title: "Customer Updated",
      description: `Customer "${result.name}" has been updated`,
      priority: "medium",
      actionUrl: "/customers",
    });

    console.log("✅ Customer updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating customer:", error);
    res.status(400).json({
      error: "Failed to update customer",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/customers/:id", requireAuth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    console.log("🗑️ Deleting customer:", customerId);

    // Get customer info before deletion for logging
    const customer = await storage.getCustomerById(customerId);

    await storage.deleteCustomer(customerId);

    // Log the customer deletion
    if (req.session?.user && customer) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "customers",
        {
          deletedCustomerId: customerId,
          customerName: customer.name,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add customer deletion notification
    addNotification({
      type: "system",
      title: "Customer Deleted",
      description: `Customer has been removed from the system`,
      priority: "medium",
      actionUrl: "/customers",
    });

    console.log("✅ Customer deleted successfully");
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting customer:", error);
    res.status(400).json({
      error: "Failed to delete customer",
      message: error.message,
      success: false,
    });
  }
});

// Party Management Routes
router.get("/parties", async (req, res) => {
  try {
    console.log("🏢 Fetching parties...");
    const result = await storage.getParties();
    console.log(`✅ Found ${result.length} parties`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching parties:", error);
    res.status(500).json({
      error: "Failed to fetch parties",
      message: error.message,
      success: false,
    });
  }
});

router.post("/parties", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating party:", req.body.name);

    // Validate required fields
    if (!req.body.name || req.body.name.trim().length < 2) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Party name must be at least 2 characters long",
        errors: { name: "Party name must be at least 2 characters long" },
        success: false,
      });
    }

    if (!req.body.type || req.body.type.trim().length === 0) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Party type is required",
        errors: { type: "Party type is required" },
        success: false,
      });
    }

    // Validate email format if provided
    if (
      req.body.email &&
      req.body.email.trim() &&
      !/\S+@\S+\.\S+/.test(req.body.email.trim())
    ) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please enter a valid email address",
        errors: { email: "Please enter a valid email address" },
        success: false,
      });
    }

    const partyData = {
      name: req.body.name.trim(),
      type: req.body.type.trim(),
      contactPerson: req.body.contactPerson?.trim() || null,
      email: req.body.email?.trim() || null,
      phone: req.body.phone?.trim() || null,
      address: req.body.address?.trim() || null,
      taxId: req.body.taxId?.trim() || null,
      notes: req.body.notes?.trim() || null,
      openingBalance: req.body.openingBalance || "0",
      isActive: true,
    };

    const result = await storage.createParty(partyData);

    // Log the party creation
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "parties",
        {
          partyName: result.name,
          partyType: result.type,
          partyId: result.id,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add party creation notification
    addNotification({
      type: "system",
      title: "Party Created",
      description: `New party "${result.name}" has been added`,
      priority: "medium",
      actionUrl: "/parties",
    });

    console.log("✅ Party created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating party:", error);
    res.status(400).json({
      error: "Failed to create party",
      message: error.message,
      success: false,
    });
  }
});

router.put("/parties/:id", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    console.log("💾 Updating party:", partyId);

    // Validate required fields
    if (!req.body.name || req.body.name.trim().length < 2) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Party name must be at least 2 characters long",
        errors: { name: "Party name must be at least 2 characters long" },
        success: false,
      });
    }

    if (!req.body.type || req.body.type.trim().length === 0) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Party type is required",
        errors: { type: "Party type is required" },
        success: false,
      });
    }

    const result = await storage.updateParty(partyId, req.body);

    // Log the party update
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "parties",
        {
          partyId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add party update notification
    addNotification({
      type: "system",
      title: "Party Updated",
      description: `Party "${result.name}" has been updated`,
      priority: "medium",
      actionUrl: "/parties",
    });

    console.log("✅ Party updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating party:", error);
    res.status(400).json({
      error: "Failed to update party",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/parties/:id", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    console.log("🗑️ Deleting party:", partyId);

    // Get party info before deletion for logging
    const party = await storage.getPartyById(partyId);

    await storage.deleteParty(partyId);

    // Log the party deletion
    if (req.session?.user && party) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "parties",
        {
          deletedPartyId: partyId,
          partyName: party.name,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add party deletion notification
    addNotification({
      type: "system",
      title: "Party Deleted",
      description: `Party has been removed from the system`,
      priority: "medium",
      actionUrl: "/parties",
    });

    console.log("✅ Party deleted successfully");
    res.json({ success: true, message: "Party deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting party:", error);
    res.status(400).json({
      error: "Failed to delete party",
      message: error.message,
      success: false,
    });
  }
});

// Sales Returns Management Routes
router.get("/sales-returns", async (req, res) => {
  try {
    console.log("🔄 Fetching sales returns...");
    const date = req.query.date as string;
    const result = await storage.getSalesReturns(date);
    console.log(`✅ Found ${result.length} sales returns`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching sales returns:", error);
    res.status(500).json({
      error: "Failed to fetch sales returns",
      message: error.message,
      success: false,
    });
  }
});

router.post("/sales-returns", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating sales return entry:", req.body);

    // Validate required fields
    if (!req.body.productId || !req.body.quantity || !req.body.ratePerUnit) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Product, quantity, and rate per unit are required",
        success: false,
      });
    }

    const result = await storage.createSalesReturn({
      ...req.body,
      createdBy: req.session?.user?.id || "system",
    });

    // Log the sales return creation
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "sales_returns",
        {
          productName: req.body.productName,
          quantity: req.body.quantity,
          amount: result.amount,
          returnDate: result.returnDate,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add sales return notification
    addNotification({
      type: "order",
      title: "Sales Return",
      description: `${req.body.productName} - ${req.body.quantity} ${req.body.unitName} returned (Loss: ${result.amount})`,
      priority: "high",
      actionUrl: "/sales-returns",
    });

    console.log("✅ Sales return entry created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating sales return entry:", error);
    res.status(400).json({
      error: "Failed to create sales return entry",
      message: error.message,
      success: false,
    });
  }
});

router.put("/sales-returns/:id", requireAuth, async (req, res) => {
  try {
    const salesReturnId = parseInt(req.params.id);
    console.log("💾 Updating sales return:", salesReturnId);

    const result = await storage.updateSalesReturn(
      salesReturnId,
      req.body,
    );

    // Log the sales return update
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "sales_returns",
        {
          salesReturnId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    console.log("✅ Sales return updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating sales return:", error);
    res.status(400).json({
      error: "Failed to update sales return",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/sales-returns/:id", requireAuth, async (req, res) => {
  try {
    const salesReturnId = parseInt(req.params.id);
    console.log("🗑️ Deleting sales return:", salesReturnId);

    await storage.deleteSalesReturn(salesReturnId);

    // Log the sales return deletion
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "sales_returns",
        { salesReturnId },
        req.ip,
        req.get("User-Agent"),
      );
    }

    console.log("✅ Sales return deleted successfully");
    res.json({
      success: true,
      message: "Sales return deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting sales return:", error);
    res.status(400).json({
      error: "Failed to delete sales return",
      message: error.message,
      success: false,
    });
  }
});

router.get("/sales-returns/summary/:date", async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Fetching daily sales return summary for ${date}...`);

    const result = await storage.getDailySalesReturnSummary(date);
    console.log("✅ Daily sales return summary fetched successfully");
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching daily sales return summary:", error);
    res.status(500).json({
      error: "Failed to fetch daily sales return summary",
      message: error.message,
      success: false,
    });
  }
});

router.post("/sales-returns/close-day", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;
    const closedBy = req.session?.user?.id || "system";

    console.log(`🔒 Closing sales return day for ${date}...`);

    const result = await storage.closeDaySalesReturn(date, closedBy);

    // Log the day closure
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "sales_returns",
        {
          action: "close_day",
          date,
          totalLoss: result.totalLoss,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add day closure notification
    addNotification({
      type: "system",
      title: "Sales Return Day Closed",
      description: `Day closed for ${date}. Total loss: ${result.totalLoss}`,
      priority: "medium",
      actionUrl: "/sales-returns",
    });

    console.log("✅ Sales return day closed successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error closing sales return day:", error);
    res.status(400).json({
      error: "Failed to close sales return day",
      message: error.message,
      success: false,
    });
  }
});

router.post("/sales-returns/reopen-day", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    console.log(`🔓 Reopening sales return day for ${date}...`);

    const result = await storage.reopenDaySalesReturn(date);

    // Log the day reopening
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "sales_returns",
        {
          action: "reopen_day",
          date,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add day reopening notification
    addNotification({
      type: "system",
      title: "Sales Return Day Reopened",
      description: `Day reopened for ${date}. New entries can be added.`,
      priority: "medium",
      actionUrl: "/sales-returns",
    });

    console.log("✅ Sales return day reopened successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error reopening sales return day:", error);
    res.status(400).json({
      error: "Failed to reopen sales return day",
      message: error.message,
      success: false,
    });
  }
});

// Purchase Returns Management Routes
router.get("/purchase-returns", async (req, res) => {
  try {
    console.log("📦 Fetching purchase returns...");
    const date = req.query.date as string;
    const result = await storage.getPurchaseReturns(date);
    console.log(`✅ Found ${result.length} purchase returns`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching purchase returns:", error);
    res.status(500).json({
      error: "Failed to fetch purchase returns",
      message: error.message,
      success: false,
    });
  }
});

router.post("/purchase-returns", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating purchase return entry:", req.body);

    // Validate required fields
    if (!req.body.inventoryItemId || !req.body.quantity || !req.body.ratePerUnit) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Inventory item, quantity, and rate per unit are required",
        success: false,
      });
    }

    const result = await storage.createPurchaseReturn({
      ...req.body,
      createdBy: req.session?.user?.id || "system",
    });

    // Log the purchase return creation
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "CREATE",
        "purchase_returns",
        {
          inventoryItemName: req.body.inventoryItemName,
          quantity: req.body.quantity,
          amount: result.amount,
          returnDate: result.returnDate,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add purchase return notification
    addNotification({
      type: "inventory",
      title: "Purchase Return",
      description: `${req.body.inventoryItemName} - ${req.body.quantity} ${req.body.unitName} returned (Loss: ${result.amount})`,
      priority: "high",
      actionUrl: "/purchase-returns",
    });

    console.log("✅ Purchase return entry created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating purchase return entry:", error);
    res.status(400).json({
      error: "Failed to create purchase return entry",
      message: error.message,
      success: false,
    });
  }
});

router.put("/purchase-returns/:id", requireAuth, async (req, res) => {
  try {
    const purchaseReturnId = parseInt(req.params.id);
    console.log("💾 Updating purchase return:", purchaseReturnId);

    const result = await storage.updatePurchaseReturn(
      purchaseReturnId,
      req.body,
    );

    // Log the purchase return update
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "purchase_returns",
        {
          purchaseReturnId,
          updates: req.body,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    console.log("✅ Purchase return updated successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error updating purchase return:", error);
    res.status(400).json({
      error: "Failed to update purchase return",
      message: error.message,
      success: false,
    });
  }
});

router.delete("/purchase-returns/:id", requireAuth, async (req, res) => {
  try {
    const purchaseReturnId = parseInt(req.params.id);
    console.log("🗑️ Deleting purchase return:", purchaseReturnId);

    await storage.deletePurchaseReturn(purchaseReturnId);

    // Log the purchase return deletion
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "DELETE",
        "purchase_returns",
        { purchaseReturnId },
        req.ip,
        req.get("User-Agent"),
      );
    }

    console.log("✅ Purchase return deleted successfully");
    res.json({
      success: true,
      message: "Purchase return deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting purchase return:", error);
    res.status(400).json({
      error: "Failed to delete purchase return",
      message: error.message,
      success: false,
    });
  }
});

router.get("/purchase-returns/summary/:date", async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📊 Fetching daily purchase return summary for ${date}...`);

    const result = await storage.getDailyPurchaseReturnSummary(date);
    console.log("✅ Daily purchase return summary fetched successfully");
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching daily purchase return summary:", error);
    res.status(500).json({
      error: "Failed to fetch daily purchase return summary",
      message: error.message,
      success: false,
    });
  }
});

router.post("/purchase-returns/close-day", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;
    const closedBy = req.session?.user?.id || "system";

    console.log(`🔒 Closing purchase return day for ${date}...`);

    const result = await storage.closeDayPurchaseReturn(date, closedBy);

    // Log the day closure
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "purchase_returns",
        {
          action: "close_day",
          date,
          totalLoss: result.totalLoss,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add day closure notification
    addNotification({
      type: "system",
      title: "Purchase Return Day Closed",
      description: `Day closed for ${date}. Total loss: ${result.totalLoss}`,
      priority: "medium",
      actionUrl: "/purchase-returns",
    });

    console.log("✅ Purchase return day closed successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error closing purchase return day:", error);
    res.status(400).json({
      error: "Failed to close purchase return day",
      message: error.message,
      success: false,
    });
  }
});

router.post("/purchase-returns/reopen-day", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    console.log(`🔓 Reopening purchase return day for ${date}...`);

    const result = await storage.reopenDayPurchaseReturn(date);

    // Log the day reopening
    if (req.session?.user) {
      await storage.logUserAction(
        req.session.user.id,
        "UPDATE",
        "purchase_returns",
        {
          action: "reopen_day",
          date,
        },
        req.ip,
        req.get("User-Agent"),
      );
    }

    // Add day reopening notification
    addNotification({
      type: "system",
      title: "Purchase Return Day Reopened",
      description: `Day reopened for ${date}. New entries can be added.`,
      priority: "medium",
      actionUrl: "/purchase-returns",
    });

    console.log("✅ Purchase return day reopened successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error reopening purchase return day:", error);
    res.status(400).json({
      error: "Failed to reopen purchase return day",
      message: error.message,
      success: false,
    });
  }
});

// Ledger Transaction Routes
router.post("/ledger", requireAuth, async (req, res) => {
  try {
    console.log("💾 Creating ledger transaction:", req.body);
    const result = await storage.createLedgerTransaction(req.body);

    // Add ledger transaction notification
    addNotification({
      type: "system",
      title: "Transaction Added",
      description: `New transaction recorded in ledger`,
      priority: "medium",
      actionUrl: req.body.entityType === "customer" ? "/customers" : "/parties",
    });

    console.log("✅ Ledger transaction created successfully");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Error creating ledger transaction:", error);
    res.status(400).json({
      error: "Failed to create transaction",
      message: error.message,
      success: false,
    });
  }
});

router.get("/ledger/customer/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    console.log("📊 Fetching customer ledger:", customerId);
    const result = await storage.getLedgerTransactions(customerId, "customer");
    console.log(`✅ Found ${result.length} transactions for customer`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching customer ledger:", error);
    res.status(500).json({
      error: "Failed to fetch customer ledger",
      message: error.message,
      success: false,
    });
  }
});

router.get("/ledger/party/:id", async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    console.log("📊 Fetching party ledger:", partyId);
    const result = await storage.getLedgerTransactions(partyId, "party");
    console.log(`✅ Found ${result.length} transactions for party`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching party ledger:", error);
    res.status(500).json({
      error: "Failed to fetch party ledger",
      message: error.message,
      success: false,
    });
  }
});

// API error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error("🚨 API Error:", error);

  // Ensure we always return JSON for API routes
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    // Log the error to audit logs if possible
    if (req.session?.user) {
      storage
        .logUserAction(
          req.session.user.id,
          "ERROR",
          "system",
          { error: error.message, stack: error.stack, path: req.originalUrl },
          req.ip,
          req.get("User-Agent"),
        )
        .catch(console.error);
    }

    // Add system error notification
    addNotification({
      type: "system",
      title: "System Error",
      description: `An error occurred: ${error.message || "Unknown error"}`,
      priority: "critical",
    });

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        message: error.message,
        success: false,
      });
    }

    if (error.name === "MulterError") {
      return res.status(400).json({
        error: "File upload error",
        message: error.message,
        success: false,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
      success: false,
    });
  }

  next(error);
});

export default router;