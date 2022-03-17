/*
 *  This will prompt for polygon id and return all premises that are inside the polygon.
 *  Udprns are encoded with Base16 and exported in CSV.
 *
 *  Decode UDPRN with: parseInt(encoded_udprn, 16)
 */

import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });
const apiToken = process.env.ODIN_API_TOKEN;

const bigDataCloudApi = process.env.BIGDATACLOUD_API_TOKEN;

export async function execute() {

    const httpClient = new BaseHttpClient();
    let conversionErrors = []

    const pg = await createConnection({
        type: 'postgres',
        host: process.env.DB_HOSTNAME,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const allContacts = await pg.query(
        `SELECT db_records.id FROM db_records
                WHERE entity = 'CrmModule:Contact'
                AND created_at > '2021-08-02'::date
                AND db_records.deleted_at IS NULL`,
    );

    try {

        for(const record of allContacts) {

            const contactRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                `v1.0/db/Contact/${record.id}`,
                apiToken,
            );

            const contact = contactRes['data'];

            console.log('bigDataCloudApi', bigDataCloudApi)

            // Convert phone numbers to E164
            let isPhoneValid: boolean;
            try {
                const phoneRes = await axios.get(`https://api.bigdatacloud.net/data/phone-number-validate?number=${getProperty(
                    contact,
                    'Phone',
                )}&countryCode=gb&localityLanguage=en&key=${bigDataCloudApi}`);

                isPhoneValid = phoneRes.data.isValid;

                if (phoneRes.data.isValid) {
                    contact.properties.Phone = phoneRes.data.e164Format
                }
            } catch (e) {
                console.error(e)
                isPhoneValid = true
            }
            // update contact phone number in Odin

            if (getProperty(contact, 'EmailAddress')) {
                const zendeskSearchRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                    `v2.0/zendesk/users/search?external_id=${contact.id}`,
                    apiToken,
                );
                const zendeskContact = zendeskSearchRes['data']

                console.log('email', getProperty(contact, 'EmailAddress'))

                const matched = zendeskContact.find(elem => elem.email ? elem.email.toLowerCase() === getProperty(
                    contact,
                    'EmailAddress',
                ).toLowerCase() : false)

                let address = matched ? matched.user_fields.address : null;

                if (contact.links && contact.links.length > 0) {
                    const addressLink = contact.links.find(elem => elem.entity === 'CrmModule:Address')
                    if (addressLink) {
                        console.log('addressLink', addressLink.title)
                        address = addressLink.title
                    }
                }

                console.log('matched', matched)
                const body = {
                    user: {
                        external_id: contact.id,
                        email: getProperty(contact, 'EmailAddress'),
                        phone: isPhoneValid ? getProperty(contact, 'Phone') : matched?.phone,
                        name: `${getProperty(contact, 'FirstName')} ${getProperty(contact, 'LastName')}`,
                        role: 'end-user',
                        verified: true,
                        user_fields: {
                            address,
                        },
                    },
                }

                console.log('body', body)
                const zendeskCreateRes = await httpClient.postRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                    `v2.0/zendesk/users`,
                    apiToken,
                    body,
                );

                console.log('zendeskCreateRes', zendeskCreateRes)


            } else {
                console.log('contact missing email address', contact.id, contact.title)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

execute().then(r => {
});

