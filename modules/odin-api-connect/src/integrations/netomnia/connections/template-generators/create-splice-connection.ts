import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getFirstRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { setImmediatePromise, sleep } from '../../../../helpers/utilities';
import { addTrayModelToSlot, createRecordNoQueue, getRecordDetail } from '../data/http';
import { getSlotsByClosureId, getSplicesByTrayId } from '../data/sql';
import { constructClosureSlots } from '../featurecomponents/constructors/features.component.closure.slots';
import { constructSlotTrays } from '../featurecomponents/constructors/features.component.slot.trays';
import { constructTraySplices } from '../featurecomponents/constructors/features.component.trays.splices';
import { FiberConnection } from '../types/fibre.connection';


/**
 *
 * @param trace
 * @param usedSplices
 * @param slotsChecked
 * @param connections
 * @param odinDb
 */
export async function createSpliceConnection(
    trace: any,
    usedSplices: any,
    slotsChecked: any,
    { odinDb },
) {

    let newSlotsChecked = Object.assign({}, slotsChecked)
    let newConnections: FiberConnection[] = [];

    console.log('----------------------------------')
    console.log('CREATE_SPLICE_CONNECTIONS')
    console.log('----------------------------------')
    console.log('newSlotsChecked', newSlotsChecked)
    console.log('IS_TRACE_LOOP', trace['isLoop'])

    if (trace['isLoop']) {
        // do not do anything for loop fibers
        return { newConnections, slotsChecked };
    }

    const { slot, trayModel, tray, nextSplice } = await configureTrayForConnection(trace);

    console.log('slot && tray && nextSplice', slot && tray && nextSplice)

    if (slot && tray && nextSplice) {

        // create a new  connection
        const connection = new FiberConnection();
        connection.type = 'SPLICE';
        connection.closureId = trace['closureId'];
        connection.slotId = slot['id'];
        connection.trayModelId = trayModel['id']
        connection.trayId = tray['id']
        connection.trayInId = tray['id']
        connection.trayOutId = tray['id']
        connection.traySpliceId = nextSplice['id']
        connection.traySplitterId = null;
        connection.fiberInState = trace['fiberInState'];
        connection.fiberOutState = trace['fiberOutState'];
        connection.inClosureExt = trace['inClosureExt'];
        connection.outClosureExt = trace['outClosureExt'];
        connection.cableInId = trace['cableInId'];
        connection.cableInExternalRef = trace['cableInExt'];
        connection.tubeFiberIn = trace['tubeFibreKeyIn'];
        connection.tubeInId = trace['tubeInId'];
        connection.fiberInId = trace['fiberInId'];
        connection.tubeFiberOut = trace['tubeFibreKeyOut'];
        connection.cableOutId = trace['cableOutId'];
        connection.cableOutExternalRef = trace['cableOutExt'];
        connection.tubeOutId = trace['tubeOutId'];
        connection.fiberOutId = trace['fiberOutId'];
        connection.spliceNumber = nextSplice['splice_number'];


        // const connectionExists = connections.find(elem => elem['fiberInId'] === connection['fiberInId'] &&
        // elem['fiberOutId'] === connection['fiberOutId'])

        usedSplices[tray['id']].push({
            closureId: trace['closureId'],
            nextSpliceId: nextSplice['id'],
            nextSpliceNum: nextSplice['splice_number'],
        })

        newConnections.push(connection)

    } else {
        console.log('slot && tray && nextSplice', slot, tray, nextSplice)
        process.exit(1)

    }

    console.log('RETURN!')

    return { newConnections, slotsChecked };


    /**
     *
     * @param connectionDetails
     */
    async function configureTrayForConnection(connectionDetails: any, slotNumber?: number) {

        let lastSlotNumber = newSlotsChecked[connectionDetails['closureId']] ? newSlotsChecked[connectionDetails['closureId']] : 1

        if (slotNumber) {
            lastSlotNumber = slotNumber
        }

        const slot = await getNextAvailableSlot(connectionDetails, lastSlotNumber);
        const trayModel = await addTrayModelToSlot(slot, 'fist72:standard:12', { odinDb });
        const tray = await getSlotTray(slot, connectionDetails, trayModel)
        const nextSplice = await getNextAvailableSplice(tray, trayModel)

        if (!nextSplice) {
            return await configureTrayForConnection(connectionDetails, lastSlotNumber + 1)
        }

        return { slot, trayModel, tray, nextSplice }

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

            console.log('no slot for closure', connectionDetails['closureId'])

            const closureModel = getFirstRelation(closure, 'FeatureModel')

            console.log('closureModel', closureModel)


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

            await sleep(2000)
            const slots = await getSlotsByClosureId(connectionDetails['closureId'], { odinDb })

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
     * @param slotTray
     */
    async function getNextAvailableSplice(slotTray: any, trayModel: any) {

        let nextSplice = undefined;
        let splices = undefined;
        let checkCount = 0

        // because splices are created from the queue it might take a few seconds for them to create
        // keep tyring to get them
        while (!splices) {
            // if there is no splice available in the tray
            const tray = await getSplicesByTrayId(slotTray.id, { odinDb });

            if (tray['splices']) {

                tray['splices'] = tray['splices'].sort((a, b) => Number(a.splice_number) - Number(b.splice_number))

                let traySplicesUsed = usedSplices[tray['tray_id']];

                if (!traySplicesUsed) {
                    usedSplices[tray['tray_id']] = []
                    traySplicesUsed = []
                } else {
                    traySplicesUsed = traySplicesUsed.map(elem => elem['nextSpliceId'])
                }

                splices = tray['splices'].filter(elem => !traySplicesUsed.includes(elem['id']))

                console.log('traySplicesUsed', traySplicesUsed)
                console.log('USED_SPLICES', traySplicesUsed.length)
                console.log('TOTAL_SPLICES', tray['splices'].length)
                console.log('TOTAL_SPLICES_FILTERED', splices.length)

                // sort the splices in ascending order 1 -> 12+
                const sortedSplices = splices ? splices.sort((
                    a,
                    b,
                ) => Number(a['splice_number']) - Number(b['splice_number'])) : []

                // find the first available splice
                const nextAvailableSplice = sortedSplices.find(elem => elem.connections === null)

                if (nextAvailableSplice) {

                    nextSplice = nextAvailableSplice;

                }
            }

            console.log('checkCount', checkCount)
            console.log('splices', tray['splices'])

            // create missing splices if none are created after 100 checks
            if (checkCount > 150 && !tray['splices']) {
                // delete the current slot model and add it back
                const splicesToCreate = createMissingSplices(slotTray, trayModel)
                console.log('splicesToCreate', splicesToCreate)

                // create missing splices
                await createRecordNoQueue(splicesToCreate, 'FeatureComponent', 'skipRelate=true')

                // reset the check count to wait for associations to be created
                checkCount = 0

            } else if (checkCount > 150 && tray['splices']) {

                // if the total number of splices created is less than the total number of splices expected
                // create the difference

                const existingSplitterNumbers = tray['splices'].map(elem => Number(elem['splice_number']))
                console.log('existingSplitterNumbers', existingSplitterNumbers)

                const splicesToCreate = createMissingSplices(slotTray, trayModel)
                console.log('splicesToCreate', splicesToCreate)
                // filter out already created splices
                splicesToCreate.filter(elem => !existingSplitterNumbers.includes(elem.properties['SpliceNumber']))

                // create missing splices
                await createRecordNoQueue(splicesToCreate, 'FeatureComponent', 'skipRelate=true')

                // reset the check count to wait for associations to be created
                checkCount = 0

            }


            // unblock the event loop
            await setImmediatePromise()

            checkCount++

        }

        return nextSplice;

    }

    /**
     * In some cases splices and splices might not be created when the model is added to the tray
     * this is the fall back to add any missing slots to a tray if none are created
     * @param tray
     * @param trayModel
     * @param modelSchema
     */
    function createMissingSlots(closure: any, closureModel: any) {

        let slotComponentCreates = []

        const slots = constructClosureSlots(closure.id, closureModel)
        slotComponentCreates.push(...slots);

        return slotComponentCreates
    }

    /**
     * In some cases splices and splices might not be created when the model is added to the tray
     * this is the fall back to add any missing slots to a tray if none are created
     * @param tray
     * @param trayModel
     * @param modelSchema
     */
    function createMissingSplices(tray: any, trayModel: any) {

        let trayComponentCreates = []

        const splices = constructTraySplices(tray.id, trayModel)
        trayComponentCreates.push(...splices);

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
