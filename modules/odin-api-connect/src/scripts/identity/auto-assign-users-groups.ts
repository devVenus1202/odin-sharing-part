import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });
//dotenv.config({ path: './modules/odin-api-connect/.env' }); // local debug

const apiToken = process.env.ODIN_API_TOKEN;

// Run this script every day at midnight
async function sync() {
    try {
        // command line arguments
        const allArg = process.argv.find(arg => arg.indexOf('all') > -1);
        const processAll = !!allArg;
        console.log('processAll', processAll);

        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const users = await pg.query(`
            select * from organizations_users where email LIKE '%netomnia.com%'
        `);

        console.log('users', users.length);

        let counter = 0;
        const failedRecords = [];

        const groupsRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
            `v1.0/rbac/groups`,
            apiToken,
        );
        const groups = groupsRes['data'];

        const group = groups.find(elem => elem.name === 'Full Access')

        console.log('group', group)

        for(const record of users) {
            counter++;
            console.log(`processing ${counter}/${users.length} record.id`, record.id);

            try {
                // assign group to user
                const groupAssignRes = await httpClient.postRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                    `v1.0/users/${record.id}/groups`,
                    apiToken,
                    {
                        groupIds: [ group.id ],
                    },
                );

                console.log('groupAssignRes', groupAssignRes)

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
