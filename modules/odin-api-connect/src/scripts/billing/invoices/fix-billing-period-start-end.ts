import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import dayjs from 'dayjs';
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
                 and c6.value::date < '2021-01-01'::date
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

                console.log('address', invoice.title)
                console.log('number', invoice.recordNumber)

                const invoiceStatus = getProperty(invoice, 'Status');
                const invoiceItems = <DbRecordEntityTransform[]>invoice?.InvoiceItem?.dbRecords;
                const invoiceOrder = getFirstRelation(invoice, 'Order');

                console.log('invoice.Status:', invoiceStatus);

                // calculate BillingPeriodStart and BillingPeriodEnd if they are not set

                // calculate invoice BillingPeriodStart
                let fromDate = getProperty(invoice, 'DueDate');
                console.log('DueDate', fromDate)
                if (!fromDate || !moment(fromDate).isValid) {
                    fromDate = getProperty(invoice, 'IssueDate');
                }
                let billingTermsDays: any = 0;
                const billingTerms = getProperty(invoice, 'BillingTerms');
                console.log('billingTerms', billingTerms)
                if (billingTerms) {
                    const split = billingTerms.split('_');
                    if (split.length > 1) {
                        billingTermsDays = split[1];
                    }
                }

                console.log('billingTermsDays', billingTermsDays)

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
                ).subtract(1, 'day').format('YYYY-MM-DD');


                console.log('invoice.properties.BillingPeriodStart', invoice.properties.BillingPeriodStart)

                // set the billing start date based on the "day" of the billing period start
                // this takes into account an billing day changes that were done at a later date
                if (!getProperty(invoice, 'BillingStartDate')) {
                    const dayOfMonth = dayjs(invoice.properties.BillingPeriodStart, 'YYYY-MM-DD').get('date')
                    console.log('dayOfMonth', dayOfMonth)
                    invoice.properties.BillingStartDate = dayjs(getProperty(invoiceOrder, 'BillingStartDate')).set(
                        'date',
                        dayOfMonth,
                    ).format('YYYY-MM-DD');

                    invoice.properties.BillingPeriodEnd = dayjs(invoice.properties.BillingPeriodEnd).set(
                        'date',
                        dayOfMonth,
                    ).subtract(
                        -1,
                        'day',
                    ).format('YYYY-MM-DD');
                }

                console.log(
                    'diff',
                    dayjs(invoice.properties.BillingPeriodEnd).diff(invoice.properties.BillingPeriodStart, 'days'),
                )

                if (dayjs(invoice.properties.BillingPeriodEnd).diff(
                    invoice.properties.BillingPeriodStart,
                    'days',
                ) > 200) {

                    console.log('DIFFERENCE IS GREATER THAN 200 DAYS')

                }

                // update ivoice TotalTaxAmount
                const updateInvoiceDto = new DbRecordCreateUpdateDto();
                updateInvoiceDto.entity = 'BillingModule:Invoice';
                updateInvoiceDto.properties = {
                    BillingPeriodStart: invoice.properties.BillingPeriodStart,
                    BillingPeriodEnd: invoice.properties.BillingPeriodEnd,
                };

                console.log('updateInvoiceDto', updateInvoiceDto)

                const invoiceUpdateRes = await httpClient.putRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db/Invoice/${invoice.id}?queue=true`,
                    apiToken,
                    updateInvoiceDto,
                );

                console.log('invoiceUpdateRes', invoiceUpdateRes)


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
