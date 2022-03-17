import { Calculations } from '../../helpers/Calculations';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { BillingDatesCalculator } from './BillingDatesCalculator';

export class OrderInvoiceItemCalculations {

    /**
     * ODN-1542 Subtotal = UnitPrice * Quantity
     * @param item
     */
    public static computeItemSubtotal(item: DbRecordEntityTransform): string {
        const subtotal = Number(item.properties.UnitPrice) * Number(item.properties.Quantity);
        return subtotal.toPrecision(3);
    }

    /**
     * ODN-1542 Computes item level discount amount from the Subtotal.
     * 
     * If itemPeriodType === FREE, overrides to DiscoutType = 'PERCENT' and DiscountValue = 100.00
     * 
     * @param item
     * @param itemPeriodType
     */
    private static computeItemDiscountAmount(item: DbRecordEntityTransform, itemPeriodType: string): string {
        let totalDiscounts = 0;
        const lineItemSubtotal = Number(this.computeItemSubtotal(item));

        // ODN-1542 override discount settings if it is a FREE period
        //   we have to do it here because we don't save an overridden 
        //   discount settings to an order item anymore
        const { discountType, discountValue } = this.getDiscountSettingsByPeriodType(
            itemPeriodType,
            item.properties.DiscountType,
            item.properties.DiscountValue
        );

        if(discountType === 'PERCENT') {
            const lineItemDiscountValue = Calculations.computePercentValueOfNumber(
                lineItemSubtotal,
                Number(discountValue),
            );
            totalDiscounts = totalDiscounts + lineItemDiscountValue;
        } else if(discountType === 'AMOUNT') {
            totalDiscounts = totalDiscounts + Number(discountValue);
        }
        return totalDiscounts.toPrecision(3);
    }


    /**
     * ODN-1542 Compute Subtotal with discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param item
     * @param orderDiscount
     * @param itemPeriodType
     * @param orderInvoicePeriodType
     */
    public static computeItemPreTaxTotalPrice(
        item: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        itemPeriodType: string,
        orderInvoicePeriodType: string,
    ): string {
        const lineItemSubtotal = this.computeItemSubtotal(item);
        const itemPlusOrderTotalDiscounts = this.computeItemPlusOrderTotalDiscounts(item, orderDiscount, itemPeriodType, orderInvoicePeriodType);

        const sum = Number(lineItemSubtotal) - Number(itemPlusOrderTotalDiscounts);
        return sum.toPrecision(10);
    }

    /**
     * ODN-1542 Compute item level discounts + order level discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item
     * 
     * 
     * @param item
     * @param orderDiscount
     * @param itemPeriodType
     * @param orderOrInvoicePeriodType
     */
    public static computeItemPlusOrderTotalDiscounts(
        item: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        itemPeriodType: string,
        orderOrInvoicePeriodType: string,
    ): string {
        let sum = 0;

        const lineItemSubtotal = this.computeItemSubtotal(item);
        const lineItemDiscounts = this.computeItemDiscountAmount(item, itemPeriodType);
        
        let adjItemSubtotalWithDiscounts = Number(lineItemSubtotal);

        const isRemoveItemDiscountPeriod = this.checkIsRemoveDiscountPeriod(itemPeriodType);
        if (!isRemoveItemDiscountPeriod) {
            adjItemSubtotalWithDiscounts -= Number(lineItemDiscounts);
            sum += Number(lineItemDiscounts);
        }
        
        const lineItemOrderDiscounts = this.computeItemOrderDiscountAmount(item, orderDiscount, adjItemSubtotalWithDiscounts, orderOrInvoicePeriodType);

        const isRemoveOrderOrInvoiceDiscountPeriod= this.checkIsRemoveDiscountPeriod(orderOrInvoicePeriodType);
        if (!isRemoveOrderOrInvoiceDiscountPeriod) {
            sum += Number(lineItemOrderDiscounts);
            if (orderDiscount?.DiscountType === 'AMOUNT') {
                // ODN-1660 reduce the order level AMOUNT discount value on the substracted amount
                orderDiscount.DiscountValue = (Number(orderDiscount.DiscountValue) - Number(lineItemOrderDiscounts)).toPrecision(10);
            }
        }

        return sum.toPrecision(10);
    }


    /**
     * ODN-1542 Computes order level discount from the item Subtotal with discounts 
     * 
     * If orderOrInvoicePeriodType === FREE, overrides to DiscoutType = 'PERCENT' and DiscountValue = 100.00
     * 
     * @param item
     * @param orderDiscount
     * @param adjItemSubtotalWithDiscounts
     * @param orderOrInvoicePeriodType
     */
    private static computeItemOrderDiscountAmount(
        item: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        adjItemSubtotalWithDiscounts: number,
        orderOrInvoicePeriodType: string,
    ): string {
        let totalOrderDiscounts = 0;
        if (orderDiscount) {
            
            // This should be configurable by the user
            let applyOrderDiscountAfterOrderItemDiscount = true;
            if (applyOrderDiscountAfterOrderItemDiscount) {

                // ODN-1660 do not apply order level discounts if the subtotal is below zero
                if (adjItemSubtotalWithDiscounts > 0) {
                    // ODN-1542 override discount settings if it is a FREE period
                    const { discountType, discountValue } = this.getDiscountSettingsByPeriodType(
                        orderOrInvoicePeriodType,
                        orderDiscount?.DiscountType,
                        orderDiscount?.DiscountValue,
                    );

                    // should add the order discount after the line item discounts are applied
                    if(discountType === 'PERCENT') {
                        const appliedOrderDiscountAmount = Calculations.computePercentValueOfNumber(
                            adjItemSubtotalWithDiscounts,
                            Number(discountValue),
                        );
                        totalOrderDiscounts = totalOrderDiscounts + appliedOrderDiscountAmount;
                    } else if(discountType === 'AMOUNT') {

                        // ODN-1660 subtract the order level AMOUNT discount value but no more than adjItemSubtotalWithDiscounts
                        if (adjItemSubtotalWithDiscounts > Number(discountValue)) {
                            totalOrderDiscounts = totalOrderDiscounts + Number(discountValue);
                        } else {
                            totalOrderDiscounts = totalOrderDiscounts + adjItemSubtotalWithDiscounts;
                        }
                    }
                }
            } else {

                // should add order discount  + the line item discount before deducting from each line item
            }
        }
        return totalOrderDiscounts.toPrecision(10);
    }


    /**
     * ODN-1542 Computes taxes from the subtotal with discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param item
     * @param orderDiscount
     * @param itemPeriodType
     * @param orderOrInvoicePeriodType
     */
    public static computeItemTotalTaxAmount(
        item: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        itemPeriodType: string,
        orderOrInvoicePeriodType: string,
    ): string {
        let totalTaxes = 0;
        // This should be configurable by the user
        let applyOrderDiscountAfterLineItemDiscount = true;
        if(applyOrderDiscountAfterLineItemDiscount) {
            const preTaxTotal = this.computeItemPreTaxTotalPrice(item, orderDiscount, itemPeriodType, orderOrInvoicePeriodType);
            if(item.properties.Taxable === 'YES' && item.properties.TaxIncluded === 'NO') {
                totalTaxes = totalTaxes + Calculations.computePercentValueOfNumber(
                    Number(preTaxTotal),
                    item.properties.TaxRate,
                );
            } else if (item.properties.Taxable === 'YES' && item.properties.TaxIncluded === 'YES') {
                const excludingTaxTotal = Calculations.removeTaxFromSumIncludingTax(
                    Number(preTaxTotal),
                    item.properties.TaxRate,
                );
                totalTaxes = totalTaxes + Number(preTaxTotal) - excludingTaxTotal;
            }
        }
        return totalTaxes.toPrecision(10);
    }

    /**
     * ODN-1542 Computes item TotalPrice inclusive discounts and taxes 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param item
     * @param orderDiscount
     * @param itemPeriodType
     * @param orderOrInvoicePeriodType
     */
    public static computeItemTotalPrice(
        item: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        itemPeriodType: string,
        orderOrInvoicePeriodType: string,
    ): string {
        const lineItemTaxAmount = Number(this.computeItemTotalTaxAmount(
            item, 
            {   // pass the orderDiscount copy to avoid the double DiscountValue reducing
                DiscountType: orderDiscount?.DiscountType,
                DiscountValue: orderDiscount?.DiscountValue,
            }, 
            itemPeriodType, 
            orderOrInvoicePeriodType,
        ));
        const lineItemPreTaxTotal = Number(this.computeItemPreTaxTotalPrice(item, orderDiscount, itemPeriodType, orderOrInvoicePeriodType));
        
        let sum = lineItemPreTaxTotal;
        if (item.properties.Taxable === 'YES' && item.properties.TaxIncluded === 'NO') {
            sum += lineItemTaxAmount;
        }

        return Number(sum.toPrecision(10)).toFixed(2);
    }

    /**
     * ODN-1542 Computes item TotalPrice inclusive discounts and taxes 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param itemPeriodType 
     * @param item 
     * @param orderOrInvoice 
     * @param orderDiscount 
     * @param overriddenCurrentDate
     * @returns 
     */
    public static computeAdjustedItemTotalPriceForPeriodType(
        itemPeriodType: string,
        item: DbRecordEntityTransform,
        orderOrInvoice: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        overriddenCurrentDate?: string,
    ): string {
        const removeItemDiscountPeriod = this.checkIsRemoveDiscountPeriod(itemPeriodType);
        if (removeItemDiscountPeriod === undefined) {
            return item.properties?.TotalPrice;
        }
        else {
            // calculate current trial / discount period type for order / invoice
            const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);
            return this.computeItemTotalPrice(item, orderDiscount, itemPeriodType, currentOrderOrInvoicePeriod.periodType);
        }
    }

    /**
     * ODN-1542 Computes taxes from the subtotal with discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param itemPeriodType 
     * @param item 
     * @param orderOrInvoice 
     * @param orderDiscount 
     * @param overriddenCurrentDate
     * @returns 
     */
    public static computeAdjustedItemTotalTaxAmountForPeriodType(
        itemPeriodType: string,
        item: DbRecordEntityTransform,
        orderOrInvoice: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        overriddenCurrentDate?: string,
    ): string {
        const removeItemDiscountPeriod = this.checkIsRemoveDiscountPeriod(itemPeriodType);
        if (removeItemDiscountPeriod === undefined) {
            return item.properties?.TotalPrice;
        }
        else {
            // calculate current trial / discount period type for order / invoice
            const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);
            return Number(this.computeItemTotalTaxAmount(item, orderDiscount, itemPeriodType, currentOrderOrInvoicePeriod.periodType)).toFixed(2);
        }
    }

    /**
     * ODN-1542 Compute Subtotal with discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param itemPeriodType 
     * @param item 
     * @param orderOrInvoice 
     * @param orderDiscount 
     * @param overriddenCurrentDate
     * @returns 
     */
     public static computeAdjustedItemPreTaxTotalPriceForPeriodType(
        itemPeriodType: string,
        item: DbRecordEntityTransform,
        orderOrInvoice: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        overriddenCurrentDate?: string,
    ): string {
        const removeItemDiscountPeriod = this.checkIsRemoveDiscountPeriod(itemPeriodType);
        if (removeItemDiscountPeriod === undefined) {
            return item.properties?.TotalPrice;
        }
        else {
            // calculate current trial / discount period type for order / invoice
            const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);
            return Number(this.computeItemPreTaxTotalPrice(item, orderDiscount, itemPeriodType, currentOrderOrInvoicePeriod.periodType)).toFixed(2);
        }
    }

    /**
     * ODN-1542 Compute item level discounts + order level discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and reduces the order level AMOUNT discount value to use it in the next item 
     * 
     * @param itemPeriodType 
     * @param item 
     * @param orderOrInvoice 
     * @param orderDiscount 
     * @param overriddenCurrentDate
     * @returns 
     */
     public static computeAdjustedItemTotalDiscountsForPeriodType(
        itemPeriodType: string,
        item: DbRecordEntityTransform,
        orderOrInvoice: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
        overriddenCurrentDate?: string,
    ): string {
        const removeItemDiscountPeriod = this.checkIsRemoveDiscountPeriod(itemPeriodType);
        if (removeItemDiscountPeriod === undefined) {
            return item.properties?.TotalPrice;
        }
        else {
            // calculate current trial / discount period type for order / invoice
            const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);
            return Number(this.computeItemPlusOrderTotalDiscounts(item, orderDiscount, itemPeriodType, currentOrderOrInvoicePeriod.periodType)).toFixed(2);
        }
    }

    /**
     * ODN-1942 Determines if needs to remove discount according to periodType
     * 
     * @param periodType 
     */
     public static checkIsRemoveDiscountPeriod(periodType: string | undefined): boolean {
        if (!periodType) {
            // if period type is not specified do not remove the discount
            return false;
        } else if(periodType === 'DISCOUNT' || periodType === 'FREE') {
            // do not remove the discount if the period is FREE | DISCOUNT
            return false;            
        } else if(periodType === 'STANDARD') {
            // remove the discount when FREE | DISCOUNT periods end
            return true;
        }
    }

    /**
     * ODN-1542 Returns dicountType:'PERCENT' and dicountValue:'100.00' if it is a FREE period 
     * and original discount settings otherwise
     * 
     * @param periodType 
     * @param originalDiscountType 
     * @param originalDiscountValue 
     * @returns 
     */
    public static getDiscountSettingsByPeriodType(
        periodType: string, 
        originalDiscountType: string,
        originalDiscountValue: string,
    ) {
        if(periodType === 'FREE') {
            return { discountType: 'PERCENT', discountValue: '100.00' };
        } else if(periodType === 'DISCOUNT') {
            return { discountType: originalDiscountType, discountValue: originalDiscountValue };
        } else {
            // returns the default discount settings
            return { discountType: originalDiscountType, discountValue: originalDiscountValue };
        }

    }

    /**
     * ODN-1660 Places the BASE_PRODUCT at the beginning then sort items by the UnitPrice descending 
     * @param items 
     * @returns 
     */
    public static sortItemsByProductTypeAndPrice(items: DbRecordEntityTransform[]): DbRecordEntityTransform[] {
        if (!items || items.length < 2) {
            return items;
        }
        return items.sort((item1, item2) => {
            if (item1.properties.ProductType === 'BASE_PRODUCT' && item2.properties.ProductType !== 'BASE_PRODUCT') {
                return -1;
            } else if (item1.properties.ProductType !== 'BASE_PRODUCT' && item2.properties.ProductType === 'BASE_PRODUCT') {
                return 1;
            } else if (item1.properties.Type === 'ADJUSTMENT' && item2.properties.Type !== 'ADJUSTMENT') {
                return 1;
            } else if (item1.properties.Type !== 'ADJUSTMENT' && item2.properties.Type === 'ADJUSTMENT') {
                return -1;
            } else {
                return Number(item2.properties.UnitPrice) - Number(item1.properties.UnitPrice);
            }
        });
    }

    /**
     * ODN-1660 Recalculates items totals using item level and order level discounts 
     * removing item level discounts if itemPeriodType !== FREE | DISCOUNT 
     * removing order level discount if orderOrInvoicePeriodType !== FREE | DISCOUNT 
     * and leaveExpiredDiscounts flag is not specified 
     * 
     * @param items 
     * @param orderOrInvoice 
     * @param overriddenCurrentDate 
     * @param leaveExpiredDiscounts
     * @returns 
     */
    public static recalculateItemsTotals(
        items: DbRecordEntityTransform[], 
        orderOrInvoice: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
        leaveExpiredDiscounts?: boolean,
    ): DbRecordEntityTransform[] {
        
        if (!items || items.length < 1 || !orderOrInvoice) {
            return items;
        }

        // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
        const orderDiscountForTotalPriceCalculation = {
            DiscountType: orderOrInvoice.properties.DiscountType,
            DiscountValue: orderOrInvoice.properties.DiscountValue,
        };
        const orderDiscountForTotalTaxCalculation = {
            DiscountType: orderOrInvoice.properties.DiscountType,
            DiscountValue: orderOrInvoice.properties.DiscountValue,
        };

        // ODN-1660 sort order items to apply the order level AMOUNT discount correctly
        const sortedItems = this.sortItemsByProductTypeAndPrice(items);

        for (const item of sortedItems) {

            item.properties.TotalPrice = this.computeAdjustedItemTotalPriceForPeriodType(
                leaveExpiredDiscounts ? undefined : item.properties.BillingPeriodType,
                item,
                orderOrInvoice,
                orderDiscountForTotalPriceCalculation,
                overriddenCurrentDate,
            );

            item.properties.TotalTaxAmount = this.computeAdjustedItemTotalTaxAmountForPeriodType(
                leaveExpiredDiscounts ? undefined : item.properties.BillingPeriodType,
                item,
                orderOrInvoice,
                orderDiscountForTotalTaxCalculation,
                overriddenCurrentDate,
            );
        }

        return items;
    }

    /**
     * ODN-1669 Calculates and construct the adjustment item from the billingAdjustmentInfo
     * @param items 
     * @param orderOrInvoice 
     * @param billingAdjustmentInfo 
     * @param onDate 
     */
    public static constructBillingAdjustmentItem(
        items: DbRecordEntityTransform[], 
        orderOrInvoice: DbRecordEntityTransform,
        billingAdjustmentInfo: { id: string, title: string, BillingPeriodType: string, DiscountType?: string, DiscountValue?: string },
        onDate?: string,
    ): { existedAdjustmentItem: DbRecordEntityTransform, newAdjustmentItem: DbRecordEntityTransform } {
        if (!orderOrInvoice || !items || items.length === 0) {
            return {
                existedAdjustmentItem: undefined,
                newAdjustmentItem: undefined,
            };
        }

        // get current adjustment item
        let existedAdjustmentItem = items.find(item => item.properties.Type === 'ADJUSTMENT');

        // construct new adjustment item from the invoice BillingAdjustment
        let newAdjustmentItem: DbRecordEntityTransform;

        if (billingAdjustmentInfo) 
        {
            // sum items totals without the adjustment item
            const recalculatedInvoiceItems = OrderInvoiceItemCalculations.recalculateItemsTotals(items, orderOrInvoice, onDate);
            const filteredInvoiceItems = recalculatedInvoiceItems.filter(item => !item.id || item.id !== existedAdjustmentItem?.id);
            let taxIncludedItemsExist = false;
            let sumItemsNetPrice = 0;
            let sumItemsTotalPrice = 0;
            for (const item of filteredInvoiceItems) {
                if (item.properties.Taxable === 'YES' && item.properties.TaxIncluded === 'YES') {
                    taxIncludedItemsExist = true;
                }
                sumItemsTotalPrice += Number(item.properties.TotalPrice);
                sumItemsNetPrice += Number(item.properties.TotalPrice) - Number(item.properties.TotalTaxAmount);
            }

            // compute the adjustment

            // if TaxIncluded items exist, the adjustment should be TaxIncluded
            let adjustmentCalculationBase: number;
            if (taxIncludedItemsExist) {
                // use items TotalPrice sum if the adjustment is TaxIncluded
                adjustmentCalculationBase = sumItemsTotalPrice;
            } else {
                // otherwise use items NetPrice sum
                adjustmentCalculationBase = sumItemsNetPrice;
            }

            let adjustmentTitle = billingAdjustmentInfo.title;
            if (adjustmentTitle) {
                adjustmentTitle = (adjustmentTitle + '').trim();
            }

            let adjustmentAmount = 0;
            if (billingAdjustmentInfo.BillingPeriodType === 'FREE') {
                // if TaxIncluded items exist adjustment should be TaxIncluded
                adjustmentAmount = adjustmentCalculationBase;
                // generate the adjustment title if it is empty
                if (!adjustmentTitle || adjustmentTitle === '') {
                    adjustmentTitle = 'Free period';
                }
            } else if (billingAdjustmentInfo.BillingPeriodType === 'DISCOUNT') {
                if (billingAdjustmentInfo.DiscountType === 'PERCENT') {
                    adjustmentAmount = Calculations.computePercentValueOfNumber(
                        adjustmentCalculationBase,
                        Number(billingAdjustmentInfo.DiscountValue),
                    );
                    // generate the adjustment title if it is empty
                    if (!adjustmentTitle || adjustmentTitle === '') {
                        adjustmentTitle = `Discount -${billingAdjustmentInfo.DiscountValue}%`;
                    }
                } else if (billingAdjustmentInfo.DiscountType === 'AMOUNT') {
                    adjustmentAmount = Number(billingAdjustmentInfo.DiscountValue);
                    if (adjustmentAmount > adjustmentCalculationBase) {
                        adjustmentAmount = adjustmentCalculationBase;
                    }
                    // generate the adjustment title if it is empty
                    if (!adjustmentTitle || adjustmentTitle === '') {
                        adjustmentTitle = `Discount -${billingAdjustmentInfo.DiscountValue}`;
                    }
                }
            }

            // construct adjustment item
            if (adjustmentAmount > 0) {
                adjustmentAmount = -adjustmentAmount;
                newAdjustmentItem = {
                    id: undefined,
                    title: adjustmentTitle,
                    properties: {
                        Type: 'ADJUSTMENT',
                        Description: adjustmentTitle,
                        UnitPrice: adjustmentAmount.toFixed(2),
                        Quantity: 1,
                        Taxable: 'YES',
                        TaxRate: 20,
                        TaxIncluded: taxIncludedItemsExist ? 'YES' : 'NO',
                        TotalPrice: 0,
                        TotalTaxAmount: 0,
                    }
                };
                // calculate adjustment item
                newAdjustmentItem.properties.TotalPrice = OrderInvoiceItemCalculations.computeItemTotalPrice(
                    newAdjustmentItem,
                    undefined,
                    undefined,
                    undefined,
                );
                newAdjustmentItem.properties.TotalTaxAmount = Number(OrderInvoiceItemCalculations.computeItemTotalTaxAmount(
                    newAdjustmentItem,
                    undefined,
                    undefined,
                    undefined,
                )).toFixed(2);
            }
        }

        return { existedAdjustmentItem, newAdjustmentItem }
    }
}
