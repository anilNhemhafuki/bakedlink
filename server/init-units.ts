import { db } from "./db";
import { units } from "@shared/schema";

async function initializeUnits() {
  const defaultUnits = [
    { name: "Kilograms", abbreviation: "kg", type: "weight", isActive: true },
    { name: "Grams", abbreviation: "g", type: "weight", isActive: true },
    { name: "Pounds", abbreviation: "lbs", type: "weight", isActive: true },
    { name: "Liters", abbreviation: "L", type: "volume", isActive: true },
    { name: "Milliliters", abbreviation: "ml", type: "volume", isActive: true },
    { name: "Cups", abbreviation: "cups", type: "volume", isActive: true },
    {
      name: "Tablespoons",
      abbreviation: "tbsp",
      type: "volume",
      isActive: true,
    },
    { name: "Teaspoons", abbreviation: "tsp", type: "volume", isActive: true },
    { name: "Pieces", abbreviation: "pcs", type: "count", isActive: true },
    { name: "Packets", abbreviation: "pkt", type: "count", isActive: true },
    { name: "Boxes", abbreviation: "box", type: "count", isActive: true },
    { name: "Bags", abbreviation: "bag", type: "count", isActive: true },
  ];

  try {
    // Check if units already exist
    const existingUnits = await db.select().from(units);

    if (existingUnits.length > 0) {
      return;
    }

    // Insert default units
    const insertedUnits = await db
      .insert(units)
      .values(defaultUnits)
      .returning();
  } catch (error) {
    throw error;
  }
}

// Run if this file is executed directly (ESM-safe check)
if (import.meta.url === process.argv[1]) {
  initializeUnits()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { initializeUnits };
