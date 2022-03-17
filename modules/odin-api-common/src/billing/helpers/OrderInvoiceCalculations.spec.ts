import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { OrderInvoiceCalculations } from './OrderInvoiceCalculations';

describe('OrderInvoiceCalculations', () => {

    const testItemsTaxExcluded = [
        <DbRecordEntityTransform> {
            id : "",
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
        },
        <DbRecordEntityTransform> {
            id : "",
            properties : {
                UnitPrice : "200",
                Quantity : "1",
                // no BillingPeriodType is specified - discount should be applied
                DiscountType : "AMOUNT",
                DiscountValue : "50",
                Taxable : "YES",
                TaxIncluded : "NO",
                TaxRate : "20",
            }
        },
        <DbRecordEntityTransform> {
            id : "",
            properties : {
                UnitPrice : "200",
                Quantity : "1",
                BillingPeriodType : "FREE", // discount should be applied
                DiscountType : "PERCENT",   // discount type should be overrided to PERCENT
                DiscountValue : "50",       // discount value should be overrided to 100.00
                Taxable : "YES",
                TaxIncluded : "NO",
                TaxRate : "20",
            }
        },
        <DbRecordEntityTransform> {
            id : "",
            properties : {
                UnitPrice : "200",
                Quantity : "1",
                BillingPeriodType : "STANDARD", // discount shouldn't be applied
                DiscountType : "AMOUNT",
                DiscountValue : "100",
                Taxable : "YES",
                TaxIncluded : "NO",
                TaxRate : "20",
            }
        },
    ];

    const testItemsTaxIncluded = [
        <DbRecordEntityTransform> {
            id : "",
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
            id : "",
            properties : {
                UnitPrice : "240",
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
            id : "",
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
            id : "",
            properties : {
                UnitPrice : "240",
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

    it('1) check when tax is excluded on order item without order level discount', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                properties : {},
            },
            orderItems: testItemsTaxExcluded,
        };

        console.log('test 1');

        const subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        const totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order);
        const totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order);
        const total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("450.00");
        expect(totalTaxAmount).toEqual("130.00");
        expect(total).toEqual("780.00");

        done();
    });

    it('2) check when tax is included on order item without order level discount', async (done) => {
        const testdata = {
            order : <DbRecordEntityTransform> {
                properties : {},
            },
            orderItems: testItemsTaxIncluded,
        };

        console.log('test 2');

        const subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        const totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order);
        const totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order);
        const total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("540.00");
        expect(totalTaxAmount).toEqual("130.00");
        expect(total).toEqual("780.00");

        done();
    });

    it('3) check when tax is excluded on order item with order level discount of type PERCENT', async (done) => {
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
            orderItems: testItemsTaxExcluded,
        };

        // by default consider this is the order level discount period
        //   when no trial / discount period settings on the order
        //   ignoring the current date

        console.log('test 3/1');

        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-04-09");
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-04-09");
        let total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-04-09");

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("515.00");
        expect(totalTaxAmount).toEqual("117.00");
        expect(total).toEqual("702.00");

        console.log('test 3/2');

        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-06-09");
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-06-09");
        total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-06-09");

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("515.00");
        expect(totalTaxAmount).toEqual("117.00");
        expect(total).toEqual("702.00");

        console.log('test 3/3');

        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-06-10");
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-06-10");
        total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-06-10");

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("515.00");
        expect(totalTaxAmount).toEqual("117.00");
        expect(total).toEqual("702.00");

        done();
    });

    it('4) check when tax is included on order item with order level discount of type PERCENT', async (done) => {
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
        console.log('test 4/1');

        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-04-09");
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-04-09");
        let total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-04-09");

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("1320.00");
        expect(totalTaxAmount).toEqual("0.00");
        expect(total).toEqual("0.00");

        // order level discount period
        console.log('test 4/2');

        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-06-09");
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-06-09");
        total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-06-09");

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("618.00");
        expect(totalTaxAmount).toEqual("117.00");
        expect(total).toEqual("702.00");

        // order level discount period expired
        console.log('test 4/3');

        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.orderItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.orderItems, testdata.order, "2021-06-10");
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.orderItems, testdata.order, "2021-06-10");
        total = OrderInvoiceCalculations.computeTotal(testdata.orderItems, testdata.order, "2021-06-10");

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("540.00");
        expect(totalTaxAmount).toEqual("130.00");
        expect(total).toEqual("780.00");

        done();
    });

    it('5) check when tax is excluded on invoice item with invoice level discount of type AMOUNT', async (done) => {
        const testdata = {
            invoice : <DbRecordEntityTransform> {
                id : "",
                entity: "BillingModule:Invoice",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "100",
                    BillingStartDate: "2021-01-03",
                    TrialLength: "3",
                    TrialUnit: "MONTH",
                    DiscountLength: "2",
                    DiscountUnit: "MONTH",
                },
            },
            invoiceItems: testItemsTaxExcluded,
        };

        // invoice level trial period
        console.log('test 5/1');

        testdata.invoice.properties.BillingPeriodStart = "2021-03-04";
        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        let total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("1100.00");
        expect(totalTaxAmount).toEqual("0.00");
        expect(total).toEqual("0.00");

        // invoice level discount period
        console.log('test 5/2');

        testdata.invoice.properties.BillingPeriodStart = "2021-04-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("550.00");
        expect(totalTaxAmount).toEqual("110.00");
        expect(total).toEqual("660.00");

        // invoice level discount period expired
        console.log('test 5/3');

        testdata.invoice.properties.BillingPeriodStart = "2021-06-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("450.00");
        expect(totalTaxAmount).toEqual("130.00");
        expect(total).toEqual("780.00");

        done();
    });
    
    it('6) check when tax is included on invoice item with invoice level discount of type AMOUNT', async (done) => {
        const testdata = {
            invoice : <DbRecordEntityTransform> {
                id : "",
                entity: "BillingModule:Invoice",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "100",
                    BillingStartDate: "2021-01-03",
                },
            },
            invoiceItems: testItemsTaxIncluded,
        };

        // by default consider this is the invoice level discount period
        //   when no trial / discount period settings on the invoice
        //   ignoring the BillingPeriodStart value

        console.log('test 6/1');

        testdata.invoice.properties.BillingPeriodStart = "2021-03-04";
        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        let total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("640.00");
        expect(totalTaxAmount).toEqual("113.33");
        expect(total).toEqual("680.00");

        console.log('test 6/2');

        testdata.invoice.properties.BillingPeriodStart = "2021-04-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("640.00");
        expect(totalTaxAmount).toEqual("113.33");
        expect(total).toEqual("680.00");

        console.log('test 6/3');

        testdata.invoice.properties.BillingPeriodStart = "2021-06-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("640.00");
        expect(totalTaxAmount).toEqual("113.33");
        expect(total).toEqual("680.00");

        done();
    });

    it('7) check when tax is excluded on invoice item with invoice level large value discount of type AMOUNT', async (done) => {
        const testdata = {
            invoice : <DbRecordEntityTransform> {
                id : "",
                entity: "BillingModule:Invoice",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "500",
                    BillingStartDate: "2021-01-03",
                    TrialLength: "3",
                    TrialUnit: "MONTH",
                    DiscountLength: "2",
                    DiscountUnit: "MONTH",
                },
            },
            invoiceItems: testItemsTaxExcluded,
        };

        // invoice level trial period
        console.log('test 7/1');

        testdata.invoice.properties.BillingPeriodStart = "2021-03-04";
        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        let total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("1100.00");
        expect(totalTaxAmount).toEqual("0.00");
        expect(total).toEqual("0.00");

        // invoice level discount period
        console.log('test 7/2');

        testdata.invoice.properties.BillingPeriodStart = "2021-04-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("950.00");
        expect(totalTaxAmount).toEqual("30.00");
        expect(total).toEqual("180.00");

        // invoice level discount period expired
        console.log('test 7/3');

        testdata.invoice.properties.BillingPeriodStart = "2021-06-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1100.00");
        expect(totalDiscounts).toEqual("450.00");
        expect(totalTaxAmount).toEqual("130.00");
        expect(total).toEqual("780.00");

        done();
    });
    
    it('8) check when tax is included on invoice item with invoice level large value discount of type AMOUNT', async (done) => {
        const testdata = {
            invoice : <DbRecordEntityTransform> {
                id : "",
                entity: "BillingModule:Invoice",
                properties : {
                    DiscountType : "AMOUNT",
                    DiscountValue : "500",
                    BillingStartDate: "2021-01-03",
                },
            },
            invoiceItems: testItemsTaxIncluded,
        };

        // by default consider this is the invoice level discount period
        //   when no trial / discount period settings on the invoice
        //   ignoring the BillingPeriodStart value

        console.log('test 8/1');

        testdata.invoice.properties.BillingPeriodStart = "2021-03-04";
        let subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        let totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        let totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        let total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("1040.00");
        expect(totalTaxAmount).toEqual("46.67");
        expect(total).toEqual("280.00");

        console.log('test 8/2');

        testdata.invoice.properties.BillingPeriodStart = "2021-04-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("1040.00");
        expect(totalTaxAmount).toEqual("46.67");
        expect(total).toEqual("280.00");

        console.log('test 8/3');

        testdata.invoice.properties.BillingPeriodStart = "2021-06-04";
        subtotal = OrderInvoiceCalculations.computeSubtotal(testdata.invoiceItems);
        totalDiscounts = OrderInvoiceCalculations.computeTotalDiscounts(testdata.invoiceItems, testdata.invoice);
        totalTaxAmount = OrderInvoiceCalculations.computeTotalTaxAmount(testdata.invoiceItems, testdata.invoice);
        total = OrderInvoiceCalculations.computeTotal(testdata.invoiceItems, testdata.invoice);

        expect(subtotal).toEqual("1320.00");
        expect(totalDiscounts).toEqual("1040.00");
        expect(totalTaxAmount).toEqual("46.67");
        expect(total).toEqual("280.00");

        done();
    });
});