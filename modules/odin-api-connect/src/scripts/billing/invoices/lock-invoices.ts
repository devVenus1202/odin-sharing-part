import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';
import moment = require('moment');

dotenv.config({ path: '../../../../.env' });
//dotenv.config({ path: './modules/odin-api-connect/.env' }); // local debug

const apiToken = process.env.ODIN_API_TOKEN;

// Run this script every day at midnight
async function sync() {
    try {
        // Command line arguments
        const allArg = process.argv.find(arg => arg.indexOf('all') > -1);
        const processAllInvoices = !!allArg;
        console.log('processAllInvoices', processAllInvoices);

        // check current date is not before the locking day
        const currentDate = moment(moment().utc().format('YYYY-MM-DD'));
        const lockingDate = moment(currentDate.format('YYYY-MM-DD')).date(2);
        const monthStartDate = moment(currentDate.format('YYYY-MM-DD')).date(1);

        console.log('currentDate:', currentDate.format('YYYY-MM-DD'));
        console.log('lockingDate:', lockingDate.format('YYYY-MM-DD'));
        console.log('monthStartDate:', monthStartDate.format('YYYY-MM-DD'));

        if (currentDate.isBefore(lockingDate)) {
            console.log(`today ${currentDate.format('YYYY-MM-DD')} is before the locking day ${lockingDate.date()}, waiting...`);
            return;
        }

        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const records = await pg.query(`
    SELECT r.id
        , c1.Value as Status
        , c2.Value as DueDate
        , c3.Value as IssuedDate
    FROM db_records as r
        left join db_records_columns c1 on (c1.record_id = r.id AND c1.column_name = 'Status')
        left join db_records_columns c2 on (c2.record_id = r.id AND c2.column_name = 'DueDate')
        left join db_records_columns c3 on (c3.record_id = r.id AND c3.column_name = 'IssuedDate')
        left join db_records_columns c4 on (c4.record_id = r.id AND c4.column_name = 'IsLocked')
    WHERE r.entity = 'BillingModule:Invoice' and r.deleted_at is null
        and (
            c4.Value <> 'true'
            or 
            c4.Value is null
        )
        ${processAllInvoices ? "" : "and r.created_at >  now() - interval '2 months'"}
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

                const invoiceId = record.id;
                const invoiceStatus = record.status;
                console.log('invoice.Status:', invoiceStatus);

                let invoiceDate = record.duedate;
                if (!invoiceDate || !moment(invoiceDate).isValid) {
                    invoiceDate = record.issueddate;
                }
                console.log('invoiceDate:', invoiceDate);

                if (!invoiceDate || !moment(invoiceDate).isValid) {
                    console.warn('unable to read invoice DueDate or IssuedDate, skip');
                    continue;
                }

                const lockInvoice = moment(invoiceDate).isBefore(monthStartDate);
                if (!lockInvoice) {
                    console.log('invoiceDate is not before the month start date, skip')
                }

                if (lockInvoice) {
                    // lock invoice
                    const updateInvoiceDto = new DbRecordCreateUpdateDto();
                    updateInvoiceDto.entity = 'BillingModule:Invoice';
                    updateInvoiceDto.properties = {
                        IsLocked: true,
                    };

                    const invoiceUpdateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                        `v1.0/db/Invoice/${invoiceId}`,
                        apiToken,
                        updateInvoiceDto,
                    );

                    if (invoiceUpdateRes['statusCode'] !== 200) {
                        console.log('Error updating invoice.id', invoiceId);
                        console.log('Response:', JSON.stringify(invoiceUpdateRes));
                    } else {
                        console.log(
                            `Updated invoice: ${JSON.stringify(updateInvoiceDto.properties)}. invoice.id: `,
                            invoiceId,
                        );
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
