import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { getFromS3 } from './data/http';
import { getClosureTypeFromId } from './data/utils';

dotenv.config({ path: '../../../../.env' });

let odinDb;
let cosmosDb;

async function execute() {

    // Command line arguments
    let argPolygonId = process.argv.find(arg => arg.indexOf('polygonid') > -1);
    let polygonId = argPolygonId ? argPolygonId.split('=')[1] : null;

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

    // const polygonId = 42819
    // find all traces matching tubeFibreKeyIn
    const tubeFibreKeyIn = null
    // find all traces matching outClosureExt and inClosureExt
    const inClosureExt = null
    const outClosureExt = null

    // find all traces matching an outCable
    const cableOutExt = null

    try {

        const closures = await cosmosDb.query(`
             SELECT
                 ftth.closure.*
            FROM ftth.closure, ftth.polygon as b
            WHERE b.id IN (${polygonId})
            AND b.name = 'L2'
            AND ftth.closure.type_id IN (5,11)
            AND ST_Intersects(ftth.closure.geometry, b.geometry)
            `)

        const matches = []

        console.log('closures', closures.length)

        for(const closure of closures) {
            // get the template from S3
            try {
                const closureType = getClosureTypeFromId(closure.type_id)

                console.log('checking closure---', closureType, closure.id)

                const templateUrl = await getFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closure.id}`,
                )
                const response = await axios.get(templateUrl)
                const data = response['data']

                // find which closure is missing a connection

                if (data.connections.length < 1) {
                    console.log('MISSING CONNECTIONS', closure.id)
                }

                const matchingConnection = data.connections.find(elem => String(elem.outClosureExt) === String(closure.id))
                if (!matchingConnection) {
                    console.log('data', data)
                    matches.push(closure.id)
                }

                // console.log('data', data)
                // check fiber traces for tubeFibreKeyIn
                if (tubeFibreKeyIn) {
                    const matchedFiber = data.fiberTraces.find(elem => elem.tubeFibreKeyIn === tubeFibreKeyIn)
                    if (matchedFiber) {
                        console.log('data', data)
                        matches.push(matchedFiber)
                    }
                }

                // find traces matching both an in and out closure id
                if (inClosureExt && outClosureExt) {
                    const matchedFiber = data.fiberTraces.find(elem => elem.inClosureExt === inClosureExt && elem.outClosureExt === outClosureExt)
                    if (matchedFiber) {
                        console.log('data', data)
                        matches.push(matchedFiber)
                    }
                }

                // find traces matching only an out closure id
                if (!inClosureExt && outClosureExt) {
                    const matchedFiber = data.fiberTraces.find(elem => elem.outClosureExt === outClosureExt)
                    if (matchedFiber) {
                        console.log('data', data)
                        matches.push(matchedFiber)
                    }
                }

                // find traces matching only an out cable id
                if (cableOutExt) {
                    const matchedFiber = data.fiberTraces.find(elem => elem.cableOutExt === cableOutExt)
                    if (matchedFiber) {
                        console.log('data', data)
                        matches.push(matchedFiber)
                    }
                }


            } catch (e) {
                console.log('no connection template', e)

            }
        }

        console.log('matches length', matches.length)
        console.log('matches', matches)

        odinDb.close();
        cosmosDb.close();

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}


execute();

