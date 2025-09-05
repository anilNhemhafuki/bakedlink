
import { db } from "./db";
import { inventoryItems, units } from "../shared/schema";

async function createSampleInventory() {
  try {
    console.log("🏗️ Creating sample inventory items...");

    // Get some units first
    const allUnits = await db.select().from(units).limit(10);
    const kgUnit = allUnits.find(u => u.abbreviation === 'kg') || allUnits[0];
    const pieceUnit = allUnits.find(u => u.abbreviation === 'pcs') || allUnits[1];
    const literUnit = allUnits.find(u => u.abbreviation === 'L') || allUnits[2];

    const sampleItems = [
      {
        invCode: "INV001",
        name: "All Purpose Flour",
        currentStock: "50.00",
        openingStock: "50.00",
        purchasedQuantity: "0.00",
        consumedQuantity: "0.00",
        closingStock: "50.00",
        minLevel: "10.00",
        unit: kgUnit?.abbreviation || "kg",
        unitId: kgUnit?.id || 1,
        costPerUnit: "2.50",
        supplier: "Local Mill",
        isIngredient: true,
        notes: "High quality baking flour",
        lastRestocked: new Date(),
      },
      {
        invCode: "INV002",
        name: "White Sugar",
        currentStock: "25.00",
        openingStock: "25.00",
        purchasedQuantity: "0.00",
        consumedQuantity: "0.00",
        closingStock: "25.00",
        minLevel: "5.00",
        unit: kgUnit?.abbreviation || "kg",
        unitId: kgUnit?.id || 1,
        costPerUnit: "1.80",
        supplier: "Sugar Co.",
        isIngredient: true,
        notes: "Refined white sugar",
        lastRestocked: new Date(),
      },
      {
        invCode: "INV003",
        name: "Butter",
        currentStock: "15.00",
        openingStock: "15.00",
        purchasedQuantity: "0.00",
        consumedQuantity: "0.00",
        closingStock: "15.00",
        minLevel: "3.00",
        unit: kgUnit?.abbreviation || "kg",
        unitId: kgUnit?.id || 1,
        costPerUnit: "8.50",
        supplier: "Dairy Farm",
        isIngredient: true,
        notes: "Fresh unsalted butter",
        lastRestocked: new Date(),
      },
      {
        invCode: "INV004",
        name: "Whole Milk",
        currentStock: "10.00",
        openingStock: "10.00",
        purchasedQuantity: "0.00",
        consumedQuantity: "0.00",
        closingStock: "10.00",
        minLevel: "2.00",
        unit: literUnit?.abbreviation || "L",
        unitId: literUnit?.id || 3,
        costPerUnit: "1.20",
        supplier: "Dairy Farm",
        isIngredient: true,
        notes: "Fresh whole milk",
        lastRestocked: new Date(),
      },
      {
        invCode: "INV005",
        name: "Chicken Eggs",
        currentStock: "100.00",
        openingStock: "100.00",
        purchasedQuantity: "0.00",
        consumedQuantity: "0.00",
        closingStock: "100.00",
        minLevel: "20.00",
        unit: pieceUnit?.abbreviation || "pcs",
        unitId: pieceUnit?.id || 2,
        costPerUnit: "0.25",
        supplier: "Poultry Farm",
        isIngredient: true,
        notes: "Large fresh eggs",
        lastRestocked: new Date(),
      },
    ];

    // Check if items already exist
    const existingItems = await db.select().from(inventoryItems).limit(1);
    
    if (existingItems.length === 0) {
      console.log("🔧 No existing items found, creating sample data...");
      const insertedItems = await db.insert(inventoryItems).values(sampleItems).returning();
      console.log(`✅ Created ${insertedItems.length} sample inventory items`);
      
      insertedItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.currentStock} ${item.unit}`);
      });
    } else {
      console.log(`✅ Found ${existingItems.length} existing inventory items, skipping sample data creation`);
    }

  } catch (error) {
    console.error("❌ Error creating sample inventory:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createSampleInventory()
    .then(() => {
      console.log("🎉 Sample inventory creation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed to create sample inventory:", error);
      process.exit(1);
    });
}

export { createSampleInventory };
