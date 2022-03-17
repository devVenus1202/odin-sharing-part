/*
 *
 *  This will search across db_records, find all Addresses and Visits with
 *  the matching UDPRN and create association between the two.
 *
 */

import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import * as dotenv from 'dotenv';
import { Parser } from 'json2csv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

const fs = require('fs');
dotenv.config({ path: '../../../.env' });
const apiToken = process.env.ODIN_API_TOKEN;


async function sync() {

    try {
        const httpClient = new BaseHttpClient();
        const visitRecords = []
        const addressRecords = []
        const matchedRecords = []
        const unmatchedRecords = []

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log('Querying database...')

        /* Get all Visits with UDPRN */
        const allVisits = await pg.query(
            `SELECT db_records.id, value as UDPRN
                    FROM db_records LEFT JOIN db_records_columns ON (db_records.id = db_records_columns.record_id AND column_name = 'UDPRN')
                    WHERE entity = 'CrmModule:Visit'
                    AND db_records.deleted_at IS NULL
                    AND NOT EXISTS (
                        SELECT id
                        FROM db_records_associations as a
                        WHERE a.parent_entity = 'CrmModule:Address'
                        AND a.child_record_id = db_records.id
                    )`,
        );
        for(const record of allVisits) {
            visitRecords.push(record)
        }

        console.log('allVisits', allVisits)

        /* Get all Addresses with UDPRN */
        const allAddresses = await pg.query(
            `SELECT db_records.id, value as UDPRN FROM db_records LEFT JOIN db_records_columns ON (db_records.id = db_records_columns.record_id AND column_name = 'UDPRN') WHERE entity = 'CrmModule:Address' AND db_records.deleted_at IS NULL`,
        );
        for(const record of allAddresses) {
            addressRecords.push(record)
        }

        console.log('Mapping records...')

        /* Run through all Visits and get 1. Addresses matching UDPRN 2. Addresses NOT matching just for troubleshooting.  */
        allVisits.map((visit: any) => {

            const foundAddress = allAddresses.find((address: any) => address.udprn === visit.udprn)

            if (foundAddress) {
                matchedRecords.push({
                    addressId: foundAddress.id,
                    visitId: visit.id,
                    udprn: visit.udprn,
                })
            } else {
                unmatchedRecords.push({
                    visitId: visit.id,
                    udprn: visit.udprn,
                })

            }

        })


        console.log('Updating visits...')

        console.log('--------------------------------------------------------------')

        /* Map all Visits with matched Addresses, update Visit record with an associated Address */

        for(const record of matchedRecords) {

            const update = new DbRecordCreateUpdateDto()
            update.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.VISIT}`
            update.associations = [ { recordId: record.addressId } ]

            const updateRes = await httpClient.putRequest(
                Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                `v1.0/db/Visit/${record.visitId}?queue=true`,
                apiToken,
                update,
            )

            if (updateRes['statusCode'] !== 200) {
                console.log('Error updating the Visit record, id: ', record.visitId)
            } else {
                console.log('Updated visit record, id: ', record.visitId)
            }
        }


        console.log('--------------------------------------------------------------')
        console.log('All addresses:', addressRecords.length)
        console.log('All visits:', visitRecords.length)
        console.log('Visits and Addresses matching UDPRN:', matchedRecords.length)
        console.log('Visits not matching UDPRN:', unmatchedRecords.length)

        return;


    } catch (e) {
        console.error(e);
        process.exit(1);
    }


    function exportCsv(records: any) {

        let csv = ''

        try {
            const parser = new Parser()
            csv = parser.parse(records);
            const filename = `export-${Date.now()}.csv`
            fs.writeFileSync(filename, csv)
            console.log('Exported CSV:', filename)
        } catch (err) {
            console.error(err);
        }
    }


}

sync().then();
