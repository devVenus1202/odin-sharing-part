import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1865JobsQueue1631997478923 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "jobs" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "organization_id" uuid NOT NULL,
            "created_by_id" uuid NOT NULL, 
            "last_modified_by_id" uuid NOT NULL, 
            "job_id" text NOT NULL, 
            "type" varchar(255) NOT NULL, 
            "status" varchar(255) NOT NULL, 
            "payload" jsonb NOT NULL, 
            "error" jsonb NULL, 
            "metadata" jsonb NULL,
            "queued_at" timestamp, 
            "completed_at" timestamp, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "pk_jobs_id" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "jobs"`);
    }

}
