import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { getFromS3, getOdinRecordByExternalRef, updateRecord } from '../data/http';

dotenv.config({ path: '../../../../../.env' });

export async function markFibresUsedConnections(
    polygonId: string,
    closureId: string,
    closureType: string,
    { odinDb },
) {

    try {

        const dbRecord = await getOdinRecordByExternalRef(Number(closureId), 'CLOSURE', { odinDb });

        const templateUrl = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}`,
        )
        const response = await axios.get(templateUrl)
        const originalState = response['data']

        for(const connection of originalState['connections']) {

            // update the out fibre
            const updateOne = new DbRecordCreateUpdateDto()
            updateOne.entity = 'ProjectModule:FeatureComponent'
            updateOne.type = 'FIBRE'
            updateOne.properties = {
                FiberState: 'USED',
            }

            const updateResOne = await updateRecord(
                'FeatureComponent',
                connection['fiberOutId'],
                updateOne,
            )

            // update the out fibre
            const updateTwo = new DbRecordCreateUpdateDto()
            updateTwo.entity = 'ProjectModule:FeatureComponent'
            updateTwo.type = 'FIBRE'
            updateTwo.properties = {
                FiberState: 'USED',
            }

            const updateResTwo = await updateRecord(
                'FeatureComponent',
                connection['fiberInId'],
                updateTwo,
            )
        }


    } catch (e) {
        console.error(e);
    }
}


