import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { setImmediatePromise, sleep } from '../../../../helpers/utilities';
import { addTrayModelToSlot, createRecordNoQueue, getRecordDetail } from '../data/http';
import { getSlotsByClosureId, getSplittersByTrayId, getUnUsedSplitterConnections } from '../data/sql';
import { getFibreNumberFromTubeFiberKey } from '../data/utils';
import { constructClosureSlots } from '../featurecomponents/constructors/features.component.closure.slots';
import { constructSlotTrays } from '../featurecomponents/constructors/features.component.slot.trays';
import {
    constructTraySplitters,
    getTotalTraySplitters,
} from '../featurecomponents/constructors/features.component.trays.splitters';
import { FiberConnection } from '../types/fibre.connection';

/**
 *
 * @param trace
 * @param closureExtRef
 * @param closureId
 * @param inFibersToConnect
 * @param outFibersToConnect
 * @param usedSplitterIds
 * @param slotsChecked
 * @param connections
 * @param newConnections
 * @param odinDb
 */
export async function createSplitterConnections(
    closureExtRef: string,
    closureId: string,
    inFibersToConnect: any,
    outFibersToConnect: any,
    usedSplitterIds: any,
    slotsChecked: any,
    { odinDb },
) {

    let newSlotsChecked = Object.assign({}, slotsChecked)
    let connectionsToCreate: FiberConnection[] = []
    let newConnections: FiberConnection[] = []


    console.log('----------------------------------')
    console.log('CREATE_SPLITTER_CONNECTIONS')
    console.log('----------------------------------')

    let newInFibersToConnect = inFibersToConnect;
    let newOutFibersToConnect = outFibersToConnect;

    // before create new splitter connections check for existing fibers with available splitter outputs
    const availSplitterConnections = await getUnUsedSplitterConnections(closureId, { odinDb })
    console.log('availSplitterConnections', availSplitterConnections)

    for(let i = 0; i < availSplitterConnections.length; i++) {

        const fiberConnection = availSplitterConnections[i]
        // get the fiber connection
        const record = await getRecordDetail(fiberConnection.id, 'FiberConnection', [])
        console.log('record', record)

        const sortedOutConnections = outFibersToConnect.sort((
            a,
            b,
        ) => getFibreNumberFromTubeFiberKey(a.tubeFibreKeyIn) - getFibreNumberFromTubeFiberKey(b.tubeFibreKeyIn));

        const outConnection = sortedOutConnections[i]

        if (outConnection) {

            const connection = new FiberConnection();
            connection.type = 'SPLIT';
            connection.closureId = closureId;
            connection.slotId = getProperty(record, 'SlotId');
            connection.trayModelId = getProperty(record, 'TrayModelId');
            connection.trayId = getProperty(record, 'TrayId');
            connection.trayInId = getProperty(record, 'TrayInId');
            connection.trayOutId = getProperty(record, 'TrayOutId');
            connection.traySpliceId = null;
            connection.traySplitterId = getProperty(record, 'TraySplitterId');
            connection.inClosureExt = getProperty(record, 'InClosureExternalRef');
            connection.outClosureExt = outConnection['closureInExt'];
            connection.cableInId = getProperty(record, 'CableInId');
            connection.cableInExternalRef = getProperty(record, 'CableInExternalRef');
            connection.tubeFiberIn = getProperty(record, 'TubeFiberIn');
            connection.tubeInId = getProperty(record, 'TubeInId');
            connection.fiberInId = getProperty(record, 'FiberInId');
            connection.tubeFiberOut = outConnection['tubeFibreKeyIn'];
            connection.cableOutId = outConnection['cableInId'];
            connection.cableOutExternalRef = outConnection['cableInExt'];
            connection.tubeOutId = outConnection['tubeInId'];
            connection.fiberOutId = outConnection['fiberInId'];
            connection.splitterNumber = getProperty(record, 'SplitterNumber');

            newConnections.push(connection)
        }

    }

    if (newConnections.length > 0) {

        // filter out connections mapped above to existing splitters
        newOutFibersToConnect = outFibersToConnect.filter(elem => !newConnections.map(elem => elem.fiberOutId).includes(
            elem.fiberInId))

        // sort in fibers and remove the last n fibers that we do not need to connect
        const sortedInFibers = inFibersToConnect.sort((
            a,
            b,
        ) => getFibreNumberFromTubeFiberKey(a.tubeFibreKeyOut) - getFibreNumberFromTubeFiberKey(b.tubeFibreKeyOut));

        console.log('sortedInFibers', sortedInFibers)

        newInFibersToConnect = sortedInFibers.splice(sortedInFibers.length - Math.floor(newConnections.length / 4))

    }

    console.log('outFibersToConnect__Len', outFibersToConnect.length)
    console.log('outFibersToConnect', outFibersToConnect)

    console.log('newOutFibersToConnect__Len', newOutFibersToConnect.length)
    console.log('newOutFibersToConnect', newOutFibersToConnect)

    console.log('newInFibersToConnect__Len', newInFibersToConnect.length)
    console.log('newInFibersToConnect', newInFibersToConnect)


    // create new connections with splitters
    for(let i = 0; i < newInFibersToConnect.length; i++) {

        const inConnection = newInFibersToConnect[i];

        // create a new connection in the upstream closure and connect the downstream fibre as the OUT
        // only create the connection if the fibreOut is null
        const connectionDetails = {

            closureId: closureId,
            cableInExternalRef: inConnection['cableOutExt'], // the IN Cable of the upstream closure
            inClosureExt: inConnection['outClosureExt'],  // we trace up so the OUT params from the
            cableInId: inConnection['cableOutId'],
            tubeFiberIn: inConnection['tubeFibreKeyOut'],
            tubeInId: inConnection['tubeOutId'],
            fiberInId: inConnection['fiberOutId'], // this is the OUT fiber of the IN cable for the Upstream
            outClosureExt: null,  // the IN Closure from the downstream closure
            cableOutExternalRef: null, // the IN Cable of the downstream closure
            tubeFiberOut: null, // this is the IN fibre of the downstream closure
            tubeOutId: null,
            fiberOutId: null,
            cableOutId: null,

        }

        await createSplitterConnections(connectionDetails);

    }

    console.log('_CONNECTIONS', connectionsToCreate)
    console.log('_CONNECTIONS_LENGTH', connectionsToCreate.length)
    console.log('_CONNECTIONS_TO_CREATE', newInFibersToConnect.length)

    // We take the fibers with splitters and merge in the out connections
    if (connectionsToCreate && connectionsToCreate.length > 0) {

        const sortedSplitterConnections = connectionsToCreate.sort((
            a,
            b,
        ) => getFibreNumberFromTubeFiberKey(a.tubeFiberIn) - getFibreNumberFromTubeFiberKey(b.tubeFiberIn))

        const sortedOutConnections = newOutFibersToConnect.sort((
            a,
            b,
        ) => getFibreNumberFromTubeFiberKey(a.tubeFibreKeyIn) - getFibreNumberFromTubeFiberKey(b.tubeFibreKeyIn));
        // Create connections
        for(let i = 0; i < sortedSplitterConnections.length; i++) {

            let connection = sortedSplitterConnections[i];
            const outConnection = sortedOutConnections.sort((
                a,
                b,
            ) => Number(a.cableInExt) - Number(b.cableInExt))[i]

            if (outConnection) {
                connection = Object.assign({}, connection, {

                    fiberInState: outConnection['fiberInState'],
                    outClosureExt: outConnection['closureInExt'],
                    cableOutExternalRef: outConnection['cableInExt'],
                    tubeFiberOut: outConnection['tubeFibreKeyIn'],
                    tubeOutId: outConnection['tubeInId'],
                    fiberOutId: outConnection['fiberInId'],
                    cableOutId: outConnection['cableInId'],

                })

                newConnections.push(connection)
            } else {
                // we still want to create the empty connection
                newConnections.push(connection)
            }
        }
    }

    return { newConnections, slotsChecked };


    /**
     *
     * this function will take 1 fiber and split it (n) number of times
     *
     * @param connectionDetails
     * @param splitterCount
     */
    async function createSplitterConnections(connectionDetails) {

        const { connectionsPerFiber } = await configureTrayForConnection(connectionDetails);
        console.log('connectionsPerFiber', connectionsPerFiber)

        for(let i = 0; i < Number(connectionsPerFiber); i++) {

            const { slot, tray, trayModel, nextSplitter } = await configureTrayForConnection(connectionDetails);

            if (nextSplitter) {

                const connection = new FiberConnection();
                connection.type = 'SPLIT';
                connection.closureId = connectionDetails['closureId'];
                connection.slotId = slot.id;
                connection.trayModelId = trayModel.id;
                connection.trayId = tray['id'];
                connection.trayInId = tray['id'];
                connection.trayOutId = tray['id'];
                connection.traySpliceId = null;
                connection.traySplitterId = nextSplitter.id;
                connection.inClosureExt = connectionDetails['inClosureExt'];
                connection.outClosureExt = connectionDetails['outClosureExt'];
                connection.cableInId = connectionDetails['cableInId'];
                connection.cableInExternalRef = connectionDetails['cableInExternalRef'];
                connection.tubeFiberIn = connectionDetails['tubeFiberIn'];
                connection.tubeInId = connectionDetails['tubeInId'];
                connection.fiberInId = connectionDetails['fiberInId'];
                connection.tubeFiberOut = connectionDetails['tubeFiberOut'];
                connection.cableOutId = connectionDetails['cableOutId'];
                connection.cableOutExternalRef = connectionDetails['cableOutExternalRef'];
                connection.tubeOutId = connectionDetails['tubeOutId'];
                connection.fiberOutId = connectionDetails['fiberOutId'];
                connection.splitterNumber = nextSplitter['splitter_number'];

                usedSplitterIds.push(nextSplitter['id'])
                connectionsToCreate.push(connection)

            } else {
                console.log('NO_SPLITTER_RETURNED')
                console.log('connectionDetails', connectionDetails)
                console.log('slot, tray,', slot, tray)
            }

        }


        return;
    }

    /**
     *
     * @param connectionDetails
     */
    async function configureTrayForConnection(connectionDetails: any, slotNumber?: number) {

        console.log('newSlotsChecked', newSlotsChecked)

        let lastSlotNumber = newSlotsChecked[connectionDetails['closureId']] ? newSlotsChecked[connectionDetails['closureId']] : 1

        if (slotNumber) {
            lastSlotNumber = slotNumber
        }

        const slot = await getNextAvailableSlot(connectionDetails, lastSlotNumber);
        console.log('slot', slot)
        const trayModel = await addTrayModelToSlot(slot, 'fist72:standard:12', { odinDb });
        const tray = await getSlotTray(slot, connectionDetails, trayModel)

        // get the splitter # per fiber i.e 1:4, 1:8
        const splitterType = getProperty(trayModel, 'SplitterType')
        const connectionsPerFiber = splitterType.split('_')[1]

        const nextSplitter = await getNextSplitter(tray, Number(connectionsPerFiber), trayModel)

        if (!nextSplitter) {
            return await configureTrayForConnection(connectionDetails, lastSlotNumber + 1)
        }

        return { slot, trayModel, tray, nextSplitter, connectionsPerFiber }

    }

    /**
     *
     * @param connectionDetails
     * @param slotNumber
     */
    async function getNextAvailableSlot(connectionDetails: any, slotNumber?: number) {

        // set the default starting slot number
        let startingSlotNumber = slotNumber ? slotNumber : 1;

        console.log('startingSlotNumber', startingSlotNumber)
        // check it against the last checked slot
        if (newSlotsChecked[connectionDetails['closureId']]) {

            const lastSaved = newSlotsChecked[connectionDetails['closureId']]

            if (Number(slotNumber) && Number(lastSaved) < Number(slotNumber)) {
                startingSlotNumber = slotNumber;
            } else {
                startingSlotNumber = lastSaved
            }
        }

        let slots = await getSlotsByClosureId(connectionDetails['closureId'], { odinDb })

        console.log('slots', slots)

        let slot = slots.find(elem => Number(elem['slot_number']) === startingSlotNumber)

        if (!slot) {

            const closure = await getRecordDetail(connectionDetails['closureId'], 'Feature', [ '\"FeatureModel\"' ])

            const closureModel = getFirstRelation(closure, 'FeatureModel')

            const expectedSlots = createMissingSlots({ id: connectionDetails['closureId'] }, closureModel)

            if (slots && slots.length > 0) {
                const existingSlotNumbers = slots.map(elem => Number(elem['slot_number']))
                // filter out already created slots
                const slotsToCreate = expectedSlots.filter(elem => !existingSlotNumbers.includes(elem.properties['SlotNumber']))
                console.log('slotsToCreate', slotsToCreate)
                // create missing slots
                await createRecordNoQueue(slotsToCreate, 'FeatureComponent', 'skipRelate=true')
            } else {
                console.log('expectedSlots', expectedSlots)
                // create all the missing slots
                await createRecordNoQueue(expectedSlots, 'FeatureComponent', 'skipRelate=true')
            }

            slots = await getSlotsByClosureId(connectionDetails['closureId'], { odinDb })
            slot = slots.find(elem => Number(elem['slot_number']) === startingSlotNumber)
            console.log('slot', slot)

            newSlotsChecked = Object.assign(
                {},
                newSlotsChecked,
                { [connectionDetails['closureId']]: startingSlotNumber },
            )

            return slot

        } else {

            newSlotsChecked = Object.assign(
                {},
                newSlotsChecked,
                { [connectionDetails['closureId']]: startingSlotNumber },
            )

            console.log('newSlotsChecked', newSlotsChecked)

            return slot;

        }

    }

    /**
     *
     * @param slot
     * @param connectionDetails
     * @param trayModel
     */
    async function getSlotTray(slot: any, connectionDetails: any, trayModel: DbRecordEntityTransform) {

        let lastSlotNumber = newSlotsChecked[connectionDetails['closureId']]
        let trays = slot['trays'];

        while (!trays) {

            await sleep(3000)
            let slots = await getSlotsByClosureId(connectionDetails['closureId'], { odinDb })

            console.log('lastSlotNumber', lastSlotNumber)
            console.log('slots', slots)

            const slot = slots.find(elem => Number(elem['slot_number']) === lastSlotNumber)

            trays = slot['trays']

            if (!trays) {
                const expectedTrays = createMissingTrays(slot, trayModel)
                console.log('expectedTrays', expectedTrays)
                // create all the missing slots
                await createRecordNoQueue(expectedTrays, 'FeatureComponent', 'skipRelate=true')
            }
            // unblock the event loop
            await setImmediatePromise()

        }

        return trays[0];
    }

    /**
     *
     * @param trays
     * @param connectionsPerFibre
     */
    async function getNextSplitter(slotTray: any, connectionsPerFibre: number, trayModel: any) {

        let splitters;
        let nextSplitter;
        let checkCount = 0;

        console.log('usedSplitterIds', usedSplitterIds)
        // because splitters are created from the queue it might take a few seconds for them to create
        // keep tyring to get them and search all the trays in this slot
        while (!splitters) {

            // if there is no splice available in the tray
            await sleep(250)
            console.log('WAITING_FOR_SPLITTERS_TO_BE_CREATED')
            console.log('tray', slotTray['id'])
            const tray = await getSplittersByTrayId(slotTray['id'], { odinDb });

            if (tray['splitters']) {

                splitters = tray['splitters'].sort((a, b) => Number(a.splitter_number) - Number(b.splitter_number))

                splitters = tray['splitters'].filter(elem => !usedSplitterIds.includes(elem['id']))
                splitters = splitters.length > 0 ? splitters : undefined
                // sort the splices in ascending order
                const sortedSplitters = splitters ? splitters.sort((
                    a,
                    b,
                ) => Number(a['splitter_number']) - Number(b['splitter_number'])) : []

                console.log('sortedSplitters', sortedSplitters)

                const nextAvailableSplitter = sortedSplitters.find(elem => elem.connections === null)

                console.log('nextAvailableSplitter', nextAvailableSplitter)

                nextSplitter = nextAvailableSplitter;

                console.log('_HAS_NEXT_SPLITTER', nextSplitter)
            }

            console.log('checkCount', checkCount)
            console.log('splitters', splitters)

            // create missing splitters if none are created after 100 checks
            if (checkCount > 150 && !tray['splitters']) {
                // delete the current slot model and add it back
                const splittersToCreate = createMissingSplitters(slotTray, trayModel)
                console.log('splittersToCreate', splittersToCreate)

                // create missing splitters
                await createRecordNoQueue(splittersToCreate, 'FeatureComponent', 'skipRelate=true')

                // reset the check count to wait for associations to be created
                checkCount = 0

            } else if (checkCount > 150 && tray['splitters'].length < getTotalTraySplitters(trayModel)) {

                // if the total number of splitters created is less than the total number of splitters expected
                // create the difference

                const existingSplitterNumbers = tray['splitters'].map(elem => Number(elem['splitter_number']))
                console.log('existingSplitterNumbers', existingSplitterNumbers)

                const splittersToCreate = createMissingSplitters(slotTray, trayModel)
                console.log('splittersToCreate', splittersToCreate)
                // filter out already created splitters
                splittersToCreate.filter(elem => !existingSplitterNumbers.includes(elem.properties['SplitterNumber']))

                // create missing splitters
                await createRecordNoQueue(splittersToCreate, 'FeatureComponent', 'skipRelate=true')

                // reset the check count to wait for associations to be created
                checkCount = 0

            } else if (tray['splitters'] && tray['splitters'].length === getTotalTraySplitters(trayModel)) {

                console.log('BREAK', getTotalTraySplitters(trayModel))

                break;

            }

            checkCount++

            // unblock the event loop
            await setImmediatePromise()
        }

        return nextSplitter;
    }

    /**
     * In some cases slots and might not be created when the model is added to the tray
     * this is the fall back to add any missing slots to a tray if none are created
     * @param tray
     * @param trayModel
     * @param modelSchema
     */
    function createMissingSlots(closure: any, trayModel: any) {

        let closureSlots = []

        const slots = constructClosureSlots(closure.id, trayModel)
        closureSlots.push(...slots);

        return closureSlots
    }

    /**
     * In some cases splices and splitters might not be created when the model is added to the tray
     * this is the fall back to add any missing slots to a tray if none are created
     * @param tray
     * @param trayModel
     * @param modelSchema
     */
    function createMissingSplitters(tray: any, trayModel: any) {

        let trayComponentCreates = []

        const splitters = constructTraySplitters(tray.id, trayModel)
        trayComponentCreates.push(...splitters);

        return trayComponentCreates
    }

    /**
     * In some cases trays might not be created when the model is added to the slot
     * this is the fall back to add any missing slots to a tray if none are created
     * @param slot
     * @param trayModel
     */
    function createMissingTrays(slot: any, trayModel: any) {

        let creates = []

        const tray = constructSlotTrays(slot.id, trayModel)
        creates.push(...tray);

        return creates
    }

}
