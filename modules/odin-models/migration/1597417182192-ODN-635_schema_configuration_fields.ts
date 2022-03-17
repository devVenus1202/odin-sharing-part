import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN635SchemaConfigurationFields1597417182192 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "queryable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "replicateable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "retrievable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "searchable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "triggerable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "undeletable" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "schemas" ADD COLUMN IF NOT EXISTS "updateable" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "queryable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "replicateable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "retrievable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "searchable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "triggerable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "undeletable"`);
        await queryRunner.query(`ALTER TABLE "schemas" DROP COLUMN IF EXISTS "updateable"`);
    }

}
