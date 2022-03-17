import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1935RecordPropertiesId1633642780781 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE db_records ADD IF NOT EXISTS hash_id text DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE db_records DROP COLUMN hash_id`);
    }

}
