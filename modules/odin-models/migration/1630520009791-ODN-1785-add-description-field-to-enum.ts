import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1785AddDescriptionFieldToEnum1630520009791 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas_columns_options ADD COLUMN IF NOT EXISTS description varchar(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE schemas_columns_options DROP COLUMN IF EXISTS description`);
    }

}
