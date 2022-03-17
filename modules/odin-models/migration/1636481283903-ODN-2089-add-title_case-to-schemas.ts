import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN2089AddTitleCaseToSchemas1636481283903 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas ADD IF NOT EXISTS title_case VARCHAR(55) DEFAULT null`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas DROP COLUMN title_case`);
    }

}
