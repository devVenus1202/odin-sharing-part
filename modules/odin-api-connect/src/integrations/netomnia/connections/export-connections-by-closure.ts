import * as dotenv from 'dotenv';
import { Parser } from 'json2csv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { putObjectToS3 } from '../../../common/awsS3/buckets/buckets.service';
import {
    getClosureByCableIdAndDirection,
    getClosuresByL2yPolygonId,
    getConnectionsByClosureId,
    getOdinRecordByExternalRef,
} from './data/sql';
import { getClosureTypeFromId } from './data/utils';

const fs = require('fs');

dotenv.config({ path: '../../../../.env' });

let odinDb;

let argPolygonId = process.argv.find(arg => arg.indexOf('polygonid') > -1);
let polygonId = argPolygonId ? argPolygonId.split('=')[1] : null;

let argClosureId = process.argv.find(arg => arg.indexOf('closureid') > -1);
let closureId = argClosureId ? argClosureId.split('=')[1] : null;

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

        // create a directory and save the files
        const dir = `connections-${polygonId || closureId}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }


        let odinClosures = []

        if (closureId) {

            const dbRecord = await getOdinRecordByExternalRef(Number(closureId), 'CLOSURE', { odinDb });

            console.log('dbRecord', dbRecord)

            odinClosures = [
                dbRecord,
            ]

        } else {
            // Odin data by polygon
            odinClosures = await getClosuresByL2yPolygonId(polygonId, { odinDb })
        }

        console.log('odinClosures', odinClosures)

        for(const closure of odinClosures) {

            const closureConnections = await getConnectionsByClosureId(closure['id'], { odinDb })

            console.log('closureConnections', closure['id'], closureConnections)

            let parsedConnections = [];

            let lastInCableId = undefined;
            let inClosureExtRef;

            for(const connection of closureConnections) {

                if (!inClosureExtRef && lastInCableId !== connection['in_cable_id']) {
                    const upstreamClosure = await getClosureByCableIdAndDirection(
                        connection['in_cable_id'],
                        'IN',
                        { odinDb },
                    )
                    inClosureExtRef = upstreamClosure[0]['to_closure_ext_ref'];
                }

                lastInCableId = connection['in_cable_id'];

                console.log('inClosureExtRef', inClosureExtRef)

                connection['in_closure'] = inClosureExtRef;
                connection['type'] = connection['type'];

                delete connection['in_cable_id']

                parsedConnections.push(connection)

            }

            if (parsedConnections[0]) {

                let csv = null;
                const fields = Object.keys(parsedConnections[0]).map(elem => (elem));

                try {
                    // csv = parse({ data: report, fields });
                    const parser = new Parser({ fields });
                    csv = parser.parse(parsedConnections);
                } catch (err) {
                    console.error(err);
                }

                fs.writeFileSync(`./${dir}/connections-${closure['type']}-${closure['ext_ref']}.csv`, csv)

                if (csv) {

                    const closureTypeName = getClosureTypeFromId(Number(closure['type']))

                    await putObjectToS3(
                        `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                        `auto-connect/polygon-${polygonId}/connections/${closureTypeName}-${closure['ext_ref']}.csv`,
                        csv,
                    )
                }
            }
        }

        odinDb.close();

        return 'export complete';

    } catch (e) {
        console.error(e);
    }
}

execute();

