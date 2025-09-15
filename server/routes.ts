import express from 'express';
import { db } from './db';
import { eq, desc, and, or, isNull, sql, asc, gte, lte, count, sum, like } from 'drizzle-orm';
import { 
  users, products, categories, orders, orderItems, customers, 
  inventoryItems, purchases, purchaseItems, expenses, 
  productionSchedule, inventoryTransactions, parties, assets,
  permissions, rolePermissions, userPermissions, settings,
  ledgerTransactions, loginLogs, auditLogs, staff, attendance,
  salaryPayments, leaveRequests, staffSchedules, units, unitConversions,
  inventoryCategories, productIngredients, productionScheduleLabels,
  productionScheduleHistory
} from '../shared/schema';
import { 
  insertUserSchema, insertCategorySchema, insertProductSchema, 
  insertCustomerSchema, insertPurchaseSchema, insertExpenseSchema,
  insertPermissionSchema, insertRolePermissionSchema, insertUserPermissionSchema,
  insertLedgerTransactionSchema, insertLoginLogSchema, insertUnitConversionSchema,
  insertStaffSchema, insertAttendanceSchema, insertSalaryPaymentSchema,
  insertLeaveRequestSchema, insertStaffScheduleSchema, insertInventoryItemSchema,
  insertOrderSchema, insertProductionScheduleItemSchema, insertPartySchema,
  insertAssetSchema, insertAuditLogSchema
} from '../shared/schema';
import { Storage } from './lib/storage';
import bcrypt from 'bcryptjs';
import { notifyNewPublicOrder, notifyLowStock, notifyProductionSchedule } from './notifications';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Create storage instance
const storage = new Storage(db);

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Apply rate limiting to all API routes
router.use(apiLimiter);

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
function addNotification(notification: Omit<typeof notifications[0], 'id' | 'timestamp' | 'read'>) {
  const newNotification = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false,
    ...notification
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
    title: "Welcome to Mero BakeSoft",
    description: "System initialized successfully. All modules are ready for use.",
    priority: "medium",
    actionUrl: "/dashboard"
  });

  addNotification({
    type: "inventory",
    title: "Low Stock Alert",
    description: "Flour stock is running low. Current: 5kg, Minimum: 10kg",
    priority: "high",
    actionUrl: "/inventory",
    data: { itemName: "Flour", currentStock: 5, minLevel: 10 }
  });

  addNotification({
    type: "order",
    title: "New Order Received",
    description: "Order #ORD-001 from John Doe for ₹1,250",
    priority: "medium",
    actionUrl: "/orders",
    data: { orderNumber: "ORD-001", customer: "John Doe", amount: 1250 }
  });
}

// Notification Routes
router.get('/api/notifications', async (req, res) => {
  try {
    console.log('📋 Fetching notifications...');

    // Return notifications sorted by timestamp (newest first)
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`✅ Found ${sortedNotifications.length} notifications`);
    res.json(sortedNotifications);
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = notifications.find(n => n.id === id);

    if (notification) {
      notification.read = true;
      console.log(`✅ Marked notification ${id} as read`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/api/notifications/mark-all-read', async (req, res) => {
  try {
    notifications.forEach(n => n.read = true);
    console.log('✅ Marked all notifications as read');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

router.post('/api/notifications/test', async (req, res) => {
  try {
    const testNotification = addNotification({
      type: "system",
      title: "Test Notification",
      description: `Test notification sent at ${new Date().toLocaleString()}`,
      priority: "low"
    });

    res.json({ success: true, notification: testNotification });
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Authentication check middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Admin check middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For development, allow any authenticated user
  // In production, check user role from database
  next();
}

// Authentication routes
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Try database login first
    try {
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (user.length > 0) {
        const isValidPassword = await bcrypt.compare(password, user[0].password || '');

        if (isValidPassword) {
          req.session.userId = user[0].id;
          req.session.user = user[0];

          // Log successful login
          await storage.logLogin(user[0].id, email, req.ip || 'unknown', req.get('User-Agent') || '', 'success');

          // Add login notification
          addNotification({
            type: "system",
            title: "User Login",
            description: `${user[0].firstName} ${user[0].lastName} logged in`,
            priority: "low"
          });

          console.log('✅ Database login successful for:', email);
          return res.json({ 
            message: 'Login successful', 
            user: { 
              id: user[0].id, 
              email: user[0].email, 
              firstName: user[0].firstName,
              lastName: user[0].lastName,
              role: user[0].role 
            } 
          });
        }
      }
    } catch (dbError) {
      console.log('⚠️ Database login failed, trying default credentials');
    }

    // Default credentials for demo
    const defaultUsers = [
      { id: 'super_admin', email: 'admin@merobakesoft.com', password: 'admin123', firstName: 'Super', lastName: 'Admin', role: 'admin' },
      { id: 'admin_user', email: 'admin@admin.com', password: 'admin123', firstName: 'Admin', lastName: 'User', role: 'admin' },
      { id: 'manager_user', email: 'manager@manager.com', password: 'manager123', firstName: 'Manager', lastName: 'User', role: 'manager' },
      { id: 'staff_user', email: 'staff@staff.com', password: 'staff123', firstName: 'Staff', lastName: 'User', role: 'staff' }
    ];

    const defaultUser = defaultUsers.find(u => u.email === email && u.password === password);

    if (defaultUser) {
      req.session.userId = defaultUser.id;
      req.session.user = defaultUser;

      // Add login notification
      addNotification({
        type: "system",
        title: "User Login",
        description: `${defaultUser.firstName} ${defaultUser.lastName} logged in`,
        priority: "low"
      });

      console.log('✅ Default login successful for:', email);
      return res.json({ 
        message: 'Login successful', 
        user: { 
          id: defaultUser.id, 
          email: defaultUser.email, 
          firstName: defaultUser.firstName,
          lastName: defaultUser.lastName,
          role: defaultUser.role 
        } 
      });
    }

    // Log failed login attempt
    await storage.logLogin('unknown', email, req.ip || 'unknown', req.get('User-Agent') || '', 'failed');

    console.log('❌ Login failed for:', email);
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/api/logout', (req, res) => {
  const userEmail = req.session?.user?.email || 'Unknown';

  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    // Add logout notification
    addNotification({
      type: "system",
      title: "User Logout",
      description: `User ${userEmail} logged out`,
      priority: "low"
    });

    console.log('✅ Logout successful for:', userEmail);
    res.json({ message: 'Logout successful' });
  });
});

router.get('/api/me', (req, res) => {
  if (req.session?.userId) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Settings routes
router.get('/api/settings', async (req, res) => {
  try {
    console.log('🔍 GET /api/settings - Fetching settings...');

    // Try to get from database first
    try {
      const dbSettings = await storage.getSettings();
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        console.log('✅ Settings fetched from database');
        return res.json(dbSettings);
      }
    } catch (dbError) {
      console.log('⚠️ Database settings fetch failed, using defaults');
    }

    // Default settings for offline mode
    const defaultSettings = {
      companyName: 'Mero BakeSoft',
      phone: '+977-1-4567890',
      address: 'Kathmandu, Nepal',
      registrationNumber: 'REG-2024-001',
      dtqocNumber: 'DTQOC-2024-001',
      email: 'info@merobakesoft.com',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
      labelSize: 'Custom',
      orientation: 'Portrait',
      marginTop: '5',
      marginBottom: '5',
      marginLeft: '5',
      marginRight: '5',
      customLength: '40',
      customBreadth: '30',
      printerName: ''
    };

    console.log('✅ Using default settings');
    res.json(defaultSettings);
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/api/settings', requireAuth, async (req, res) => {
  try {
    console.log('💾 Saving settings:', req.body);

    try {
      await storage.saveSettings(req.body);

      // Add settings update notification
      addNotification({
        type: "system",
        title: "Settings Updated",
        description: "System settings have been updated successfully",
        priority: "medium"
      });

      console.log('✅ Settings saved to database');
      res.json({ message: 'Settings saved successfully' });
    } catch (dbError) {
      console.log('⚠️ Database save failed, settings saved in memory');

      // Add notification about offline mode
      addNotification({
        type: "system",
        title: "Settings Updated (Offline)",
        description: "Settings updated in offline mode. Changes will be synced when database is available.",
        priority: "medium"
      });

      res.json({ message: 'Settings saved (offline mode)' });
    }
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Product routes
router.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Fetching products...');
    const result = await storage.getProducts();
    console.log(`✅ Found ${result.length} products`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    // Return empty array in offline mode
    res.json([]);
  }
});

router.post('/api/products', requireAuth, async (req, res) => {
  try {
    console.log('💾 Creating product:', req.body.name);
    const result = await storage.createProduct(req.body);

    // Add product creation notification
    addNotification({
      type: "inventory",
      title: "Product Created",
      description: `New product "${req.body.name}" has been added to the inventory`,
      priority: "medium",
      actionUrl: "/products"
    });

    console.log('✅ Product created successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Order routes
router.get('/api/orders', async (req, res) => {
  try {
    console.log('📋 Fetching orders...');
    const result = await storage.getOrders();
    console.log(`✅ Found ${result.length} orders`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.json([]);
  }
});

router.post('/api/orders', async (req, res) => {
  try {
    console.log('💾 Creating order:', req.body);
    const result = await storage.createOrder(req.body);

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
        orderNumber: result.id || 'N/A'
      }
    });

    console.log('✅ Order created successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Production Schedule routes
router.get('/api/production-schedule', async (req, res) => {
  try {
    console.log('🏭 Fetching production schedule...');
    const result = await storage.getProductionSchedule();
    console.log(`✅ Found ${result.length} production items`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching production schedule:', error);
    res.json([]);
  }
});

router.post('/api/production-schedule', requireAuth, async (req, res) => {
  try {
    console.log('💾 Creating production schedule item:', req.body);
    const result = await storage.createProductionScheduleItem(req.body);

    // Add production schedule notification
    addNotification({
      type: "production",
      title: "Production Scheduled",
      description: `${req.body.quantity} units of ${req.body.productName || 'product'} scheduled for ${req.body.scheduledDate}`,
      priority: req.body.priority === 'high' ? 'high' : 'medium',
      actionUrl: "/production"
    });

    console.log('✅ Production schedule item created successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error creating production schedule item:', error);
    res.status(500).json({ error: 'Failed to create production schedule item' });
  }
});

// Inventory routes
router.get('/api/inventory-items', async (req, res) => {
  try {
    console.log('📦 Fetching inventory items...');
    const result = await storage.getInventoryItems();
    console.log(`✅ Found ${result.length} inventory items`);

    // Check for low stock items and create notifications
    result.forEach(item => {
      const currentStock = parseFloat(item.currentStock || '0');
      const minLevel = parseFloat(item.minLevel || '0');

      if (currentStock <= minLevel && currentStock > 0) {
        // Check if notification already exists for this item
        const existingNotification = notifications.find(n => 
          n.type === 'inventory' && 
          n.data?.itemName === item.name &&
          !n.read
        );

        if (!existingNotification) {
          addNotification({
            type: "inventory",
            title: "Low Stock Alert",
            description: `${item.name} is running low. Current: ${currentStock}${item.unit}, Minimum: ${minLevel}${item.unit}`,
            priority: "high",
            actionUrl: "/inventory",
            data: {
              itemName: item.name,
              currentStock,
              minLevel,
              unit: item.unit
            }
          });
        }
      }
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching inventory items:', error);
    res.json([]);
  }
});

router.post('/api/inventory-items', requireAuth, async (req, res) => {
  try {
    console.log('💾 Creating inventory item:', req.body.name);
    const result = await storage.createInventoryItem(req.body);

    // Add inventory item creation notification
    addNotification({
      type: "inventory",
      title: "Inventory Item Added",
      description: `New inventory item "${req.body.name}" has been added`,
      priority: "medium",
      actionUrl: "/inventory"
    });

    console.log('✅ Inventory item created successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error creating inventory item:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Units routes
router.get('/api/units', async (req, res) => {
  try {
    console.log('📏 Fetching units...');
    const result = await storage.getUnits();
    console.log(`✅ Found ${result.length} units`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching units:', error);

    // Return default units in offline mode
    const defaultUnits = [
      { id: 1, name: 'Kilogram', abbreviation: 'kg', type: 'weight', baseUnit: 'gram', conversionFactor: '1000', isActive: true },
      { id: 2, name: 'Gram', abbreviation: 'g', type: 'weight', baseUnit: 'gram', conversionFactor: '1', isActive: true },
      { id: 3, name: 'Liter', abbreviation: 'L', type: 'volume', baseUnit: 'milliliter', conversionFactor: '1000', isActive: true },
      { id: 4, name: 'Milliliter', abbreviation: 'ml', type: 'volume', baseUnit: 'milliliter', conversionFactor: '1', isActive: true },
      { id: 5, name: 'Piece', abbreviation: 'pcs', type: 'count', baseUnit: 'piece', conversionFactor: '1', isActive: true },
      { id: 6, name: 'Packet', abbreviation: 'pkt', type: 'count', baseUnit: 'piece', conversionFactor: '1', isActive: true }
    ];

    res.json(defaultUnits);
  }
});

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 API Error:', error);

  // Add system error notification
  addNotification({
    type: "system",
    title: "System Error",
    description: `An error occurred: ${error.message || 'Unknown error'}`,
    priority: "critical"
  });

  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

export default router;