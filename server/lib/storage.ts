import {
  eq,
  desc,
  count,
  sql,
  and,
  gte,
  lte,
  lt,
  or,
  ilike,
  isNull,
  asc,
} from "drizzle-orm";
import { db } from "../db";
import {
  users,
  products,
  inventoryItems,
  inventoryCategories,
  productIngredients,
  units,
  unitConversions,
  orders,
  orderItems,
  customers,
  parties,
  ledgerTransactions,
  purchases,
  purchaseItems,
  productionSchedule,
  inventoryTransactions,
  expenses,
  assets,
  permissions,
  rolePermissions,
  userPermissions,
  settings,
  loginLogs,
  auditLogs,
  type User,
  type UpsertUser,
  
  type Product,
  type InsertProduct,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryCategory,
  type InsertInventoryCategory,
  type ProductIngredient,
  type InsertProductIngredient,
  type Unit,
  type InsertUnit,
  type UnitConversion,
  type InsertUnitConversion,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Customer,
  type InsertCustomer,
  type Party,
  type InsertParty,
  type Purchase,
  type InsertPurchase,
  type PurchaseItem,
  type InsertPurchaseItem,
  type ProductionScheduleItem,
  type InsertProductionScheduleItem,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  type Expense,
  type InsertExpense,
  type Asset,
  type InsertAsset,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type UserPermission,
  type InsertUserPermission,
  type LedgerTransaction,
  type InsertLedgerTransaction,
  type LoginLog,
  type InsertLoginLog,
  type AuditLog,
  type InsertAuditLog,
  staff,
  attendance,
  salaryPayments,
  leaveRequests,
  staffSchedules,
  type Staff,
  type InsertStaff,
  type Attendance,
  type InsertAttendance,
  type SalaryPayment,
  type InsertSalaryPayment,
  type LeaveRequest,
  type InsertLeaveRequest,
  type StaffSchedule,
  type InsertStaffSchedule,
  productionScheduleLabels,
  type ProductionScheduleLabel,
  type InsertProductionScheduleLabel,
  productionScheduleHistory,
  type ProductionScheduleHistory,
  type InsertProductionScheduleHistory,
  sales,
  saleItems,
  branches,
  type Branch,
  type InsertBranch,
} from "../../shared/schema";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  getAllUsers(excludeSuperAdmin?: boolean): Promise<User[]>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<void>;
  ensureDefaultAdmin(): Promise<void>;
  getUserCount(excludeSuperAdmin?: boolean): Promise<number>;

  

  // Product operations
  getProducts(
    userBranchId?: number,
    canAccessAllBranches?: boolean,
  ): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductsWithIngredients(): Promise<any[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getProductIngredients(productId: number): Promise<any[]>;
  createProductIngredient(ingredient: any): Promise<any>;
  deleteProductIngredients(productId: number): Promise<void>;

  // Unit operations
  getUnits(): Promise<Unit[]>;
  getUnitById(id: number): Promise<Unit | undefined>;
  createUnit(data: InsertUnit): Promise<Unit>;
  updateUnit(id: number, data: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: number): Promise<void>;

  // Unit conversion operations
  getUnitConversions(): Promise<any[]>;
  createUnitConversion(data: any): Promise<any>;
  updateUnitConversion(id: number, data: any): Promise<any>;
  deleteUnitConversion(id: number): Promise<void>;
  convertQuantity(
    fromQuantity: number,
    fromUnitId: number,
    toUnitId: number,
  ): Promise<number>;

  // Inventory operations
  getInventoryItems(options?: {
    page?: number;
    limit?: number;
    search?: string;
    group?: string;
  }): Promise<{
    items: InventoryItem[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }>;
  getInventoryItems(
    userBranchId?: number,
    canAccessAllBranches?: boolean,
  ): Promise<InventoryItem[]>;
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(data: any): Promise<InventoryItem>;
  updateInventoryItem(
    id: number,
    data: Partial<InsertInventoryItem>,
  ): Promise<InventoryItem>;
  updateInventoryWithPurchase(
    inventoryItemId: number,
    purchaseQuantity: number,
    purchaseRate: number,
    purchaseDate: Date,
  ): Promise<void>;
  updateInventoryWithWeightedAverage(
    inventoryItemId: number,
    purchaseQuantity: number,
    purchaseRate: number,
    purchaseDate: Date,
  ): Promise<void>;
  deleteInventoryItem(id: number): Promise<void>;
  getInventoryCategories(): Promise<InventoryCategory[]>;
  createInventoryCategory(
    data: InsertInventoryCategory,
  ): Promise<InventoryCategory>;
  updateInventoryCategory(
    id: number,
    data: Partial<InsertInventoryCategory>,
  ): Promise<InventoryCategory>;
  deleteInventoryCategory(id: number): Promise<void>;
  createInventoryTransaction(
    transaction: InsertInventoryTransaction,
  ): Promise<InventoryTransaction>;
  getInventoryTransactions(itemId?: number): Promise<any[]>;
  getLowStockItems();
  getIngredients(): Promise<InventoryItem[]>;
  syncStockFromPurchases();
  updateInventoryStockAndCost(
    itemId: number,
    addedQuantity: number,
    newCostPerUnit: number,
  );
  updateInventoryPurchaseStock(itemId: number, purchasedQuantity: number);

  // Permission operations
  getPermissions(): Promise<Permission[]>;
  createPermission(data: InsertPermission): Promise<Permission>;
  getRolePermissions(role: string): Promise<any[]>;
  setRolePermissions(role: string, permissionIds: number[]): Promise<void>;
  getUserPermissions(userId: string): Promise<any[]>;
  setUserPermissions(
    userId: string,
    permissionUpdates: { permissionId: number; granted: boolean }[],
  ): Promise<void>;
  checkUserPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean>;
  initializeDefaultPermissions(): Promise<void>;

  // Settings operations
  getSettings(): Promise<any>;
  updateSettings(settingsData: any): Promise<any>;
  updateOrCreateSetting(key: string, value: string): Promise<any>;
  saveCompanySettings(settings: any): Promise<void>;
  getSetting(key: string): Promise<string | null>;

  // Analytics operations
  getDashboardStats(): Promise<any>;
  getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<any>;
  getLoginAnalytics(startDate?: string, endDate?: string);

  // Staff management operations
  getStaff(): Promise<Staff[]>;
  getStaffById(id: number): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: number): Promise<void>;
  getStaffByStaffId(staffId: string): Promise<Staff | null>;

  // Attendance operations
  getAttendance(
    staffId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(
    id: number,
    attendance: Partial<InsertAttendance>,
  ): Promise<Attendance>;
  deleteAttendance(id: number): Promise<void>;
  clockIn(staffId: number): Promise<Attendance>;
  clockOut(staffId: number): Promise<Attendance>;

  // Salary operations
  getSalaryPayments(staffId?: number): Promise<any[]>;
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  updateSalaryPayment(
    id: number,
    payment: Partial<InsertSalaryPayment>,
  ): Promise<SalaryPayment>;
  deleteSalaryPayment(id: number): Promise<void>;

  // Leave request operations
  getLeaveRequests(staffId?: number): Promise<any[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(
    id: number,
    request: Partial<InsertLeaveRequest>,
  ): Promise<LeaveRequest>;
  deleteLeaveRequest(id: number): Promise<void>;

  // Staff schedule operations
  getStaffSchedules(staffId?: number, date?: Date): Promise<any[]>;
  createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule>;
  updateStaffSchedule(
    id: number,
    schedule: Partial<InsertStaffSchedule>,
  ): Promise<StaffSchedule>;
  deleteStaffSchedule(id: number): Promise<void>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Party operations
  getParties(): Promise<Party[]>;
  getPartyById(id: number): Promise<Party | undefined>;
  createParty(party: InsertParty): Promise<Party>;
  updateParty(id: number, party: Partial<InsertParty>): Promise<Party>;
  deleteParty(id: number): Promise<void>;

  // Ledger Transaction Methods
  createLedgerTransaction(data: any): Promise<any>;
  getLedgerTransactions(
    entityId: number,
    entityType: "customer" | "party",
    limit?: number,
  ): Promise<any[]>;
  updateLedgerTransaction(id: number, data: any): Promise<any>;
  deleteLedgerTransaction(id: number): Promise<void>;
  recalculateRunningBalance(
    entityId: number,
    entityType: "customer" | "party",
  ): Promise<number>;

  // Asset operations
  getAssets(): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;

  // Audit Log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;
  logLogin(
    userId: string,
    userEmail: string,
    userName: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void>;
  logLogout(
    userId: string,
    userEmail: string,
    userName: string,
    ipAddress: string,
  ): Promise<void>;

  // Purchase operations
  getPurchases(): Promise<any[]>;
  getPurchasesWithItems(): Promise<any[]>;
  createPurchaseWithLedger(purchaseData: any): Promise<any>;
  updatePurchase(id: number, purchaseData: any): Promise<any>;
  deletePurchase(id: number): Promise<void>;

  // Expense operations
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  getOrderItems(orderId: number);
  createOrderItem(data: any);
  getRecentOrders(limit: number): Promise<any[]>;

  // Production operations
  getTodayProductionSchedule(): Promise<any[]>;
  getProductionSchedule(): Promise<any[]>;
  createProductionScheduleItem(
    item: InsertProductionScheduleItem,
  ): Promise<ProductionScheduleItem>;
  updateProductionScheduleItem(
    id: number,
    item: Partial<InsertProductionScheduleItem>,
  ): Promise<ProductionScheduleItem>;
  getProductionScheduleByDate(date: string): Promise<any[]>;
  closeDayProductionSchedule(date: string, closedBy: string): Promise<any>;
  getProductionScheduleHistory(date?: string): Promise<any[]>;

  // Media operations
  getMediaItems(): Promise<any[]>;
  uploadMedia(userId: string, file: any): Promise<any>;
  deleteMedia(id: number): Promise<void>;

  // Billing operations
  getBills(): Promise<any[]>;
  createBill(billData: any): Promise<any>;
  deleteBill(id: number): Promise<void>;

  // Notifications
  getNotifications(userId?: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  saveNotificationSubscription(
    userId: string,
    subscription: any,
  ): Promise<void>;
  removeNotificationSubscription(userId: string): Promise<void>;
  saveNotificationSettings(userId: string, settings: any): Promise<void>;
  createNotification(notification: any): Promise<any>;
  triggerBusinessNotification(event: string, data: any): Promise<void>;

  // Security monitoring
  getSecurityMetrics(timeframe?: "hour" | "day" | "week"): Promise<any>;

  // Production Schedule Labels operations
  getProductionScheduleLabels(): Promise<ProductionScheduleLabel[]>;
  createProductionScheduleLabel(
    data: InsertProductionScheduleLabel,
  ): Promise<ProductionScheduleLabel>;
  updateProductionScheduleLabel(
    id: number,
    data: Partial<InsertProductionScheduleLabel>,
  ): Promise<ProductionScheduleLabel>;
  closeDayForLabels(ids: number[], closedBy: string): Promise<any>;

  // Supplier Ledger operations
  getSupplierLedgers(): Promise<any[]>;
  getSupplierLedger(supplierId: number): Promise<any>;
  updateSupplierLedger(supplierId: number, purchaseData: any): Promise<void>;
  calculateSupplierBalance(supplierId: number): Promise<number>;

  // Sales operations
  getSales(): Promise<any[]>;
  createSaleWithTransaction(saleData: any): Promise<any>;

  // Branch Management methods
  getBranches(): Promise<Branch[]>;
  createBranch(branchData: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branchData: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: number): Promise<void>;
  assignUserToBranch(userId: string, branchId: number): Promise<void>;
  getUsersWithBranches(): Promise<any[]>;
}

export class Storage implements IStorage {
  private db;
  private uploadsDir = path.join(process.cwd(), "public", "uploads");

  constructor() {
    this.db = db; // Assign the imported db instance

    // Ensure directories exist
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    // Ensure staff documents directory exists
    const staffDocumentsDir = path.join(this.uploadsDir, "staff-documents");
    if (!fs.existsSync(staffDocumentsDir)) {
      fs.mkdirSync(staffDocumentsDir, { recursive: true });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return result[0] || undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const {
      email,
      password,
      firstName,
      lastName,
      profileImageUrl,
      role,
      branchId,
      canAccessAllBranches,
    } = userData;

    const existingUser = await this.getUserByEmail(email);

    if (existingUser) {
      const updateData: any = {
        firstName,
        lastName,
        profileImageUrl,
        role,
        branchId,
        canAccessAllBranches,
      };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();

      return updatedUser;
    } else {
      const hashedPassword = password
        ? await bcrypt.hash(password, 10)
        : undefined;
      const [newUser] = await this.db
        .insert(users)
        .values({
          id: `${role}_${Date.now()}`,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          profileImageUrl,
          role: role || "staff",
          branchId: branchId || null,
          canAccessAllBranches: canAccessAllBranches || false,
        })
        .returning();

      return newUser;
    }
  }

  async getAllUsers(excludeSuperAdmin: boolean = false): Promise<User[]> {
    let query = this.db.select().from(users);

    if (excludeSuperAdmin) {
      query = query.where(sql`${users.role} != 'super_admin'`);
    }

    return await query.orderBy(users.createdAt);
  }

  async updateUser(id: string, data: any): Promise<any> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async ensureDefaultAdmin(): Promise<void> {
    const superAdminEmail = "superadmin@merobakersoft.com";
    const adminEmail = "admin@merobakersoft.com";
    const managerEmail = "manager@merobakersoft.com";
    const staffEmail = "staff@merobakersoft.com";

    // Create superadmin user
    const existingSuperAdmin = await this.getUserByEmail(superAdminEmail);
    if (!existingSuperAdmin) {
      await this.upsertUser({
        email: superAdminEmail,
        password: "superadmin123",
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        canAccessAllBranches: true, // Super admin can access all branches
      });
      console.log("✅ Default superadmin user created");
    }

    const existingAdmin = await this.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      await this.upsertUser({
        email: adminEmail,
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        canAccessAllBranches: true, // Admins can access all branches by default
      });
      console.log("✅ Default admin user created");
    }

    const existingManager = await this.getUserByEmail(managerEmail);
    if (!existingManager) {
      await this.upsertUser({
        email: managerEmail,
        password: "manager123",
        firstName: "Manager",
        lastName: "User",
        role: "manager",
        // Branch assignment can be done later, or set a default if needed
      });
      console.log("✅ Default manager user created");
    }

    const existingStaff = await this.getUserByEmail(staffEmail);
    if (!existingStaff) {
      await this.upsertUser({
        email: staffEmail,
        password: "staff123",
        firstName: "Staff",
        lastName: "User",
        role: "staff",
        // Branch assignment can be done later
      });
      console.log("✅ Default staff user created");
    }
  }

  async getUserCount(excludeSuperAdmin: boolean = false): Promise<number> {
    let query = this.db.select({ count: count() }).from(users);

    if (excludeSuperAdmin) {
      query = query.where(sql`${users.role} != 'super_admin'`);
    }

    const result = await query;
    return result[0].count;
  }

  

  // Product operations
  async getProducts(
    userBranchId?: number,
    canAccessAllBranches?: boolean,
    userRole?: string,
  ): Promise<Product[]> {
    try {
      let query = this.db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          categoryId: products.categoryId,
          price: products.price,
          cost: products.cost,
          margin: products.margin,
          sku: products.sku,
          unit: products.unit,
          unitId: products.unitId,
          branchId: products.branchId,
          isGlobal: products.isGlobal,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products);

      // Super Admin sees ALL products including inactive ones
      if (userRole !== 'super_admin') {
        query = query.where(eq(products.isActive, true));
        
        // Apply branch filtering if user doesn't have access to all branches
        if (!canAccessAllBranches && userBranchId) {
          query = query.where(
            and(
              eq(products.isActive, true),
              or(
                eq(products.branchId, userBranchId),
                eq(products.isGlobal, true),
                isNull(products.branchId),
              ),
            )
          );
        }
      }

      const result = await query.orderBy(products.name);

      console.log(`✅ Found ${result.length} products for ${userRole === 'super_admin' ? 'Super Admin (ALL)' : 'branch access'}`);
      return result as Product[];
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      return [];
    }
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const result = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return result[0];
  }

  async getProductsWithIngredients(): Promise<any[]> {
    try {
      const result = await this.db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          categoryId: products.categoryId,
          price: products.price,
          cost: products.cost,
          margin: products.margin,
          sku: products.sku,
          unit: products.unit,
          unitId: products.unitId,
          unitName: units.name,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .leftJoin(units, eq(products.unitId, units.id))
        .orderBy(desc(products.createdAt));

      console.log(`📦 Retrieved ${result.length} products from database`);
      return result || [];
    } catch (error) {
      console.error("Error fetching products with ingredients:", error);
      throw error;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await this.db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(
    id: number,
    product: Partial<InsertProduct>,
  ): Promise<Product> {
    const [updatedProduct] = await this.db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.db
      .delete(productIngredients)
      .where(eq(productIngredients.productId, id));
    await this.db.delete(products).where(eq(products.id, id));
  }

  async getProductIngredients(productId: number): Promise<any[]> {
    return await this.db
      .select({
        id: productIngredients.id,
        productId: productIngredients.productId,
        inventoryItemId: productIngredients.inventoryItemId,
        quantity: productIngredients.quantity,
        unit: productIngredients.unit,
        inventoryItemName: inventoryItems.name,
        inventoryItemUnit: inventoryItems.unit,
      })
      .from(productIngredients)
      .leftJoin(
        inventoryItems,
        eq(productIngredients.inventoryItemId, inventoryItems.id),
      )
      .where(eq(productIngredients.productId, productId));
  }

  async createProductIngredient(ingredient: any): Promise<any> {
    const [newIngredient] = await this.db
      .insert(productIngredients)
      .values(ingredient)
      .returning();
    return newIngredient;
  }

  async deleteProductIngredients(productId: number): Promise<void> {
    await this.db
      .delete(productIngredients)
      .where(eq(productIngredients.productId, productId));
  }

  // Unit operations
  async getUnits(): Promise<Unit[]> {
    try {
      // Use only the columns that exist in the current schema
      const result = await this.db
        .select({
          id: units.id,
          name: units.name,
          abbreviation: units.abbreviation,
          type: units.type,
          isActive: units.isActive,
          createdAt: units.createdAt,
          updatedAt: units.updatedAt,
        })
        .from(units)
        .where(eq(units.isActive, true))
        .orderBy(units.name);

      return result;
    } catch (error) {
      console.error("Error in getUnits:", error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  async getUnitById(id: number): Promise<Unit | undefined> {
    try {
      const result = await this.db
        .select()
        .from(units)
        .where(eq(units.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error fetching unit by ID:", error);
      return undefined;
    }
  }

  async createUnit(data: InsertUnit): Promise<Unit> {
    try {
      const result = await this.db.insert(units).values(data).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating unit:", error);
      throw error;
    }
  }

  async updateUnit(id: number, data: Partial<InsertUnit>): Promise<Unit> {
    try {
      const result = await this.db
        .update(units)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(units.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Unit not found");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating unit:", error);
      throw error;
    }
  }

  async deleteUnit(id: number): Promise<void> {
    try {
      const result = await this.db
        .delete(units)
        .where(eq(units.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error("Unit not found");
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      throw error;
    }
  }

  async getActiveUnits() {
    try {
      const result = await this.db
        .select()
        .from(units)
        .where(eq(units.isActive, true))
        .orderBy(units.name);
      return result;
    } catch (error) {
      console.error("Error in getActiveUnits:", error);
      throw error;
    }
  }

  async deleteUnit(id: number): Promise<void> {
    try {
      // Check if unit is being used in other tables before deletion
      const usageChecks = await Promise.all([
        // Check products table
        this.db
          .select({ count: sql`count(*)` })
          .from(products)
          .where(eq(products.unitId, id)),
        // Check inventory items table (primary unit)
        this.db
          .select({ count: sql`count(*)` })
          .from(inventoryItems)
          .where(eq(inventoryItems.unitId, id)),
        // Check inventory items table (secondary unit)
        this.db
          .select({ count: sql`count(*)` })
          .from(inventoryItems)
          .where(eq(inventoryItems.secondaryUnitId, id)),
        // Check product ingredients table
        this.db
          .select({ count: sql`count(*)` })
          .from(productIngredients)
          .where(eq(productIngredients.unitId, id)),
        // Check unit conversions table (from unit)
        this.db
          .select({ count: sql`count(*)` })
          .from(unitConversions)
          .where(eq(unitConversions.fromUnitId, id)),
        // Check unit conversions table (to unit)
        this.db
          .select({ count: sql`count(*)` })
          .from(unitConversions)
          .where(eq(unitConversions.toUnitId, id)),
      ]);

      const totalUsage = usageChecks.reduce(
        (sum, result) => sum + Number(result[0].count),
        0,
      );

      if (totalUsage > 0) {
        throw new Error(
          `Cannot delete unit: it is being used in ${totalUsage} record(s). Please remove all references to this unit before deleting it.`,
        );
      }

      // Safe to delete
      await this.db.delete(units).where(eq(units.id, id));
      console.log(`Unit ${id} deleted successfully`);
    } catch (error) {
      console.error("Error deleting unit:", error);
      throw error;
    }
  }

  // Unit conversion operations
  async getUnitConversions(): Promise<any[]> {
    return await this.db
      .select({
        id: unitConversions.id,
        fromUnitId: unitConversions.fromUnitId,
        toUnitId: unitConversions.toUnitId,
        conversionFactor: unitConversions.conversionFactor,
        formula: unitConversions.formula,
        isActive: unitConversions.isActive,
        createdAt: unitConversions.createdAt,
        updatedAt: unitConversions.updatedAt,
        fromUnit: {
          id: sql`from_unit.id`,
          name: sql`from_unit.name`,
          abbreviation: sql`from_unit.abbreviation`,
        },
        toUnit: {
          id: sql`to_unit.id`,
          name: sql`to_unit.name`,
          abbreviation: sql`to_unit.abbreviation`,
        },
      })
      .from(unitConversions)
      .leftJoin(
        sql`units as from_unit`,
        sql`from_unit.id = ${unitConversions.fromUnitId}`,
      )
      .leftJoin(
        sql`units as to_unit`,
        sql`to_unit.id = ${unitConversions.toUnitId}`,
      )
      .orderBy(sql`from_unit.name`, sql`to_unit.name`);
  }

  async createUnitConversion(data: any): Promise<any> {
    const [newConversion] = await this.db
      .insert(unitConversions)
      .values(data)
      .returning();
    return newConversion;
  }

  async updateUnitConversion(id: number, data: any): Promise<any> {
    const [updatedConversion] = await this.db
      .update(unitConversions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(unitConversions.id, id))
      .returning();
    return updatedConversion;
  }

  async deleteUnitConversion(id: number): Promise<void> {
    await this.db.delete(unitConversions).where(eq(unitConversions.id, id));
  }

  async convertQuantity(
    fromQuantity: number,
    fromUnitId: number,
    toUnitId: number,
  ): Promise<number> {
    if (fromUnitId === toUnitId) return fromQuantity;

    // Try direct conversion
    const directConversion = await this.db
      .select()
      .from(unitConversions)
      .where(
        and(
          eq(unitConversions.fromUnitId, fromUnitId),
          eq(unitConversions.toUnitId, toUnitId),
          eq(unitConversions.isActive, true),
        ),
      )
      .limit(1);

    if (directConversion.length > 0) {
      return fromQuantity * parseFloat(directConversion[0].conversionFactor);
    }

    // Try reverse conversion
    const reverseConversion = await this.db
      .select()
      .from(unitConversions)
      .where(
        and(
          eq(unitConversions.fromUnitId, toUnitId),
          eq(unitConversions.toUnitId, fromUnitId),
          eq(unitConversions.isActive, true),
        ),
      )
      .limit(1);

    if (reverseConversion.length > 0) {
      return fromQuantity / parseFloat(reverseConversion[0].conversionFactor);
    }

    throw new Error(
      `No conversion found between units ${fromUnitId} and ${toUnitId}`,
    );
  }

  // Inventory operations
  async getInventoryItemsPaginated(options?: {
    page?: number;
    limit?: number;
    search?: string;
    group?: string;
  }): Promise<{
    items: InventoryItem[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const search = options?.search?.toLowerCase() || "";
      const group = options?.group || "all";
      const offset = (page - 1) * limit;

      // Build base query with simplified selection
      let baseQuery = this.db
        .select({
          id: inventoryItems.id,
          invCode: inventoryItems.invCode,
          name: inventoryItems.name,
          currentStock: inventoryItems.currentStock,
          openingStock: inventoryItems.openingStock,
          purchasedQuantity: inventoryItems.purchasedQuantity,
          consumedQuantity: inventoryItems.consumedQuantity,
          closingStock: inventoryItems.closingStock,
          minLevel: inventoryItems.minLevel,
          unit: inventoryItems.unit,
          unitId: inventoryItems.unitId,
          secondaryUnitId: inventoryItems.secondaryUnitId,
          conversionRate: inventoryItems.conversionRate,
          costPerUnit: inventoryItems.costPerUnit,
          supplier: inventoryItems.supplier,
          categoryId: inventoryItems.categoryId,
          branchId: inventoryItems.branchId,
          isIngredient: inventoryItems.isIngredient,
          lastRestocked: inventoryItems.lastRestocked,
          createdAt: inventoryItems.createdAt,
          updatedAt: inventoryItems.updatedAt,
        })
        .from(inventoryItems)
        .orderBy(desc(inventoryItems.createdAt));

      let countQuery = this.db.select({ count: count() }).from(inventoryItems);

      // Build where conditions
      const whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            ilike(inventoryItems.name, `%${search}%`),
            ilike(inventoryItems.supplier, `%${search}%`),
            ilike(inventoryItems.invCode, `%${search}%`),
          ),
        );
      }

      if (group && group !== "all") {
        if (group === "ingredients") {
          whereConditions.push(eq(inventoryItems.isIngredient, true));
        } else if (group === "uncategorized") {
          whereConditions.push(isNull(inventoryItems.categoryId));
        } else if (!isNaN(parseInt(group))) {
          whereConditions.push(eq(inventoryItems.categoryId, parseInt(group)));
        }
      }

      if (whereConditions.length > 0) {
        baseQuery = baseQuery.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
      }

      const [items, totalResult] = await Promise.all([
        baseQuery.limit(limit).offset(offset),
        countQuery,
      ]);

      const totalCount = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // Add category and unit information manually
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          let categoryName = null;
          let unitAbbreviation = item.unit;
          let group = "uncategorized";

          // Get category name if categoryId exists
          if (item.categoryId) {
            try {
              const category = await this.db
                .select({ name: inventoryCategories.name })
                .from(inventoryCategories)
                .where(eq(inventoryCategories.id, item.categoryId))
                .limit(1);
              if (category.length > 0) {
                categoryName = category[0].name;
                group = item.categoryId.toString();
              }
            } catch (error) {
              console.warn(
                `Failed to fetch category for item ${item.id}:`,
                error,
              );
            }
          }

          // Get unit abbreviation if unitId exists
          if (item.unitId) {
            try {
              const unit = await this.db
                .select({ abbreviation: units.abbreviation })
                .from(units)
                .where(eq(units.id, item.unitId))
                .limit(1);
              if (unit.length > 0) {
                unitAbbreviation = unit[0].abbreviation;
              }
            } catch (error) {
              console.warn(`Failed to fetch unit for item ${item.id}:`, error);
            }
          }

          // Determine group
          if (item.isIngredient) {
            group = "ingredients";
          }

          return {
            ...item,
            categoryName,
            unitAbbreviation,
            group,
            notes: "",
          };
        }),
      );

      // Check for low stock items (notifications will be generated by the API route)
      console.log("📦 Checking inventory levels for notifications...");

      return {
        items: enrichedItems,
        totalCount,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      };
    } catch (error) {
      console.error("Error in getInventoryItems:", error);
      return {
        items: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 10,
      };
    }
  }

  async getInventoryItems(
    userBranchId?: number,
    canAccessAllBranches?: boolean,
    userRole?: string,
  ): Promise<InventoryItem[]> {
    try {
      let query = this.db
        .select({
          id: inventoryItems.id,
          invCode: inventoryItems.invCode,
          name: inventoryItems.name,
          currentStock: inventoryItems.currentStock,
          openingStock: inventoryItems.openingStock,
          purchasedQuantity: inventoryItems.purchasedQuantity,
          consumedQuantity: inventoryItems.consumedQuantity,
          closingStock: inventoryItems.closingStock,
          minLevel: inventoryItems.minLevel,
          unit: inventoryItems.unit,
          unitId: inventoryItems.unitId,
          secondaryUnitId: inventoryItems.secondaryUnitId,
          conversionRate: inventoryItems.conversionRate,
          costPerUnit: inventoryItems.costPerUnit,
          supplier: inventoryItems.supplier,
          categoryId: inventoryItems.categoryId,
          branchId: inventoryItems.branchId,
          isIngredient: inventoryItems.isIngredient,
          notes: inventoryItems.notes,
          lastRestocked: inventoryItems.lastRestocked,
          createdAt: inventoryItems.createdAt,
          updatedAt: inventoryItems.updatedAt,
          categoryName: inventoryCategories.name,
        })
        .from(inventoryItems)
        .leftJoin(
          inventoryCategories,
          eq(inventoryItems.categoryId, inventoryCategories.id),
        );

      // Super Admin bypasses all branch filtering
      if (userRole !== 'super_admin') {
        // Apply branch filtering if user doesn't have access to all branches
        if (!canAccessAllBranches && userBranchId) {
          query = query.where(
            or(
              eq(inventoryItems.branchId, userBranchId),
              isNull(inventoryItems.branchId),
            ),
          );
        }
      }

      const result = await query.orderBy(inventoryItems.name);

      console.log(
        `✅ Found ${result.length} inventory items for ${userRole === 'super_admin' ? 'Super Admin (ALL)' : 'branch access'}`,
      );
      return result as InventoryItem[];
    } catch (error) {
      console.error("❌ Error fetching inventory items:", error);
      return [];
    }
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    try {
      return await this.db
        .select()
        .from(inventoryItems)
        .orderBy(inventoryItems.name);
    } catch (error) {
      console.error("Error in getAllInventoryItems:", error);
      return [];
    }
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    const result = await this.db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1);
    return result[0];
  }

  async createInventoryItem(data: any): Promise<InventoryItem> {
    try {
      console.log("Creating inventory item with data:", data);

      // Check for duplicate name (case-insensitive, trimmed)
      const trimmedName = data.name.trim();
      const existingItem = await this.db
        .select()
        .from(inventoryItems)
        .where(sql`LOWER(TRIM(${inventoryItems.name})) = LOWER(${trimmedName})`)
        .limit(1);

      if (existingItem.length > 0) {
        throw new Error(
          "Item with this name already exists. Please use a different name.",
        );
      }

      // Ensure proper data types and handle optional fields
      const cleanData = {
        name: trimmedName,
        currentStock: data.currentStock ? String(data.currentStock) : "0",
        openingStock: data.openingStock
          ? String(data.openingStock)
          : String(data.currentStock || "0"),
        purchasedQuantity: data.purchasedQuantity
          ? String(data.purchasedQuantity)
          : "0",
        consumedQuantity: data.consumedQuantity
          ? String(data.consumedQuantity)
          : "0",
        closingStock: data.closingStock
          ? String(data.closingStock)
          : String(data.currentStock || "0"),
        minLevel: data.minLevel ? String(data.minLevel) : "0",
        unitId: data.unitId || null,
        secondaryUnitId: data.secondaryUnitId || null,
        conversionRate: data.conversionRate
          ? String(data.conversionRate)
          : null,
        costPerUnit: data.costPerUnit ? String(data.costPerUnit) : "0",
        supplier: data.supplier || null,
        categoryId: data.categoryId || null,
        branchId: data.branchId || null, // Assign branchId
        isIngredient: data.isIngredient || false,
        lastRestocked: data.lastRestocked
          ? new Date(data.lastRestocked)
          : new Date(),
        notes: data.notes || null,
      };

      const result = await this.db
        .insert(inventoryItems)
        .values(cleanData)
        .returning();
      console.log("Inventory item created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error creating inventory item:", error);
      throw error;
    }
  }

  async updateInventoryItem(
    id: number,
    updateData: Partial<InsertInventoryItem>,
  ): Promise<InventoryItem> {
    try {
      // Clean the data and ensure proper types
      const cleanData = { ...updateData };

      // Handle timestamp fields
      if (
        cleanData.lastRestocked &&
        typeof cleanData.lastRestocked !== "string"
      ) {
        cleanData.lastRestocked = new Date(cleanData.lastRestocked);
      } else if (typeof cleanData.lastRestocked === "string") {
        // Ensure string dates are parsed
        cleanData.lastRestocked = new Date(cleanData.lastRestocked);
      }

      // Ensure numeric fields are strings if they exist
      const numericFields = [
        "currentStock",
        "openingStock",
        "purchasedQuantity",
        "consumedQuantity",
        "closingStock",
        "minLevel",
        "costPerUnit",
        "conversionRate",
      ];
      numericFields.forEach((field) => {
        if (cleanData[field] !== undefined && cleanData[field] !== null) {
          cleanData[field] = String(cleanData[field]);
        }
      });

      // Remove undefined fields
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] === undefined || cleanData[key] === null) {
          delete cleanData[key];
        }
      });

      const result = await this.db
        .update(inventoryItems)
        .set(cleanData)
        .where(eq(inventoryItems.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating inventory item:", error);
      throw error;
    }
  }

  async updateInventoryWithPurchase(
    inventoryItemId: number,
    purchaseQuantity: number,
    purchaseRate: number,
    purchaseDate: Date,
  ): Promise<void> {
    try {
      // Get current inventory item
      const currentItem = await this.getInventoryItemById(inventoryItemId);
      if (!currentItem) {
        throw new Error("Inventory item not found");
      }

      const currentStock = parseFloat(currentItem.currentStock);
      const currentRate = parseFloat(currentItem.costPerUnit);

      // Calculate weighted average cost
      const totalCurrentValue = currentStock * currentRate;
      const totalPurchaseValue = purchaseQuantity * purchaseRate;
      const totalQuantity = currentStock + purchaseQuantity;
      const totalValue = totalCurrentValue + totalPurchaseValue;

      const newWeightedAverageRate =
        totalQuantity > 0 ? totalValue / totalQuantity : purchaseRate;

      // Update inventory item
      await this.updateInventoryItem(inventoryItemId, {
        currentStock: totalQuantity.toString(),
        costPerUnit: newWeightedAverageRate.toString(),
        lastRestocked: purchaseDate,
      });

      console.log(`Updated inventory item ${inventoryItemId}:`, {
        previousStock: currentStock,
        purchaseQuantity,
        newStock: totalQuantity,
        previousRate: currentRate,
        purchaseRate,
        newWeightedRate: newWeightedAverageRate,
      });
    } catch (error) {
      console.error("Error updating inventory with purchase:", error);
      throw error;
    }
  }

  async updateInventoryWithWeightedAverage(
    inventoryItemId: number,
    purchaseQuantity: number,
    purchaseRate: number,
    purchaseDate: Date,
  ): Promise<void> {
    try {
      // Get current inventory item (this represents the closing stock)
      const currentItem = await this.getInventoryItemById(inventoryItemId);
      if (!currentItem) {
        throw new Error("Inventory item not found");
      }

      const closingStock = parseFloat(currentItem.currentStock || "0");
      const closingRate = parseFloat(currentItem.costPerUnit || "0");

      // Calculate closing stock value
      const closingStockValue = closingStock * closingRate;

      // Calculate purchase value
      const purchaseValue = purchaseQuantity * purchaseRate;

      // Calculate new opening stock after purchase
      const newOpeningQuantity = closingStock + purchaseQuantity;
      const newOpeningValue = closingStockValue + purchaseValue;

      // Calculate weighted average rate for new opening stock
      const newWeightedAverageRate =
        newOpeningQuantity > 0
          ? newOpeningValue / newOpeningQuantity
          : purchaseRate;

      // Update inventory item with new opening stock values
      await this.updateInventoryItem(inventoryItemId, {
        currentStock: newOpeningQuantity.toString(),
        costPerUnit: newWeightedAverageRate.toString(),
        lastRestocked: purchaseDate,
      });

      // Create inventory transaction for tracking
      await this.createInventoryTransaction({
        inventoryItemId: inventoryItemId,
        type: "in",
        quantity: purchaseQuantity.toString(),
        reason: `Purchase - Weighted average update`,
        reference: `Purchase at ${purchaseRate}/unit`,
        createdBy: "system",
      });

      console.log(
        `✅ Inventory updated with weighted average for item ${inventoryItemId}:`,
        {
          closingStock,
          closingRate,
          closingStockValue,
          purchaseQuantity,
          purchaseRate,
          purchaseValue,
          newOpeningQuantity,
          newOpeningValue,
          newWeightedRate: newWeightedAverageRate,
        },
      );
    } catch (error) {
      console.error(
        "❌ Error updating inventory with weighted average:",
        error,
      );
      throw error;
    }
  }

  async deleteInventoryItem(id: number): Promise<void> {
    try {
      // First check if item exists
      const existingItem = await this.db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id))
        .limit(1);

      if (existingItem.length === 0) {
        throw new Error("Inventory item not found");
      }

      // Delete associated transactions
      await this.db
        .delete(inventoryTransactions)
        .where(eq(inventoryTransactions.itemId, id));

      // Delete the item
      await this.db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      throw error;
    }
  }

  async getInventoryCategories(): Promise<InventoryCategory[]> {
    return await this.db
      .select()
      .from(inventoryCategories)
      .orderBy(inventoryCategories.name);
  }

  async createInventoryCategory(
    data: InsertInventoryCategory,
  ): Promise<InventoryCategory> {
    const [newCategory] = await this.db
      .insert(inventoryCategories)
      .values(data)
      .returning();
    return newCategory;
  }

  async updateInventoryCategory(
    id: number,
    data: Partial<InsertInventoryCategory>,
  ): Promise<InventoryCategory> {
    const [updatedCategory] = await this.db
      .update(inventoryCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteInventoryCategory(id: number): Promise<void> {
    await this.db
      .delete(inventoryCategories)
      .where(eq(inventoryCategories.id, id));
  }

  async createInventoryTransaction(
    transaction: InsertInventoryTransaction,
  ): Promise<InventoryTransaction> {
    // Ensure quantity is a string for consistency
    const transactionData = {
      ...transaction,
      quantity: String(transaction.quantity),
    };

    const [newTransaction] = await this.db
      .insert(inventoryTransactions)
      .values(transactionData)
      .returning();

    // Update the current stock
    const item = await this.getInventoryItemById(transaction.inventoryItemId);
    if (item) {
      const quantityChange =
        transaction.type === "in"
          ? parseFloat(transaction.quantity)
          : -parseFloat(transaction.quantity);

      const newStock = parseFloat(item.currentStock || "0") + quantityChange;

      await this.updateInventoryItem(transaction.inventoryItemId, {
        currentStock: newStock.toString(),
        updatedAt: new Date(),
      });
    }

    return newTransaction;
  }

  async getInventoryTransactions(itemId?: number): Promise<any[]> {
    let query = this.db
      .select({
        id: inventoryTransactions.id,
        inventoryItemId: inventoryTransactions.inventoryItemId,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        reason: inventoryTransactions.reason,
        createdAt: inventoryTransactions.createdAt,
        itemName: inventoryItems.name,
        unit: inventoryItems.unit,
      })
      .from(inventoryTransactions)
      .leftJoin(
        inventoryItems,
        eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
      )
      .orderBy(desc(inventoryTransactions.createdAt));

    if (itemId) {
      query = query.where(eq(inventoryTransactions.inventoryItemId, itemId));
    }

    return await query;
  }

  async getLowStockItems() {
    const items = await this.db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.closingStock} <= ${inventoryItems.minLevel}`)
      .limit(10);

    return items;
  }

  // Get ingredients from multiple sources
  async getIngredients(): Promise<InventoryItem[]> {
    try {
      console.log("Fetching ingredients...");

      // Get all inventory items directly with specific field selection
      const allItems = await this.db
        .select({
          id: inventoryItems.id,
          invCode: inventoryItems.invCode,
          name: inventoryItems.name,
          currentStock: inventoryItems.currentStock,
          openingStock: inventoryItems.openingStock,
          purchasedQuantity: inventoryItems.purchasedQuantity,
          consumedQuantity: inventoryItems.consumedQuantity,
          closingStock: inventoryItems.closingStock,
          minLevel: inventoryItems.minLevel,
          unit: inventoryItems.unit,
          unitId: inventoryItems.unitId,
          secondaryUnitId: inventoryItems.secondaryUnitId,
          conversionRate: inventoryItems.conversionRate,
          costPerUnit: inventoryItems.costPerUnit,
          supplier: inventoryItems.supplier,
          categoryId: inventoryItems.categoryId,
          isIngredient: inventoryItems.isIngredient,
          lastRestocked: inventoryItems.lastRestocked,
          createdAt: inventoryItems.createdAt,
          updatedAt: inventoryItems.updatedAt,
        })
        .from(inventoryItems)
        .orderBy(inventoryItems.name);

      console.log(`Found ${allItems.length} total inventory items`);

      // Filter items that are suitable as ingredients
      const ingredients = allItems.filter((item: any) => {
        const itemName = item.name?.toLowerCase() || "";

        return (
          item.isIngredient === true ||
          itemName.includes("flour") ||
          itemName.includes("sugar") ||
          itemName.includes("butter") ||
          itemName.includes("milk") ||
          itemName.includes("egg") ||
          itemName.includes("chocolate") ||
          itemName.includes("vanilla") ||
          itemName.includes("salt") ||
          itemName.includes("baking") ||
          itemName.includes("yeast") ||
          itemName.includes("cream") ||
          itemName.includes("oil") ||
          itemName.includes("spice") ||
          itemName.includes("extract")
        );
      });

      console.log(`Filtered to ${ingredients.length} ingredients`);
      return ingredients;
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      return [];
    }
  }

  // Sync stock levels from purchases
  async syncStockFromPurchases() {
    try {
      // Get all purchase items and aggregate by inventory item
      const purchaseAggregates = await this.db
        .select({
          inventoryItemId: purchaseItems.inventoryItemId,
          totalPurchased: sql<number>`SUM(${purchaseItems.quantity})`,
        })
        .from(purchaseItems)
        .groupBy(purchaseItems.inventoryItemId);

      // Update inventory items with purchased quantities
      for (const aggregate of purchaseAggregates) {
        const inventoryItem = await this.db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, aggregate.inventoryItemId))
          .limit(1);

        if (inventoryItem.length > 0) {
          const item = inventoryItem[0];
          const openingStock = parseFloat(item.openingStock || "0");
          const purchasedQuantity = aggregate.totalPurchased || 0;
          const consumedQuantity = parseFloat(item.consumedQuantity || "0");
          const closingStock =
            openingStock + purchasedQuantity - consumedQuantity;

          await this.db
            .update(inventoryItems)
            .set({
              purchasedQuantity: purchasedQuantity.toString(),
              closingStock: closingStock.toString(),
              currentStock: closingStock.toString(),
              lastRestocked: new Date(),
            })
            .where(eq(inventoryItems.id, aggregate.inventoryItemId));
        }
      }

      console.log("Stock levels synced from purchases successfully");
    } catch (error) {
      console.error("Error syncing stock from purchases:", error);
      throw error;
    }
  }

  async updateInventoryStockAndCost(
    itemId: number,
    addedQuantity: number,
    newCostPerUnit: number,
  ) {
    try {
      const item = await this.getInventoryItemById(itemId);
      if (!item) {
        throw new Error("Inventory item not found");
      }

      const currentStock = parseFloat(item.currentStock);
      const currentCostPerUnit = parseFloat(item.costPerUnit);

      // Calculate weighted average cost
      const totalValue =
        currentStock * currentCostPerUnit + addedQuantity * newCostPerUnit;
      const totalQuantity = currentStock + addedQuantity;
      const newWeightedCost =
        totalQuantity > 0 ? totalValue / totalQuantity : newCostPerUnit;

      // Update inventory
      await this.db
        .update(inventoryItems)
        .set({
          currentStock: totalQuantity.toString(),
          costPerUnit: newWeightedCost.toFixed(4),
          lastRestocked: new Date(),
        })
        .where(eq(inventoryItems.id, itemId));

      console.log(
        `Updated inventory item ${itemId}: stock=${totalQuantity}, cost=${newWeightedCost.toFixed(4)}`,
      );
    } catch (error) {
      console.error("Error updating inventory stock and cost:", error);
      throw error;
    }
  }

  // Update inventory stock specifically for purchases
  async updateInventoryPurchaseStock(
    itemId: number,
    purchasedQuantity: number,
  ) {
    try {
      const item = await this.getInventoryItemById(itemId);
      if (!item) {
        throw new Error("Inventory item not found");
      }

      const openingStock = parseFloat(
        item.openingStock || item.currentStock || "0",
      );
      const currentPurchased = parseFloat(item.purchasedQuantity || "0");
      const consumedQuantity = parseFloat(item.consumedQuantity || "0");

      const newPurchasedQuantity = currentPurchased + purchasedQuantity;
      const newClosingStock =
        openingStock + newPurchasedQuantity - consumedQuantity;

      // Update inventory with new purchase data
      await this.db
        .update(inventoryItems)
        .set({
          purchasedQuantity: newPurchasedQuantity.toString(),
          closingStock: newClosingStock.toString(),
          currentStock: newClosingStock.toString(),
          lastRestocked: new Date(),
        })
        .where(eq(inventoryItems.id, itemId));

      console.log(
        `Updated purchase stock for item ${itemId}: purchased=${newPurchasedQuantity}, closing=${newClosingStock}`,
      );
    } catch (error) {
      console.error("Error updating inventory purchase stock:", error);
      throw error;
    }
  }

  // Permission operations
  async getPermissions(): Promise<Permission[]> {
    return await this.db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);
  }

  async createPermission(data: InsertPermission): Promise<Permission> {
    const [newPermission] = await this.db
      .insert(permissions)
      .values(data)
      .returning();
    return newPermission;
  }

  async getRolePermissions(role: string): Promise<any[]> {
    return await this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(permissions)
      .innerJoin(
        rolePermissions,
        eq(permissions.id, rolePermissions.permissionId),
      )
      .where(eq(rolePermissions.role, role))
      .orderBy(permissions.resource, permissions.action);
  }

  async setRolePermissions(
    role: string,
    permissionIds: number[],
  ): Promise<void> {
    await this.db.delete(rolePermissions).where(eq(rolePermissions.role, role));

    if (permissionIds.length > 0) {
      const rolePermissionData = permissionIds.map((permissionId) => ({
        role,
        permissionId,
      }));
      await this.db.insert(rolePermissions).values(rolePermissionData);
    }
  }

  async getUserPermissions(userId: string): Promise<any[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return [];

      // Super admin gets ALL permissions without exception
      if (user.role === "super_admin") {
        console.log(`🚀 Granting ALL permissions to Super Admin: ${user.email}`);
        return await this.db
          .select({
            id: permissions.id,
            name: permissions.name,
            resource: permissions.resource,
            action: permissions.action,
            description: permissions.description,
            granted: sql<boolean>`true`,
          })
          .from(permissions)
          .orderBy(permissions.resource, permissions.action);
      }

      // Admin gets most permissions except super admin specific ones
      if (user.role === "admin") {
        return await this.db
          .select({
            id: permissions.id,
            name: permissions.name,
            resource: permissions.resource,
            action: permissions.action,
            description: permissions.description,
            granted: sql<boolean>`true`,
          })
          .from(permissions)
          .where(sql`${permissions.resource} != 'super_admin'`)
          .orderBy(permissions.resource, permissions.action);
      }

      // Get role-based permissions
      const rolePermissions = await this.db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          granted: sql<boolean>`true`,
        })
        .from(permissions)
        .innerJoin(
          rolePermissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(eq(rolePermissions.role, user.role))
        .orderBy(permissions.resource, permissions.action);

      // Get user-specific permission overrides
      const userPermissions = await this.db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          granted: userPermissions.granted,
        })
        .from(userPermissions)
        .innerJoin(
          permissions,
          eq(permissions.id, userPermissions.permissionId),
        )
        .where(eq(userPermissions.userId, userId))
        .orderBy(permissions.resource, permissions.action);

      // Merge permissions (user-specific overrides take precedence)
      const permissionMap = new Map();

      // Add role permissions first
      rolePermissions.forEach((perm) => {
        permissionMap.set(perm.id, perm);
      });

      // Override with user-specific permissions
      userPermissions.forEach((perm) => {
        permissionMap.set(perm.id, perm);
      });

      return Array.from(permissionMap.values());

      const userResults = await this.db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          granted: userPermissions.granted,
        })
        .from(userPermissions)
        .innerJoin(
          permissions,
          eq(permissions.id, userPermissions.permissionId),
        )
        .where(eq(userPermissions.userId, userId));

      const roleResults = await this.db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          granted: sql<boolean>`true`,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(eq(rolePermissions.role, user.role));

      // Merge user and role permissions, user permissions override role permissions
      const allPermissions = [...roleResults];
      userResults.forEach((userPerm) => {
        const existingIndex = allPermissions.findIndex(
          (p) => p.id === userPerm.id,
        );
        if (existingIndex >= 0) {
          allPermissions[existingIndex] = userPerm;
        } else {
          allPermissions.push(userPerm);
        }
      });

      return allPermissions.filter((p) => p.granted);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return [];
    }
  }

  async setUserPermissions(
    userId: string,
    permissionUpdates: { permissionId: number; granted: boolean }[],
  ): Promise<void> {
    await this.db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId));

    if (permissionUpdates.length > 0) {
      const userPermissionData = permissionUpdates.map((update) => ({
        userId,
        permissionId: update.permissionId,
        granted: update.granted,
      }));
      await this.db.insert(userPermissions).values(userPermissionData);
    }
  }

  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some(
      (perm) =>
        perm.resource === resource &&
        (perm.action === action || perm.action === "read_write"),
    );
  }

  async initializeDefaultPermissions(): Promise<void> {
    const existingPermissions = await this.getPermissions();
    if (existingPermissions.length > 0) return;

    const resources = [
      "dashboard",
      "products",
      "inventory",
      "orders",
      "production",
      "customers",
      "parties",
      "assets",
      "expenses",
      "sales",
      "purchases",
      "reports",
      "settings",
      "users",
      "staff",
      "attendance",
      "salary",
      "leave_requests",
    ];

    const actions = ["read", "write", "read_write"];

    const defaultPermissions = [];
    for (const resource of resources) {
      for (const action of actions) {
        defaultPermissions.push({
          name: `${resource}_${action}`,
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} access to ${resource}`,
        });
      }
    }

    for (const permission of defaultPermissions) {
      await this.createPermission(permission);
    }

    const allPermissions = await this.getPermissions();

    // Super admin gets all permissions
    const superAdminPermissionIds = allPermissions.map((p) => p.id);
    await this.setRolePermissions("super_admin", superAdminPermissionIds);

    // Admin gets all except super admin specific ones
    const adminPermissionIds = allPermissions
      .filter((p) => p.resource !== "users") // Exclude user management for admins
      .map((p) => p.id);
    await this.setRolePermissions("admin", adminPermissionIds);

    const managerPermissionIds = allPermissions
      .filter((p) => p.action === "read_write" && p.resource !== "users")
      .map((p) => p.id);
    await this.setRolePermissions("manager", managerPermissionIds);

    const staffPermissionIds = allPermissions
      .filter(
        (p) =>
          p.action === "read" ||
          (p.action === "write" &&
            ["orders", "customers", "production"].includes(p.resource)),
      )
      .map((p) => p.id);
    await this.setRolePermissions("staff", staffPermissionIds);
  }

  async getSettings(): Promise<any> {
    try {
      const allSettings = await db.select().from(settings);
      console.log(
        "📊 Retrieved settings from database:",
        allSettings.length,
        "settings",
      );
      // Ensure default settings are present if none exist
      if (allSettings.length === 0) {
        console.log("No settings found, creating default settings...");
        const defaultSettings = {
          companyName: "Mero BakeSoft",
          companyPhone: "+977-1-234567",
        };
        return defaultSettings;
      }
      return allSettings[0] || {};
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      return {};
    }
  }

  // Branch Management implementation
  async getBranches(): Promise<Branch[]> {
    try {
      const result = await this.db
        .select()
        .from(branches)
        .orderBy(branches.isHeadOffice, desc(branches.createdAt));

      console.log(`✅ Found ${result.length} branches`);
      return result;
    } catch (error) {
      console.error("❌ Error fetching branches:", error);
      return [];
    }
  }

  async createBranch(branchData: InsertBranch): Promise<Branch> {
    try {
      const [newBranch] = await this.db
        .insert(branches)
        .values(branchData)
        .returning();

      console.log("✅ Branch created:", newBranch.name);
      return newBranch;
    } catch (error) {
      console.error("❌ Error creating branch:", error);
      throw error;
    }
  }

  async updateBranch(
    id: number,
    branchData: Partial<InsertBranch>,
  ): Promise<Branch> {
    try {
      const [updatedBranch] = await this.db
        .update(branches)
        .set({ ...branchData, updatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();

      console.log("✅ Branch updated:", updatedBranch.name);
      return updatedBranch;
    } catch (error) {
      console.error("❌ Error updating branch:", error);
      throw error;
    }
  }

  async deleteBranch(id: number): Promise<void> {
    try {
      // Check if this is the head office
      const branch = await this.db
        .select()
        .from(branches)
        .where(eq(branches.id, id))
        .limit(1);

      if (branch.length > 0 && branch[0].isHeadOffice) {
        throw new Error("Cannot delete head office branch");
      }

      // Instead of deleting, mark as inactive
      await this.db
        .update(branches)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(branches.id, id));

      console.log("✅ Branch marked as inactive");
    } catch (error) {
      console.error("❌ Error deleting branch:", error);
      throw error;
    }
  }

  async assignUserToBranch(userId: string, branchId: number): Promise<void> {
    try {
      await this.db
        .update(users)
        .set({ branchId, updatedAt: new Date() })
        .where(eq(users.id, userId));

      console.log(`✅ User ${userId} assigned to branch ${branchId}`);
    } catch (error) {
      console.error("❌ Error assigning user to branch:", error);
      throw error;
    }
  }

  async getUsersWithBranches(): Promise<any[]> {
    try {
      const result = await this.db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
          canAccessAllBranches: users.canAccessAllBranches,
          branchName: branches.name,
          branchCode: branches.branchCode,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(branches, eq(users.branchId, branches.id))
        .orderBy(users.createdAt);

      console.log(`✅ Found ${result.length} users with branch information`);
      return result;
    } catch (error) {
      console.error("❌ Error fetching users with branches:", error);
      return [];
    }
  }

  async updateSettings(settingsData: any): Promise<any> {
    try {
      console.log("💾 Updating settings with data:", Object.keys(settingsData));

      // Update or create each setting individually
      const updatePromises = [];
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== null && value !== undefined) {
          console.log(`Setting ${key} = ${value} (${typeof value})`);
          updatePromises.push(this.updateOrCreateSetting(key, String(value)));
        }
      }

      const results = await Promise.all(updatePromises);
      console.log(`✅ Successfully processed ${results.length} settings`);

      // Return all settings in the expected format
      const allSettings = await this.getSettings();
      const settingsObject: any = {};
      allSettings.forEach((setting: any) => {
        settingsObject[setting.key] = setting.value;
      });

      return {
        success: true,
        settings: settingsObject,
        message: "Settings updated successfully",
      };
    } catch (error) {
      console.error("❌ Error updating settings:", error);
      throw error;
    }
  }

  async updateOrCreateSetting(key: string, value: string): Promise<void> {
    try {
      console.log(`🔧 Processing setting: ${key} = ${value}`);

      // Check if setting exists
      const existingSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (existingSettings.length > 0) {
        // Update existing setting
        const result = await db
          .update(settings)
          .set({
            value: value,
            updatedAt: new Date(),
          })
          .where(eq(settings.key, key))
          .returning();
        console.log(
          `✅ Updated setting ${key}:`,
          result.length > 0 ? "success" : "failed",
        );
      } else {
        // Create new setting
        const result = await db
          .insert(settings)
          .values({
            key: key,
            value: value,
            type: "string",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        console.log(
          `✅ Created setting ${key}:`,
          result.length > 0 ? "success" : "failed",
        );
      }
    } catch (error) {
      console.error(`❌ Error processing setting ${key}:`, error);
      throw error;
    }
  }

  async getSetting(key: string): Promise<string | null> {
    try {
      const result = await this.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      return result.length > 0 ? result[0].value : null;
    } catch (error) {
      console.error(`❌ Error getting setting ${key}:`, error);
      return null;
    }
  }

  async saveCompanySettings(settings: any): Promise<void> {
    await this.updateSettings(settings);
  }

  async getDashboardStats(): Promise<any> {
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: "0",
      lowStockItems: 0,
    };
  }

  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    return {
      totalSales: "0",
      totalOrders: 0,
      averageOrderValue: "0",
      salesByDay: [],
    };
  }

  async getLoginAnalytics(startDate?: string, endDate?: string) {
    try {
      let query = this.db.select().from(loginLogs);

      if (startDate && endDate) {
        // Ensure dates are properly formatted as strings for the database
        const startDateStr =
          typeof startDate === "string"
            ? startDate
            : new Date(startDate).toISOString();
        const endDateStr =
          typeof endDate === "string"
            ? endDate
            : new Date(endDate).toISOString();

        query = query.where(
          and(
            gte(loginLogs.timestamp, startDateStr),
            lte(loginLogs.timestamp, endDateStr),
          ),
        );
      }

      const logs = await query;

      // Process logs for analytics
      const analytics = {
        totalLogins: logs.length,
        uniqueUsers: new Set(logs.map((log) => log.userId)).size,
        loginsByDay: this.groupLoginsByDay(logs),
        loginsByUser: this.groupLoginsByUser(logs),
        recentLogins: logs.slice(-10),
      };

      return analytics;
    } catch (error) {
      console.error("Error in getLoginAnalytics:", error);
      throw error;
    }
  }

  groupLoginsByDay(logs: any[]): any {
    const loginsByDay: any = {};

    logs.forEach((log) => {
      const date = log.timestamp.toISOString().split("T")[0];
      if (!loginsByDay[date]) {
        loginsByDay[date] = 0;
      }
      loginsByDay[date]++;
    });

    return Object.entries(loginsByDay).map(([date, count]) => ({
      date,
      count,
    }));
  }

  groupLoginsByUser(logs: any[]): any {
    const loginsByUser: any = {};

    logs.forEach((log) => {
      if (!loginsByUser[log.userId]) {
        loginsByUser[log.userId] = 0;
      }
      loginsByUser[log.userId]++;
    });

    return Object.entries(loginsByUser).map(([userId, count]) => ({
      userId,
      count,
    }));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await this.db.select().from(customers).orderBy(customers.name);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await this.db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer> {
    const [updatedCustomer] = await this.db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id));
  }

  // Party operations
  async getParties(): Promise<Party[]> {
    return await this.db.select().from(parties).orderBy(parties.name);
  }

  async createParty(party: InsertParty): Promise<Party> {
    const [newParty] = await this.db.insert(parties).values(party).returning();
    return newParty;
  }

  async updateParty(id: number, party: Partial<InsertParty>): Promise<Party> {
    const [updatedParty] = await this.db
      .update(parties)
      .set({ ...party, updatedAt: new Date() })
      .where(eq(parties.id, id))
      .returning();
    return updatedParty;
  }

  async deleteParty(id: number): Promise<void> {
    await this.db.delete(parties).where(eq(parties.id, id));
  }

  // Asset operations
  async getAssets(): Promise<Asset[]> {
    return await this.db.select().from(assets).orderBy(assets.name);
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await this.db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset> {
    const [updatedAsset] = await this.db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async getAssetById(id: number): Promise<Asset | undefined> {
    const result = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);
    return result[0];
  }

  async deleteAsset(id: number): Promise<void> {
    await this.db.delete(assets).where(eq(assets.id, id));
  }

  // Purchase operations
  async getPurchases(): Promise<any[]> {
    return await this.db
      .select({
        id: purchases.id,
        supplierName: purchases.supplierName,
        partyId: purchases.partyId,
        totalAmount: purchases.totalAmount,
        paymentMethod: purchases.paymentMethod,
        status: purchases.status,
        purchaseDate: purchases.purchaseDate,
        invoiceNumber: purchases.invoiceNumber,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .orderBy(desc(purchases.purchaseDate));
  }

  async getPurchasesWithItems(): Promise<any[]> {
    // Get all purchases with their associated items
    const purchaseList = await this.db
      .select({
        id: purchases.id,
        supplierName: purchases.supplierName,
        partyId: purchases.partyId,
        totalAmount: purchases.totalAmount,
        paymentMethod: purchases.paymentMethod,
        status: purchases.status,
        purchaseDate: purchases.purchaseDate,
        invoiceNumber: purchases.invoiceNumber,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .orderBy(desc(purchases.createdAt));

    // Get items for each purchase
    for (const purchase of purchaseList) {
      const items = await this.db
        .select({
          id: purchaseItems.id,
          inventoryItemId: purchaseItems.inventoryItemId,
          inventoryItemName: inventoryItems.name,
          quantity: purchaseItems.quantity,
          unitPrice: purchaseItems.unitPrice,
          totalPrice: purchaseItems.totalPrice,
        })
        .from(purchaseItems)
        .leftJoin(
          inventoryItems,
          eq(purchaseItems.inventoryItemId, inventoryItems.id),
        )
        .where(eq(purchaseItems.purchaseId, purchase.id));

      purchase.items = items;
    }

    return purchaseList;
  }

  async createPurchaseWithLedger(purchaseData: any): Promise<any> {
    try {
      const { items, ...purchase } = purchaseData;

      // Create purchase record
      const [newPurchase] = await this.db
        .insert(purchases)
        .values({
          supplierName: purchase.supplierName,
          partyId: purchase.partyId || null,
          totalAmount: purchase.totalAmount,
          paymentMethod: purchase.paymentMethod,
          status: purchase.status || "completed",
          invoiceNumber: purchase.invoiceNumber || null,
          notes: purchase.notes || null,
          createdBy: purchase.createdBy,
        })
        .returning();

      console.log("Purchase created with ID:", newPurchase.id);

      // Create purchase items and update inventory with weighted average
      if (items && items.length > 0) {
        for (const item of items) {
          // Create purchase item record
          const [purchaseItem] = await this.db
            .insert(purchaseItems)
            .values({
              purchaseId: newPurchase.id,
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              totalPrice: item.totalPrice.toString(),
            })
            .returning();

          console.log("Purchase item created:", purchaseItem);

          // Update inventory with weighted average cost calculation
          await this.updateInventoryWithWeightedAverage(
            item.inventoryItemId,
            parseFloat(item.quantity),
            parseFloat(item.unitPrice),
            new Date(),
          );
          // Update inventory specifically for purchase quantity tracking
          await this.updateInventoryPurchaseStock(
            item.inventoryItemId,
            parseFloat(item.quantity),
          );
        }
      }

      // Create ledger transaction if party is involved
      if (purchaseData.partyId) {
        await this.createLedgerTransaction({
          customerOrPartyId: purchaseData.partyId,
          entityType: "party",
          transactionDate: new Date(),
          description: `Purchase from ${purchaseData.supplierName}${purchaseData.invoiceNumber ? ` - Invoice: ${purchaseData.invoiceNumber}` : ""}`,
          referenceNumber:
            purchaseData.invoiceNumber || `PUR-${newPurchase.id}`,
          debitAmount: purchaseData.totalAmount,
          creditAmount: "0",
          transactionType: "purchase",
          relatedPurchaseId: newPurchase.id,
          paymentMethod: purchaseData.paymentMethod,
          notes: purchaseData.notes,
          createdBy: purchaseData.createdBy,
          runningBalance: "0", // Will be calculated by recalculateRunningBalance
        });

        // Recalculate running balance
        await this.recalculateRunningBalance(purchaseData.partyId, "party");
      }

      return newPurchase;
    } catch (error) {
      console.error("Error creating purchase with ledger:", error);
      throw error;
    }
  }

  async updatePurchase(id: number, purchaseData: any): Promise<any> {
    const [updatedPurchase] = await this.db
      .update(purchases)
      .set({ ...purchaseData, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning();
    return updatedPurchase;
  }

  async deletePurchase(id: number): Promise<void> {
    await this.db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
    await this.db.delete(purchases).where(eq(purchases.id, id));
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await this.db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await this.db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async updateExpense(
    id: number,
    expense: Partial<InsertExpense>,
  ): Promise<Expense> {
    const [updatedExpense] = await this.db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await this.db.delete(expenses).where(eq(expenses.id, id));
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const result = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return result[0];
  }

  async createOrder(orderData: any): Promise<Order> {
    try {
      console.log("💾 Creating order with items:", orderData);

      // Ensure required fields exist
      if (!orderData.customerName || !orderData.totalAmount) {
        throw new Error("Missing required order fields");
      }

      const newOrder = await db
        .insert(orders)
        .values({
          customerName: orderData.customerName,
          customerId: orderData.customerId,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          totalAmount: orderData.totalAmount.toString(),
          status: orderData.status || "pending",
          paymentMethod: orderData.paymentMethod || "cash",
          deliveryDate: orderData.deliveryDate
            ? new Date(orderData.deliveryDate)
            : null,
          notes: orderData.notes || null,
        })
        .returning();

      console.log("✅ Order created:", newOrder[0]);

      if (orderData.items && orderData.items.length > 0) {
        const orderItemsData = orderData.items.map((item: any) => ({
          orderId: newOrder[0].id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          unitId: item.unitId,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
        }));

        await db.insert(orderItems).values(orderItemsData);
        console.log("✅ Order items created");
      }

      // Trigger notification for new order
      console.log("📢 Triggering order notification...");
      await this.triggerBusinessNotification("order_created", {
        orderNumber: newOrder[0].id,
        customerName: newOrder[0].customerName,
        totalAmount: newOrder[0].totalAmount,
      });

      return newOrder[0];
    } catch (error) {
      console.error("❌ Error creating order:", error);
      throw error;
    }
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await this.db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<void> {
    await this.db.delete(orderItems).where(eq(orderItems.orderId, id));
    await this.db.delete(orders).where(eq(orders.id, id));
  }

  async getOrderItems(orderId: number) {
    try {
      const items = await this.db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: products.name,
          quantity: orderItems.quantity,
          unit: orderItems.unit,
          unitId: orderItems.unitId,
          unitName: units.name,
          unitAbbreviation: units.abbreviation,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          createdAt: orderItems.createdAt,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(units, eq(orderItems.unitId, units.id))
        .where(eq(orderItems.orderId, orderId))
        .orderBy(orderItems.createdAt);

      return items;
    } catch (error) {
      console.error("Error fetching order items:", error);
      throw error;
    }
  }

  async createOrderItem(data: any) {
    try {
      // Ensure unit data is properly handled
      const orderItemData = {
        orderId: data.orderId,
        productId: data.productId,
        quantity: data.quantity,
        unit: data.unit || null,
        unitId: data.unitId || null,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
      };

      const result = await this.db
        .insert(orderItems)
        .values(orderItemData)
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error creating order item:", error);
      throw error;
    }
  }

  async getRecentOrders(limit: number): Promise<any[]> {
    return await this.db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getTodayProductionSchedule(): Promise<any[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await this.db
        .select({
          id: productionSchedule.id,
          productName: products.name,
          quantity: productionSchedule.quantity,
          scheduledDate: productionSchedule.scheduledDate,
          status: productionSchedule.status,
        })
        .from(productionSchedule)
        .leftJoin(products, eq(productionSchedule.productId, products.id))
        .where(
          and(
            gte(productionSchedule.scheduledDate, today.toISOString()),
            lt(productionSchedule.scheduledDate, tomorrow.toISOString()),
            // Only include records with valid dates
            sql`${productionSchedule.scheduledDate} IS NOT NULL`,
          ),
        )
        .orderBy(productionSchedule.scheduledDate);
    } catch (error) {
      console.error("Error fetching today's production schedule:", error);
      return []; // Return empty array if there's an error
    }
  }

  async getProductionSchedule(): Promise<any[]> {
    try {
      const result = await this.db
        .select()
        .from(productionSchedule)
        .orderBy(desc(productionSchedule.createdAt));
      return result;
    } catch (error) {
      console.error("❌ Error getting production schedule:", error);
      return [];
    }
  }

  async createProductionScheduleItem(
    item: InsertProductionScheduleItem,
  ): Promise<ProductionScheduleItem> {
    const [newItem] = await this.db
      .insert(productionSchedule)
      .values(item)
      .returning();
    return newItem;
  }

  async updateProductionScheduleItem(
    id: number,
    item: Partial<InsertProductionScheduleItem>,
  ): Promise<ProductionScheduleItem> {
    const [updatedItem] = await this.db
      .update(productionSchedule)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(productionSchedule.id, id))
      .returning();
    return updatedItem;
  }

  async getProductionScheduleByDate(date: string): Promise<any[]> {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return await this.db
      .select({
        id: productionSchedule.id,
        productId: productionSchedule.productId,
        quantity: productionSchedule.quantity,
        scheduledDate: productionSchedule.scheduledDate,
        status: productionSchedule.status,
        notes: productionSchedule.notes,
        productName: products.name,
      })
      .from(productionSchedule)
      .leftJoin(products, eq(productionSchedule.productId, products.id))
      .where(
        and(
          gte(productionSchedule.scheduledDate, targetDate),
          lte(productionSchedule.scheduledDate, nextDay),
        ),
      )
      .orderBy(productionSchedule.scheduledDate);
  }

  async closeDayProductionSchedule(
    date: string,
    closedBy: string,
  ): Promise<any> {
    try {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get all production items for the specified date
      const itemsToClose = await this.db
        .select({
          id: productionSchedule.id,
          productId: productionSchedule.productId,
          productName: products.name,
          productCode: productionSchedule.productCode,
          batchNo: productionSchedule.batchNo,
          totalQuantity: productionSchedule.totalQuantity,
          unitType: productionSchedule.unitType,
          actualQuantityPackets: productionSchedule.actualQuantityPackets,
          priority: productionSchedule.priority,
          productionStartTime: productionSchedule.productionStartTime,
          productionEndTime: productionSchedule.productionEndTime,
          assignedTo: productionSchedule.assignedTo,
          notes: productionSchedule.notes,
          status: productionSchedule.status,
          scheduleDate: productionSchedule.scheduleDate,
          shift: productionSchedule.shift,
          plannedBy: productionSchedule.plannedBy,
          approvedBy: productionSchedule.approvedBy,
        })
        .from(productionSchedule)
        .leftJoin(products, eq(productionSchedule.productId, products.id))
        .where(
          and(
            gte(productionSchedule.scheduledDate, targetDate.toISOString()),
            lt(productionSchedule.scheduledDate, nextDay.toISOString()),
          ),
        );

      if (itemsToClose.length === 0) {
        return {
          message: "No production items found for the specified date",
          closedItems: [],
        };
      }

      // Insert items into history table
      const historyData: InsertProductionScheduleHistory[] = itemsToClose.map(
        (item) => ({
          originalScheduleId: item.id,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          batchNo: item.batchNo,
          totalQuantity: item.totalQuantity,
          unitType: item.unitType,
          actualQuantityPackets: item.actualQuantityPackets,
          priority: item.priority,
          productionStartTime: item.productionStartTime,
          productionEndTime: item.productionEndTime,
          assignedTo: item.assignedTo,
          notes: item.notes,
          status: item.status,
          scheduleDate: item.scheduleDate,
          shift: item.shift,
          plannedBy: item.plannedBy,
          approvedBy: item.approvedBy,
          closedBy: closedBy,
          closedAt: new Date(),
        }),
      );

      const insertedHistory = await this.db
        .insert(productionScheduleHistory)
        .values(historyData)
        .returning();

      // Delete items from current production schedule
      const itemIds = itemsToClose.map((item) => item.id);
      await this.db
        .delete(productionSchedule)
        .where(sql`${productionSchedule.id} = ANY(${itemIds})`);

      return {
        message: `${itemsToClose.length} production items closed and moved to history`,
        closedItems: insertedHistory,
      };
    } catch (error) {
      console.error("Error closing production day:", error);
      throw error;
    }
  }

  async getProductionScheduleHistory(date?: string): Promise<any[]> {
    try {
      let query = this.db
        .select()
        .from(productionScheduleHistory)
        .orderBy(desc(productionScheduleHistory.closedAt));

      if (date) {
        const targetDate = new Date(date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query = query.where(
          and(
            gte(productionScheduleHistory.scheduleDate, targetDate),
            lte(productionScheduleHistory.scheduleDate, nextDay),
          ),
        );
      }

      return await query;
    } catch (error) {
      console.error("Error fetching production schedule history:", error);
      throw error;
    }
  }

  // Media operations
  async getMediaItems(): Promise<any[]> {
    return [];
  }

  async uploadMedia(userId: string, file: any): Promise<any> {
    return {
      id: Date.now(),
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    };
  }

  async deleteMedia(id: number): Promise<void> {
    // Media deletion functionality
  }

  async getBills(): Promise<any[]> {
    return await this.getOrders();
  }

  async createBill(billData: any): Promise<any> {
    return await this.createOrder(billData);
  }

  async deleteBill(id: number): Promise<void> {
    await this.deleteOrder(id);
  }

  // Enhanced notification system
  async getNotifications(userId?: string): Promise<any[]>;
  async getNotifications(
    userId?: string,
    userBranchId?: number,
    canAccessAllBranches?: boolean,
  ): Promise<any[]> {
    try {
      // Return sample notifications for now - in production this would fetch from database
      const sampleNotifications = [
        {
          id: "1",
          type: "order",
          title: "New Order Received",
          description: "Order #1024 from John Doe - $125.50",
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          read: false,
          priority: "high",
          actionUrl: "/orders/1024",
          data: { orderId: 1024, customerName: "John Doe", amount: 125.5 },
        },
        {
          id: "2",
          type: "inventory",
          title: "Low Stock Alert",
          description: "Flour inventory is running low (5kg remaining)",
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          read: false,
          priority: "critical",
          actionUrl: "/inventory",
          data: { itemName: "Flour", currentStock: 5, minLevel: 10 },
        },
        {
          id: "3",
          type: "production",
          title: "Production Completed",
          description: "Chocolate cake batch #45 completed successfully",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
          priority: "medium",
          actionUrl: "/production",
          data: { batchId: 45, product: "Chocolate Cake" },
        },
        {
          id: "4",
          type: "shipping",
          title: "Delivery Dispatched",
          description: "Order #1020 dispatched via Express Delivery",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          read: true,
          priority: "medium",
          actionUrl: "/orders/1020",
          data: { orderId: 1020, carrier: "Express Delivery" },
        },
        {
          id: "5",
          type: "system",
          title: "System Maintenance",
          description: "Scheduled maintenance completed successfully",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
          priority: "low",
          actionUrl: "/settings",
          data: { maintenanceType: "Database optimization" },
        },
        {
          id: "6",
          type: "order",
          title: "Payment Received",
          description: "Payment of $89.75 received for Order #1018",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          read: false,
          priority: "medium",
          actionUrl: "/orders/1018",
          data: { orderId: 1018, amount: 89.75 },
        },
        {
          id: "7",
          type: "production",
          title: "Production Delay",
          description:
            "Vanilla cupcake batch delayed due to ingredient shortage",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
          priority: "high",
          actionUrl: "/production",
          data: { product: "Vanilla Cupcakes", reason: "Ingredient shortage" },
        },
      ];

      return sampleNotifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    // In production, this would update the database
    console.log(
      `Marking notification ${notificationId} as read for user ${userId}`,
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    // In production, this would update all unread notifications for the user
    console.log(`Marking all notifications as read for user ${userId}`);
  }

  async saveNotificationSubscription(
    userId: string,
    subscription: any,
  ): Promise<void> {
    // In production, this would save push notification subscription
    console.log(`Saving notification subscription for user ${userId}`);
  }

  async removeNotificationSubscription(userId: string): Promise<void> {
    // In production, this would remove push notification subscription
    console.log(`Removing notification subscription for user ${userId}`);
  }

  async saveNotificationSettings(userId: string, settings: any): Promise<void> {
    // In production, this would save notification preferences
    console.log(`Saving notification settings for user ${userId}:`, settings);
  }

  async createNotification(notification: any): Promise<any> {
    // In production, this would insert into notifications table
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };
    console.log("Creating notification:", newNotification);
    return newNotification;
  }

  async triggerBusinessNotification(event: string, data: any): Promise<void> {
    try {
      let notification;

      switch (event) {
        case "order_created":
          notification = {
            type: "order",
            title: "New Order Received",
            description: `Order #${data.orderNumber} from ${data.customerName} - $${data.totalAmount}`,
            priority: "high",
            actionUrl: `/orders/${data.orderNumber}`,
            data,
          };
          break;

        case "low_stock":
          notification = {
            type: "inventory",
            title: "Low Stock Alert",
            description: `${data.itemName} is running low (${data.currentStock}${data.unit} remaining)`,
            priority:
              data.currentStock <= data.criticalLevel ? "critical" : "high",
            actionUrl: "/inventory",
            data,
          };
          break;

        case "production_completed":
          notification = {
            type: "production",
            title: "Production Completed",
            description: `${data.productName} batch #${data.batchId} completed successfully`,
            priority: "medium",
            actionUrl: "/production",
            data,
          };
          break;

        case "production_delayed":
          notification = {
            type: "production",
            title: "Production Delay",
            description: `${data.productName} batch delayed: ${data.reason}`,
            priority: "high",
            actionUrl: "/production",
            data,
          };
          break;

        case "shipment_dispatched":
          notification = {
            type: "shipping",
            title: "Shipment Dispatched",
            description: `Order #${data.orderNumber} dispatched via ${data.carrier}`,
            priority: "medium",
            actionUrl: `/orders/${data.orderNumber}`,
            data,
          };
          break;

        case "delivery_failed":
          notification = {
            type: "shipping",
            title: "Delivery Failed",
            description: `Failed to deliver Order #${data.orderNumber}: ${data.reason}`,
            priority: "high",
            actionUrl: `/orders/${data.orderNumber}`,
            data,
          };
          break;

        case "payment_received":
          notification = {
            type: "order",
            title: "Payment Received",
            description: `Payment of $${data.amount} received for Order #${data.orderNumber}`,
            priority: "medium",
            actionUrl: `/orders/${data.orderNumber}`,
            data,
          };
          break;

        case "system_alert":
          notification = {
            type: "system",
            title: data.title || "System Alert",
            description: data.description,
            priority: data.priority || "medium",
            actionUrl: data.actionUrl || "/settings",
            data,
          };
          break;

        default:
          console.warn(`Unknown notification event: ${event}`);
          return;
      }

      // In production, broadcast to all relevant users based on their roles
      const adminUsers = await this.getAllUsers(); // Fetch all users, including superadmin
      const relevantUsers = adminUsers.filter((user) =>
        ["admin", "manager", "supervisor"].includes(user.role),
      );

      for (const user of relevantUsers) {
        await this.createNotification({
          userId: user.id,
          ...notification,
        });
      }

      console.log(
        `Triggered ${event} notification for ${relevantUsers.length} users`,
      );
    } catch (error) {
      console.error("Error triggering business notification:", error);
    }
  }

  // Staff management operations
  async getStaff(): Promise<Staff[]> {
    return await this.db
      .select()
      .from(staff)
      .orderBy(staff.firstName, staff.lastName);
  }

  async getStaffById(id: number): Promise<Staff | undefined> {
    const result = await this.db
      .select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);
    return result[0];
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await this.db
      .insert(staff)
      .values(staffData)
      .returning();
    return newStaff;
  }

  async updateStaff(
    id: number,
    staffData: Partial<InsertStaff>,
  ): Promise<Staff> {
    const [updatedStaff] = await this.db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(id: number): Promise<void> {
    await this.db.delete(staff).where(eq(staff.id, id));
  }

  async getStaffByStaffId(staffId: string): Promise<Staff | null> {
    const result = await this.db
      .select()
      .from(staff)
      .where(eq(staff.staffId, staffId))
      .limit(1);
    return result[0] || null;
  }

  // Attendance operations
  async getAttendance(
    staffId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    let query = this.db
      .select({
        id: attendance.id,
        staffId: attendance.staffId,
        date: attendance.date,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        breakStart: attendance.breakStart,
        breakEnd: attendance.breakEnd,
        totalHours: attendance.totalHours,
        overtimeHours: attendance.overtimeHours,
        status: attendance.status,
        notes: attendance.notes,
        approvedBy: attendance.approvedBy,
        createdAt: attendance.createdAt,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        staffPosition: staff.position,
      })
      .from(attendance)
      .leftJoin(staff, eq(attendance.staffId, staff.id))
      .orderBy(desc(attendance.date));

    const conditions = [];
    if (staffId) {
      conditions.push(eq(attendance.staffId, staffId));
    }
    if (startDate) {
      conditions.push(gte(attendance.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(attendance.date, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async createAttendance(
    attendanceData: InsertAttendance,
  ): Promise<Attendance> {
    const [newAttendance] = await this.db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    return newAttendance;
  }

  async updateAttendance(
    id: number,
    attendanceData: Partial<InsertAttendance>,
  ): Promise<Attendance> {
    const [updatedAttendance] = await this.db
      .update(attendance)
      .set({ ...attendanceData, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<void> {
    await this.db.delete(attendance).where(eq(attendance.id, id));
  }

  async clockIn(staffId: number): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existing = await this.db
      .select()
      .from(attendance)
      .where(and(eq(attendance.staffId, staffId), gte(attendance.date, today)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Already clocked in today");
    }

    const [newAttendance] = await this.db
      .insert(attendance)
      .values({
        staffId,
        date: new Date(),
        clockIn: new Date(),
        status: "present",
      })
      .returning();

    return newAttendance;
  }

  async clockOut(staffId: number): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.db
      .select()
      .from(attendance)
      .where(and(eq(attendance.staffId, staffId), gte(attendance.date, today)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("No clock-in record found for today");
    }

    const clockOutTime = new Date();
    const clockInTime = existing[0].clockIn;
    let totalHours = 0;

    if (clockInTime) {
      totalHours =
        (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    }

    const [updatedAttendance] = await this.db
      .update(attendance)
      .set({
        clockOut: clockOutTime,
        totalHours: totalHours.toString(),
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, existing[0].id))
      .returning();

    return updatedAttendance;
  }

  // Salary operations
  async getSalaryPayments(staffId?: number): Promise<any[]> {
    let query = this.db
      .select({
        id: salaryPayments.id,
        staffId: salaryPayments.staffId,
        payPeriodStart: salaryPayments.payPeriodStart,
        payPeriodEnd: salaryPayments.payPeriodEnd,
        basicSalary: salaryPayments.basicSalary,
        overtimePay: salaryPayments.overtimePay,
        bonus: salaryPayments.bonus,
        allowances: salaryPayments.allowances,
        deductions: salaryPayments.deductions,
        tax: salaryPayments.tax,
        netPay: salaryPayments.netPay,
        paymentDate: salaryPayments.paymentDate,
        paymentMethod: salaryPayments.paymentMethod,
        status: salaryPayments.status,
        notes: salaryPayments.notes,
        processedBy: salaryPayments.processedBy,
        createdAt: salaryPayments.createdAt,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        staffPosition: staff.position,
      })
      .from(salaryPayments)
      .leftJoin(staff, eq(salaryPayments.staffId, staff.id))
      .orderBy(desc(salaryPayments.payPeriodEnd));

    if (staffId) {
      query = query.where(eq(salaryPayments.staffId, staffId));
    }

    return await query;
  }

  async createSalaryPayment(
    paymentData: InsertSalaryPayment,
  ): Promise<SalaryPayment> {
    const [newPayment] = await this.db
      .insert(salaryPayments)
      .values(paymentData)
      .returning();
    return newPayment;
  }

  async updateSalaryPayment(
    id: number,
    paymentData: Partial<InsertSalaryPayment>,
  ): Promise<SalaryPayment> {
    const [updatedPayment] = await this.db
      .update(salaryPayments)
      .set({ ...paymentData, updatedAt: new Date() })
      .where(eq(salaryPayments.id, id))
      .returning();
    return updatedPayment;
  }

  async deleteSalaryPayment(id: number): Promise<void> {
    await this.db.delete(salaryPayments).where(eq(salaryPayments.id, id));
  }

  // Leave request operations
  async getLeaveRequests(staffId?: number): Promise<any[]> {
    let query = this.db
      .select({
        id: leaveRequests.id,
        staffId: leaveRequests.staffId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        appliedDate: leaveRequests.appliedDate,
        reviewedBy: leaveRequests.reviewedBy,
        reviewedDate: leaveRequests.reviewedDate,
        reviewComments: leaveRequests.reviewComments,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        staffPosition: staff.position,
      })
      .from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .orderBy(desc(leaveRequests.appliedDate));

    if (staffId) {
      query = query.where(eq(leaveRequests.staffId, staffId));
    }

    return await query;
  }

  async createLeaveRequest(
    requestData: InsertLeaveRequest,
  ): Promise<LeaveRequest> {
    const [newRequest] = await this.db
      .insert(leaveRequests)
      .values(requestData)
      .returning();
    return newRequest;
  }

  async updateLeaveRequest(
    id: number,
    requestData: Partial<InsertLeaveRequest>,
  ): Promise<LeaveRequest> {
    const [updatedRequest] = await this.db
      .update(leaveRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    await this.db.delete(leaveRequests).where(eq(leaveRequests.id, id));
  }

  // Staff schedule operations
  async getStaffSchedules(staffId?: number, date?: Date): Promise<any[]> {
    let query = this.db
      .select({
        id: staffSchedules.id,
        staffId: staffSchedules.staffId,
        date: staffSchedules.date,
        shiftStart: staffSchedules.shiftStart,
        shiftEnd: staffSchedules.shiftEnd,
        position: staffSchedules.position,
        department: staffSchedules.department,
        isRecurring: staffSchedules.isRecurring,
        recurringPattern: staffSchedules.recurringPattern,
        notes: staffSchedules.notes,
        createdBy: staffSchedules.createdBy,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        staffPosition: staff.position,
      })
      .from(staffSchedules)
      .leftJoin(staff, eq(staffSchedules.staffId, staff.id))
      .orderBy(staffSchedules.date);

    const conditions = [];
    if (staffId) {
      conditions.push(eq(staffSchedules.staffId, staffId));
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(
        and(
          gte(staffSchedules.date, startOfDay),
          lte(staffSchedules.date, endOfDay),
        ),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async createStaffSchedule(
    scheduleData: InsertStaffSchedule,
  ): Promise<StaffSchedule> {
    const [newSchedule] = await this.db
      .insert(staffSchedules)
      .values(scheduleData)
      .returning();
    return newSchedule;
  }

  async updateStaffSchedule(
    id: number,
    scheduleData: Partial<InsertStaffSchedule>,
  ): Promise<StaffSchedule> {
    const [updatedSchedule] = await this.db
      .update(staffSchedules)
      .set({ ...scheduleData, updatedAt: new Date() })
      .where(eq(staffSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteStaffSchedule(id: number): Promise<void> {
    await this.db.delete(staffSchedules).where(eq(staffSchedules.id, id));
  }
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    try {
      // Ensure all required fields are present
      const auditLogData = {
        ...log,
        timestamp: new Date(),
        status: log.status || "success",
        userId: log.userId || "system",
        userEmail: log.userEmail || "system@bakesewa.com",
        userName: log.userName || "System",
        ipAddress: log.ipAddress || "127.0.0.1",
      };

      const [auditLog] = await this.db
        .insert(auditLogs)
        .values(auditLogData)
        .returning();
      return auditLog;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Still try to log the error to console for debugging
      console.error("Audit log data:", log);
      throw error;
    }
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    try {
      let query = this.db.select().from(auditLogs);

      if (filters) {
        const conditions = [];

        if (filters.userId) {
          conditions.push(eq(auditLogs.userId, filters.userId));
        }

        if (filters.action) {
          conditions.push(eq(auditLogs.action, filters.action));
        }

        if (filters.resource) {
          conditions.push(eq(auditLogs.resource, filters.resource));
        }

        if (filters.startDate) {
          conditions.push(
            sql`${auditLogs.timestamp} >= ${filters.startDate.toISOString()}`,
          );
        }

        if (filters.endDate) {
          conditions.push(
            sql`${auditLogs.timestamp} <= ${filters.endDate.toISOString()}`,
          );
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        if (filters.offset) {
          query = query.offset(filters.offset);
        }

        if (filters.limit) {
          query = query.limit(filters.limit);
        } else {
          query = query.limit(1000);
        }
      } else {
        query = query.limit(1000);
      }

      return await query.orderBy(desc(auditLogs.timestamp));
    } catch (error) {
      console.error("Failed to get audit logs:", error);
      return [];
    }
  }

  async logLogin(
    userId: string,
    userEmail: string,
    userName: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      // Log to login_logs table
      await this.db.insert(loginLogs).values({
        userId,
        email: userEmail,
        ipAddress,
        userAgent,
        status: success ? "success" : "failed",
        location: "Unknown", // You can enhance this with IP geolocation
        deviceType: userAgent?.includes("Mobile") ? "mobile" : "desktop",
      });

      // Also log to audit_logs for comprehensive tracking
      await this.createAuditLog({
        userId,
        userEmail,
        userName,
        action: "LOGIN",
        resource: "authentication",
        details: {
          userAgent,
          success,
          errorMessage,
        },
        ipAddress,
        userAgent,
        status: success ? "success" : "failed",
        errorMessage: success ? null : errorMessage,
      });
    } catch (error) {
      console.error("Failed to log login event:", error);
    }
  }

  async logLogout(
    userId: string,
    userEmail: string,
    userName: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const logData = {
        userId: userId,
        userEmail: userEmail,
        userName: userName,
        action: "LOGOUT",
        resource: "auth",
        resourceId: userId,
        details: { logoutTime: new Date().toISOString() },
        ipAddress: ipAddress,
        userAgent: "System",
        timestamp: new Date(),
        status: "success",
      };

      await this.createAuditLog(logData);
    } catch (error) {
      console.error("Failed to log logout:", error);
    }
  }

  // Security monitoring methods
  async getSecurityMetrics(
    timeframe: "hour" | "day" | "week" = "day",
  ): Promise<any> {
    try {
      const now = new Date();
      let startTime: Date;

      switch (timeframe) {
        case "hour":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "week":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const [failedLogins, suspiciousActivities, totalActivities] =
        await Promise.all([
          this.db
            .select({ count: count() })
            .from(loginLogs)
            .where(
              and(
                eq(loginLogs.status, "failed"),
                gte(loginLogs.timestamp, startTime),
              ),
            ),

          this.db
            .select({ count: count() })
            .from(auditLogs)
            .where(
              and(
                eq(auditLogs.status, "failed"),
                gte(auditLogs.timestamp, startTime),
              ),
            ),

          this.db
            .select({ count: count() })
            .from(auditLogs)
            .where(gte(auditLogs.timestamp, startTime)),
        ]);

      return {
        failedLogins: failedLogins[0]?.count || 0,
        suspiciousActivities: suspiciousActivities[0]?.count || 0,
        totalActivities: totalActivities[0]?.count || 0,
        timeframe,
        period: { start: startTime, end: now },
      };
    } catch (error) {
      console.error("❌ Failed to get security metrics:", error);
      return {
        failedLogins: 0,
        suspiciousActivities: 0,
        totalActivities: 0,
        timeframe,
        error: error.message,
      };
    }
  }

  // Production Schedule Labels operations
  async getProductionScheduleLabels(): Promise<ProductionScheduleLabel[]> {
    try {
      return await this.db
        .select()
        .from(productionScheduleLabels)
        .orderBy(desc(productionScheduleLabels.createdAt));
    } catch (error) {
      console.error("Error fetching production schedule labels:", error);
      throw error;
    }
  }

  async createProductionScheduleLabel(
    data: InsertProductionScheduleLabel,
  ): Promise<ProductionScheduleLabel> {
    try {
      const [newLabel] = await this.db
        .insert(productionScheduleLabels)
        .values(data)
        .returning();
      return newLabel;
    } catch (error) {
      console.error("Error creating production schedule label:", error);
      throw error;
    }
  }

  async updateProductionScheduleLabel(
    id: number,
    data: Partial<InsertProductionScheduleLabel>,
  ): Promise<ProductionScheduleLabel> {
    try {
      const [updatedLabel] = await this.db
        .update(productionScheduleLabels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(productionScheduleLabels.id, id))
        .returning();
      return updatedLabel;
    } catch (error) {
      console.error("Error updating production schedule label:", error);
      throw error;
    }
  }

  async closeDayForLabels(ids: number[], closedBy: string): Promise<any> {
    try {
      const result = await this.db
        .update(productionScheduleLabels)
        .set({
          isDraft: false,
          dayClosed: true,
          dayClosedAt: new Date(),
          dayClosedBy: closedBy,
          updatedAt: new Date(),
        })
        .where(sql`${productionScheduleLabels.id} = ANY(${ids})`)
        .returning();

      return {
        message: `${result.length} labels closed successfully`,
        closedLabels: result,
      };
    } catch (error) {
      console.error("Error closing day for labels:", error);
      throw error;
    }
  }

  // Supplier Ledger operations
  async getSupplierLedgers(): Promise<any[]> {
    try {
      console.log("📊 Fetching supplier ledgers...");

      // Get all suppliers with their purchase data
      const suppliersWithPurchases = await this.db
        .select({
          supplierId: parties.id,
          supplierName: parties.name,
          currentBalance: parties.currentBalance,
          purchaseId: purchases.id,
          purchaseDate: purchases.purchaseDate,
          invoiceNumber: purchases.invoiceNumber,
          totalAmount: purchases.totalAmount,
          paymentMethod: purchases.paymentMethod,
          status: purchases.status,
          createdAt: purchases.createdAt,
        })
        .from(parties)
        .leftJoin(purchases, eq(parties.id, purchases.partyId))
        .where(eq(parties.type, "supplier"))
        .orderBy(parties.name, desc(purchases.purchaseDate));

      // Group by supplier and calculate balances
      const ledgerMap = new Map();

      for (const row of suppliersWithPurchases) {
        if (!ledgerMap.has(row.supplierId)) {
          ledgerMap.set(row.supplierId, {
            supplierId: row.supplierId,
            supplierName: row.supplierName,
            currentBalance: parseFloat(row.currentBalance || "0"),
            totalPurchases: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            transactions: [],
          });
        }

        const ledger = ledgerMap.get(row.supplierId);

        if (row.purchaseId) {
          const totalAmount = parseFloat(row.totalAmount || "0");
          const amountPaid = row.status === "completed" ? totalAmount : 0;
          const outstanding = totalAmount - amountPaid;

          // Get purchase items
          const purchaseItems = await this.db
            .select({
              inventoryItemName: inventoryItems.name,
              quantity: purchaseItems.quantity,
            })
            .from(purchaseItems)
            .leftJoin(
              inventoryItems,
              eq(purchaseItems.inventoryItemId, inventoryItems.id),
            )
            .where(eq(purchaseItems.purchaseId, row.purchaseId));

          const itemsDescription =
            purchaseItems.length > 0
              ? purchaseItems
                  .map((item) => `${item.inventoryItemName} (${item.quantity})`)
                  .join(", ")
              : "N/A";

          ledger.transactions.push({
            id: row.purchaseId,
            date: row.purchaseDate || row.createdAt,
            invoiceNumber: row.invoiceNumber,
            items: itemsDescription,
            totalAmount,
            amountPaid,
            outstanding,
            paymentStatus:
              row.status === "completed"
                ? "Paid"
                : outstanding > 0
                  ? amountPaid > 0
                    ? "Partial"
                    : "Due"
                  : "Paid",
            paymentMethod: row.paymentMethod,
            transactionType: "Purchase",
          });

          ledger.totalPurchases += totalAmount;
          ledger.totalPaid += amountPaid;
          ledger.totalOutstanding += outstanding;
        }
      }

      // Calculate running balances for each supplier
      const ledgers = Array.from(ledgerMap.values());
      ledgers.forEach((ledger) => {
        let runningBalance = 0;

        // Sort transactions by date
        ledger.transactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Calculate running balance
        ledger.transactions.forEach((transaction) => {
          if (transaction.transactionType === "Purchase") {
            runningBalance += transaction.outstanding; // Debit increases payable
          }
          transaction.runningBalance = runningBalance;
        });

        ledger.currentBalance = runningBalance;
      });

      return ledgers.filter((ledger) => ledger.transactions.length > 0);
    } catch (error) {
      console.error("❌ Error fetching supplier ledgers:", error);
      return [];
    }
  }

  async getSupplierLedger(supplierId: number): Promise<any> {
    try {
      const allLedgers = await this.getSupplierLedgers();
      return (
        allLedgers.find((ledger) => ledger.supplierId === supplierId) || null
      );
    } catch (error) {
      console.error("❌ Error fetching supplier ledger:", error);
      return null;
    }
  }

  async updateSupplierLedger(
    supplierId: number,
    purchaseData: any,
  ): Promise<void> {
    try {
      // This method is called when a purchase is made
      // Update the supplier's current balance
      const currentBalance = await this.calculateSupplierBalance(supplierId);

      await this.db
        .update(parties)
        .set({
          currentBalance: currentBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(parties.id, supplierId));

      console.log(
        `✅ Updated supplier ${supplierId} balance to ${currentBalance}`,
      );
    } catch (error) {
      console.error("❌ Error updating supplier ledger:", error);
      throw error;
    }
  }

  async calculateSupplierBalance(supplierId: number): Promise<number> {
    try {
      // Calculate total purchases
      const purchasesResult = await this.db
        .select({
          totalPurchases: sql<number>`COALESCE(SUM(${purchases.totalAmount}), 0)`,
        })
        .from(purchases)
        .where(eq(purchases.partyId, supplierId));

      const totalPurchases = purchasesResult[0]?.totalPurchases || 0;

      // Calculate total payments (for now, we assume completed purchases are paid)
      const paymentsResult = await this.db
        .select({
          totalPayments: sql<number>`COALESCE(SUM(${purchases.totalAmount}), 0)`,
        })
        .from(purchases)
        .where(
          and(
            eq(purchases.partyId, supplierId),
            eq(purchases.status, "completed"),
          ),
        );

      const totalPayments = paymentsResult[0]?.totalPayments || 0;

      // Balance = Total Purchases - Total Payments (positive = amount owed, negative = advance paid)
      return totalPurchases - totalPayments;
    } catch (error) {
      console.error("❌ Error calculating supplier balance:", error);
      return 0;
    }
  }

  // Sales methods
  async getSales(): Promise<any[]> {
    try {
      const result = await this.db.query.sales.findMany({
        with: {
          items: {
            with: {
              product: true,
            },
          },
          customer: true,
        },
        orderBy: desc(sales.createdAt),
      });

      return result.map((sale) => ({
        ...sale,
        items:
          sale.items?.map((item) => ({
            ...item,
            productName: item.product?.name || "Unknown Product",
          })) || [],
      }));
    } catch (error) {
      console.error("❌ Error getting sales:", error);

      // Fallback query without relations
      try {
        const salesData = await this.db
          .select()
          .from(sales)
          .orderBy(desc(sales.createdAt));

        // Get items for each sale
        const salesWithItems = await Promise.all(
          salesData.map(async (sale) => {
            try {
              const items = await this.db
                .select()
                .from(saleItems)
                .where(eq(saleItems.saleId, sale.id));

              // Get product names for items
              const itemsWithProducts = await Promise.all(
                items.map(async (item) => {
                  try {
                    const product = await this.db
                      .select()
                      .from(products)
                      .where(eq(products.id, item.productId))
                      .limit(1);

                    return {
                      ...item,
                      productName: product[0]?.name || "Unknown Product",
                    };
                  } catch (err) {
                    return {
                      ...item,
                      productName: "Unknown Product",
                    };
                  }
                }),
              );

              return {
                ...sale,
                items: itemsWithProducts,
              };
            } catch (err) {
              return {
                ...sale,
                items: [],
              };
            }
          }),
        );

        return salesWithItems;
      } catch (fallbackError) {
        console.error("❌ Fallback sales query failed:", fallbackError);
        return [];
      }
    }
  }

  async createSaleWithTransaction(saleData: any): Promise<any> {
    try {
      // Start a transaction
      return await this.db.transaction(async (tx) => {
        // 1. Create or find customer
        let customerId = saleData.customerId;
        if (!customerId && saleData.customerName) {
          // Try to find existing customer
          const existingCustomer = await tx
            .select()
            .from(customers)
            .where(eq(customers.name, saleData.customerName))
            .limit(1);

          if (existingCustomer.length > 0) {
            customerId = existingCustomer[0].id;
          } else {
            // Create new customer
            const newCustomer = await tx
              .insert(customers)
              .values({
                name: saleData.customerName,
                email: saleData.customerEmail || null,
                phone: saleData.customerPhone || null,
                currentBalance: "0",
                totalOrders: 0,
                totalSpent: "0",
              })
              .returning();
            customerId = newCustomer[0].id;
          }
        }

        // 2. Create the sale
        const newSale = await tx
          .insert(sales)
          .values({
            customerName: saleData.customerName,
            customerId: customerId,
            customerEmail: saleData.customerEmail,
            customerPhone: saleData.customerPhone,
            totalAmount: saleData.totalAmount,
            paymentMethod: saleData.paymentMethod,
            status: saleData.status || "completed",
            saleDate: new Date(),
            notes: saleData.notes,
          })
          .returning();

        const sale = newSale[0];

        // 3. Create sale items
        if (saleData.items && saleData.items.length > 0) {
          await tx.insert(saleItems).values(
            saleData.items.map((item: any) => ({
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          );
        }

        // 4. Record customer ledger transaction (Debit - Customer owes money or paid)
        if (customerId) {
          // Get current balance
          const customer = await tx
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);

          const currentBalance = parseFloat(customer[0]?.currentBalance || "0");
          const saleAmount = parseFloat(saleData.totalAmount);

          // For completed sales, customer has paid (Credit to clear any previous debt)
          // For pending sales, customer owes money (Debit)
          const isCompleted = saleData.status === "completed";
          const debitAmount = isCompleted ? "0" : saleData.totalAmount;
          const creditAmount = isCompleted ? saleData.totalAmount : "0";

          // Calculate running balance
          const balanceChange = isCompleted ? -saleAmount : saleAmount;
          const runningBalance = currentBalance + balanceChange;

          // Create ledger transaction
          await tx.insert(ledgerTransactions).values({
            customerOrPartyId: customerId,
            entityType: "customer",
            transactionDate: new Date(),
            description: `Sale - INV-${sale.id}`,
            referenceNumber: `INV-${sale.id}`,
            debitAmount: debitAmount,
            creditAmount: creditAmount,
            runningBalance: runningBalance.toString(),
            transactionType: "sale",
            relatedOrderId: null,
            relatedPurchaseId: null,
            paymentMethod: saleData.paymentMethod,
            notes: saleData.notes,
            createdBy: saleData.createdBy || "system",
          });

          // Update customer balance and totals
          await tx
            .update(customers)
            .set({
              currentBalance: runningBalance.toString(),
              totalOrders: customer[0].totalOrders + 1,
              totalSpent: (
                parseFloat(customer[0].totalSpent || "0") + saleAmount
              ).toString(),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customerId));
        }

        console.log("✅ Sale created with customer transaction successfully");
        return sale;
      });
    } catch (error) {
      console.error("❌ Error creating sale with transaction:", error);
      throw error;
    }
  }

  // Branch Management methods
  async getBranches(): Promise<Branch[]> {
    try {
      const result = await this.db
        .select()
        .from(branches)
        .where(eq(branches.isActive, true))
        .orderBy(asc(branches.name));

      console.log(`✅ Found ${result.length} active branches`);
      return result;
    } catch (error) {
      console.error("❌ Error fetching branches:", error);
      throw error;
    }
  }

  async createBranch(branchData: InsertBranch): Promise<Branch> {
    try {
      const [newBranch] = await this.db
        .insert(branches)
        .values({
          ...branchData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`✅ Created branch: ${newBranch.name}`);
      return newBranch;
    } catch (error) {
      console.error("❌ Error creating branch:", error);
      throw error;
    }
  }

  async updateBranch(
    id: number,
    branchData: Partial<InsertBranch>,
  ): Promise<Branch> {
    try {
      const [updatedBranch] = await this.db
        .update(branches)
        .set({
          ...branchData,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, id))
        .returning();

      if (!updatedBranch) {
        throw new Error("Branch not found");
      }

      console.log(`✅ Updated branch: ${updatedBranch.name}`);
      return updatedBranch;
    } catch (error) {
      console.error("❌ Error updating branch:", error);
      throw error;
    }
  }

  async deleteBranch(id: number): Promise<void> {
    try {
      // Soft delete: Deactivate the branch
      await this.db
        .update(branches)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(branches.id, id));

      console.log(`✅ Deactivated branch ID: ${id}`);
    } catch (error) {
      console.error("❌ Error deleting branch:", error);
      throw error;
    }
  }

  async assignUserToBranch(userId: string, branchId: number): Promise<void> {
    try {
      await this.db
        .update(users)
        .set({ branchId, updatedAt: new Date() })
        .where(eq(users.id, userId));

      console.log(`✅ Assigned user ${userId} to branch ${branchId}`);
    } catch (error) {
      console.error("❌ Error assigning user to branch:", error);
      throw error;
    }
  }

  async getUsersWithBranches(): Promise<any[]> {
    try {
      const result = await this.db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          branchId: users.branchId,
          canAccessAllBranches: users.canAccessAllBranches,
          branchName: branches.name,
          branchCode: branches.branchCode,
        })
        .from(users)
        .leftJoin(branches, eq(users.branchId, branches.id))
        .orderBy(users.firstName);

      console.log(`✅ Found ${result.length} users with branch info`);
      return result;
    } catch (error) {
      console.error("❌ Error fetching users with branches:", error);
      throw error;
    }
  }
}

export const storage = new Storage();
