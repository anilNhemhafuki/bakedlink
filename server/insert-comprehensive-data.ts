
import { db } from "./db";
import {
  categories,
  inventoryCategories,
  inventoryItems,
  products,
  productIngredients,
  customers,
  parties,
  orders,
  orderItems,
  purchases,
  purchaseItems,
  expenses,
  assets,
  productionSchedule,
  settings,
  users,
  units,
  bills,
  billItems,
  inventoryTransactions,
  auditLogs,
  permissions,
  userPermissions
} from "../shared/schema";
import bcrypt from "bcrypt";

export async function insertComprehensiveData() {
  console.log("🌱 Inserting comprehensive data into all tables...");
  
  try {
    // Clear existing data in reverse order to handle foreign key constraints
    console.log("🧹 Clearing existing data...");
    await db.delete(billItems);
    await db.delete(bills);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(productIngredients);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(purchaseItems);
    await db.delete(purchases);
    await db.delete(inventoryTransactions);
    await db.delete(inventoryItems);
    await db.delete(inventoryCategories);
    await db.delete(customers);
    await db.delete(parties);
    await db.delete(expenses);
    await db.delete(assets);
    await db.delete(productionSchedule);
    await db.delete(settings);
    await db.delete(userPermissions);
    await db.delete(permissions);
    await db.delete(auditLogs);
    await db.delete(users);
    await db.delete(units);

    // 1. Insert Units
    console.log("📏 Inserting units...");
    const unitData = [
      { name: "Kilogram", abbreviation: "kg", type: "weight", isActive: true },
      { name: "Gram", abbreviation: "g", type: "weight", isActive: true },
      { name: "Liter", abbreviation: "l", type: "volume", isActive: true },
      { name: "Milliliter", abbreviation: "ml", type: "volume", isActive: true },
      { name: "Piece", abbreviation: "pcs", type: "count", isActive: true },
      { name: "Dozen", abbreviation: "dz", type: "count", isActive: true },
      { name: "Box", abbreviation: "box", type: "count", isActive: true },
      { name: "Pack", abbreviation: "pack", type: "count", isActive: true },
      { name: "Bottle", abbreviation: "btl", type: "count", isActive: true },
      { name: "Bag", abbreviation: "bag", type: "count", isActive: true }
    ];
    const insertedUnits = await db.insert(units).values(unitData).returning();

    // 2. Insert Users
    console.log("👥 Inserting users...");
    const userData = [
      {
        id: `super_admin_${Date.now()}`,
        email: "superadmin@bakesewa.com",
        password: await bcrypt.hash("superadmin123", 10),
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin"
      },
      {
        id: `admin_${Date.now()}`,
        email: "admin@bakesewa.com",
        password: await bcrypt.hash("admin123", 10),
        firstName: "Admin",
        lastName: "User",
        role: "admin"
      },
      {
        id: `manager_${Date.now()}`,
        email: "manager@bakesewa.com",
        password: await bcrypt.hash("manager123", 10),
        firstName: "Manager",
        lastName: "User",
        role: "manager"
      },
      {
        id: `staff_${Date.now()}`,
        email: "staff@bakesewa.com",
        password: await bcrypt.hash("staff123", 10),
        firstName: "Staff",
        lastName: "User",
        role: "staff"
      }
    ];
    const insertedUsers = await db.insert(users).values(userData).returning();

    // 3. Insert Permissions
    console.log("🔐 Inserting permissions...");
    const permissionData = [
      { name: "view_dashboard", description: "View dashboard" },
      { name: "manage_users", description: "Manage users" },
      { name: "manage_products", description: "Manage products" },
      { name: "manage_inventory", description: "Manage inventory" },
      { name: "manage_orders", description: "Manage orders" },
      { name: "manage_purchases", description: "Manage purchases" },
      { name: "view_reports", description: "View reports" },
      { name: "manage_settings", description: "Manage settings" }
    ];
    const insertedPermissions = await db.insert(permissions).values(permissionData).returning();

    // 4. Insert Categories
    console.log("📂 Inserting product categories...");
    const categoryData = [
      { name: "Cakes & Pastries", description: "All types of cakes, cupcakes, and pastries" },
      { name: "Breads & Rolls", description: "Fresh baked breads and dinner rolls" },
      { name: "Cookies & Biscuits", description: "Various cookies and biscuits" },
      { name: "Seasonal Items", description: "Holiday and seasonal specialty items" },
      { name: "Custom Orders", description: "Custom made items for special occasions" }
    ];
    const insertedCategories = await db.insert(categories).values(categoryData).returning();

    // 5. Insert Inventory Categories
    console.log("📦 Inserting inventory categories...");
    const invCategoryData = [
      { name: "Baking Ingredients", description: "Flour, sugar, eggs, etc." },
      { name: "Dairy Products", description: "Milk, butter, cream, cheese" },
      { name: "Flavorings", description: "Vanilla, chocolate, spices" },
      { name: "Packaging", description: "Boxes, bags, containers" },
      { name: "Equipment", description: "Baking tools and equipment" }
    ];
    const insertedInvCategories = await db.insert(inventoryCategories).values(invCategoryData).returning();

    // 6. Insert Inventory Items
    console.log("📋 Inserting inventory items...");
    const inventoryData = [
      {
        name: "All-Purpose Flour",
        currentStock: "50.00",
        minLevel: "10.00",
        unit: "kg",
        costPerUnit: "2.50",
        supplier: "Premium Flour Co.",
        categoryId: insertedInvCategories[0].id,
        lastRestocked: new Date()
      },
      {
        name: "Granulated Sugar",
        currentStock: "25.00",
        minLevel: "5.00",
        unit: "kg",
        costPerUnit: "1.80",
        supplier: "Sweet Supply Inc.",
        categoryId: insertedInvCategories[0].id,
        lastRestocked: new Date()
      },
      {
        name: "Fresh Eggs",
        currentStock: "120.00",
        minLevel: "24.00",
        unit: "pieces",
        costPerUnit: "0.25",
        supplier: "Farm Fresh Eggs",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date()
      },
      {
        name: "Unsalted Butter",
        currentStock: "15.00",
        minLevel: "3.00",
        unit: "kg",
        costPerUnit: "8.50",
        supplier: "Dairy Best Ltd.",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date()
      },
      {
        name: "Vanilla Extract",
        currentStock: "2.00",
        minLevel: "0.50",
        unit: "liters",
        costPerUnit: "45.00",
        supplier: "Flavor Masters",
        categoryId: insertedInvCategories[2].id,
        lastRestocked: new Date()
      }
    ];
    const insertedInventory = await db.insert(inventoryItems).values(inventoryData).returning();

    // 7. Insert Products
    console.log("🍰 Inserting products...");
    const productData = [
      {
        name: "Chocolate Birthday Cake",
        description: "Rich chocolate cake with chocolate frosting",
        categoryId: insertedCategories[0].id,
        price: "35.00",
        cost: "18.50",
        margin: "47.14",
        sku: "CHOC-CAKE-001",
        isActive: true
      },
      {
        name: "Vanilla Cupcakes (6-pack)",
        description: "Fluffy vanilla cupcakes with buttercream frosting",
        categoryId: insertedCategories[0].id,
        price: "12.00",
        cost: "6.25",
        margin: "47.92",
        sku: "VAN-CUP-006",
        isActive: true
      },
      {
        name: "Fresh Croissants",
        description: "Buttery, flaky French croissants",
        categoryId: insertedCategories[1].id,
        price: "3.50",
        cost: "1.75",
        margin: "50.00",
        sku: "CROIS-001",
        isActive: true
      }
    ];
    const insertedProducts = await db.insert(products).values(productData).returning();

    // 8. Insert Product Ingredients
    console.log("🥄 Inserting product ingredients...");
    const ingredientData = [
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[0].id, quantity: "0.50", unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[1].id, quantity: "0.40", unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[0].id, quantity: "0.30", unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[1].id, quantity: "0.20", unit: "kg" }
    ];
    await db.insert(productIngredients).values(ingredientData);

    // 9. Insert Customers
    console.log("👥 Inserting customers...");
    const customerData = [
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0123",
        address: "123 Main Street, Cityville, ST 12345",
        remainingBalance: "0.00",
        isActive: true
      },
      {
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1-555-0456",
        address: "456 Oak Avenue, Townsburg, ST 67890",
        remainingBalance: "25.50",
        isActive: true
      },
      {
        name: "Emily Davis",
        email: "emily.davis@email.com",
        phone: "+1-555-0789",
        address: "789 Pine Road, Villageton, ST 13579",
        remainingBalance: "0.00",
        isActive: true
      }
    ];
    const insertedCustomers = await db.insert(customers).values(customerData).returning();

    // 10. Insert Parties (Suppliers)
    console.log("🏢 Inserting suppliers/parties...");
    const partyData = [
      {
        name: "Premium Flour Co.",
        type: "supplier",
        contactPerson: "John Smith",
        email: "orders@premiumflour.com",
        phone: "+1-555-1111",
        address: "100 Industrial Way, Flour City, ST 11111",
        balance: "1250.00",
        isActive: true
      },
      {
        name: "Dairy Best Ltd.",
        type: "supplier",
        contactPerson: "Maria Rodriguez",
        email: "supply@dairybest.com",
        phone: "+1-555-2222",
        address: "200 Farm Road, Dairy Valley, ST 22222",
        balance: "850.50",
        isActive: true
      }
    ];
    const insertedParties = await db.insert(parties).values(partyData).returning();

    // 11. Insert Orders
    console.log("📝 Inserting orders...");
    const orderData = [
      {
        customerName: "Sarah Johnson",
        customerId: insertedCustomers[0].id,
        customerEmail: "sarah.johnson@email.com",
        customerPhone: "+1-555-0123",
        totalAmount: "47.00",
        status: "completed",
        paymentMethod: "credit_card",
        deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: "Birthday party order"
      },
      {
        customerName: "Michael Chen",
        customerId: insertedCustomers[1].id,
        customerEmail: "michael.chen@email.com",
        customerPhone: "+1-555-0456",
        totalAmount: "24.00",
        status: "pending",
        paymentMethod: "cash",
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notes: "Office meeting order"
      }
    ];
    const insertedOrders = await db.insert(orders).values(orderData).returning();

    // 12. Insert Order Items
    console.log("🛒 Inserting order items...");
    const orderItemData = [
      { orderId: insertedOrders[0].id, productId: insertedProducts[0].id, quantity: 1, unitPrice: "35.00", totalPrice: "35.00" },
      { orderId: insertedOrders[0].id, productId: insertedProducts[1].id, quantity: 1, unitPrice: "12.00", totalPrice: "12.00" },
      { orderId: insertedOrders[1].id, productId: insertedProducts[1].id, quantity: 2, unitPrice: "12.00", totalPrice: "24.00" }
    ];
    await db.insert(orderItems).values(orderItemData);

    // 13. Insert Purchases
    console.log("💰 Inserting purchases...");
    const purchaseData = [
      {
        supplierName: "Premium Flour Co.",
        partyId: insertedParties[0].id,
        totalAmount: "125.00",
        paymentMethod: "bank_transfer",
        status: "completed",
        purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        invoiceNumber: "PFC-2024-001",
        notes: "Monthly flour order"
      }
    ];
    const insertedPurchases = await db.insert(purchases).values(purchaseData).returning();

    // 14. Insert Purchase Items
    console.log("📦 Inserting purchase items...");
    const purchaseItemData = [
      { purchaseId: insertedPurchases[0].id, inventoryItemId: insertedInventory[0].id, quantity: "50.00", unitPrice: "2.50", totalPrice: "125.00" }
    ];
    await db.insert(purchaseItems).values(purchaseItemData);

    // 15. Insert Bills
    console.log("🧾 Inserting bills...");
    const billData = [
      {
        billNumber: "BILL-2024-001",
        customerId: insertedCustomers[0].id,
        customerName: "Sarah Johnson",
        billDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalAmount: "47.00",
        discount: "0.00",
        tax: "3.76",
        status: "pending",
        notes: "Birthday cake order"
      }
    ];
    const insertedBills = await db.insert(bills).values(billData).returning();

    // 16. Insert Bill Items
    console.log("📋 Inserting bill items...");
    const billItemData = [
      {
        billId: insertedBills[0].id,
        productId: insertedProducts[0].id,
        productName: "Chocolate Birthday Cake",
        quantity: 1,
        unitPrice: "35.00",
        totalPrice: "35.00"
      }
    ];
    await db.insert(billItems).values(billItemData);

    // 17. Insert Expenses
    console.log("💸 Inserting expenses...");
    const expenseData = [
      {
        title: "Monthly rent for bakery",
        amount: "2500.00",
        category: "rent",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        description: "Monthly bakery space rental",
        createdBy: insertedUsers[0].id
      },
      {
        title: "Electricity bill",
        amount: "180.50",
        category: "utilities",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        description: "Monthly electricity charges",
        createdBy: insertedUsers[1].id
      }
    ];
    await db.insert(expenses).values(expenseData);

    // 18. Insert Assets
    console.log("🏭 Inserting assets...");
    const assetData = [
      {
        name: "Commercial Stand Mixer",
        category: "equipment",
        purchasePrice: "1250.00",
        currentValue: "950.00",
        purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        location: "Main kitchen",
        condition: "good",
        description: "20-quart capacity, serviced annually"
      },
      {
        name: "Convection Oven",
        category: "equipment",
        purchasePrice: "3500.00",
        currentValue: "2800.00",
        purchaseDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
        location: "Main kitchen",
        condition: "excellent",
        description: "Double rack, energy efficient"
      }
    ];
    await db.insert(assets).values(assetData);

    // 19. Insert Production Schedule
    console.log("⏰ Inserting production schedule...");
    const scheduleData = [
      {
        productId: insertedProducts[0].id,
        quantity: 5,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        assignedTo: "Baker Team A",
        notes: "Weekend orders - chocolate cakes",
        status: "scheduled"
      }
    ];
    await db.insert(productionSchedule).values(scheduleData);

    // 20. Insert Inventory Transactions
    console.log("📊 Inserting inventory transactions...");
    const transactionData = [
      {
        inventoryItemId: insertedInventory[0].id,
        type: "purchase",
        quantity: "50.00",
        reason: "Monthly stock replenishment",
        reference: "PFC-2024-001",
        createdBy: insertedUsers[0].id
      },
      {
        inventoryItemId: insertedInventory[0].id,
        type: "usage",
        quantity: "-5.00",
        reason: "Production consumption",
        reference: "PROD-001",
        createdBy: insertedUsers[2].id
      }
    ];
    await db.insert(inventoryTransactions).values(transactionData);

    // 21. Insert Settings
    console.log("⚙️ Inserting settings...");
    const settingsData = [
      { key: "business_name", value: "Sweet Treats Bakery" },
      { key: "business_address", value: "123 Baker Street, Sweet City, ST 12345" },
      { key: "business_phone", value: "+1-555-BAKERY" },
      { key: "business_email", value: "orders@sweettreats.com" },
      { key: "tax_rate", value: "8.5" },
      { key: "currency", value: "USD" },
      { key: "labor_cost_per_hour", value: "25.00" },
      { key: "overhead_percentage", value: "15.0" }
    ];
    await db.insert(settings).values(settingsData);

    // 22. Insert Audit Logs
    console.log("📝 Inserting audit logs...");
    const auditData = [
      {
        userId: insertedUsers[0].id,
        action: "CREATE",
        tableName: "products",
        recordId: insertedProducts[0].id.toString(),
        oldValues: null,
        newValues: JSON.stringify({ name: "Chocolate Birthday Cake", price: "35.00" }),
        ipAddress: "192.168.1.1",
        userAgent: "System Setup"
      },
      {
        userId: insertedUsers[1].id,
        action: "CREATE",
        tableName: "orders",
        recordId: insertedOrders[0].id.toString(),
        oldValues: null,
        newValues: JSON.stringify({ customerName: "Sarah Johnson", totalAmount: "47.00" }),
        ipAddress: "192.168.1.2",
        userAgent: "System Setup"
      }
    ];
    await db.insert(auditLogs).values(auditData);

    console.log("🎉 Comprehensive data insertion completed successfully!");
    console.log("\n=== SUMMARY ===");
    console.log(`✅ Units: ${insertedUnits.length}`);
    console.log(`✅ Users: ${insertedUsers.length}`);
    console.log(`✅ Permissions: ${insertedPermissions.length}`);
    console.log(`✅ Categories: ${insertedCategories.length}`);
    console.log(`✅ Inventory Categories: ${insertedInvCategories.length}`);
    console.log(`✅ Inventory Items: ${insertedInventory.length}`);
    console.log(`✅ Products: ${insertedProducts.length}`);
    console.log(`✅ Customers: ${insertedCustomers.length}`);
    console.log(`✅ Suppliers: ${insertedParties.length}`);
    console.log(`✅ Orders: ${insertedOrders.length}`);
    console.log(`✅ Purchases: ${insertedPurchases.length}`);
    console.log(`✅ Bills: ${insertedBills.length}`);
    
    console.log("\n=== LOGIN CREDENTIALS ===");
    console.log("📧 Super Admin: superadmin@bakesewa.com | 🔐 Password: superadmin123");
    console.log("📧 Admin: admin@bakesewa.com | 🔐 Password: admin123");
    console.log("📧 Manager: manager@bakesewa.com | 🔐 Password: manager123");
    console.log("📧 Staff: staff@bakesewa.com | 🔐 Password: staff123");
    console.log("=========================");

    return {
      success: true,
      message: "All tables populated with comprehensive sample data",
      counts: {
        units: insertedUnits.length,
        users: insertedUsers.length,
        permissions: insertedPermissions.length,
        categories: insertedCategories.length,
        inventoryCategories: insertedInvCategories.length,
        inventoryItems: insertedInventory.length,
        products: insertedProducts.length,
        customers: insertedCustomers.length,
        suppliers: insertedParties.length,
        orders: insertedOrders.length,
        purchases: insertedPurchases.length,
        bills: insertedBills.length
      }
    };
    
  } catch (error) {
    console.error("❌ Error inserting comprehensive data:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  insertComprehensiveData().then((result) => {
    console.log("✅ Process completed:", result.message);
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Process failed:", error);
    process.exit(1);
  });
}
