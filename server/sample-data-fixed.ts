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
} from "../shared/schema";

export async function insertFixedSampleData() {
  console.log("🌱 Inserting comprehensive sample data...");
  
  try {
    // Clear existing data
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(productIngredients);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(purchaseItems);
    await db.delete(purchases);
    await db.delete(inventoryItems);
    await db.delete(inventoryCategories);
    await db.delete(customers);
    await db.delete(parties);
    await db.delete(expenses);
    await db.delete(assets);
    await db.delete(productionSchedule);
    await db.delete(settings);

    // Insert Categories
    const categoryData = [
      { name: "Cakes & Pastries", description: "All types of cakes, cupcakes, and pastries" },
      { name: "Breads & Rolls", description: "Fresh baked breads and dinner rolls" },
      { name: "Cookies & Biscuits", description: "Various cookies and biscuits" },
      { name: "Seasonal Items", description: "Holiday and seasonal specialty items" },
      { name: "Custom Orders", description: "Custom made items for special occasions" },
    ];

    const insertedCategories = await db.insert(categories).values(categoryData).returning();
    console.log(`✅ Inserted ${insertedCategories.length} product categories`);

    // Insert Inventory Categories
    const invCategoryData = [
      { name: "Baking Ingredients", description: "Flour, sugar, eggs, etc." },
      { name: "Dairy Products", description: "Milk, butter, cream, cheese" },
      { name: "Flavorings", description: "Vanilla, chocolate, spices" },
      { name: "Packaging", description: "Boxes, bags, containers" },
      { name: "Equipment", description: "Baking tools and equipment" },
    ];

    const insertedInvCategories = await db.insert(inventoryCategories).values(invCategoryData).returning();
    console.log(`✅ Inserted ${insertedInvCategories.length} inventory categories`);

    // Insert Inventory Items
    const inventoryData = [
      {
        name: "All-Purpose Flour",
        currentStock: "50.00",
        minLevel: "10.00",
        unit: "kg",
        costPerUnit: "2.50",
        supplier: "Premium Flour Co.",
        categoryId: insertedInvCategories[0].id,
        lastRestocked: new Date(),
      },
      {
        name: "Granulated Sugar",
        currentStock: "25.00",
        minLevel: "5.00",
        unit: "kg",
        costPerUnit: "1.80",
        supplier: "Sweet Supply Inc.",
        categoryId: insertedInvCategories[0].id,
        lastRestocked: new Date(),
      },
      {
        name: "Fresh Eggs",
        currentStock: "120.00",
        minLevel: "24.00",
        unit: "pieces",
        costPerUnit: "0.25",
        supplier: "Farm Fresh Eggs",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date(),
      },
      {
        name: "Unsalted Butter",
        currentStock: "15.00",
        minLevel: "3.00",
        unit: "kg",
        costPerUnit: "8.50",
        supplier: "Dairy Best Ltd.",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date(),
      },
      {
        name: "Vanilla Extract",
        currentStock: "2.00",
        minLevel: "0.50",
        unit: "liters",
        costPerUnit: "45.00",
        supplier: "Flavor Masters",
        categoryId: insertedInvCategories[2].id,
        lastRestocked: new Date(),
      },
      {
        name: "Cocoa Powder",
        currentStock: "8.00",
        minLevel: "2.00",
        unit: "kg",
        costPerUnit: "12.00",
        supplier: "Chocolate Heaven",
        categoryId: insertedInvCategories[2].id,
        lastRestocked: new Date(),
      },
      {
        name: "Heavy Cream",
        currentStock: "10.00",
        minLevel: "2.00",
        unit: "liters",
        costPerUnit: "4.50",
        supplier: "Dairy Best Ltd.",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date(),
      },
      {
        name: "Cake Boxes (Medium)",
        currentStock: "200.00",
        minLevel: "50.00",
        unit: "pieces",
        costPerUnit: "0.75",
        supplier: "Package Pro",
        categoryId: insertedInvCategories[3].id,
        lastRestocked: new Date(),
      },
    ];

    const insertedInventory = await db.insert(inventoryItems).values(inventoryData).returning();
    console.log(`✅ Inserted ${insertedInventory.length} inventory items`);

    // Insert Products
    const productData = [
      {
        name: "Chocolate Birthday Cake",
        description: "Rich chocolate cake with chocolate frosting",
        categoryId: insertedCategories[0].id,
        price: "35.00",
        cost: "18.50",
        margin: "47.14",
        sku: "CHOC-CAKE-001",
        isActive: true,
      },
      {
        name: "Vanilla Cupcakes (6-pack)",
        description: "Fluffy vanilla cupcakes with buttercream frosting",
        categoryId: insertedCategories[0].id,
        price: "12.00",
        cost: "6.25",
        margin: "47.92",
        sku: "VAN-CUP-006",
        isActive: true,
      },
      {
        name: "Fresh Croissants",
        description: "Buttery, flaky French croissants",
        categoryId: insertedCategories[1].id,
        price: "3.50",
        cost: "1.75",
        margin: "50.00",
        sku: "CROIS-001",
        isActive: true,
      },
      {
        name: "Chocolate Chip Cookies (dozen)",
        description: "Classic chocolate chip cookies",
        categoryId: insertedCategories[2].id,
        price: "8.00",
        cost: "4.20",
        margin: "47.50",
        sku: "CHOC-COOK-12",
        isActive: true,
      },
      {
        name: "Wedding Cake (3-tier)",
        description: "Elegant 3-tier wedding cake with custom decoration",
        categoryId: insertedCategories[4].id,
        price: "150.00",
        cost: "65.00",
        margin: "56.67",
        sku: "WEDD-CAKE-3T",
        isActive: true,
      },
    ];

    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log(`✅ Inserted ${insertedProducts.length} products`);

    // Insert Product Ingredients
    const ingredientData = [
      // Chocolate Birthday Cake
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[0].id, quantity: "0.50", unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[1].id, quantity: "0.40", unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[2].id, quantity: "3.00", unit: "pieces" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[3].id, quantity: "0.25", unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[5].id, quantity: "0.10", unit: "kg" },
      
      // Vanilla Cupcakes
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[0].id, quantity: "0.30", unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[1].id, quantity: "0.20", unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[2].id, quantity: "2.00", unit: "pieces" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[4].id, quantity: "0.02", unit: "liters" },
      
      // Fresh Croissants
      { productId: insertedProducts[2].id, inventoryItemId: insertedInventory[0].id, quantity: "0.08", unit: "kg" },
      { productId: insertedProducts[2].id, inventoryItemId: insertedInventory[3].id, quantity: "0.05", unit: "kg" },
    ];

    const insertedIngredients = await db.insert(productIngredients).values(ingredientData).returning();
    console.log(`✅ Inserted ${insertedIngredients.length} product ingredients`);

    // Insert Customers
    const customerData = [
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0123",
        address: "123 Main Street, Cityville, ST 12345",
        totalOrders: 5,
        totalSpent: "150.00",
        isActive: true,
      },
      {
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1-555-0456",
        address: "456 Oak Avenue, Townsburg, ST 67890",
        totalOrders: 3,
        totalSpent: "85.50",
        isActive: true,
      },
      {
        name: "Emily Davis",
        email: "emily.davis@email.com",
        phone: "+1-555-0789",
        address: "789 Pine Road, Villageton, ST 13579",
        totalOrders: 8,
        totalSpent: "275.25",
        isActive: true,
      },
      {
        name: "Restaurant ABC",
        email: "orders@restaurantabc.com",
        phone: "+1-555-0999",
        address: "321 Business District, Metro City, ST 24680",
        totalOrders: 12,
        totalSpent: "450.75",
        isActive: true,
      },
    ];

    const insertedCustomers = await db.insert(customers).values(customerData).returning();
    console.log(`✅ Inserted ${insertedCustomers.length} customers`);

    // Insert Parties (Suppliers)
    const partyData = [
      {
        name: "Premium Flour Co.",
        type: "supplier",
        contactPerson: "John Smith",
        email: "orders@premiumflour.com",
        phone: "+1-555-1111",
        address: "100 Industrial Way, Flour City, ST 11111",
        balance: "1250.00",
        isActive: true,
      },
      {
        name: "Dairy Best Ltd.",
        type: "supplier",
        contactPerson: "Maria Rodriguez",
        email: "supply@dairybest.com",
        phone: "+1-555-2222",
        address: "200 Farm Road, Dairy Valley, ST 22222",
        balance: "850.50",
        isActive: true,
      },
      {
        name: "Sweet Supply Inc.",
        type: "supplier",
        contactPerson: "David Wilson",
        email: "sales@sweetsupply.com",
        phone: "+1-555-3333",
        address: "300 Sugar Lane, Sweet Town, ST 33333",
        balance: "675.25",
        isActive: true,
      },
    ];

    const insertedParties = await db.insert(parties).values(partyData).returning();
    console.log(`✅ Inserted ${insertedParties.length} suppliers/parties`);

    // Insert Orders
    const orderData = [
      {
        customerName: "Sarah Johnson",
        customerId: insertedCustomers[0].id,
        customerEmail: "sarah.johnson@email.com",
        customerPhone: "+1-555-0123",
        totalAmount: "47.00",
        status: "completed",
        paymentMethod: "credit_card",
        deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        notes: "Birthday party order",
      },
      {
        customerName: "Michael Chen",
        customerId: insertedCustomers[1].id,
        customerEmail: "michael.chen@email.com",
        customerPhone: "+1-555-0456",
        totalAmount: "24.00",
        status: "pending",
        paymentMethod: "cash",
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        notes: "Office meeting order",
      },
      {
        customerName: "Emily Davis",
        customerId: insertedCustomers[2].id,
        customerEmail: "emily.davis@email.com",
        customerPhone: "+1-555-0789",
        totalAmount: "185.00",
        status: "in_progress",
        paymentMethod: "credit_card",
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        notes: "Wedding anniversary celebration",
      },
    ];

    const insertedOrders = await db.insert(orders).values(orderData).returning();
    console.log(`✅ Inserted ${insertedOrders.length} orders`);

    // Insert Order Items
    const orderItemData = [
      // Sarah's Order
      { orderId: insertedOrders[0].id, productId: insertedProducts[0].id, quantity: 1, unitPrice: "35.00", totalPrice: "35.00" },
      { orderId: insertedOrders[0].id, productId: insertedProducts[1].id, quantity: 1, unitPrice: "12.00", totalPrice: "12.00" },
      
      // Michael's Order
      { orderId: insertedOrders[1].id, productId: insertedProducts[1].id, quantity: 2, unitPrice: "12.00", totalPrice: "24.00" },
      
      // Emily's Order
      { orderId: insertedOrders[2].id, productId: insertedProducts[4].id, quantity: 1, unitPrice: "150.00", totalPrice: "150.00" },
      { orderId: insertedOrders[2].id, productId: insertedProducts[0].id, quantity: 1, unitPrice: "35.00", totalPrice: "35.00" },
    ];

    const insertedOrderItems = await db.insert(orderItems).values(orderItemData).returning();
    console.log(`✅ Inserted ${insertedOrderItems.length} order items`);

    // Insert Purchases
    const purchaseData = [
      {
        supplierName: "Premium Flour Co.",
        partyId: insertedParties[0].id,
        totalAmount: "125.00",
        paymentMethod: "bank_transfer",
        status: "completed",
        purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        invoiceNumber: "PFC-2024-001",
        notes: "Monthly flour order",
      },
      {
        supplierName: "Dairy Best Ltd.",
        partyId: insertedParties[1].id,
        totalAmount: "95.50",
        paymentMethod: "credit_card",
        status: "completed",
        purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        invoiceNumber: "DBL-2024-007",
        notes: "Weekly dairy products",
      },
    ];

    const insertedPurchases = await db.insert(purchases).values(purchaseData).returning();
    console.log(`✅ Inserted ${insertedPurchases.length} purchases`);

    // Insert Purchase Items
    const purchaseItemData = [
      // Premium Flour Co. Purchase
      { purchaseId: insertedPurchases[0].id, inventoryItemId: insertedInventory[0].id, quantity: "50.00", unitPrice: "2.50", totalPrice: "125.00" },
      
      // Dairy Best Ltd. Purchase
      { purchaseId: insertedPurchases[1].id, inventoryItemId: insertedInventory[3].id, quantity: "5.00", unitPrice: "8.50", totalPrice: "42.50" },
      { purchaseId: insertedPurchases[1].id, inventoryItemId: insertedInventory[6].id, quantity: "10.00", unitPrice: "4.50", totalPrice: "45.00" },
      { purchaseId: insertedPurchases[1].id, inventoryItemId: insertedInventory[2].id, quantity: "32.00", unitPrice: "0.25", totalPrice: "8.00" },
    ];

    const insertedPurchaseItems = await db.insert(purchaseItems).values(purchaseItemData).returning();
    console.log(`✅ Inserted ${insertedPurchaseItems.length} purchase items`);

    // Insert Expenses
    const expenseData = [
      {
        description: "Monthly rent for bakery",
        amount: "2500.00",
        category: "rent",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        paymentMethod: "bank_transfer",
        vendor: "Property Management Co.",
      },
      {
        description: "Electricity bill",
        amount: "180.50",
        category: "utilities",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        paymentMethod: "online_payment",
        vendor: "City Electric Company",
      },
      {
        description: "Equipment maintenance",
        amount: "225.00",
        category: "maintenance",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentMethod: "credit_card",
        vendor: "Bakery Equipment Services",
      },
    ];

    const insertedExpenses = await db.insert(expenses).values(expenseData).returning();
    console.log(`✅ Inserted ${insertedExpenses.length} expenses`);

    // Insert Assets
    const assetData = [
      {
        name: "Commercial Stand Mixer",
        category: "equipment",
        purchasePrice: "1250.00",
        currentValue: "950.00",
        purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        location: "Main kitchen",
        condition: "good",
        notes: "20-quart capacity, serviced annually",
      },
      {
        name: "Convection Oven",
        category: "equipment",
        purchasePrice: "3500.00",
        currentValue: "2800.00",
        purchaseDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
        location: "Main kitchen",
        condition: "excellent",
        notes: "Double rack, energy efficient",
      },
      {
        name: "Refrigerated Display Case",
        category: "equipment",
        purchasePrice: "2200.00",
        currentValue: "1650.00",
        purchaseDate: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000), // 18 months ago
        location: "Front counter",
        condition: "good",
        notes: "6-foot display case, temperature controlled",
      },
    ];

    const insertedAssets = await db.insert(assets).values(assetData).returning();
    console.log(`✅ Inserted ${insertedAssets.length} assets`);

    // Insert Production Schedule
    const scheduleData = [
      {
        productId: insertedProducts[0].id,
        quantity: 5,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 AM tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 12 PM tomorrow
        assignedTo: "Baker Team A",
        notes: "Weekend orders - chocolate cakes",
        status: "scheduled",
      },
      {
        productId: insertedProducts[1].id,
        quantity: 12,
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 AM
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 10 AM
        assignedTo: "Baker Team B",
        notes: "Bulk cupcake order for events",
        status: "scheduled",
      },
    ];

    const insertedSchedule = await db.insert(productionSchedule).values(scheduleData).returning();
    console.log(`✅ Inserted ${insertedSchedule.length} production schedule items`);

    // Insert Settings
    const settingsData = [
      { key: "labor_cost_per_hour", value: "25.00" },
      { key: "overhead_percentage", value: "15.0" },
      { key: "production_time_hours", value: "2.0" },
      { key: "business_name", value: "Sweet Treats Bakery" },
      { key: "business_address", value: "123 Baker Street, Sweet City, ST 12345" },
      { key: "business_phone", value: "+1-555-BAKERY" },
      { key: "business_email", value: "orders@sweettreats.com" },
      { key: "tax_rate", value: "8.5" },
      { key: "currency", value: "USD" },
      { key: "low_stock_threshold", value: "10" },
    ];

    const insertedSettings = await db.insert(settings).values(settingsData).returning();
    console.log(`✅ Inserted ${insertedSettings.length} settings`);

    console.log("🎉 Comprehensive sample data insertion completed successfully!");
    console.log("📊 Data includes: products, inventory, customers, suppliers, orders, purchases, expenses, assets, and production schedules");
    
    return {
      categories: insertedCategories.length,
      inventoryCategories: insertedInvCategories.length,
      inventoryItems: insertedInventory.length,
      products: insertedProducts.length,
      productIngredients: insertedIngredients.length,
      customers: insertedCustomers.length,
      parties: insertedParties.length,
      orders: insertedOrders.length,
      orderItems: insertedOrderItems.length,
      purchases: insertedPurchases.length,
      purchaseItems: insertedPurchaseItems.length,
      expenses: insertedExpenses.length,
      assets: insertedAssets.length,
      productionSchedule: insertedSchedule.length,
      settings: insertedSettings.length,
    };
    
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
    throw error;
  }
}