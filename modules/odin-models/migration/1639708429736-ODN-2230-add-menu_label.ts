import { MigrationInterface, QueryRunner } from "typeorm";

export class ODN2230AddMenuLabel1639708429736 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas ADD IF NOT EXISTS menu_label VARCHAR(55) DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas DROP COLUMN menu_label`);
    }

}
