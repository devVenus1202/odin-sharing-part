import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

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
				left join db_records_columns c8 on (c8.record_id = r.id AND c8.column_name = 'TotalDue')
				left join db_records_columns c9 on (c9.record_id = r.id AND c9.column_name = 'TotalTaxAmount')
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
                  and (c8.value::float < 0)
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
                    `v1.0/db/Invoice/${record.id}`,
                    apiToken,
                );
                const invoice = invoiceRes['data'];

                console.log('address', invoice.title)
                console.log('number', invoice.recordNumber)

                const invoiceStatus = getProperty(invoice, 'Status');
                const invoiceDueDate = getProperty(invoice, 'DueDate');
                const invoiceTotalDue = getProperty(invoice, 'TotalDue');

                console.log('invoice.Status:', invoiceStatus);
                console.log('invoice.DueDate:', invoiceDueDate);
                console.log('invoice.TotalDue:', invoiceTotalDue);


                // update ivoice TotalTaxAmount
                const updateInvoiceDto = new DbRecordCreateUpdateDto();
                updateInvoiceDto.entity = 'BillingModule:Invoice';
                updateInvoiceDto.properties = {
                    TotalTaxAmount: '0.00',
                    TotalDue: '0.00',
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
