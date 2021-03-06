import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import {
    getAllRelations,
    getFirstRelation,
    getProperty,
} from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';
import { sleep } from '../../../helpers/utilities';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

// Run this every minute
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

        const events = await pg.query(
            `SELECT action, details_cause, details_description, links_payment, created_at
                    FROM gocardless.events
                    WHERE resource_type = 'payments'
                    AND created_at > now() - interval '5 minutes'
                    ORDER BY created_at ASC`);

        console.log('events', events.length)

        for(const event of events) {

            const dbRecord = await pg.query(`SELECT c.record_id FROM db_records_columns as c WHERE c.value = '${event.links_payment}' AND c.deleted_at IS NULL `);

            if (dbRecord[0]) {

                const record = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db/Transaction/${dbRecord[0].record_id}?entities=["Invoice"]`,
                    apiToken,
                );

                const transaction = record['data'];
                const transactionInvoice = getFirstRelation(transaction, 'Invoice');

                if (transaction) {
                    console.log('event.action', event.action);
                    console.log('IS_DIFF', getProperty(transaction, 'Status') !== constantCase(event.action))
                    // Only if the statuses are different then do the update
                    if (getProperty(transaction, 'Status') !== constantCase(event.action)) {

                        const update = new DbRecordCreateUpdateDto();
                        update.entity = `${SchemaModuleTypeEnums.BILLING_MODULE}:${SchemaModuleEntityTypeEnums.TRANSACTION}`;
                        update.properties = {
                            Status: constantCase(event.action),
                            StatusUpdatedAt: event.created_at,
                            Description: event.details_description,
                        };

                        await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                            `v1.0/db/Transaction/${transaction.id}?queue=true`,
                            apiToken,
                            update,
                        );

                        // Update the Invoice status
                        if (transactionInvoice) {

                            let Status;
                            // set the Odin status from the gocardless status
                            switch (event.action) {
                                case 'submitted':
                                case 'created':
                                case 'confirmed':
                                    Status = 'PAYMENT_PENDING';
                                    break;
                                case 'cancelled':
                                case 'failed':
                                    Status = 'ERROR';
                                    break;
                                case 'paid_out':
                                    Status = 'PAID';
                                    break;
                            }

                            // Sum the total value of successful transactions
                            // Subtract from the TotalDue
                            const invoiceRes = await httpClient.getRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/Invoice/${transactionInvoice.id}?entities=["Transaction"]&filters=["Status:PAID_OUT"]`,
                                apiToken,
                            );

                            const invoice = invoiceRes['data'];
                            const transactionsPaidOut = getAllRelations(invoice, 'Transaction');

                            console.log('transactionsPaidOut', transactionsPaidOut)

                            // sum invoice transactions that are paid_out
                            let totalPayments = 0;
                            if (transactionsPaidOut) {
                                for(const trans of transactionsPaidOut) {
                                    if (getProperty(trans, 'Type') === 'PAYMENT') {
                                        const amount = getProperty(trans, 'Amount');
                                        totalPayments += Number(amount);
                                    }
                                }
                            }

                            console.log('totalPayments', totalPayments)

                            const totalDue = getProperty(invoice, 'TotalDue');
                            const newBalance = Number(totalDue) - Number(totalPayments);

                            console.log('totalDue', totalDue);
                            console.log('totalPayments', totalPayments);
                            console.log('newBalance', newBalance);
                            console.log('event_created', event.created_at)

                            // Set the new status if there is a remaining Balance on the Invoice
                            // does not equal the totalDue and the newBalance is > 1
                            if (Number(totalDue) > Number(newBalance) && Number(newBalance) > 1) {
                                Status = 'PARTIAL'
                            }

                            let pastDueDays = getProperty(invoice, 'PastDueDays')
                            let settledDate = undefined;
                            // Set SettledDate of the invoice if the Invoice Balance is 0
                            if (Number(newBalance) === 0) {
                                settledDate = getProperty(transactionsPaidOut[0], 'StatusUpdatedAt')
                                pastDueDays = 0
                            }

                            const update = new DbRecordCreateUpdateDto();
                            update.entity = `${SchemaModuleTypeEnums.BILLING_MODULE}:${SchemaModuleEntityTypeEnums.INVOICE}`;
                            update.properties = {
                                Status, // TODO: Add constantCase(Status) when we update the Status to ENUMs
                                StatusUpdatedAt: event.created_at,
                                Balance: newBalance,
                                SettledDate: settledDate,
                                PastDueDays: pastDueDays,
                            };

                            await sleep(50)
                            const updateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/Invoice/${invoice.id}?queue=true`,
                                apiToken,
                                update,
                            );
                            console.log('updateRes', updateRes);
                        }
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
