import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty, getPropertyFromRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;
const baseUrl = process.env.K8_BASE_URL;

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
            `SELECT db_records.id
            FROM db_records
            RIGHT JOIN schemas as schema ON (db_records.schema_id = schema.id)
            WHERE schema.entity_name = 'WorkOrder' AND db_records.deleted_at IS NULL;`);


        for(const record of records) {

            const workOrderRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.FIELD_SERVICE_MODULE),
                `v1.0/db/WorkOrder/${record.id}?entities=["ServiceAppointment", "Address"]`,
                apiToken,
            );
            const workOrder = workOrderRes['data'];
            const serviceAppointment = workOrder['ServiceAppointment'].dbRecords;
            const address = workOrder['Address'].dbRecords;

            if(serviceAppointment && address) {

                if(!getProperty(serviceAppointment[0], 'ExPolygonId') || getProperty(
                    serviceAppointment[0],
                    'ExPolygonId',
                ) === '0') {

                    const update = new DbRecordCreateUpdateDto()
                    update.entity = 'FieldServiceModule:ServiceAppointment';
                    update.properties = {
                        ExPolygonId: getPropertyFromRelation(workOrder, 'Address', 'ExPolygonId'),
                    }

                    const updateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.FIELD_SERVICE_MODULE),
                        `v1.0/db/ServiceAppointment/${serviceAppointment[0].id}?queue=true`,
                        apiToken,
                        update,
                    );

                    console.log('updateRes', updateRes);
                }
            } else {
                console.log('no service appointment linked to work order', workOrder.title, workOrder.id);
            }
        }

        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
