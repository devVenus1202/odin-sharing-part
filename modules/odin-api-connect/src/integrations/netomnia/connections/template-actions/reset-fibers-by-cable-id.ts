import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { updateRecord } from '../data/http';
import { getAllFibresByCableId, getOdinRecordByExternalRef } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

/**
 * Note: when resetting cable fibers you want to reset the InCable for a closure
 * and not the outCable for a closure
 *
 *
 * @param principal
 * @param cableExtRef
 * @param odinDb
 */
export async function resetFibersByCableId(
    cableExtRef: string,
    { odinDb },
) {

    try {

        const cable = await getOdinRecordByExternalRef(Number(cableExtRef), 'CABLE', { odinDb })
        // get the fibre from the loop cable that is UNUSED
        const cableFibers = await getAllFibresByCableId(cable.id, { odinDb })
        console.log('cableFibers', cableFibers)

        for(const fiber of cableFibers) {
            // update all in fibers
            if (fiber['fiber_state'] !== null) {
                const updateOne = new DbRecordCreateUpdateDto()
                updateOne.entity = 'ProjectModule:FeatureComponent'
                updateOne.type = 'TUBE_FIBER'
                updateOne.properties = {
                    FiberState: null,
                }
                console.log('UPDATE_FIBER', fiber['fiber_id'])
                const updateRes = await updateRecord(
                    'FeatureComponent',
                    fiber['fiber_id'],
                    updateOne,
                )
                console.log('updateRes', updateRes)
            }
        }

        return {
            cableFibers,
        }

    } catch (e) {
        console.error(e);
    }


    /**
     * Query functions and Helper functions
     */

}
