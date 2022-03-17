export class Calculations {

    /**
     * Computes percent value from the originalValue by the percentRate
     * 
     * @param originalValue
     * @param percentRate
     */
    public static computePercentValueOfNumber(originalValue: number, percentRate: number): number {
        const decimalPercentRate = percentRate / 100;
        return originalValue * decimalPercentRate;
    }

    /**
     * Removes tax value from the originalValue by the taxRate
     * 
     * @param originalValue
     * @param taxRate
     */
    public static removeTaxFromSumIncludingTax(originalValue: number, taxRate: number): number {
        const decimalTaxRate = taxRate / 100;
        return originalValue / (1 + decimalTaxRate);
    }
}
