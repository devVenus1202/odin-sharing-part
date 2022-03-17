import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

const fs = require('fs');

dotenv.config({ path: '../../../.env' });

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
            `
            select r.id, c.value, c1.value as udprn, c2.value, r.created_at
            from db_records r
            left join db_records_columns c on (c.record_id = r.id and c.column_name = 'ExPolygonId')
            left join db_records_columns c1 on (c1.record_id = r.id and c1.column_name = 'UDPRN')
            left join db_records_columns c2 on (c2.record_id = r.id and c2.column_name = 'BuildStatus')
            where r.entity = 'CrmModule:Address'
            and r.deleted_at is null
            and c2.value is null
            and c1.value is null
            `);

        console.log('records', records.length)
        console.log('records', records)

        let deletes = 0;
        for(const record of records) {
            const deleteRes = await httpClient.deleteRequest(
                Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                `v1.0/db/Address/${record.id}`,
                apiToken,
            );
            deletes++
            console.log('deleteRes', deleteRes);
        }

        console.log('deletes', deletes)

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
