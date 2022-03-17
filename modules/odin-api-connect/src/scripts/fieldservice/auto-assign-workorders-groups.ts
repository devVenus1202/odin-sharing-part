import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' })
//dotenv.config({ path: './modules/odin-api-connect/.env' }); // local debug

const apiToken = process.env.ODIN_API_TOKEN;

// Run this script every day at midnight
async function sync() {
    try {
        // command line arguments
        const allArg = process.argv.find(arg => arg.indexOf('all') > -1);
        const processAll = !!allArg;
        console.log('processAll', processAll);

        let argInterval = process.argv.find(arg => arg.indexOf('interval') > -1);
        let interval = argInterval ? argInterval.split('=')[1] : '1 days';

        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const records = await pg.query(`
    SELECT r.id
        , r.created_at as wo_created_at
        , r.updated_at as wo_updated_at
        , c1.Value as wo_type
        , c2.Value as wo_adress_ex_polygon_id
        , c2.created_at as wo_adress_ex_polygon_created_at
        , c2.updated_at as wo_adress_ex_polygon_updated_at
    FROM db_records as r
        left join db_records_columns c1 on (c1.record_id = r.id AND c1.column_name = 'Type')

        join db_records_associations ra1 on ra1.parent_record_id = r.id
            and ra1.child_schema_id='89dceeaf-3990-48e7-b914-247ac91b6e3c' -- having related address
            and ra1.deleted_at is null

        left join db_records_columns c2 on (c2.record_id = ra1.child_record_id AND c2.column_name = 'ExPolygonId')

    WHERE r.entity = 'FieldServiceModule:WorkOrder' and r.deleted_at is null
        ${processAll ? '' : `
        and (
            r.created_at > now() - '${interval}'::interval
            --or r.updated_at > now() - '${interval}'::interval
            or c2.created_at > now() - '${interval}'::interval
            or c2.updated_at > now() - '${interval}'::interval
        )
        `}
        and c2.Value is not null and c2.Value <> ''
        --and r.id = 'abd854ab-a442-42f6-a758-6ba96e412a33'
        --and r.id not in ('abd854ab-a442-42f6-a758-6ba96e412a33','f5af6a0c-657f-4726-86bd-0dca8276a0ef')
    ORDER BY
        r.created_at DESC
    --LIMIT 1
        `);

        console.log('records', records.length);

        let counter = 0;
        const failedRecords = [];

        const groupsRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
            `v1.0/rbac/groups`,
            apiToken,
        );
        const groups = groupsRes['data'];

        const groupsMapping = [
            {
                id: undefined,
                name: 'North East - MAP Group',
                polygonIds: [ '40652', '6088', '41850', '39271', '40901' ],
            },
            {
                id: undefined,
                name: 'North West - MJ Quinn',
                polygonIds: [ '40870' ],
            },
            {
                id: undefined,
                name: 'South West - Lightsource',
                polygonIds: [ '40881', '40898' ],
            },
            {
                id: undefined,
                name: 'South East - MJ Quinn',
                polygonIds: [ '40866', '40867' ],
            },
            {
                id: undefined,
                name: 'East - Lightsource',
                polygonIds: [ '40875', '72291', '40665', '40666' ],
            },
        ];

        for(const gpm of groupsMapping) {
            gpm.id = groups.find(g => g.name === gpm.name)?.id;
        }

        for(const record of records) {
            counter++;
            console.log(`processing ${counter}/${records.length} record.id`, record.id);

            try {

                const workOrderRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.FIELD_SERVICE_MODULE),
                    `v1.0/db/${SchemaModuleEntityTypeEnums.WORK_ORDER}/${record.id}`,
                    apiToken,
                );
                const workOrder = workOrderRes['data'];

                console.log('existing groups', JSON.stringify(workOrder?.groups));

                const exPolygonId = record.wo_adress_ex_polygon_id;
                console.log('exPolygonId', exPolygonId);

                const groupMap = groupsMapping.find(gpm => gpm.polygonIds.includes(exPolygonId));
                console.log('groupMap', groupMap);

                if (groupMap?.id && !workOrder?.groups?.some(g => g.id == groupMap.id)) {

                    // assign group
                    const updateDto = new DbRecordCreateUpdateDto();
                    updateDto.entity = `${SERVICE_NAME.FIELD_SERVICE_MODULE}:${SchemaModuleEntityTypeEnums.WORK_ORDER}`;

                    updateDto.groups = [ groupMap.id ];

                    const updateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.FIELD_SERVICE_MODULE),
                        `v1.0/db/${SchemaModuleEntityTypeEnums.WORK_ORDER}/${record.id}`,
                        apiToken,
                        updateDto,
                    );

                    if (updateRes['statusCode'] !== 200) {

                        console.log('Error updating workOrder.id', record.id);
                        console.log('Response:', JSON.stringify(updateRes));

                    } else {
                        console.log(
                            `Updated: ${JSON.stringify(updateDto)}. workOrder.id`,
                            record.id,
                        );
                    }
                } else {
                    console.log('skipped record.id', record.id);
                }

            } catch (e) {
                console.error(e);
                failedRecords.push(record.id);
            }
        }

        if (failedRecords.length > 0) {
            console.log('Failed records:');
            failedRecords.forEach(id => console.log(id));
        }

        return 'done';
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
