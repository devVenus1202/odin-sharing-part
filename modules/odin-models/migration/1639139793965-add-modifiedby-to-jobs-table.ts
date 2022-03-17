import {MigrationInterface, QueryRunner} from "typeorm";

export class addModifiedbyToJobsTable1639139793965 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE jobs ADD IF NOT EXISTS last_modified_by varchar DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE jobs DROP COLUMN last_modified_by`);
    }
}
