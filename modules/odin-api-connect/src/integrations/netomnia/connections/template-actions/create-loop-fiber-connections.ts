import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import axios from 'axios';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { chunkArray } from '../../../../helpers/utilities';
import { createFiberConnection, getFromS3 } from '../data/http';
import { getClosureIdsByPolygonId, getFiberConnectionsByFibreId } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

export async function createLoopFiberConnections(
    principal: OrganizationUserEntity,
    l0ClosureId: string,
    l1PolygonId: string,
    l2PolygonId: string,
    closureType: string,
    cableType: string,
    { odinDb, cosmosDb },
    closureId?: string,
) {

    try {
        const mappingUrl = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/polygon-${l1PolygonId}/${cableType.toLowerCase()}-loop-fiber-mappings`,
        )

        console.log(`auto-connect/polygon-${l1PolygonId}/${cableType.toLowerCase()}-loop-fiber-mappings`)

        const response = await axios.get(mappingUrl)
        const fiberConnections = response['data'];

        const errors = [];
        const modified = [];

        let closureIds = closureId ? [ closureId ] : [];

        if(l2PolygonId && !closureId) {

            let polygonId = l2PolygonId;

            if(closureType === 'L0') {
                let polygons = await cosmosDb.query(
                    `
                            SELECT
                            a.id, a.name
                            FROM ftth.polygon as a,ftth.polygon  as b
                            WHERE ST_Intersects(b.geometry, a.geometry)
                            AND b.id = ${polygonId}
                        `);
                console.log('l1Polygon_before', polygons)
                const polygon = polygons.find(elem => elem.name === 'EX')
                polygonId = polygon ? polygon['id'] : l2PolygonId
            }

            const ids = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb })

            console.log('ids', ids)
            if(ids[0]) {
                closureIds = ids.map(elem => elem['id'])
            }

            // We want to also create loop fiber connections for L1 closures
            const l1Ids = await getClosureIdsByPolygonId(l1PolygonId, 'L1', { cosmosDb })
            if(l1Ids[0]) {
                closureIds.push(...l1Ids.map(elem => elem['id']))
            }
        }

        console.log('fiberConnections', fiberConnections)

        console.log('closureIds', closureIds, cableType, closureType)

        const inFibres = fiberConnections.filter(elem => elem['inClosureExt'] ? closureIds.includes(elem['inClosureExt']) : false)
        const outFibres = fiberConnections.filter(elem => elem['outClosureExt'] ? closureIds.includes(elem['outClosureExt']) : false)

        const fibreConnectionsChunked = chunkArray([ ...inFibres, ...outFibres ], 50);

        console.log(fibreConnectionsChunked)

        for(const connections of fibreConnectionsChunked) {

            for(const connection of connections) {

                console.log('connection', connection)

                // get the closure fibre connections using the upstream connection outFibre
                const usedFiber = await getFiberConnectionsByFibreId(
                    connection['fiberInId'],
                    { odinDb },
                    true,
                )

                if(!usedFiber[0]) {
                    // Todo: get all fiberConnections for this cable
                    // Todo: check if there are any inFiber and InCable that match for other fiber connection types
                    await createFiberConnection(connection)

                }
            }
        }

        // save that the template was applied
        await putObjectToS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/polygon-${l2PolygonId}/${cableType.toLowerCase()}-loop-fiber-mappings-applied`,
            Buffer.from(JSON.stringify({
                action: 'applied',
                date: dayjs().format(),
                user: principal.firstname,
                totalConnections: [ ...inFibres, ...outFibres ].length,
            })),
        )

        return { modified, errors };

    } catch (e) {
        console.error(e);
    }
}
