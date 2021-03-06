import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateDatabase1595345711492 implements MigrationInterface {
    name = 'CreateDatabase1595345711492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE SCHEMA logs');
        await queryRunner.query('CREATE SCHEMA gocardless');
        await queryRunner.query('CREATE SCHEMA notifications');
        await queryRunner.query('CREATE SCHEMA royal_mail');
        await queryRunner.query(`CREATE TYPE "organizations_users_permissions_type_enum" AS ENUM('COLUMN', 'SCHEMA', 'USER', 'ROLE', 'PERMISSION', 'GROUP', 'API', 'PIPELINE', 'TOKEN', 'DB_RECORD')`);
        await queryRunner.query(`CREATE TABLE "organizations_users_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" character varying(160), "type" "organizations_users_permissions_type_enum" NOT NULL, "organization_id" uuid, CONSTRAINT "PK_34c00d0119478476be4f9cc8668" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b2ddd1f7b0384feaee54768904" ON "organizations_users_permissions" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TABLE "forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "label" character varying(32) NOT NULL, "name" character varying(32) NOT NULL, "description" character varying(160) NOT NULL, "path" character varying(55), "is_public" boolean NOT NULL DEFAULT false, "module_name" character varying, "entity_name" character varying(32) NOT NULL, "is_static" boolean NOT NULL DEFAULT false, "organization_id" uuid, "schema_id" uuid, CONSTRAINT "PK_ba062fd30b06814a60756f233da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c7233c6f993ff36bf062f1d945" ON "forms" ("organization_id", "label") `);
        await queryRunner.query(`CREATE TABLE "forms_sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(32) NOT NULL, "description" character varying(55), "position" integer NOT NULL DEFAULT 0, "columns" integer NOT NULL DEFAULT 1, "organization_id" uuid, "schema_id" uuid, "form_id" uuid, CONSTRAINT "PK_89fb71394c4dad54f9ef5615e4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "schemas_columns_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "position" integer NOT NULL, "label" character varying(32) NOT NULL, "value" character varying(32) NOT NULL, "organization_id" uuid, "column_id" uuid NOT NULL, CONSTRAINT "PK_c45c2f075d4882c47314d049614" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d8d037602702d9a8519845ca63" ON "schemas_columns_options" ("organization_id", "column_id", "label", "value") `);
        await queryRunner.query(`CREATE INDEX "IDX_5af5a4428b007345fa7ed374c5" ON "schemas_columns_options" ("organization_id", "column_id") `);
        await queryRunner.query(`CREATE TABLE "schemas_columns_validators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "organization_id" uuid, "column_id" uuid NOT NULL, CONSTRAINT "PK_f1ce5b60336dde92ab2f70550ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7e5631906ad00b128a51492bc2" ON "schemas_columns_validators" ("organization_id", "column_id", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_c2faa69055cca30af59f4611dc" ON "schemas_columns_validators" ("organization_id", "column_id") `);
        await queryRunner.query(`CREATE TYPE "schemas_columns_type_enum" AS ENUM('ADDRESS', 'BOOLEAN', 'EMAIL', 'NUMBER', 'DATE', 'DATE_TIME', 'PHONE_NUMBER', 'ALPHA_NUMERICAL', 'TEXT', 'TEXT_LONG', 'NAME', 'ENUM', 'UUID', 'PASSWORD', 'CURRENCY', 'PERCENT')`);
        await queryRunner.query(`CREATE TABLE "schemas_columns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "type" "schemas_columns_type_enum" NOT NULL DEFAULT 'TEXT', "description" character varying(255), "default_value" character varying(55), "label" character varying(55), "placeholder" character varying(55), "position" integer NOT NULL DEFAULT 0, "is_static" boolean NOT NULL DEFAULT false, "is_hidden" boolean NOT NULL DEFAULT false, "is_visible_in_tables" boolean NOT NULL DEFAULT true, "isDisabled" boolean DEFAULT false, "isTitleColumn" boolean DEFAULT false, "isStatusColumn" boolean DEFAULT false, "category" character varying DEFAULT null, "organization_id" uuid, "schema_id" uuid, "sectionId" uuid, CONSTRAINT "PK_08aa03ccf0c79a4d9ac20717e89" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_914ecbe9a0509addfdd746a0d7" ON "schemas_columns" ("schema_id", "organization_id", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_e922c1aca41fa72baaa3639a6c" ON "schemas_columns" ("schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_53b33faa2250a8ddd576bf13c7" ON "schemas_columns" ("organization_id", "schema_id") `);
        await queryRunner.query(`CREATE TABLE "schemas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "record_number" integer DEFAULT 1, "record_number_prefix" character varying(55), "record_default_ownerId" uuid, "is_sequential" boolean NOT NULL DEFAULT false, "description" character varying(255), "module_name" character varying(55) NOT NULL, "entity_name" character varying(55) NOT NULL, "search_url" character varying DEFAULT null, "get_url" character varying DEFAULT null, "post_url" character varying DEFAULT null, "put_url" character varying DEFAULT null, "delete_url" character varying DEFAULT null, "is_static" boolean NOT NULL DEFAULT false, "is_hidden" boolean NOT NULL DEFAULT false, "hasTitle" boolean NOT NULL DEFAULT true, "isTitleUnique" boolean NOT NULL DEFAULT false, "queryable" boolean NOT NULL DEFAULT true, "replicateable" boolean NOT NULL DEFAULT true, "retrievable" boolean NOT NULL DEFAULT true, "searchable" boolean NOT NULL DEFAULT true, "triggerable" boolean NOT NULL DEFAULT true, "undeletable" boolean NOT NULL DEFAULT true, "updateable" boolean NOT NULL DEFAULT true, "organization_id" uuid, CONSTRAINT "PK_15ef0261cc6714f7bacfed7acfb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1bf479a7f6831fe8c8e7cc3187" ON "schemas" ("organization_id", "name", "module_name", "entity_name") `);
        await queryRunner.query(`CREATE INDEX "IDX_6404405490f7c095bf674b7d6a" ON "schemas" ("organization_id", "module_name", "entity_name") `);
        await queryRunner.query(`CREATE INDEX "IDX_e55cb6034153f835d8877a6c75" ON "schemas" ("organization_id", "module_name") `);
        await queryRunner.query(`CREATE TYPE "schemas_associations_type_enum" AS ENUM('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY')`);
        await queryRunner.query(`CREATE TABLE "schemas_associations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "label" character varying NOT NULL, "type" "schemas_associations_type_enum" NOT NULL, "position" integer NOT NULL DEFAULT 0, "is_static" boolean NOT NULL DEFAULT false, "required_on_parent_create" boolean NOT NULL DEFAULT false, "requiredOnChildCreate" boolean NOT NULL DEFAULT false, "parent_actions" character varying DEFAULT 'LOOKUP_AND_CREATE', "child_actions" character varying DEFAULT 'LOOKUP_AND_CREATE', "cascade_delete_child_record" boolean NOT NULL DEFAULT false, "find_in_schema" character varying DEFAULT null, "find_in_child_schema" character varying DEFAULT null, "get_url" character varying DEFAULT null, "post_url" character varying DEFAULT null, "put_url" character varying DEFAULT null, "delete_url" character varying DEFAULT null, "organization_id" uuid, "parent_schema_id" uuid, "child_schema_id" uuid, CONSTRAINT "PK_9ae5def182a79d0d47116a49f6b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0a0c3fc7d35686ff4f36a8e6f0" ON "schemas_associations" ("organization_id", "parent_schema_id", "child_schema_id", "label") `);
        await queryRunner.query(`CREATE INDEX "IDX_0b9f14fcb6dfb867486474265d" ON "schemas_associations" ("organization_id", "child_schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ea55922a23b4eada218f95b18" ON "schemas_associations" ("organization_id", "parent_schema_id") `);
        await queryRunner.query(`CREATE TABLE "pipelines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "key" character varying(255) NOT NULL, "description" character varying(255) NOT NULL, "module_name" character varying(55) NOT NULL, "entity_name" character varying(55) NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "organization_id" uuid, CONSTRAINT "PK_e38ea171cdfad107c1f3db2c036" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7a8795688c8891650a40923def" ON "pipelines" ("organization_id", "key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8ed01dc8a2d3b4bf37ff982a63" ON "pipelines" ("organization_id", "name", "module_name", "entity_name") `);
        await queryRunner.query(`CREATE TABLE "pipelines_stages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "key" character varying(255) NOT NULL, "description" character varying(255) NOT NULL, "position" integer NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "is_success" boolean NOT NULL DEFAULT false, "is_fail" boolean NOT NULL DEFAULT false, "organization_id" uuid, "pipeline_id" uuid, CONSTRAINT "PK_c720ba0d603dfcf526d970492ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a1f0c9a6b327d726ef5e33ec0a" ON "pipelines_stages" ("organization_id", "key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8044b5e5fa5d8a6cdf48b4a6e2" ON "pipelines_stages" ("organization_id", "name", "pipeline_id", "position") `);
        await queryRunner.query(`CREATE TABLE "db_records_columns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "value" text, "deleted_at" TIMESTAMP, "organization_id" uuid NOT NULL, "schema_id" uuid NOT NULL, "column_id" uuid NOT NULL, "record_id" uuid NOT NULL, "last_modified_by_id" uuid, CONSTRAINT "PK_921b53ed5774e20640b552a13e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_93220354941f4796e99e34f2c1" ON "db_records_columns" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b94bc71fc17b7a95734a5736b" ON "db_records_columns" ("value") `);
        await queryRunner.query(`CREATE INDEX "IDX_59ed23bbfdd8f6cfc0325121ba" ON "db_records_columns" ("record_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_59a6628b5bdfb5d881835b7652" ON "db_records_columns" ("organization_id", "schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_52e75cb0e982052c5575e1fe18" ON "db_records_columns" ("column_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_65b2590beda07f65a496a783bf" ON "db_records_columns" ("organization_id", "column_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8481d519cc21678b192800ccbb" ON "db_records_columns" ("organization_id", "record_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_eec4a6a5ffe31f3e8d12bd562a" ON "db_records_columns" ("organization_id", "column_id", "value") `);
        await queryRunner.query(`CREATE INDEX "IDX_5720fda0dce58a709fcf12afb4" ON "db_records_columns" ("organization_id", "schema_id", "value") `);
        await queryRunner.query(`CREATE TABLE "db_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying(255), "record_number" character varying(255), "rag_status" integer DEFAULT 0, "rag_description" character varying(255), "stageUpdatedAt" date, "deleted_at" TIMESTAMP, "organization_id" uuid NOT NULL, "schema_id" uuid NOT NULL, "stage_id" uuid, "created_by_id" uuid, "last_modified_by_id" uuid, "ownedById" uuid, CONSTRAINT "PK_89e25d10ac60936a13182bc2caf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_664c24172e65d87e5d8b20100b" ON "db_records" ("last_modified_by_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a46e280417205b3ee923bedcc2" ON "db_records" ("created_by_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3621ce50ad5e3fcfcbf06d94a9" ON "db_records" ("stage_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc02bcdeef8db27efd6e3039e8" ON "db_records" ("schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_24b2dca783762bc25dd8ce3a75" ON "db_records" ("organization_id") `);
        await queryRunner.query(`CREATE TABLE "db_records_associations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "label" character varying(255) DEFAULT null, "description" character varying(255) DEFAULT null, "position" integer DEFAULT 0, "quantity" integer DEFAULT 0, "deleted_at" TIMESTAMP, "schemaAssociationId" uuid NOT NULL, "organization_id" uuid NOT NULL, "parent_schema_id" uuid NOT NULL, "parentRecordId" uuid NOT NULL, "child_schema_id" uuid NOT NULL, "childRecordId" uuid NOT NULL, "created_by_id" uuid, "last_modified_by_id" uuid, CONSTRAINT "PK_f01ed5b6b6ad9ba3b073efab606" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_26ae5230d078995b0128faed79" ON "db_records_associations" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3b87d20ee5a26786e9ce08323" ON "db_records_associations" ("organization_id", "childRecordId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9565f438470a4822411c62727" ON "db_records_associations" ("organization_id", "parentRecordId") `);
        await queryRunner.query(`CREATE INDEX "IDX_363941fa8552b7a0925d214982" ON "db_records_associations" ("organization_id", "childRecordId", "parent_schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ebfff9fce03bcf7ee427439909" ON "db_records_associations" ("organization_id", "parentRecordId", "child_schema_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_04655e8b9469f9ea3e2cbd2d5b" ON "db_records_associations" ("organization_id", "parentRecordId", "childRecordId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5c82ef3252b606ffc4954ff571" ON "db_records_associations" ("organization_id", "id") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" character varying(160), "organization_id" uuid, CONSTRAINT "PK_1bfe9f9ea6760e9331b6503e55d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6610518e70d99ec9d2493a1e96" ON "organizations_users_groups" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TYPE "organizations_users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING_CONFIRMATION')`);
        await queryRunner.query(`CREATE TABLE "organizations_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "organizations_users_status_enum" NOT NULL DEFAULT 'PENDING_CONFIRMATION', "firstname" character varying(50) NOT NULL, "lastname" character varying(50) NOT NULL, "email" character varying(175) NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, "password" character varying(100) NOT NULL, "timezoneName" character varying(32), "timezoneOffset" character varying(32), "locale" character varying(32), "isBetaTester" boolean NOT NULL DEFAULT false, "organization_id" uuid, CONSTRAINT "PK_0bcc12e111741c5556420676dc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c4fa864ee42a7fd672f662416d" ON "organizations_users" ("organization_id", "email") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "description" character varying(255), "organization_id" uuid, CONSTRAINT "PK_ecbba30de34fd8d46b4f2f91187" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_406ceafd9ea00491ba1d11297d" ON "organizations_users_roles" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "countryCode" character varying(32), "timezoneName" character varying(32), "timezoneOffset" character varying(32), "locale" character varying(32), "einNumber" character varying(32), "vatNumber" character varying(32), "maxForms" integer DEFAULT 100, "maxSchemas" integer DEFAULT 100, "maxSchemaColumns" integer DEFAULT 100, "billingReplyToEmail" character varying(100) DEFAULT null, "customerServiceReplyToEmail" character varying(100) DEFAULT null, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9b7ca6d30b94fef571cff87688" ON "organizations" ("name") `);
        await queryRunner.query(`CREATE TABLE "organizations_apps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(55) NOT NULL, "baseUrl" character varying(200) NOT NULL, "apiKey" character varying(500) NOT NULL, "refreshToken" character varying(200), "healthCheckUrl" character varying(200), "organization_id" uuid, CONSTRAINT "PK_9579695e1d4d7aed3f011839af3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b5196b5545c16907a8063e55bf" ON "organizations_apps" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_rbac_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255) NOT NULL, "organization_id" uuid, "userId" uuid, CONSTRAINT "PK_d443c2cb9b8aeb0d429df129fa7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "logs"."user_activity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "organization_id" character varying NOT NULL, "recordId" character varying NOT NULL, "revision" jsonb NOT NULL, "userId" character varying NOT NULL, "userName" character varying NOT NULL, "type" character varying NOT NULL, "ipAddress" character varying NOT NULL, "userAgent" character varying, CONSTRAINT "PK_30ac33e7e681f7d3416a4716eb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_22afbc24bf0f3cff7dc46d60fa" ON "logs"."user_activity" ("organization_id", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cf12b45102317037673d0deaf3" ON "logs"."user_activity" ("organization_id", "recordId") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_roles_links" ("permission_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_5c78024bdf0ed7e23b717494698" PRIMARY KEY ("permission_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0875f9845a6c16845549b32cd7" ON "organizations_users_roles_links" ("permission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_be95d8ad924da965eb3bf12520" ON "organizations_users_roles_links" ("role_id") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_groups_children_links" ("id_1" uuid NOT NULL, "id_2" uuid NOT NULL, CONSTRAINT "PK_912183095d799ea74146809ae46" PRIMARY KEY ("id_1", "id_2"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9536888772791fcbf115bee100" ON "organizations_users_groups_children_links" ("id_1") `);
        await queryRunner.query(`CREATE INDEX "IDX_5cbcc53e466bd5437e0beb65bc" ON "organizations_users_groups_children_links" ("id_2") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_roles_assignments" ("organizationsUsersId" uuid NOT NULL, "organizationsUsersRolesId" uuid NOT NULL, CONSTRAINT "PK_f29a333b93bd89c0df26bd8a0c6" PRIMARY KEY ("organizationsUsersId", "organizationsUsersRolesId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a3b8908ee9a8092467a2e9b37a" ON "organizations_users_roles_assignments" ("organizationsUsersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f24e01e5a898618a8c2e375c81" ON "organizations_users_roles_assignments" ("organizationsUsersRolesId") `);
        await queryRunner.query(`CREATE TABLE "organizations_users_groups_assignments" ("organizationsUsersId" uuid NOT NULL, "organizationsUsersGroupsId" uuid NOT NULL, CONSTRAINT "PK_6e7ccb54fdce8220553580f82a8" PRIMARY KEY ("organizationsUsersId", "organizationsUsersGroupsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_03e1f2f54473ea920939dd96c1" ON "organizations_users_groups_assignments" ("organizationsUsersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ac71ee6e3f0e3058bc22d6c75a" ON "organizations_users_groups_assignments" ("organizationsUsersGroupsId") `);
        await queryRunner.query(`CREATE TABLE "organizations_roles_links" ("role_id" uuid NOT NULL, "child_role_id" uuid NOT NULL, CONSTRAINT "PK_4840db65b7626352296967bbbdf" PRIMARY KEY ("role_id", "child_role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e20ab75c095290ed118998372b" ON "organizations_roles_links" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e88a095042a45738279739f7e2" ON "organizations_roles_links" ("child_role_id") `);
        await queryRunner.query(`ALTER TABLE "organizations_users_permissions" ADD CONSTRAINT "FK_2725271dac032fd2871647054c7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "forms" ADD CONSTRAINT "FK_a87d8b0a565a009db5ae5a6bd3a" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "forms" ADD CONSTRAINT "FK_77e5da185f11a51ff2801256dee" FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "forms_sections" ADD CONSTRAINT "FK_0e419bed97c9fd93d91b30ebfcc" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "forms_sections" ADD CONSTRAINT "FK_6596623661de4c6b7570f6aa18f" FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "forms_sections" ADD CONSTRAINT "FK_15096e0f477d7fcd1f150fd1629" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_options" ADD CONSTRAINT "FK_04098114e230683fc3ff4dd1a8a" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_options" ADD CONSTRAINT "FK_fa4ac76057069fdef635a9174d0" FOREIGN KEY ("column_id") REFERENCES "schemas_columns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_validators" ADD CONSTRAINT "FK_89fc70b8fbcde47641cb4179afb" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_validators" ADD CONSTRAINT "FK_fb091e7dd9d8ec1be6d8c47fd68" FOREIGN KEY ("column_id") REFERENCES "schemas_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" ADD CONSTRAINT "FK_9e87226b6fabce49346e5548916" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" ADD CONSTRAINT "FK_e922c1aca41fa72baaa3639a6c9" FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" ADD CONSTRAINT "FK_95e879899bfb3b1dbe97443d264" FOREIGN KEY ("sectionId") REFERENCES "forms_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD CONSTRAINT "FK_b021b0b1ac5e3ce1a993049020f" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" ADD CONSTRAINT "FK_eb2a7f3f51b7a66c7257264b9a6" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" ADD CONSTRAINT "FK_8251f61d2fcc30b5148a247f7c0" FOREIGN KEY ("parent_schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" ADD CONSTRAINT "FK_feaba954381ac967b153664a446" FOREIGN KEY ("child_schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pipelines" ADD CONSTRAINT "FK_ad32cc5d7b97e8091ef17ba9b89" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pipelines_stages" ADD CONSTRAINT "FK_e8aa3644d28e9bab5d1d1b52cce" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pipelines_stages" ADD CONSTRAINT "FK_a3278dc41bdbe68cbba39425d30" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" ADD CONSTRAINT "FK_93220354941f4796e99e34f2c15" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" ADD CONSTRAINT "FK_c862c6deb396eee73c0df456290" FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" ADD CONSTRAINT "FK_52e75cb0e982052c5575e1fe18c" FOREIGN KEY ("column_id") REFERENCES "schemas_columns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" ADD CONSTRAINT "FK_59ed23bbfdd8f6cfc0325121baf" FOREIGN KEY ("record_id") REFERENCES "db_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" ADD CONSTRAINT "FK_fd67299bafaa2c30a056deeaa5d" FOREIGN KEY ("last_modified_by_id") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_24b2dca783762bc25dd8ce3a75a" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_cc02bcdeef8db27efd6e3039e86" FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_3621ce50ad5e3fcfcbf06d94a98" FOREIGN KEY ("stage_id") REFERENCES "pipelines_stages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_a46e280417205b3ee923bedcc22" FOREIGN KEY ("created_by_id") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_664c24172e65d87e5d8b20100b1" FOREIGN KEY ("last_modified_by_id") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records" ADD CONSTRAINT "FK_490dd73493593be97a68bc8fb0a" FOREIGN KEY ("ownedById") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_31939f2d374495f1246d3b68d94" FOREIGN KEY ("schemaAssociationId") REFERENCES "schemas_associations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_26ae5230d078995b0128faed793" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_8a334e959348d0ed65785bf548b" FOREIGN KEY ("parent_schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_e964ea6f8031d112251196b08c1" FOREIGN KEY ("parentRecordId") REFERENCES "db_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_efc1dcc3cf176d531689fd915e4" FOREIGN KEY ("child_schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_7da68e796bd74ff5958398a8ca4" FOREIGN KEY ("childRecordId") REFERENCES "db_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_d469f00bd5c9ea24974d9e3e7c2" FOREIGN KEY ("created_by_id") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" ADD CONSTRAINT "FK_742751c2c38cdb0a10c45595b89" FOREIGN KEY ("last_modified_by_id") REFERENCES "organizations_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups" ADD CONSTRAINT "FK_84bc2d4db479fb082116a7f18ba" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users" ADD CONSTRAINT "FK_f655c9154cb4b9d5aa7c71ab32b" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles" ADD CONSTRAINT "FK_79ea2e648540876b18edb54d088" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_apps" ADD CONSTRAINT "FK_46a84a2a42c9e841f472eb1ea75" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_rbac_tokens" ADD CONSTRAINT "FK_5e852a7fad1fd7aaccd9de26a44" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_rbac_tokens" ADD CONSTRAINT "FK_5eaf0fdc5fb37c45f8501b109e5" FOREIGN KEY ("userId") REFERENCES "organizations_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_links" ADD CONSTRAINT "FK_0875f9845a6c16845549b32cd78" FOREIGN KEY ("permission_id") REFERENCES "organizations_users_permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_links" ADD CONSTRAINT "FK_be95d8ad924da965eb3bf125200" FOREIGN KEY ("role_id") REFERENCES "organizations_users_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_children_links" ADD CONSTRAINT "FK_9536888772791fcbf115bee100a" FOREIGN KEY ("id_1") REFERENCES "organizations_users_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_children_links" ADD CONSTRAINT "FK_5cbcc53e466bd5437e0beb65bcd" FOREIGN KEY ("id_2") REFERENCES "organizations_users_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_assignments" ADD CONSTRAINT "FK_a3b8908ee9a8092467a2e9b37a2" FOREIGN KEY ("organizationsUsersId") REFERENCES "organizations_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_assignments" ADD CONSTRAINT "FK_f24e01e5a898618a8c2e375c817" FOREIGN KEY ("organizationsUsersRolesId") REFERENCES "organizations_users_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_assignments" ADD CONSTRAINT "FK_03e1f2f54473ea920939dd96c19" FOREIGN KEY ("organizationsUsersId") REFERENCES "organizations_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_assignments" ADD CONSTRAINT "FK_ac71ee6e3f0e3058bc22d6c75af" FOREIGN KEY ("organizationsUsersGroupsId") REFERENCES "organizations_users_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_roles_links" ADD CONSTRAINT "FK_e20ab75c095290ed118998372b5" FOREIGN KEY ("role_id") REFERENCES "organizations_users_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations_roles_links" ADD CONSTRAINT "FK_e88a095042a45738279739f7e2c" FOREIGN KEY ("child_role_id") REFERENCES "organizations_users_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE "notifications"."mail_activity" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "is_deleted" bool NOT NULL DEFAULT false,
            "created_at" timestamp(6) NOT NULL DEFAULT now(),
            "updated_at" timestamp(6) NOT NULL DEFAULT now(),
            "organization_id" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "user_id" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "record_id" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "email" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "ip" varchar COLLATE "pg_catalog"."default",
            "event" varchar COLLATE "pg_catalog"."default",
            "timestamp" int4 NOT NULL,
            "category" varchar COLLATE "pg_catalog"."default",
            "sg_event_id" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "sg_message_id" varchar COLLATE "pg_catalog"."default" NOT NULL,
            "reason" varchar COLLATE "pg_catalog"."default",
            "status" varchar COLLATE "pg_catalog"."default",
            "dynamic_template_data" jsonb,
            "mail_id" varchar COLLATE "pg_catalog"."default",
            "template_label" varchar COLLATE "pg_catalog"."default",
            PRIMARY KEY ("id")
          )`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations_roles_links" DROP CONSTRAINT "FK_e88a095042a45738279739f7e2c"`);
        await queryRunner.query(`ALTER TABLE "organizations_roles_links" DROP CONSTRAINT "FK_e20ab75c095290ed118998372b5"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_assignments" DROP CONSTRAINT "FK_ac71ee6e3f0e3058bc22d6c75af"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_assignments" DROP CONSTRAINT "FK_03e1f2f54473ea920939dd96c19"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_assignments" DROP CONSTRAINT "FK_f24e01e5a898618a8c2e375c817"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_assignments" DROP CONSTRAINT "FK_a3b8908ee9a8092467a2e9b37a2"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_children_links" DROP CONSTRAINT "FK_5cbcc53e466bd5437e0beb65bcd"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups_children_links" DROP CONSTRAINT "FK_9536888772791fcbf115bee100a"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_links" DROP CONSTRAINT "FK_be95d8ad924da965eb3bf125200"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles_links" DROP CONSTRAINT "FK_0875f9845a6c16845549b32cd78"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_rbac_tokens" DROP CONSTRAINT "FK_5eaf0fdc5fb37c45f8501b109e5"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_rbac_tokens" DROP CONSTRAINT "FK_5e852a7fad1fd7aaccd9de26a44"`);
        await queryRunner.query(`ALTER TABLE "organizations_apps" DROP CONSTRAINT "FK_46a84a2a42c9e841f472eb1ea75"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_roles" DROP CONSTRAINT "FK_79ea2e648540876b18edb54d088"`);
        await queryRunner.query(`ALTER TABLE "organizations_users" DROP CONSTRAINT "FK_f655c9154cb4b9d5aa7c71ab32b"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_groups" DROP CONSTRAINT "FK_84bc2d4db479fb082116a7f18ba"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_742751c2c38cdb0a10c45595b89"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_d469f00bd5c9ea24974d9e3e7c2"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_7da68e796bd74ff5958398a8ca4"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_efc1dcc3cf176d531689fd915e4"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_e964ea6f8031d112251196b08c1"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_8a334e959348d0ed65785bf548b"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_26ae5230d078995b0128faed793"`);
        await queryRunner.query(`ALTER TABLE "db_records_associations" DROP CONSTRAINT "FK_31939f2d374495f1246d3b68d94"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_490dd73493593be97a68bc8fb0a"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_664c24172e65d87e5d8b20100b1"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_a46e280417205b3ee923bedcc22"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_3621ce50ad5e3fcfcbf06d94a98"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_cc02bcdeef8db27efd6e3039e86"`);
        await queryRunner.query(`ALTER TABLE "db_records" DROP CONSTRAINT "FK_24b2dca783762bc25dd8ce3a75a"`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" DROP CONSTRAINT "FK_fd67299bafaa2c30a056deeaa5d"`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" DROP CONSTRAINT "FK_59ed23bbfdd8f6cfc0325121baf"`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" DROP CONSTRAINT "FK_52e75cb0e982052c5575e1fe18c"`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" DROP CONSTRAINT "FK_c862c6deb396eee73c0df456290"`);
        await queryRunner.query(`ALTER TABLE "db_records_columns" DROP CONSTRAINT "FK_93220354941f4796e99e34f2c15"`);
        await queryRunner.query(`ALTER TABLE "pipelines_stages" DROP CONSTRAINT "FK_a3278dc41bdbe68cbba39425d30"`);
        await queryRunner.query(`ALTER TABLE "pipelines_stages" DROP CONSTRAINT "FK_e8aa3644d28e9bab5d1d1b52cce"`);
        await queryRunner.query(`ALTER TABLE "pipelines" DROP CONSTRAINT "FK_ad32cc5d7b97e8091ef17ba9b89"`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" DROP CONSTRAINT "FK_feaba954381ac967b153664a446"`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" DROP CONSTRAINT "FK_8251f61d2fcc30b5148a247f7c0"`);
        await queryRunner.query(`ALTER TABLE "schemas_associations" DROP CONSTRAINT "FK_eb2a7f3f51b7a66c7257264b9a6"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP CONSTRAINT "FK_b021b0b1ac5e3ce1a993049020f"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" DROP CONSTRAINT "FK_95e879899bfb3b1dbe97443d264"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" DROP CONSTRAINT "FK_e922c1aca41fa72baaa3639a6c9"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns" DROP CONSTRAINT "FK_9e87226b6fabce49346e5548916"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_validators" DROP CONSTRAINT "FK_fb091e7dd9d8ec1be6d8c47fd68"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_validators" DROP CONSTRAINT "FK_89fc70b8fbcde47641cb4179afb"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_options" DROP CONSTRAINT "FK_fa4ac76057069fdef635a9174d0"`);
        await queryRunner.query(`ALTER TABLE "schemas_columns_options" DROP CONSTRAINT "FK_04098114e230683fc3ff4dd1a8a"`);
        await queryRunner.query(`ALTER TABLE "forms_sections" DROP CONSTRAINT "FK_15096e0f477d7fcd1f150fd1629"`);
        await queryRunner.query(`ALTER TABLE "forms_sections" DROP CONSTRAINT "FK_6596623661de4c6b7570f6aa18f"`);
        await queryRunner.query(`ALTER TABLE "forms_sections" DROP CONSTRAINT "FK_0e419bed97c9fd93d91b30ebfcc"`);
        await queryRunner.query(`ALTER TABLE "forms" DROP CONSTRAINT "FK_77e5da185f11a51ff2801256dee"`);
        await queryRunner.query(`ALTER TABLE "forms" DROP CONSTRAINT "FK_a87d8b0a565a009db5ae5a6bd3a"`);
        await queryRunner.query(`ALTER TABLE "organizations_users_permissions" DROP CONSTRAINT "FK_2725271dac032fd2871647054c7"`);
        await queryRunner.query(`DROP INDEX "IDX_e88a095042a45738279739f7e2"`);
        await queryRunner.query(`DROP INDEX "IDX_e20ab75c095290ed118998372b"`);
        await queryRunner.query(`DROP TABLE "organizations_roles_links"`);
        await queryRunner.query(`DROP INDEX "IDX_ac71ee6e3f0e3058bc22d6c75a"`);
        await queryRunner.query(`DROP INDEX "IDX_03e1f2f54473ea920939dd96c1"`);
        await queryRunner.query(`DROP TABLE "organizations_users_groups_assignments"`);
        await queryRunner.query(`DROP INDEX "IDX_f24e01e5a898618a8c2e375c81"`);
        await queryRunner.query(`DROP INDEX "IDX_a3b8908ee9a8092467a2e9b37a"`);
        await queryRunner.query(`DROP TABLE "organizations_users_roles_assignments"`);
        await queryRunner.query(`DROP INDEX "IDX_5cbcc53e466bd5437e0beb65bc"`);
        await queryRunner.query(`DROP INDEX "IDX_9536888772791fcbf115bee100"`);
        await queryRunner.query(`DROP TABLE "organizations_users_groups_children_links"`);
        await queryRunner.query(`DROP INDEX "IDX_be95d8ad924da965eb3bf12520"`);
        await queryRunner.query(`DROP INDEX "IDX_0875f9845a6c16845549b32cd7"`);
        await queryRunner.query(`DROP TABLE "organizations_users_roles_links"`);
        await queryRunner.query(`DROP INDEX "logs"."IDX_cf12b45102317037673d0deaf3"`);
        await queryRunner.query(`DROP INDEX "logs"."IDX_22afbc24bf0f3cff7dc46d60fa"`);
        await queryRunner.query(`DROP TABLE "logs"."user_activity"`);
        await queryRunner.query(`DROP TABLE "organizations_users_rbac_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_b5196b5545c16907a8063e55bf"`);
        await queryRunner.query(`DROP TABLE "organizations_apps"`);
        await queryRunner.query(`DROP INDEX "IDX_9b7ca6d30b94fef571cff87688"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP INDEX "IDX_406ceafd9ea00491ba1d11297d"`);
        await queryRunner.query(`DROP TABLE "organizations_users_roles"`);
        await queryRunner.query(`DROP INDEX "IDX_c4fa864ee42a7fd672f662416d"`);
        await queryRunner.query(`DROP TABLE "organizations_users"`);
        await queryRunner.query(`DROP TYPE "organizations_users_status_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_6610518e70d99ec9d2493a1e96"`);
        await queryRunner.query(`DROP TABLE "organizations_users_groups"`);
        await queryRunner.query(`DROP INDEX "IDX_5c82ef3252b606ffc4954ff571"`);
        await queryRunner.query(`DROP INDEX "IDX_04655e8b9469f9ea3e2cbd2d5b"`);
        await queryRunner.query(`DROP INDEX "IDX_ebfff9fce03bcf7ee427439909"`);
        await queryRunner.query(`DROP INDEX "IDX_363941fa8552b7a0925d214982"`);
        await queryRunner.query(`DROP INDEX "IDX_c9565f438470a4822411c62727"`);
        await queryRunner.query(`DROP INDEX "IDX_f3b87d20ee5a26786e9ce08323"`);
        await queryRunner.query(`DROP INDEX "IDX_26ae5230d078995b0128faed79"`);
        await queryRunner.query(`DROP TABLE "db_records_associations"`);
        await queryRunner.query(`DROP INDEX "IDX_24b2dca783762bc25dd8ce3a75"`);
        await queryRunner.query(`DROP INDEX "IDX_cc02bcdeef8db27efd6e3039e8"`);
        await queryRunner.query(`DROP INDEX "IDX_3621ce50ad5e3fcfcbf06d94a9"`);
        await queryRunner.query(`DROP INDEX "IDX_a46e280417205b3ee923bedcc2"`);
        await queryRunner.query(`DROP INDEX "IDX_664c24172e65d87e5d8b20100b"`);
        await queryRunner.query(`DROP TABLE "db_records"`);
        await queryRunner.query(`DROP INDEX "IDX_5720fda0dce58a709fcf12afb4"`);
        await queryRunner.query(`DROP INDEX "IDX_eec4a6a5ffe31f3e8d12bd562a"`);
        await queryRunner.query(`DROP INDEX "IDX_8481d519cc21678b192800ccbb"`);
        await queryRunner.query(`DROP INDEX "IDX_65b2590beda07f65a496a783bf"`);
        await queryRunner.query(`DROP INDEX "IDX_59ed23bbfdd8f6cfc0325121ba"`);
        await queryRunner.query(`DROP INDEX "IDX_52e75cb0e982052c5575e1fe18"`);
        await queryRunner.query(`DROP INDEX "IDX_59a6628b5bdfb5d881835b7652"`);
        await queryRunner.query(`DROP INDEX "IDX_6b94bc71fc17b7a95734a5736b"`);
        await queryRunner.query(`DROP INDEX "IDX_93220354941f4796e99e34f2c1"`);
        await queryRunner.query(`DROP TABLE "db_records_columns"`);
        await queryRunner.query(`DROP INDEX "IDX_8044b5e5fa5d8a6cdf48b4a6e2"`);
        await queryRunner.query(`DROP INDEX "IDX_a1f0c9a6b327d726ef5e33ec0a"`);
        await queryRunner.query(`DROP TABLE "pipelines_stages"`);
        await queryRunner.query(`DROP INDEX "IDX_8ed01dc8a2d3b4bf37ff982a63"`);
        await queryRunner.query(`DROP INDEX "IDX_7a8795688c8891650a40923def"`);
        await queryRunner.query(`DROP TABLE "pipelines"`);
        await queryRunner.query(`DROP INDEX "IDX_3ea55922a23b4eada218f95b18"`);
        await queryRunner.query(`DROP INDEX "IDX_0b9f14fcb6dfb867486474265d"`);
        await queryRunner.query(`DROP INDEX "IDX_0a0c3fc7d35686ff4f36a8e6f0"`);
        await queryRunner.query(`DROP TABLE "schemas_associations"`);
        await queryRunner.query(`DROP TYPE "schemas_associations_type_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_e55cb6034153f835d8877a6c75"`);
        await queryRunner.query(`DROP INDEX "IDX_6404405490f7c095bf674b7d6a"`);
        await queryRunner.query(`DROP INDEX "IDX_1bf479a7f6831fe8c8e7cc3187"`);
        await queryRunner.query(`DROP TABLE "schemas"`);
        await queryRunner.query(`DROP INDEX "IDX_53b33faa2250a8ddd576bf13c7"`);
        await queryRunner.query(`DROP INDEX "IDX_e922c1aca41fa72baaa3639a6c"`);
        await queryRunner.query(`DROP INDEX "IDX_914ecbe9a0509addfdd746a0d7"`);
        await queryRunner.query(`DROP TABLE "schemas_columns"`);
        await queryRunner.query(`DROP TYPE "schemas_columns_type_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_c2faa69055cca30af59f4611dc"`);
        await queryRunner.query(`DROP INDEX "IDX_7e5631906ad00b128a51492bc2"`);
        await queryRunner.query(`DROP TABLE "schemas_columns_validators"`);
        await queryRunner.query(`DROP INDEX "IDX_5af5a4428b007345fa7ed374c5"`);
        await queryRunner.query(`DROP INDEX "IDX_d8d037602702d9a8519845ca63"`);
        await queryRunner.query(`DROP TABLE "schemas_columns_options"`);
        await queryRunner.query(`DROP TABLE "forms_sections"`);
        await queryRunner.query(`DROP INDEX "IDX_c7233c6f993ff36bf062f1d945"`);
        await queryRunner.query(`DROP TABLE "forms"`);
        await queryRunner.query(`DROP INDEX "IDX_b2ddd1f7b0384feaee54768904"`);
        await queryRunner.query(`DROP TABLE "organizations_users_permissions"`);
        await queryRunner.query(`DROP TYPE "organizations_users_permissions_type_enum"`);
        await queryRunner.query(`DROP TABLE "notifications"."mail_activity"`);
    }

}
