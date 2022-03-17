import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1893BatchJobs1632236879503 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE jobs ADD IF NOT EXISTS name character varying default null`);
        await queryRunner.query(`ALTER TABLE jobs ADD IF NOT EXISTS hostname character varying default null`);
        await queryRunner.query(`ALTER TABLE jobs ADD IF NOT EXISTS batch_job_id character varying default null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE jobs DROP COLUMN IF EXISTS name`);
        await queryRunner.query(`ALTER TABLE jobs DROP COLUMN IF EXISTS hostname`);
        await queryRunner.query(`ALTER TABLE jobs DROP COLUMN IF EXISTS batch_job_id`);
    }

}
