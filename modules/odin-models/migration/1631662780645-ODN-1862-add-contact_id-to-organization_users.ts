import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1862AddContactIdToOrganizationUsers1631662780645 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE organizations_users ADD COLUMN IF NOT EXISTS contact_id uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE organizations_users DROP COLUMN IF EXISTS contact_id`);
    }

}
