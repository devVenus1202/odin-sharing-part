import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;
const baseUrl = process.env.K8_BASE_URL;


// ODN-1836 - Create a script that will backfill the ExternalInstallCompleteDate with the date of the “Done” work
// stageUpdatedAt
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
            `SELECT R.id
            FROM db_records R
            LEFT JOIN pipelines_stages S on (R.stage_id = S.id)
            WHERE R.entity = 'FieldServiceModule:WorkOrder'
            AND R.deleted_at IS NULL
            AND S.name IN ('Survey complete');
            `);


        for(const record of records) {

            const workOrderRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.FIELD_SERVICE_MODULE),
                `v1.0/db/WorkOrder/${record.id}?entities=["Address"]`,
                apiToken,
            );
            const workOrder = workOrderRes['data'];
            const address = getFirstRelation(workOrder, 'Address');

            if (address) {

                if (!getProperty(address, 'ExternalInstallCompleteDate')) {

                    const update = new DbRecordCreateUpdateDto()
                    update.entity = 'CrmModule:Address';
                    update.properties = {
                        ExternalInstallCompleteDate: workOrder.stageUpdatedAt,
                    }
                    console.log('update', update)

                    const updateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                        `v1.0/db/Address/${address.id}`,
                        apiToken,
                        update,
                    );

                    console.log('updateRes', updateRes);
                }
            } else {
                console.log('no address linked to work order', workOrder.title, workOrder.id);
            }
        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
