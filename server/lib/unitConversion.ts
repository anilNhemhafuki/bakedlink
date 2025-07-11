import { storage } from "./storage";

/**
 * Unit conversion utility for cost calculations
 */
export class UnitConversionCalculator {
  private static instance: UnitConversionCalculator;
  private conversions: any[] = [];
  private units: any[] = [];

  private constructor() {}

  public static getInstance(): UnitConversionCalculator {
    if (!UnitConversionCalculator.instance) {
      UnitConversionCalculator.instance = new UnitConversionCalculator();
    }
    return UnitConversionCalculator.instance;
  }

  /**
   * Load conversion data from database
   */
  async loadConversions(): Promise<void> {
    try {
      this.conversions = await storage.getUnitConversions();
      this.units = await storage.getUnits();
    } catch (error) {
      console.error("Error loading unit conversions:", error);
    }
  }

  /**
   * Convert quantity from one unit to another
   */
  async convertQuantity(
    fromQuantity: number,
    fromUnitId: number,
    toUnitId: number
  ): Promise<number> {
    // If same unit, return original quantity
    if (fromUnitId === toUnitId) {
      return fromQuantity;
    }

    await this.loadConversions();

    // Find direct conversion
    const directConversion = this.conversions.find(
      (c: any) => c.fromUnitId === fromUnitId && c.toUnitId === toUnitId && c.isActive
    );

    if (directConversion) {
      return fromQuantity * parseFloat(directConversion.conversionFactor);
    }

    // Find reverse conversion
    const reverseConversion = this.conversions.find(
      (c: any) => c.fromUnitId === toUnitId && c.toUnitId === fromUnitId && c.isActive
    );

    if (reverseConversion) {
      return fromQuantity / parseFloat(reverseConversion.conversionFactor);
    }

    // Try to find conversion through base units
    const fromUnit = this.units.find((u: any) => u.id === fromUnitId);
    const toUnit = this.units.find((u: any) => u.id === toUnitId);

    if (fromUnit && toUnit && fromUnit.baseUnit && toUnit.baseUnit && fromUnit.baseUnit === toUnit.baseUnit) {
      // Convert from source unit to base unit
      const fromConversionFactor = parseFloat(fromUnit.conversionFactor) || 1;
      const toConversionFactor = parseFloat(toUnit.conversionFactor) || 1;
      
      // Convert to base unit first, then to target unit
      const baseQuantity = fromQuantity * fromConversionFactor;
      return baseQuantity / toConversionFactor;
    }

    throw new Error(`No conversion found from unit ${fromUnitId} to unit ${toUnitId}`);
  }

  /**
   * Calculate product cost based on ingredients with unit conversions
   */
  async calculateProductCost(productId: number): Promise<{
    totalCost: number;
    ingredientCosts: Array<{
      ingredientId: number;
      ingredientName: string;
      quantity: number;
      unit: string;
      costPerUnit: number;
      totalCost: number;
      conversionUsed?: boolean;
    }>;
  }> {
    const ingredients = await storage.getProductIngredients(productId);
    const inventoryItems = await storage.getInventoryItems();
    
    let totalCost = 0;
    const ingredientCosts: any[] = [];

    for (const ingredient of ingredients) {
      const inventoryItem = inventoryItems.find((item: any) => item.id === ingredient.inventoryItemId);
      
      if (!inventoryItem) {
        console.warn(`Inventory item not found for ingredient ${ingredient.id}`);
        continue;
      }

      const requiredQuantity = parseFloat(ingredient.quantity);
      const ingredientUnit = ingredient.unit;
      const inventoryUnit = inventoryItem.unit;
      const costPerUnit = parseFloat(inventoryItem.costPerUnit);

      let convertedQuantity = requiredQuantity;
      let conversionUsed = false;

      // If units are different, try to convert
      if (ingredientUnit !== inventoryUnit) {
        try {
          // Find unit IDs
          const ingredientUnitData = this.units.find((u: any) => u.name === ingredientUnit || u.abbreviation === ingredientUnit);
          const inventoryUnitData = this.units.find((u: any) => u.name === inventoryUnit || u.abbreviation === inventoryUnit);

          if (ingredientUnitData && inventoryUnitData) {
            convertedQuantity = await this.convertQuantity(
              requiredQuantity,
              ingredientUnitData.id,
              inventoryUnitData.id
            );
            conversionUsed = true;
          } else {
            console.warn(`Could not find unit data for conversion from ${ingredientUnit} to ${inventoryUnit}`);
          }
        } catch (error) {
          console.warn(`Unit conversion failed for ${ingredientUnit} to ${inventoryUnit}:`, error);
        }
      }

      const ingredientCost = convertedQuantity * costPerUnit;
      totalCost += ingredientCost;

      ingredientCosts.push({
        ingredientId: ingredient.id,
        ingredientName: inventoryItem.name,
        quantity: convertedQuantity,
        unit: inventoryUnit,
        costPerUnit: costPerUnit,
        totalCost: ingredientCost,
        conversionUsed
      });
    }

    return {
      totalCost,
      ingredientCosts
    };
  }

  /**
   * Update product cost automatically based on ingredient costs
   */
  async updateProductCost(productId: number): Promise<void> {
    try {
      const costCalculation = await this.calculateProductCost(productId);
      
      // Update product cost in database
      await storage.updateProduct(productId, {
        cost: costCalculation.totalCost.toString()
      });

      console.log(`Updated product ${productId} cost to ${costCalculation.totalCost}`);
    } catch (error) {
      console.error(`Failed to update product ${productId} cost:`, error);
    }
  }

  /**
   * Get available conversions for a unit
   */
  async getAvailableConversions(unitId: number): Promise<any[]> {
    await this.loadConversions();
    
    return this.conversions.filter(
      (c: any) => (c.fromUnitId === unitId || c.toUnitId === unitId) && c.isActive
    );
  }
}

export const unitConverter = UnitConversionCalculator.getInstance();