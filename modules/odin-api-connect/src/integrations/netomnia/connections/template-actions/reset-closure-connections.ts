import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteObjectFromS3 } from '../../../../common/awsS3/buckets/buckets.service';
import { deleteRecord, getFromS3, updateRecord } from '../data/http';
import {
    getAllFiberConnectionsByFibreId,
    getAllFibresByCableId,
    getInCableByClosureId,
    getOdinRecordByExternalRef,
} from '../data/sql';

dotenv.config({ path: '../../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

export async function resetConnections(
    principal: OrganizationUserEntity,
    polygonId: string,
    closureId: string,
    closureType: string,
    { odinDb },
) {

    try {

        let traceState;
        let originalState;

        try {

            const tracesUrl = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-traces-${closureId}`,
            )
            const traceTemplateRes = await axios.get(tracesUrl)
            traceState = traceTemplateRes['data']


        } catch (e) {
            console.log('no trace state', e)
        }

        try {

            const templateUrl = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}`,
            )
            const response = await axios.get(templateUrl)
            originalState = response['data']


        } catch (e) {
            console.log('no connection template', e)
        }

        console.log('originalState', originalState)

        if (originalState) {

            const usedFibers = originalState['connections'] ? [
                ...traceState['fiberTraces'],
                ...originalState['connections'],
                ...originalState['fiberTraces'],
            ] : originalState['fiberTraces'];

            // We want to delete the fiber connections created
            if (usedFibers.length > 0) {
                for(const connection of usedFibers) {
                    // if the connection is split we do not want to change the downstream fiber state
                    if (connection['type'] !== 'SPLIT' && closureType !== 'L0') {
                        // update the out fiber
                        const updateOne = new DbRecordCreateUpdateDto()
                        updateOne.entity = 'ProjectModule:FeatureComponent'
                        updateOne.type = 'TUBE_FIBER'
                        updateOne.properties = {
                            FiberState: null,
                        }

                        console.log('UPDATE_OUT_FIBER', connection['fiberOutId'])

                        // When we have splitters there is a chance that the out fiber is
                        // undefined because we create 1:4 and use only 2 of the 4
                        if (connection['fiberOutId']) {
                            const updateResOne = await updateRecord(
                                'FeatureComponent',
                                connection['fiberOutId'],
                                updateOne,
                            )
                        }
                    }

                    // update all in fibers
                    const updateTwo = new DbRecordCreateUpdateDto()
                    updateTwo.entity = 'ProjectModule:FeatureComponent'
                    updateTwo.type = 'TUBE_FIBER'
                    updateTwo.properties = {
                        FiberState: null,
                    }

                    console.log('UPDATE_IN_FIBER', connection['fiberInId'])

                    if (connection['fiberInId']) {
                        const updateResTwo = await updateRecord(
                            'FeatureComponent',
                            connection['fiberInId'],
                            updateTwo,
                        )
                    }
                }

                // Delete connections if they are not LOOP connections
                if (originalState['connections']) {
                    for(const connection of originalState['connections']) {

                        if (connection['fiberInId']) {
                            // get the closure fiber connections using the upstream connection outFibre
                            const fiberConnections = await getAllFiberConnectionsByFibreId(
                                connection['fiberInId'],
                                { odinDb },
                            )

                            console.log('fiberConnections', fiberConnections)

                            for(const fiberConnection of fiberConnections) {

                                console.log('fiberConnectionType', fiberConnection['type'])
                                if (fiberConnection['type'] !== 'LOOP') {

                                    // delete the created fiberConnection
                                    console.log('DELETE', fiberConnection['connection_id'])
                                    await deleteRecord('FeatureConnection', fiberConnection['connection_id'])

                                }
                            }
                        }
                    }
                }
            }
        }

        // In some cases the L4 closure fiber is marked used and no traces will complete
        // roll back should mark those fibers unused any time the reset is processed
        if (closureType === 'L4') {
            console.log('RESET_L4_IN_FIBER')
            // reset the in fibers for the closure
            // Step 2: get the total number of connections needed for Access cables
            const closure = await getOdinRecordByExternalRef(Number(closureId), 'CLOSURE', { odinDb })

            console.log('closure', closure)

            const inCables = await getInCableByClosureId(closure['id'], { odinDb })

            console.log('inCables', inCables)

            const closureOutCableIds = inCables.map(elem => elem['cable_id']);
            console.log('closureOutCableIds', closureOutCableIds)

            let usedFibers = []
            for(const cableId of closureOutCableIds) {
                const cableFibers = await getAllFibresByCableId(cableId, { odinDb })
                console.log('cableFibers', cableFibers)
                usedFibers.push(...cableFibers.filter(elem => elem['fiber_state'] !== null))
                console.log('usedFibers', usedFibers)
            }

            if (usedFibers && usedFibers.length > 0) {
                for(const fiber of usedFibers) {
                    // update all in fibers
                    const updateTwo = new DbRecordCreateUpdateDto()
                    updateTwo.entity = 'ProjectModule:FeatureComponent'
                    updateTwo.type = 'TUBE_FIBER'
                    updateTwo.properties = {
                        FiberState: null,
                    }

                    console.log('UPDATE_IN_FIBER', fiber['fiber_id'])

                    const updateResTwo = await updateRecord(
                        'FeatureComponent',
                        fiber['fiber_id'],
                        updateTwo,
                    )
                }
            }
        }

        // save that the template was applied
        await deleteObjectFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}`,
        )
        await deleteObjectFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureId}-applied`,
        )


        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Connections reset for polygon ${polygonId}`,
            body: 'Connections successfully rolled back.',
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );


    } catch (e) {
        console.error(e);
    }
}


