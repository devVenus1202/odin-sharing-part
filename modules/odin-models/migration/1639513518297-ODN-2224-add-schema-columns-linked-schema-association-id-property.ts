import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN2224AddSchemaColumnsLinkedAssociationIdProperty1639513518297 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public.schemas_columns ADD COLUMN IF NOT EXISTS linked_schema_association_id uuid DEFAULT null`);
        await queryRunner.query(`ALTER TABLE public.schemas_columns ADD CONSTRAINT "FK__schemas_columns__linked_schema_association_id__schemas_associations__id" FOREIGN KEY ("linked_schema_association_id") REFERENCES public.schemas_associations("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public.schemas_columns DROP CONSTRAINT "FK__schemas_columns__linked_schema_association_id__schemas_associations__id"`);
        await queryRunner.query(`ALTER TABLE public.schemas_columns DROP COLUMN IF EXISTS linked_schema_association_id`);
    }

}
