import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { LogsUserActivityEntity } from '@d19n/models/dist/logs/user-activity/logs.user.activity.entity';
import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { ElasticSearchClient } from '../../common/ElasticsearchClient';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

let argWeek = process.argv.find(arg => arg.indexOf('week') > -1);
let week = argWeek ? argWeek.split('=')[1] : 1;

async function sync() {

    try {

        const httpClient = new BaseHttpClient();

        const esClient: Client = new Client({ node: process.env.ELASTICSEARCH_HOST });
        const elasticSearchClient = new ElasticSearchClient(esClient);

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: [ LogsUserActivityEntity ],
        });

        const queryRunner = await pg.createQueryRunner();
        await queryRunner.connect();
        const stream = await queryRunner.stream('' +
            `SELECT *
            FROM logs.user_activity
            WHERE EXTRACT(WEEK FROM created_at) = ${week};
            `,
        )

        for await (let record of stream) {

            const recordsToIndex = []

            const transformed = new LogsUserActivityEntity();
            transformed.recordId = record.record_id;
            transformed.userId = record.user_id;
            transformed.organizationId = record.organization_id;
            transformed.type = record.type;
            transformed.revision = record.revision;
            transformed.userName = record.user_name;
            transformed.ipAddress = record.ip_address;
            transformed.userAgent = record.user_agent;
            transformed.createdAt = record.created_at;
            transformed.updatedAt = record.updated_at;

            console.log('transformed', transformed);

            const idFields = [
                'stageId',
                'childRecordId', 'parentRecordId',
            ]
            const associations = []
            for(let i = 0; i < idFields.length; i++) {
                const field = idFields[i]
                if (transformed.revision[field]) {
                    let record
                    if (field === 'stageId') {

                        // fetch the stage
                        const stageRes = await httpClient.getRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
                            `v1.0/stages/${transformed.revision[field]}`,
                            apiToken,
                        );

                        record = stageRes['data'];

                    } else {

                        try {
                            // get the record by id
                            const recordRes = await httpClient.getRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.SCHEMA_MODULE),
                                `v1.0/db/Any/${transformed.revision[field]}`,
                                apiToken,
                            );

                            record = recordRes['data'];
                        } catch (e) {
                            // records might not exist anymore
                        }
                    }

                    if (record) {
                        associations.push(record)
                    }
                }
            }

            const evenWithAssociations = {
                ...transformed,
                associations,
            }

            console.log('evenWithAssociations', evenWithAssociations);

            recordsToIndex.push({ 'index': { '_index': 'logs_user_activity', _id: record.id } });
            recordsToIndex.push(evenWithAssociations);

            console.log('recordsToIndex', recordsToIndex)

            await elasticSearchClient.bulk(recordsToIndex);
        }

        queryRunner.release()

    } catch (e) {
        console.error(e)
    }
}

sync();
