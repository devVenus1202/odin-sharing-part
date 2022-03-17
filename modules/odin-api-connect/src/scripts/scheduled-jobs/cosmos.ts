import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

async function sync() {
    let cosmosDb;

    try {

        try {

            cosmosDb = await createConnection({
                type: 'postgres',
                name: 'netomniaConnection',
                host: process.env.DB_GIS_HOSTNAME,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_GIS_USERNAME,
                password: process.env.DB_GIS_PASSWORD,
                database: process.env.DB_GIS_NAME,
                synchronize: false,
                entities: [],
            });

        } catch (e) {
            console.error(e);
            cosmosDb = await getConnection('cosmosDb');
        }

        await cosmosDb.query(`
            refresh MATERIALIZED VIEW pedro.overlaptest;
            refresh materialized view ftth.l4_view_mv;
            refresh materialized view ftth.l2_units_view_mv;
            refresh materialized view ftth.l1_units_view_mv;
            refresh materialized view ftth.l1_workorder_mv;
            refresh materialized view ftth.l2_workorder_mv;
            refresh MATERIALIZED VIEW ftth.overlapped_units;
            refresh materialized view misc.liveaddress_mv;
        `)

        const newEmail = new SendgridEmailEntity();
        newEmail.to = [ 'frank@d19n.io' ];
        newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
        newEmail.dynamicTemplateData = {
            subject: `Cosmos database sync scheduled ${dayjs().format('DD-MM-YYYY')}`,
            body: `
            refresh materialized view pedro.overlaptest;</br>
            refresh materialized view ftth.overlapped_units;</br>
            refresh materialized view ftth.l4_view_mv;</br>
            refresh materialized view ftth.l2_units_view_mv;</br>
            refresh materialized view ftth.l1_units_view_mv;</br>
            refresh materialized view ftth.l1_workorder_mv;</br>
            refresh materialized view ftth.l2_workorder_mv;</br>
            refresh materialized view misc.liveaddress_mv;</br>
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
            subject: `Error with cosmos database jobs`,
            body: JSON.stringify(e),
        };

        await HelpersNotificationsApi.sendDynamicEmail(
            newEmail,
            { authorization: 'Bearer ' + apiToken },
        );
    }
}

sync()
