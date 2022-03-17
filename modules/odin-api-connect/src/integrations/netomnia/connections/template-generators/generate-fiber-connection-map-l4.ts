import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { deleteRecord, getFromS3, updateRecord } from '../data/http';
import {
    getAllClosuresWithFiberConnections,
    getAllClosuresWithNoFiberConnections,
    getAllFibresByCableId,
    getCableConnectionsByCableId,
    getClosureIdsByPolygonId,
    getDistanceBetweenClosures,
    getFiberConnectionByClosureId,
    getInCableByClosureId,
} from '../data/sql';
import {
    constructTubeFibreKey,
    getClosureTypeFromId,
    getDownStreamClosureDetailsByCableId,
    getUpstreamClosureDetailsByCableId,
    mergePreviousTemplate,
} from '../data/utils';
import { ITraceTemplate } from '../interfaces/connections.interface';
import { resetFibersByCableId } from '../template-actions/reset-fibers-by-cable-id';
import { FiberConnection } from '../types/fibre.connection';
import { createSpliceConnection } from './create-splice-connection';

dotenv.config({ path: '../../../../.env' });

export async function spliceL4Connections(
    l2PolygonId: string,
    l1PolygonId: string,
    l4ClosureId: string,
    { odinDb, cosmosDb },
) {

    let previousTemplate: ITraceTemplate = undefined
    let connections: FiberConnection[] = [];
    let filteredTraces = []
    let fiberTraces = []

    let startingTubeFiber = 'T1:F1';
    let searchNextTubeFiber = 'T1:F1';
    let searchNextTubeFiberOverride;

    let searchedFiberKeys = []

    let usedSplices = {}
    // when we are creating connection mappings we store the last available slotNumber based on the previous
    // available slot found. This saves  time searching over all slots every time
    let slotsChecked = {}

    try {

        //--------------------------------------------------------------------------
        // Main code that traces, generates state file and saves to S3
        //--------------------------------------------------------------------------

        let l4ClosureIds = l4ClosureId ? [ l4ClosureId ] : [];
        let lmClosureIds = [];
        let dataCheck;

        const l2ClosureId = await getClosureIdsByPolygonId(l2PolygonId, 'L2', { cosmosDb })

        if (l2PolygonId) {

            const link = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${l1PolygonId}/pre-check`,
            )
            const response = await axios.get(link)
            dataCheck = response['data'];

            const l4Ids = await getClosureIdsByPolygonId(l2PolygonId, 'L4', { cosmosDb })
            const lmIds = await getClosureIdsByPolygonId(l2PolygonId, 'LM', { cosmosDb })

            console.log('l4Ids', l4Ids)
            console.log('lmIds', lmIds)

            if (l4Ids[0]) {
                l4ClosureIds = l4Ids.map(elem => elem['id'])
                console.log('l4ClosureIds', l4ClosureIds.length)
            }

            if (lmIds[0]) {
                lmClosureIds = lmIds.map(elem => elem['id'])
                console.log('lmIds', lmIds.length)
            }
        }

        // validate before running script
        if (dataCheck) {
            if (dataCheck['odinClosuresNoCables'].filter(elem => [
                '3',
                '4',
                '5',
                '11',
            ].includes(elem['type'])).length > 0) {
                console.log(dataCheck)
                throw new ExceptionType(
                    422,
                    'this L2 polygon has closure with no cables, please correct them before splicing',
                    [],
                    dataCheck['odinClosuresNoCables'],
                )
            }
        }

        console.log('l4ClosureIds', l4ClosureIds)
        console.log('lmClosureIds', lmClosureIds)

        const { l4Closures, lmClosures, l4ClosuresWithFiber, lmClosuresWithFiber } = await Promise.all([
            getAllClosuresWithNoFiberConnections(l4ClosureIds, 'L4', { odinDb }),
            getAllClosuresWithNoFiberConnections(lmClosureIds, 'LM', { odinDb }),
            getAllClosuresWithFiberConnections(l4ClosureIds, 'L4', { odinDb }),
            getAllClosuresWithFiberConnections(lmClosureIds, 'LM', { odinDb }),
        ]).then(res => ({
            l4Closures: res[0],
            lmClosures: res[1],
            l4ClosuresWithFiber: res[2],
            lmClosuresWithFiber: res[3],
        }))

        // const l4Closures = await getAllClosuresWithNoFiberConnections(l4ClosureIds, 'L4', { odinDb })
        // const lmClosures = await getAllClosuresWithNoFiberConnections(lmClosureIds, 'LM', { odinDb })
        //
        // const l4ClosuresWithFiber = await getAllClosuresWithFiberConnections(l4ClosureIds, 'L4', { odinDb })
        // const lmClosuresWithFiber = await getAllClosuresWithFiberConnections(lmClosureIds, 'LM', { odinDb })

        const closuresNone = []

        console.log('l4ClosuresWithFiber', l4ClosuresWithFiber)
        console.log('lmClosuresWithFiber', lmClosuresWithFiber)


        // this loop will delete any fiber connection for a closure where the template does not exist
        for(const closure of [ ...l4ClosuresWithFiber, ...lmClosuresWithFiber ]) {

            let connections;
            try {
                console.log('closure', closure)
                const type = getClosureTypeFromId(Number(closure.type))
                console.log('type', type)

                const templateUrl = await getFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l2PolygonId}/${type.toLowerCase()}-fiber-connections-template-${closure['ext_ref']}`,
                )
                const response = await axios.get(templateUrl)

                previousTemplate = response['data']
                connections = response['data'];

            } catch (e) {
                console.error('no state')
            }

            console.log('connections', connections)

            if (!connections) {
                console.log('NO_CONNECTIONS')
                const fiberConnections = await getFiberConnectionByClosureId(closure.ext_ref, { odinDb })
                console.log('FIBER_CONNECTIONS_TO_DELETE', fiberConnections)
                if (fiberConnections && fiberConnections.length > 0) {

                    for(const connection of fiberConnections) {
                        console.log('DELETE_CONNECTION', connection)
                        await deleteRecord('FiberConnection', connection.id)
                    }

                    // get the closure IN cable connection
                    const inCableConnection = await getInCableByClosureId(closure.id, { odinDb })
                    console.log('inCableConnection', inCableConnection)

                    closure.from_closure_ext_ref = inCableConnection[0] ? inCableConnection[0]['from_closure_ext_ref'] : undefined

                    // get the distance of the L3 from the L2 closure

                    const closureDistance = await getDistanceBetweenClosures(
                        closure.from_closure_ext_ref,
                        l2ClosureId[0]['id'],
                        { cosmosDb },
                    )
                    closure.l3_distance_l2 = closureDistance
                    console.log('closureDistance', closureDistance)

                    closuresNone.push(closure)
                } else {
                    // get the closure IN cable connection
                    const inCableConnection = await getInCableByClosureId(closure.id, { odinDb })
                    console.log('inCableConnection', inCableConnection)
                    // mark the fibers unused
                    console.log('incable ext ref', inCableConnection[0]['in_cable_ext_ref_from_closure'])
                    if (inCableConnection[0]) {
                        const resetFibers = await resetFibersByCableId(
                            inCableConnection[0]['in_cable_ext_ref_from_closure'],
                            { odinDb },
                        )
                        console.log('resetFibers', resetFibers)
                    }
                }
            }
        }

        console.log('closuresNoneLen', closuresNone.length)
        console.log('closuresNone', closuresNone)


        for(const closure of [ ...l4Closures, ...lmClosures ]) {

            let connections;
            try {

                console.log('closure', closure)
                const type = getClosureTypeFromId(Number(closure.type))
                console.log('type', type)

                const templateUrl = await getFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${l2PolygonId}/${type.toLowerCase()}-fiber-connections-template-${closure['ext_ref']}`,
                )
                const response = await axios.get(templateUrl)
                connections = response['data'];

                // find closures that do not have a template and have connections
                // delete the fiber connection
                // reset the fiber state

            } catch (e) {
                console.log('no state')
            }

            if (!connections) {

                console.log('NO_CONNECTIONS')
                // get the closure IN cable connection
                const inCableConnection = await getInCableByClosureId(closure.id, { odinDb })
                console.log('inCableConnection', inCableConnection)

                closure.from_closure_ext_ref = inCableConnection[0] ? inCableConnection[0]['from_closure_ext_ref'] : undefined

                // get the distance of the L3 from the L2 closure
                const closureDistance = await getDistanceBetweenClosures(
                    closure.from_closure_ext_ref,
                    l2ClosureId[0]['id'],
                    { cosmosDb },
                )
                // get the distance of the L3 from the L2 closure
                closure.l3_distance_l2 = closureDistance
                console.log('closureDistance', closureDistance)

                closuresNone.push(closure)

                // mark the fibers unused
                if (inCableConnection[0]) {
                    const resetFibers = await resetFibersByCableId(
                        inCableConnection[0]['in_cable_ext_ref_from_closure'],
                        { odinDb },
                    )
                    console.log('resetFibers', resetFibers)
                }

            } else {
                console.log('HAS_CONNECTIONS', closure.id)
            }
        }
        console.log('closuresNoneLen', closuresNone.length)
        console.log('closuresNone', closuresNone)

        const sortedClosures = closuresNone.sort((
            a,
            b,
        ) => Number(a.l3_distance_l2) - Number(b.l3_distance_l2))

        console.log('sortedClosures', sortedClosures)
        console.log('sortedClosuresLen', sortedClosures.length)

        for(const closure of sortedClosures) {

            const type = getClosureTypeFromId(Number(closure.type))

            // trace and map a fibre connection
            await traceFiberConnections(closure.id)

            filteredTraces = fiberTraces.filter(elem => elem.upstreamClosureType === 'L3')

            await putObjectToS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${l2PolygonId}/${type.toLowerCase()}-fiber-traces-${closure['ext_ref']}`,
                Buffer.from(JSON.stringify({
                        connections: [],
                        fiberTraces: filteredTraces,
                    },
                )),
            )


            for(const trace of filteredTraces) {

                const spliceConnections = await createSpliceConnection(
                    trace,
                    usedSplices,
                    slotsChecked,
                    { odinDb },
                )

                console.log('newConnections', spliceConnections.newConnections)
                slotsChecked = Object.assign({}, slotsChecked, spliceConnections.slotsChecked)
                connections.push(...spliceConnections.newConnections)
            }

            console.log({
                connections, slotsChecked, usedSplices, fiberTraces,
            })

            // update all used fibers
            for(const trace of filteredTraces) {
                const updateOne = new DbRecordCreateUpdateDto()
                updateOne.entity = 'ProjectModule:FeatureComponent'
                updateOne.type = 'TUBE_FIBER'
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
                updateTwo.type = 'TUBE_FIBER'
                updateTwo.properties = {
                    FiberState: 'USED',
                }

                await updateRecord(
                    'FeatureComponent',
                    trace['fiberInId'],
                    updateTwo,
                )
            }

            // TODO: Merge old template data and new data
            await putObjectToS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${l2PolygonId}/${type.toLowerCase()}-fiber-connections-template-${closure['ext_ref']}`,
                Buffer.from(JSON.stringify(mergePreviousTemplate(previousTemplate, {
                    connections,
                    slotsChecked,
                    usedSplices,
                    fiberTraces: filteredTraces,
                }))),
            )

            // await putObjectToS3(
            //     `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            //     `auto-connect/polygon-${l2PolygonId}/${type.toLowerCase()}-fiber-connections-template-${closure['ext_ref']}`,
            // Buffer.from(JSON.stringify({ connections, slotsChecked, usedSplices, fiberTraces: filteredTraces, }, )),
            // )

            fiberTraces = [];
            searchNextTubeFiberOverride = null
            searchedFiberKeys = []
            connections = []

        }


        //--------------------------------------------------------------------------
        // Trace functions
        //--------------------------------------------------------------------------

        /**
         * Flow start 1
         * @param closureId
         * @param odinDb
         */
        async function traceFiberConnections(closureId: string) {


            console.log('----------------------------------')
            console.log('TRACE_FIBER_CONNECTIONS')
            console.log('----------------------------------')

            console.log('_______SPLICE_L4_CONNECTIONS', closureId)

            // reset the fibre traces anytime we call this function.
            // We want to re-trace from the beginning and check a different
            // Tube:Fiber
            fiberTraces = []

            // starting closure "In" cable
            const inCable = await getInCableByClosureId(closureId, { odinDb })
            const inCableId = inCable[0]['cable_id']

            // get the in cables for the closure
            const { inClosure, inClosureType } = await getDownStreamClosureDetailsByCableId(inCableId, { odinDb })

            console.log('inCableId', inCableId)

            // get the fibre from the loop cable that is UNUSED
            const cableFibres = await getAllFibresByCableId(inCableId, { odinDb })
            const firstFibre = cableFibres.find(elem => elem['fiber_state'] === null)
            console.log('LOOP_FIBRE', firstFibre)


            if (firstFibre) {

                const tubeFibreKey = constructTubeFibreKey(firstFibre['tube_number'], firstFibre['fiber_number'])

                // reset the starting tube and fibre and set the default searchNextTube to be the same
                startingTubeFiber = tubeFibreKey
                searchNextTubeFiber = searchNextTubeFiberOverride ? searchNextTubeFiberOverride : tubeFibreKey

                console.log('----FROM_CLOSURE:   ', inClosure['from_closure_ext_ref'])
                console.log('----IN_CABLE:       ', inClosure['in_cable_ext_ref_from_closure'])
                console.log('----IN_CABLE_FIBER: ', tubeFibreKey)

                // this will recursively trace from the inCable and closure to the L2
                await goToNextClosure(inCableId, 'L2', inClosureType, 'IN', closureId, firstFibre)

                console.log('_FIBRE_CONNECTIONS_IN', fiberTraces)

                console.log('_FIBRE_MAPPINGS_CT', fiberTraces.length)
                console.log('_FIBRE_CONNECTIONS_IN_CT', fiberTraces.length)

            }

            return fiberTraces;

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

            try {

                // get the in cables for the closure
                const { upstreamClosure, upstreamClosureType, upstreamClosureInCables } = await getUpstreamClosureDetailsByCableId(
                    cableId, { odinDb })
                const firstInCable = upstreamClosureInCables[0]

                console.log('upstreamClosureType', upstreamClosureType, 'traceTo', traceTo)

                if (firstInCable) {

                    let matchingFibreOut

                    if (firstFibre) {

                        // if we are starting from the L4 closure we set the initial fibre T1:F1
                        matchingFibreOut = firstFibre

                    } else {
                        // any subsequent traces through this function we want to match the same tube
                        // and fibre of the loop cables
                        console.log('downstream cable', cableId)
                        const cableFibresDownstream = await getAllFibresByCableId(cableId, { odinDb })

                        console.log('cableFibresDownstream', cableFibresDownstream)
                        if (isLoop) {

                            matchingFibreOut = cableFibresDownstream.find(fibre => constructTubeFibreKey(
                                fibre['tube_number'],
                                fibre['fiber_number'],
                            ) === searchNextTubeFiber && fibre['fiber_state'] === null)

                        } else {

                            // if it is not a loop cable then find the next available fibre
                            matchingFibreOut = cableFibresDownstream.find(fibre => fibre['fiber_state'] === null)
                        }
                    }

                    // get the upstream fibres
                    const cableFibres = await getAllFibresByCableId(firstInCable['cable_id'], { odinDb })
                    const matchingFibreIn = cableFibres.find(fibre => constructTubeFibreKey(
                        fibre['tube_number'],
                        fibre['fiber_number'],
                    ) === searchNextTubeFiber && fibre['fiber_state'] === null)

                    console.log('matchingFibreOut', matchingFibreOut)
                    console.log('matchingFibreIn', matchingFibreIn)

                    // we only want to trace up to search for a new fibre path up to the last L3
                    if (!matchingFibreIn && upstreamClosureType !== 'L2') {

                        const nextFibre = cableFibres.find(fibre => !searchedFiberKeys.includes(constructTubeFibreKey(
                            fibre['tube_number'],
                            fibre['fiber_number'],
                        )) && fibre['fiber_state'] === null)

                        if (nextFibre) {

                            const tubeFibreKey = constructTubeFibreKey(
                                nextFibre['tube_number'],
                                nextFibre['fiber_number'],
                            )

                            searchedFiberKeys.push(tubeFibreKey)

                            searchNextTubeFiberOverride = tubeFibreKey
                            return await traceFiberConnections(startClosureId)

                        }

                    } else if (matchingFibreIn && upstreamClosureType !== 'L2') {

                        const tubeFibreKeyIn = constructTubeFibreKey(
                            matchingFibreIn['tube_number'],
                            matchingFibreIn['fiber_number'],
                        )
                        const tubeFibreKeyOut = constructTubeFibreKey(
                            matchingFibreOut['tube_number'],
                            matchingFibreOut['fiber_number'],
                        )

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

                        console.log('_MATCHED')
                        fiberTraces.push({
                            isLoop: outCableConnection['is_loop'] === 'true',
                            fibreConnectionId: null,
                            fiberInState: matchingFibreIn['fiber_state'],
                            // upstream closure parameters
                            tubeFibreKeyIn,
                            upstreamClosureType,
                            inClosureExt: upstreamClosure['to_closure_ext_ref'],
                            closureId: upstreamClosure['closure_id'],
                            cableInId: connection['cable_id'],
                            cableInExt: connection['cable_external_ref'],
                            fiberInId: matchingFibreIn['fiber_id'],
                            tubeInId: matchingFibreIn['tube_id'],
                            // downstream
                            tubeFibreKeyOut,
                            fiberOutState: matchingFibreOut['fiber_state'],
                            outClosureExt: upstreamClosure['from_closure_ext_ref'],
                            cableOutExt: upstreamClosure['in_cable_ext_ref_from_closure'],
                            fiberOutId: matchingFibreOut['fiber_id'],
                            tubeOutId: matchingFibreOut['tube_id'],
                            cableOutId: matchingFibreOut['cable_id'],
                        })

                    }

                    if (upstreamClosureType !== traceTo) {

                        console.log('_TRACE_TO_NEXT_AVAILABLE_FIBER')
                        console.log('searchedFiberKeys', searchedFiberKeys)
                        console.log('searchNextTubeFiber', searchNextTubeFiber)

                        await goToNextClosure(
                            firstInCable['cable_id'],
                            traceTo,
                            upstreamClosureType,
                            direction,
                            startClosureId,
                        )

                    }
                }
            } catch (e) {
                console.error(e)
                throw new ExceptionType(e.statusCode, e.message, e.validation, e.data)
            }
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
                    'L2',
                    connection['is_loop'],
                    'IN',
                    startClosureId,
                    firstFibre,
                )

            }

        }


    } catch (e) {
        console.error(e);
        // update all used fibers
        for(const trace of filteredTraces) {
            const updateOne = new DbRecordCreateUpdateDto()
            updateOne.entity = 'ProjectModule:FeatureComponent'
            updateOne.type = 'TUBE_FIBER'
            updateOne.properties = {
                FiberState: null,
            }

            await updateRecord(
                'FeatureComponent',
                trace['fiberOutId'],
                updateOne,
            )

            const updateTwo = new DbRecordCreateUpdateDto()
            updateTwo.entity = 'ProjectModule:FeatureComponent'
            updateTwo.type = 'TUBE_FIBER'
            updateTwo.properties = {
                FiberState: null,
            }

            await updateRecord(
                'FeatureComponent',
                trace['fiberInId'],
                updateTwo,
            )
        }
        throw new ExceptionType(e.statusCode, e.message, e.validation, e.data)
    }

}
