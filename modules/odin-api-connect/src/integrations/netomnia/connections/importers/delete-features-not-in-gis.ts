import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { chunkArray } from '../../../../helpers/utilities';
import { deleteRecord } from '../data/http';
import { getIntegrationParamsByFeatureType } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE } = SchemaModuleEntityTypeEnums;

export async function deleteFeaturesNotInOdin(
    principal: OrganizationUserEntity,
    l1PolygonId: string,
    featureType: string,
    { odinDb, cosmosDb },
    startDate?: string,
    endDate?: string,
) {

    try {

        console.log('l1PolygonId', l1PolygonId)
        console.log('featureType', featureType)
        console.log('startDate', startDate)
        console.log('endDate', endDate)

        const { tableName } = getIntegrationParamsByFeatureType(featureType)

        const features = await cosmosDb.query(`
            SELECT ${tableName}.id FROM ${tableName}
            `);

        const featureIds = features.map(elem => elem.id)

        const odinFeatures = await odinDb.query(`
            select r.id, c1.value
            from db_records r
            left join db_records_columns c on (c.record_id = r.id and c.column_name = 'L1PolygonId')
            left join db_records_columns c1 on (c1.record_id = r.id and c1.column_name = 'ExternalRef')
            where r.entity = 'ProjectModule:Feature'
            and r.type IN ('${featureType}')
            and r.deleted_at is null
        `);

        let ids = odinFeatures.map(elem => ({ id: elem.id, extRef: Number(elem.value) }));

        if (ids.length < 1) {
            ids = [ { id: '000099' } ]
        }

        console.log('odinIds', ids.length)
        console.log('gisIds', featureIds.length)

        // find data in odin that is not in gis
        const deletes = ids.filter(elem => !featureIds.includes(elem.extRef))
        console.log('IN_ODIN_NOT_GIS', deletes)

        const chunks = chunkArray(deletes, 25)

        for(const chunk of chunks) {

            const parallelProcess = []

            for(const { id } of chunk) {
                if (id !== '000099') {
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
                and db_records.id = '${id}'`)

                    if (id) {
                        parallelProcess.push({ func: deleteRecord('Feature', id) })
                    }
                }
            }

            await Promise.all(parallelProcess.map(elem => elem.func))
        }

        return 'features deleted'

    } catch (e) {
        console.error(e);
    }
}
