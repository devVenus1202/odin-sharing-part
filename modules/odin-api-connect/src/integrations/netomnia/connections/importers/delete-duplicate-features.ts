import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteRecord } from '../data/http';
import { getOdinRecordByExternalRef } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

export async function deleteDuplicateFeatures(
    principal: OrganizationUserEntity,
    l1PolygonId: string,
    featureType: string,
    { odinDb, cosmosDb },
    startDate?: string,
    endDate?: string,
) {

    try {

        // cleanup any duplicates created during the import process
        const duplicates = await odinDb.query(`
            select c.value as ext_ref, count(*)
            from db_records_columns c
            left join db_records r on (c.record_id = r.id)
            where r.type = '${featureType}'
            and r.entity = 'ProjectModule:Feature'
            and c.column_name = 'ExternalRef'
            and r.deleted_at IS NULL
            group by c.value
            HAVING count(*) > 1
        `)

        console.log('featureType', featureType)
        console.log('duplicates', duplicates)

        const batchDeletes = [];
        for(const duplicate of duplicates) {

            const dbRecord = await getOdinRecordByExternalRef(
                Number(duplicate['ext_ref']),
                featureType,
                { odinDb },
            );
            console.log('dbRecord', dbRecord)

            // check for existing cable connections, do not delete closures with cable connections
            // we will want to update these records with an alert
            let odinClosureConnections = await odinDb.query(
                `select c.value as type
                from db_records
                left join db_records_columns as c ON (c.record_id = db_records.id and c.column_name = 'ClosureType')
                left join db_records_columns as c2 ON (c2.record_id = db_records.id and c2.column_name = 'L1PolygonId')
                where entity = 'ProjectModule:Feature'
                and db_records.type IN ('${featureType}')
                and db_records.deleted_at is null
                and exists (
                    select * from db_records_associations a
                    where a.child_entity ='ProjectModule:CableConnection'
                    and a.parent_record_id = db_records.id and a.deleted_at IS NULL
                    )
                and db_records.id = '${dbRecord.id}'`)


            console.log('odinClosureConnections', odinClosureConnections)

            if (odinClosureConnections && odinClosureConnections.length < 1) {
                batchDeletes.push({ func: deleteRecord('Feature', dbRecord.id) })
            }
        }

        if (batchDeletes.length > 0) {
            const deleteRes = await Promise.all(batchDeletes.map(elem => elem.func))
            console.log('deleteRes', deleteRes)
        }

        try {
            // Email user when all data is in the queue
            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `Feature ${featureType} deletes`,
                body: `deleted duplicates`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
                false,
            );

        } catch (e) {
            console.error(e)
        }

        return 'features deleted'

    } catch (e) {
        console.error(e);
    }
}
