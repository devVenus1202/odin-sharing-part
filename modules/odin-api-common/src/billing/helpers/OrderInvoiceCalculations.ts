import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { BillingDatesCalculator } from './BillingDatesCalculator';
import { OrderInvoiceItemCalculations } from './OrderInvoiceItemCalculations';

export class OrderInvoiceCalculations {

    /**
     * Subtotal = UnitPrice * Quantity of all items
     * @param items
     */
    public static computeSubtotal(items: DbRecordEntityTransform[]): string {
        let sum = 0;
        for(const item of items) {
            sum = sum + Number(OrderInvoiceItemCalculations.computeItemSubtotal(item));
        }
        return Number(sum.toPrecision(10)).toFixed(2);
    }

    /**
     * ODN-1542 Sums items level discounts and order level discounts 
     * removing discounts when trial and discount periods end 
     * and leaveExpiredDiscounts flag is not specified
     * 
     * @param items
     * @param orderOrInvoice
     * @param overriddenCurrentDate
     * @param leaveExpiredDiscounts
     */
    public static computeTotalDiscounts(
        items: DbRecordEntityTransform[],
        orderOrInvoice: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
        leaveExpiredDiscounts?: boolean,
    ): string {
        let sum = 0;

        // calculate current trial / discount period type for order / invoice
        const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);

        // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
        const orderDiscount = {
            DiscountType: orderOrInvoice.properties?.DiscountType,
            DiscountValue: orderOrInvoice.properties?.DiscountValue,
        };

        // ODN-1660 sort items
        const sortedItems = OrderInvoiceItemCalculations.sortItemsByProductTypeAndPrice(items);

        for(const item of sortedItems) {
            sum = sum + Number(OrderInvoiceItemCalculations.computeItemPlusOrderTotalDiscounts(
                item, 
                orderDiscount, 
                leaveExpiredDiscounts ? undefined : item.properties?.BillingPeriodType,
                leaveExpiredDiscounts ? undefined : currentOrderOrInvoicePeriod.periodType,
            ));
        }
        return Number(sum.toPrecision(10)).toFixed(2);
    }

    /**
     * ODN-1542 Computes taxes from the subtotal with discounts 
     * removing discounts when trial and discount periods end 
     * and leaveExpiredDiscounts flag is not specified
     * 
     * @param items
     * @param orderOrInvoice
     * @param overriddenCurrentDate
     * @param leaveExpiredDiscounts
     */
    public static computeTotalTaxAmount(
        items: DbRecordEntityTransform[],
        orderOrInvoice: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
        leaveExpiredDiscounts?: boolean,
    ): string {
        let sum = 0;

        // calculate current trial / discount period type for order / invoice
        const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);

        // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
        const orderDiscount = {
            DiscountType: orderOrInvoice.properties?.DiscountType,
            DiscountValue: orderOrInvoice.properties?.DiscountValue,
        };

        // ODN-1660 sort items
        const sortedItems = OrderInvoiceItemCalculations.sortItemsByProductTypeAndPrice(items);

        for(const item of sortedItems) {
            sum = sum + Number(OrderInvoiceItemCalculations.computeItemTotalTaxAmount(
                item, 
                orderDiscount, 
                leaveExpiredDiscounts ? undefined : item.properties?.BillingPeriodType,
                leaveExpiredDiscounts ? undefined : currentOrderOrInvoicePeriod.periodType,
            ));
        }
        return Number(sum.toPrecision(10)).toFixed(2);
    }

    /**
     * ODN-1542 Computes total inclusive discounts and taxes 
     * removing discounts when trial and discount periods end 
     * and leaveExpiredDiscounts flag is not specified
     * 
     * @param items
     * @param orderOrInvoice
     * @param overriddenCurrentDate
     * @param leaveExpiredDiscounts
     */
    public static computeTotal(
        items: DbRecordEntityTransform[],
        orderOrInvoice: DbRecordEntityTransform,
        overriddenCurrentDate?: string,
        leaveExpiredDiscounts?: boolean,
    ): string {
        let sum = 0;

        // calculate current trial / discount period type for order / invoice
        const currentOrderOrInvoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(orderOrInvoice, overriddenCurrentDate);

        // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
        const orderDiscount = {
            DiscountType: orderOrInvoice.properties?.DiscountType,
            DiscountValue: orderOrInvoice.properties?.DiscountValue,
        };

        // ODN-1660 sort items
        const sortedItems = OrderInvoiceItemCalculations.sortItemsByProductTypeAndPrice(items);

        for(const item of sortedItems) {
            sum = sum + Number(OrderInvoiceItemCalculations.computeItemTotalPrice(
                item, 
                orderDiscount, 
                leaveExpiredDiscounts ? undefined : item.properties?.BillingPeriodType,
                leaveExpiredDiscounts ? undefined : currentOrderOrInvoicePeriod.periodType,
            ));
        }
        return Number(sum.toPrecision(10)).toFixed(2);
    }
}
