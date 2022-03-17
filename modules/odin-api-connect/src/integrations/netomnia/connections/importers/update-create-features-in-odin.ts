import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { constantCase } from 'change-case';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { BaseHttpClient } from '../../../../common/Http/BaseHttpClient';
import { chunkArray } from '../../../../helpers/utilities';
import { createRecordAndQueue } from '../data/http';
import { getAllFeaturesByTypeAndPolygonId, getIntegrationParamsByFeatureType } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE } = SchemaModuleEntityTypeEnums;

export async function updateCreateFeaturesInOdin(
    principal: OrganizationUserEntity,
    l1PolygonId: string,
    featureType: string,
    { odinDb, cosmosDb },
    startDate?: string,
    endDate?: string,
    interval?: string,
) {

    if (!interval) {
        if (!startDate) {
            startDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
        }
        if (!endDate) {
            endDate = dayjs().add(1, 'day').format('YYYY-MM-DD')
        }
    }

    try {

        let totalFeatures = 0;

        console.log('l1PolygonId', l1PolygonId)
        console.log('featureType', featureType)
        console.log('startDate', startDate)
        console.log('endDate', endDate)

        const { tableName, featureTypeIds, typeProperty } = getIntegrationParamsByFeatureType(featureType)

        const httpClient = new BaseHttpClient();

        const schemaRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
            `v1.0/schemas/bymodule?moduleName=${PROJECT_MODULE}&entityName=${FEATURE}`,
            apiToken,
        );
        const schema = schemaRes['data'];

        const schemaType = schema.types.find(elem => elem.name === constantCase(featureType));

        const filteredCols = schema.columns.filter(elem => elem.schemaTypeId === schemaType.id || !elem.schemaTypeId);

        // get all features that are in an L1 Polygon
        const features = await getAllFeaturesByTypeAndPolygonId(l1PolygonId, featureType, { cosmosDb })

        const l1FeatureIds = features.map(elem => elem.id)

        console.log('l1FeatureIds', l1FeatureIds.length)

        const featuresMissingL1PolygonId = await odinDb.query(`
            select c1.value
            from db_records r
            left join db_records_columns c on (c.record_id = r.id and c.column_name = 'L1PolygonId')
            left join db_records_columns c1 on (c1.record_id = r.id and c1.column_name = 'ExternalRef')
            where r.entity = 'ProjectModule:Feature'
            and r.type IN ('${featureType}')
            and r.deleted_at is null
            and c.value is null
        `);

        let idsMissingL1Polygon = featuresMissingL1PolygonId.map(elem => isNaN(elem.value) ? 0 : Number(elem.value));
        console.log('idsMissingL1Polygon', idsMissingL1Polygon.length)

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
         ${typeProperty ? `AND EXISTS (
            SELECT id FROM db_records_columns c3
            WHERE c3.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
            AND c3.column_name = '${typeProperty}'
            AND c3.record_id = c.record_id
            AND c3.schema_type_id = '${schemaType.id}'
            AND c3.deleted_at IS NULL)`: ''}
        `);

        const ids = [
            ...idsMissingL1Polygon,
            ...externalRefs.map(elem => isNaN(elem.value) ? 0 : Number(elem.value)),
        ].filter(elem => elem);


        let featuresMissing: any[] = []

        if (featureType === 'CABLE') {
            const featureIdsNotInOdin = await cosmosDb.query(`
                SELECT cableid as id
                FROM pedro.frankcable
                WHERE polyid = ${l1PolygonId}
                AND cableid NOT IN (${ids})
                AND cabletype IN (${featureTypeIds})
            `);

            if (featureIdsNotInOdin && featureIdsNotInOdin.length > 0) {
                // get all the features
                featuresMissing = await cosmosDb.query(`
                SELECT ${tableName}.*
                FROM ${tableName}
                WHERE ${tableName}.id IN (${featureIdsNotInOdin.map(elem => elem.id).join()})
             `)
            }

        } else {
            featuresMissing = await cosmosDb.query(`
            SELECT
                 ${tableName}.*
            FROM ${tableName}, ftth.polygon as b
            WHERE b.id IN (${l1PolygonId})
            AND ${tableName}.id NOT IN (${ids})
            ${featureTypeIds.length > 0 ? `AND ${tableName}.type_id IN (${featureTypeIds})`: ''}
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

        console.log('featuresMissing', featuresMissing)
        console.log('featuresMissing', featuresMissing.length)


        const featuresUpdated = await cosmosDb.query(`
            SELECT
                 ${tableName}.*
            FROM ${tableName}
            LEFT JOIN ftth.polygon as p on ST_Intersects(${tableName}.geometry, p.geometry)
            WHERE p.name = 'L1'
            AND CASE
                WHEN st_isvalid(${tableName}.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(${tableName}.geometry), p.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, p.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), p.geometry)
            END
            AND p.id = ${l1PolygonId}
            AND ${tableName}.id IN (${ids})
            ${interval ?
            `AND ${tableName}.modified_at > now() - '${interval}'::interval`:
            `AND ${tableName}.modified_at > '${startDate}'::date
             AND ${tableName}.modified_at < '${endDate}'::date
            `}
            `);

        console.log('featuresUpdated', featuresUpdated)
        console.log('featuresUpdated', featuresUpdated.length)

        const exPolygon = await cosmosDb.query(
            `
                SELECT
                    a.id
                FROM ftth.polygon as a
                LEFT JOIN ftth.polygon as p on ST_Intersects(a.geometry, p.geometry)
                WHERE a.name = 'EX'
                AND p.id = ${l1PolygonId}
            `);

        let l0FeaturesToUpdate = []

        console.log('exPolygon', exPolygon)

        if (featureType === 'CABLE' && exPolygon[0]) {
            // we want to get the spine cables
            const l0SpineCablesUpdate = await cosmosDb.query(`
            SELECT
                c.*
            FROM ftth.polygon p
            left join ftth.cable c on
            CASE
                WHEN st_isvalid(c.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(c.geometry), p.geometry)
                WHEN ST_GeometryType(c.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(c.geometry, p.geometry)
                WHEN ST_GeometryType(c.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(c.geometry), p.geometry)
            END
            LEFT JOIN ftth.cable_type ct ON ct.id = c.type_id
            WHERE p.id IN (${exPolygon[0].id})
            AND c.type_id IN (${featureTypeIds})
            AND p.name = 'EX'
            AND c.type_id = 1
            ${interval ?
            `AND c.modified_at > now() - '${interval}'::interval`:
            `AND c.modified_at > '${startDate}'::date
             AND c.modified_at < '${endDate}'::date
            `}
            `);

            console.log('l0SpineCablesUpdate', l0SpineCablesUpdate)
            l0FeaturesToUpdate.push(...l0SpineCablesUpdate)
        }

        if (featureType === 'CLOSURE' && exPolygon[0]) {
            const l0ClosuresUpdated = await cosmosDb.query(`
            SELECT
                 ftth.closure.*
            FROM ftth.closure, ftth.polygon as b
            WHERE b.id IN (${exPolygon[0].id})
            AND ftth.closure.type_id IN (${featureTypeIds})
            AND b.name = 'EX'
            AND ftth.closure.type_id = 1
            AND ST_Intersects(ftth.closure.geometry, b.geometry)
            ${interval ?
            `AND ftth.closure.modified_at > now() - '${interval}'::interval`:
            `AND ftth.closure.modified_at > '${startDate}'::date
             AND ftth.closure.modified_at < '${endDate}'::date
            `}
            `);

            console.log('l0ClosuresUpdated', l0ClosuresUpdated)
            l0FeaturesToUpdate.push(...l0ClosuresUpdated)
        }

        const featuresToUpdate = []

        for(const item of l0FeaturesToUpdate) {

            let polygons = []
            if (featureType === 'CABLE') {
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
            const l1Polygons = polygons.filter(elem => elem.name === 'L1')
            const l2Polygons = polygons.filter(elem => elem.name === 'L2')

            const newObj = new DbRecordCreateUpdateDto();
            newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
            newObj.type = constantCase(featureType);
            newObj.properties = {
                ExPolygonId: exPolygon[0] ? exPolygon[0]['id'] : null,
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

            featuresToUpdate.push(newObj)
        }

        console.log('featuresToUpdate', featuresToUpdate)

        // For the exchange polygon features
        if (featuresToUpdate.length > 0) {
            const res = await createRecordAndQueue(featuresToUpdate)
            console.log('res', res);
        }

        // Create missing features
        if (featuresMissing.length > 0) {

            // chunk data
            const batch = chunkArray(featuresMissing, 50);
            for(const chunk of batch) {

                let creates = [];
                for(const item of chunk) {

                    console.log('item', item.id)

                    let polygons = []
                    if (featureType === 'CABLE') {
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
                    const l1Polygons = polygons.filter(elem => elem.name === 'L1')
                    const l2Polygons = polygons.filter(elem => elem.name === 'L2')

                    console.log('l1Polygons', l1Polygons)
                    console.log('l2Polygons', l2Polygons)

                    // only import if the feature exists in the l1 being imported
                    // if (l1Polygons.find(elem => elem['id'] === Number(l1PolygonId))) {

                    const newObj = new DbRecordCreateUpdateDto();
                    newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
                    newObj.type = constantCase(featureType);
                    newObj.properties = {
                        ExPolygonId: exPolygon[0] ? exPolygon[0]['id'] : null,
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
                if (creates.length > 0) {
                    const res = await createRecordAndQueue(creates)
                    console.log('res', res);
                }
            }
        }

        // Update features already in Odin
        if (featuresUpdated.length > 0) {

            // chunk data
            const batch = chunkArray(featuresUpdated, 50);
            for(const chunk of batch) {

                let creates = [];
                for(const item of chunk) {

                    console.log('item', item.id)

                    let polygons = []
                    if (featureType === 'CABLE') {
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
                            AND ftth.cable.id = ${item.id}
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
                    const l1Polygons = polygons.filter(elem => elem.name === 'L1')
                    const l2Polygons = polygons.filter(elem => elem.name === 'L2')

                    console.log('l1Polygons', l1Polygons)
                    console.log('l2Polygons', l2Polygons)

                    // only import if the feature exists in the l1 being imported
                    // if (l1Polygons.find(elem => elem['id'] === Number(l1PolygonId))) {

                    const newObj = new DbRecordCreateUpdateDto();
                    newObj.entity = `${PROJECT_MODULE}:${FEATURE}`;
                    newObj.type = constantCase(featureType);
                    newObj.properties = {
                        ExPolygonId: exPolygon[0] ? exPolygon[0]['id'] : null,
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
                if (creates.length > 0) {
                    const res = await createRecordAndQueue(creates)
                    console.log('res', res);
                }
            }
        }

        return 'imports queued'

    } catch (e) {
        console.error(e);
    }
}
