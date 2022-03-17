import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { updateRecord } from '../data/http';
import { getAllFibresByCableId } from '../data/sql';

dotenv.config({ path: '../../../../../.env' });

export async function resetFibersByL2PolygonId(
    polygonId: string,
    { odinDb },
) {

    try {

        // We only want to reset Access and Feed cables in bulk for a single L2 polygon
        const cables = await odinDb.query(`
        select
            R.id, C_L2PolygonId.value, C_CableType.value
        from db_records R
        left join db_records_columns C_L2PolygonId on (C_L2PolygonId.record_id = R.id and C_L2PolygonId.column_name = 'L2PolygonId')
        left join db_records_columns C_CableType on (C_CableType.record_id = R.id and C_CableType.column_name = 'CableType')
        where R.entity = 'ProjectModule:Feature'
        and R.type = 'CABLE'
        and to_tsvector('english', C_L2PolygonId.value) @@ to_tsquery('${polygonId}')
        and C_CableType.value IN ('3', '4')
        and R.deleted_at IS NULL
        `)

        console.log('cables', cables.length)
        console.log('cables', cables)

        for(const cable of cables) {
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
        }

    } catch (e) {
        console.error(e);
    }
}


