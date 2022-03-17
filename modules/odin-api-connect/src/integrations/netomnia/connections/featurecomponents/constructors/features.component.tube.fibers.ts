import { RelationTypeEnum } from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';


/**
 *
 *
 * @param tubeId
 * @param cableModel
 * @param componentSchema
 */
export function constructTubeFibers(
    tubeId: string,
    cableModel: DbRecordEntityTransform,
): DbRecordCreateUpdateDto[] {

    let creates = []

    if (cableModel) {

        console.log('cableModel', cableModel)

        const tubeCount = getProperty(cableModel, 'TubeCount')
        const fiberCount = getProperty(cableModel, 'FiberCount')

        if (Number(fiberCount) > 0) {

            // divide the fibre count by tubes
            let tubeFiberCount = Number(fiberCount) / Number(tubeCount);

            if (tubeFiberCount < 1) {
                tubeFiberCount = 1
            }

            for(let j = 0; j < Number(tubeFiberCount); j++) {
                const record = new DbRecordCreateUpdateDto()
                record.entity = 'ProjectModule:FeatureComponent'
                record.type = 'TUBE_FIBER'
                record.properties = {
                    TubeId: tubeId,
                    FiberNumber: j + 1,
                    FiberColor: j + 1,
                }
                record.associations = [
                    {
                        recordId: tubeId,
                        relationType: RelationTypeEnum.PARENT,
                    },
                ]

                creates.push(record)
            }
        }


    }

    return creates

}
