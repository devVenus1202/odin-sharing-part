import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

const fs = require('fs');

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;
const baseUrl = process.env.K8_BASE_URL;

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
            `SELECT db_records.id
            FROM db_records
            LEFT JOIN db_records_columns c on (db_records.id = c.record_id and c.column_name = 'Status')
            RIGHT JOIN schemas as schema ON (db_records.schema_id = schema.id)
            WHERE schema.entity_name = 'Invoice'
            AND db_records.deleted_at IS NULL
            AND db_records.created_at > '2021-06-28'::date
        ;`);

        console.log('ttl invoices', allInvoices.length)


        for(const record of allInvoices) {
            const invoiceRes = await httpClient.getRequest(
                baseUrl,
                `BillingModule/v1.0/db/Invoice/${record.id}?entities=["Order"]`,
                apiToken,
            );
            const invoice = invoiceRes['data'];
            const invoiceOrder = invoice['Order'].dbRecords;

            const invoiceTotalDue = getProperty(invoice, 'TotalDue')
            const orderTotalPrice = getProperty(invoiceOrder, 'TotalPrice')

            if (Number(invoiceTotalDue) > Number(orderTotalPrice)) {
                console.log('invoice amount greater', invoice.title, invoiceTotalDue, orderTotalPrice)
            }

        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
