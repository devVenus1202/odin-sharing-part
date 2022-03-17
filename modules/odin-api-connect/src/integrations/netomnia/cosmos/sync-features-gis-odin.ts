import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

const fs = require('fs');

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE } = SchemaModuleEntityTypeEnums;


async function sync() {

    try {
        // Command line arguments
        let argPolygonId = process.argv.find(arg => arg.indexOf('polygonid') > -1);
        let polygonId = argPolygonId ? argPolygonId.split('=')[1] : null;

        let argDbSchema = process.argv.find(arg => arg.indexOf('tname') > -1);
        let tableName = argDbSchema ? argDbSchema.split('=')[1] : null;

        let argFeatureType = process.argv.find(arg => arg.indexOf('fname') > -1);
        let featureType = argFeatureType ? argFeatureType.split('=')[1] : null;

        console.log('tableName', tableName);
        console.log('featureType', featureType);

        const httpClient = new BaseHttpClient();

        const odinDb = await createConnection({
            type: 'postgres',
            name: 'odinDb',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            synchronize: false,
            entities: [],
        });

        const cosmosDb = await createConnection({
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

        const schemaRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
            `v1.0/schemas/bymodule?moduleName=${PROJECT_MODULE}&entityName=${FEATURE}`,
            apiToken,
        );
        const schema = schemaRes['data'];

        const schemaType = schema.types.find(elem => elem.name === constantCase(featureType));

        const filteredCols = schema.columns.filter(elem => elem.schemaTypeId === schemaType.id || !elem.schemaTypeId);


        // this will return all Odin external ids for features in a given EX Polygon
        const externalRefs = await odinDb.query(`
        SELECT c.value
        FROM db_records_columns as c
        WHERE c.column_name = 'ExternalRef'
        AND c.deleted_at IS NULL
        AND c.schema_type_id = '${schemaType.id}'
        AND EXISTS (
            SELECT id FROM db_records_columns c2
            WHERE c2.value = '${polygonId}'
            AND c2.column_name = 'ExPolygonId'
            AND c2.record_id = c.record_id
            AND c2.schema_type_id = '${schemaType.id}'
            AND c2.deleted_at IS NULL
        )
        `);

        let ids = []
        ids = externalRefs.map(elem => Number(elem.value));

        if(ids.length < 1) {
            ids = [ 11111111111111111 ]
        }

        // This will return all GIS external ids for features in a given EX Polygon
        const gisIds = await cosmosDb.query(`
            SELECT ${tableName}.id
            FROM ${tableName}, ftth.polygon
            WHERE ftth.polygon.id IN (${polygonId})
             AND CASE
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, ftth.polygon.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), ftth.polygon.geometry)
            END
            `);

        // find data in odin that is not in gis
        // Todo: add logic to DELETE
        const filtered = ids.filter(elem => !gisIds.map(elem => elem.id).includes(elem))
        console.log('IN_ODIN_NOT_GIS', filtered)


        let l2PolygonIds = [];

        if(polygonId) {
            const ids = await cosmosDb.query(`
                SELECT
                    a.id
                FROM ftth.polygon as a, ftth.polygon as b
                WHERE ST_Intersects(a.geometry, b.geometry)
                AND a.name = 'L2'
                AND b.id = ${polygonId}
           `);

            if(ids[0]) {
                l2PolygonIds = ids.map(elem => elem['id'])
            }
        }


        console.log('l2PolygonIds', l2PolygonIds)
        console.log('ids', ids)

        for(const l2Id of l2PolygonIds) {

            const exPolygon = await cosmosDb.query(`
            SELECT
            a.id
        FROM ftth.polygon as a, ftth.polygon as b
         WHERE ST_Intersects(a.geometry, b.geometry)
        AND a.name = 'EX'
        AND b.id = ${l2Id}
        `);

            const data = await cosmosDb.query(`
            SELECT *, ${tableName}.id, ${tableName}.model_id, ${tableName}.type_id
            FROM ${tableName}, ftth.polygon
            WHERE ${tableName}.id NOT IN (${ids})
            AND ftth.polygon.id = ${l2Id}
             AND CASE
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, ftth.polygon.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), ftth.polygon.geometry)
            END
            `);

            console.log(l2Id, data.length)

            if(data.length > 0) {

                let creates = [];
                for(const item of data) {

                    const newObj = new DbRecordCreateUpdateDto();
                    newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
                    newObj.type = constantCase(featureType);
                    newObj.properties = {
                        ExPolygonId: exPolygon[0]['id'],
                        L2PolygonId: l2Id,
                    };
                    newObj.options = {
                        skipCreateEvent: true,
                    };

                    for(const key of Object.keys(item)) {

                        const col = filteredCols.find(elem => elem.mapping === key);

                        if(col && col.name !== 'Coordinates') {
                            newObj.properties = Object.assign({}, newObj.properties, { [col.name]: item[key] })
                        }
                    }

                    creates.push(newObj);

                }

                console.log('creates', creates);

                const res = await httpClient.postRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
                    `v1.0/db/batch?queue=true`,
                    apiToken,
                    creates,
                );

                console.log(res);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

sync();
