import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { chunkArray } from '../../../helpers/utilities';
import { createRecordNoQueue, getRecordDetail } from './data/http';
import { getAllFeaturesByPolygonId, getAllFibresByCableId } from './data/sql';
import { constructCableTubes } from './featurecomponents/constructors/features.component.cable.tubes';
import { constructTubeFibers } from './featurecomponents/constructors/features.component.tube.fibers';

dotenv.config({ path: '../../../../.env' });


export async function preSplicingTubeAndFiberCheck(l1PolygonId: number, cableType: string, { odinDb }) {

    try {

        const polygonId = l1PolygonId

        const odinCableList = await getAllFeaturesByPolygonId(polygonId, 'CABLE', 'L1PolygonId', { odinDb })
        let extCableIds = []

        if (cableType === 'Spine') {
            extCableIds = odinCableList.filter(elem => elem.type === '1').map(elem => elem['id'])
        }
        if (cableType === 'Distribution') {
            extCableIds = odinCableList.filter(elem => elem.type === '2').map(elem => elem['id'])
        }
        if (cableType === 'Access') {
            extCableIds = odinCableList.filter(elem => elem.type === '3').map(elem => elem['id'])
        }

        const chunks = chunkArray(extCableIds, 50)

        console.log('extCableIds', extCableIds)
        for(const item of chunks) {
            const parallelProcess = []
            for(const id of extCableIds) {
                console.log('id', id)
                parallelProcess.push({ func: checkCableComponents(id, { odinDb }) })
            }
            const res = await Promise.all(parallelProcess.map(elem => elem.func))
            console.log('res', res)
        }

        return 'sync complete';

    } catch (e) {
        console.error(e);
    }
}

async function checkCableComponents(cableId: string, { odinDb }) {

    // get the fibre from the loop cable that is UNUSED
    let cableFibres = await getAllFibresByCableId(cableId, { odinDb })
    // get the cable and the cable model
    const cableDetail = await getRecordDetail(cableId, 'Feature', [ '\"FeatureModel\"' ])
    const cableModel = getFirstRelation(cableDetail, 'FeatureModel')

    const fiberCount = getProperty(cableModel, 'FiberCount')

    console.log('cableFibres.length', cableFibres.length)
    console.log('fiberCount', fiberCount)
    console.log('MISSING FIBERS', cableFibres.length < Number(fiberCount))


    // TODO: Move this into a parallel processing script that runs before any splicing is done for the L2

    if (cableFibres.length < Number(fiberCount)) {
        // create missing fibers
        // get the cable and the cable model
        const cableDetail = await getRecordDetail(cableId, 'Feature', [ '\"FeatureModel\"' ])
        const cableModel = getFirstRelation(cableDetail, 'FeatureModel')

        const tubesToCreate = constructCableTubes(cableDetail.id, cableModel)

        console.log('tubesToCreate', tubesToCreate)
        // create missing splices
        const tubesCreated = await createRecordNoQueue(
            tubesToCreate,
            'FeatureComponent',
            'queue=true&skipRelate=true',
        )

        console.log('tubesCreated', tubesCreated)

        let creates = []

        for(const tube of tubesCreated) {
            const cableModel = getFirstRelation(cableDetail, 'FeatureModel')

            const fibersToCreate = createMissingFibers(tube, cableModel)
            console.log('fibersToCreate', fibersToCreate)

            // create missing splices
            const fibersCreated = await createRecordNoQueue(
                fibersToCreate,
                'FeatureComponent',
                'queue=true&skipRelate=true',
            )
            creates.push(fibersCreated)
        }

        console.log('creates', creates)
        return creates
    }
}

/**
 * In some cases fibers might not be created when the model is added to the tray
 * this is the fall back to add any missing slots to a tray if none are created
 * @param tray
 * @param trayModel
 * @param modelSchema
 */
function createMissingFibers(tube: any, trayModel: any) {

    let creates = []

    const fibers = constructTubeFibers(tube.id, trayModel)
    creates.push(...fibers);

    return creates
}

