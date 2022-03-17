import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { BaseHttpClient } from '../../../../common/Http/BaseHttpClient';
import { chunkArray, sleep } from '../../../../helpers/utilities';
import { createRecordAndQueue, deleteRecord } from '../data/http';
import { getIntegrationParamsByFeatureType, getOdinRecordByExternalRef } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE } = SchemaModuleEntityTypeEnums;

export async function importFeaturesIntoOdin(
    principal: OrganizationUserEntity,
    l1PolygonId: string,
    featureType: string,
    { odinDb, cosmosDb },
) {

    try {

        const { tableName, featureTypeIds, typeProperty } = getIntegrationParamsByFeatureType(featureType)

        const httpClient = new BaseHttpClient();

        const schemaRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
            `v1.0/schemas/bymodule?moduleName=${PROJECT_MODULE}&entityName=${FEATURE}`,
            apiToken,
        );
        const schema = schemaRes['data'];

        await cosmosDb.query('refresh materialized view pedro.frankcable')

        const schemaType = schema.types.find(elem => elem.name === constantCase(featureType));

        const filteredCols = schema.columns.filter(elem => elem.schemaTypeId === schemaType.id || !elem.schemaTypeId);

        // get all features inside of an L1 polygon
        let features: any[]
        if (featureType === 'CABLE') {
            features = await cosmosDb.query(`
                SELECT cableid as id
                FROM pedro.frankcable
                LEFT JOIN ftth.cable_type ct ON ct.id = cabletype
                WHERE polyid = ${l1PolygonId}
                AND cabletype IN (${featureTypeIds})
            `);
        } else {
            features = await cosmosDb.query(`
            SELECT
                ${tableName}.id
            FROM ${tableName}, ftth.polygon as b
            WHERE b.id IN (${l1PolygonId})
            AND ${tableName}.type_id IN (${featureTypeIds})
            AND b.name = 'L1'
            AND CASE
                WHEN st_isvalid(${tableName}.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(${tableName}.geometry), b.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, b.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), b.geometry)
            END
            `);
        }
        const l1FeatureIds = features.map(elem => elem.id)

        console.log('l1FeatureIds', l1FeatureIds.length)

        // this will return all Odin external ids for features in a given EX Polygon
        const externalRefs = await odinDb.query(`
        SELECT c.value
        FROM db_records_columns as c
        WHERE c.column_name = 'ExternalRef'
        AND c.deleted_at IS NULL
        AND c.schema_type_id = '${schemaType.id}'
        AND EXISTS (
            SELECT id FROM db_records_columns c2
            WHERE to_tsvector('english', c2.value) @@ to_tsquery('${l1PolygonId}')
            AND c2.column_name = 'L1PolygonId'
            AND c2.record_id = c.record_id
            AND c2.schema_type_id = '${schemaType.id}'
            AND c2.deleted_at IS NULL
        )
         AND EXISTS (
            SELECT id FROM db_records_columns c3
            WHERE c3.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
            AND c3.column_name = '${typeProperty}'
            AND c3.record_id = c.record_id
            AND c3.schema_type_id = '${schemaType.id}'
            AND c3.deleted_at IS NULL
        )
        `);

        let ids = externalRefs.map(elem => Number(elem.value));

        if (ids.length < 1) {
            ids = [ 99911111111111999 ]
        }

        console.log('ids', ids.length)
        console.log('gisIds', l1FeatureIds.length)

        // find data in odin that is not in gis
        // Todo: add logic to DELETE
        const deletes = ids.filter(elem => !l1FeatureIds.includes(elem))
        console.log('IN_ODIN_NOT_GIS', deletes)

        for(const id of deletes) {
            const dbRecord = await getOdinRecordByExternalRef(id, featureType, { odinDb })
            if (dbRecord) {
                const res = await deleteRecord('Feature', dbRecord['id'])
                console.log(res)
            }
        }

        console.log('ids', ids)

        let totalFeatures = 0

        let featuresNotInOdin: any[]

        if (featureType === 'CABLE') {

            const featureIdsNotInOdin = await cosmosDb.query(`
                SELECT cableid as id
                FROM pedro.frankcable
                WHERE polyid = ${l1PolygonId}
                AND cabletype IN (${featureTypeIds})
            `);

            if (featureIdsNotInOdin && featureIdsNotInOdin.length > 0) {
                // get all the features
                featuresNotInOdin = await cosmosDb.query(`
                SELECT ${tableName}.*
                FROM ${tableName}
                WHERE ${tableName}.id IN (${featureIdsNotInOdin.map(elem => elem.id).join()})
             `)
            }

        } else {
            featuresNotInOdin = await cosmosDb.query(`
            SELECT
                 ${tableName}.*
            FROM ${tableName}, ftth.polygon as b
            WHERE b.id IN (${l1PolygonId})
            AND ${tableName}.type_id IN (${featureTypeIds})
            AND b.name = 'L1'
            AND CASE
                WHEN st_isvalid(${tableName}.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(${tableName}.geometry), b.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, b.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), b.geometry)
            END
            `);
        }

        console.log('featuresNotInOdin', featuresNotInOdin)

        const exPolygon = await cosmosDb.query(
            `
                    SELECT
                        a.id
                    FROM ftth.polygon as a, ftth.polygon as b
                    WHERE ST_Intersects(a.geometry, b.geometry)
                    AND a.name = 'EX'
                    AND b.id = ${l1PolygonId}
                `);

        let l0FeaturesToCreate = []

        if (featureType === 'CABLE') {
            // we want to get the spine cables
            const l0SpineCablesNotInOdin = await cosmosDb.query(`
            SELECT
                ftth.cable.*
            FROM ftth.cable, ftth.polygon as b
            WHERE b.id IN (${exPolygon[0].id})
            AND ftth.cable.type_id IN (${featureTypeIds})
            AND b.name = 'EX'
            AND ftth.cable.type_id = 1
            AND  CASE
                WHEN st_isvalid(ftth.cable.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(ftth.cable.geometry), b.geometry)
                WHEN ST_GeometryType(ftth.cable.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(ftth.cable.geometry, b.geometry)
                WHEN ST_GeometryType(ftth.cable.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(ftth.cable.geometry), b.geometry)
            END
            `);

            console.log('l0SpineCablesNotInOdin', l0SpineCablesNotInOdin)
            l0FeaturesToCreate.push(...l0SpineCablesNotInOdin)
        }

        if (featureType === 'CLOSURE') {
            const l0ClosuresNotInOdin = await cosmosDb.query(`
            SELECT
                 ftth.closure.*
            FROM ftth.closure, ftth.polygon as b
            WHERE b.id IN (${exPolygon[0].id})
            AND ftth.closure.type_id IN (${featureTypeIds})
            AND b.name = 'EX'
            AND ftth.closure.type_id = 1
            AND ST_Intersects(ftth.closure.geometry, b.geometry)
            `);

            console.log('l0ClosuresNotInOdin', l0ClosuresNotInOdin)
            l0FeaturesToCreate.push(...l0ClosuresNotInOdin)
        }

        const exFeaturesToCreates = []

        for(const item of l0FeaturesToCreate) {

            let polygons = await cosmosDb.query(
                `
                    SELECT
                    a.id, a.name
                    FROM ftth.polygon as a, ${tableName}
                    WHERE ST_Intersects(${tableName}.geometry, a.geometry)
                    AND ${tableName}.id = ${item.id}
                `);
            console.log('l1Polygon_before', polygons)
            const l1Polygons = polygons.filter(elem => elem.name === 'L1')
            const l2Polygons = polygons.filter(elem => elem.name === 'L2')

            const newObj = new DbRecordCreateUpdateDto();
            newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
            newObj.type = constantCase(featureType);
            newObj.properties = {
                ExPolygonId: exPolygon[0]['id'],
                L2PolygonId: l2Polygons[0] ? l2Polygons.map(elem => elem['id']).join() : null,
                L1PolygonId: l1Polygons[0] ? l1Polygons.map(elem => elem['id']).join() : null,
                DRS: 'IMPORT',
            };

            for(const key of Object.keys(item)) {

                const col = filteredCols.find(elem => elem.mapping === key);

                if (col && col.name !== 'Coordinates') {
                    newObj.properties = Object.assign(
                        {},
                        newObj.properties,
                        { [col.name]: item[key] },
                    )
                }
            }

            exFeaturesToCreates.push(newObj)
        }

        console.log('exFeaturesToCreates', exFeaturesToCreates)

        await sleep(50)
        if (exFeaturesToCreates.length > 0) {
            const res = await createRecordAndQueue(exFeaturesToCreates)
            console.log('res', res);
        }


        if (featuresNotInOdin.length > 0) {

            // chunk data
            const batch = chunkArray(featuresNotInOdin, 100);
            for(const chunk of batch) {

                let creates = [];
                for(const item of chunk) {

                    console.log('item', item.id)

                    let polygons = []
                    if (featureType === 'CABLE') {
                        // get the polygons intersecting this cable
                        polygons = await cosmosDb.query(
                            `
                            SELECT name, polyid as id
                            FROM pedro.frankcable
                            WHERE cableid = ${item.id}
                        `);
                    } else {
                        polygons = await cosmosDb.query(
                            `
                            SELECT
                            a.id, a.name
                            FROM ftth.polygon as a, ${tableName}
                            WHERE ST_Intersects(${tableName}.geometry, a.geometry)
                            AND ${tableName}.id = ${item.id}
                        `);
                    }
                    console.log('l1Polygon_before', polygons)
                    let l1Polygons = polygons.filter(elem => elem.name === 'L1')
                    let l2Polygons = polygons.filter(elem => elem.name === 'L2')

                    // if there are no L2 polygons in the frankcable table then
                    // try this query to get the L2 polygons
                    if (l2Polygons.length < 1 && featureType === 'CABLE') {
                        polygons = await cosmosDb.query(
                            `
                            SELECT
                            a.id, a.name
                            FROM ftth.polygon as a, ftth.cable
                            WHERE
                                CASE WHEN st_isvalid(ftth.cable.geometry) is not true
                                    THEN ST_Intersects(ST_Centroid(ftth.cable.geometry), a.geometry)
                                WHEN ST_GeometryType(ftth.cable.geometry) <> 'ST_MultiCurve'
                                    THEN ST_Intersects(ftth.cable.geometry, a.geometry)
                                WHEN ST_GeometryType(ftth.cable.geometry) = 'ST_MultiCurve'
                                    THEN ST_Intersects(ST_CurveToLine(ftth.cable.geometry), a.geometry)
                                END
                            AND ${tableName}.id = ${item.id}
                        `);

                        l1Polygons = polygons.filter(elem => elem.name === 'L1')
                        l2Polygons = polygons.filter(elem => elem.name === 'L2')
                    }

                    console.log('l1Polygons', l1Polygons)
                    console.log('l2Polygons', l2Polygons)


                    // only import if the feature exists in the l1 being imported
                    // if (l1Polygons.find(elem => elem['id'] === Number(l1PolygonId))) {

                    const newObj = new DbRecordCreateUpdateDto();
                    newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
                    newObj.type = constantCase(featureType);
                    newObj.properties = {
                        ExPolygonId: exPolygon[0]['id'],
                        L2PolygonId: l2Polygons[0] ? l2Polygons.map(elem => elem['id']).join() : null,
                        L1PolygonId: l1Polygons[0] ? l1Polygons.map(elem => elem['id']).join() : null,
                        DRS: 'IMPORT',
                    };

                    for(const key of Object.keys(item)) {

                        const col = filteredCols.find(elem => elem.mapping === key);

                        if (col && col.name !== 'Coordinates') {
                            newObj.properties = Object.assign(
                                {},
                                newObj.properties,
                                { [col.name]: item[key] },
                            )
                        }
                    }

                    creates.push(newObj);
                    // }
                }

                console.log('creates', creates);

                totalFeatures += creates.length;
                await sleep(200)
                if (creates.length > 0) {
                    const res = await createRecordAndQueue(creates)
                    console.log('res', res);
                }
            }
        }


        // cleanup any duplicates created during the import process
        const duplicates = await odinDb.query(`
            select c.value as ext_ref, count(*)
            from db_records_columns c
            left join db_records r on (c.record_id = r.id)
            where r.type = '${featureType}'
            and c.column_name = 'ExternalRef'
            and r.deleted_at IS NULL
            group by c.value
            HAVING count(*) > 1
        `)

        console.log('duplicates', duplicates)

        for(const duplicate of duplicates) {
            const dbRecord = await getOdinRecordByExternalRef(Number(duplicate['ext_ref']), featureType, { odinDb });
            console.log('dbRecord', dbRecord)
            const deleteRes = await deleteRecord('Feature', dbRecord.id)
            console.log('deleteRes', deleteRes)
        }

        // Email user when all data is in the queue
        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Feature ${featureType} import started for ${l1PolygonId}`,
            body: `Total Features: ${totalFeatures}`,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
            false,
        );

        return 'imports queued'

    } catch (e) {
        console.error(e);
    }
}
