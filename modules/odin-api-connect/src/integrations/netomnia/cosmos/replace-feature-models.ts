import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { getFirstRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteAssociation, getRecordDetail } from '../connections/data/http';

dotenv.config({ path: '../../../../.env' });

export async function replaceFeatureModels(
    principal: OrganizationUserEntity,
    featureType: string,
    { odinDb },
) {

    try {

        const needToCheckSplicing = []

        if (featureType === 'CABLE') {
            const data1 = await odinDb.query(`
                SELECT R.id, C_L1PolygonId.value as l1_polygon_id, C_L2PolygonId.value as l2_polygon_id
                FROM db_records R
                LEFT JOIN db_records_associations A ON (A.parent_record_id = R.id)
                LEFT JOIN db_records_columns C_L1PolygonId ON (C_L1PolygonId.record_id = R.id AND C_L1PolygonId.column_name = 'L1PolygonId')
                LEFT JOIN db_records_columns C_L2PolygonId ON (C_L2PolygonId.record_id = R.id AND C_L2PolygonId.column_name = 'L2PolygonId')
                LEFT JOIN db_records_columns C_CableModel ON (C_CableModel.record_id = R.id AND C_CableModel.column_name = 'CableModel')
                LEFT JOIN db_records_columns C_CableType ON (C_CableType.record_id = R.id AND C_CableType.column_name = 'CableType')
                LEFT JOIN db_records_columns C_ExternalRef ON (C_ExternalRef.record_id = A.child_record_id AND C_ExternalRef.column_name = 'ExternalRef')
                WHERE R.type = 'CABLE'
                AND R.entity = 'ProjectModule:Feature'
                AND R.deleted_at IS NULL
                AND A.child_entity = 'ProjectModule:FeatureModel'
                AND A.deleted_at IS NULL
                AND C_CableModel.value <> C_ExternalRef.value
                AND C_CableType.value IN ('2','3') -- Distribution and Access only
            `)

            console.log('data1', data1)

            for(const item of [ ...data1 ]) {
                const cable = await getRecordDetail(item['id'], 'Feature', [ '\"FeatureModel\"' ])
                console.log('cable', cable)
                const modelRelation = getFirstRelation(cable, 'FeatureModel')
                console.log('modelRelation', modelRelation)

                const fiberConnections = cable.links.find(elem => elem['entity'] === 'ProjectModule:FiberConnection')
                console.log('fiberConnections.length', fiberConnections)

                const res = await deleteAssociation(modelRelation.dbRecordAssociation.id)
                console.log('res', res)
                if (fiberConnections && fiberConnections.length > 0) {
                    console.log('FIBER CONNECTIONS NEED TO BE RE SPLICED', cable['l2_polygon_id'])
                    needToCheckSplicing.push(cable['l2_polygon_id'])
                }
            }
        }

        console.log('CHECK_SPLICING_FOR_L2', needToCheckSplicing)


        if (featureType === 'CLOSURE') {
            const data = await odinDb.query(`
                SELECT R.id, C_L1PolygonId.value as l1_polygon_id, C_L2PolygonId.value as l2_polygon_id
                FROM db_records R
                LEFT JOIN db_records_associations A ON (A.parent_record_id = R.id)
                LEFT JOIN db_records_columns C_L1PolygonId ON (C_L1PolygonId.record_id = R.id AND C_L1PolygonId.column_name = 'L1PolygonId')
                LEFT JOIN db_records_columns C_L2PolygonId ON (C_L2PolygonId.record_id = R.id AND C_L2PolygonId.column_name = 'L2PolygonId')
                LEFT JOIN db_records_columns C_ClosureModel ON (C_ClosureModel.record_id = R.id AND C_ClosureModel.column_name = 'ClosureModel')
                LEFT JOIN db_records_columns C_ClosureType ON (C_ClosureType.record_id = R.id AND C_ClosureType.column_name = 'ClosureType')
                LEFT JOIN db_records_columns C_ExternalRef ON (C_ExternalRef.record_id = A.child_record_id AND C_ExternalRef.column_name = 'ExternalRef')
                WHERE R.type = 'CLOSURE'
                AND R.entity = 'ProjectModule:Feature'
                AND R.deleted_at IS NULL
                AND A.child_entity = 'ProjectModule:FeatureModel'
                AND A.deleted_at IS NULL
                AND C_ClosureModel.value <> C_ExternalRef.value
                AND C_ClosureType.value IN ('2','4') -- L1 and L3 only
            `)

            console.log('data', data)

            for(const item of data) {
                const closure = await getRecordDetail(item['id'], 'Feature', [ '\"FeatureModel\"' ])
                console.log('closure', closure)

                const modelRelation = getFirstRelation(closure, 'FeatureModel')

                const cableConnections = closure.links.find(elem => elem['entity'] === 'ProjectModule:CableConnection')
                console.log('cableConnections.length', cableConnections)
                // Delete the feature-model
                if (modelRelation) {
                    const res = await deleteAssociation(modelRelation.dbRecordAssociation.id)
                    console.log('relation_delete_res: ', res)
                }

                // Delete the cable connections
                if (cableConnections && cableConnections.length > 0) {
                    for(const conn of cableConnections) {
                        const res = await deleteAssociation(conn.id)
                        console.log('cable_delete_res', res)
                    }
                    needToCheckSplicing.push(item['l2_polygon_id'])
                    console.log('CABLE CONNECTIONS EXIST IN L2', item['l2_polygon_id'])
                }
            }
        }

        console.log('CHECK_SPLICING_FOR_L2', needToCheckSplicing)
    } catch (e) {
        console.error(e)
    }

}
