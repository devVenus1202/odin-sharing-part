import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN2167AddIsVisibleInGlobalNavToSchema1637934247613 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas ADD IF NOT EXISTS is_visible_in_global_nav boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas DROP COLUMN is_visible_in_global_nav`);
    }

}
