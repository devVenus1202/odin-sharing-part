import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../../.env' });

const productionToken = process.env.ODIN_API_TOKEN;

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
            `
            SELECT action, details_cause, details_description, links_refund, created_at
            FROM gocardless.events
            WHERE resource_type = 'refunds'
            AND created_at > now() - interval '5 minutes'
            ORDER BY created_at ASC`);

        console.log('events', events.length)

        for(const event of events) {

            const dbRecord = await pg.query(`
                    SELECT c.record_id
                    FROM db_records_columns as c
                    WHERE c.value = '${event.links_refund}'
                    AND c.deleted_at IS NULL `);

            if (dbRecord[0]) {
                const record = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db/Transaction/${dbRecord[0].record_id}?entities=["Invoice","CreditNote"]`,
                    productionToken,
                );

                const transaction = record['data'];
                const invoices = transaction['Invoice'].dbRecords;
                const creditNotes = transaction['CreditNote'].dbRecords;

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

                        console.log(update);
                        const updateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                            `v1.0/db/Transaction/${record['data'].id}?queue=true`,
                            productionToken,
                            update,
                        );
                        console.log('updateRes', updateRes);

                        let status;
                        // set the Odin status from the gocardless status
                        switch (event.action) {
                            case 'created':
                                status = 'REFUND_PENDING';
                                break;
                            case 'failed':
                                status = 'ERROR';
                                break;
                            case 'refund_settled':
                                status = 'REFUNDED';
                                break;
                        }

                        // Update the Invoice status
                        if (invoices && invoices[0] && status) {

                            const update = new DbRecordCreateUpdateDto();
                            update.entity = `${SchemaModuleTypeEnums.BILLING_MODULE}:${SchemaModuleEntityTypeEnums.INVOICE}`;
                            update.properties = {
                                Status: status,
                            };
                            console.log(update);
                            const updateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/Invoice/${invoices[0].id}?queue=true`,
                                productionToken,
                                update,
                            );
                            console.log('updateRes', updateRes);
                        }

                        // ODN-1545 update the credit note status
                        if (creditNotes && creditNotes[0] && status) {
                            const update = new DbRecordCreateUpdateDto();
                            update.entity = `${SchemaModuleTypeEnums.BILLING_MODULE}:${SchemaModuleEntityTypeEnums.CREDIT_NOTE}`;
                            update.properties = {
                                Status: status,
                            };
                            console.log(update);
                            const updateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                                `v1.0/db/CreditNote/${creditNotes[0].id}?queue=true`,
                                productionToken,
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
