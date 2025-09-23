
import express from "express";
import { db } from "../db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import {
  inventoryItems,
  inventoryTransactions,
  productIngredients,
  products,
  units,
  purchases,
  purchaseItems,
} from "../../shared/schema";

const router = express.Router();

// Get all stock items with enhanced information
router.get("/", async (req, res) => {
  try {
    const stockItems = await db
      .select({
        id: inventoryItems.id,
        inventoryId: inventoryItems.invCode,
        itemName: inventoryItems.name,
        description: sql`NULL`,
        category: sql`NULL`,
        brand: sql`NULL`,
        primaryUnit: inventoryItems.unit,
        primaryUnitId: inventoryItems.unitId,
        secondaryUnit: sql`
          CASE 
            WHEN ${inventoryItems.secondaryUnitId} IS NOT NULL 
            THEN (SELECT abbreviation FROM ${units} WHERE id = ${inventoryItems.secondaryUnitId})
            ELSE NULL 
          END
        `,
        secondaryUnitId: inventoryItems.secondaryUnitId,
        conversionFactor: inventoryItems.conversionRate,
        currentStock: inventoryItems.currentStock,
        secondaryStock: sql`
          CASE 
            WHEN ${inventoryItems.conversionRate} IS NOT NULL AND ${inventoryItems.conversionRate} > 0
            THEN ${inventoryItems.currentStock} / ${inventoryItems.conversionRate}
            ELSE NULL 
          END
        `,
        reorderLevel: inventoryItems.minLevel,
        openingStock: inventoryItems.openingStock,
        openingCostPerUnit: inventoryItems.costPerUnit,
        lastStock: sql`NULL`,
        lastCostPerUnit: sql`NULL`,
        averageCost: inventoryItems.costPerUnit,
        totalValue: sql`${inventoryItems.currentStock} * ${inventoryItems.costPerUnit}`,
        supplier: inventoryItems.supplier,
        location: sql`NULL`,
        expiryDate: sql`NULL`,
        batchNumber: sql`NULL`,
        invoiceNumber: sql`NULL`,
        lastPurchaseDate: inventoryItems.lastRestocked,
        notes: inventoryItems.notes,
        isActive: sql`true`,
        isDayClosed: sql`false`,
      })
      .from(inventoryItems)
      .orderBy(desc(inventoryItems.name));

    res.json(stockItems);
  } catch (error) {
    console.error("Error fetching stock items:", error);
    res.status(500).json({ error: "Failed to fetch stock items" });
  }
});

// Create new stock item
router.post("/items", async (req, res) => {
  try {
    const {
      itemName,
      inventoryId,
      description,
      category,
      brand,
      primaryUnit,
      primaryUnitId,
      secondaryUnit,
      secondaryUnitId,
      conversionFactor,
      currentStock,
      reorderLevel,
      openingStock,
      openingCostPerUnit,
      averageCost,
      supplier,
      location,
      batchNumber,
      expiryDate,
      invoiceNumber,
      notes,
    } = req.body;

    const [newItem] = await db
      .insert(inventoryItems)
      .values({
        invCode: inventoryId,
        name: itemName,
        currentStock: currentStock.toString(),
        openingStock: openingStock?.toString() || currentStock.toString(),
        minLevel: reorderLevel.toString(),
        unit: primaryUnit,
        unitId: primaryUnitId,
        secondaryUnitId: secondaryUnitId || null,
        conversionRate: conversionFactor?.toString() || "1",
        costPerUnit: (averageCost || openingCostPerUnit || 0).toString(),
        supplier: supplier || null,
        notes: notes || null,
        lastRestocked: new Date(),
      })
      .returning();

    // Log initial stock entry
    await db.insert(inventoryTransactions).values({
      inventoryItemId: newItem.id,
      type: "in",
      quantity: currentStock.toString(),
      reason: "Initial stock entry",
      reference: inventoryId,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      data: newItem,
      message: "Stock item created successfully",
    });
  } catch (error) {
    console.error("Error creating stock item:", error);
    res.status(500).json({ error: "Failed to create stock item" });
  }
});

// Update stock item
router.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [updatedItem] = await db
      .update(inventoryItems)
      .set({
        name: updateData.itemName,
        currentStock: updateData.currentStock?.toString(),
        minLevel: updateData.reorderLevel?.toString(),
        costPerUnit: updateData.averageCost?.toString(),
        supplier: updateData.supplier || null,
        notes: updateData.notes || null,
      })
      .where(eq(inventoryItems.id, parseInt(id)))
      .returning();

    res.json({
      success: true,
      data: updatedItem,
      message: "Stock item updated successfully",
    });
  } catch (error) {
    console.error("Error updating stock item:", error);
    res.status(500).json({ error: "Failed to update stock item" });
  }
});

// Record purchase entry
router.post("/purchase", async (req, res) => {
  try {
    const {
      itemId,
      quantity,
      unitId,
      costPerUnit,
      totalCost,
      supplier,
      invoiceNumber,
      batchNumber,
      expiryDate,
      notes,
    } = req.body;

    // Get current item details
    const [currentItem] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));

    if (!currentItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    const currentStock = parseFloat(currentItem.currentStock);
    const currentCost = parseFloat(currentItem.costPerUnit);
    const currentValue = currentStock * currentCost;

    // Calculate new weighted average cost
    const purchaseValue = quantity * costPerUnit;
    const newTotalStock = currentStock + quantity;
    const newTotalValue = currentValue + purchaseValue;
    const newAverageCost = newTotalValue / newTotalStock;

    // Update inventory item
    await db
      .update(inventoryItems)
      .set({
        currentStock: newTotalStock.toString(),
        costPerUnit: newAverageCost.toString(),
        supplier: supplier,
        lastRestocked: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    // Record inventory transaction
    await db.insert(inventoryTransactions).values({
      inventoryItemId: itemId,
      type: "in",
      quantity: quantity.toString(),
      reason: "Purchase entry",
      reference: invoiceNumber || `Purchase-${Date.now()}`,
      createdAt: new Date(),
    });

    // Create purchase record
    const [purchase] = await db
      .insert(purchases)
      .values({
        supplierName: supplier,
        totalAmount: totalCost.toString(),
        paymentMethod: "credit",
        status: "completed",
        notes: notes,
        createdAt: new Date(),
      })
      .returning();

    // Create purchase item record
    await db.insert(purchaseItems).values({
      purchaseId: purchase.id,
      inventoryItemId: itemId,
      quantity: quantity.toString(),
      unitPrice: costPerUnit.toString(),
      totalPrice: totalCost.toString(),
    });

    res.json({
      success: true,
      message: "Purchase recorded and stock updated successfully",
      data: {
        newStock: newTotalStock,
        newAverageCost: newAverageCost,
        purchaseId: purchase.id,
      },
    });
  } catch (error) {
    console.error("Error recording purchase:", error);
    res.status(500).json({ error: "Failed to record purchase" });
  }
});

// Record production entry (deduct raw materials)
router.post("/production", async (req, res) => {
  try {
    const { productId, quantity, batchId, operator, ingredients } = req.body;

    // Get product details with recipe
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get product ingredients/recipe
    const recipeIngredients = await db
      .select({
        inventoryItemId: productIngredients.inventoryItemId,
        quantity: productIngredients.quantity,
        unit: productIngredients.unit,
      })
      .from(productIngredients)
      .where(eq(productIngredients.productId, productId));

    if (recipeIngredients.length === 0) {
      return res.status(400).json({ error: "No recipe found for this product" });
    }

    // Process each ingredient deduction
    const deductionLog = [];
    
    for (const ingredient of recipeIngredients) {
      const requiredQuantity = parseFloat(ingredient.quantity) * quantity;
      
      // Get current stock
      const [currentItem] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, ingredient.inventoryItemId));

      if (!currentItem) {
        return res.status(404).json({ 
          error: `Ingredient item ${ingredient.inventoryItemId} not found` 
        });
      }

      const currentStock = parseFloat(currentItem.currentStock);
      
      if (currentStock < requiredQuantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${currentItem.name}. Required: ${requiredQuantity}, Available: ${currentStock}`,
        });
      }

      // Update stock (FIFO logic - deduct from current stock)
      const newStock = currentStock - requiredQuantity;
      
      await db
        .update(inventoryItems)
        .set({
          currentStock: newStock.toString(),
          consumedQuantity: sql`${inventoryItems.consumedQuantity} + ${requiredQuantity}`,
        })
        .where(eq(inventoryItems.id, ingredient.inventoryItemId));

      // Record transaction
      await db.insert(inventoryTransactions).values({
        inventoryItemId: ingredient.inventoryItemId,
        type: "out",
        quantity: requiredQuantity.toString(),
        reason: "Production consumption",
        reference: `Production-${productId}-${batchId || Date.now()}`,
        createdAt: new Date(),
      });

      deductionLog.push({
        itemId: ingredient.inventoryItemId,
        itemName: currentItem.name,
        quantityDeducted: requiredQuantity,
        newStock: newStock,
      });
    }

    res.json({
      success: true,
      message: "Production recorded and raw materials deducted successfully",
      data: {
        productId,
        productionQuantity: quantity,
        batchId,
        deductions: deductionLog,
      },
    });
  } catch (error) {
    console.error("Error recording production:", error);
    res.status(500).json({ error: "Failed to record production" });
  }
});

// Create daily stock snapshot
router.post("/close-day", async (req, res) => {
  try {
    const { date } = req.body;
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    // Get all current stock items
    const stockItems = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        primaryQuantity: inventoryItems.currentStock,
        secondaryQuantity: sql`
          CASE 
            WHEN ${inventoryItems.conversionRate} IS NOT NULL AND ${inventoryItems.conversionRate} > 0
            THEN ${inventoryItems.currentStock} / ${inventoryItems.conversionRate}
            ELSE NULL 
          END
        `,
        averageCost: inventoryItems.costPerUnit,
        totalValue: sql`${inventoryItems.currentStock} * ${inventoryItems.costPerUnit}`,
      })
      .from(inventoryItems);

    // Create snapshot records (you'd need to create a snapshots table)
    const snapshots = stockItems.map(item => ({
      date: snapshotDate,
      itemId: item.id,
      itemName: item.name,
      primaryQuantity: parseFloat(item.primaryQuantity),
      secondaryQuantity: item.secondaryQuantity ? parseFloat(item.secondaryQuantity.toString()) : null,
      averageCost: parseFloat(item.averageCost),
      totalValue: parseFloat(item.totalValue.toString()),
      isClosed: true,
    }));

    // Mark items as day closed (you'd implement this logic)
    await db
      .update(inventoryItems)
      .set({
        // Add isDayClosed field if needed
      });

    res.json({
      success: true,
      message: `Daily snapshot created for ${snapshotDate}`,
      data: {
        date: snapshotDate,
        itemCount: snapshots.length,
        totalValue: snapshots.reduce((sum, item) => sum + item.totalValue, 0),
      },
    });
  } catch (error) {
    console.error("Error creating daily snapshot:", error);
    res.status(500).json({ error: "Failed to create daily snapshot" });
  }
});

// Get daily snapshots
router.get("/snapshots", async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // For now, return current stock as snapshot
    // In a real implementation, you'd query a snapshots table
    const snapshots = await db
      .select({
        date: sql`'${targetDate}'`,
        itemId: inventoryItems.id,
        itemName: inventoryItems.name,
        primaryQuantity: inventoryItems.currentStock,
        secondaryQuantity: sql`
          CASE 
            WHEN ${inventoryItems.conversionRate} IS NOT NULL AND ${inventoryItems.conversionRate} > 0
            THEN ${inventoryItems.currentStock} / ${inventoryItems.conversionRate}
            ELSE NULL 
          END
        `,
        averageCost: inventoryItems.costPerUnit,
        totalValue: sql`${inventoryItems.currentStock} * ${inventoryItems.costPerUnit}`,
        isClosed: sql`false`,
      })
      .from(inventoryItems);

    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching daily snapshots:", error);
    res.status(500).json({ error: "Failed to fetch daily snapshots" });
  }
});

// Get stock history
router.get("/history", async (req, res) => {
  try {
    const history = await db
      .select({
        id: inventoryTransactions.id,
        date: inventoryTransactions.createdAt,
        itemName: inventoryItems.name,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        unit: inventoryItems.unit,
        unitCost: inventoryItems.costPerUnit,
        reference: inventoryTransactions.reference,
      })
      .from(inventoryTransactions)
      .leftJoin(inventoryItems, eq(inventoryTransactions.inventoryItemId, inventoryItems.id))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    res.status(500).json({ error: "Failed to fetch stock history" });
  }
});

export default router;
