import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { SchemaColumnCreateUpdateDto } from '@d19n/models/dist/schema-manager/schema/column/dto/schema.column.create.update.dto';
import { SchemaCreateUpdateDto } from '@d19n/models/dist/schema-manager/schema/dto/schema.create.update.dto';
import { SchemaTypeCreateDto } from '@d19n/models/dist/schema-manager/schema/types/dto/schema.type.create.dto';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const sourceUrl = process.env.SOURCE_HTTP_API_URL
const sourceApiToken = process.env.SOURCE_API_TOKEN

const targetUrl = process.env.TARGET_HTTP_API_URL
const targetApiToken = process.env.TARGET_API_TOKEN

async function sync() {

    try {

        const httpClient = new BaseHttpClient();

        const sourceDb = await createConnection({
            type: 'postgres',
            name: 'sourceDb',
            host: process.env.SOURCE_DB_HOSTNAME,
            port: Number(process.env.SOURCE_DB_PORT),
            username: process.env.SOURCE_DB_USERNAME,
            password: process.env.SOURCE_DB_PASSWORD,
            database: process.env.SOURCE_DB_NAME,
            synchronize: false,
            entities: [],
        });

        const targetDb = await createConnection({
            type: 'postgres',
            name: 'targetDb',
            host: process.env.TARGET_DB_HOSTNAME,
            port: Number(process.env.TARGET_DB_PORT),
            username: process.env.TARGET_DB_USERNAME,
            password: process.env.TARGET_DB_PASSWORD,
            database: process.env.TARGET_DB_NAME,
            synchronize: false,
            entities: [],
        });

        const schemas = await sourceDb.query(`SELECT module_name, entity_name FROM schemas WHERE entity_name IN ('Feature', 'FeatureModel', 'FeatureComponent', 'FiberConnection', 'CableConnection', 'ChangeRequest')`);

        console.log('schemas', schemas)

        for(const { module_name, entity_name } of schemas) {

            console.log('module_name', module_name, entity_name)

            // fetch the full schema with associations
            // enable permissions for all schemas
            const res = await httpClient.getRequest(
                `https://${sourceUrl}/SchemaModule`,
                `v1.0/schemas/bymodule/?moduleName=${module_name}&entityName=${entity_name}&withAssociations=true`,
                sourceApiToken,
            );
            const schema = res['data']

            const schemaCreate = new SchemaCreateUpdateDto();
            schemaCreate.name = schema.name;
            schemaCreate.description = schema.description;
            schemaCreate.moduleName = schema.moduleName;
            schemaCreate.entityName = schema.entityName;
            schemaCreate.recordNumber = schema.recordNumber;
            schemaCreate.recordNumberPrefix = schema.recordNumberPrefix;
            schemaCreate.searchUrl = schema.searchUrl;
            schemaCreate.getUrl = schema.getUrl;
            schemaCreate.postUrl = schema.postUrl;
            schemaCreate.putUrl = schema.putUrl;
            schemaCreate.deleteUrl = schema.deleteUrl;
            schemaCreate.isSequential = schema.isSequential;
            schemaCreate.isTitleUnique = schema.isTitleUnique;
            schemaCreate.isTitleRequired = schema.isTitleRequired;
            schemaCreate.position = schema.position;

            console.log('schemaCreate', schemaCreate)

            // Create the schema
            const schemaCreateRes = await httpClient.postRequest(
                `https://${targetUrl}/SchemaModule`,
                `v1.0/schemas?upsert=true`,
                targetApiToken,
                schemaCreate,
                true,
            );
            const newSchema = schemaCreateRes['data']

            // enable permissions for all schemas
            // const permissionsRes = await httpClient.postRequest(
            //     `https://${targetUrl}/IdentityModule`,
            //     `v1.0/rbac/permissions/schemas/batch/${newSchema.id}`,
            //     targetApiToken,
            //     {},
            // );
            // console.log('permissionsRes', permissionsRes)

            // console.log('newSchema', newSchema)

            const types = schema['types']

            const schemaTypes = []
            for(const type of types) {
                // create schema types
                const schemaTypeCreate = new SchemaTypeCreateDto();
                schemaTypeCreate.schemaId = newSchema.id
                schemaTypeCreate.name = type.name;
                schemaTypeCreate.label = type.label;
                schemaTypeCreate.description = type.description;
                schemaTypeCreate.isDefault = type.isDefault;

                console.log('schemaTypeCreate', schemaTypeCreate)

                // Create the schema types
                const schemaTypeCreateRes = await httpClient.postRequest(
                    `https://${targetUrl}/SchemaModule`,
                    `v1.0/schemas/${newSchema.id}/types`,
                    targetApiToken,
                    schemaTypeCreate,
                );

                console.log('schemaTypeCreateRes[\'statusCode\']', schemaTypeCreateRes['statusCode'])


                if (schemaTypeCreateRes['statusCode'] === 409) {

                    const existingTypes = await targetDb.query(`SELECT id FROM schemas_types WHERE name = '${type.name}' AND schema_id = '${newSchema.id}'`);

                    console.log('existingTypes', existingTypes)

                    if (existingTypes[0]) {
                        const schemaTypeRes = await httpClient.getRequest(
                            `https://${targetUrl}/SchemaModule`,
                            `v1.0/schemas/${newSchema.id}/types/${existingTypes[0]['id']}`,
                            targetApiToken,
                        );
                        console.log('schemaTypeRes', schemaTypeRes)
                        const schemaType = schemaTypeRes['data']
                        schemaTypes.push(schemaType)
                    }

                } else {
                    const newSchemaType = schemaTypeCreateRes['data']
                    console.log('newSchemaType', newSchemaType)

                    if (newSchemaType) {
                        schemaTypes.push(newSchemaType)
                    }
                }
            }

            console.log('schemaTypes', schemaTypes)

            const columns = schema['columns']
            for(const column of columns) {

                console.log('column', column)
                console.log('validators', column['validators'])

                let schemaType;
                if (column['schemaType']) {
                    schemaType = schemaTypes.find(elem => elem['name'] === column['schemaType']['name'])
                }

                if (column['schemaType'] && !schemaType) {
                    throw new ExceptionType(500, 'no schema type matched')
                }

                const schemaColumnCreate = new SchemaColumnCreateUpdateDto();
                schemaColumnCreate.schemaTypeId = schemaType ? schemaType['id'] : undefined;
                schemaColumnCreate.name = column.name;
                schemaColumnCreate.type = column.type;
                schemaColumnCreate.label = column.label;
                schemaColumnCreate.mapping = column.mapping;
                schemaColumnCreate.defaultValue = column.defaultValue;
                schemaColumnCreate.placeholder = column.placeholder;
                schemaColumnCreate.position = column.position;
                schemaColumnCreate.columnPosition = column.columnPosition;
                schemaColumnCreate.category = column.category;
                schemaColumnCreate.transform = column.transform;
                schemaColumnCreate.description = column.description;
                schemaColumnCreate.isStatic = column.isStatic ? column.isStatic : false;
                schemaColumnCreate.isHidden = column.isHidden ? column.isHidden : false;
                schemaColumnCreate.isDisabled = column.isDisabled ? column.isHidden : false;
                schemaColumnCreate.isTitleColumn = column.isTitleColumn ? column.isTitleColumn : false;
                schemaColumnCreate.isStatusColumn = column.isStatusColumn;
                schemaColumnCreate.isVisibleInTables = column.isVisibleInTables;
                schemaColumnCreate.validators = column.validators.map(elem => elem['type'])
                schemaColumnCreate.options = column.options.map(elem => ({
                    label: elem.label,
                    value: elem.value,
                    position: elem.position,
                }))

                console.log('schemaColumnCreate', schemaColumnCreate)
                // Create the schema types
                const schemaColumnCreateRes = await httpClient.postRequest(
                    `https://${targetUrl}/SchemaModule`,
                    `v1.0/schemas/${newSchema.id}/columns`,
                    targetApiToken,
                    schemaColumnCreate,
                );

                console.log('schemaColumnCreateRes', schemaColumnCreateRes)
            }

            console.log('types', types)
            console.log('columns', columns)
        }

    } catch (e) {
        console.error(e);
    }
}

sync();
