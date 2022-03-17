import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1544NewColumnsForInvoice1623420048760 implements MigrationInterface {
    name = 'ODN1544NewColumnsForInvoice1623420048760'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ADD "cr_number" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "contact_url" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "contact_phone" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "address_line1" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "address_line2" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "address_city" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD "address_postal_code" character varying(32)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "cr_number"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "contact_url"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "contact_phone"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "address_line1"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "address_line2"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "address_city"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "address_postal_code"`);
    }

}
