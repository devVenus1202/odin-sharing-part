import { APIClient } from '@d19n/client/dist/common/APIClient';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { DbModule } from '@d19n/schema-manager/dist/db/db.module';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { AuthUserHelper } from '@d19n/schema-manager/dist/helpers/AuthUserHelper';
import { TestModuleConfig } from '@d19n/schema-manager/dist/helpers/tests/TestModuleConfig';
import { PipelineEntitysModule } from '@d19n/schema-manager/dist/pipelines/pipelines.module';
import { PipelineEntitysStagesModule } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.module';
import { SchemasModule } from '@d19n/schema-manager/dist/schemas/schemas.module';
import { forwardRef } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { ServiceAppointmentModule } from '../service-appointment/service.appointment.module';
import { WorkOrderWithAppointmentCreateDto } from './types/work.order.with.appointment.create.dto';
import { WorkOrderService } from './work.order.service';

jest.setTimeout(90000);

describe('Orders service', () => {

    let dbService: DbService;
    let workOrderService: WorkOrderService;

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
            forwardRef(() => ServiceAppointmentModule),
            PipelineEntitysModule,
            PipelineEntitysStagesModule,
        ], [
            WorkOrderService,
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

        workOrderService = app.get<WorkOrderService>(WorkOrderService);
        dbService = app.get<DbService>(DbService);

    });

    test('should have public methods', (done) => {
        expect(workOrderService.handleWorkOrderServiceAppointmentDeleted).toBeDefined();
        expect(workOrderService.handleWorkOrderServiceAppointmentCreated).toBeDefined();
        expect(workOrderService.changeWorkOrderStage).toBeDefined();
        expect(workOrderService.createWorkOrderFromOrder).toBeDefined();
        expect(workOrderService.cancelWorkOrderByPrincipalAndId).toBeDefined();
        expect(workOrderService.handleStageChange).toBeDefined();
        expect(workOrderService.sendEmail).toBeDefined();
        expect(workOrderService.validateStageChange).toBeDefined();
        expect(workOrderService.handleNotificationRules).toBeDefined();
        done();
    });

    test('should check notification rules for an INSTALL work order', async (done) => {

        const workOrderId = '';

        const body: DbRecordCreateUpdateDto = {
            entity: 'FieldServiceModule:WorkOrder',
            type: 'INSTALL',
            properties: {
                ContractorComments: 'CUSTOMER_CANCEL',
            },
        }

        const res = await workOrderService.handleNotificationRules(principal, workOrderId, body)

        console.log('res', res)

        done();
    });


    test('should create a new work order from an existing order', async (done) => {

        const orderId = 'e7ff0f26-15d0-4551-a3a7-65e859b012bd';

        const body: WorkOrderWithAppointmentCreateDto = {
            Date: '2021-09-23',
            TimeBlock: 'AM',
            properties: {
                Type: 'INSTALL',
                SubType: '',
            },
            orderItems: [],
        }

        const res = await workOrderService.createWorkOrderFromOrder(principal, orderId, body)

        console.log('res', res)

        done();
    });

    afterAll(async () => {
        await app.close();
    });


});
