import { db } from "./db";
import { 
  categories, 
  products, 
  inventoryItems, 
  inventoryCategories,
  customers, 
  parties, 
  units,
  purchases,
  purchaseItems,
  orders,
  orderItems,
  productIngredients,
  productionSchedule,
  expenses,
  assets
} from "../shared/schema";

export async function insertSampleData() {
  console.log("🎯 Inserting comprehensive sample data...");

  try {
    // Categories
    const categoryData = [
      { name: "Cakes", description: "Birthday, wedding, and specialty cakes" },
      { name: "Pastries", description: "Croissants, danishes, and sweet pastries" },
      { name: "Bread", description: "Fresh baked breads and rolls" },
      { name: "Cookies", description: "Assorted cookies and biscuits" },
      { name: "Desserts", description: "Puddings, tarts, and specialty desserts" }
    ];

    const insertedCategories = await db.insert(categories).values(categoryData).returning();
    console.log("✅ Categories inserted");

    // Inventory Categories
    const invCategoryData = [
      { name: "Flour & Grains", description: "Basic baking ingredients" },
      { name: "Dairy Products", description: "Milk, butter, cheese products" },
      { name: "Sweeteners", description: "Sugar, honey, artificial sweeteners" },
      { name: "Spices & Flavoring", description: "Vanilla, cinnamon, extracts" },
      { name: "Packaging", description: "Boxes, bags, wrapping materials" }
    ];

    const insertedInvCategories = await db.insert(inventoryCategories).values(invCategoryData).returning();
    console.log("✅ Inventory categories inserted");

    // Inventory Items
    const inventoryData = [
      {
        name: "All-Purpose Flour",
        currentStock: 500,
        minLevel: 50,
        unit: "kg",
        costPerUnit: 2.50,
        supplier: "Grain Mills Ltd",
        categoryId: insertedInvCategories[0].id,
        lastRestocked: new Date()
      },
      {
        name: "Unsalted Butter",
        currentStock: 75,
        minLevel: 20,
        unit: "kg", 
        costPerUnit: 8.50,
        supplier: "Dairy Fresh Co",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date()
      },
      {
        name: "Granulated Sugar",
        currentStock: 200,
        minLevel: 30,
        unit: "kg",
        costPerUnit: 1.80,
        supplier: "Sweet Supply Inc",
        categoryId: insertedInvCategories[2].id,
        lastRestocked: new Date()
      },
      {
        name: "Large Eggs",
        currentStock: 120,
        minLevel: 24,
        unit: "dozen",
        costPerUnit: 3.20,
        supplier: "Farm Fresh Eggs",
        categoryId: insertedInvCategories[1].id,
        lastRestocked: new Date()
      },
      {
        name: "Vanilla Extract",
        currentStock: 12,
        minLevel: 3,
        unit: "bottles",
        costPerUnit: 15.00,
        supplier: "Flavor Masters",
        categoryId: insertedInvCategories[3].id,
        lastRestocked: new Date()
      },
      {
        name: "Cake Boxes (Small)",
        currentStock: 500,
        minLevel: 100,
        unit: "pieces",
        costPerUnit: 0.75,
        supplier: "Package Pro",
        categoryId: insertedInvCategories[4].id,
        lastRestocked: new Date()
      }
    ];

    const insertedInventory = await db.insert(inventoryItems).values(inventoryData).returning();
    console.log("✅ Inventory items inserted");

    // Products with realistic cost calculations
    const productData = [
      {
        name: "Chocolate Birthday Cake",
        description: "Rich chocolate cake with buttercream frosting",
        categoryId: insertedCategories[0].id,
        price: 35.00,
        cost: 18.50, // Material + labor + overhead
        margin: 47.14,
        sku: "CHOC-CAKE-001",
        isActive: true
      },
      {
        name: "Vanilla Cupcakes (6-pack)",
        description: "Classic vanilla cupcakes with vanilla frosting",
        categoryId: insertedCategories[0].id,
        price: 12.00,
        cost: 6.80,
        margin: 43.33,
        sku: "VAN-CUP-006",
        isActive: true
      },
      {
        name: "Croissants (Pack of 4)",
        description: "Buttery, flaky French croissants",
        categoryId: insertedCategories[1].id,
        price: 8.50,
        cost: 4.20,
        margin: 50.59,
        sku: "CROISS-004",
        isActive: true
      },
      {
        name: "Sourdough Bread Loaf",
        description: "Artisan sourdough bread, freshly baked",
        categoryId: insertedCategories[2].id,
        price: 6.00,
        cost: 2.80,
        margin: 53.33,
        sku: "SOUR-BREAD",
        isActive: true
      },
      {
        name: "Chocolate Chip Cookies (Dozen)",
        description: "Classic homemade chocolate chip cookies",
        categoryId: insertedCategories[3].id,
        price: 9.00,
        cost: 4.50,
        margin: 50.00,
        sku: "CHOC-COOK-12",
        isActive: true
      }
    ];

    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log("✅ Products inserted");

    // Product Ingredients (for cost calculation)
    const ingredientData = [
      // Chocolate Birthday Cake ingredients
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[0].id, quantity: 0.5, unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[1].id, quantity: 0.25, unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[2].id, quantity: 0.3, unit: "kg" },
      { productId: insertedProducts[0].id, inventoryItemId: insertedInventory[3].id, quantity: 0.5, unit: "dozen" },
      
      // Vanilla Cupcakes ingredients
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[0].id, quantity: 0.2, unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[1].id, quantity: 0.1, unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[2].id, quantity: 0.15, unit: "kg" },
      { productId: insertedProducts[1].id, inventoryItemId: insertedInventory[4].id, quantity: 0.05, unit: "bottles" }
    ];

    await db.insert(productIngredients).values(ingredientData);
    console.log("✅ Product ingredients inserted");

    // Customers
    const customerData = [
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0123",
        address: "123 Maple Street, Downtown",
        totalOrders: 0,
        totalSpent: 0,
        isActive: true
      },
      {
        name: "Mike Chen",
        email: "mike.chen@email.com", 
        phone: "+1-555-0124",
        address: "456 Oak Avenue, Midtown",
        totalOrders: 0,
        totalSpent: 0,
        isActive: true
      },
      {
        name: "Emma Davis",
        email: "emma.davis@email.com",
        phone: "+1-555-0125", 
        address: "789 Pine Road, Uptown",
        totalOrders: 0,
        totalSpent: 0,
        isActive: true
      }
    ];

    const insertedCustomers = await db.insert(customers).values(customerData).returning();
    console.log("✅ Customers inserted");

    // Suppliers (Parties)
    const supplierData = [
      {
        name: "Grain Mills Ltd",
        type: "supplier",
        contactPerson: "John Smith",
        email: "orders@grainmills.com",
        phone: "+1-555-1001",
        address: "100 Industrial Way, Grain City",
        balance: 0,
        isActive: true
      },
      {
        name: "Dairy Fresh Co",
        type: "supplier", 
        contactPerson: "Lisa Brown",
        email: "supply@dairyfresh.com",
        phone: "+1-555-1002",
        address: "200 Farm Road, Dairy Valley",
        balance: 0,
        isActive: true
      },
      {
        name: "Sweet Supply Inc",
        type: "supplier",
        contactPerson: "Robert Wilson",
        email: "sales@sweetsupply.com",
        phone: "+1-555-1003", 
        address: "300 Sugar Lane, Sweet Town",
        balance: 0,
        isActive: true
      }
    ];

    const insertedSuppliers = await db.insert(parties).values(supplierData).returning();
    console.log("✅ Suppliers inserted");

    // Sample Orders
    const orderData = [
      {
        customerName: "Sarah Johnson",
        customerId: insertedCustomers[0].id,
        customerEmail: "sarah.johnson@email.com",
        customerPhone: "+1-555-0123",
        totalAmount: 47.00,
        status: "completed",
        paymentMethod: "credit_card",
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        notes: "Birthday party order - please add 'Happy Birthday Sarah!' message"
      },
      {
        customerName: "Mike Chen",
        customerId: insertedCustomers[1].id,
        customerEmail: "mike.chen@email.com",
        customerPhone: "+1-555-0124",
        totalAmount: 20.50,
        status: "pending",
        paymentMethod: "cash",
        deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        notes: "Office breakfast order"
      }
    ];

    const insertedOrders = await db.insert(orders).values(orderData).returning();
    console.log("✅ Orders inserted");

    // Order Items
    const orderItemData = [
      // Sarah's order
      {
        orderId: insertedOrders[0].id,
        productId: insertedProducts[0].id,
        quantity: 1,
        unitPrice: 35.00,
        totalPrice: 35.00
      },
      {
        orderId: insertedOrders[0].id,
        productId: insertedProducts[1].id,
        quantity: 1,
        unitPrice: 12.00,
        totalPrice: 12.00
      },
      // Mike's order
      {
        orderId: insertedOrders[1].id,
        productId: insertedProducts[2].id,
        quantity: 2,
        unitPrice: 8.50,
        totalPrice: 17.00
      }
    ];

    await db.insert(orderItems).values(orderItemData);
    console.log("✅ Order items inserted");

    // Sample Purchases
    const purchaseData = [
      {
        supplierName: "Grain Mills Ltd",
        partyId: insertedSuppliers[0].id,
        totalAmount: 1250.00,
        paymentMethod: "bank_transfer",
        status: "completed",
        invoiceNumber: "GM-2024-001",
        notes: "Monthly flour supply",
        purchaseDate: new Date()
      },
      {
        supplierName: "Dairy Fresh Co", 
        partyId: insertedSuppliers[1].id,
        totalAmount: 637.50,
        paymentMethod: "credit",
        status: "pending",
        invoiceNumber: "DF-2024-015",
        notes: "Weekly dairy products",
        purchaseDate: new Date()
      }
    ];

    const insertedPurchases = await db.insert(purchases).values(purchaseData).returning();
    console.log("✅ Purchases inserted");

    // Purchase Items
    const purchaseItemData = [
      // Grain Mills purchase
      {
        purchaseId: insertedPurchases[0].id,
        inventoryItemId: insertedInventory[0].id,
        quantity: 500,
        unitPrice: 2.50,
        totalPrice: 1250.00
      },
      // Dairy Fresh purchase  
      {
        purchaseId: insertedPurchases[1].id,
        inventoryItemId: insertedInventory[1].id,
        quantity: 75,
        unitPrice: 8.50,
        totalPrice: 637.50
      }
    ];

    await db.insert(purchaseItems).values(purchaseItemData);
    console.log("✅ Purchase items inserted");

    // Production Schedule
    const productionData = [
      {
        productId: insertedProducts[0].id,
        quantity: 5,
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        status: "scheduled",
        notes: "Morning batch for weekend orders"
      },
      {
        productId: insertedProducts[2].id,
        quantity: 20,
        scheduledDate: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "in_progress",
        notes: "Daily morning croissants"
      }
    ];

    await db.insert(productionSchedule).values(productionData);
    console.log("✅ Production schedule inserted");

    // Expenses
    const expenseData = [
      {
        description: "Monthly rent for bakery space",
        amount: 2500.00,
        category: "rent",
        date: new Date(),
        paymentMethod: "bank_transfer",
        vendor: "Commercial Real Estate LLC"
      },
      {
        description: "Utility bill - electricity",
        amount: 350.00,
        category: "utilities",
        date: new Date(),
        paymentMethod: "auto_debit",
        vendor: "City Power Company"
      },
      {
        description: "Insurance premium",
        amount: 450.00,
        category: "insurance", 
        date: new Date(),
        paymentMethod: "credit_card",
        vendor: "Business Insurance Co"
      }
    ];

    await db.insert(expenses).values(expenseData);
    console.log("✅ Expenses inserted");

    // Assets
    const assetData = [
      {
        name: "Commercial Oven - Model XL2000",
        category: "equipment",
        purchasePrice: 15000.00,
        currentValue: 12000.00,
        purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        condition: "excellent",
        location: "Main kitchen",
        isActive: true
      },
      {
        name: "Stand Mixer - Industrial KM500", 
        category: "equipment",
        purchasePrice: 2500.00,
        currentValue: 2000.00,
        purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
        condition: "good",
        location: "Prep area",
        isActive: true
      },
      {
        name: "Refrigerated Display Case",
        category: "equipment",
        purchasePrice: 8500.00,
        currentValue: 7500.00,
        purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
        condition: "excellent",
        location: "Front store",
        isActive: true
      }
    ];

    await db.insert(assets).values(assetData);
    console.log("✅ Assets inserted");

    console.log("🎉 All sample data inserted successfully!");

  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
    throw error;
  }
}