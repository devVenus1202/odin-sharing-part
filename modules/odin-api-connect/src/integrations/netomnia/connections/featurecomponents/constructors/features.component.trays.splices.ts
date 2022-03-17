import { RelationTypeEnum } from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';


/**
 *
 *
 * @param trayId
 * @param trayModel
 */
export function constructTraySplices(
    trayId: string,
    trayModel: DbRecordEntityTransform,
): DbRecordCreateUpdateDto[] {

    let creates = []

    if(trayModel) {

        const spliceCount = getProperty(trayModel, 'SpliceCount')

        if(spliceCount) {
            for(let i = 0; i < Number(spliceCount); i++) {

                const record = new DbRecordCreateUpdateDto()
                record.entity = 'ProjectModule:FeatureComponent'
                record.type = 'TRAY_SPLICE'
                record.properties = {
                    TrayId: trayId,
                    SpliceNumber: i + 1,
                }
                record.associations = [
                    {
                        recordId: trayId,
                        relationType: RelationTypeEnum.PARENT,
                    },
                ]

                creates.push(record)

            }
        }

    }

    return creates

}
