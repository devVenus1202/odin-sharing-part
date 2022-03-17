import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../common/awsS3/buckets/buckets.service';
import {
    getAllFeaturesByPolygonId,
    getIntegrationParamsByFeatureType,
    getTotalCablesByTypeInGisByPolygonId,
    getTotalCablesByTypeInOdinByPolygonId,
    getTotalClosuresByTypeInGisByPolygonId,
    getTotalClosuresByTypeInOdinByPolygonId,
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


export async function checkDataForL2Polygon(l0ClosureId: string, l2PolygonId: string, { odinDb, cosmosDb }) {

    try {

        const closureParams = getIntegrationParamsByFeatureType('CLOSURE')
        const cableParams = getIntegrationParamsByFeatureType('CABLE')

        // Odin data
        const odinClosures = await getTotalClosuresByTypeInOdinByPolygonId(undefined, l2PolygonId, { odinDb })
        const odinCables = await getTotalCablesByTypeInOdinByPolygonId(undefined, l2PolygonId, { odinDb })

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

        const odinCableList = await getAllFeaturesByPolygonId(l2PolygonId, 'CABLE', 'L2PolygonId', { odinDb })
        const extCableIds = odinCableList.map(elem => Number(elem['ext_ref']))

        const checkAllCablesConnected = checkClosureCableMatches(odinClosureConnections, odinCables)

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

        // Get total expected Loop fiber from loop fiber templates
        // Get total created loop fiber connections in the L2
        // L2 polygon cables -> fiber connections by cable

        // GIS Data
        const gisClosures = await getTotalClosuresByTypeInGisByPolygonId(l2PolygonId, { cosmosDb })
        const gisCables = await getTotalCablesByTypeInGisByPolygonId(l2PolygonId, { cosmosDb })

        let gisCablesNotInOdin = []
        if (extCableIds && extCableIds.length > 0) {
            gisCablesNotInOdin = await cosmosDb.query(`
                SELECT ct.name as type, count(*)
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
                where c.id NOT IN (${extCableIds})
                AND p.id = ${l2PolygonId}
                AND c.type_id IN (${cableParams.featureTypeIds})
                GROUP BY c.type_id, ct.name
                ORDER BY c.type_id asc
            `);
        }

        let gisCablesNotInOdinIds = []
        if (extCableIds && extCableIds.length > 0) {
            gisCablesNotInOdinIds = await cosmosDb.query(`
                SELECT c.id
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
                where c.id NOT IN (${extCableIds})
                AND p.id = ${l2PolygonId}
                AND c.type_id IN (${cableParams.featureTypeIds})
                ORDER BY c.id asc
            `);
        }

        const data = {
            gisCablesNotInOdin,
            gisCablesNotInOdinIds,
            checkAllCablesConnected,
            odinClosureConnections,
            odinCableFiberConnections,
            odinClosures,
            odinCables,
            gisClosures,
            gisCables,
        };

        console.log(data)

        if (odinClosures && odinClosures.length > 0) {
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
