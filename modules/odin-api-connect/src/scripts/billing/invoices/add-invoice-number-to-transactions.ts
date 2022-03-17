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

        const allInvoices = await pg.query(
            `
            SELECT db_records.id
            FROM db_records
            WHERE entity = 'BillingModule:Invoice'
            AND db_records.deleted_at IS NULL;`);

        console.log(allInvoices, allInvoices.length)


        for(const record of allInvoices) {
            const invoiceRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                `v1.0/db/Invoice/${record.id}?entities=["Transaction"]`,
                apiToken,
            );
            const invoice = invoiceRes['data'];
            const transactions = invoice['Transaction'].dbRecords;

            console.log('transactions', transactions ? transactions.length : 0)

            if (transactions) {
                for(const item of transactions) {
                    if (!getProperty(item, 'InvoiceRef')) {
                        console.log('inv', invoice.recordNumber);
                        // Update the invoice item
                        const updateDto = new DbRecordCreateUpdateDto();
                        updateDto.entity = `BillingModule:Transaction`;
                        updateDto.properties = {
                            InvoiceRef: invoice.recordNumber,
                        };

                        console.log('updateDto', updateDto);

                        const updateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                            `v1.0/db/Transaction/${item.id}?queue=true`,
                            apiToken,
                            updateDto,
                        );
                        const update = updateRes['data'];
                        console.log('update', update);
                    }
                }
            }
        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
