import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { OrderInvoiceItemCalculations } from './OrderInvoiceItemCalculations';

describe('OrderInvoiceItemCalculations', () => {

    const testItemsTaxIncluded = [
        <DbRecordEntityTransform> {
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
        },
        <DbRecordEntityTransform> {
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
        },
        <DbRecordEntityTransform> {
            id : "3",
            properties : {
                UnitPrice : "300",
                Quantity : "1",
                // no BillingPeriodType is specified - discount should be applied
                DiscountType : "AMOUNT",
                DiscountValue : "60",
                Taxable : "YES",
                TaxIncluded : "YES",
                TaxRate : "20",
            }
        },
        <DbRecordEntityTransform> {
            id : "4",
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
        },
    ];

    it('1) check items recalculation without order level discount', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                properties : {},
            },
            orderItems: testItemsTaxIncluded,
        };

        let recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order);

        let item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        let item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("360.00");
        expect(item2.properties.TotalTaxAmount).toEqual("60.00");

        let item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("240.00");
        expect(item3.properties.TotalTaxAmount).toEqual("40.00");

        let item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("360.00");
        expect(item4.properties.TotalTaxAmount).toEqual("60.00");

        done();
    });

    it('2) check items recalculation with order level PERCENT discount', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                id : "",
                properties : {
                    DiscountType : "PERCENT",
                    DiscountValue : "10",
                    BillingStartDate: "2021-01-03",
                    BillingDay: "10",
                },
            },
            orderItems: testItemsTaxIncluded,
        };

        // by default consider this is the order level discount period
        //   when no trial / discount period settings on the order
        //   ignoring the current date

        let recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-04-09");

        let item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        let item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("324.00");
        expect(item2.properties.TotalTaxAmount).toEqual("54.00");

        let item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("216.00");
        expect(item3.properties.TotalTaxAmount).toEqual("36.00");

        let item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("324.00");
        expect(item4.properties.TotalTaxAmount).toEqual("54.00");


        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-04-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("324.00");
        expect(item2.properties.TotalTaxAmount).toEqual("54.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("216.00");
        expect(item3.properties.TotalTaxAmount).toEqual("36.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("324.00");
        expect(item4.properties.TotalTaxAmount).toEqual("54.00");


        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-06-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("324.00");
        expect(item2.properties.TotalTaxAmount).toEqual("54.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("216.00");
        expect(item3.properties.TotalTaxAmount).toEqual("36.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("324.00");
        expect(item4.properties.TotalTaxAmount).toEqual("54.00");

        done();
    });

    it('3) check items recalculation with order level PERCENT discount and period settings', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                id : "",
                properties : {
                    DiscountType : "PERCENT",
                    DiscountValue : "10",
                    BillingStartDate: "2021-01-03",
                    BillingDay: "10",
                    TrialLength: "3",
                    TrialUnit: "MONTH",
                    DiscountLength: "2",
                    DiscountUnit: "MONTH",
                },
            },
            orderItems: testItemsTaxIncluded,
        };

        // order level trial period
        let recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-03-10");

        let item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        let item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("0.00");
        expect(item2.properties.TotalTaxAmount).toEqual("0.00");

        let item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("0.00");
        expect(item3.properties.TotalTaxAmount).toEqual("0.00");

        let item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("0.00");
        expect(item4.properties.TotalTaxAmount).toEqual("0.00");

        // order level discount period
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-04-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("324.00");
        expect(item2.properties.TotalTaxAmount).toEqual("54.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("216.00");
        expect(item3.properties.TotalTaxAmount).toEqual("36.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("324.00");
        expect(item4.properties.TotalTaxAmount).toEqual("54.00");

        // order level discount period expired
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-06-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("360.00");
        expect(item2.properties.TotalTaxAmount).toEqual("60.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("240.00");
        expect(item3.properties.TotalTaxAmount).toEqual("40.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("360.00");
        expect(item4.properties.TotalTaxAmount).toEqual("60.00");

        done();
    });

    it('4) check items recalculation with order level AMOUNT discount and period settings', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                id : "",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "100",
                    BillingStartDate: "2021-01-03",
                    BillingDay: "10",
                    TrialLength: "3",
                    TrialUnit: "MONTH",
                    DiscountLength: "2",
                    DiscountUnit: "MONTH",
                },
            },
            orderItems: testItemsTaxIncluded,
        };

        // order level trial period
        let recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-03-10");

        let item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        let item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("0.00");
        expect(item2.properties.TotalTaxAmount).toEqual("0.00");

        let item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("0.00");
        expect(item3.properties.TotalTaxAmount).toEqual("0.00");

        let item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("0.00");
        expect(item4.properties.TotalTaxAmount).toEqual("0.00");

        // order level discount period
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-04-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("260.00");
        expect(item2.properties.TotalTaxAmount).toEqual("43.33");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("240.00");
        expect(item3.properties.TotalTaxAmount).toEqual("40.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("360.00");
        expect(item4.properties.TotalTaxAmount).toEqual("60.00");

        // order level discount period expired
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-06-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("360.00");
        expect(item2.properties.TotalTaxAmount).toEqual("60.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("240.00");
        expect(item3.properties.TotalTaxAmount).toEqual("40.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("360.00");
        expect(item4.properties.TotalTaxAmount).toEqual("60.00");

        done();
    });

    it('5) check items recalculation with order level large value AMOUNT discount and period settings', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                id : "",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "840",
                    BillingStartDate: "2021-01-03",
                    BillingDay: "10",
                    TrialLength: "3",
                    TrialUnit: "MONTH",
                    DiscountLength: "2",
                    DiscountUnit: "MONTH",
                },
            },
            orderItems: testItemsTaxIncluded,
        };

        // order level trial period
        let recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-03-10");

        let item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        let item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("0.00");
        expect(item2.properties.TotalTaxAmount).toEqual("0.00");

        let item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("0.00");
        expect(item3.properties.TotalTaxAmount).toEqual("0.00");

        let item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("0.00");
        expect(item4.properties.TotalTaxAmount).toEqual("0.00");

        // order level discount period
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-04-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("0.00");
        expect(item2.properties.TotalTaxAmount).toEqual("0.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("120.00");
        expect(item3.properties.TotalTaxAmount).toEqual("20.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("0.00");
        expect(item4.properties.TotalTaxAmount).toEqual("0.00");

        // order level discount period expired
        recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(testdata.orderItems, testdata.order, "2021-06-10");

        item1 = recalculatedItems.find(elem => elem.id === "1");
        expect(item1.properties.TotalPrice).toEqual("0.00");
        expect(item1.properties.TotalTaxAmount).toEqual("0.00");

        item2 = recalculatedItems.find(elem => elem.id === "2");
        expect(item2.properties.TotalPrice).toEqual("360.00");
        expect(item2.properties.TotalTaxAmount).toEqual("60.00");

        item3 = recalculatedItems.find(elem => elem.id === "3");
        expect(item3.properties.TotalPrice).toEqual("240.00");
        expect(item3.properties.TotalTaxAmount).toEqual("40.00");

        item4 = recalculatedItems.find(elem => elem.id === "4");
        expect(item4.properties.TotalPrice).toEqual("360.00");
        expect(item4.properties.TotalTaxAmount).toEqual("60.00");

        done();
    });

    it('6) check item total calculation with undefined orderDiscount param', async (done) => {
        const testItem = testItemsTaxIncluded.find(item => item.id === "2");

        const total = OrderInvoiceItemCalculations.computeItemTotalPrice(
            testItem,
            undefined,
            testItem.properties.BillingPeriodType,
            undefined,
        );
        
        expect(total).toEqual("360.00");

        done();
    });
});