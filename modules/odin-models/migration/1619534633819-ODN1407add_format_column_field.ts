import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1407addFormatColumnField1619534633819 implements MigrationInterface {
    name = 'ODN1407addFormatColumnField1619534633819'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schemas_columns" ADD "format" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schemas_columns" DROP COLUMN "format"`);
    }

}
