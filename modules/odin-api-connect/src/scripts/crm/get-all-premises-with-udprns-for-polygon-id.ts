/*
 *  This will prompt for polygon id and return all premises that are inside the polygon.
 *  Udprns are encoded with Base16 and exported in CSV.
 *
 *  Decode UDPRN with: parseInt(encoded_udprn, 16)
 */

import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import * as fs from "fs";
import { Parser } from 'json2csv';
import moment from "moment";


const prompt = require('prompt');

dotenv.config({ path: '../../../.env' });

export async function execute() {

    let cosmosDb;

    const properties = [
        {
            name: 'polygon_id',
            description: 'Enter polygon id:',
            validator: /^[0-9]*$/,
            warning: 'Error: polygon id must be only numbers. No letters or special characters.'
        },
    ];

    /* Ask user to provide polygon id in the cli prompt. */
    prompt.start();

    prompt.get(properties, function (err, result) {
        if(err) {
            return onErr(err);
        }
        extractPremisesWithPolygonId(result.polygon_id)
    });


    async function extractPremisesWithPolygonId(polygon_id: number) {

        try {
            cosmosDb = await createConnection({
                type: 'postgres',
                name: 'cosmosDb',
                host: process.env.DB_GIS_HOSTNAME,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_GIS_USERNAME,
                password: process.env.DB_GIS_PASSWORD,
                database: process.env.DB_GIS_NAME,
                entities: [],
            });
        } catch (e) {
            console.error(e);
            cosmosDb = await getConnection('cosmosDb');
        }

        console.log('Running query...')

        const cosmosRecords = await cosmosDb.query(`
            SELECT misc.full_ultimate.udprn, misc.full_ultimate.address, misc.full_ultimate.postcode
            FROM misc.full_ultimate, ftth.polygon
            WHERE St_Intersects(misc.full_ultimate.geom, ftth.polygon.geometry)
            AND ftth.polygon.id = ${polygon_id}
            AND misc.full_ultimate.udprn IS NOT NULL
        `);


        /* Encode all UDPRN to Base16 uppercase string */
        if(cosmosRecords.length > 0) {
            console.log('Parsing data...')
            cosmosRecords.forEach((record: any) => {
                if(record.udprn){
                    let udprn = parseInt(record.udprn)
                    record.code = udprn.toString(16).toUpperCase()
                }
            })
        }

        console.log('Results:', cosmosRecords.length)

        exportCsv(cosmosRecords, polygon_id)

        cosmosDb.close();
    }

    function onErr(err) {
        console.log('Error:', err);
        return 1;
    }


    function exportCsv(cosmosRecords:any, polygon_id:number) {
        let csv = ''

        try {
            const parser = new Parser({ fields: ['udprn','code','postcode','address']})
            csv = parser.parse(cosmosRecords);
            const filename = `exported-surveycodes-polygonid${polygon_id}---${moment().format('DD-MM-YYYY')}-${Date.now()}.csv`
            fs.writeFileSync(filename, csv)
            console.log('Exported CSV:', filename)
        } catch (err) {
            console.error(err);
        }
    }

}

execute().then(r => {
});

