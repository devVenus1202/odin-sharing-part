import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1966AddZendeskUserId1634843525370 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE organizations_users ADD IF NOT EXISTS zendesk_user_id BIGINT DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE organizations_users DROP COLUMN zendesk_user_id`);
    }

}
