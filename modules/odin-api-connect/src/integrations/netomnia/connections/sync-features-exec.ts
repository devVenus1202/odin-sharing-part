import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { syncFeatures } from './sync-features';

dotenv.config({ path: '../../../../.env' });

let odinDb
let cosmosDb;

async function execute() {

    try {

        // Command line arguments
        let argInterval = process.argv.find(arg => arg.indexOf('interval') > -1);
        let interval = argInterval ? argInterval.split('=')[1] : null;

        let argStartDate = process.argv.find(arg => arg.indexOf('start') > -1);
        let startDate = argStartDate ? argStartDate.split('=')[1] : null;

        let argEndDate = process.argv.find(arg => arg.indexOf('end') > -1);
        let endDate = argEndDate ? argEndDate.split('=')[1] : null;

        let argPolyOverride = process.argv.find(arg => arg.indexOf('l1polygonids') > -1);
        let polygonIds = argPolyOverride ? argPolyOverride.split('=')[1] : null;

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

        const principal = new OrganizationUserEntity()
        principal.firstname = 'frank';
        principal.email = 'frank@d19n.io';

        let l1PolygonIds = await cosmosDb.query(`
            SELECT distinct(c.id) as value
            FROM ftth.polygon as b, ftth.polygon as c
            WHERE c.name = 'L1'
            AND ST_Intersects(b.geometry, c.geometry)
            AND b.name = 'EX'
            AND b.id = 40665
            ORDER by c.id asc
        `)

        l1PolygonIds = l1PolygonIds.map(elem => elem.value).join()
        if (polygonIds) {
            l1PolygonIds = polygonIds;
        }

        console.log('l1PolygonIds', l1PolygonIds)

        await syncFeatures(principal, l1PolygonIds, { startDate, endDate, interval }, { odinDb, cosmosDb })

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}

execute();

