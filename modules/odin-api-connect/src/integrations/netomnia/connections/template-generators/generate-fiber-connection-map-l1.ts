import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { getAllRecordsByEntity, getFromS3, updateRecord } from '../data/http';
import {
    getAllClosuresWithCableConnections,
    getAllFibresByCableId,
    getCableConnectionsByCableId,
    getCableFiberConnectionsByCableId,
    getCablesAndConnectionsByClosureId,
    getClosureIdsByPolygonId,
    getInCableByClosureId,
} from '../data/sql';
import { constructTubeFibreKey, getUpstreamClosureDetailsByCableId, mergePreviousTemplate } from '../data/utils';
import { ITraceTemplate } from '../interfaces/connections.interface';
import { FiberConnection } from '../types/fibre.connection';
import { createSpliceConnection } from './create-splice-connection';
import { createSplitterConnections } from './create-splitter-connection';

dotenv.config({ path: '../../../../.env' });

/**
 * This script will take an L1 polygon and count the total number of USED fibers for
 * Distribution cables OUT and then create splitter connections for each.
 *
 * @param l1PolygonId
 * @param l1ClosureId
 * @param odinDb
 * @param cosmosDb
 * @param debug
 */
export async function createL1Connections(
    l1PolygonId: string,
    l1ClosureId: string,
    { odinDb, cosmosDb },
    debug?: boolean,
) {

    let featureModels;

    let connections: FiberConnection[] = [];
    let previousTemplate: ITraceTemplate = undefined

    let fiberTraces = []
    let loopTraces = []
    let inFibersToConnect = []
    let outFibersToConnect = []
    let searchNextTubeFiberOverride;
    let searchedStartingFibers = []
    let startingTubeFiber = 'T1:F1';
    let searchNextTubeFiber = 'T1:F1';
    let searchedFiberKeys = []
    let usedSplitterIds = []
    // when we are creating conection mappings we store the last available slotNumber based on the previous
    // available slot found. This saves  time searching over all slots every time
    let slotsChecked = {}

    let usedSplices = {}

    // used for tracing upstream and breaking the loop if there is no direct path
    // when tracing a loop cable
    let isSearchComplete = false;

    try {

        let l1ClosureIds = l1ClosureId ? [ l1ClosureId ] : [];
        let dataCheck;

        if (l1PolygonId) {

            const link = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${l1PolygonId}/pre-check`,
            )
            const response = await axios.get(link)

            dataCheck = response['data'];

            if (!l1ClosureId) {
                const ids = await getClosureIdsByPolygonId(l1PolygonId, 'L1', { cosmosDb })
                if (ids[0]) {
                    l1ClosureIds = ids.map(elem => elem['id'])
                }
            }

        }

        if (dataCheck) {

            if (dataCheck['odinClosuresNoCables'].length > 0) {
                console.log(dataCheck)
                throw new ExceptionType(
                    422,
                    'this L1 polygon has closure with no cables, please correct them before splicing',
                    [],
                    dataCheck['odinClosuresNoCables'],
                )
            }
        }

        console.log('l1ClosureIds', l1ClosureIds)

        const closures = await getAllClosuresWithCableConnections(l1ClosureIds, 'L1', { odinDb })

        featureModels = await getAllRecordsByEntity('ProjectModule', 'FeatureModel', 'TRAY', { odinDb });

        console.log('LENGTH', closures.length)

        const closuresNone = []

        console.log('closures', closures)

        for(const closure of closures) {

            let connections;
            try {
                const templateUrl = await getFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l1PolygonId}/l1-fiber-connections-template-${closure['ext_ref']}`,
                )

                console.log(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l1PolygonId}/l1-fiber-connections-template-${closure['ext_ref']}`,
                )
                const response = await axios.get(templateUrl)

                previousTemplate = response['data']
                connections = response['data'];
                usedSplitterIds = response['data']['usedSplitterIds'];
                slotsChecked = response['data']['slotsChecked'];

            } catch (e) {
                console.log(e)
                console.log('no state')
            }

            console.log('NO_CONNECTIONS')
            closuresNone.push(closure)
        }
        console.log('closuresNone', closuresNone)

        for(const closure of closuresNone) {

            // starting closure "In" cable
            const inCable = await getInCableByClosureId(closure.id, { odinDb })
            const inCableId = inCable[0]['cable_id']

            const { newConnectionsNeeded } = await getOutFibersToConnect(closure.id, inCableId);

            console.log('newConnectionsNeeded', newConnectionsNeeded)

            const allFibres = await getAllFibresByCableId(inCableId, { odinDb })

            for(let i = 0; i < newConnectionsNeeded; i++) {
                // create mappings for new connections
                console.log('STARTING_NEW_CONNECTION', i)

                searchNextTubeFiberOverride = undefined

                await traceUpStream(closure.id, inCableId, allFibres)

            }

            if (newConnectionsNeeded > 0) {


                const filteredTraces = fiberTraces.filter(elem => elem.upstreamClosureType === 'L2')

                console.log('filteredTraces', filteredTraces)

                console.log('newConnectionsNeeded', newConnectionsNeeded)

                console.log('fiberTraces', fiberTraces)
                console.log('inFibersToConnect', inFibersToConnect)
                console.log('outFibersToConnect', outFibersToConnect)

                await putObjectToS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l1PolygonId}/l1-fiber-traces-${closure['ext_ref']}`,
                    Buffer.from(JSON.stringify({
                            connections: [],
                            fiberTraces: filteredTraces,
                        },
                    )),
                )

                // create splitter connections
                const splitterConnections = await createSplitterConnections(
                    closure['ext_ref'],
                    closure['id'],
                    inFibersToConnect,
                    outFibersToConnect,
                    usedSplitterIds,
                    slotsChecked,
                    { odinDb },
                )

                console.log('splitterConnections', splitterConnections)
                slotsChecked = Object.assign({}, slotsChecked, splitterConnections.slotsChecked)
                connections.push(...splitterConnections.newConnections)

                // create splice connections
                for(const trace of fiberTraces) {
                    // exclude the source closure from any splices
                    if (trace['closure_id'] !== closure['id']) {
                        const spliceConnections = await createSpliceConnection(
                            trace,
                            usedSplices,
                            slotsChecked,
                            { odinDb },
                        )

                        console.log('spliceConnections', spliceConnections)
                        slotsChecked = Object.assign({}, slotsChecked, spliceConnections.slotsChecked)
                        connections.push(...spliceConnections.newConnections)
                    }
                }

                // update all used fibers
                if (filteredTraces && filteredTraces.length > 0) {
                    for(const trace of fiberTraces) {
                        const updateOne = new DbRecordCreateUpdateDto()
                        updateOne.entity = 'ProjectModule:FeatureComponent'
                        updateOne.type = 'FIBER'
                        updateOne.properties = {
                            FiberState: 'USED',
                        }

                        await updateRecord(
                            'FeatureComponent',
                            trace['fiberOutId'],
                            updateOne,
                        )

                        const updateTwo = new DbRecordCreateUpdateDto()
                        updateTwo.entity = 'ProjectModule:FeatureComponent'
                        updateTwo.type = 'FIBER'
                        updateTwo.properties = {
                            FiberState: 'USED',
                        }

                        await updateRecord(
                            'FeatureComponent',
                            trace['fiberInId'],
                            updateTwo,
                        )
                    }
                }

                await putObjectToS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l1PolygonId}/l1-fiber-connections-template-${closure['ext_ref']}`,
                    Buffer.from(JSON.stringify(mergePreviousTemplate(previousTemplate, {
                        connections,
                        slotsChecked,
                        usedSplices,
                        usedSplitterIds,
                        inFibersToConnect,
                        outFibersToConnect,
                        fiberTraces,
                    }))),
                )
            }

            // reset any params that are no needed after the mappings is created

            fiberTraces = [];
            searchNextTubeFiberOverride = null
            searchedFiberKeys = []
            connections = []

        }


        /**
         *
         * @param closureId
         * @param inCableId
         * @param allFibres
         */
        async function traceUpStream(closureId: string, inCableId: string, allFibres: any) {

            let isTraceComplete = false;

            while (!isTraceComplete) {

                loopTraces = []

                console.log('searchedStartingFibers', searchedStartingFibers)

                const availableFibers = allFibres.filter(elem => !searchedStartingFibers.includes(
                    elem['fiber_id']) && elem['fiber_state'] === null)

                const nextFibre = availableFibers[0]

                console.log('nextFibre', nextFibre)

                const tubeFibreKey = constructTubeFibreKey(nextFibre['tube_number'], nextFibre['fiber_number'])

                console.log('tubeFibreKey', tubeFibreKey)

                console.log('searchNextTubeFiberOverride', searchNextTubeFiberOverride)

                // reset the starting tube and fibre and set the default searchNextTube to be the same
                startingTubeFiber = tubeFibreKey
                searchNextTubeFiber = searchNextTubeFiberOverride ? searchNextTubeFiberOverride : tubeFibreKey

                isTraceComplete = await goToNextClosure(inCableId, 'L0', 'L1', 'IN', closureId, nextFibre)

                console.log('loopTraces', loopTraces)

                if (isTraceComplete) {

                    fiberTraces.push(...loopTraces)
                    inFibersToConnect.push(...loopTraces.filter(elem => elem['cableOutId'] === inCableId))

                    searchedStartingFibers.push(nextFibre['fiber_id'])

                    break;
                } else {

                    console.log('searchNextTubeFiberOverride', searchNextTubeFiberOverride)
                    if (searchNextTubeFiberOverride !== tubeFibreKey) {
                        searchedStartingFibers.push(nextFibre['fiber_id'])
                    }

                    loopTraces = []

                }

            }
        }


        /**
         *
         * @param closureId
         * @param inCableId
         */
        async function getOutFibersToConnect(closureId: string, inCableId: string) {

            let totalConnectionsNeeded = 0


            // TODO: If the template is set and not saved there will not be able Fiber connections
            // and if the user runs set again it will keep using fibers
            const inFiberConnections = await getCableFiberConnectionsByCableId([ inCableId ], { odinDb })

            console.log('inFiberConnections', inFiberConnections)

            const inFiberIds = inFiberConnections.filter(elem => elem['fiber_state'] !== null && elem['type'] === 'SPLIT').map(
                elem => elem['out_fiber_id'])

            // Step 2: get the total number of connections needed for Distribution cables
            const closureCables = await getCablesAndConnectionsByClosureId(closureId, 'Distribution', { odinDb })

            const closureOutCableIds = closureCables.map(elem => elem['cable_id']);
            outFibersToConnect = await getCableFiberConnectionsByCableId(closureOutCableIds, { odinDb })

            // Todo: we also need to get the unique SPLIT fibers from DistributionCables

            // only get fibers that are marked used and are SPLICES or LOOP cable fibers that are USED
            outFibersToConnect = outFibersToConnect.filter(elem => elem['fiber_state'] !== null && [
                'SPLIT',
                'SPLICE',
                'LOOP',
            ].includes(elem['type']))

            // Step 3: Filter out fibres already connected
            if (inFiberIds.length > 0) {

                outFibersToConnect = outFibersToConnect.filter(elem => !inFiberIds.includes(
                    elem['in_fiber_id']))
            }

            const uniqueOutFibersToConnect = []
            let uniqueOutFiberIds = {}
            if (outFibersToConnect && outFibersToConnect.length > 0) {
                for(const outFiber of outFibersToConnect) {
                    if (!uniqueOutFiberIds[outFiber['in_fiber_id']]) {
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

            // set the total number of connections needed
            totalConnectionsNeeded += outFibersToConnect.length

            // Step 3:  Configure slots
            const slotModel = featureModels.find(elem => elem.title === 'fist72:standard:12');
            console.log('slotModel', slotModel);

            const splitterType = getProperty(slotModel, 'SplitterType');
            const connectionsPerFibre = Number(splitterType.split('_')[1])

            console.log('_CONNECTIONS_PER_FIBRE', connectionsPerFibre)
            console.log('_TOTAL_CONNECTIONS_NEEDED', totalConnectionsNeeded)

            // round up to the nearest integer
            const newConnectionsNeeded = Math.ceil(totalConnectionsNeeded / connectionsPerFibre)

            return { newConnectionsNeeded }

        }


        /**
         *
         * @param cableId
         * @param traceTo
         * @param closureType
         * @param direction
         * @param startClosureId
         * @param firstFibre
         */
        async function goToNextClosure(
            cableId: string,
            traceTo: string,
            closureType: string,
            direction,
            startClosureId: string,
            firstFibre?: any,
        ) {

            // get the cable connection
            const cableConnection = await getCableConnectionsByCableId(cableId, direction, { odinDb })
            const connection = cableConnection[0];

            if (connection) {

                return await getNextAvailableFibreUpstreamCable(
                    cableId,
                    traceTo,
                    connection['is_loop'],
                    'IN',
                    startClosureId,
                    firstFibre,
                )

            }

        }


        /**
         *
         * @param cableId
         * @param traceTo
         * @param isLoop
         * @param direction
         * @param startClosureId
         * @param firstFibre
         */
        async function getNextAvailableFibreUpstreamCable(
            cableId: string,
            traceTo: string,
            isLoop: string,
            direction: 'IN' | 'OUT',
            startClosureId: string,
            firstFibre?: string,
        ) {

            console.log('---------------------------------')
            console.log('TRACE TO NEXT UPSTREAM CLOSURE')
            console.log('---------------------------------')

            console.log('cableId', cableId, 'direction', direction);

            // get the in cables for the closure
            const {
                upstreamClosure,
                upstreamClosureType,
                upstreamClosureInCables,
            } = await getUpstreamClosureDetailsByCableId(cableId, { odinDb })
            const firstInCable = upstreamClosureInCables[0]

            // console.log('___UPSTREAM_CLOSURE', upstreamClosure)
            // console.log('___BEFORE', startingTubeFiber)
            // console.log('___UPSTREAM_IN_CABLE', firstInCable)

            console.log(
                'TO_CLOSURE',
                { upstreamClosure, upstreamClosureType, upstreamClosureInCables, searchNextTubeFiber },
            )

            if (firstInCable) {

                let matchingFibreOut;

                console.log('startingTubeFiber', startingTubeFiber)
                console.log('firstFibre', firstFibre)

                // if the fibre is passed down use it as the starting out fibre
                if (firstFibre) {

                    // if this is the initial trace and the L1 is the next upstream closure
                    // add this
                    if (upstreamClosureType === 'L0') {
                        // this is the upstream fibre mapping
                        // the matching fibre is the upstream match which is the IN for the connection
                        // and the OUT for the downstream connection
                        // this fibre connection is created in the upstream closure

                        matchingFibreOut = await getAvailableFibre(cableId, searchNextTubeFiber)
                        const tubeFibreKeyOut = constructTubeFibreKey(
                            matchingFibreOut['tube_number'],
                            matchingFibreOut['fiber_number'],
                        )

                        loopTraces.push({
                            isLoop: false,
                            fibreConnectionId: null,
                            fiberInState: null,
                            // upstream closure parameters
                            upstreamClosureType,
                            tubeFibreKeyIn: null,
                            inClosureExt: upstreamClosure['to_closure_ext_ref'],
                            closureId: upstreamClosure['closure_id'],
                            cableInId: null,
                            cableInExt: null,
                            fiberInId: null,
                            tubeInId: null,
                            // downstream closure parameters
                            tubeFibreKeyOut,
                            fiberOutState: matchingFibreOut['fiber_state'],
                            outClosureExt: upstreamClosure['from_closure_ext_ref'],
                            cableOutExt: upstreamClosure['in_cable_ext_ref_from_closure'],
                            fiberOutId: matchingFibreOut['fiber_id'],
                            tubeOutId: matchingFibreOut['tube_id'],
                            cableOutId: matchingFibreOut['cable_id'],
                        })
                    }

                    // if we are starting from the L4 closure we set the initial fibre T1:F1
                    matchingFibreOut = firstFibre

                } else {
                    // any subsequent traces through this function we want to match the same tube
                    // and fibre of the loop cables
                    // we trace up the network back to the L1 so the downstream cable is the one coming out
                    // of the upstream closure
                    let cableFibresDownstream = await getAllFibresByCableId(cableId, { odinDb })

                    // console.log('cableFibresDownstream', cableFibresDownstream)
                    if (isLoop) {

                        console.log('FIRST_SEARCH')
                        matchingFibreOut = await getAvailableFibre(cableId, searchNextTubeFiber)

                    } else {
                        console.log('SECOND_SEARCH')
                        // if it is not a loop cable then find the next available fibre
                        matchingFibreOut = cableFibresDownstream.find(fibre => fibre['fiber_state'] === null).filter(
                            elem => !searchedStartingFibers.includes(elem['fiber_id']))
                    }
                }

                console.log('_MATCHING_FIBRE_OUT', matchingFibreOut)

                // get the upstream fibres
                const matchingFibreIn = await getAvailableFibre(firstInCable['cable_id'], searchNextTubeFiber)

                console.log('_MATCHING_FIBRE_IN', matchingFibreIn)

                // get the in and out cable if there is no fibre connection
                const cableConnection = await getCableConnectionsByCableId(
                    firstInCable['cable_id'],
                    direction,
                    { odinDb },
                )
                const connection = cableConnection[0];

                const outFiberCableConnection = await getCableConnectionsByCableId(
                    matchingFibreOut['cable_id'],
                    'IN',
                    { odinDb },
                )
                const outCableConnection = outFiberCableConnection[0];
                console.log('outCableConnection', outCableConnection)

                // we only want to trace up to search for a new fibre path up to the last L3
                // the reason being is that the L2 requires splitters
                if (!matchingFibreIn && ![ 'L0' ].includes(upstreamClosureType)) {

                    console.log('searchedFiberKeys', searchedFiberKeys)
                    console.log('searchNextTubeFiber', searchNextTubeFiber)
                    const nextFibre = await getAvailableFibre(cableId, searchNextTubeFiber, true)

                    if (nextFibre) {

                        const tubeFibreKeyIn = constructTubeFibreKey(
                            nextFibre['tube_number'],
                            nextFibre['fiber_number'],
                        )

                        searchedFiberKeys.push(tubeFibreKeyIn)

                        searchNextTubeFiberOverride = tubeFibreKeyIn

                        console.log('========')
                        console.log('TRACE COMPLETE FALSE 1')

                        // start from the beginning and start search over
                        console.log('RETURN 538')
                        return false;
                    }
                    console.log('========')
                    console.log('TRACE COMPLETE FALSE 2')
                    // start from the beginning and start search over
                    console.log('RETURN 543')
                    return false;

                } else if (matchingFibreIn && ![ 'L0' ].includes(upstreamClosureType)) {

                    const tubeFibreKeyIn = constructTubeFibreKey(
                        matchingFibreIn['tube_number'],
                        matchingFibreIn['fiber_number'],
                    )
                    const tubeFibreKeyOut = constructTubeFibreKey(
                        matchingFibreOut['tube_number'],
                        matchingFibreOut['fiber_number'],
                    )

                    // If the tube fibers do not match and this is a loop cable set the matching fibers
                    if (tubeFibreKeyIn !== tubeFibreKeyOut && isLoop) {

                        console.log('tubeFibreKeyIn', tubeFibreKeyIn, 'tubeFibreKeyOut', tubeFibreKeyOut)
                        matchingFibreOut = await getAvailableFibre(cableId, searchNextTubeFiber)
                        const fiberKeyOut = constructTubeFibreKey(
                            matchingFibreOut['tube_number'],
                            matchingFibreOut['fiber_number'],
                        )

                        // search over from the next tubeFibreKeyOut
                        searchNextTubeFiberOverride = tubeFibreKeyOut
                        console.log('fiberKeyOut', fiberKeyOut)

                        return false;
                    }

                    console.log('----TO_CLOSURE:   ', connection['from_closure_ext_ref'])
                    console.log('----IN_CABLE:     ', firstInCable['in_cable_ext_ref_from_closure'])

                    // this is the upstream fibre mapping
                    // the matching fibre is the upstream match which is the IN for the connection
                    // and the OUT for the downstream connection
                    // this fibre connection is created in the upstream closure

                    loopTraces.push({
                        isLoop: outCableConnection['is_loop'] === 'true',
                        fibreConnectionId: null,
                        fiberInState: matchingFibreIn['fiber_state'],
                        // upstream closure parameters
                        upstreamClosureType,
                        tubeFibreKeyIn,
                        inClosureExt: upstreamClosure['to_closure_ext_ref'],
                        closureId: upstreamClosure['closure_id'],
                        cableInId: connection['cable_id'],
                        cableInExt: connection['cable_external_ref'],
                        fiberInId: matchingFibreIn['fiber_id'],
                        tubeInId: matchingFibreIn['tube_id'],
                        // downstream closure parameters
                        tubeFibreKeyOut,
                        fiberOutState: matchingFibreOut['fiber_state'],
                        outClosureExt: upstreamClosure['from_closure_ext_ref'],
                        cableOutExt: upstreamClosure['in_cable_ext_ref_from_closure'],
                        fiberOutId: matchingFibreOut['fiber_id'],
                        tubeOutId: matchingFibreOut['tube_id'],
                        cableOutId: matchingFibreOut['cable_id'],
                    })


                    console.log('upstreamClosureType', upstreamClosureType)
                    console.log('traceTo', traceTo)
                    console.log('goToNextClosure', upstreamClosureType !== traceTo)

                    if (upstreamClosureType !== traceTo) {

                        // trace to next closure
                        console.log('GO_TO_NEXT_CLOSURE!')
                        await goToNextClosure(
                            firstInCable['cable_id'],
                            traceTo,
                            upstreamClosureType,
                            direction,
                            startClosureId,
                        )

                    } else {

                        console.log('RETURN 508')
                        isSearchComplete = true;

                    }

                } else if (upstreamClosureType === traceTo) {
                    console.log('RETURN 613')
                    isSearchComplete = true;
                    return true;
                }
            } else if (upstreamClosureType === traceTo) {
                console.log('RETURN 616')
                isSearchComplete = true;
                return true;
            } else {
                console.log('RETURN 620')
                isSearchComplete = false;
                return false;
            }
            console.log('RETURN 624')
            console.log('isSearchComplete', isSearchComplete)
            return isSearchComplete;

        }

        /**
         * get fibres by cableId matching the tube numbers
         *
         */
        async function getAvailableFibre(cableId: string, tubeFibre: string, filterOutSearched?: boolean) {

            // get the cable fibres
            const cableFibres = await getAllFibresByCableId(cableId, { odinDb })

            // find the matching fibre by tube and fibre
            let matchingFibre = cableFibres.find(fibre => constructTubeFibreKey(
                fibre['tube_number'],
                fibre['fiber_number'],
            ) === tubeFibre && fibre['fiber_state'] === null);

            // if searched fibre keys exist use that to filter next available
            if (searchedFiberKeys && searchedFiberKeys.length > 0 && filterOutSearched) {

                matchingFibre = cableFibres.find(fibre => !searchedFiberKeys.includes(constructTubeFibreKey(
                    fibre['tube_number'],
                    fibre['fiber_number'],
                )) && fibre['fiber_state'] === null);

            }

            return matchingFibre;

        }

    } catch (e) {
        console.error(e);
        throw new ExceptionType(e.statusCode, e.message, e.validation, e.data)
    }

}
