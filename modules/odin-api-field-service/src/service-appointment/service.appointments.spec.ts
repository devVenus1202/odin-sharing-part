import { APIClient } from '@d19n/client/dist/common/APIClient';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { DbModule } from '@d19n/schema-manager/dist/db/db.module';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { AuthUserHelper } from '@d19n/schema-manager/dist/helpers/AuthUserHelper';
import { TestModuleConfig } from '@d19n/schema-manager/dist/helpers/tests/TestModuleConfig';
import { SchemasModule } from '@d19n/schema-manager/dist/schemas/schemas.module';
import { forwardRef } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { ServiceAppointmentsService } from './service.appointments.service';

jest.setTimeout(90000);

describe('Orders service', () => {

    let dbService: DbService;
    let serviceAppointmentsService: ServiceAppointmentsService;

    let principal: OrganizationUserEntity;

    let serviceAppointment: DbRecordEntityTransform;

    let login: {
        headers: {
            authorization: string
        }
    };

    let app: TestingModule;

    beforeEach(async () => {
        app = await new TestModuleConfig([
            forwardRef(() => DbModule),
            forwardRef(() => SchemasModule),
        ], [
            ServiceAppointmentsService,
        ], []).initialize();

        login = await AuthUserHelper.login();
        principal = await APIClient.call<OrganizationUserEntity>({
            facility: 'http',
            baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
            service: 'v1.0/users/my',
            method: 'get',
            headers: { Authorization: login.headers.authorization },
            debug: false,
        });

        serviceAppointmentsService = app.get<ServiceAppointmentsService>(ServiceAppointmentsService);
        dbService = app.get<DbService>(DbService);

    });

    test('should have public methods', (done) => {
        expect(serviceAppointmentsService.getAvailabilityByOrganization).toBeDefined();
        expect(serviceAppointmentsService.createServiceAppointmentForWorkOrder).toBeDefined();
        expect(serviceAppointmentsService.cancelServiceAppointmentForWorkOrder).toBeDefined();
        done();
    });

    test('should get the override the overview and using multiple exPolygonId', async (done) => {

        const query = {
            start: '2021-07-01',
            end: '2021-07-30',
            type: 'INSTALL',
            exPolygonId: '40652,6088,41850,39271,40901',
        }

        const options = {
            isOverview: true,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res', res)

        done();
    });

    test('should get the override the overview and use the exPolygonId', async (done) => {

        const query = {
            start: '2021-06-17',
            end: '2021-06-30',
            type: 'INSTALL',
            exPolygonId: '40652',
        }

        const options = {
            isOverview: true,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res', res)

        done();
    });

    test('should get the overview of all appointments', async (done) => {

        const query = {
            start: '2021-06-17',
            end: '2021-06-30',
            type: 'INSTALL',
        }

        const options = {
            isOverview: true,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res', res)

        done();
    });


    test('should get the availability for INSTALL appointments', async (done) => {

        const query = {
            start: '2021-07-17',
            end: '2021-07-30',
            type: 'INSTALL',
            exPolygonId: '40652',
        }

        const options = {
            isOverview: false,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res', res)

        done();
    });

    test('should return a config on or after the AvailableFrom date', async (done) => {

        const query = {
            start: '2021-08-24',
            end: '2021-08-30',
            type: 'INSTALL',
            exPolygonId: '40652',
        }

        const options = {
            isOverview: false,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res', res)

        done();
    });

    test('should get the availability for SERVICE appointments', async (done) => {

        const query = {
            start: '2021-06-22',
            end: '2021-06-30',
            type: 'SERVICE',
            addressId: '38d8df8b-cb95-4e5b-a9ca-4d2cf094789b',
        }

        const options = {
            isOverview: false,
        }

        const res = await serviceAppointmentsService.getAvailabilityByOrganization(principal, query, options)

        console.log('res')

        done();
    });


    afterAll(async () => {
        await app.close();
    });


});
