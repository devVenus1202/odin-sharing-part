import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import { chunkArray } from '../../helpers/utilities';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE } = SchemaModuleEntityTypeEnums;

let odinDb;
let cosmosDb;

async function sync() {

    const featureType = 'SURVEY_ROUTE'

    const isLine = [ 'CABLE', 'SURVEY_ROUTE', 'ROPE' ].includes(featureType);

    const httpClient = new BaseHttpClient();

    try {
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

        // load dependencies
        const schemaRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
            `v1.0/schemas/bymodule?moduleName=${PROJECT_MODULE}&entityName=${FEATURE}`,
            apiToken,
        );
        const schema = schemaRes['data'];

        const schemaType = schema.types.find(elem => elem.name === constantCase(featureType));

        const filteredCols = schema.columns.filter(elem => elem.schemaTypeId === schemaType.id || !elem.schemaTypeId);

        // get the data set
        const surveyRoutes = await odinDb.query(`
            SELECT r.type, r.id, c.value, r.created_at
            FROM db_records r
            LEFT JOIN db_Records_columns c on (c.record_id = r.id and c.column_name = 'ExternalRef')
            WHERE r.type = '${featureType}'
            AND r.created_at > now() - '30 days'::interval
        `)
        console.log('surveyRoutes', surveyRoutes.length);

        for(const route of surveyRoutes) {
            if (isNaN(route.value)) {
                console.log(route)
                // get the feature
                const recordRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
                    `v1.0/db/Feature/${route.id}`,
                    apiToken,
                    false,
                );

                const record = recordRes['data']

                console.log('record', record)

                const coordinates = getProperty(record, 'Coordinates');

                if (coordinates) {
                    // TODO: This should be dynamically mapped like we have for column mappings.
                    const { schemaName, tableName } = getSchemaAndTableNameFromFeature(record.type);

                    console.log({ schemaName, tableName });

                    const columns = await cosmosDb.query(`
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = '${schemaName}'
                        AND table_name   = '${tableName}';
                     `);

                    const gisColumns = columns.map(elem => elem.column_name);
                    console.log('gisColumns', gisColumns);

                    const body = {
                        schemaName: schemaName,
                        tableName: tableName,
                        columns: [],
                        values: [],
                    };

                    const propKeys = Object.keys(record.properties);

                    for(const key of propKeys) {

                        const col = filteredCols.find(elem => elem.name === key);
                        const val = getProperty(record, key);

                        if (key === 'Coordinates') {

                            const split = coordinates.split(',');

                            const pointsArray = chunkArray(split, 2).map(elem => `ST_MakePoint(${elem[0]}, ${elem[1]})`)

                            body.columns.push('geometry');

                            if (isLine) {
                                body.values.push(`ST_SetSRID(ST_MakeLine(ARRAY[${pointsArray}]), 27700)`);
                            } else {
                                body.values.push(`ST_SetSRID(${pointsArray[0]}, 27700)`)
                            }

                        } else if (col.mapping && col.mapping !== 'id' && gisColumns.includes(col.mapping)) {

                            body.columns.push(col.mapping);
                            const value = isNaN(val) ? `'${(val).replace(/'/g, '\'\'')}'` : Number(val);
                            body.values.push(value || 'NULL');

                        }
                    }

                    console.log(body)

                    const res = await createFeatureInGis(body);

                    // update the feature in Odin
                    if (res && res.id) {

                        const update = new DbRecordCreateUpdateDto();
                        update.entity = `${PROJECT_MODULE}:${FEATURE}`;
                        update.type = featureType;
                        update.properties = {
                            ExternalRef: res.id,
                        };
                        update.options = {
                            skipUpdateEvent: true,
                        }
                        // Update the program properties
                        const updateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
                            `v1.0/db/Feature/${record.id}`,
                            apiToken,
                            update,
                            false,
                        );

                        console.log('updateRes', updateRes['data'])
                    }

                }
            }
        }

    } catch (e) {
        console.error(e);
    }
}

/**
 *
 * @param type
 * @private
 */
function getSchemaAndTableNameFromFeature(type: string) {

    // TODO: we need to configure a dynamic data source
    // that maps tables to entities / types
    const comosSurveyFeatures = [
        'BLOCKAGE',
        'HAZARD',
        'SURVEY_ROUTE',
        'SURVEY_STRUCTURE',
    ].includes(constantCase(type));

    if (type.toLowerCase().indexOf('pia') > -1) {

        if (constantCase(type) === 'PIA_DUCT') {

            return {
                schemaName: 'openreach',
                tableName: 'duct',
            };

        }

        if (constantCase(type) === 'PIA_STRUCTURE') {

            return {
                schemaName: 'openreach',
                tableName: 'structure',
            };

        }
    }

    if (comosSurveyFeatures) {

        return {
            schemaName: 'survey',
            tableName: type.toLowerCase(),
        };

    } else {

        return {
            schemaName: 'ftth',
            tableName: type.toLowerCase(),
        };

    }

}


/**
 *
 * @param principal
 * @param body
 */
async function createFeatureInGis(body: any): Promise<any> {
    try {

        const data = await cosmosDb.query(`
            INSERT INTO ${body.schemaName}.${body.tableName} (${body.columns.join()})
            VALUES (${body.values.join()})
            RETURNING id, ${body.columns.join()}`);

        return data[0];

    } catch (e) {

        console.error(e, { body });
        throw new ExceptionType(e.statusCode, e.message);
    }
}


sync();
