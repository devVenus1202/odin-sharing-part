import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { deleteFeaturesNotInOdin } from './importers/delete-features-not-in-gis';

dotenv.config({ path: '../../../../.env' });

let odinDb;
let cosmosDb;

// Command line arguments
let argStartDate = process.argv.find(arg => arg.indexOf('start') > -1);
let startDate = argStartDate ? argStartDate.split('=')[1] : null;

let argEndDate = process.argv.find(arg => arg.indexOf('end') > -1);
let endDate = argEndDate ? argEndDate.split('=')[1] : null;


async function execute() {

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

    try {

        cosmosDb = await createConnection({
            type: 'postgres',
            name: 'netomniaConnection',
            host: process.env.DB_GIS_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_GIS_USERNAME,
            password: process.env.DB_GIS_PASSWORD,
            database: process.env.DB_GIS_NAME,
            synchronize: false,
            entities: [],
        });

    } catch (e) {
        console.error(e);
        cosmosDb = await getConnection('cosmosDb');
    }


    try {

        const principal = new OrganizationUserEntity()
        principal.firstname = 'frank';
        principal.email = 'frank@d19n.io';

        for(const featureType of [ 'CLOSURE', 'CABLE', 'CHAMBER', 'DUCT' ]) {
            await deleteFeaturesNotInOdin(
                principal,
                undefined,
                featureType,
                { odinDb, cosmosDb },
                startDate,
                endDate,
            )
        }

        odinDb.close();

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }

    return 'done'
}

execute();

