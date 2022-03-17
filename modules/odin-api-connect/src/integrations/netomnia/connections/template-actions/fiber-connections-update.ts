import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { getFromS3, updateRecord } from '../data/http';

dotenv.config({ path: '../../../../../.env' });

export async function updateFiberConnections(polygonId: string, closureId: string, closureType: string, { odinDb }) {

    try {

        let originalState;
        try {

            const templateUrl = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}`,
            )
            const response = await axios.get(templateUrl)
            originalState = response['data']

        } catch (e) {
            console.log(e)
            console.log('no state')
        }

        if (originalState) {

            const fibersUsed = [ ...originalState['fiberTraces'], ...originalState['connections'] ]
            // We want to delete the fibre connections created
            if (fibersUsed.length > 0) {
                // add connections to be marked as USED
                for(const connection of fibersUsed) {

                    // update the out fibre
                    const updateOne = new DbRecordCreateUpdateDto()
                    updateOne.entity = 'ProjectModule:FeatureComponent'
                    updateOne.type = 'FIBRE'
                    updateOne.properties = {
                        FiberState: 'USED',
                    }
                    console.log('fiberInId: ', connection['fiberInId'])

                    const updateResOne = await updateRecord(
                        'FeatureComponent',
                        connection['fiberInId'],
                        updateOne,
                    )
                    console.log('updateResOne', updateResOne)


                    // update the out fibre
                    const updateTwo = new DbRecordCreateUpdateDto()
                    updateTwo.entity = 'ProjectModule:FeatureComponent'
                    updateTwo.type = 'FIBRE'
                    updateTwo.properties = {
                        FiberState: 'USED',
                    }

                    console.log('fiberOutId: ', connection['fiberOutId'])

                    const updateResTwo = await updateRecord(
                        'FeatureComponent',
                        connection['fiberOutId'],
                        updateTwo,
                    )
                    console.log('updateResTwo', updateResTwo)

                }
            }
        }

    } catch (e) {
        console.error(e);
        // log all failures in S3
    }
}


