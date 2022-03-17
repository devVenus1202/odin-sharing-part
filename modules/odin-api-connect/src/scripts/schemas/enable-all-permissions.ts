import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const odinapitoken = process.env.ODIN_API_TOKEN;

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
            synchronize: false,
            entities: [],
        });

        const schemas = await pg.query(
            `
            SELECT schemas.id
            FROM schemas
            where schemas.entity_name NOT IN ('Note', 'File', 'Map')
        `);

        console.log(schemas)

        for(const schema of schemas) {

            // enable permissions for all schemas
            const permissionsRes = await httpClient.postRequest(
                Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                `v1.0/rbac/permissions/schemas/batch/${schema.id}`,
                odinapitoken,
                {},
            );
            console.log('permissionsRes', permissionsRes)
        }

    } catch (e) {
        console.error(e);
    }
}

sync();
