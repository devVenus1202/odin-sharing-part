import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN2160AddValueCaseToSchemaColumns1637683247157 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas_columns ADD IF NOT EXISTS value_case VARCHAR(55) DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas_columns DROP COLUMN value_case`);
    }
}
