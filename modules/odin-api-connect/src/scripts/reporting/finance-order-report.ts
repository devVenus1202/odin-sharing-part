import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import { Parser } from 'json2csv';
import moment from 'moment';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { putObjectToS3 } from '../../common/awsS3/buckets/buckets.service';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import { OrderItemCalculations } from '../../helpers/OrderItemCalculations';
import { getFromS3 } from '../../integrations/netomnia/connections/data/http';

const fs = require('fs');

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

class OrderReportRow {
    customerId: string;
    orderId: string;
    orderNumber: string;
    billingInterval: string;
    region: string;
    project: string;
    stageName: string;
    issuedDate: string;
    activeDate: string;
    cancelledDate: string;
    cancellationReason: string;
    cancellationReasonNote: string;
    contractType: string;
    contractStartDate: string;
    contractEndDate: string;
    contractRenewalCount: string;
    lineItem: string;
    billingPeriod: string;
    billingStartDate: string;
    nextInvoiceDate: string;
    nextBillingDate: string;
    trialEndDate: string;
    discountEndDate: string;
    totalPrice: string;
    totalDiscounts: string;
    netPrice: string;
}

// Run this at 1:00am daily
async function sync() {

    // Command line arguments
    let argEmails = process.argv.find(arg => arg.indexOf('emails') > -1);
    let emails = argEmails ? argEmails.split('=')[1] : null;

    if(!emails) {
        throw Error('comma separated list of emails required or a single email address');
    }

    function standardizeDate(property: any) {
        if(!!property) {
            return moment(property, 'YYYY-MM-DD').format('DD/MM/YYYY');
        }
        return undefined;
    }

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

        const allOrders = await pg.query(
            `SELECT db_records.id
            FROM db_records
            RIGHT JOIN schemas as schema ON (db_records.schema_id = schema.id)
            WHERE schema.entity_name = 'Order'
            AND db_records.deleted_at IS NULL
            ORDER BY db_records.created_at DESC;`);

        const report = [];
        const missingAddress = [];
        const missingInvoiceItem = [];
        const missingOrder = [];

        for(const record of allOrders) {
            const orderRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                `v1.0/db/Order/${record.id}?entities=["Contact", "Address", "OrderItem"]`,
                apiToken,
            );
            console.log('orderRes', orderRes);
            const order = orderRes['data'];
            const contact = order['Contact'].dbRecords;
            const address = order['Address'].dbRecords;
            const orderItems = order['OrderItem'].dbRecords;

            if(!contact) {
                console.log(order.id, order.title);
            }

            if(orderItems && order) {

                // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
                const orderDiscount = {
                    DiscountType: order.properties.DiscountType,
                    DiscountValue: order.properties.DiscountValue,
                };

                // ODN-1660 sort order items to apply the order level AMOUNT discount correctly
                const sortedItems = OrderInvoiceItemCalculations.sortItemsByProductTypeAndPrice(orderItems);

                for(const item of sortedItems) {

                    const orderItemRes = await httpClient.getRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                        `v1.0/db/OrderItem/${item.id}?entities=["Product"]`,
                        apiToken,
                    )
                    const orderItem = orderItemRes['data'];
                    const products = orderItem['Product'].dbRecords;

                    const product = products[0];
                    const intervalLength = getProperty(product, 'IntervalLength');
                    const intervalUnit = getProperty(product, 'IntervalUnit');

                    const trialEndDate = getProperty(item, 'TrialEndDate');
                    console.log('trialEndDate', trialEndDate);

                    const orderReportRow = new OrderReportRow();
                    orderReportRow.customerId = contact ? contact[0].id : undefined;
                    orderReportRow.orderId = order.id;
                    orderReportRow.orderNumber = order.recordNumber;
                    orderReportRow.billingInterval = `${intervalLength} ${intervalUnit}`;
                    orderReportRow.project = '';
                    orderReportRow.region = address ? getProperty(address[0], 'City') : undefined;
                    orderReportRow.stageName = order.stage.name;
                    orderReportRow.issuedDate = standardizeDate(getProperty(order, 'IssuedDate'));
                    orderReportRow.activeDate = standardizeDate(getProperty(order, 'ActiveDate'));
                    orderReportRow.cancelledDate = standardizeDate(getProperty(order, 'CancelledDate'));
                    orderReportRow.cancellationReason = getProperty(order, 'CancellationReason');
                    orderReportRow.cancellationReasonNote = getProperty(order, 'CancellationReasonNote');
                    orderReportRow.contractType = getProperty(order, 'ContractType');
                    orderReportRow.contractStartDate = standardizeDate(getProperty(order, 'ContractStartDate'));
                    orderReportRow.contractEndDate = standardizeDate(getProperty(order, 'ContractEndDate'));
                    orderReportRow.contractRenewalCount = getProperty(order, 'ContractRenewalCount');
                    orderReportRow.lineItem = item.title;
                    orderReportRow.billingPeriod = getProperty(item, 'BillingPeriodType');
                    orderReportRow.billingStartDate = standardizeDate(getProperty(item, 'BillingStartDate'));
                    orderReportRow.nextInvoiceDate = standardizeDate(getProperty(item, 'NextInvoiceDate'));
                    orderReportRow.nextBillingDate = standardizeDate(getProperty(item, 'NextBillingDate'));
                    orderReportRow.trialEndDate = standardizeDate(getProperty(item, 'TrialEndDate'));
                    orderReportRow.discountEndDate = standardizeDate(getProperty(item, 'DiscountEndDate'));

                    const lineItemSummary = OrderItemCalculations.computeLineItemSummary(item, order, orderDiscount);

                    // subtotal
                    orderReportRow.totalPrice = (Number(lineItemSummary.lineItemSubtotal) / Number(intervalLength)).toFixed(2);
                    // discounts
                    orderReportRow.totalDiscounts = (Number(lineItemSummary.lineItemTotalDiscounts) / Number(intervalLength)).toFixed(2);
                    // subtotal - discounts
                    orderReportRow.netPrice = (Number(lineItemSummary.lineItemTotalPrice) / Number(intervalLength)).toFixed(2);

                    console.log('orderReportRow', orderReportRow);

                    report.push(orderReportRow);

                }
            }
        }

        if(report[0]) {

            let csv = '';
            const fields = Object.keys(report[0]).map(elem => (elem));

            try {
                // csv = parse({ data: report, fields });
                const parser = new Parser({ fields });
                csv = parser.parse(report);
            } catch (err) {
                console.error(err);
            }

            await putObjectToS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `order-report-${moment().format('DD-MM-YYYY')}.csv`,
                Buffer.from(csv, 'utf8'),
            )

            const link = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `order-report-${moment().format('DD-MM-YYYY')}.csv`,
            )

            let parsedEmails = [];
            const split = emails.split(',');

            if(split && split.length > 0) {

                parsedEmails = split.map(elem => elem.trim());

            } else {

                parsedEmails = [ emails ]

            }

            const newEmail = new SendgridEmailEntity();
            newEmail.to = parsedEmails;
            newEmail.from = 'hello@youfibre.com';
            newEmail.templateId = 'd-11fb70c66a344dd881d9064f5e03aebf';
            newEmail.dynamicTemplateData = {
                subject: 'Sales order export',
                body: `${link}`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );

        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
