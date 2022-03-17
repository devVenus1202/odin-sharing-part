import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import * as dotenv from 'dotenv';
import { BaseHttpClient } from '../../../../common/Http/BaseHttpClient';
import { FiberConnection } from '../types/fibre.connection';


dotenv.config({ path: '../../../../.env' });

const httpClient = new BaseHttpClient();

const apiToken = process.env.ODIN_API_TOKEN;


/**
 *
 * @param externalRef
 * @param type
 * @param odinDb
 * @param entities
 */
export async function getOdinRecordByExternalRef(
    externalRef: number,
    type: string,
    { odinDb },
    entities?: string[],
) {

    const res = await odinDb.query(`
        select c.record_id as id, t.name as type
        from db_records_columns c
        left join schemas_types t on (c.schema_type_id = t.id)
        where to_tsvector('english', c.value) @@ to_tsquery('${externalRef}')
        and c.column_name = 'ExternalRef'
        and t.name = '${type}'
        and c.deleted_at is null
      `)

    console.log('res[0]', res[0])
    if (res[0]) {
        return await getRecordDetail(res[0].id, 'Feature', entities || []);
    }

}

/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function deleteRecord(
    entityName: string,
    recordId: string,
) {
    try {

        const res = await httpClient.deleteRequest(
            Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
            `v1.0/db/${entityName}/${recordId}`,
            apiToken,
            false,
        );

        console.log('del', res['data'])

        return res['data'];

    } catch (e) {
        console.error(e)
    }
}

/**
 *
 * @param entityName
 * @param body
 * @param params
 */
export async function createRecordNoQueue(
    body: DbRecordCreateUpdateDto[],
    entityName: string,
    params?: string,
) {
    const res = await httpClient.postRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/${entityName}?${params}`,
        apiToken,
        body,
        false,
    );

    console.log('res', res)

    return res['data'];

}


/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function createRecordAndQueue(
    body: DbRecordCreateUpdateDto[],
    params?: string,
) {
    const res = await httpClient.postRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/batch?queue=true&${params}`,
        apiToken,
        body,
        false,
    );

    console.log('res', res)

    return res['data'];

}


/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function createRecord(
    entityName: string,
    body: DbRecordCreateUpdateDto[],
) {
    const res = await httpClient.postRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/batch?queueAndRelate=true`,
        apiToken,
        body,
        false,
    );

    return res['data'];

}


/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function updateRecord(
    entityName: string,
    recordId: string,
    body: DbRecordCreateUpdateDto,
) {

    const res = await httpClient.putRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/${entityName}/${recordId}`,
        apiToken,
        body,
        false,
    );
    return res['data'];

}


/**
 *
 * @param odinDb
 * @param moduleName
 * @param entityName
 * @param schemaType
 */
export async function getAllRecordsByEntity(
    moduleName: string,
    entityName: string,
    schemaType: string,
    { odinDb },
) {

    const res = await odinDb.query(`
        SELECT id, title
        FROM db_records r
        WHERE r.entity = '${moduleName}:${entityName}'
        AND r.deleted_at IS NULL
        AND r.type = '${schemaType}'`)

    return await getManyRecordsDetail(res.map(elem => elem.id).join());

}

/**
 *
 * @param recordIds
 */
export async function getManyRecordsDetail(recordIds: string) {

    const res = await httpClient.getRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/many/?ids=${recordIds}`,
        apiToken,
        false,
    );

    return res['data'];

}


/**
 *
 * @param recordId
 * @param entityName
 * @param entities
 */
export async function getRecordDetail(recordId: string, entityName: string, entities: string[]) {

    const res = await httpClient.getRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db/${entityName}/${recordId}?entities=[${entities}]`,
        apiToken,
        false,
    );

    return res['data'];

}


/**
 *
 * @param recordId
 * @param featureName
 * @param entities
 * @param filters
 */
export async function getRelatedRecords(
    recordId: string,
    featureName: string,
    entities: string[],
    filters?: string[],
) {

    const res = await httpClient.getRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db-associations/${featureName}/${recordId}/relations?entities=[${entities}]&filters=[${filters || []}]`,
        apiToken,
    );

    return res['data'];

}

/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function createAssociation(
    recordId: string,
    entityName: string,
    body: DbRecordAssociationCreateUpdateDto[],
) {

    const res = await httpClient.postRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db-associations/${entityName}/${recordId}`,
        apiToken,
        body,
        false,
    );

    return res['data'];

}

/**
 *
 * @param dbRecordAssociationId
 */
export async function deleteAssociation(
    dbRecordAssociationId: string,
) {

    const res = await httpClient.deleteRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/db-associations/${dbRecordAssociationId}`,
        apiToken,
        false,
    );

    return res['data'];

}

// /**
//  *
//  * @param bucketName
//  * @param pathName
//  * @param body
//  */
// export async function uploadToS3(
//     bucketName: string,
//     pathName: string,
//     body: any,
// ) {
//
//     const res = await httpClient.putRequest(
//         Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
//         `v1.0/s3/buckets/${bucketName}?pathName=${pathName}`,
//         apiToken,
//         Buffer.from(JSON.stringify(body)),
//     );
//
//     return res['data'];
//
// }

/**
 *
 * @param bucketName
 * @param pathName
 * @param body
 */
export async function getFromS3(
    bucketName: string,
    pathName: string,
) {

    const res = await httpClient.getRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/s3/buckets/presigned/${bucketName}?pathName=${pathName}`,
        apiToken,
    );


    return res['data'];

}

/**
 *
 * @param recordId
 * @param entityName
 * @param body
 */
export async function deleteFromS3(
    bucketName: string,
    pathName: string,
) {

    const res = await httpClient.deleteRequest(
        Utilities.getBaseUrl(SERVICE_NAME.PROJECT_MODULE),
        `v1.0/s3/buckets/${bucketName}?pathName=${pathName}`,
        apiToken,
        true,
    );


    return res['data'];

}


/**
 * Creates a cable connection to a closure
 *
 * @param connection
 * @param type
 */
export async function createFiberConnection(
    connection: FiberConnection,
) {
    const newRecord = new DbRecordCreateUpdateDto()
    newRecord.entity = 'ProjectModule:FiberConnection'
    newRecord.type = connection.type
    newRecord.properties = {
        OutClosureExternalRef: connection.outClosureExt,
        InClosureExternalRef: connection.inClosureExt,
        SlotId: connection.slotId || null,
        TrayModelId: connection.trayModelId || null,
        TrayId: connection.trayId || null,
        TrayInId: connection.trayInId || connection.trayId || null,
        TrayOutId: connection.trayOutId || connection.trayId || null,
        CableInId: connection.cableInId,
        CableInExternalRef: connection.cableInExternalRef,
        TubeFiberIn: connection.tubeFiberIn,
        TubeInId: connection.tubeInId,
        FiberInId: connection.fiberInId,
        CableOutExternalRef: connection.cableOutExternalRef,
        TubeFiberOut: connection.tubeFiberOut,
        CableOutId: connection.cableOutId,
        TubeOutId: connection.tubeOutId,
        FiberOutId: connection.fiberOutId,
    }

    if (connection.type === 'SPLICE') {
        newRecord.properties = {
            ...newRecord.properties,
            TraySpliceId: connection.traySpliceId || null,
        }
    }

    if (connection.type === 'SPLIT') {
        newRecord.properties = {
            ...newRecord.properties,
            TraySplitterId: connection.traySplitterId || null,
        }
    }

    newRecord.associations = [
        {
            recordId: connection.closureId,
        },
        {
            recordId: connection.slotId,
        },
        {
            recordId: connection.trayModelId,
        },
        {
            recordId: connection.trayId,
        },
        {
            recordId: connection.trayInId,
        },
        {
            recordId: connection.trayOutId,
        },
        {
            recordId: connection.cableInId,
        },
        {
            recordId: connection.tubeInId,
        },
        {
            recordId: connection.fiberInId,
        },
        {
            recordId: connection.cableOutId,
        },
        {
            recordId: connection.tubeOutId,
        },
        {
            recordId: connection.fiberOutId,
        },
        {
            recordId: connection.traySplitterId,
        },
        {
            recordId: connection.traySpliceId,
        },
    ]

    const sourceCableConnection = await createRecord(
        'FeatureConnection',
        [ newRecord ],
    )
    return sourceCableConnection;
}


/**
 * Adds a seal model to a port in the closure
 * which will create seal interfaces for the port
 *
 * @param slot
 * @param name
 */
export async function addTrayModelToSlot(
    slot: DbRecordEntityTransform,
    name: string,
    { odinDb },
): Promise<DbRecordEntityTransform> {

    const featureModels = await getAllRecordsByEntity('ProjectModule', 'FeatureModel', 'TRAY', { odinDb });

    const slotModel = featureModels.find(elem => elem.title === name);

    const createRel = new DbRecordAssociationCreateUpdateDto()
    createRel.recordId = slotModel.id;

    const newAssociation = await createAssociation(
        slot.id,
        'FeatureModel',
        [ createRel ],
    );
    return slotModel;
}


