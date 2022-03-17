import { Calculations } from '@d19n/common/dist/helpers/Calculations';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';

export class OrderItemCalculations {

    /**
     * Obsolete. UnitPrice * Quantity
     * @param orderItem
     */
    private static computeOrderItemSubtotal(orderItem: DbRecordEntityTransform): string {
        let subtotal = 0;
        if(orderItem) {
            subtotal = subtotal + (Number(orderItem.properties.UnitPrice) * Number(orderItem.properties.Quantity));
        }
        return Number(subtotal).toPrecision(3);
    }

    /**
     * Obsolete. Discounts are applied to the UnitPrice
     * @param orderItem
     */
    private static computeOrderItemDiscountAmount(orderItem: DbRecordEntityTransform): string {
        let totalDiscounts = 0;
        const lineItemSubtotal = Number(this.computeOrderItemSubtotal(orderItem));
        if(orderItem) {
            if(orderItem.properties.DiscountType === 'PERCENT') {
                const lineItemDiscountValue = Calculations.computePercentValueOfNumber(
                    lineItemSubtotal,
                    orderItem.properties['DiscountValue'],
                );
                totalDiscounts = totalDiscounts + lineItemDiscountValue;
            } else if(orderItem.properties.DiscountType === 'AMOUNT') {

                // Temporary only add amount discounts to the BASE_PRODUCT on the order
                if(getProperty(orderItem, 'ProductType') === 'BASE_PRODUCT') {

                    const discountValue = Number(orderItem.properties.DiscountValue);
                    totalDiscounts = totalDiscounts + discountValue;
                }
            }
        }
        return Number(totalDiscounts).toPrecision(3);
    }


    /**
     * Obsolete. Discounts are applied to the UnitPrice
     * @param orderItem
     * @param order
     * @param removeDiscountPeriod
     */
    private static computeOrderItemPreTaxTotalPrice(
        orderItem: DbRecordEntityTransform,
        order?: DbRecordEntityTransform,
        removeDiscountPeriod?: boolean,
    ): string {
        const lineItemSubtotal = this.computeOrderItemSubtotal(orderItem);
        const lineItemDiscounts = this.computeOrderItemDiscountAmount(orderItem);
        // adjust the sub total to by default include the line item discounts
        let adjSubtotal = Number(lineItemSubtotal) - Number(lineItemDiscounts);
        if(removeDiscountPeriod) {
            adjSubtotal = Number(lineItemSubtotal);
        }

        let orderDiscounts = '0.00';
        if(order) {
            orderDiscounts = this.computeOrderItemWithOrderDiscountAmount(order, adjSubtotal);
        }

        const sum = Number(adjSubtotal) - Number(orderDiscounts);
        return Number(sum).toPrecision(10);
    }

    /**
     * Obsolete. Used by the order
     * Compute order item discounts + order level discounts
     * @param orderItem
     * @param order
     */
    private static computeOrderItemPlusOrderTotalDiscounts(
        orderItem: DbRecordEntityTransform,
        order: DbRecordEntityTransform,
    ): string {
        const lineItemSubtotal = this.computeOrderItemSubtotal(orderItem);
        const lineItemDiscounts = this.computeOrderItemDiscountAmount(orderItem);
        const lineItemWithDiscounts = Number(lineItemSubtotal) - Number(lineItemDiscounts);
        const lineItemOrderDiscounts = this.computeOrderItemWithOrderDiscountAmount(order, lineItemWithDiscounts);

        const sum = Number(lineItemDiscounts) + Number(lineItemOrderDiscounts);
        return Number(sum).toPrecision(10);
    }


    /**
     * Obsolete. Discounts are applied to the order item pre tax subtotal
     * @param order
     * @param lineItemWithDiscounts
     */
    private static computeOrderItemWithOrderDiscountAmount(
        order: DbRecordEntityTransform,
        lineItemWithDiscounts: number,
    ): string {
        let totalOrderDiscounts = 0;
        // This should be configurable by the user
        let applyOrderDiscountAfterOrderItemDiscount = true;
        if(order && applyOrderDiscountAfterOrderItemDiscount) {
            // should add the order discount after the line item discounts are applied
            if(order.properties.DiscountType === 'PERCENT') {
                const appliedOrderDiscountAmount = Calculations.computePercentValueOfNumber(
                    lineItemWithDiscounts,
                    order.properties.DiscountValue,
                );
                totalOrderDiscounts = totalOrderDiscounts + appliedOrderDiscountAmount;
            } else if(order.properties.DiscountType === 'AMOUNT') {
                const discountValue = Number(order.properties.DiscountValue);
                totalOrderDiscounts = totalOrderDiscounts + discountValue;
            }
        } else {
            // should add order discount  + the line item discount before deducting from each line item
        }
        return Number(totalOrderDiscounts).toPrecision(10);
    }


    /**
     * Obsolete. Taxes are derived form the Subtotal - discounts
     * @param orderItem
     * @param order
     */
    private static computeOrderItemTaxAmount(
        orderItem: DbRecordEntityTransform,
        order: DbRecordEntityTransform,
    ): string {
        let totalTaxes = 0;
        // This should be configurable by the user
        let applyOrderDiscountAfterLineItemDiscount = true;
        if(applyOrderDiscountAfterLineItemDiscount) {
            const preTaxTotal = this.computeOrderItemPreTaxTotalPrice(orderItem, order);
            if(orderItem.properties.Taxable === 'YES' && orderItem.properties.TaxIncluded === 'NO') {
                totalTaxes = totalTaxes + Number(Calculations.computePercentValueOfNumber(
                    Number(preTaxTotal),
                    orderItem.properties.TaxRate,
                ));
            }
        }
        return Number(totalTaxes).toPrecision(10);
    }

    /**
     * Computes order item totals
     * 
     * @param orderItem
     * @param order
     * @param orderDiscount
     */
    public static computeLineItemSummary(
        orderItem: DbRecordEntityTransform,
        order: DbRecordEntityTransform,
        orderDiscount: { DiscountType: any, DiscountValue: any },
    ): any {
        const lineItemSubtotal = Number(OrderInvoiceItemCalculations.computeItemSubtotal(orderItem)).toFixed(2);
        const lineItemTotalDiscounts = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalDiscountsForPeriodType(
            orderItem.properties.BillingPeriodType,
            orderItem,
            order,
            {
                DiscountType: orderDiscount.DiscountType,
                DiscountValue: orderDiscount.DiscountValue,
            },
        )).toFixed(2);
        const lineItemPreTaxTotal = Number(OrderInvoiceItemCalculations.computeAdjustedItemPreTaxTotalPriceForPeriodType(
            orderItem.properties.BillingPeriodType,
            orderItem, 
            order,
            {
                DiscountType: orderDiscount.DiscountType,
                DiscountValue: orderDiscount.DiscountValue,
            },
        )).toFixed(2);
        const lineItemTaxAmount = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalTaxAmountForPeriodType(
            orderItem.properties.BillingPeriodType,
            orderItem, 
            order,
            {
                DiscountType: orderDiscount.DiscountType,
                DiscountValue: orderDiscount.DiscountValue,
            },
        )).toFixed(2);
        const lineItemTotalPrice = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalPriceForPeriodType(
            orderItem.properties.BillingPeriodType,
            orderItem, 
            order,
            orderDiscount,
        )).toFixed(2);

        return {
            lineItemSubtotal,
            lineItemTotalDiscounts,
            lineItemPreTaxTotal,
            lineItemTaxAmount,
            lineItemTotalPrice,
        }
    }

}
