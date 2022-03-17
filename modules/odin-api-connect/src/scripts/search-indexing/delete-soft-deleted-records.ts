import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import { chunkArray } from '../../helpers/utilities';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

// ODN-1858 Create a script that will check all soft deleted records and ensure they are deleted from Elastic Search
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

        // Get all soft deleted records
        const records = await pg.query(
            `select * from db_records where deleted_at is not null`);

        const batches = chunkArray(records, 50)

        for(const batch of batches) {

            const parallelProcess = []
            for(const record of batch) {
                parallelProcess.push({
                    func: httpClient.deleteRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.SEARCH_MODULE),
                        `v1.0/search/${record.id}`,
                        apiToken,
                    ),
                });
            }

            const res = await Promise.all(parallelProcess.map(elem => elem.func))

            console.log('res', res)
        }

        return;
    } catch (e) {
        console.error(e);
    }
}

sync();
