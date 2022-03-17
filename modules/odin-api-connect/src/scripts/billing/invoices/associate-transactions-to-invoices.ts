import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

const fs = require('fs');

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

        const transactions = await pg.query(
            `
                select * from db_records r
                where r.entity = 'BillingModule:Transaction'
                and not exists (
                    select child_record_id
                    from db_records_associations a
                    where a.parent_entity = 'BillingModule:Invoice'
                    and a.child_entity = 'BillingModule:Transaction'
                )
                and r.deleted_at is null
            `);


        for(const record of transactions) {

            const activity = await pg.query(
                `
            select * from logs.user_activity a where record_id = '${record.id}'
            and a.type = 'DB_RECORD_ASSOCIATION_CREATED'
            `);

            let parentRecordId;
            let newAssociation;
            console.log('record', record.id)

            console.log('activity', activity)

            if (activity.length > 0) {
                const invoiceEvent = activity.find(elem => elem.revision.parentEntity === 'BillingModule:Invoice' && elem.revision.childEntity === 'BillingModule:Transaction')
                console.log('invoiceEvent', invoiceEvent)

                newAssociation = new DbRecordAssociationCreateUpdateDto()
                newAssociation.recordId = record.id

                parentRecordId = invoiceEvent.revision.parentRecordId

            } else {

                const createdEvents = await pg.query(
                    `
                    select * from logs.user_activity a where record_id = '${record.id}'
                    and a.type = 'DB_RECORD_CREATED'
                `);

                console.log('createdEvents', createdEvents)

                if (createdEvents.length > 0) {
                    const associations = createdEvents[0]['revision']['associations']
                    if (associations.length === 1) {
                        newAssociation = new DbRecordAssociationCreateUpdateDto()
                        newAssociation.recordId = record.id

                        parentRecordId = associations[0]['recordId']
                    }
                }
            }

            console.log('newAssociation', newAssociation, parentRecordId)


            if (newAssociation) {
                const res = await httpClient.postRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    `v1.0/db-associations/Invoice/${parentRecordId}`,
                    apiToken,
                    [ newAssociation ],
                );

                console.log('newAssociation', res);

            }

        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
