import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1622NewMailActivityColumns1626124627423 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE notifications.mail_activity ADD IF NOT EXISTS mail_id character varying`);
        await queryRunner.query(`ALTER TABLE notifications.mail_activity ADD IF NOT EXISTS template_label character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE notifications.mail_activity DROP COLUMN mail_id`);
        await queryRunner.query(`ALTER TABLE notifications.mail_activity DROP COLUMN template_label`);
    }

}
