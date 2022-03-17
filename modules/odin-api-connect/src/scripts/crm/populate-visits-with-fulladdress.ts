import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import { chunkArray, sleep } from '../../helpers/utilities';

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

        const allVisitsWithNoFullAddress = await pg.query(
            `SELECT
                r.id, c1.value as udprn, c2.value as umprn
            FROM db_records r
                left join db_records_columns c1 on (c1.record_id = r.id AND c1.column_name = 'UDPRN')
                left join db_records_columns c2 on (c2.record_id = r.id AND c2.column_name = 'UMPRN')
                left join db_records_columns c3 on (c3.record_id = r.id AND c3.column_name = 'FullAddress')
            WHERE r.entity = 'CrmModule:Visit' and r.deleted_at is null
                and c3.value is null
            order by r.created_at ASC
            `,
        );

        const chunked = chunkArray(allVisitsWithNoFullAddress, 50)

        for(const chunk of chunked) {

            const parallelProcess = []

            for(const record of chunk) {
                const udprn = record?.udprn;
                const umprn = record?.umprn | 0;

                if(!udprn) {
                    console.log(`error: Visit record[${record.id}].udprn === '${udprn}'!`)
                    continue;
                }

                const premiseRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                    `v1.0/premises/${udprn}/${umprn}`,
                    apiToken,
                );

                const premise = premiseRes['data'];

                console.log('premise', premise);

                const update = new DbRecordCreateUpdateDto();
                update.entity = `CrmModule:Visit`;
                update.properties = {
                    FullAddress: premise.title,
                }

                console.log('update', update)

                if(update.properties) {

                    parallelProcess.push({
                        func: httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                            `v1.0/db/Visit/${record.id}`,
                            apiToken,
                            update,
                        ),
                    })
                }
            }

            await sleep(200)
            const res = await Promise.all(parallelProcess.map(elem => elem.func))
            console.log('res', res)
        }
        return;

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
