import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { chunkArray } from '../../../../helpers/utilities';
import { getFromS3 } from '../data/http';
import { createSingleCableConnection } from './create-single-cable-connection';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

export async function createManyCableConnections(
    principal: OrganizationUserEntity,
    l0ClosureId: string,
    l1PolygonId: string,
    { odinDb, cosmosDb },
) {
    try {

        console.log(l0ClosureId, l1PolygonId)
        const tracesUrl = await getFromS3(
            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
            `auto-connect/l0-${l0ClosureId}/closure-cable-mappings-gis-l1-polygon-${l1PolygonId}`,
        )
        const response = await axios.get(tracesUrl)
        let connectionMappings = response['data'];

        console.log('connectionMappings', connectionMappings)

        const processAll = []

        const batch = chunkArray(connectionMappings, 50);
        for(const chunk of batch) {
            for(const connection of chunk) {
                console.log('connection', connection)
                processAll.push({ func: createSingleCableConnection(connection, { odinDb }) })
            }

            await Promise.all(processAll.map(elem => elem.func))
        }

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ principal.email, 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Cable connections created for ${l0ClosureId} and L1 polygon ${l1PolygonId}`,
            body: `Total connections to be created ${connectionMappings.length}`,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );

    } catch (e) {
        console.error(e)
    }
}
