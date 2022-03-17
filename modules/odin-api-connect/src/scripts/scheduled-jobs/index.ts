import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

async function sync() {
    try {

        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const sync1Res = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.CONNECT_MODULE),
            encodeURI('imports/addresses?interval=1 days&buildStatus=8-RFS&addressStatus=ORDER&opsStatus=1'),
            apiToken,
        );
        console.log('sync1Res', sync1Res)

        const sync2Res = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.CONNECT_MODULE),
            encodeURI(
                'imports/addresses?interval=1 days&buildStatus=6-In Progress,7-Build Done&addressStatus=PRE_ORDER&opsStatus=2'),
            apiToken,
        );
        console.log('sync2Res', sync2Res)

        const sync3Res = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.CONNECT_MODULE),
            encodeURI(
                'imports/addresses?interval=1 days&buildStatus=0-Backlog,1-Plan,2-Survey,3-Design,4-Plan Done&addressStatus=REGISTER_INTEREST&opsStatus=3'),
            apiToken,
        );
        console.log('sync3Res', sync3Res)

        const sync4Res = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.CONNECT_MODULE),
            encodeURI(
                'imports/addresses?interval=1 days&buildStatus=5-ToDo&addressStatus=REGISTER_INTEREST_PLUS&opsStatus=4'),
            apiToken,
        );
        console.log('sync4Res', sync4Res)

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Address import scheduled ${dayjs().format('DD-MM-YYYY')}`,
            body: `
                Polygon Status Updates: </br></br>
                Order: ${sync1Res['data']['totalPolygons']}, </br>
                PreOrder:  ${sync2Res['data']['totalPolygons']}, </br>
                Register Interest:  ${sync3Res['data']['totalPolygons']}, </br>
                Register Interest Plus:  ${sync4Res['data']['totalPolygons']},
            `,
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );

    } catch (e) {

        console.error(e)

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Error with scheduled jobs`,
            body: JSON.stringify(e),
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );
    }
}

sync()
