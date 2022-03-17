import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import dayjs from 'dayjs';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import moment = require('moment');

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

// Run this script every every day at midnight
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

        const records = await pg.query(
            `SELECT orders.id, orders.title
            FROM db_records as orders
            LEFT JOIN db_records_columns c on (c.record_id = orders.id and c.column_name = 'ActiveDate')
            LEFT JOIN pipelines_stages ON (pipelines_stages.id = orders.stage_id)
            WHERE entity = 'OrderModule:Order'
            AND pipelines_stages.key = 'OrderStageActive'
            AND c.value IS NULL
            AND orders.deleted_at IS NULL
           `);

        console.log('records', records.length);

        const modified = [];

        for(const record of records) {

            const orderRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                `v1.0/db/Order/${record.id}`,
                apiToken,
            );
            const order = orderRes['data'];


            if (!getProperty(order, 'BillingStartDate')) {


                const userEvents = await pg.query(`SELECT * from logs.user_activity where type = 'DB_RECORD_STAGE_UPDATED' AND record_id = '${record.id}';`);
                const activeStageEvent = userEvents.find(elem => elem.revision['stageId'] === order.stage.id);

                console.log('activeStageEvent', activeStageEvent);

                const updateDto = new DbRecordCreateUpdateDto();
                updateDto.entity = 'OrderModule:Order';
                updateDto.properties = {
                    ActiveDate: activeStageEvent ? moment(activeStageEvent.created_at).format('YYYY-MM-DD') : order.stageUpdatedAt,
                };

                console.log('updateDto', updateDto)

                const updateRes = await httpClient.putRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                    `v1.0/db/OrderModule/${order.id}`,
                    apiToken,
                    updateDto,
                );

                const billingStartDate = dayjs().format('YYYY-MM-DD')

                const body = {
                    BillingStartDate: getProperty(order, 'BillingStartDate') || billingStartDate,
                    ContractStartDate: getProperty(order, 'ContractStartDate') || getProperty(
                        order,
                        'BillingStartDate',
                    ) || billingStartDate,
                }

                console.log('body', body)

                const processRes = await httpClient.postRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                    `v1.0/orders/${order.id}/billing`,
                    apiToken,
                    body,
                );
                console.log('processRes', processRes);

                console.log('updateRes', updateRes);

                modified.push(`${record.id} ${record.title}`)

            }
        }

        modified.map(val => {
            console.log(val)
        })

        return 'done';
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
