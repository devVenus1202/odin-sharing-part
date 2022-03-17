import {MigrationInterface, QueryRunner} from "typeorm";

export class ODN1866AlterGocardlessEventsTable1632850652924 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "links_customer" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "links_customer_bank_account" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "links_payment_request_payment" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "billing_request" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "billing_request_flow" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "bank_authorisation" character varying`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" ADD IF NOT EXISTS "institution_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "links_customer"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "links_customer_bank_account"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "links_payment_request_payment"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "billing_request"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "billing_request_flow"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "bank_authorisation"`);
        await queryRunner.query(`ALTER TABLE "gocardless"."events" DROP COLUMN "institution_id"`);
    }

}
