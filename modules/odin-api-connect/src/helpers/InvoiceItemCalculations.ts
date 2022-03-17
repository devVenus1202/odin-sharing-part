import { Calculations } from '@d19n/common/dist/helpers/Calculations';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { BillingDatesCalculator } from '@d19n/common/dist/billing/helpers/BillingDatesCalculator';

export class InvoiceItemCalculations {

    /**
     * Obsolete. UnitPrice * Quantity
     * @paraminvoiceItem
     */
    private static computeLineItemSubtotal(invoiceItem: DbRecordEntityTransform): string {
        let subtotal = 0;
        if(invoiceItem) {
            subtotal = subtotal + (Number(invoiceItem.properties.UnitPrice) * Number(invoiceItem.properties.Quantity));
        }
        return Number(subtotal).toPrecision(3);
    }

    /**
     * Obsolete. Discounts are applied to the UnitPrice
     * @paraminvoiceItem
     */
    private static computeLineItemDiscountAmount(invoiceItem: DbRecordEntityTransform): string {
        let totalDiscounts = 0;
        const lineItemSubtotal = Number(this.computeLineItemSubtotal(invoiceItem));
        if(invoiceItem) {
            if(invoiceItem.properties.DiscountType === 'PERCENT') {
                const lineItemDiscountValue = Calculations.computePercentValueOfNumber(
                    lineItemSubtotal,
                    invoiceItem.properties['DiscountValue'],
                );
                totalDiscounts = totalDiscounts + lineItemDiscountValue;
            } else if(invoiceItem.properties.DiscountType === 'AMOUNT') {
                const discountValue = Number(invoiceItem.properties.DiscountValue);
                totalDiscounts = totalDiscounts + discountValue;
            }
        }
        return Number(totalDiscounts).toPrecision(3);
    }


    /**
     * Obsolete. Discounts are applied to the UnitPrice
     * @paraminvoiceItem
     * @paraminvoice
     * @param removeDiscountPeriod
     */
    private static computeLineItemPreTaxTotalPrice(
        invoiceItem: DbRecordEntityTransform,
        invoice?: DbRecordEntityTransform,
        removeDiscountPeriod?: boolean,
    ): string {
        const lineItemSubtotal = this.computeLineItemSubtotal(invoiceItem);
        const lineItemDiscounts = this.computeLineItemDiscountAmount(invoiceItem);
        // adjust the sub total to by default include the line item discounts
        let adjSubtotal = Number(lineItemSubtotal) - Number(lineItemDiscounts);
        if(removeDiscountPeriod) {
            adjSubtotal = Number(lineItemSubtotal);
        }

        let invoiceDiscounts = '0.00';
        if(invoice) {
            invoiceDiscounts = this.computeLineItemWithOrderDiscountAmount(invoice, adjSubtotal);
        }

        console.log('invoiceDiscounts', invoiceDiscounts);

        const sum = Number(adjSubtotal) - Number(invoiceDiscounts);
        return Number(sum).toPrecision(10);
    }

    /**
     * Obsolete. Used by theinvoice
     * Compute invoice item discounts + invoice level discounts
     * @paraminvoiceItem
     * @paraminvoice
     */
    private static computeLineItemPlusOrderTotalDiscounts(
        invoiceItem: DbRecordEntityTransform,
        invoice: DbRecordEntityTransform,
    ): string {
        const lineItemSubtotal = this.computeLineItemSubtotal(invoiceItem);
        const lineItemDiscounts = this.computeLineItemDiscountAmount(invoiceItem);
        const lineItemWithDiscounts = Number(lineItemSubtotal) - Number(lineItemDiscounts);
        const lineItemOrderDiscounts = this.computeLineItemWithOrderDiscountAmount(invoice, lineItemWithDiscounts);

        const sum = Number(lineItemDiscounts) + Number(lineItemOrderDiscounts);
        return Number(sum).toPrecision(10);
    }


    /**
     * Obsolete. Discounts are applied to the invoice item pre tax subtotal
     * @paraminvoice
     * @param lineItemWithDiscounts
     */
    private static computeLineItemWithOrderDiscountAmount(
        invoice: DbRecordEntityTransform,
        lineItemWithDiscounts: number,
    ): string {
        let totalOrderDiscounts = 0;
        // This should be configurable by the user
        let applyOrderDiscountAfterOrderItemDiscount = true;
        if(invoice && applyOrderDiscountAfterOrderItemDiscount) {
            // should add the invoice discount after the line item discounts are applied
            if(invoice.properties.DiscountType === 'PERCENT') {
                const appliedOrderDiscountAmount = Calculations.computePercentValueOfNumber(
                    lineItemWithDiscounts,
                    invoice.properties.DiscountValue,
                );
                totalOrderDiscounts = totalOrderDiscounts + appliedOrderDiscountAmount;
            } else if(invoice.properties.DiscountType === 'AMOUNT') {
                const discountValue = Number(invoice.properties.DiscountValue);
                totalOrderDiscounts = totalOrderDiscounts + discountValue;
            }
        } else {
            // should add invoice discount  + the line item discount before deducting from each line item
        }
        return Number(totalOrderDiscounts).toPrecision(10);
    }


    /**
     * Obsolete. Taxes are derived form the Subtotal - discounts
     * @paraminvoiceItem
     * @paraminvoice
     */
    private static computeLineItemTaxAmount1(
        invoiceItem: DbRecordEntityTransform,
        invoice: DbRecordEntityTransform,
    ): string {
        let totalTaxes = 0;
        // This should be configurable by the user
        let applyOrderDiscountAfterLineItemDiscount = true;
        if(applyOrderDiscountAfterLineItemDiscount) {
            const preTaxTotal = this.computeLineItemPreTaxTotalPrice(invoiceItem, invoice);
            if(invoiceItem.properties.Taxable === 'YES' && invoiceItem.properties.TaxIncluded === 'NO') {
                totalTaxes = totalTaxes + Number(Calculations.computePercentValueOfNumber(
                    Number(preTaxTotal),
                    invoiceItem.properties.TaxRate,
                ));
            }
        }
        return Number(totalTaxes).toPrecision(10);
    }

    /**
     * Total is the TotalPrice for the line item inclusive of discounts and taxes
     * @paraminvoiceItem
     * @paraminvoice
     */
    public static computeLineItemSummary(
        invoiceItem: DbRecordEntityTransform,
        invoice: DbRecordEntityTransform,
    ): any {
        const ivoicePeriod = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(invoice);

        const lineItemSubtotal = Number(OrderInvoiceItemCalculations.computeItemSubtotal(invoiceItem)).toFixed(2);
        const lineItemTotalDiscounts = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalDiscountsForPeriodType(
            invoiceItem.properties?.BillingPeriodType,
            invoiceItem, 
            invoice,
            {
                DiscountType: invoice.properties.DiscountType,
                DiscountValue: invoice.properties.DiscountValue,
            },
        )).toFixed(2);
        const lineItemPreTaxTotal = Number(OrderInvoiceItemCalculations.computeAdjustedItemPreTaxTotalPriceForPeriodType(
            invoiceItem.properties?.BillingPeriodType,
            invoiceItem, 
            invoice,
            {
                DiscountType: invoice.properties.DiscountType,
                DiscountValue: invoice.properties.DiscountValue,
            },
        )).toFixed(2);
        const lineItemTaxAmount = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalTaxAmountForPeriodType(
            invoiceItem.properties?.BillingPeriodType, 
            invoiceItem, 
            invoice,
            {
                DiscountType: invoice.properties.DiscountType,
                DiscountValue: invoice.properties.DiscountValue,
            },
        )).toFixed(2);
        const lineItemTotalPrice = Number(OrderInvoiceItemCalculations.computeAdjustedItemTotalPriceForPeriodType(
            invoiceItem.properties?.BillingPeriodType, 
            invoiceItem, 
            invoice,
            {
                DiscountType: invoice.properties.DiscountType,
                DiscountValue: invoice.properties.DiscountValue,
            },
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
