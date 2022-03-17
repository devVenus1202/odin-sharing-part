import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import axios from 'axios';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { putObjectToS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { createFiberConnection, getFromS3 } from '../data/http';

dotenv.config({ path: '../../../../../.env' });

export async function createFiberConnections(
    principal: OrganizationUserEntity,
    polygonId: string,
    closureId: string,
    closureType: string,
    { odinDb },
) {

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
            console.log('no state')
        }

        if(originalState) {
            // We want to delete the fibre connections created
            if(originalState['connections'].length > 0) {
                for(const connection of originalState['connections']) {
                    console.log('_CREATE', connection)
                    await createFiberConnection(connection)
                }

                // save that the template was applied
                await putObjectToS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}-applied`,
                    Buffer.from(JSON.stringify({
                        action: 'applied',
                        date: dayjs().format(),
                        user: principal.firstname,
                        totalConnections: originalState['connections'].length,
                    })),
                )
            }
        }

    } catch (e) {
        console.error(e);
        // log all failures in S3
    }
}


