import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { SUB_SEND_DYNAMIC_EMAIL } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import {
    getAllRelations,
    getFirstRelation,
    getProperty,
    getPropertyFromRelation,
} from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { DbRecordsAssociationsService } from '@d19n/schema-manager/dist/db/records/associations/db.records.associations.service';
import { PipelineEntitysService } from '@d19n/schema-manager/dist/pipelines/pipelines.service';
import { PipelineEntitysStagesService } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.service';
import { SchemasService } from '@d19n/schema-manager/dist/schemas/schemas.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { forwardRef, Inject } from '@nestjs/common';
import * as dotenv from 'dotenv';
import moment from 'moment';
import { ServiceAppointmentsService } from '../service-appointment/service.appointments.service';
import { WorkOrderWithAppointmentCreateDto } from './types/work.order.with.appointment.create.dto';

const { FIELD_SERVICE_MODULE, NOTIFICATION_MODULE } = SchemaModuleTypeEnums;
const {
    ACCOUNT,
    CONTACT,
    PRODUCT,
    ORDER_ITEM,
    WORK_ORDER,
    CUSTOMER_DEVICE_ONT,
    CUSTOMER_DEVICE_ROUTER,
    ADDRESS,
    SERVICE_APPOINTMENT,
} = SchemaModuleEntityTypeEnums;

dotenv.config();

export class WorkOrderService {

    private dbService: DbService;
    private dbRecordsAssociationsService: DbRecordsAssociationsService;
    private serviceAppointmentsService: ServiceAppointmentsService;
    private pipelinesService: PipelineEntitysService;
    private pipelineEntitysStagesService: PipelineEntitysStagesService;
    private amqpConnection: AmqpConnection;

    constructor(
        @Inject(forwardRef(() => DbRecordsAssociationsService)) dbRecordsAssociationsService: DbRecordsAssociationsService,
        @Inject(forwardRef(() => DbService)) dbService: DbService,
        @Inject(forwardRef(() => ServiceAppointmentsService)) serviceAppointmentsService: ServiceAppointmentsService,
        pipelinesService: PipelineEntitysService,
        pipelineEntitysStagesService: PipelineEntitysStagesService,
        amqpConnection: AmqpConnection,
        private readonly schemasService: SchemasService,
    ) {
        this.dbService = dbService;
        this.dbRecordsAssociationsService = dbRecordsAssociationsService;
        this.serviceAppointmentsService = serviceAppointmentsService;
        this.pipelinesService = pipelinesService;
        this.pipelineEntitysStagesService = pipelineEntitysStagesService;
        this.amqpConnection = amqpConnection;
        this.schemasService = schemasService;
    }

    /**
     *
     * @param principal
     * @param serviceAppointmentId
     */
    public async handleWorkOrderServiceAppointmentDeleted(
        principal: OrganizationUserEntity,
        serviceAppointmentId: string,
    ) {
        try {
            // Get the work order schema
            const workOrderSchema = await this.schemasService.getSchemaByOrganizationAndEntity(
                principal,
                `${FIELD_SERVICE_MODULE}:${WORK_ORDER}`,
            );

            // get the work order records using the deleted service appointment Id and work Order schema
            const parentRecordIds = await this.dbRecordsAssociationsService.getRelatedParentRecordIds(
                principal,
                {
                    recordId: serviceAppointmentId,
                    parentSchemaId: workOrderSchema.id,
                    relatedAssociationId: undefined,
                },
                { withDeleted: true },
            );

            if (parentRecordIds && parentRecordIds.length === 1) {
                // Update the work order stage
                const stageKey = 'WorkOrderStageAccepted';
                const workOrderId = parentRecordIds[0];

                // replace with get stage and use the stage entity which will contain rules
                const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    workOrderId,
                    [],
                );

                // Only if the work order is not in the cancelled stage
                if (!workOrder.stage.isFail) {
                    await this.changeWorkOrderStage(principal, workOrderId, stageKey);
                }
                // await this.sendEmail(principal, workOrderId, 'SENDGRID_WORK_ORDER_CANCELED_CONFIRMATION');
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param principal
     * @param serviceAppointmentId
     */
    public async handleWorkOrderServiceAppointmentCreated(
        principal: OrganizationUserEntity,
        serviceAppointmentId: string,
    ) {
        try {
            // Get the service appointment work order
            const serviceAppointment = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                serviceAppointmentId,
                [ WORK_ORDER ],
            );

            // get the work order records
            const relatedRecords = serviceAppointment[WORK_ORDER].dbRecords;

            if (relatedRecords && relatedRecords.length === 1) {
                // Update the work order stage
                let stageKey = 'WorkOrderStageScheduled';
                const relatedWorkOrder = relatedRecords[0];

                // replace with get stage and use the stage entity which will contain rules
                const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    relatedWorkOrder.id,
                    [ ADDRESS ],
                );

                const address = getFirstRelation(workOrder, ADDRESS)
                const surveyCompleteDate = getProperty(address, 'ExternalInstallCompleteDate')

                if (surveyCompleteDate) {
                    // if the survey complete stage is filled in move to survey complete
                    stageKey = 'WorkOrderStageSurveyComplete';
                }

                await this.changeWorkOrderStage(principal, workOrder.id, stageKey);
                await this.sendEmail(principal, workOrder.id, 'SENDGRID_WORK_ORDER_CONFIRMATION');

                return workOrder;
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }


    /**
     *
     * @param principal
     * @param workOrderId
     * @param stageKey
     */
    public async changeWorkOrderStage(principal: OrganizationUserEntity, workOrderId: string, stageKey: string) {
        try {
            const stage = await this.pipelineEntitysStagesService.getPipelineAndStagesByStageKey(
                principal.organization,
                stageKey,
            );
            const updateDto = new DbRecordCreateUpdateDto();
            updateDto.entity = `${FIELD_SERVICE_MODULE}:${WORK_ORDER}`;
            updateDto.stageId = stage.id;

            const res = await this.dbService.updateDbRecordsByPrincipalAndId(principal, workOrderId, updateDto);

            return res;
        } catch (e) {
            console.error(e);

            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param principal
     * @param orderId
     * @param body
     * @param headers
     */
    public async createWorkOrderFromOrder(
        principal: OrganizationUserEntity,
        orderId: string,
        body: WorkOrderWithAppointmentCreateDto,
    ) {
        try {

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ CONTACT, ADDRESS, ORDER_ITEM, WORK_ORDER, ACCOUNT ],
            );
            const orderContact = order[CONTACT].dbRecords;
            const orderAddress = order[ADDRESS].dbRecords;
            const orderItems = order[ORDER_ITEM].dbRecords;
            const account = order[ACCOUNT].dbRecords;

            let orderItemAssociations: DbRecordAssociationCreateUpdateDto[] = [];

            if (body.orderItems) {
                orderItemAssociations = body.orderItems;
            } else {
                orderItemAssociations = orderItems.map(item => ({
                    recordId: item.id,
                    quantity: 1,
                }))
            }

            const addrSalesStatus = getPropertyFromRelation(order, ADDRESS, 'SalesStatus');

            // Validate Order Address Sales status
            await this.validateAddressStatus(addrSalesStatus);

            await this.validateCreateWorkOrderFromOrder(order, body);

            const addrFullAddress = getPropertyFromRelation(order, ADDRESS, 'FullAddress');
            const addrUdprn = getPropertyFromRelation(order, ADDRESS, 'UDPRN');

            let type;
            if (body.Type) {
                // old way will be deprecated
                type = body.Type
            } else {
                // new in ODN-1534 passing in properties to conform with record create
                type = body['properties'] ? body['properties']['Type'] : 'INSTALL';
            }

            // Create an install work order
            // ODN-1534 - introduced record types for work orders
            const newWorkOrder = new DbRecordCreateUpdateDto();
            newWorkOrder.entity = `${FIELD_SERVICE_MODULE}:${WORK_ORDER}`;
            newWorkOrder.title = addrFullAddress;
            newWorkOrder.type = type;
            newWorkOrder.properties = {
                ...{
                    Type: type,
                    RequestedDeliveryDate: body['Date'] ? body.Date : undefined,
                    UDPRN: addrUdprn,
                },
                ...body['properties'] ? body['properties'] : {},
            };
            newWorkOrder.associations = [
                {
                    recordId: order.id,
                },
                {
                    recordId: orderAddress[0].id,
                },
                {
                    recordId: orderContact[0].id,
                },
                {
                    recordId: account[0].id,
                },
                ...orderItemAssociations,
            ];

            const workOrder = await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                [ newWorkOrder ],
                { upsert: false },
            );

            // Create a service appointment (optional on create)
            if (body && body['Date'] && body['TimeBlock']) {
                await this.serviceAppointmentsService.createServiceAppointmentForWorkOrder(
                    principal,
                    workOrder[0].id,
                    {
                        ...body,
                        ExPolygonId: getProperty(orderAddress[0], 'ExPolygonId'),
                    },
                );
            }

            return workOrder;
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation, e.data);
        }
    }

    /**
     *
     * @param order
     * @private
     */
    private validateCreateWorkOrderFromOrder(order: DbRecordEntityTransform, body: WorkOrderWithAppointmentCreateDto) {

        const { CONTACT, ADDRESS, ORDER_ITEM, WORK_ORDER } = SchemaModuleEntityTypeEnums;

        const orderItem = order[ORDER_ITEM].dbRecords;
        const orderAddress = order[ADDRESS].dbRecords;
        const orderContact = order[CONTACT].dbRecords;
        const orderWorkOrders = order[WORK_ORDER].dbRecords;

        if (!orderItem) {
            throw new ExceptionType(400, 'please add order items to the order');
        }
        if (!orderContact) {
            throw new ExceptionType(400, 'please add a contact to the order');
        }
        if (!orderAddress) {
            throw new ExceptionType(400, 'please add an address to the order');
        }
        if (orderWorkOrders) {
            // verify that there is not an Install work order already created and not in the success / fail stage
            const workOrdersNotCancelled = orderWorkOrders.find(elem => !elem.stage.isFail);

            if (workOrdersNotCancelled) {
                // introduced record types in ODN-1543
                let type;
                let subType;
                if (body.Type) {
                    // old way will be deprecated
                    type = body.Type
                } else if (body['properties']) {
                    // new in ODN-1534 passing in properties to conform with record create
                    // default type should be INSTALL
                    type = (body['properties']['Type'] && body['properties']['Type'].length !== 0) ? body['properties']['Type'] : 'INSTALL';
                    subType = (body['properties']['SubType'] && body['properties']['SubType'].length !== 0) ? body['properties']['SubType'] : null;
                }

                const workOrderType = workOrdersNotCancelled.type || getProperty(workOrdersNotCancelled, 'Type');

                // Cannot have 2X work orders of type INSTALL for a single order
                // We can have a work order type INSTALL with a subType of UPGRADE
                if (workOrderType === 'INSTALL' && type === 'INSTALL' && subType !== 'UPGRADE') {
                    throw new ExceptionType(400, 'we already have an install work order in progress or completed.');
                }
            }
        }
    }

    /**
     * When cancelling a work order we want to
     * cancel the customer work order
     * cancel build work orders that are not in build scheduled
     * and delete the current service appointment on the customer work order
     * @param principal
     * @param workOrderId
     * @param headers
     */
    public async cancelWorkOrderByPrincipalAndId(
        principal: OrganizationUserEntity,
        workOrderId: string,
    ) {
        try {

            const { WORK_ORDER, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

            const customerWorkOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ WORK_ORDER, SERVICE_APPOINTMENT ],
            );
            const workOrderPipeline = await this.pipelinesService.getPipelineAndStagesByModuleName(
                principal.organization,
                SchemaModuleTypeEnums.FIELD_SERVICE_MODULE,
                WORK_ORDER,
            );

            // Get the customer work order pipeline
            // Get the customer work order cancelled stage
            const customerWorkOrderCancelledStage = workOrderPipeline.stages.find(elem => elem.key === 'WorkOrderStageCancelled');
            // Move customer work order to cancelled if it is not in the Done stage
            if (customerWorkOrder.stage.position < 3) {
                const body = new DbRecordCreateUpdateDto();
                body.schemaId = customerWorkOrder.schemaId;
                body.stageId = customerWorkOrderCancelledStage.id;
                await this.dbService.updateDbRecordsByPrincipalAndId(principal, workOrderId, body);
            }
            // Delete service appointment
            if (customerWorkOrder[SERVICE_APPOINTMENT] && customerWorkOrder[SERVICE_APPOINTMENT].dbRecords) {
                await this.dbService.deleteByPrincipalAndId(
                    principal,
                    customerWorkOrder[SERVICE_APPOINTMENT].dbRecords[0].id,
                );
            }
            return { status: 'processed' };
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation, e.data);
        }
    }

    /**
     *
     * @param principal
     * @param recordId
     * @param requestBody
     * @param headers
     */
    public async handleStageChange(
        principal: OrganizationUserEntity,
        recordId: any,
        requestBody: DbRecordCreateUpdateDto,
    ) {
        try {
            // replace with get stage and use the stage entity which will contain rules
            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                recordId,
                [],
            );
            if (workOrder.stage && workOrder.stage.key === 'WorkOrderStageCancelled') {
                // run work order cancellation process
                await this.cancelWorkOrderByPrincipalAndId(principal, workOrder.id);
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation, e.data);
        }
    }

    /**
     * templateLabels:
     * SENDGRID_WORK_ORDER_STAGE_CHANGE
     * SENDGRID_WORK_ORDER_CONFIRMATION
     * SENDGRID_WORK_ORDER_CANCELED_CONFIRMATION
     *
     * @param principal
     * @param workOrderId
     * @param templateLabel
     * @param body
     */
    public async sendEmail(
        principal: OrganizationUserEntity,
        workOrderId: string,
        templateLabel: string,
        body?: SendgridEmailEntity,
    ): Promise<any> {
        try {

            const { CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT ],
            );

            await this.validateWorkOrderHasRequiredRelations(workOrder);

            const workOrderAddress = workOrder[ADDRESS].dbRecords;
            const workOrderServiceApp = workOrder[SERVICE_APPOINTMENT].dbRecords;
            const workOrderItems = workOrder[ORDER_ITEM].dbRecords;


            const newEmail = new SendgridEmailEntity();
            newEmail.to = getPropertyFromRelation(workOrder, CONTACT, 'EmailAddress');
            newEmail.from = principal.organization.billingReplyToEmail;
            newEmail.templateLabel = templateLabel;
            newEmail.dynamicTemplateData = Object.assign({}, {
                recordId: workOrderId,
                recordNumber: workOrder.recordNumber,
                contactFirstName: getPropertyFromRelation(workOrder, CONTACT, 'FirstName'),
                address: workOrderAddress[0]['properties'],
                workOrder: workOrder['properties'],
                serviceAppointment: Object.assign({}, workOrderServiceApp[0].properties, {
                    Date: moment(getPropertyFromRelation(workOrder, SERVICE_APPOINTMENT, 'Date')).format(
                        'DD-MM-YYYY'),
                    TimeRange: getPropertyFromRelation(
                        workOrder,
                        SERVICE_APPOINTMENT,
                        'TimeBlock',
                    ) === 'AM' ? '8am - 1pm' : '1pm - 6pm',
                }),
                currentStage: workOrder.stage.name,
                orderItems: workOrderItems.map(elem => ({
                    lineItemName: elem.title,
                    lineItemQuantity: getProperty(elem, 'Quantity'),
                    lineItemDescription: getProperty(elem, 'Description'),
                })),
                organizationName: principal.organization.name,
            }, body ? body.dynamicTemplateData : {});

            await this.amqpConnection.publish(
                NOTIFICATION_MODULE,
                `${NOTIFICATION_MODULE}.${SUB_SEND_DYNAMIC_EMAIL}`,
                {
                    principal,
                    body: newEmail,
                },
            )

            return { status: 'processed' };
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }


    /**
     *
     * @param workOrder
     */
    private async validateWorkOrderHasRequiredRelations(workOrder: DbRecordEntityTransform) {

        const { CONTACT, ADDRESS, ORDER_ITEM, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

        const workOrderAddress = workOrder[ADDRESS].dbRecords;
        const workOrderServiceApp = workOrder[SERVICE_APPOINTMENT].dbRecords;
        const workOrderItems = workOrder[ORDER_ITEM].dbRecords;
        const contact = workOrder[CONTACT].dbRecords;

        if (!contact) {
            throw new ExceptionType(400, 'please add a contact to the work order');
        }
        if (!workOrderItems) {
            throw new ExceptionType(400, 'please add order items to the work order');
        }
        if (!workOrderAddress) {
            throw new ExceptionType(400, 'please add an address to the work order');
        }
        if (!workOrderServiceApp) {
            throw new ExceptionType(400, 'please add an appointment');
        }
    }


    /**
     *
     * @param principal
     * @param recordId
     * @param requestBody
     */
    async validateStageChange(principal: OrganizationUserEntity, workOrderId: any, requestBody: any) {

        try {

            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ ORDER_ITEM, WORK_ORDER, ADDRESS, CONTACT, SERVICE_APPOINTMENT ],
            );
            const stage = await this.pipelineEntitysStagesService.getPipelineStageByOrganizationAndId(
                principal.organization,
                requestBody.stageId,
            );

            const workOrderOrderItems = workOrder[ORDER_ITEM].dbRecords;
            const serviceAppointment = workOrder[SERVICE_APPOINTMENT].dbRecords;

            if (!stage.isDefault && !stage.isFail) {
                await this.validateWorkOrderHasRequiredRelations(workOrder);
            }

            // validate order items
            if (!workOrderOrderItems) {
                throw new ExceptionType(400, 'the work order is missing order items, please add them');
            } else {
                // cannot move to any stage other then the following without a Service Appointment
                if (!stage.isFail && !stage.isDefault) {
                    if (!serviceAppointment) {
                        throw new ExceptionType(400, 'no service appointment is scheduled, please add one');
                    }
                }

                // await this.validateWorkOrderIsFulfilled(principal,stage, workOrderOrderItems)

                return true;
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * Validate the work order is fulfilled
     *
     * @param principal
     * @param stage
     * @param workOrderOrderItems
     * @private
     */
    private async validateWorkOrderIsFulfilled(
        principal: OrganizationUserEntity,
        stage: PipelineStageEntity,
        workOrderOrderItems: DbRecordEntityTransform[],
    ) {
        // Cannot move to success without devices scanned in
        if (stage.isSuccess && !stage.isFail) {
            for(const orderItem of workOrderOrderItems) {

                const item = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    orderItem.id,
                    [ PRODUCT, CUSTOMER_DEVICE_ONT, CUSTOMER_DEVICE_ROUTER ],
                );

                const productCategory = getPropertyFromRelation(item, PRODUCT, 'Category');
                const productType = getPropertyFromRelation(item, PRODUCT, 'Type');
                const requiresProvisioning = getPropertyFromRelation(item, PRODUCT, 'RequiresProvisioning');

                // Check that the ONT has values for the BROADBAND > BASE_PRODUCT
                if (!item[CUSTOMER_DEVICE_ONT].dbRecords && productCategory === 'BROADBAND' && productType === 'BASE_PRODUCT' && requiresProvisioning === 'YES') {

                    throw new ExceptionType(400, `No ONT added for order item ${item.title}`);

                } else if (item[CUSTOMER_DEVICE_ONT].dbRecords && productCategory === 'BROADBAND' && productType === 'BASE_PRODUCT' && requiresProvisioning === 'YES') {

                    // Verify ponSerialNumber
                    const serialNumber = getPropertyFromRelation(item, CUSTOMER_DEVICE_ONT, 'SerialNumber');

                    if (!serialNumber || serialNumber.length < 5) {
                        throw new ExceptionType(
                            400,
                            `ONT serial number empty or invalid for order item ${item.title}`,
                        );
                    }

                    // Verify ponPort
                    const ponPort = getPropertyFromRelation(item, CUSTOMER_DEVICE_ONT, 'PONPort');
                    if (!ponPort) {
                        throw new ExceptionType(
                            400,
                            `ONT PON number empty or invalid for order item ${item.title}`,
                        );
                    }
                }

                // Check that the router has values for any BROADBAND Products
                if (!item[CUSTOMER_DEVICE_ROUTER].dbRecords && productCategory === 'BROADBAND' && requiresProvisioning === 'YES') {
                    throw new ExceptionType(400, `No Router added for order item ${item.title}`);
                } else if (item[CUSTOMER_DEVICE_ROUTER].dbRecords && productCategory === 'BROADBAND' && requiresProvisioning === 'YES') {
                    // validate that order items have an router with a serial number
                    for(const router of item[CUSTOMER_DEVICE_ROUTER].dbRecords) {
                        const serialNumber = getPropertyFromRelation(
                            item,
                            CUSTOMER_DEVICE_ROUTER,
                            'SerialNumber',
                        );
                        if (!serialNumber || serialNumber.length < 5) {
                            throw new ExceptionType(
                                400,
                                `Router serial number empty or invalid for order item ${item.title} and router ${router.title}`,
                            );
                        }
                    }
                }
            }
        }
    }

    /**
     *
     * @param principal
     * @param workOrderId
     * @param body
     */
    async handleNotificationRules(
        principal: OrganizationUserEntity,
        workOrderId: string,
        body: DbRecordCreateUpdateDto,
    ) {
        try {
            // 1. get notification rules for the module and entity
            const notificationRules = await this.dbService.getManyDbRecordsByPropertiesTransformed(principal, {
                entity: `${SchemaModuleTypeEnums.SCHEMA_MODULE}:Workflow`,
                properties: [
                    {
                        columnName: 'ModuleName',
                        operator: 'EQ',
                        value: FIELD_SERVICE_MODULE,
                    },
                    {
                        columnName: 'EntityName',
                        operator: 'EQ',
                        value: WORK_ORDER,
                    },
                ],
            });

            console.log('notificationRules', notificationRules)

            if (notificationRules && notificationRules.length > 0) {

                let entities = [ SERVICE_APPOINTMENT ]

                for(const rule of notificationRules) {
                    if (getProperty(rule, 'NestedEntityName') !== SERVICE_APPOINTMENT) {
                        entities.push(getProperty(rule, 'NestedEntityName'))
                    }
                }

                console.log('entities', entities)
                console.log('unique', [ ...new Set(entities) ])

                // 2. load the work order with entities from the rules
                const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    workOrderId,
                    [ ...new Set(entities) ],
                );

                // 3. validate work order and nested entities against the rules
                for(const rule of notificationRules) {
                    let expectedMatches = 0;
                    let actualMatches = 0;

                    console.log('workOrder', workOrder)
                    if (getProperty(rule, 'StageKey')) {
                        expectedMatches++
                        // check for the entity being in a stage
                        if (workOrder?.stage?.key === getProperty(rule, 'StageKey')) {
                            actualMatches++
                        }

                    }
                    if (getProperty(rule, 'PropertyName') && getProperty(rule, 'PropertyValue')) {
                        expectedMatches++
                        // check for the entity having property and value
                        if (getProperty(workOrder, getProperty(rule, 'PropertyName')) === getProperty(
                            rule,
                            'PropertyValue',
                        )) {
                            actualMatches++
                        }
                    }

                    if (getProperty(rule, 'NestedEntityName') && getProperty(rule, 'NestedPropertyName') && getProperty(
                        rule,
                        'NestedPropertyValue',
                    )) {
                        expectedMatches++
                        // check for the entity having property and value
                        if (getFirstRelation(workOrder, getProperty(rule, 'NestedEntityName'))) {
                            for(const relation of getAllRelations(workOrder, getProperty(rule, 'NestedEntityName'))) {
                                if (getProperty(relation, getProperty(rule, 'NestedPropertyName')) === getProperty(
                                    rule,
                                    'NestedPropertyValue',
                                )) {
                                    actualMatches++
                                }
                            }
                        }
                    }

                    if (actualMatches >= expectedMatches) {
                        // Send notification
                        console.log('send notification')
                    }
                }


            }


        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param principal
     * @param workOrderId
     * @param requestBody
     */
    async validateWorkOrder(
        principal: OrganizationUserEntity,
        workOrderId: any,
        requestBody: any,
    ) {

        try {

            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [],
            );

            // if workOrder stage isFail don't allow user to edit it
            if (workOrder?.stage?.isFail) {
                throw new ExceptionType(
                    400,
                    'User can not edit this specific record.',
                );
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }

    }

    /**
     * @param addrSalesStatus
     */
    private async validateAddressStatus(addrSalesStatus: string) {

        if (addrSalesStatus !== 'ORDER') {
            throw new ExceptionType(400, 'Order address status must be Order');
        }

    }
}
