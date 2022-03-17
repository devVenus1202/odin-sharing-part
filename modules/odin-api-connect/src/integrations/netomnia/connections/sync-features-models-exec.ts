import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { syncFeatureModels } from './sync-features-models';

dotenv.config({ path: '../../../../.env' });

let cosmosDb;

async function execute() {

    try {

        let odinDb;

        try {

            odinDb = await createConnection({
                type: 'postgres',
                name: 'odinDb',
                host: process.env.DB_HOSTNAME,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                entities: [],
            });
        } catch (e) {
            console.error(e);
            odinDb = await getConnection('odinDb');
        }

        await syncFeatureModels({ odinDb })


        odinDb.close();

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}

execute();

