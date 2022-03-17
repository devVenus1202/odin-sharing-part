import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

const fs = require('fs');

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;


export async function execute() {

    const httpClient = new BaseHttpClient();

    let cosmosDb;
    let youfibreDb;

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

    try {
        youfibreDb = await createConnection({
            type: 'postgres',
            name: 'youfibreDb',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    } catch (e) {

        console.error(e);
        youfibreDb = await getConnection('youfibreDb');
    }


    const missingExPolygon = await youfibreDb.query(
        `
        select r.id, c.value, c1.value as udprn, c2.value
        from db_records r
        left join db_records_columns c on (c.record_id = r.id and c.column_name = 'ExPolygonId')
        left join db_records_columns c1 on (c1.record_id = r.id and c1.column_name = 'UDPRN')
        left join db_records_columns c2 on (c2.record_id = r.id and c2.column_name = 'BuildStatus')
        where r.entity = 'CrmModule:Address'
        and r.deleted_at is null
        and (c.value = '0' OR c.value is null)
        `,
    )

    console.log('missingExPolygon', missingExPolygon)


    for(const { udprn, id } of missingExPolygon) {
        console.log('udprn', udprn)
        console.log('id', id)

        if (udprn) {

            let premise = await cosmosDb.query(`SELECT * FROM misc.full_ultimate msf WHERE msf.udprn = '${udprn}'`)
            console.log('premise', premise)

            if (premise[0]) {

                const polygons = await cosmosDb.query(
                    `SELECT
               DISTINCT(p.id),
               ${udprn}              as udprn,
               p.name                as poly_name,
               p.id                  as poly_id,
               p.name                as poly_name,
               p.id                  as poly_id,
               p.target_release_date as poly_target_release_date,
               p.build_status_id     as poly_build_status_id,
               p.name                as poly_name,
               p.geometry            as poly_geometry,
               p.id                  as poly_id,
               pbs.name              as poly_build_status,
               p.modified_at         as poly_modified_at
        FROM ftth.polygon as p
        LEFT JOIN ftth.build_status AS pbs ON (p.build_status_id = pbs.id)
        WHERE St_Intersects(p.geometry, '${premise[0].geom}')
        ORDER BY p.id DESC
        `);

                console.log('polygons', polygons)

                if (polygons[0]) {

                    const exPolygon = polygons.find(elem => elem['poly_name'] === 'EX')
                    const l2Polygon = polygons.find(elem => elem['poly_name'] === 'L2')
                    const l4Polygon = polygons.find(elem => elem['poly_name'] === 'L4')

                    // Update or Create Address
                    const addressUpdate = new DbRecordCreateUpdateDto();
                    addressUpdate.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.ADDRESS}`;
                    addressUpdate.properties = {
                        TargetReleaseDate: l2Polygon ? l2Polygon['poly_target_release_date'] : undefined,
                        BuildStatus: l4Polygon ? l4Polygon['poly_build_status'] : undefined,
                        SalesStatus: setSalesStatus(l4Polygon),
                        L4PolygonId: l4Polygon ? l4Polygon['poly_id'] : undefined,
                        L2PolygonId: l2Polygon ? l2Polygon['poly_id'] : undefined,
                        ExPolygonId: exPolygon ? exPolygon['poly_id'] : undefined,
                    };

                    console.log('addressUpdate', addressUpdate)
                    const updateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                        `v1.0/db/Address/${id}?queue=true`,
                        apiToken,
                        addressUpdate,
                    );
                    console.log('updateRes', updateRes)
                }
            }
        } else {
            console.log('missing_udprn', id)
        }
    }

    cosmosDb.close();
    youfibreDb.close();
}


const setSalesStatus = (l4Polygon: any) => {

    if (l4Polygon) {

        if ([ '8-RFS' ].includes(l4Polygon['poly_build_status'])) {
            return 'ORDER'
        }
        if ([ '6-In Progress', '7-Build Done' ].includes(l4Polygon['poly_build_status'])) {
            return 'PRE_ORDER'
        }
        if ([ '0-Backlog', '1-Plan', '2-Survey', '3-Design', '4-Plan Done' ].includes(l4Polygon['poly_build_status'])) {
            return 'REGISTER_INTEREST'
        }
        if ([ '5-ToDo' ].includes(l4Polygon['poly_build_status'])) {
            return 'REGISTER_INTEREST_PLUS'
        }
    } else {
        return 'REGISTER_INTEREST'
    }
}

execute();

