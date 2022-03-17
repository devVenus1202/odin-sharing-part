import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { BillingDatesCalculator } from '@d19n/common/dist/billing/helpers/BillingDatesCalculator';
import { OrderInvoiceCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceCalculations';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';
import moment = require('moment');

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

async function sync() {
    try {
        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const records = await pg.query(
            `SELECT r.id
                , c5.Value as Status
                , c6.Value as BillingPeriodStart, c7.Value as BillingPeriodEnd
                , c1.Value as DiscountLength, c2.Value as DiscountUnit
                , c3.Value as TrialLength, c4.Value as TrialUnit
            FROM db_records as r
                left join db_records_columns c1 on (c1.record_id = r.id AND c1.column_name = 'DiscountLength')
                left join db_records_columns c2 on (c2.record_id = r.id AND c2.column_name = 'DiscountUnit')
                left join db_records_columns c3 on (c3.record_id = r.id AND c3.column_name = 'TrialLength')
                left join db_records_columns c4 on (c4.record_id = r.id AND c4.column_name = 'TrialUnit')
                left join db_records_columns c5 on (c5.record_id = r.id AND c5.column_name = 'Status')
                left join db_records_columns c6 on (c6.record_id = r.id AND c6.column_name = 'BillingPeriodStart')
				left join db_records_columns c7 on (c7.record_id = r.id AND c7.column_name = 'BillingPeriodEnd')
                --join db_records_associations ra on ra.parent_record_id = r.id
					--and ra.child_schema_id='af9351cf-2b98-49da-b142-a3bd85956356' -- having related discount
            WHERE r.entity = 'BillingModule:Invoice' and r.deleted_at is null
                --and c1.Value is null
                --and c6.Value is null
                --and c5.Value not in ('PAID','REFUNDED','PAYMENT_PENDING','VOID','ERROR')
                --and c5.Value in ('SCHEDULED')
                --and r.id in ('24e2f27d-9716-45d4-a987-bca2d2b395ad'
                    --,'ed14e166-71e0-42a5-a9cc-8a92a8dcfc9b'
                    --)
            ORDER BY r.created_at ASC
            --limit 1
            `);

        console.log('records', records.length);

        let counter = 0;
        const failedRecords = [];

        for(const record of records) {
            counter++;
            console.log(`processing ${counter}/${records.length} invoice.id`, record.id);

            try {

                const invoiceRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db/Invoice/${record.id}?entities=["Order","Discount","InvoiceItem"]`,
                    apiToken,
                );
                const invoice = invoiceRes['data'];

                const invoiceStatus = getProperty(invoice, 'Status');
                const invoiceItems = <DbRecordEntityTransform[]>invoice?.InvoiceItem?.dbRecords;

                console.log('invoice.Status:', invoiceStatus);

                if ([ 'PAID', 'REFUNDED', 'PAYMENT_PENDING', 'VOID', 'ERROR' ].includes(invoiceStatus)) {

                    // calculate and update items TotalTaxAmount and TotalPrice
                    if (invoiceItems?.length > 0) {
                        for(const item of invoiceItems) {

                            item.properties.TotalTaxAmount = OrderInvoiceItemCalculations.computeAdjustedItemTotalTaxAmountForPeriodType(
                                undefined, // do not remove expired item level discounts for the backward compatibility
                                item,
                                invoice,
                                { // ODN-1660 old invoice calculation logic was applying the order level AMOUNT discount to each item
                                    DiscountType: invoice.properties?.DiscountType,
                                    DiscountValue: invoice.properties?.DiscountValue,
                                },
                            );
                            item.properties.TotalPrice = OrderInvoiceItemCalculations.computeAdjustedItemTotalPriceForPeriodType(
                                undefined, // do not remove expired item level discounts for the backward compatibility
                                item,
                                invoice,
                                { // ODN-1660 old invoice calculation logic was applying the order level AMOUNT discount to each item
                                    DiscountType: invoice.properties?.DiscountType,
                                    DiscountValue: invoice.properties?.DiscountValue,
                                },
                            );

                            const updateInvoiceItemDto = new DbRecordCreateUpdateDto();
                            updateInvoiceItemDto.entity = `BillingModule:InvoiceItem`;
                            updateInvoiceItemDto.properties = {
                                TotalTaxAmount: item.properties.TotalTaxAmount,
                                TotalPrice: item.properties.TotalPrice,
                            };

                            const invoiceItemUpdateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/InvoiceItem/${item.id}?queue=true`,
                                apiToken,
                                updateInvoiceItemDto,
                            );

                            if (invoiceItemUpdateRes['statusCode'] !== 200) {
                                console.log('Error updating InvoiceItem.id', item.id);
                                console.log('Response:', JSON.stringify(invoiceItemUpdateRes));
                            } else {
                                console.log(
                                    `Updated InvoiceItem: ${JSON.stringify(updateInvoiceItemDto.properties)}. InvoiceItem.id: `,
                                    item.id,
                                )
                            }
                        }

                        // calculate ivoice TotalTaxAmount from the items
                        const totalTaxAmount = invoiceItems
                            .map(item => Number(item.properties.TotalTaxAmount))
                            .reduce((sum, current) => sum + current).toFixed(2);

                        // update ivoice TotalTaxAmount
                        const updateInvoiceDto = new DbRecordCreateUpdateDto();
                        updateInvoiceDto.entity = 'BillingModule:Invoice';
                        updateInvoiceDto.properties = {
                            TotalTaxAmount: totalTaxAmount,
                        };

                        const invoiceUpdateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                            `v1.0/db/Invoice/${invoice.id}`,
                            apiToken,
                            updateInvoiceDto,
                        );

                        if (invoiceUpdateRes['statusCode'] !== 200) {
                            console.log('Error updating invoice.id', invoice.id);
                            console.log('Response:', JSON.stringify(invoiceUpdateRes));
                        } else {
                            console.log(
                                `Updated invoice: ${JSON.stringify(updateInvoiceDto.properties)}. invoice.id: `,
                                invoice.id,
                            )
                        }
                    }
                } else {
                    // otherwise fully recalculate and update invoice and items

                    // set invoice trial / discount periods settings
                    if (invoice?.Discount?.dbRecords?.length > 0) {
                        const discount = invoice.Discount.dbRecords[0];

                        invoice.properties.DiscountLength = getProperty(discount, 'DiscountLength');
                        invoice.properties.DiscountUnit = getProperty(discount, 'DiscountUnit');
                        invoice.properties.TrialLength = getProperty(discount, 'TrialLength');
                        invoice.properties.TrialUnit = getProperty(discount, 'TrialUnit');
                    }

                    // calculate BillingPeriodStart and BillingPeriodEnd if they are not set
                    if (!invoice.properties.BillingPeriodStart || !invoice.properties.BillingPeriodEnd) {

                        // calculate invoice BillingPeriodStart
                        let fromDate = getProperty(invoice, 'DueDate');
                        if (!fromDate || !moment(fromDate).isValid) {
                            fromDate = getProperty(invoice, 'IssueDate');
                        }
                        let billingTermsDays: any = 0;
                        const billingTerms = getProperty(invoice, 'BillingTerms');
                        if (billingTerms) {
                            const split = billingTerms.split('_');
                            if (split.length > 1) {
                                billingTermsDays = split[1];
                            }
                        }
                        invoice.properties.BillingPeriodStart = moment(fromDate).subtract(
                            billingTermsDays,
                            'days',
                        ).format('YYYY-MM-DD');

                        console.log(`FromDate: ${fromDate}, BillingPeriodStart: ${invoice.properties.BillingPeriodStart}`);

                        // calculate invoice BillingPeriodEnd
                        // default is BillingPeriodStart + 1 MONTH
                        invoice.properties.BillingPeriodEnd = moment(invoice.properties.BillingPeriodStart).add(
                            1,
                            'month',
                        ).add(-1, 'day').format('YYYY-MM-DD');

                        // try to calculate BillingPeriodEnd from the order items
                        if (invoice.Order?.dbRecords?.length > 0) {
                            const orderRes = await httpClient.getRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                                `v1.0/db/Order/${invoice.Order.dbRecords[0].id}?entities=["OrderItem"]`,
                                apiToken,
                            );
                            const order = orderRes['data'];
                            if (order) {
                                if (order.OrderItem?.dbRecords?.length > 0) {
                                    const adjustedBillingStartDateToBillingDay = BillingDatesCalculator.getAdjustedBillingStartDateToBillingDay(
                                        order);
                                    const overriddenCurrentDate = moment(invoice.properties.BillingPeriodStart).add(
                                        1,
                                        'day',
                                    ).format('YYYY-MM-DD');
                                    const futureNextInvoiceDates = [];

                                    for(const item of order.OrderItem.dbRecords) {
                                        const orderItemRes = await httpClient.getRequest(
                                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                                            `v1.0/db/OrderItem/${item.id}?entities=["Product"]`,
                                            apiToken,
                                        );
                                        const orderItem = orderItemRes['data'];
                                        if (orderItem) {
                                            futureNextInvoiceDates.push(
                                                BillingDatesCalculator.calculateOrderItemNextInvoiceDate(
                                                    orderItem,
                                                    adjustedBillingStartDateToBillingDay,
                                                    overriddenCurrentDate,
                                                ),
                                            );
                                        }
                                    }

                                    if (futureNextInvoiceDates.length > 0) {

                                        // get the latest date to calculate billing period end
                                        const futureNextInvoiceDate = futureNextInvoiceDates.reduce((p, c) => {
                                            if (p && moment(p).isValid() && c && moment(c).isValid()) {
                                                return moment(p).isBefore(c) ? c : p;
                                            } else {
                                                return c;
                                            }
                                        });

                                        // get futureNextInvoiceDate-1 date as a resulting billing period end date
                                        invoice.properties.BillingPeriodEnd = moment(futureNextInvoiceDate).add(
                                            -1,
                                            'day',
                                        ).format('YYYY-MM-DD');
                                    }
                                }
                            }
                        }
                    }

                    // recalculate and update invoice items
                    if (invoiceItems?.length > 0) {
                        for(const item of invoiceItems) {

                            // set invoice item ProductType
                            if (!item.properties?.ProductType && item.properties?.ProductRef) {
                                const productRes = await httpClient.getRequest(
                                    Utilities.getBaseUrl(SERVICE_NAME.PRODUCT_MODULE),
                                    `v1.0/db/Product/${item.properties.ProductRef}`,
                                    apiToken,
                                );
                                const product = productRes['data'];
                                item.properties.ProductType = product?.properties?.Type;
                            }
                        }

                        // ODN-1660 recalculate items
                        const recalculatedInvoiceItems = OrderInvoiceItemCalculations.recalculateItemsTotals(
                            invoiceItems,
                            invoice,
                        );

                        for(const item of recalculatedInvoiceItems) {

                            // update invoice item
                            const updateInvoiceItemDto = new DbRecordCreateUpdateDto();
                            updateInvoiceItemDto.entity = `BillingModule:InvoiceItem`;
                            updateInvoiceItemDto.properties = {
                                TotalTaxAmount: item.properties.TotalTaxAmount,
                                TotalPrice: item.properties.TotalPrice,
                                ProductType: item.properties.ProductType,
                            };

                            const invoiceItemUpdateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/InvoiceItem/${item.id}?queue=true`,
                                apiToken,
                                updateInvoiceItemDto,
                            );

                            if (invoiceItemUpdateRes['statusCode'] !== 200) {
                                console.log('Error updating InvoiceItem.id', item.id);
                                console.log('Response:', JSON.stringify(invoiceItemUpdateRes));
                            } else {
                                console.log(
                                    `Updated InvoiceItem: ${JSON.stringify(updateInvoiceItemDto.properties)}. InvoiceItem.id: `,
                                    item.id,
                                )
                            }
                        }

                        // calculate totals and update invoice
                        const updateInvoiceDto = new DbRecordCreateUpdateDto();
                        updateInvoiceDto.entity = 'BillingModule:Invoice';
                        updateInvoiceDto.properties = {
                            Subtotal: OrderInvoiceCalculations.computeSubtotal(invoiceItems),
                            TotalDiscounts: OrderInvoiceCalculations.computeTotalDiscounts(invoiceItems, invoice),
                            TotalTaxAmount: OrderInvoiceCalculations.computeTotalTaxAmount(invoiceItems, invoice),
                            TotalDue: OrderInvoiceCalculations.computeTotal(invoiceItems, invoice),
                            Balance: OrderInvoiceCalculations.computeTotal(invoiceItems, invoice),
                            BillingPeriodStart: invoice.properties.BillingPeriodStart,
                            BillingPeriodEnd: invoice.properties.BillingPeriodEnd,
                        };

                        if (invoice.properties.DiscountUnit) {
                            updateInvoiceDto.properties['DiscountLength'] = invoice.properties.DiscountLength;
                            updateInvoiceDto.properties['DiscountUnit'] = invoice.properties.DiscountUnit;
                        }
                        if (invoice.properties.TrialUnit) {
                            updateInvoiceDto.properties['TrialLength'] = invoice.properties.TrialLength;
                            updateInvoiceDto.properties['TrialUnit'] = invoice.properties.TrialUnit;
                        }

                        const invoiceUpdateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                            `v1.0/db/Invoice/${invoice.id}?queue=true`,
                            apiToken,
                            updateInvoiceDto,
                        );

                        if (invoiceUpdateRes['statusCode'] !== 200) {
                            console.log('Error updating invoice.id', invoice.id);
                            console.log('Response:', JSON.stringify(invoiceUpdateRes));
                        } else {
                            console.log(
                                `Updated invoice: ${JSON.stringify(updateInvoiceDto.properties)}. invoice.id: `,
                                invoice.id,
                            )
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                failedRecords.push(record.id);
            }
        }

        console.log('Failed records:');
        failedRecords.forEach(id => console.log(id));

        return 'done';
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
