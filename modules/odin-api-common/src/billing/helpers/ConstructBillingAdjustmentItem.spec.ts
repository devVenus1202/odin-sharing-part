import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Calculations } from '../../helpers/Calculations';
import { OrderInvoiceCalculations } from './OrderInvoiceCalculations';
import { OrderInvoiceItemCalculations } from './OrderInvoiceItemCalculations';

function computeInvoiceTotals(items: DbRecordEntityTransform[], invoice: DbRecordEntityTransform) {
    const invoiceSubTotal = OrderInvoiceCalculations.computeSubtotal(items);
    const invoiceTotalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(items, invoice);
    const invoiceTotalPrice = OrderInvoiceCalculations.computeTotal(items, invoice);
    const invoiceTotalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(items, invoice);
    const invoiceNetPrice = (Number(invoiceTotalPrice) - Number(invoiceTotalTaxAmount)).toFixed(2);

    const res = {
        invoiceSubTotal, 
        invoiceTotalDiscounts, 
        invoiceTotalPrice, 
        invoiceTotalTaxAmount, 
        invoiceNetPrice, 
    };

    console.log(JSON.stringify(res));

    return res;
}

function checkAdjustmentItem(
    newAdjustmentItem: DbRecordEntityTransform, 
    expectedTaxIncluded: string, 
    expectedAdjustmentAmount: string, 
    expectedAdjustmentTotalPrice: string, 
    expectedAdjustmentTotalTaxAmount: string, 
) {
    console.log(JSON.stringify(newAdjustmentItem?.properties));

    expect(newAdjustmentItem.properties.TaxIncluded).toEqual(expectedTaxIncluded);
    expect(newAdjustmentItem.properties.UnitPrice).toEqual(`-${expectedAdjustmentAmount}`);
    expect(newAdjustmentItem.properties.DiscountType).toBeUndefined();
    expect(newAdjustmentItem.properties.DiscountValue).toBeUndefined();
    expect(newAdjustmentItem.properties.TotalPrice).toEqual(expectedAdjustmentTotalPrice);
    expect(newAdjustmentItem.properties.TotalTaxAmount).toEqual(expectedAdjustmentTotalTaxAmount);
} 

function checkRecalculationWithAdjustment(
    items: DbRecordEntityTransform[], 
    invoice: DbRecordEntityTransform, 
    newAdjustmentItem: DbRecordEntityTransform, 
    invoiceSubTotal: string, 
    invoiceTotalDiscounts: string, 
    expectedTotalPriceWithAdjustment: string, 
    expectedTotalTaxAmountWithAdjustment: string, 
) {
    const itemsWithAdjustment = [newAdjustmentItem, ...items];

    let invoiceSubtotalWithAdjustment = OrderInvoiceCalculations.computeSubtotal(itemsWithAdjustment);
    let invoiceTotalDiscountsWithAdjustment = OrderInvoiceCalculations.computeTotalDiscounts(itemsWithAdjustment, invoice);
    let invoiceTotalPriceWithAdjustment = OrderInvoiceCalculations.computeTotal(itemsWithAdjustment, invoice);
    let invoiceTotalTaxAmountWithAdjustment = OrderInvoiceCalculations.computeTotalTaxAmount(itemsWithAdjustment, invoice);

    console.log(JSON.stringify(
        {
            invoiceSubtotalWithAdjustment,
            invoiceTotalDiscountsWithAdjustment,
            invoiceTotalPriceWithAdjustment,
            invoiceTotalTaxAmountWithAdjustment,
        }
    ));

    let expectedInvoiceSubtotalWithAdjustment = (Number(invoiceSubTotal) + Number(newAdjustmentItem.properties.UnitPrice)).toFixed(2);
    let expectedInvoiceTotalDiscountsWithAdjustment = invoiceTotalDiscounts;

    console.log(JSON.stringify(
        {
            expectedInvoiceSubtotalWithAdjustment,
            expectedInvoiceTotalDiscountsWithAdjustment,
            expectedTotalPriceWithAdjustment,
            expectedTotalTaxAmountWithAdjustment,
        }
    ));

    expect(invoiceSubtotalWithAdjustment).toEqual(expectedInvoiceSubtotalWithAdjustment);
    expect(invoiceTotalDiscountsWithAdjustment).toEqual(expectedInvoiceTotalDiscountsWithAdjustment);
    expect(invoiceTotalPriceWithAdjustment).toEqual(expectedTotalPriceWithAdjustment);
    expect(invoiceTotalTaxAmountWithAdjustment).toEqual(expectedTotalTaxAmountWithAdjustment);
}

describe('OrderInvoiceItemCalculations.constructBillingAdjustmentItem()', () => {

    const testItem1TaxIncludedFreePeriod = <DbRecordEntityTransform> {
        id : "1",
        properties : {
            UnitPrice : "240",
            Quantity : "1",
            BillingPeriodType : "FREE", // discount should be applied
            DiscountType : "AMOUNT",    // discount type should be overrided to PERCENT
            DiscountValue : "120",      // discount value should be overrided to 100.00
            Taxable : "YES",
            TaxIncluded : "YES",
            TaxRate : "20",
        }
    };
    const testItem1TaxExcludedFreePeriod = <DbRecordEntityTransform> {
        id : "1",
        properties : {
            UnitPrice : "200",
            Quantity : "1",
            BillingPeriodType : "FREE", // discount should be applied
            DiscountType : "AMOUNT",    // discount type should be overrided to PERCENT
            DiscountValue : "100",      // discount value should be overrided to 100.00
            Taxable : "YES",
            TaxIncluded : "NO",
            TaxRate : "20",
        }
    };
    const testItem2TaxIncludedDiscountPeriod = <DbRecordEntityTransform> {
        id : "2",
        properties : {
            UnitPrice : "600",
            Quantity : "1",
            BillingPeriodType : "DISCOUNT", // discount should be applied
            DiscountType : "AMOUNT",
            DiscountValue : "240",
            Taxable : "YES",
            TaxIncluded : "YES",
            TaxRate : "20",
            ProductType : "BASE_PRODUCT",
        }
    };
    const testItem2TaxExcludedDiscountPeriod = <DbRecordEntityTransform> {
        id : "2",
        properties : {
            UnitPrice : "500",
            Quantity : "1",
            BillingPeriodType : "DISCOUNT", // discount should be applied
            DiscountType : "AMOUNT",
            DiscountValue : "200",
            Taxable : "YES",
            TaxIncluded : "NO",
            TaxRate : "20",
            ProductType : "BASE_PRODUCT",
        }
    };
    const testItem3TaxIncludedStandardPeriod = <DbRecordEntityTransform> {
        id : "3",
        properties : {
            UnitPrice : "360",
            Quantity : "1",
            BillingPeriodType : "STANDARD", // discount shouldn't be applied
            DiscountType : "AMOUNT",
            DiscountValue : "120",
            Taxable : "YES",
            TaxIncluded : "YES",
            TaxRate : "20",
        }
    };
    const testItem3TaxExcludedStandardPeriod = <DbRecordEntityTransform> {
        id : "3",
        properties : {
            UnitPrice : "300",
            Quantity : "1",
            BillingPeriodType : "STANDARD", // discount shouldn't be applied
            DiscountType : "AMOUNT",
            DiscountValue : "100",
            Taxable : "YES",
            TaxIncluded : "NO",
            TaxRate : "20",
        }
    };

    const testInvoice1PercentDiscount = <DbRecordEntityTransform> {
        id : "",
        entity: "BillingModule:Invoice",
        properties : {
            DiscountType : "PERCENT",
            DiscountValue : "10"
        },
    };
    const testInvoice1AmountDiscount = <DbRecordEntityTransform> {
        id : "",
        entity: "BillingModule:Invoice",
        properties : {
            DiscountType : "AMOUNT",
            DiscountValue : "840"
        },
    };

    it('1) check billing adjustment free period tax excluded with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "free period",
            BillingPeriodType: "FREE",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        checkAdjustmentItem(newAdjustmentItem, "NO", invoiceNetPrice, `-${invoiceTotalPrice}`, `-${invoiceTotalTaxAmount}`);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, "0.00", "0.00");
        
        done();
    });

    it('2) check billing adjustment free period tax excluded with the order level AMOUNT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "free period",
            BillingPeriodType: "FREE",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "AMOUNT",
                DiscountValue : "400"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );
        
        checkAdjustmentItem(newAdjustmentItem, "NO", invoiceNetPrice, `-${invoiceTotalPrice}`, `-${invoiceTotalTaxAmount}`);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, "0.00", "0.00");
        
        done();
    });

    it('3) check billing adjustment free period tax excluded with the large order level AMOUNT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "free period",
            BillingPeriodType: "FREE",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "AMOUNT",
                DiscountValue : "2000"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        console.log(JSON.stringify(newAdjustmentItem?.properties));

        expect(newAdjustmentItem).toBeUndefined();
        
        done();
    });

    it('4) check billing adjustment PERCENT discount period tax excluded with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "PERCENT",
            DiscountValue: "10",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        const expectedAdjustmentAmount = Calculations.computePercentValueOfNumber(Number(invoiceNetPrice), 10).toFixed(2);
        const expectedAdjustmentTotalPrice = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalPrice), 10)).toFixed(2);
        const expectedAdjustmentTotalTaxAmount = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalTaxAmount), 10)).toFixed(2);

        checkAdjustmentItem(newAdjustmentItem, "NO", expectedAdjustmentAmount, expectedAdjustmentTotalPrice, expectedAdjustmentTotalTaxAmount);

        const expectedInvoiceTotalPriceWithAdjustment = (Number(invoiceTotalPrice) + Number(expectedAdjustmentTotalPrice)).toFixed(2);
        const expectedInvoiceTotalTaxAmountWithAdjustment = (Number(invoiceTotalTaxAmount) + Number(expectedAdjustmentTotalTaxAmount)).toFixed(2);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            expectedInvoiceTotalPriceWithAdjustment, expectedInvoiceTotalTaxAmountWithAdjustment);
        
        done();
    });

    it('5) check billing adjustment AMOUNT discount period tax excluded with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "AMOUNT",
            DiscountValue: "100",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        checkAdjustmentItem(newAdjustmentItem, "NO", "100.00", "-120.00", "-20.00");

        const expectedInvoiceTotalPriceWithAdjustment = (Number(invoiceTotalPrice) - 120).toFixed(2);
        const expectedInvoiceTotalTaxAmountWithAdjustment = (Number(invoiceTotalTaxAmount) - 20).toFixed(2);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            expectedInvoiceTotalPriceWithAdjustment, expectedInvoiceTotalTaxAmountWithAdjustment);
        
        done();
    });

    it('6) check billing adjustment large AMOUNT discount period tax excluded with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "AMOUNT",
            DiscountValue: "700",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        checkAdjustmentItem(newAdjustmentItem, "NO", invoiceNetPrice, `-${invoiceTotalPrice}`, `-${invoiceTotalTaxAmount}`);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            "0.00", "0.00");
        
        done();
    });

    it('7) check billing adjustment PERCENT discount period tax included with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "PERCENT",
            DiscountValue: "10",
        };

        const items = [
            testItem1TaxIncludedFreePeriod,
            testItem2TaxIncludedDiscountPeriod,
            testItem3TaxIncludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        const expectedAdjustmentAmount = Calculations.computePercentValueOfNumber(Number(invoiceTotalPrice), 10).toFixed(2);
        const expectedAdjustmentTotalPrice = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalPrice), 10)).toFixed(2);
        const expectedAdjustmentTotalTaxAmount = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalTaxAmount), 10)).toFixed(2);

        checkAdjustmentItem(newAdjustmentItem, "YES", expectedAdjustmentAmount, expectedAdjustmentTotalPrice, expectedAdjustmentTotalTaxAmount);

        const expectedInvoiceTotalPriceWithAdjustment = (Number(invoiceTotalPrice) + Number(expectedAdjustmentTotalPrice)).toFixed(2);
        const expectedInvoiceTotalTaxAmountWithAdjustment = (Number(invoiceTotalTaxAmount) + Number(expectedAdjustmentTotalTaxAmount)).toFixed(2);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            expectedInvoiceTotalPriceWithAdjustment, expectedInvoiceTotalTaxAmountWithAdjustment);
        
        done();
    });

    it('8) check billing adjustment FREE discount period tax mixed with the order level PERCENT discount', async (done) => {
        const billingAdjustmentInfo = {
            id: undefined,
            title: "free period",
            BillingPeriodType: "FREE",
        };

        const items = [
            testItem1TaxIncludedFreePeriod,
            testItem2TaxIncludedDiscountPeriod,
            testItem3TaxIncludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        checkAdjustmentItem(newAdjustmentItem, "YES", invoiceTotalPrice, `-${invoiceTotalPrice}`, `-${invoiceTotalTaxAmount}`);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            "0.00", "0.00");
        
        done();
    });

    it('9) check billing adjustment update scenario', async (done) => {
        let billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "PERCENT",
            DiscountValue: "10",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        const invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        let { existedAdjustmentItem, newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        expect(existedAdjustmentItem).toBeUndefined();

        const expectedAdjustmentAmount = Calculations.computePercentValueOfNumber(Number(invoiceNetPrice), 10).toFixed(2);
        const expectedAdjustmentTotalPrice = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalPrice), 10)).toFixed(2);
        const expectedAdjustmentTotalTaxAmount = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalTaxAmount), 10)).toFixed(2);

        checkAdjustmentItem(newAdjustmentItem, "NO", expectedAdjustmentAmount, expectedAdjustmentTotalPrice, expectedAdjustmentTotalTaxAmount);

        const expectedInvoiceTotalPriceWithAdjustment = (Number(invoiceTotalPrice) + Number(expectedAdjustmentTotalPrice)).toFixed(2);
        const expectedInvoiceTotalTaxAmountWithAdjustment = (Number(invoiceTotalTaxAmount) + Number(expectedAdjustmentTotalTaxAmount)).toFixed(2);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            expectedInvoiceTotalPriceWithAdjustment, expectedInvoiceTotalTaxAmountWithAdjustment);
        
        // change billing adjustment to AMOUNT type
        billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "AMOUNT",
            DiscountValue: "100",
        };

        const itemsWithAdjustment = [...items, newAdjustmentItem];

        const constructRes = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            itemsWithAdjustment, 
            invoice, 
            billingAdjustmentInfo, 
        );

        existedAdjustmentItem = constructRes.existedAdjustmentItem;
        const prevNewAdjustmentItem = newAdjustmentItem;
        newAdjustmentItem = constructRes.newAdjustmentItem;

        expect(existedAdjustmentItem).not.toBeUndefined();
        expect(newAdjustmentItem).not.toBeUndefined();

        expect(existedAdjustmentItem.properties.TotalPrice).toEqual(prevNewAdjustmentItem.properties.TotalPrice);
        expect(newAdjustmentItem.properties.TotalPrice).toEqual("-120.00");
        
        done();
    });

    it('9) check billing adjustment remove scenario', async (done) => {
        let billingAdjustmentInfo = {
            id: undefined,
            title: "discount period",
            BillingPeriodType: "DISCOUNT",
            DiscountType: "PERCENT",
            DiscountValue: "10",
        };

        const items = [
            testItem1TaxExcludedFreePeriod,
            testItem2TaxExcludedDiscountPeriod,
            testItem3TaxExcludedStandardPeriod,
        ];

        let invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "PERCENT",
                DiscountValue : "10"
            },
        };

        const {
            invoiceSubTotal, 
            invoiceTotalDiscounts, 
            invoiceTotalPrice, 
            invoiceTotalTaxAmount, 
            invoiceNetPrice, 
        } = computeInvoiceTotals(items, invoice);

        let { existedAdjustmentItem, newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            items, 
            invoice, 
            billingAdjustmentInfo, 
        );

        expect(existedAdjustmentItem).toBeUndefined();

        const expectedAdjustmentAmount = Calculations.computePercentValueOfNumber(Number(invoiceNetPrice), 10).toFixed(2);
        const expectedAdjustmentTotalPrice = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalPrice), 10)).toFixed(2);
        const expectedAdjustmentTotalTaxAmount = (-Calculations.computePercentValueOfNumber(Number(invoiceTotalTaxAmount), 10)).toFixed(2);

        checkAdjustmentItem(newAdjustmentItem, "NO", expectedAdjustmentAmount, expectedAdjustmentTotalPrice, expectedAdjustmentTotalTaxAmount);

        const expectedInvoiceTotalPriceWithAdjustment = (Number(invoiceTotalPrice) + Number(expectedAdjustmentTotalPrice)).toFixed(2);
        const expectedInvoiceTotalTaxAmountWithAdjustment = (Number(invoiceTotalTaxAmount) + Number(expectedAdjustmentTotalTaxAmount)).toFixed(2);

        checkRecalculationWithAdjustment(items, invoice, newAdjustmentItem, invoiceSubTotal, invoiceTotalDiscounts, 
            expectedInvoiceTotalPriceWithAdjustment, expectedInvoiceTotalTaxAmountWithAdjustment);
        
        // change invoice discount to the large AMOUNT
        invoice = <DbRecordEntityTransform> {
            id : "",
            entity: "BillingModule:Invoice",
            properties : {
                DiscountType : "AMOUNT",
                DiscountValue : "2000"
            },
        };

        const itemsWithAdjustment = [...items, newAdjustmentItem];

        const constructRes = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
            itemsWithAdjustment, 
            invoice, 
            billingAdjustmentInfo, 
        );

        existedAdjustmentItem = constructRes.existedAdjustmentItem;
        const prevNewAdjustmentItem = newAdjustmentItem;
        newAdjustmentItem = constructRes.newAdjustmentItem;

        expect(existedAdjustmentItem).not.toBeUndefined();
        expect(newAdjustmentItem).toBeUndefined();

        expect(existedAdjustmentItem.properties.TotalPrice).toEqual(prevNewAdjustmentItem.properties.TotalPrice);
        
        done();
    });

});