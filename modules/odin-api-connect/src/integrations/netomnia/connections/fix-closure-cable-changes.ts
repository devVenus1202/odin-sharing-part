import { getAllRelations, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { deleteRecord, getFromS3, getRecordDetail } from './data/http';

dotenv.config({ path: '../../../../.env' });

let odinDb;
let cosmosDb;

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

    try {

        const data = await odinDb.query(
            `
                select c.value as closure_type, c2.value as closure_id, db_records.id as db_record_id, c3.value as l1_polygon_id, c4.value as ex_polygon_id
                from db_records
                left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'ClosureType')
                left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'ExternalRef')
                left join db_records_columns as c3 ON (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
                left join db_records_columns as c4 ON (c4.record_id = db_records.id and c4.column_name = 'ExPolygonId')
                where entity = 'ProjectModule:Feature'
                and db_records.type IN ('CLOSURE')
                and db_records.deleted_at is null
                and exists (
                    select a.parent_record_id from db_records_associations a
                    left join db_records_columns as c ON (c.record_id = a.child_record_id and c.column_name = 'Direction')
                    where a.child_entity = 'ProjectModule:CableConnection'
                    and a.parent_record_id = db_records.id
                    and a.deleted_at IS NULL
                    and c.value = 'IN'
                    group by a.parent_record_id
                    having count(a.parent_record_id) > 1
                )
                and not exists (
                    select a.parent_record_id from db_records_associations a
                    where a.child_entity = 'ProjectModule:FiberConnection'
                    and a.parent_record_id = db_records.id
                    and a.deleted_at IS NULL
                )
                and c.value IN ('4', '5', '11') -- L3, L4, LM closures
                order by c.value asc
            `,
        )

        const closuresWithOutCables = await odinDb.query(
            `
                select c.value as closure_type, c2.value as closure_id, db_records.id as db_record_id, c3.value as l1_polygon_id, c4.value as ex_polygon_id
                from db_records
                left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'ClosureType')
                left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'ExternalRef')
                left join db_records_columns as c3 ON (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
                left join db_records_columns as c4 ON (c4.record_id = db_records.id and c4.column_name = 'ExPolygonId')
                where entity = 'ProjectModule:Feature'
                and db_records.type IN ('CLOSURE')
                and db_records.deleted_at is null
                and exists (
                    select a.parent_record_id from db_records_associations a
                    left join db_records_columns as c ON (c.record_id = a.child_record_id and c.column_name = 'Direction')
                    where a.child_entity = 'ProjectModule:CableConnection'
                    and a.parent_record_id = db_records.id
                    and a.deleted_at IS NULL
                    and c.value = 'OUT'
                    group by a.parent_record_id
                    having count(a.parent_record_id) > 1
                )
                and not exists (
                    select a.parent_record_id from db_records_associations a
                    where a.child_entity = 'ProjectModule:FiberConnection'
                    and a.parent_record_id = db_records.id
                    and a.deleted_at IS NULL
                )
                and c.value IN ('5', '11') -- L3, L4, LM closures
                order by c.value asc
            `,
        )

        console.log('closuresWithOutCables', closuresWithOutCables)

        for(const item of closuresWithOutCables) {
            const dbRecord = await getRecordDetail(
                item.db_record_id,
                'CLOSURE',
                [ '\"CableConnection\"' ],
            );

            for(const record of getAllRelations(dbRecord, 'CableConnection')) {
                // delete the OUT cables, they should not be there
                if (getProperty(record, 'Direction') === 'OUT') {
                    await deleteRecord('CableConnection', record['id'])
                }
            }

        }

        console.log('data1', data.length)

        for(const item of data) {

            const dbRecord = await getRecordDetail(
                item.db_record_id,
                'CLOSURE',
                [ '\"CableConnection\"' ],
            );

            const l0Closures = await cosmosDb.query(`
             SELECT
                 ftth.closure.*
            FROM ftth.closure, ftth.polygon as b
            WHERE b.id IN (${item.ex_polygon_id})
            AND b.name = 'EX'
            AND ftth.closure.type_id = 1
            AND ST_Intersects(ftth.closure.geometry, b.geometry)
            `)

            console.log('l0Closures', l0Closures)
            if (l0Closures[0]) {

                let mappings = []
                try {

                    const link = await getFromS3(
                        `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                        `auto-connect/l0-${l0Closures[0].id}/closure-cable-mappings-gis-l1-polygon-${item.l1_polygon_id}`,
                    )

                    const response = await axios.get(link)
                    mappings = response['data'];

                } catch (e) {
                    console.error(e.message)
                }

                if (mappings && mappings.length > 0) {
                    const inClosure = mappings.find(elem => elem.inClosure === Number(item.closure_id))
                    console.log('inClosure', inClosure)

                    if (inClosure) {
                        const closureCables = await cosmosDb.query(
                            `--- GET intersecting cables by closure id
                    SELECT
                        c.id,
                        ct.name as type,
                        d.cables
                    FROM ftth.closure c
                    LEFT JOIN ftth.closure_type as ct ON (ct.id = c.type_id)
                    LEFT JOIN LATERAL (
                        SELECT json_agg(
                            json_build_object(
                                'id', cb.id,
                                'type', cbt.name,
                                'length', cb.length
                            )
                        ) AS cables
                        FROM ftth.cable as cb
                        LEFT JOIN ftth.cable_type as cbt ON (cb.type_id = cbt.id)
                        WHERE cbt.name IN ('Access', 'Distribution', 'Feed')
                        AND CASE
                            WHEN ST_GeometryType(cb.geometry) <> 'ST_MultiCurve'
                                THEN ST_Intersects(cb.geometry, c.geometry)
                            WHEN ST_GeometryType(cb.geometry) = 'ST_MultiCurve'
                                THEN ST_Intersects(ST_CurveToLine(cb.geometry), c.geometry)
                        END
                         ) AS d on true
                    WHERE d.cables IS NOT NULL
                    AND c.id = ${item.closure_id};

                `,
                        )

                        console.log('closureId', item.closure_id)
                        console.log('closureCables', closureCables[0] ? closureCables[0].cables : undefined)

                        // if the cables exist then remove the one that is not in the mappings

                        for(const record of getAllRelations(dbRecord, 'CableConnection')) {
                            if (getProperty(record, 'Direction') === 'IN') {
                                const extRef = Number(getProperty(record, 'CableExternalRef'))

                                const inCableExists = closureCables[0] ? closureCables[0].cables.find(elem => elem.id === extRef) : undefined

                                if (inCableExists && extRef !== inClosure.inCable) {
                                    // no IN cables exist delete both
                                    console.log('DELETE_IN_CABLE_CONNECTIONS', extRef)
                                    await deleteRecord('CableConnection', record['id'])
                                } else if (!inCableExists) {
                                    // no IN cables exist delete both
                                    console.log('DELETE_BOTH_IN_CABLE_CONNECTIONS', extRef)
                                    await deleteRecord('CableConnection', record['id'])

                                }
                            }
                        }
                    }
                }
            }
        }

        odinDb.close();
        cosmosDb.close();

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}


execute();

