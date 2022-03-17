import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { chunkArray } from '../../../../helpers/utilities';
import { createAssociation, getRecordDetail } from '../data/http';
import { getIntegrationParamsByFeatureType } from '../data/sql';

dotenv.config({ path: '../../../../.env' });

export async function addModelsToFeatures(
    principal: OrganizationUserEntity,
    exPolygonId: string,
    l1PolygonId: string,
    l2PolygonId: string,
    featureType: string,
    { odinDb },
) {
    try {

        const { modelProperty } = getIntegrationParamsByFeatureType(featureType)

        const models = await odinDb.query(`
                SELECT r.id, r.type, c.value
                FROM db_records r
                LEFT JOIN db_records_columns c ON (c.record_id = r.id)
                WHERE r.entity = 'ProjectModule:FeatureModel'
                AND c.column_name = 'ExternalRef'
                AND r.deleted_at IS NULL`);

        let featureIds = []
        if (exPolygonId) {
            // only add models to features inside of a particular polygon
            featureIds = await odinDb.query(`
                SELECT db_records.id
                FROM db_records
                LEFT JOIN db_records_columns as c2 on (c2.record_id = db_records.id AND c2.column_name = 'ExPolygonId')
                WHERE db_records.type = '${featureType}'
                AND db_records.entity = 'ProjectModule:Feature'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                AND c2.value = '${exPolygonId}'
                ORDER BY record_number DESC
            `);
        } else if (l2PolygonId) {
            // only add models to features inside of a particular polygon
            featureIds = await odinDb.query(`
                SELECT db_records.id
                FROM db_records
                LEFT JOIN  db_records_columns c2 on (c2.record_id = db_records.id)
                WHERE db_records.type = '${featureType}'
                AND db_records.entity = 'ProjectModule:Feature'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                AND c2.column_name = 'L2PolygonId'
                AND to_tsvector('english', c2.value) @@ to_tsquery('${l2PolygonId}')
                ORDER BY record_number DESC
            `);

        } else if (l1PolygonId) {

            featureIds = await odinDb.query(`
                SELECT db_records.id
                FROM db_records
                LEFT JOIN  db_records_columns c2 on (c2.record_id = db_records.id)
                WHERE db_records.type = '${featureType}'
                AND db_records.entity = 'ProjectModule:Feature'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                AND c2.column_name = 'L1PolygonId'
                AND to_tsvector('english', c2.value) @@ to_tsquery('${l1PolygonId}')
                ORDER BY record_number DESC
            `);

        } else if (!exPolygonId && !l2PolygonId && !l1PolygonId) {

            featureIds = await odinDb.query(`
                SELECT id
                FROM db_records
                WHERE type = '${featureType}'
                AND entity = 'ProjectModule:Feature'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                ORDER BY record_number DESC
            `);

        } else {
            featureIds = await odinDb.query(`
                SELECT db_records.id
                FROM db_records
                LEFT JOIN db_records_columns c2 on (c2.record_id = db_records.id)
                WHERE db_records.type = '${featureType}'
                AND db_records.entity = 'ProjectModule:Feature'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                ORDER BY record_number DESC
            `);
        }

        console.log('featureIds', featureIds.length);

        const chunkedIds = chunkArray(featureIds, 50);

        const parallelProcess = []

        for(const chunk of chunkedIds) {
            console.log('chunk', chunk);
            for(const { id } of chunk) {
                parallelProcess.push({ func: addModelsToFeature(id, { odinDb }) })
            }

            await Promise.all(parallelProcess.map(elem => elem.func))
        }

        /**
         *
         * @param id
         * @param odinDb
         */
        async function addModelsToFeature(id: any, { odinDb }) {

            const record = await getRecordDetail(id, 'Feature', [])

            console.log('record', record);

            const recordModel = getProperty(record, modelProperty);

            console.log('recordModel', recordModel);

            if (recordModel) {

                const model = models.find(elem => elem.type === record.type && elem.value === recordModel)

                console.log('model', model);

                if (model) {

                    const createRel = new DbRecordAssociationCreateUpdateDto()
                    createRel.recordId = model.id;

                    const create = await createAssociation(id, 'Feature', [ createRel ])

                    console.log('create', create)

                } else {
                    console.log('NO MODEL IN ODIN')
                }
            }
        }

    } catch (e) {
        console.error(e);
    }
}
