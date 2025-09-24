import { pgTable, serial, varchar, text, numeric, boolean, timestamp, integer, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Branches table
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  branchCode: varchar("branch_code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  managerName: varchar("manager_name", { length: 100 }),
  isHeadOffice: boolean("is_head_office").default(false),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // Branch-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 20 }).notNull().default("staff"), // super_admin, admin, manager, supervisor, marketer, staff
  branchId: integer("branch_id"), // Branch assignment
  canAccessAllBranches: boolean("can_access_all_branches").default(false), // For super admins and some admins
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  margin: numeric("margin", { precision: 5, scale: 2 }).notNull(),
  sku: varchar("sku", { length: 50 }).unique(),
  unit: varchar("unit", { length: 50 }),
  unitId: integer("unit_id"),
  branchId: integer("branch_id"), // Branch-specific products
  isGlobal: boolean("is_global").default(false), // Available across all branches
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Categories
export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Items table
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  invCode: varchar("inv_code", { length: 50 }).unique(),
  name: varchar("name", { length: 200 }).notNull(),
  currentStock: numeric("current_stock", { precision: 10, scale: 2 }).notNull(),
  openingStock: numeric("opening_stock", { precision: 10, scale: 2 }).default("0"),
  purchasedQuantity: numeric("purchased_quantity", { precision: 10, scale: 2 }).default("0"),
  consumedQuantity: numeric("consumed_quantity", { precision: 10, scale: 2 }).default("0"),
  closingStock: numeric("closing_stock", { precision: 10, scale: 2 }).default("0"),
  minLevel: numeric("min_level", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  unitId: integer("unit_id"), // Primary unit ID
  secondaryUnitId: integer("secondary_unit_id"), // Secondary unit ID
  conversionRate: numeric("conversion_rate", { precision: 15, scale: 6 }).default("1"), // How many primary units = 1 secondary unit
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
  supplier: varchar("supplier", { length: 200 }),
  categoryId: integer("category_id"),
  branchId: integer("branch_id"), // Branch-specific inventory
  isIngredient: boolean("is_ingredient").default(false),
  notes: text("notes"),
  lastRestocked: timestamp("last_restocked"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Ingredients table
export const productIngredients = pgTable("product_ingredients", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  unitId: integer("unit_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Units table
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  baseUnit: varchar("base_unit", { length: 100 }), // The base unit for conversion (e.g., 'gram' for weight)
  conversionFactor: numeric("conversion_factor", { precision: 15, scale: 6 }).default("1"), // How many base units = 1 of this unit
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unit Conversions table - for complex conversions between different unit types
export const unitConversions = pgTable("unit_conversions", {
  id: serial("id").primaryKey(),
  fromUnitId: integer("from_unit_id").notNull(),
  toUnitId: integer("to_unit_id").notNull(),
  conversionFactor: numeric("conversion_factor", { precision: 15, scale: 6 }).notNull(),
  formula: text("formula"), // Optional formula for complex conversions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).default("0"),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parties (Suppliers/Creditors) table
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // supplier, creditor, both
  contactPerson: varchar("contact_person", { length: 100 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 50 }),
  notes: text("notes"),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).default("0"),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ledger Transactions table
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: serial("id").primaryKey(),
  customerOrPartyId: integer("customer_or_party_id").notNull(),
  entityType: varchar("entity_type", { length: 20 }).notNull(), // 'customer' or 'party'
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description").notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  debitAmount: numeric("debit_amount", { precision: 12, scale: 2 }).default("0"),
  creditAmount: numeric("credit_amount", { precision: 12, scale: 2 }).default("0"),
  runningBalance: numeric("running_balance", { precision: 12, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // 'sale', 'purchase', 'payment_received', 'payment_sent', 'adjustment'
  relatedOrderId: integer("related_order_id"),
  relatedPurchaseId: integer("related_purchase_id"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerId: integer("customer_id"),
  customerEmail: varchar("customer_email", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  deliveryDate: timestamp("delivery_date"),
  branchId: integer("branch_id"), // Branch where order was created
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 50 }), // Unit name/abbreviation
  unitId: integer("unit_id"), // Reference to units table
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales table
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerId: integer("customer_id"),
  customerEmail: varchar("customer_email", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  saleDate: timestamp("sale_date").defaultNow(),
  branchId: integer("branch_id"), // Branch where sale occurred
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sale Items table
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 50 }), // Unit name/abbreviation
  unitId: integer("unit_id"), // Reference to units table
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});


// Purchases table
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  supplierName: varchar("supplier_name", { length: 200 }).notNull(),
  partyId: integer("party_id"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  branchId: integer("branch_id"), // Branch where purchase was made
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Items table
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Production Schedule table
export const productionSchedule = pgTable("production_schedule", {
  id: serial("id").primaryKey(),

  // Schedule Information
  scheduleDate: date("schedule_date").notNull(),
  shift: varchar("shift", { length: 20 }).default("Morning"), // Morning, Afternoon, Night
  plannedBy: varchar("planned_by", { length: 100 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, scheduled, in_progress, completed, cancelled
  branchId: integer("branch_id"), // Branch where production is scheduled

  // Product Details
  productId: integer("product_id").references(() => products.id).notNull(),
  productCode: varchar("product_code", { length: 50 }),
  batchNo: varchar("batch_no", { length: 50 }),

  // Quantities
  totalQuantity: numeric("total_quantity", { precision: 10, scale: 2 }).notNull(),
  unitType: varchar("unit_type", { length: 50 }).default("kg"),
  actualQuantityPackets: numeric("actual_quantity_packets", { precision: 10, scale: 2 }),

  // Production Details
  priority: varchar("priority", { length: 20 }).default("medium"), // high, medium, low
  productionStartTime: timestamp("production_start_time"),
  productionEndTime: timestamp("production_end_time"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),

  // Legacy fields for compatibility
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  actualQuantity: numeric("actual_quantity", { precision: 10, scale: 2 }),
  scheduledDate: date("scheduled_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production Schedule History table
export const productionScheduleHistory = pgTable("production_schedule_history", {
  id: serial("id").primaryKey(),
  originalScheduleId: integer("original_schedule_id"),
  productId: integer("product_id").notNull(),
  productName: varchar("product_name", { length: 200 }),
  productCode: varchar("product_code", { length: 50 }),
  batchNo: varchar("batch_no", { length: 50 }),
  totalQuantity: numeric("total_quantity", { precision: 10, scale: 2 }),
  unitType: varchar("unit_type", { length: 50 }),
  actualQuantityPackets: numeric("actual_quantity_packets", { precision: 10, scale: 2 }),
  priority: varchar("priority", { length: 20 }),
  productionStartTime: timestamp("production_start_time"),
  productionEndTime: timestamp("production_end_time"),
  assignedTo: varchar("assigned_to"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }),
  scheduleDate: date("schedule_date"),
  shift: varchar("shift", { length: 20 }),
  plannedBy: varchar("planned_by", { length: 100 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  closedAt: timestamp("closed_at").defaultNow(),
  closedBy: varchar("closed_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory Transactions table
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // in, out, adjustment
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 200 }),
  reference: varchar("reference", { length: 100 }),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  vendor: varchar("vendor", { length: 200 }),
  receipt: varchar("receipt", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assets table
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  currentValue: numeric("current_value", { precision: 12, scale: 2 }),
  description: text("description"),
  location: varchar("location", { length: 100 }),
  condition: varchar("condition", { length: 50 }).default("good"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  resource: varchar("resource", { length: 100 }).notNull(), // e.g., 'products', 'orders', 'dashboard'
  action: varchar("action", { length: 50 }).notNull(), // 'read', 'write', 'read_write'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Permissions table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 20 }).notNull(),
  permissionId: integer("permission_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Permissions table (for individual user overrides)
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  granted: boolean("granted").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("string"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Login logs table for tracking user authentication
export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 20 }).notNull(), // 'success' or 'failed'
  loginTime: timestamp("login_time").defaultNow(),
  location: varchar("location", { length: 200 }),
  deviceType: varchar("device_type", { length: 50 }),
});

// Audit logs table for tracking all user actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', etc.
  resource: varchar("resource", { length: 100 }).notNull(), // 'staff', 'product', 'order', 'settings', etc.
  resourceId: varchar("resource_id", { length: 100 }), // ID of the affected resource
  details: jsonb("details"), // Additional details about the action
  oldValues: jsonb("old_values"), // Previous values (for updates)
  newValues: jsonb("new_values"), // New values (for creates/updates)
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: varchar("status", { length: 20 }).default("success"), // 'success', 'failed', 'error'
  errorMessage: text("error_message"),
});

// Sales Returns table
export const salesReturns = pgTable("sales_returns", {
  id: serial("id").primaryKey(),
  serialNumber: integer("serial_number").notNull(), // Daily auto-incremented S.N
  productId: integer("product_id").notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitId: integer("unit_id").notNull(),
  unitName: varchar("unit_name", { length: 50 }).notNull(),
  ratePerUnit: numeric("rate_per_unit", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // quantity × rate
  returnDate: date("return_date").notNull(), // Date when return was recorded
  saleId: integer("sale_id"), // Reference to original sale (optional)
  customerId: integer("customer_id"), // Reference to customer who returned
  returnReason: varchar("return_reason", { length: 100 }).default("damaged"), // damaged, expired, wrong_product, customer_request
  isDayClosed: boolean("is_day_closed").default(false),
  branchId: integer("branch_id"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily Sales Return Summary table
export const dailySalesReturnSummary = pgTable("daily_sales_return_summary", {
  id: serial("id").primaryKey(),
  summaryDate: date("summary_date").notNull(),
  totalItems: integer("total_items").notNull(),
  totalQuantity: numeric("total_quantity", { precision: 10, scale: 2 }).notNull(),
  totalLoss: numeric("total_loss", { precision: 12, scale: 2 }).notNull(),
  isDayClosed: boolean("is_day_closed").default(false),
  closedBy: varchar("closed_by"),
  closedAt: timestamp("closed_at"),
  branchId: integer("branch_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Returns table
export const purchaseReturns = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  serialNumber: integer("serial_number").notNull(), // Daily auto-incremented S.N
  inventoryItemId: integer("inventory_item_id").notNull(),
  inventoryItemName: varchar("inventory_item_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitId: integer("unit_id").notNull(),
  unitName: varchar("unit_name", { length: 50 }).notNull(),
  ratePerUnit: numeric("rate_per_unit", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // quantity × rate
  returnDate: date("return_date").notNull(), // Date when return was recorded
  purchaseId: integer("purchase_id"), // Reference to original purchase (optional)
  partyId: integer("party_id"), // Reference to supplier/party
  returnReason: varchar("return_reason", { length: 100 }).default("damaged"), // damaged, expired, wrong_item, quality_issue
  isDayClosed: boolean("is_day_closed").default(false),
  branchId: integer("branch_id"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily Purchase Return Summary table
export const dailyPurchaseReturnSummary = pgTable("daily_purchase_return_summary", {
  id: serial("id").primaryKey(),
  summaryDate: date("summary_date").notNull(),
  totalItems: integer("total_items").notNull(),
  totalQuantity: numeric("total_quantity", { precision: 10, scale: 2 }).notNull(),
  totalLoss: numeric("total_loss", { precision: 12, scale: 2 }).notNull(),
  isDayClosed: boolean("is_day_closed").default(false),
  closedBy: varchar("closed_by"),
  closedAt: timestamp("closed_at"),
  branchId: integer("branch_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff management tables
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  staffId: varchar("staff_id", { length: 50 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  hireDate: timestamp("hire_date").notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  employmentType: varchar("employment_type", { length: 50 }).notNull(), // full-time, part-time, contract
  salary: numeric("salary", { precision: 12, scale: 2 }),
  hourlyRate: numeric("hourly_rate", { precision: 8, scale: 2 }),
  bankAccount: varchar("bank_account", { length: 100 }),
  emergencyContact: varchar("emergency_contact", { length: 200 }),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  citizenshipNumber: varchar("citizenship_number", { length: 50 }),
  panNumber: varchar("pan_number", { length: 50 }),
  profilePhoto: varchar("profile_photo", { length: 500 }),
  identityCardUrl: varchar("identity_card_url", { length: 500 }),
  agreementPaperUrl: varchar("agreement_paper_url", { length: 500 }),
  documents: jsonb("documents"), // Store document URLs/paths
  status: varchar("status", { length: 20 }).default("active"), // active, inactive, terminated
  terminationDate: timestamp("termination_date"),
  terminationReason: text("termination_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: numeric("total_hours", { precision: 4, scale: 2 }),
  overtimeHours: numeric("overtime_hours", { precision: 4, scale: 2 }),
  status: varchar("status", { length: 20 }).default("present"), // present, absent, late, half-day, sick, vacation
  notes: text("notes"),
  approvedBy: varchar("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
  overtimePay: numeric("overtime_pay", { precision: 12, scale: 2 }).default("0"),
  bonus: numeric("bonus", { precision: 12, scale: 2 }).default("0"),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0"),
  netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }).default("bank_transfer"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, cancelled
  notes: text("notes"),
  processedBy: varchar("processed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // sick, vacation, personal, maternity, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  appliedDate: timestamp("applied_date").defaultNow(),
  reviewedBy: varchar("reviewed_by"),
  reviewedDate: timestamp("reviewed_date"),
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  date: timestamp("date").notNull(),
  shiftStart: timestamp("shift_start").notNull(),
  shiftEnd: timestamp("shift_end").notNull(),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { length: 50 }), // daily, weekly, monthly
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production Schedule Labels table
export const productionScheduleLabels = pgTable("production_schedule_labels", {
  id: serial("id").primaryKey(),

  // Order Information
  orderId: integer("order_id"),
  orderNumber: varchar("order_number", { length: 100 }),
  customerName: varchar("customer_name", { length: 200 }),
  orderDate: timestamp("order_date"),

  // Product Details
  productId: integer("product_id"),
  productSku: varchar("product_sku", { length: 50 }),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productDescription: text("product_description"),

  // Target Quantities
  targetedQuantity: numeric("targeted_quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  unitId: integer("unit_id"),

  // Actual Production Data
  actualQuantity: numeric("actual_quantity", { precision: 10, scale: 2 }),
  startDatetime: timestamp("start_datetime"),
  endDatetime: timestamp("end_datetime"),

  // Labeling and Packaging
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: date("expiry_date"),
  weightVolume: varchar("weight_volume", { length: 100 }),
  packagingType: varchar("packaging_type", { length: 100 }),

  // Production Status and Tracking
  status: varchar("status", { length: 50 }).default("draft"), // draft, in_progress, completed, cancelled
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  assignedTo: varchar("assigned_to", { length: 100 }),
  shift: varchar("shift", { length: 50 }),

  // Quality Control
  qualityCheckPassed: boolean("quality_check_passed").default(false),
  qualityNotes: text("quality_notes"),

  // Draft/Day-end functionality
  isDraft: boolean("is_draft").default(true),
  dayClosed: boolean("day_closed").default(false),
  dayClosedAt: timestamp("day_closed_at"),
  dayClosedBy: varchar("day_closed_by", { length: 100 }),

  // Additional Information
  remarks: text("remarks"),
  notes: text("notes"),
  specialInstructions: text("special_instructions"),

  // Audit Trail
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock Batches table - For FIFO batch tracking
export const stockBatches = pgTable("stock_batches", {
  id: serial("id").primaryKey(),
  purchaseItemId: integer("purchase_item_id").notNull(), // Reference to purchase_items
  inventoryItemId: integer("inventory_item_id").notNull(), // Reference to inventory_items
  batchNumber: varchar("batch_number", { length: 100 }), // Supplier batch number
  quantityReceived: numeric("quantity_received", { precision: 10, scale: 2 }).notNull(),
  remainingQuantity: numeric("remaining_quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(), // Cost per unit at purchase
  expiryDate: date("expiry_date"), // Optional expiry tracking
  receivedDate: timestamp("received_date").defaultNow(),
  supplierId: integer("supplier_id"), // Reference to parties table
  branchId: integer("branch_id"), // Branch where batch is stored
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock Batch Consumptions table - Track FIFO consumption in production
export const stockBatchConsumptions = pgTable("stock_batch_consumptions", {
  id: serial("id").primaryKey(),
  stockBatchId: integer("stock_batch_id").notNull(), // Reference to stock_batches
  productionScheduleId: integer("production_schedule_id"), // Reference to production_schedule
  inventoryTransactionId: integer("inventory_transaction_id"), // Reference to inventory_transactions
  quantityConsumed: numeric("quantity_consumed", { precision: 10, scale: 2 }).notNull(),
  unitCostAtConsumption: numeric("unit_cost_at_consumption", { precision: 10, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  consumedDate: timestamp("consumed_date").defaultNow(),
  consumedBy: varchar("consumed_by"), // User who processed the consumption
  reason: varchar("reason", { length: 100 }), // production, adjustment, sale, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily Inventory Snapshots table - Immutable daily stock snapshots
export const dailyInventorySnapshots = pgTable("daily_inventory_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  branchId: integer("branch_id"),
  openingStock: numeric("opening_stock", { precision: 10, scale: 2 }).notNull(),
  purchasedQuantity: numeric("purchased_quantity", { precision: 10, scale: 2 }).default("0"),
  consumedQuantity: numeric("consumed_quantity", { precision: 10, scale: 2 }).default("0"),
  adjustmentQuantity: numeric("adjustment_quantity", { precision: 10, scale: 2 }).default("0"),
  closingStock: numeric("closing_stock", { precision: 10, scale: 2 }).notNull(),
  averageCost: numeric("average_cost", { precision: 10, scale: 2 }).notNull(),
  lastPurchaseCost: numeric("last_purchase_cost", { precision: 10, scale: 2 }),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
  activeBatches: integer("active_batches").default(0), // Number of active batches
  isLocked: boolean("is_locked").default(false), // Prevent modifications once day is closed
  capturedAt: timestamp("captured_at").defaultNow(),
  capturedBy: varchar("captured_by"), // User who captured the snapshot
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory Cost History table - Track cost changes over time
export const inventoryCostHistory = pgTable("inventory_cost_history", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  branchId: integer("branch_id"),
  previousCost: numeric("previous_cost", { precision: 10, scale: 2 }),
  newCost: numeric("new_cost", { precision: 10, scale: 2 }).notNull(),
  previousAverageCost: numeric("previous_average_cost", { precision: 10, scale: 2 }),
  newAverageCost: numeric("new_average_cost", { precision: 10, scale: 2 }).notNull(),
  changeReason: varchar("change_reason", { length: 100 }).notNull(), // purchase, adjustment, revaluation
  referenceId: integer("reference_id"), // ID of purchase, adjustment, etc.
  referenceType: varchar("reference_type", { length: 50 }), // purchase_item, inventory_transaction, etc.
  changeDate: timestamp("change_date").defaultNow(),
  changedBy: varchar("changed_by"), // User who caused the cost change
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = typeof inventoryCategories.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;
export type ProductIngredient = typeof productIngredients.$inferSelect;
export type InsertProductIngredient = typeof productIngredients.$inferInsert;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;
export type UnitConversion = typeof unitConversions.$inferSelect;
export type InsertUnitConversion = typeof unitConversions.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Party = typeof parties.$inferSelect;
export type InsertParty = typeof parties.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = typeof purchaseItems.$inferInsert;
export type ProductionScheduleItem = typeof productionSchedule.$inferSelect;
export type InsertProductionScheduleItem = typeof productionSchedule.$inferInsert;
export type ProductionScheduleHistoryItem = typeof productionScheduleHistory.$inferSelect;
export type InsertProductionScheduleHistoryItem = typeof productionScheduleHistory.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type InsertLedgerTransaction = typeof ledgerTransactions.$inferInsert;
export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type InsertSalaryPayment = typeof salaryPayments.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;
export type StaffSchedule = typeof staffSchedules.$inferSelect;
export type InsertStaffSchedule = typeof staffSchedules.$inferInsert;
export type ProductionScheduleLabel = typeof productionScheduleLabels.$inferSelect;
export type InsertProductionScheduleLabel = typeof productionScheduleLabels.$inferInsert;
export type SalesReturn = typeof salesReturns.$inferSelect;
export type InsertSalesReturn = typeof salesReturns.$inferInsert;
export type DailySalesReturnSummary = typeof dailySalesReturnSummary.$inferSelect;
export type InsertDailySalesReturnSummary = typeof dailySalesReturnSummary.$inferInsert;
export type PurchaseReturn = typeof purchaseReturns.$inferSelect;
export type InsertPurchaseReturn = typeof purchaseReturns.$inferInsert;
export type DailyPurchaseReturnSummary = typeof dailyPurchaseReturnSummary.$inferSelect;
export type InsertDailyPurchaseReturnSummary = typeof dailyPurchaseReturnSummary.$inferInsert;
export type StockBatch = typeof stockBatches.$inferSelect;
export type InsertStockBatch = typeof stockBatches.$inferInsert;
export type StockBatchConsumption = typeof stockBatchConsumptions.$inferSelect;
export type InsertStockBatchConsumption = typeof stockBatchConsumptions.$inferInsert;
export type DailyInventorySnapshot = typeof dailyInventorySnapshots.$inferSelect;
export type InsertDailyInventorySnapshot = typeof dailyInventorySnapshots.$inferInsert;
export type InventoryCostHistory = typeof inventoryCostHistory.$inferSelect;
export type InsertInventoryCostHistory = typeof inventoryCostHistory.$inferInsert;

// Insert schemas for validation
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerTransactionSchema = createInsertSchema(ledgerTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({
  id: true,
  loginTime: true,
});

export const insertUnitConversionSchema = createInsertSchema(unitConversions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  staffId: z.string().optional(), // Allow staffId to be optional during creation
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffScheduleSchema = createInsertSchema(staffSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Missing schemas needed by routes.ts
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductionScheduleItemSchema = createInsertSchema(productionSchedule).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Insert schemas for sales and saleItems
export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  createdAt: true,
});

export const insertSalesReturnSchema = createInsertSchema(salesReturns).omit({
  id: true,
  serialNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailySalesReturnSummarySchema = createInsertSchema(dailySalesReturnSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturns).omit({
  id: true,
  serialNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyPurchaseReturnSummarySchema = createInsertSchema(dailyPurchaseReturnSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Stock Management Insert Schemas
export const insertStockBatchSchema = createInsertSchema(stockBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockBatchConsumptionSchema = createInsertSchema(stockBatchConsumptions).omit({
  id: true,
  createdAt: true,
});

export const insertDailyInventorySnapshotSchema = createInsertSchema(dailyInventorySnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryCostHistorySchema = createInsertSchema(inventoryCostHistory).omit({
  id: true,
  createdAt: true,
});