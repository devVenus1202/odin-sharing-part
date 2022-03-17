import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { getFirstRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteAssociation, getRecordDetail } from '../connections/data/http';

dotenv.config({ path: '../../../../.env' });

export async function removeModelsFromFeatures(principal: OrganizationUserEntity, featureType: string, { odinDb }) {

    try {

        if (featureType === 'CABLE') {

            const data1 = await odinDb.query(`
            SELECT distinct(db_records.id) as cable_id
            FROM db_records
            LEFT JOIN db_records_columns c on (db_records.id = c.record_id and c.column_name = 'CableModel')
            WHERE db_records.type = 'CABLE'
            AND db_records.entity = 'ProjectModule:Feature'
            AND NOT EXISTS (
                SELECT * from db_records_associations a
                WHERE a.child_entity = 'ProjectModule:FeatureComponent'
                AND a.parent_record_id = db_records.id
                AND a.deleted_at IS NULL
            )
            AND EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
            AND db_records.deleted_at IS NULL
            AND c.value NOT IN ('10', '4')
            `)

            const data = await odinDb.query(`
            select distinct(c.record_id) as cable_id
            from db_records_columns c
            left join db_records_associations a on (c.record_id = a.parent_record_id)
            where a.parent_entity = 'ProjectModule:Feature'
            and c.column_name = 'CableModel'
            and exists (
               SELECT id
                FROM db_records
                WHERE db_records.type = 'CABLE_TUBE'
                AND db_records.entity = 'ProjectModule:FeatureComponent'
                AND NOT EXISTS (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureComponent'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                AND db_records.deleted_at IS NULL
                AND a.child_record_id = db_records.id
           )
           and c.value NOT IN ('10', '4')
           and c.deleted_at is null
           and a.deleted_at is null
        `)

            console.log('_CABLES_MISSING_COMPONENTS', data1)
            console.log('_TUBES_MISSING_COMPONENTS', data)

            for(const item of [ ...data, ...data1 ]) {

                const cable = await getRecordDetail(item['cable_id'], 'Feature', [ '\"FeatureModel\"' ])
                console.log('cable', cable)
                const modelRelation = getFirstRelation(cable, 'FeatureModel')
                console.log('modelRelation', modelRelation)

                const fiberConnections = cable.links.find(elem => elem['entity'] === 'ProjectModule:FiberConnection')
                console.log('fiberConnections', fiberConnections)

                if (modelRelation && !fiberConnections) {
                    const res = await deleteAssociation(modelRelation.dbRecordAssociation.id)
                    console.log('res', res)
                }

            }

        }


        if (featureType === 'CLOSURE_PORT') {

            const data = await odinDb.query(`
                select distinct(db_records.id) as port_id
                from db_records
                where db_records.entity = 'ProjectModule:FeatureComponent'
                and db_records.type = 'CLOSURE_PORT'
                and not exists (
                    select * from db_records_associations a
                    where a.child_entity = 'ProjectModule:FeatureComponent'
                    and a.parent_record_id = db_records.id
                    and a.deleted_at IS NULL
                )
                and exists (
                    SELECT * from db_records_associations a
                    WHERE a.child_entity = 'ProjectModule:FeatureModel'
                    AND a.parent_record_id = db_records.id
                    AND a.deleted_at IS NULL
                )
                and db_records.deleted_at IS NULL
            `)
            console.log('_CLOSURE_PORT_MISSING_SEALS', data)

            for(const item of data) {

                const closure = await getRecordDetail(item['port_id'], 'FeatureComponent', [ '\"FeatureModel\"' ])
                console.log('closure', closure)
                const modelRelation = getFirstRelation(closure, 'FeatureModel')
                console.log('modelRelation', modelRelation)

                const cableConnections = closure.links.find(elem => elem['entity'] === 'ProjectModule:CableConnection')
                console.log('cableConnections', cableConnections)

                if (modelRelation && !cableConnections) {
                    const res = await deleteAssociation(modelRelation.dbRecordAssociation.id)
                    console.log('res', res)
                }

            }

        }


        if (featureType === 'CLOSURE') {

            const data = await odinDb.query(`
            SELECT distinct(db_records.id) as closure_id
            FROM db_records
            WHERE db_records.type = 'CLOSURE'
            AND db_records.entity = 'ProjectModule:Feature'
            AND NOT EXISTS (
                SELECT * from db_records_associations a
                WHERE a.child_entity = 'ProjectModule:FeatureComponent'
                AND a.parent_record_id = db_records.id
                AND a.deleted_at IS NULL
            )
            AND EXISTS (
                SELECT * from db_records_associations a
                WHERE a.child_entity = 'ProjectModule:FeatureModel'
                AND a.parent_record_id = db_records.id
                AND a.deleted_at IS NULL
            )
            AND db_records.deleted_at IS NULL
        `)

            console.log('_CLOSURE_MISSING_PORTS_OR_SLOTS', data)

            for(const item of data) {

                const closure = await getRecordDetail(item['closure_id'], 'Feature', [ '\"FeatureModel\"' ])
                console.log('closure', closure)
                const modelRelation = getFirstRelation(closure, 'FeatureModel')
                console.log('modelRelation', modelRelation)

                const cableConnections = closure.links.find(elem => elem['entity'] === 'ProjectModule:CableConnection')
                console.log('cableConnections', cableConnections)

                if (modelRelation && !cableConnections) {
                    const res = await deleteAssociation(modelRelation.dbRecordAssociation.id)
                    console.log('res', res)
                }

            }

        }

    } catch (e) {
        console.error(e)
    }

}
