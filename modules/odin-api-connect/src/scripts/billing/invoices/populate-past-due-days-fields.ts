import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import moment from 'moment';
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

        const openInvoices = await pg.query(
            `SELECT db_records.id
            FROM db_records
            LEFT JOIN db_records_columns c on (c.record_id = db_records.id and c.column_name = 'Status')
            WHERE db_records.entity = 'BillingModule:Invoice'
            AND c.value IN ('ERROR', 'SCHEDULED', 'PAYMENT_PENDING')
            AND db_records.deleted_at IS NULL
            ;`);

        let total = openInvoices.length;

        for(const record of openInvoices) {

            console.log('remaining: ', total -= 1)

            // Get the invoice
            const invoiceRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                `v1.0/db/Invoice/${record.id}`,
                apiToken,
                false,
            );
            const invoice = invoiceRes['data'];

            console.log('INVOICE_ID', invoice.id)

            const status = getProperty(invoice, 'Status')

            if ([ 'ERROR', 'SCHEDULED', 'PAYMENT_PENDING' ].includes(status)) {
                const pastDueDays = moment().utc().diff(
                    moment(getProperty(invoice, 'DueDate'), 'YYYY-MM-DD').format('YYYY-MM-DD'),
                    'days',
                );

                console.log('pastDueDays', pastDueDays)

                // Update the invoice
                const updateDto = new DbRecordCreateUpdateDto();
                updateDto.entity = `BillingModule:Invoice`;
                updateDto.properties = {
                    PastDueDays: pastDueDays,
                };

                console.log('updateDto', updateDto)

                const updateRes = await httpClient.putRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db/Invoice/${invoice.id}`,
                    apiToken,
                    updateDto,
                );
            }
        }

        return;

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
