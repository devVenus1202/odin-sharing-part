import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1792AddIsBulkUpdatableToSchemasColumns1633095572395 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "public"."schemas_columns" ADD "is_bulk_updatable" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "public"."schemas_columns" DROP COLUMN "is_bulk_updatable"`);
    }

}
