import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { getFromS3 } from '../data/http';
import {
    getAllClosuresWithCableConnections,
    getAllFibresByCableId,
    getCableFiberConnectionsByCableId,
    getCablesAndConnectionsByClosureId,
    getInCableByClosureId,
    getOutCableByClosureId,
} from '../data/sql';
import { constructTubeFibreKey, mergePreviousTemplate } from '../data/utils';
import { ITraceTemplate } from '../interfaces/connections.interface';
import { FiberConnection } from '../types/fibre.connection';

dotenv.config({ path: '../../../../.env' });

/**
 * This script will take an L1 polygon and count the total number of USED fibers for
 * Spine cables OUT and then create splitter connections for each.
 *
 * @param l1PolygonId
 * @param exPolygonId
 * @param l0ClosureId
 * @param odinDb
 * @param cosmosDb
 * @param debug
 */
export async function createL0Connections(
    exPolygonId: string,
    l0ClosureId: string,
    { odinDb, cosmosDb },
    debug?: boolean,
) {

    let connections: FiberConnection[] = [];
    let previousTemplate: ITraceTemplate = undefined

    let outFibersToConnect = []

    let usedInFibers = []
    let usedOutFibers = []

    try {

        let l0ClosureIds = l0ClosureId ? [ l0ClosureId ] : [];

        const closures = await getAllClosuresWithCableConnections(l0ClosureIds, 'L0', { odinDb })

        console.log('LENGTH', closures.length)

        for(const closure of closures) {

            try {
                const templateUrl = await getFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${exPolygonId}/l0-fiber-connections-template-${closure['ext_ref']}`,
                )

                console.log(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${exPolygonId}/l0-fiber-connections-template-${closure['ext_ref']}`,
                )
                const response = await axios.get(templateUrl)

                previousTemplate = response['data']
                connections = response['data'];

            } catch (e) {
                console.log(e)
                console.log('no state')
            }

            const inCables = await getInCableByClosureId(closure.id, { odinDb })
            const outCables = await getOutCableByClosureId(closure.id, { odinDb })

            const inCableIds = await inCables.map(elem => elem['cable_id'])

            let hasMoreConnections = true;

            let inCableNumber = 0
            let outCableNumber = 0

            while (hasMoreConnections) {

                console.log('OUT CABLE NUMBER', outCableNumber)
                const outCable = outCables[outCableNumber]

                // if there are no more out cables break the loop
                if(!outCable) {
                    console.log('NO OUT CABLE', outCableNumber)
                    hasMoreConnections = false
                    break;
                }

                console.log('IN CABLE NUMBER', inCableNumber)
                const inCable = inCables[inCableNumber]

                // if there are no more in cables break the loop
                if(!inCable) {
                    console.log('NO IN CABLE', inCableNumber)
                    hasMoreConnections = false
                    break;
                }

                const inFibersAll = await getAllFibresByCableId(inCable['cable_id'], { odinDb });
                const inFibers = inFibersAll.filter(elem => elem.fiber_state === null && !usedInFibers.includes(elem['fiber_id']))
                // if there are no more fibers available and there are more In cables
                // search the next cable
                if(inFibers.length < 1 && inCables.length < inCableNumber) {
                    console.log('NO IN CABLE FIBERS', inCableNumber)
                    inCableNumber++
                    break;
                }

                const { outFibersToConnect } = await getOutFibersToConnect(closure.id, inCableIds);

                // const outFibersAll = await getAllFibresByCableId(outCable['cable_id'], { odinDb });
                // const outFibers = outFibersAll.filter(elem => elem.fiber_status !== null &&
                // !usedOutFibers.includes(elem['fiber_id']))

                for(let i = 0; i < outFibersToConnect.length; i++) {

                    console.log('inFibers', inFibers)
                    console.log('i', i)

                    const inFiber = inFibers[i]
                    const outFiber = outFibersToConnect[i]

                    // no more in fibers go to the next in cable
                    if(!inFiber) {
                        console.log('NO IN FIBER FOR CABLE', inCable['in_cable_ext_ref_from_closure'])
                        inCableNumber++
                        break;
                    }

                    // add used fibers to the array for filtering as we loop over all the in fibers and out fibers
                    usedInFibers.push(inFiber['fiber_id'])
                    usedOutFibers.push(outFiber['fiberInId'])

                    // create new connection template
                    const newConnection: FiberConnection = {
                        type: 'LOOP',
                        closureId: closure.id,
                        outClosureExt: closure['ext_ref'],
                        cableOutId: inCable['cable_id'],
                        cableOutExternalRef: inCable['in_cable_ext_ref_from_closure'],
                        tubeFiberOut: constructTubeFibreKey(inFiber['tube_number'], inFiber['fiber_number']),
                        tubeOutId: inFiber['tube_id'],
                        fiberOutId: inFiber['fiber_id'],
                        fiberOutState: inFiber['fiber_state'],
                        // this is the downstream fiber connection
                        inClosureExt: outFiber['closureInExt'],
                        cableInId: outFiber['cableInId'],
                        cableInExternalRef: outFiber['cableInExt'],
                        tubeFiberIn: outFiber['tubeFibreKeyIn'],
                        tubeInId: outFiber['tubeInId'],
                        fiberInId: outFiber['fiberInId'],
                        fiberInState: outFiber['fiberInState'],


                    }

                    connections.push(newConnection)

                }

                // go to the next outCable
                outCableNumber++

            }

            console.log('connections', connections)

            if(connections.length > 0) {
                await putObjectToS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${exPolygonId}/l0-fiber-connections-template-${closure['ext_ref']}`,
                    Buffer.from(JSON.stringify(mergePreviousTemplate(previousTemplate, {
                        connections: connections,
                        slotsChecked: {},
                        usedSplices: {},
                        usedSplitterIds: [],
                        inFibersToConnect: [],
                        outFibersToConnect: [],
                        fiberTraces: [],
                    }))),
                )
            }
            // reset any params that are no needed after the mappings is created
            connections = []
        }

        /**
         *
         * @param closureId
         * @param inCableId
         */
        async function getOutFibersToConnect(closureId: string, inCableIds: string[]) {

            // TODO: If the template is set and not saved there will not be able Fiber connections
            // and if the user runs set again it will keep using fibers
            const inFiberConnections = await getCableFiberConnectionsByCableId(inCableIds, { odinDb })

            console.log('inFiberConnections', inFiberConnections)

            const inFiberIds = inFiberConnections.filter(elem => elem['fiber_state'] !== null).map(
                elem => elem['out_fiber_id'])

            // Step 2: get the total number of connections needed for Distribution cables
            const closureCables = await getCablesAndConnectionsByClosureId(closureId, 'Spine', { odinDb })

            const closureOutCableIds = closureCables.map(elem => elem['cable_id']);
            outFibersToConnect = await getCableFiberConnectionsByCableId(closureOutCableIds, { odinDb })

            // Todo: we also need to get the unique SPLIT fibers from DistributionCables

            // only get fibers that are marked used and are SPLICES or LOOP cable fibers that are USED
            outFibersToConnect = outFibersToConnect.filter(elem => elem['fiber_state'] !== null && [
                'SPLIT',
                'SPLICE',
                'LOOP',
            ].includes(elem['type']) && !usedOutFibers.includes(elem['in_fiber_id']))

            // Step 3: Filter out fibres already connected
            if(inFiberIds.length > 0) {

                outFibersToConnect = outFibersToConnect.filter(elem => !inFiberIds.includes(
                    elem['in_fiber_id']))
            }

            const uniqueOutFibersToConnect = []
            let uniqueOutFiberIds = {}
            if(outFibersToConnect && outFibersToConnect.length > 0) {
                for(const outFiber of outFibersToConnect) {
                    if(!uniqueOutFiberIds[outFiber['in_fiber_id']]) {
                        uniqueOutFibersToConnect.push(outFiber)
                        uniqueOutFiberIds = { ...uniqueOutFiberIds, ...{ [outFiber['in_fiber_id']]: true } }
                    }
                }
            }

            console.log('uniqueOutFiberIds', uniqueOutFiberIds)
            console.log('outFibersToConnect', outFibersToConnect)
            console.log('uniqueOutFibersToConnect', uniqueOutFibersToConnect)

            // TODO get existing fiber connections with no out fibers
            // these are connections created previously that we want to
            // fill in all non used fiber connections

            outFibersToConnect = uniqueOutFibersToConnect.map(elem => ({
                tubeFibreKeyIn: elem['in_tube_fiber'],
                fiberInState: elem['fiber_state'],
                closureInExt: elem['in_closure'],
                cableInExt: elem['in_cable'],
                fiberInId: elem['in_fiber_id'],
                tubeInId: elem['in_tube_id'],
                cableInId: elem['in_cable_id'],
            }))

            console.log('_OUT_FIBRES_TO_CONNECT', outFibersToConnect)

            return { outFibersToConnect }

        }


    } catch (e) {
        console.error(e);
        throw new ExceptionType(e.statusCode, e.message, e.validation, e.data)
    }

}

