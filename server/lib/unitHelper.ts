
export class UnitHelper {
  /**
   * Convert quantity from secondary unit to primary unit
   */
  static convertSecondaryToPrimary(
    secondaryQuantity: number,
    conversionRate: number
  ): number {
    return secondaryQuantity * conversionRate;
  }

  /**
   * Convert quantity from primary unit to secondary unit
   */
  static convertPrimaryToSecondary(
    primaryQuantity: number,
    conversionRate: number
  ): number {
    return primaryQuantity / conversionRate;
  }

  /**
   * Get display string for dual units
   */
  static getUnitDisplayString(
    primaryQuantity: number,
    primaryUnit: string,
    secondaryQuantity?: number,
    secondaryUnit?: string
  ): string {
    let display = `${primaryQuantity} ${primaryUnit}`;
    if (secondaryQuantity !== undefined && secondaryUnit) {
      display += ` (${secondaryQuantity} ${secondaryUnit})`;
    }
    return display;
  }

  /**
   * Calculate stock in both units
   */
  static calculateDualUnitStock(
    primaryStock: number,
    conversionRate: number
  ): {
    primaryStock: number;
    secondaryStock: number;
  } {
    return {
      primaryStock,
      secondaryStock: this.convertPrimaryToSecondary(primaryStock, conversionRate),
    };
  }
}
