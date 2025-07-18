import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  categories,
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
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
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
} from "../../shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<void>;
  ensureDefaultAdmin(): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    category: Partial<InsertCategory>,
  ): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Product operations
  getProducts(): Promise<Product[]>;
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
  createUnit(data: InsertUnit): Promise<Unit>;
  updateUnit(id: number, data: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: number): Promise<void>;

  // Unit conversion operations
  getUnitConversions(): Promise<any[]>;
  createUnitConversion(data: any): Promise<any>;
  updateUnitConversion(id: number, data: any): Promise<any>;
  deleteUnitConversion(id: number): Promise<void>;

  // Inventory operations
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(data: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(
    id: number,
    data: Partial<InsertInventoryItem>,
  ): Promise<InventoryItem>;
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
  getLowStockItems(): Promise<InventoryItem[]>;

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

  // Analytics operations
  getDashboardStats(): Promise<any>;
  getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<any>;
  getLoginAnalytics(startDate?: string, endDate?: string): Promise<any>;

  // Staff management operations
  getStaff(): Promise<Staff[]>;
  getStaffById(id: number): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: number): Promise<void>;

  // Attendance operations
  getAttendance(staffId?: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance>;
  deleteAttendance(id: number): Promise<void>;
  clockIn(staffId: number): Promise<Attendance>;
  clockOut(staffId: number): Promise<Attendance>;

  // Salary operations
  getSalaryPayments(staffId?: number): Promise<any[]>;
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  updateSalaryPayment(id: number, payment: Partial<InsertSalaryPayment>): Promise<SalaryPayment>;
  deleteSalaryPayment(id: number): Promise<void>;

  // Leave request operations
  getLeaveRequests(staffId?: number): Promise<any[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest>;
  deleteLeaveRequest(id: number): Promise<void>;

  // Staff schedule operations
  getStaffSchedules(staffId?: number, date?: Date): Promise<any[]>;
  createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule>;
  updateStaffSchedule(id: number, schedule: Partial<InsertStaffSchedule>): Promise<StaffSchedule>;
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
  createParty(party: InsertParty): Promise<Party>;
  updateParty(id: number, party: Partial<InsertParty>): Promise<Party>;
  deleteParty(id: number): Promise<void>;

  // Ledger Transaction Methods
  createLedgerTransaction(data: any): Promise<any>;
  getLedgerTransactions(
    entityId: number,
    entityType: "customer" | "party",
  ): Promise<any[]>;
  updateLedgerTransaction(id: number, data: any): Promise<any>;
  deleteLedgerTransaction(id: number): Promise<void>;
  recalculateRunningBalance(
    entityId: number,
    entityType: "customer" | "party",
  ): Promise<number>;

  // Asset operations
  getAssets(): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;
}

export class Storage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db
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
    const { email, password, firstName, lastName, profileImageUrl, role } =
      userData;

    const existingUser = await this.getUserByEmail(email);

    if (existingUser) {
      const updateData: any = { firstName, lastName, profileImageUrl, role };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const [updatedUser] = await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();

      return updatedUser;
    } else {
      const hashedPassword = password
        ? await bcrypt.hash(password, 10)
        : undefined;
      const [newUser] = await db
        .insert(users)
        .values({
          id: `${role}_${Date.now()}`,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          profileImageUrl,
          role: role || "staff",
        })
        .returning();

      return newUser;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: any): Promise<any> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async ensureDefaultAdmin(): Promise<void> {
    const superAdminEmail = "superadmin@sweetreats.com";
    const adminEmail = "admin@sweetreats.com";
    const managerEmail = "manager@sweetreats.com";
    const staffEmail = "staff@sweetreats.com";

    // Create superadmin user
    const existingSuperAdmin = await this.getUserByEmail(superAdminEmail);
    if (!existingSuperAdmin) {
      await this.upsertUser({
        email: superAdminEmail,
        password: "superadmin123",
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      });
      console.log("✅ Default superadmin user created");
    } else {
      console.log("✅ superadmin user already exists:", superAdminEmail);
    }

    const existingAdmin = await this.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      await this.upsertUser({
        email: adminEmail,
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      });
      console.log("✅ Default admin user created");
    } else {
      console.log("✅ admin user already exists:", adminEmail);
    }

    const existingManager = await this.getUserByEmail(managerEmail);
    if (!existingManager) {
      await this.upsertUser({
        email: managerEmail,
        password: "manager123",
        firstName: "Manager",
        lastName: "User",
        role: "manager",
      });
      console.log("✅ Default manager user created");
    } else {
      console.log("✅ manager user already exists:", managerEmail);
    }

    const existingStaff = await this.getUserByEmail(staffEmail);
    if (!existingStaff) {
      await this.upsertUser({
        email: staffEmail,
        password: "staff123",
        firstName: "Staff",
        lastName: "User",
        role: "staff",
      });
      console.log("✅ Default staff user created");
    } else {
      console.log("✅ staff user already exists:", staffEmail);
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(
    id: number,
    category: Partial<InsertCategory>,
  ): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return result[0];
  }

  async getProductsWithIngredients(): Promise<any[]> {
    const productsData = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        price: products.price,
        cost: products.cost,
        margin: products.margin,
        sku: products.sku,
        isActive: products.isActive,
      })
      .from(products)
      .orderBy(products.name);

    const productsWithIngredients = await Promise.all(
      productsData.map(async (product) => {
        const ingredients = await this.getProductIngredients(product.id);
        return { ...product, ingredients };
      }),
    );

    return productsWithIngredients;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(
    id: number,
    product: Partial<InsertProduct>,
  ): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db
      .delete(productIngredients)
      .where(eq(productIngredients.productId, id));
    await db.delete(products).where(eq(products.id, id));
  }

  async getProductIngredients(productId: number): Promise<any[]> {
    return await db
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
    const [newIngredient] = await db
      .insert(productIngredients)
      .values(ingredient)
      .returning();
    return newIngredient;
  }

  async deleteProductIngredients(productId: number): Promise<void> {
    await db
      .delete(productIngredients)
      .where(eq(productIngredients.productId, productId));
  }

  // Unit operations
  async getUnits(): Promise<Unit[]> {
    return await db.select().from(units).orderBy(units.name);
  }

  async createUnit(data: InsertUnit): Promise<Unit> {
    const [newUnit] = await db.insert(units).values(data).returning();
    return newUnit;
  }

  async updateUnit(id: number, data: Partial<InsertUnit>): Promise<Unit> {
    const [updatedUnit] = await db
      .update(units)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();
    return updatedUnit;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }

  // Unit conversion operations
  async getUnitConversions(): Promise<any[]> {
    return await db.select().from(unitConversions).orderBy(unitConversions.id);
  }

  async createUnitConversion(data: any): Promise<any> {
    const [newConversion] = await db
      .insert(unitConversions)
      .values(data)
      .returning();
    return newConversion;
  }

  async updateUnitConversion(id: number, data: any): Promise<any> {
    const [updatedConversion] = await db
      .update(unitConversions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(unitConversions.id, id))
      .returning();
    return updatedConversion;
  }

  async deleteUnitConversion(id: number): Promise<void> {
    await db.delete(unitConversions).where(eq(unitConversions.id, id));
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      return await db
        .select()
        .from(inventoryItems)
        .orderBy(inventoryItems.name);
    } catch (error) {
      console.error("Error in getInventoryItems:", error);
      return [];
    }
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    const result = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1);
    return result[0];
  }

  async createInventoryItem(data: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(data).returning();
    return newItem;
  }

  async updateInventoryItem(
    id: number,
    data: Partial<InsertInventoryItem>,
  ): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db
      .delete(inventoryTransactions)
      .where(eq(inventoryTransactions.itemId, id));
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getInventoryCategories(): Promise<InventoryCategory[]> {
    return await db
      .select()
      .from(inventoryCategories)
      .orderBy(inventoryCategories.name);
  }

  async createInventoryCategory(
    data: InsertInventoryCategory,
  ): Promise<InventoryCategory> {
    const [newCategory] = await db
      .insert(inventoryCategories)
      .values(data)
      .returning();
    return newCategory;
  }

  async updateInventoryCategory(
    id: number,
    data: Partial<InsertInventoryCategory>,
  ): Promise<InventoryCategory> {
    const [updatedCategory] = await db
      .update(inventoryCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteInventoryCategory(id: number): Promise<void> {
    await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
  }

  async createInventoryTransaction(
    transaction: InsertInventoryTransaction,
  ): Promise<InventoryTransaction> {
    const [newTransaction] = await db
      .insert(inventoryTransactions)
      .values(transaction)
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
    let query = db
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

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(
        sql`CAST(${inventoryItems.currentStock} AS DECIMAL) <= CAST(${inventoryItems.minLevel} AS DECIMAL)`,
      )
      .orderBy(inventoryItems.name);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getPermissions(): Promise<Permission[]> {
    return await db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);
  }

  async createPermission(data: InsertPermission): Promise<Permission> {
    const [newPermission] = await db
      .insert(permissions)
      .values(data)
      .returning();
    return newPermission;
  }

  async getRolePermissions(role: string): Promise<any[]> {
    return await db
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
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role));

    if (permissionIds.length > 0) {
      const rolePermissionData = permissionIds.map((permissionId) => ({
        role,
        permissionId,
      }));
      await db.insert(rolePermissions).values(rolePermissionData);
    }
  }

  async getUserPermissions(userId: string): Promise<any[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return [];

      // Super admin gets all permissions
      if (user.role === "super_admin") {
        return await db
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
        return await db
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
      const rolePermissions = await db
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
          this.rolePermissions,
          eq(permissions.id, this.rolePermissions.permissionId),
        )
        .where(eq(this.rolePermissions.role, user.role))
        .orderBy(permissions.resource, permissions.action);

      // Get user-specific permission overrides
      const userPermissions = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          granted: this.userPermissions.granted,
        })
        .from(permissions)
        .innerJoin(
          this.userPermissions,
          eq(permissions.id, this.userPermissions.permissionId),
        )
        .where(eq(this.userPermissions.userId, userId))
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

      const userResults = await db
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

      const roleResults = await db
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
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    if (permissionUpdates.length > 0) {
      const userPermissionData = permissionUpdates.map((update) => ({
        userId,
        permissionId: update.permissionId,
        granted: update.granted,
      }));
      await db.insert(userPermissions).values(userPermissionData);
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

    const adminPermissionIds = allPermissions
      .filter((p) => p.action === "read_write")
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
    const settingsResult = await db.select().from(settings);
    const settingsObj: any = {};
    settingsResult.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });
    return settingsObj;
  }

  async updateSettings(settingsData: any): Promise<any> {
    for (const [key, value] of Object.entries(settingsData)) {
      await this.updateOrCreateSetting(key, value as string);
    }
    return settingsData;
  }

  async updateOrCreateSetting(key: string, value: string): Promise<any> {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value, type: "string" })
        .returning();
      return created;
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
      let query = db.select().from(loginLogs);

      if (startDate && endDate) {
        // Ensure dates are properly formatted as strings for the database
        const startDateStr = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString();
        const endDateStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString();

        query = query.where(
          and(
            gte(loginLogs.timestamp, startDateStr),
            lte(loginLogs.timestamp, endDateStr)
          )
        );
      }

      const logs = await query;

      // Process logs for analytics
      const analytics = {
        totalLogins: logs.length,
        uniqueUsers: new Set(logs.map(log => log.userId)).size,
        loginsByDay: this.groupLoginsByDay(logs),
        loginsByUser: this.groupLoginsByUser(logs),
        recentLogins: logs.slice(-10)
      };

      return analytics;
    } catch (error) {
      console.error("Error in getLoginAnalytics:", error);
      throw error;
    }
  }

  //```typescript
  groupLoginsByDay(logs: any[]): any {
    const loginsByDay: any = {};

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!loginsByDay[date]) {
        loginsByDay[date] = 0;
      }
      loginsByDay[date]++;
    });

    return Object.entries(loginsByDay).map(([date, count]) => ({ date, count }));
  }

  groupLoginsByUser(logs: any[]): any {
    const loginsByUser: any = {};

    logs.forEach(log => {
      if (!loginsByUser[log.userId]) {
        loginsByUser[log.userId] = 0;
      }
      loginsByUser[log.userId]++;
    });

    return Object.entries(loginsByUser).map(([userId, count]) => ({ userId, count }));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Party operations
  async getParties(): Promise<Party[]> {
    return await db.select().from(parties).orderBy(parties.name);
  }

  async createParty(party: InsertParty): Promise<Party> {
    const [newParty] = await db.insert(parties).values(party).returning();
    return newParty;
  }

  async updateParty(id: number, party: Partial<InsertParty>): Promise<Party> {
    const [updatedParty] = await db
      .update(parties)
      .set({ ...party, updatedAt: new Date() })
      .where(eq(parties.id, id))
      .returning();
    return updatedParty;
  }

  async deleteParty(id: number): Promise<void> {
    await db.delete(parties).where(eq(parties.id, id));
  }

  // Asset operations
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets).orderBy(assets.name);
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset> {
    const [updatedAsset] = await db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async deleteAsset(id: number): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
  }

  // Purchase operations
  async getPurchases(): Promise<any[]> {
    return await db
      .select({
        id: purchases.id,
        supplierName: purchases.supplierName,
        partyId: purchases.partyId,
        totalAmount: purchases.totalAmount,
        paymentMethod: purchases.paymentMethod,
        status: purchases.status,
        purchaseDate: purchases.purchaseDate,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .orderBy(desc(purchases.purchaseDate));
  }

  async createPurchase(purchaseData: any): Promise<any> {
    const [newPurchase] = await db
      .insert(purchases)
      .values(purchaseData)
      .returning();
    return newPurchase;
  }

  async updatePurchase(id: number, purchaseData: any): Promise<any> {
    const [updatedPurchase] = await db
      .update(purchases)
      .set({ ...purchaseData, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning();
    return updatedPurchase;
  }

  async deletePurchase(id: number): Promise<void> {
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
    await db.delete(purchases).where(eq(purchases.id, id));
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(
    id: number,
    expense: Partial<InsertExpense>,
  ): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Party operations
  async getParties(): Promise<Party[]> {
    return await db.select().from(parties).orderBy(parties.name);
  }

  async createParty(party: InsertParty): Promise<Party> {
    const [newParty] = await db.insert(parties).values(party).returning();
    return newParty;
  }

  async updateParty(id: number, party: Partial<InsertParty>): Promise<Party> {
    const [updatedParty] = await db
      .update(parties)
      .set({ ...party, updatedAt: new Date() })
      .where(eq(parties.id, id))
      .returning();
    return updatedParty;
  }

  async deleteParty(id: number): Promise<void> {
    await db.delete(parties).where(eq(parties.id, id));
  }

  // Ledger Transaction Methods
  async createLedgerTransaction(data: any): Promise<any> {
    const [newTransaction] = await db
      .insert(ledgerTransactions)
      .values(data)
      .returning();
    await this.recalculateRunningBalance(
      data.customerOrPartyId,
      data.entityType,
    );
    return newTransaction;
  }

  async getLedgerTransactions(
    entityId: number,
    entityType: "customer" | "party",
  ): Promise<any[]> {
    return await db
      .select()
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.customerOrPartyId, entityId),
          eq(ledgerTransactions.entityType, entityType),
        ),
      )
      .orderBy(ledgerTransactions.transactionDate, ledgerTransactions.id);
  }

  async updateLedgerTransaction(id: number, data: any): Promise<any> {
    const [updatedTransaction] = await db
      .update(ledgerTransactions)
      .set(data)
      .where(eq(ledgerTransactions.id, id))
      .returning();
    const transaction = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, id))
      .limit(1);
    if (transaction && transaction[0]) {
      await this.recalculateRunningBalance(
        transaction[0].customerOrPartyId,
        transaction[0].entityType,
      );
    }
    return updatedTransaction;
  }

  async deleteLedgerTransaction(id: number): Promise<void> {
    const transaction = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.id, id))
      .limit(1);
    await db.delete(ledgerTransactions).where(eq(ledgerTransactions.id, id));
    if (transaction && transaction[0]) {
      await this.recalculateRunningBalance(
        transaction[0].customerOrPartyId,
        transaction[0].entityType,
      );
    }
  }

  async recalculateRunningBalance(
    entityId: number,
    entityType: "customer" | "party",
  ): Promise<number> {
    const transactions = await this.getLedgerTransactions(entityId, entityType);

    // Get opening balance
    const entity =
      entityType === "customer"
        ? await db
            .select()
            .from(customers)
            .where(eq(customers.id, entityId))
            .limit(1)
        : await db
            .select()
            .from(parties)
            .where(eq(parties.id, entityId))
            .limit(1);

    const openingBalance = parseFloat(entity[0]?.openingBalance || "0");
    let runningBalance = openingBalance;

    // Update running balances for all transactions
    for (const transaction of transactions) {
      const debit = parseFloat(transaction.debitAmount || "0");
      const credit = parseFloat(transaction.creditAmount || "0");
      runningBalance = runningBalance + debit - credit;

      await db
        .update(ledgerTransactions)
        .set({ runningBalance: runningBalance.toString() })
        .where(eq(ledgerTransactions.id, transaction.id))
        .returning();
    }

    // Update entity's current balance
    const updateData = { currentBalance: runningBalance.toString() };
    if (entity && entity[0]) {
      if (entityType === "customer") {
        await db
          .update(customers)
          .set(updateData)
          .where(eq(customers.id, entityId))
          .returning();
      } else {
        await db
          .update(parties)
          .set(updateData)
          .where(eq(parties.id, entityId))
          .returning();
      }
    }

    return runningBalance;
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }

  async getOrderItems(orderId: number): Promise<any[]> {
    return await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        productName: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async getRecentOrders(limit: number): Promise<any[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getTodayProductionSchedule(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select({
        id: productionSchedule.id,
        productId: productionSchedule.productId,
        quantity: productionSchedule.quantity,
        scheduledDate: productionSchedule.scheduledDate,
        status: productionSchedule.status,
        productName: products.name,
      })
      .from(productionSchedule)
      .leftJoin(products, eq(productionSchedule.productId, products.id))
      .where(
        and(
          gte(productionSchedule.scheduledDate, today),
          lte(productionSchedule.scheduledDate, tomorrow)
        )
      )
      .orderBy(productionSchedule.scheduledDate);
  }

  async getProductionSchedule(): Promise<any[]> {
    return await db
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
      .orderBy(desc(productionSchedule.scheduledDate));
  }

  async createProductionScheduleItem(item: InsertProductionScheduleItem): Promise<ProductionScheduleItem> {
    const [newItem] = await db.insert(productionSchedule).values(item).returning();
    return newItem;
  }

  async updateProductionScheduleItem(id: number, item: Partial<InsertProductionScheduleItem>): Promise<ProductionScheduleItem> {
    const [updatedItem] = await db
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

    return await db
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
          lte(productionSchedule.scheduledDate, nextDay)
        )
      )
      .orderBy(productionSchedule.scheduledDate);
  }

  // Additional utility methods for routes compatibility
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

  // Notification system stubs
  async getNotifications(): Promise<any[]> {
    return [];
  }

  async markNotificationAsRead(
    userId: string,
    notificationId: number,
  ): Promise<void> {}

  async markAllNotificationsAsRead(userId: string): Promise<void> {}

  async saveNotificationSubscription(
    userId: string,
    subscription: any,
  ): Promise<void> {}

  async removeNotificationSubscription(userId: string): Promise<void> {}

  async saveNotificationSettings(
    userId: string,
    settings: any,
  ): Promise<void> {}

  async createNotification(userId: string, notification: any): Promise<any> {
    return { id: Date.now(), ...notification };
  }

  // Staff management operations
  async getStaff(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(staff.firstName, staff.lastName);
  }

  async getStaffById(id: number): Promise<Staff | undefined> {
    const result = await db
      .select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1);
    return result[0];
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(id: number): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }

  // Attendance operations
  async getAttendance(staffId?: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db
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

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
    return newAttendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set({ ...attendanceData, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<void> {
    await db.delete(attendance).where(eq(attendance.id, id));
  }

  async clockIn(staffId: number): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already clocked in today
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.staffId, staffId),
          gte(attendance.date, today)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Already clocked in today");
    }

    const [newAttendance] = await db
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
    
    const existing = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.staffId, staffId),
          gte(attendance.date, today)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("No clock-in record found for today");
    }

    const clockOutTime = new Date();
    const clockInTime = existing[0].clockIn;
    let totalHours = 0;

    if (clockInTime) {
      totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    }

    const [updatedAttendance] = await db
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
    let query = db
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

  async createSalaryPayment(paymentData: InsertSalaryPayment): Promise<SalaryPayment> {
    const [newPayment] = await db.insert(salaryPayments).values(paymentData).returning();
    return newPayment;
  }

  async updateSalaryPayment(id: number, paymentData: Partial<InsertSalaryPayment>): Promise<SalaryPayment> {
    const [updatedPayment] = await db
      .update(salaryPayments)
      .set({ ...paymentData, updatedAt: new Date() })
      .where(eq(salaryPayments.id, id))
      .returning();
    return updatedPayment;
  }

  async deleteSalaryPayment(id: number): Promise<void> {
    await db.delete(salaryPayments).where(eq(salaryPayments.id, id));
  }

  // Leave request operations
  async getLeaveRequests(staffId?: number): Promise<any[]> {
    let query = db
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

  async createLeaveRequest(requestData: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db.insert(leaveRequests).values(requestData).returning();
    return newRequest;
  }

  async updateLeaveRequest(id: number, requestData: Partial<InsertLeaveRequest>): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
  }

  // Staff schedule operations
  async getStaffSchedules(staffId?: number, date?: Date): Promise<any[]> {
    let query = db
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
          lte(staffSchedules.date, endOfDay)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  }

  async createStaffSchedule(scheduleData: InsertStaffSchedule): Promise<StaffSchedule> {
    const [newSchedule] = await db.insert(staffSchedules).values(scheduleData).returning();
    return newSchedule;
  }

  async updateStaffSchedule(id: number, scheduleData: Partial<InsertStaffSchedule>): Promise<StaffSchedule> {
    const [updatedSchedule] = await db
      .update(staffSchedules)
      .set({ ...scheduleData, updatedAt: new Date() })
      .where(eq(staffSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteStaffSchedule(id: number): Promise<void> {
    await db.delete(staffSchedules).where(eq(staffSchedules.id, id));
  }
}

export const storage = new Storage();