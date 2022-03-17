import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../common/awsS3/buckets/buckets.service';
import { getFromS3 } from './data/http';
import {
    getAllFeaturesByPolygonId,
    getIntegrationParamsByFeatureType,
    getTotalCablesByTypeInGisByPolygonId,
    getTotalCablesByTypeInOdinByPolygonId,
    getTotalClosuresByTypeInGisByPolygonId,
    getTotalClosuresByTypeInOdinByPolygonId,
    getTotalClosuresNoCableConnectionsInOdinByPolygonId,
    getTotalCountOfFeaturesByPolygon,
    getTotalFeatureCountInGisByPolygonId,
} from './data/sql';
import { getCableTypeFromId, getClosureTypeFromId } from './data/utils';

dotenv.config({ path: '../../../../.env' });


/**
 * This will compare the total number of closures and cables
 *
 * @param closures
 * @param cables
 */
const checkClosureCableMatches = (closures: { [key: number]: string }[], cables: { [key: number]: string }[]) => {

    let spine;
    let distribution;
    let access;
    let feed;

    const l0Closures = closures.find(elem => elem['type'] === 'L0')
    const l1Closures = closures.find(elem => elem['type'] === 'L1')
    const spineCables = cables.find(elem => elem['type'] === 'Spine')
    let l0AndL1Closures = { count: '0' }
    if (l0Closures && l1Closures) {
        let total = Number(l0Closures['count']) + Number(l1Closures['count']);
        l0AndL1Closures['count'] = String(total)
    }
    console.log('l0AndL1Closures', l0AndL1Closures)
    spine = verifyMatch(l0AndL1Closures, spineCables, 'gte')

    const l2Closures = closures.find(elem => elem['type'] === 'L2')
    const distributionCables = cables.find(elem => elem['type'] === 'Distribution')

    console.log('l2Closures', l2Closures)
    console.log('distributionCables', distributionCables)
    distribution = verifyMatch(l2Closures, distributionCables)

    const l3Closures = closures.find(elem => elem['type'] === 'L3')
    const accessCables = cables.find(elem => elem['type'] === 'Access')
    access = verifyMatch(l3Closures, accessCables)

    const l4Closures = closures.find(elem => elem['type'] === 'L4')
    const lMClosures = closures.find(elem => elem['type'] === 'LM')
    const feedCables = cables.find(elem => elem['type'] === 'Feed')
    let l4AndLmClosures = { count: '0' }
    if (l4Closures && lMClosures) {
        let total = Number(l4Closures['count']) + Number(lMClosures['count']);
        l4AndLmClosures['count'] = String(total)
    } else if (l4Closures && !lMClosures) {
        let total = Number(l4Closures['count']);
        l4AndLmClosures['count'] = String(total)
    } else if (!l4Closures && lMClosures) {
        let total = Number(lMClosures['count']);
        l4AndLmClosures['count'] = String(total)
    }
    console.log('l4AndLmClosures', l4AndLmClosures)
    feed = verifyMatch(l4AndLmClosures, feedCables)

    return {
        spine,
        distribution,
        access,
        feed,
    }

}

const verifyMatch = (closures: any, cables: any, condition?: 'gte'): boolean => {

    if (closures && cables) {
        // check the two match
        if (condition === 'gte') {
            return closures['count'] <= cables['count']
        }
        return closures['count'] === cables['count']
    }
    return false
}

export async function checkDataForL2Polygon(
    l0ClosureId: string,
    l1PolygonId: string,
    l2PolygonId: string,
    { odinDb, cosmosDb },
) {

    try {

        const tracesUrl = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-mappings-gis-l1-polygon-${l1PolygonId}`,
        )
        const response = await axios.get(tracesUrl)
        let connectionMappings = response['data'];

        if (!connectionMappings) {
            throw new ExceptionType(400, 'Please run a trace from the L0 closure')
        }

        const closureIdsMapped = []
        const cableIdsMapped = []
        if (connectionMappings) {

            const inClosureIds = connectionMappings.map(elem => elem['inClosure'])
            closureIdsMapped.push(...inClosureIds)

            const inCableIds = connectionMappings.map(elem => elem['inCable'])
            cableIdsMapped.push(...inCableIds)

            const outClosureIds = connectionMappings.map(elem => elem['outClosure'])
            closureIdsMapped.push(...outClosureIds)

            const outCableIds = connectionMappings.map(elem => elem['outCable'])
            cableIdsMapped.push(...outCableIds)

        }

        console.log('closureIdsMapped', closureIdsMapped.length)

        const closureParams = getIntegrationParamsByFeatureType('CLOSURE')
        const cableParams = getIntegrationParamsByFeatureType('CABLE')

        // Odin data
        console.time('odin_cables')
        const odinClosures = await getTotalClosuresByTypeInOdinByPolygonId(undefined, l2PolygonId, { odinDb })
        const odinCables = await getTotalCablesByTypeInOdinByPolygonId(undefined, l2PolygonId, { odinDb })
        console.timeEnd('odin_cables')
        console.time('all_closures')
        const odinClosureList = await getAllFeaturesByPolygonId(l2PolygonId, 'CLOSURE', 'L2PolygonId', { odinDb })
        const extClosureIds = odinClosureList.map(elem => Number(elem['ext_ref']))
        console.timeEnd('all_closures')
        console.time('all_cables')
        const odinCableList = await getAllFeaturesByPolygonId(l2PolygonId, 'CABLE', 'L2PolygonId', { odinDb })
        const extCableIds = odinCableList.map(elem => Number(elem['ext_ref']))
        console.timeEnd('all_cables')
        console.time('total_closure_count')
        const odinClosureCountRes = await getTotalCountOfFeaturesByPolygon(
            undefined,
            l2PolygonId,
            'CLOSURE',
            { odinDb },
        );
        const odinClosureCount = odinClosureCountRes[0]['count'];
        console.timeEnd('total_closure_count')
        console.time('total_cable_count')
        const odinCableCountRes = await getTotalCountOfFeaturesByPolygon(undefined, l2PolygonId, 'CABLE', { odinDb });
        const odinCableCount = odinCableCountRes[0]['count'];
        console.timeEnd('total_cable_count')
        console.time('closure_connections')
        let odinClosureConnections = await odinDb.query(
            `select c.value as type, count(*)
            from db_records
            left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'ClosureType')
            left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
            where entity = 'ProjectModule:Feature'
            and db_records.type IN ('CLOSURE')
            and c.value IN (${closureParams.featureTypeIds.map(elem => `'${elem}'`)})
            and db_records.deleted_at is null
            and to_tsvector('english', c2.value) @@ to_tsquery('${l2PolygonId}')
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:CableConnection'
                and a.parent_record_id = db_records.id
                and a.deleted_at IS NULL
            )
            group by c.value
            order by c.value::integer asc
            `,
        )
        if (odinClosureConnections && odinClosureConnections.length > 0) {
            odinClosureConnections = odinClosureConnections.map(elem => ({
                ...elem,
                type: getClosureTypeFromId(Number(elem['type'])),
            }))
        }
        console.timeEnd('closure_connections')

        const checkAllCablesConnected = checkClosureCableMatches(odinClosureConnections, odinCables)

        console.log('odinCables', odinCables)

        console.log('odinClosureConnections', odinClosureConnections)
        console.log('checkAllCablesConnected', checkAllCablesConnected)

        let odinCableFiberConnections = await odinDb.query(
            `select c.value as type, count(*)
            from db_records
            left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'CableType')
            left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
            where entity = 'ProjectModule:Feature'
            and db_records.type IN ('CABLE')
            and c.value IN (${cableParams.featureTypeIds.map(elem => `'${elem}'`)})
            and db_records.deleted_at is null
            and to_tsvector('english', c2.value) @@ to_tsquery('${l2PolygonId}')
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:FiberConnection'
                and a.parent_record_id = db_records.id
                and a.deleted_at IS NULL
            )
            group by c.value
            order by c.value::integer asc
            `,
        )

        console.log('odinCableFiberConnections', odinCableFiberConnections)

        if (odinCableFiberConnections && odinCableFiberConnections.length > 0) {
            odinCableFiberConnections = odinCableFiberConnections.map(elem => ({
                ...elem,
                type: getCableTypeFromId(Number(elem['type'])),
            }))
        }

        console.log('odinCableFiberConnections', odinCableFiberConnections)


        console.time('closure_with_cable')
        // Get closure cable connection data
        const closureWithCableRes = await odinDb.query(
            `select count(*)
            from db_records
            left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'ClosureType')
            left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
            where entity = 'ProjectModule:Feature'
            and db_records.type IN ('CLOSURE')
            and c.value IN (${closureParams.featureTypeIds.map(elem => `'${elem}'`)})
            and db_records.deleted_at is null
            and to_tsvector('english', c2.value) @@ to_tsquery('${l2PolygonId}')
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:CableConnection'
                and a.parent_record_id = db_records.id
                and a.deleted_at IS NULL
            )
            `,
        )
        const countClosuresWithCable = closureWithCableRes[0]['count']
        console.timeEnd('closure_with_cable')
        const odinMatches = checkClosureCableMatches(odinClosures, odinCables)
        console.time('closure_no_cable')
        const odinClosuresNoCables = await getTotalClosuresNoCableConnectionsInOdinByPolygonId(
            undefined,
            l2PolygonId,
            { odinDb },
        )
        console.log('extClosureIds', extClosureIds)
        console.timeEnd('closure_no_cable')
        // GIS data
        console.time('closure_not_in_odin')
        let gisClosuresNotInOdin = []
        if (extClosureIds && extClosureIds.length > 0) {
            gisClosuresNotInOdin = await cosmosDb.query(`
            SELECT
                a.id
            FROM ftth.closure as a
            LEFT JOIN ftth.polygon as p on ST_Intersects(a.geometry, p.geometry)
            WHERE a.id NOT IN (${extClosureIds})
            AND a.type_id IN (${closureParams.featureTypeIds})
            AND p.id = ${l2PolygonId}
            `);
        }

        let inOdinNotGIS = []
        if (extClosureIds && extClosureIds.length > 0) {
            const closuresInL2Polygon = await cosmosDb.query(`
            SELECT
                a.id
            FROM ftth.closure as a
            LEFT JOIN ftth.polygon as p on ST_Intersects(a.geometry, p.geometry)
            WHERE a.type_id IN (${closureParams.featureTypeIds})
            AND p.id = ${l2PolygonId}
            `);

            console.log('extClosureIds', extClosureIds.length)
            console.log('closuresInL2Polygon', closuresInL2Polygon.length)

            inOdinNotGIS = extClosureIds.filter(id => !closuresInL2Polygon.map(elem => elem.id).includes(id))

            console.log(
                'inOdinNotGIS',
                inOdinNotGIS,
            )

        }
        console.timeEnd('closure_not_in_odin')

        console.time('cable_not_in_odin')
        console.log('extCableIds', extCableIds)
        let gisCablesNotInOdin = []
        if (extCableIds && extCableIds.length > 0) {
            gisCablesNotInOdin = await cosmosDb.query(`
                SELECT ct.name as type, count(*)
                FROM pedro.frankcable
                LEFT JOIN ftth.cable_type ct ON ct.id = cabletype
                WHERE polyid = ${l2PolygonId}
                AND cableid NOT IN (${extCableIds})
                AND cabletype IN (${cableParams.featureTypeIds})
                GROUP BY cabletype, ct.name
                ORDER BY cabletype asc
            `);
        }
        console.timeEnd('cable_not_in_odin')

        let gisCablesNotInOdinIds = []

        if (extCableIds && extCableIds.length > 0) {
            const gisCables = await cosmosDb.query(`
                SELECT cableid as id
                FROM pedro.frankcable
                LEFT JOIN ftth.cable_type ct ON ct.id = cabletype
                WHERE polyid = ${l2PolygonId}
                AND cabletype IN (${cableParams.featureTypeIds})
            `);

            const gisCableIds = await gisCables.map(elem => elem['id'])
            const inOdinNotGis = await extCableIds.filter(elem => !gisCableIds.includes(elem))
            gisCablesNotInOdinIds = await gisCableIds.filter(elem => !extCableIds.includes(elem))

            console.log('inOdinNotGis', inOdinNotGis)
        }
        console.timeEnd('cable_in_odin_not_gis')

        console.time('closure_not_traced')
        let closuresNotTraced = []
        if (extClosureIds && extClosureIds.length > 0) {
            closuresNotTraced = await cosmosDb.query(`
            SELECT
                a.id, ct.name as type
            FROM ftth.polygon p
            left join ftth.closure a on st_intersects(a.geometry, p.geometry)
            LEFT JOIN ftth.closure_type as ct ON (ct.id = a.type_id)
            WHERE a.id NOT IN (${closureIdsMapped})
            AND a.type_id IN (${closureParams.featureTypeIds})
            AND p.id = ${l2PolygonId}
            `);
            console.timeEnd('closure_not_traced')
        }


        console.time('cable_not_traced')
        let cablesNotTraced = []
        if (cableIdsMapped && cableIdsMapped.length > 0) {
            cablesNotTraced = await cosmosDb.query(`
                SELECT cableid as id, ct.name as type
                FROM pedro.frankcable
                LEFT JOIN ftth.cable_type ct ON ct.id = cabletype
                WHERE polyid = ${l2PolygonId}
                AND cableid NOT IN (${cableIdsMapped})
                AND cabletype IN (${cableParams.featureTypeIds})
                ORDER BY cableid asc
            `);
        }
        console.timeEnd('cable_not_traced')

        const gisClosureCountRes = await getTotalFeatureCountInGisByPolygonId(
            l2PolygonId,
            'ftth.closure',
            { cosmosDb },
        )
        const gisClosureCount = gisClosureCountRes['count'];

        const gisCableCountRes = await getTotalFeatureCountInGisByPolygonId(
            l2PolygonId,
            'ftth.cable',
            { cosmosDb },
        )
        const gisCableCount = gisCableCountRes['count'];

        const gisClosures = await getTotalClosuresByTypeInGisByPolygonId(l2PolygonId, { cosmosDb })
        const gisCables = await getTotalCablesByTypeInGisByPolygonId(l2PolygonId, { cosmosDb })
        const gisMatches = checkClosureCableMatches(gisClosures, gisCables)

        // This will be the first cable from Spine -> Feed that is missing we
        const firstMissingCable = odinClosuresNoCables[0] ? [ odinClosuresNoCables[0] ] : []

        const data = {
            odinClosureCount,
            gisClosureCount,
            odinCableCount,
            gisCableCount,
            odinMatches,
            gisMatches,
            odinCableFiberConnections,
            checkAllCablesConnected,
            odinClosureConnections,
            countClosuresWithCable,
            odinClosures,
            odinCables,
            gisClosures,
            gisCables,
            firstMissingCable,
            closuresNotTraced,
            cablesNotTraced,
            inOdinNotGIS,
            gisClosuresNotInOdin,
            gisCablesNotInOdinIds,
            gisCablesNotInOdin,
            odinClosuresNoCables,
        };

        console.log(data)

        if (gisClosures && gisClosures.length > 0) {
            await putObjectToS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${l2PolygonId}/pre-check`,
                Buffer.from(JSON.stringify(data)),
            )
        }

        return data

    } catch (e) {
        console.error(e);
    }


    /**
     * Query functions and Helper functions
     */

}
