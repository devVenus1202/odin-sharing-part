import {MigrationInterface, QueryRunner} from "typeorm";

export class increaseSizeOfSchemaColOptions1626720401528 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE schemas_columns_options ALTER COLUMN label TYPE varchar(55);`)
        await queryRunner.query(`ALTER TABLE schemas_columns_options ALTER COLUMN value TYPE varchar(55);`)

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
