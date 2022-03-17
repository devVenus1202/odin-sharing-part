import { BillingDatesCalculator } from '@d19n/common/dist/billing/helpers/BillingDatesCalculator';
import { OrderInvoiceCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceCalculations';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { SUB_CANCEL, SUB_SEND_DYNAMIC_EMAIL } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { IDbRecordCreateUpdateRes } from '@d19n/models/dist/schema-manager/db/record/interfaces/interfaces';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty, getPropertyFromRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { DbRecordsAssociationsService } from '@d19n/schema-manager/dist/db/records/associations/db.records.associations.service';
import { DbRecordsService } from '@d19n/schema-manager/dist/db/records/db.records.service';
import { PipelineEntitysStagesService } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.service';
import { SchemasService } from '@d19n/schema-manager/dist/schemas/schemas.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { APIClient } from '@d19n/client/dist/common/APIClient';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { AuthUserHelper } from '@d19n/schema-manager/dist/helpers/AuthUserHelper';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import moment from 'moment';
import { CheckoutDto } from 'src/checkout/type/checkout.dto';
import { OrdersItemsService } from './items/orders.items.service';
import { ProcessOrderBillingDto } from './types/ProcessOrderBillingDto';

dotenv.config();

const { ORDER_MODULE, FIELD_SERVICE_MODULE, NOTIFICATION_MODULE } = SchemaModuleTypeEnums;
const { ORDER, WORK_ORDER, ORDER_ITEM } = SchemaModuleEntityTypeEnums;

interface Response {
    ContractStartDate?: string,
    ContractEndDate?: string,
    ContractType?: string,
    BillingStartDate?: string,
    BillingMonths?: any,
}

@Injectable()
export class OrdersService {

    private schemasService: SchemasService;
    private dbService: DbService;
    private dbRecordsService: DbRecordsService;
    private dbRecordsAssociationsService: DbRecordsAssociationsService;
    private ordersItemsService: OrdersItemsService;
    private pipelineEntitysStagesService: PipelineEntitysStagesService;
    private amqpConnection: AmqpConnection;

    constructor(
        @Inject(forwardRef(() => OrdersItemsService)) ordersItemsService: OrdersItemsService,
        dbRecordsAssociationsService: DbRecordsAssociationsService,
        dbService: DbService,
        schemasService: SchemasService,
        dbRecordsService: DbRecordsService,
        pipelineEntitysStagesService: PipelineEntitysStagesService,
        amqpConnection: AmqpConnection,
    ) {
        this.schemasService = schemasService;
        this.dbService = dbService;
        this.dbRecordsService = dbRecordsService;
        this.dbRecordsAssociationsService = dbRecordsAssociationsService;
        this.ordersItemsService = ordersItemsService;
        this.pipelineEntitysStagesService = pipelineEntitysStagesService;
        this.amqpConnection = amqpConnection;
    }


    /**
     *
     * @param principal
     * @param orderId
     * @param 1tId
     * @param headers
     */
    public async addDiscountByPrincipal(
        principal: OrganizationUserEntity,
        orderId: string,
        relatedDiscountId: string,
    ): Promise<IDbRecordCreateUpdateRes> {
        try {

            const discount = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                relatedDiscountId,
                [],
            );

            const update: DbRecordCreateUpdateDto = {
                entity: `${ORDER_MODULE}:${ORDER}`,
                properties: {
                    DiscountValue: discount.properties['DiscountValue'],
                    DiscountType: discount.properties['DiscountType'],
                    DiscountUnit: discount.properties['DiscountUnit'],
                    DiscountLength: discount.properties['DiscountLength'],
                    TrialUnit: discount.properties['TrialUnit'],
                    TrialLength: discount.properties['TrialLength'],
                },
            };

            await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, update);

            // ODN-1660 recalculate items as well
            await this.recalculateAndUpdateOrderItemsTotals(principal, orderId);

            return await this.computeOrderTotals(principal, orderId);

        } catch (e) {
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param orderId
     * @param headers
     */
    public async removeDiscountByPrincipal(
        principal: OrganizationUserEntity,
        orderId: string,
    ): Promise<IDbRecordCreateUpdateRes> {
        try {
            await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, {
                entity: `${ORDER_MODULE}:${ORDER}`,
                properties: {
                    DiscountValue: 0,
                    DiscountType: 'AMOUNT',
                    DiscountUnit: 'MONTHS',
                    DiscountLength: 0,
                    TrialUnit: 'MONTHS',
                    TrialLength: 0,
                },
            });

            // ODN-1660 recalculate items as well
            await this.recalculateAndUpdateOrderItemsTotals(principal, orderId);

            return await this.computeOrderTotals(principal, orderId);
        } catch (e) {
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     * Update a records stage
     * @param principal
     * @param orderId
     * @param requestBody
     * @param headers
     */
    public async handleStageChange(
        principal: OrganizationUserEntity,
        orderId: string,
        requestBody: DbRecordCreateUpdateDto,
    ) {
        try {
            // replace with get stage and use the stage entity which will contain rules
            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ WORK_ORDER ],
            );

            const update = new DbRecordCreateUpdateDto()
            update.stageId = order.stage.id;

            await this.validateStageChange(principal, orderId, update)

            if (order.stage && order.stage.key === 'OrderStagePreOrder') {
                await this.sendOrderEmail(principal, orderId);
            }

            if (order.stage && order.stage.key === 'OrderStageSold') {
                await this.sendOrderEmail(principal, orderId);
                await this.sendInstallRequestEmail(principal, order.id);
            }

            if (order.stage && order.stage.key === 'OrderStageActive') {

                const update = new DbRecordCreateUpdateDto();
                update.entity = 'OrderModule:Order';
                update.properties = {
                    ActivationStatus: 'CLOSED',
                    ActiveDate: moment().utc().format('YYYY-MM-DD'),
                };


                console.log('HANDLE_STAGE_CHANGE_TO_ACTIVE', update)

                await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, update);

                await this.processOrderForBilling(
                    principal,
                    orderId,
                    {
                        BillingStartDate: getProperty(order, 'BillingStartDate') || moment().utc().format('YYYY-MM-DD'),
                        ContractStartDate: getProperty(
                            order,
                            'ContractStartDate',
                        ) || moment().utc().format('YYYY-MM-DD'),
                    },
                );


                await this.sendWelcomeEmail(principal, orderId, 'SENDGRID_YOUFIBRE_WELCOME_EMAIL');
                if (['development', 'test'].includes(process.env.NODE_ENV)) {
                    await this.sendRegisterLinkToCustomer(principal, orderId)
                }
            }

            if (order.stage && order.stage.key === 'OrderStageCancelled') {
                const update = new DbRecordCreateUpdateDto();
                update.entity = 'OrderModule:Order';
                update.properties = {
                    CancelledDate: moment().utc().format('YYYY-MM-DD'),
                };
                await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, update);
                // check for work orders
                if (order[WORK_ORDER].dbRecords) {
                    for(const workOrder of order[WORK_ORDER].dbRecords) {
                        this.amqpConnection.publish(
                            FIELD_SERVICE_MODULE,
                            `${FIELD_SERVICE_MODULE}.${WORK_ORDER}.${SUB_CANCEL}`,
                            {
                                principal,
                                workOrderId: workOrder.id,
                            },
                        )
                    }
                }

            }

            return order;
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * Handles BillingDay field change and process OrderItems for billing
     * to update BillingNextDate and InvoiceNextDate
     * @param principal
     * @param orderId
     * @param requestBody
     * @returns
     */
    public async handleBillingDayChange(
        principal: OrganizationUserEntity,
        orderId: string,
        requestBody: DbRecordCreateUpdateDto,
    ) {
        try {
            // check if BillingDay field changed, valid and Order in Active stage
            const changedBillingDay = Number(requestBody.properties ? requestBody.properties['BillingDay'] : undefined);
            if (Number.isNaN(changedBillingDay) || changedBillingDay < 1 || changedBillingDay > 28) {
                return;
            }
            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            );
            if (!order.stage || order.stage.key !== 'OrderStageActive') {
                return;
            }

            // process OrderItems for Billing to update OrderItems BillingNextDate and InvoiceNextDate
            if (order[ORDER_ITEM].dbRecords) {
                const orderItemIds = order[ORDER_ITEM].dbRecords.map(elem => elem.id);

                await this.ordersItemsService.processOrderItemsForBilling(
                    principal,
                    orderId,
                    orderItemIds,
                );
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }


    public async getOrderPaymentList(
        principal: OrganizationUserEntity,
        orderId: string,
    ) {

        try {

            const { PRODUCT, ORDER_ITEM } = SchemaModuleEntityTypeEnums

            let response: Response = {
                BillingMonths: [],
            }

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            )

            const { contractEndDate, contractType } = await this.computeContractEndDate(
                principal,
                getProperty(order, 'ContractStartDate'),
                order[ORDER_ITEM].dbRecords,
            );

            const contractStartDate = getProperty(order, 'ContractStartDate')


            /* Calculate billing start date */
            const adjustedBillingStartDateToBillingDay = BillingDatesCalculator.getAdjustedBillingStartDateToBillingDay(
                order);


            /* If order is closed and there are Order items... */
            if (order.stage.isSuccess && order[ORDER_ITEM].dbRecords) {

                // ODN-1660 sort order items to apply the order level AMOUNT discount correctly
                const sortedOrderItems = OrderInvoiceItemCalculations.sortItemsByProductTypeAndPrice(order[ORDER_ITEM].dbRecords);

                const orderItemIds = sortedOrderItems.map(elem => elem.id)

                /* Get number of all Billing months */
                const numberOfBillingMonths = Math.abs(moment(contractStartDate).diff(contractEndDate, 'months'))

                /* Go through each billing month */
                for(let i = 0; i < numberOfBillingMonths; i++) {
                    response.BillingMonths.push({
                        Date: moment(adjustedBillingStartDateToBillingDay).add(i, 'months').format('YYYY-MM-DD'),
                        OrderItems: [],
                    })
                }

                /* Run through billing dates and construct dates/prices for Order items */
                for(const month of response.BillingMonths) {

                    // ODN-1660 define the order level discount object to reduce its value if it is of type AMOUNT
                    const orderDiscount = {
                        DiscountType: getProperty(order, 'DiscountType'),
                        DiscountValue: getProperty(order, 'DiscountValue'),
                    };

                    for(const id of orderItemIds) {

                        /* Get an order item */
                        let orderItem = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                            principal, id, [ PRODUCT ],
                        );


                        let monthlyOrderItem = JSON.parse(JSON.stringify(orderItem))


                        const {
                            periodType, isInTrialPeriod,
                        } = BillingDatesCalculator.computeAbsoluteBillingPeriodDates(
                            month.Date,
                            monthlyOrderItem,
                        );

                        /* For static payment list we manually set the FREE period discount if date is within Trial Period */
                        if (periodType === 'FREE'
                            && moment(month.Date).isBefore(getProperty(monthlyOrderItem, 'TrialEndDate'))) {
                            monthlyOrderItem.properties.DiscountType = 'PERCENT'
                            monthlyOrderItem.properties.DiscountValue = '100.00'
                        } else {
                            monthlyOrderItem.properties.DiscountType = getProperty(orderItem, 'DiscountType')
                            monthlyOrderItem.properties.DiscountValue = getProperty(orderItem, 'DiscountValue')
                        }

                        const totalPrice = OrderInvoiceItemCalculations.computeAdjustedItemTotalPriceForPeriodType(
                            periodType,
                            monthlyOrderItem,
                            order,
                            orderDiscount,
                            month.Date, // ODN-1542 calculate the order level discount on the billing month date
                            // instead of current date
                        )

                        month.OrderItems.push({
                            orderItemId: id,
                            orderItemTitle: monthlyOrderItem.title,
                            orderItemType: getProperty(monthlyOrderItem, 'ProductType'),
                            TrialEndDate: getProperty(monthlyOrderItem, 'TrialEndDate'),
                            isInTrialPeriod: isInTrialPeriod,
                            DiscountType: getProperty(monthlyOrderItem, 'DiscountType'),
                            DiscountValue: getProperty(monthlyOrderItem, 'DiscountValue'),
                            periodType: periodType,
                            totalPrice: totalPrice,
                        })

                    }

                }

            }


            response.ContractStartDate = contractStartDate
            response.ContractEndDate = contractEndDate
            response.ContractType = contractType
            response.BillingStartDate = adjustedBillingStartDateToBillingDay

            return response


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
    public async processOrderForBilling(
        principal: OrganizationUserEntity,
        orderId: string,
        body: ProcessOrderBillingDto,
    ) {
        try {
            const { ORDER_ITEM, DISCOUNT } = SchemaModuleEntityTypeEnums;
            let currentDate = moment().format('YYYY-MM-DD')
            let contractStartDate = body.ContractStartDate
            let contractDurationInMonths


            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM, DISCOUNT ],
            );

            /* Compute the contract end date from the base product contract length */
            let { contractEndDate, contractType } = await this.computeContractEndDate(
                principal,
                contractStartDate,
                order[ORDER_ITEM].dbRecords,
            );

            /* Get the contract Duration in months by parsing the ContractType value. */
            if (contractType === 'MONTHLY') {
                contractDurationInMonths = 1
            } else {
                contractDurationInMonths = Number(contractType.split('_')[1])
            }


            /*
             If the contract is expired, we need to renew it. Here we check if the computed
             contractEndDate is past today. If it is, we set the new contractStartDate to today,
             calculate the contractEndDate and increment the contractRenewal.
             */

            /* CONTRACT HAS EXPIRED */
            if (moment(contractEndDate).isBefore(moment())) {

                console.log(`Today is ${currentDate} and the Contract has Expired...`)

                contractStartDate = moment().format('YYYY-MM-DD')

                const newContractDates = await this.computeContractEndDate(
                    principal,
                    contractStartDate,
                    order[ORDER_ITEM].dbRecords,
                );
                contractEndDate = newContractDates.contractEndDate;
                contractType = newContractDates.contractType;
            }

            /* CONTRACT IS ONGOING */
            else {
                console.log(`Today is ${currentDate} and the Contract is ongoing!`)
            }

            // ODN-1542 fix: remove discount when the STANDARD period begins
            // calculate current period type
            const { periodType } = BillingDatesCalculator.calculateCurrentTrialDiscountPeriodForOrderOrInvoice(order);
            const isRemoveDiscountPeriod = OrderInvoiceItemCalculations.checkIsRemoveDiscountPeriod(periodType);

            // update order
            const update = new DbRecordCreateUpdateDto()
            update.entity = `${ORDER_MODULE}:${ORDER}`
            update.properties = {
                BillingStartDate: body.BillingStartDate,
                ContractStartDate: contractStartDate,
                ContractEndDate: contractEndDate,
                ContractType: contractType,
                ContractRenewalCount: this.getContractRenewalCount(order, contractDurationInMonths, currentDate),

                // ODN-1542 fix: remove discount when the STANDARD period begins
                DiscountType: isRemoveDiscountPeriod ? 'AMOUNT' : getPropertyFromRelation(
                    order,
                    DISCOUNT,
                    'DiscountType',
                ),
                DiscountValue: isRemoveDiscountPeriod ? 0 : getPropertyFromRelation(order, DISCOUNT, 'DiscountValue'),
            };
            await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, update)

            if (order[ORDER_ITEM].dbRecords) {
                const orderItemIds = order[ORDER_ITEM].dbRecords.map(elem => elem.id);

                await this.ordersItemsService.processOrderItemsForBilling(
                    principal,
                    orderId,
                    orderItemIds,
                );
            }

            return this.computeOrderTotals(principal, orderId);

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }


    /**
     *  This will adjust discount periods / free periods and taxes for an order.
     * @param principal
     * @param orderId
     * @param headers
     */
    public async computeOrderTotals(
        principal: OrganizationUserEntity,
        orderId: string,
    ): Promise<IDbRecordCreateUpdateRes> {
        try {
            const { ORDER_ITEM } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            );

            /* Compute when computing the order totals get the contract type from product mix */
            const { contractType } = await this.computeContractEndDate(
                principal,
                undefined,
                order[ORDER_ITEM].dbRecords,
            );

            const orderItems = order[ORDER_ITEM].dbRecords;

            let update;
            if (!orderItems) {
                update = {
                    schemaId: order.schemaId,
                    properties: {
                        ContractType: null,
                        Subtotal: '0.00',
                        TotalDiscounts: '0.00',
                        TotalTaxAmount: '0.00',
                        TotalPrice: '0.00',
                    },
                };
            } else {
                update = {
                    schemaId: order.schemaId,
                    properties: {
                        ContractType: contractType,
                        Subtotal: OrderInvoiceCalculations.computeSubtotal(orderItems),
                        TotalDiscounts: OrderInvoiceCalculations.computeTotalDiscounts(orderItems, order),
                        TotalTaxAmount: OrderInvoiceCalculations.computeTotalTaxAmount(orderItems, order),
                        TotalPrice: OrderInvoiceCalculations.computeTotal(orderItems, order),
                    },
                }
            }

            return await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, update);

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * ODN-1660 Recalculates order items totals taking into account the order level AMOUNT discount
     *
     * @param principal
     * @param orderId
     * @returns
     */
    public async recalculateAndUpdateOrderItemsTotals(
        principal: OrganizationUserEntity,
        orderId: string,
    ): Promise<IDbRecordCreateUpdateRes[]> {
        const { ORDER_ITEM } = SchemaModuleEntityTypeEnums;

        try {
            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            );

            const items = <DbRecordEntityTransform[]>order?.OrderItem?.dbRecords;
            return await this.ordersItemsService.recalculateAndUpdateOrderItemsTotals(principal, items, order);

        } catch (e) {
            console.log(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * templateLabels:
     *
     * @param principal
     * @param orderId
     * @param templateLabel
     * @paramtemplateLabel
     * @param body
     */
    public async sendInstallRequestEmail(
        principal: OrganizationUserEntity,
        orderId: string,
        body?: SendgridEmailEntity,
    ): Promise<any> {
        try {
            const { CONTACT, ORDER_ITEM, ADDRESS } = SchemaModuleEntityTypeEnums;

            await this.computeOrderTotals(principal, orderId);

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ CONTACT, ORDER_ITEM, ADDRESS ],
            );
            await this.validatedEmail(order);

            const contactEmailAddress = getPropertyFromRelation(order, CONTACT, 'EmailAddress');
            const contactFirstName = getPropertyFromRelation(order, CONTACT, 'FirstName');

            const newEmail = new SendgridEmailEntity();
            newEmail.to = contactEmailAddress;
            newEmail.from = principal.organization.billingReplyToEmail;
            newEmail.templateLabel = 'SENDGRID_INSTALL_SCHEDULING_REQUEST';
            newEmail.dynamicTemplateData = Object.assign({}, {
                recordId: orderId,
                recordNumber: order.recordNumber,
                contactFirstName: contactFirstName,
                stageKey: order.stage.key,
                subject: this.createEmailSubject(order),
                orderItems: order[ORDER_ITEM].dbRecords.map(elem => ({
                    lineItemName: elem.title,
                    lineItemDescription: getProperty(elem, 'Description'),
                    lineItemTotal: getProperty(elem, 'UnitPrice'),
                })),
                orderSummary: {
                    subtotal: getProperty(order, 'Subtotal'),
                    totalDiscount: getProperty(order, 'TotalDiscounts') && getProperty(
                        order,
                        'TotalDiscounts',
                    ) !== '0.00' ? getProperty(order, 'TotalDiscounts') : null,
                    totalTax: getProperty(order, 'TotalTaxAmount') && getProperty(
                        order,
                        'TotalTaxAmount',
                    ) !== '0.00' ? getProperty(order, 'TotalTaxAmount') : null,
                    totalDue: getProperty(order, 'TotalPrice'),
                },
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
     * templateLabels:
     * SENDGRID_ORDER_CONFIRMATION
     * ODN-1835 SENDGRID_ORDER_CONFIRMATION_V2
     *
     * @param principal
     * @param orderId
     * @param templateLabel
     * @paramtemplateLabel
     * @param body
     */
    public async sendOrderEmail(
        principal: OrganizationUserEntity,
        orderId: string,
        body?: SendgridEmailEntity,
    ): Promise<any> {
        try {
            const { CONTACT, ORDER_ITEM, ADDRESS } = SchemaModuleEntityTypeEnums;

            await this.computeOrderTotals(principal, orderId);

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ CONTACT, ORDER_ITEM, ADDRESS ],
            );
            await this.validatedEmail(order);

            const contactEmailAddress = getPropertyFromRelation(order, CONTACT, 'EmailAddress');
            const contactFirstName = getPropertyFromRelation(order, CONTACT, 'FirstName');
            const contactLastName = getPropertyFromRelation(order, CONTACT, 'LastName');
            const contactPhoneNumber = getPropertyFromRelation(order, CONTACT, 'Phone');

            // Order always has one base product so [0] is just to access that object.
            const broadBandService = order[ORDER_ITEM].dbRecords.find(value => getProperty(
                value,
                'ProductType',
            ) == 'BASE_PRODUCT');

            const addOns = order[ORDER_ITEM].dbRecords.filter(value => getProperty(
                value,
                'ProductType',
            ) == 'ADD_ON_PRODUCT');

            const newEmail = new SendgridEmailEntity();
            newEmail.to = contactEmailAddress;
            newEmail.from = principal.organization.billingReplyToEmail;
            newEmail.templateLabel = 'SENDGRID_ORDER_CONFIRMATION_V2';
            newEmail.dynamicTemplateData = Object.assign({}, {
                recordId: orderId,
                recordNumber: order.recordNumber,
                contactEmailAddress,
                contactFirstName,
                address: order.title,
                contactLastName,
                contactPhoneNumber,
                stageKey: order.stage.key,
                subject: this.createEmailSubject(order),
                broadBandService: broadBandService ? {
                    productName: broadBandService.title,
                    productTotal: getProperty(broadBandService, 'UnitPrice'),
                    productTerms: getProperty(broadBandService, 'LegalTerms'),
                } : undefined,
                addOns: (addOns.length > 0) ? addOns.map(value => ({
                    addOnName: value.title,
                    addOnDescription: getProperty(value, 'Description'),
                    addOnTotal: getProperty(value, 'UnitPrice'),
                })) : undefined,
                orderSummary: {
                    subtotal: getProperty(order, 'Subtotal'),
                    totalDiscount: getProperty(order, 'TotalDiscounts') && getProperty(
                        order,
                        'TotalDiscounts',
                    ) !== '0.00' ? getProperty(order, 'TotalDiscounts') : null,
                    totalTax: getProperty(order, 'TotalTaxAmount') && getProperty(
                        order,
                        'TotalTaxAmount',
                    ) !== '0.00' ? getProperty(order, 'TotalTaxAmount') : null,
                    totalDue: getProperty(order, 'TotalPrice'),
                },
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
     * templateLabels:
     * SENDGRID_YOUFIBRE_WELCOME_EMAIL
     *
     * @param principal
     * @param orderId
     * @param templateLabel
     * @paramtemplateLabel
     * @param body
     */
    public async sendWelcomeEmail(
        principal: OrganizationUserEntity,
        orderId: string,
        templateLabel: string,
        body?: SendgridEmailEntity,
    ): Promise<any> {
        try {
            const { CONTACT, ORDER_ITEM, ADDRESS } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ CONTACT, ORDER_ITEM, ADDRESS ],
            );
            await this.validatedEmail(order);

            const contactEmailAddress = getPropertyFromRelation(order, CONTACT, 'EmailAddress');

            const newEmail = new SendgridEmailEntity();
            newEmail.to = contactEmailAddress;
            newEmail.bcc = 'youfibre.com+13b321b241@invite.trustpilot.com';
            newEmail.from = principal.organization.billingReplyToEmail;
            newEmail.templateLabel = templateLabel;
            newEmail.dynamicTemplateData = Object.assign({}, {
                subject: this.createEmailSubject(order),
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
     * @param principal
     * @param orderId
     */
     public async sendRegisterLinkToCustomer(
        principal: OrganizationUserEntity,
        orderId: string,
    ): Promise<any> {
        try {
            const { CONTACT, ORDER_ITEM, ADDRESS } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ CONTACT, ORDER_ITEM, ADDRESS ],
            );

            const contactEmailAddress = getPropertyFromRelation(order, CONTACT, 'EmailAddress');
            const contactId = getPropertyFromRelation(order, CONTACT, 'Id');
            const login = await AuthUserHelper.login();
            const sendRegisterLink = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/users/send-registration-link`,
                method: 'post',
                headers: { Authorization: login.headers.authorization },
                debug: false,
                body: {
                    email: contactEmailAddress,
                    contactId: contactId
                }
            });
            return { status: 'processed' };
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param principal
     * @param orderId
     * @param requestBody
     * @param headers
     */
    public async validateStageChange(
        principal: OrganizationUserEntity,
        orderId: string,
        requestBody: DbRecordCreateUpdateDto,
    ) {
        try {
            const { PRODUCT, ORDER_ITEM, WORK_ORDER, ADDRESS, CONTACT } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM, WORK_ORDER, ADDRESS, CONTACT ],
            );
            const stage = await this.pipelineEntitysStagesService.getPipelineStageByOrganizationAndId(
                principal.organization,
                requestBody.stageId,
            );

            const orderAddress = order[ADDRESS].dbRecords;
            const orderOrderItems = order[ORDER_ITEM].dbRecords;
            const orderWorkOrders = order[WORK_ORDER].dbRecords;
            const orderContact = order[CONTACT].dbRecords;

            console.log('order', order.stage)
            console.log('stage', stage)
            console.log('first_rule', order.stage.isSuccess && (!stage.isFail && !stage.isSuccess))

            // Do not allow an order to be backwards from the success stage, only to cancelled
            if (order.stage.isSuccess && (!stage.isFail && !stage.isSuccess)) {
                throw new ExceptionType(400, 'an order can only be moved to cancelled after being active');
            }

            // Do not allow an order to be moved from the fail stage
            if (order.stage.isFail && !stage.isFail) {
                throw new ExceptionType(400, 'an order can not be moved from cancelled');
            }

            if (!stage.isFail && !stage.isDefault) {

                if (!orderOrderItems) {
                    throw new ExceptionType(400, 'Add Products to your Order to move it to the next stage', [],
                        order,
                    );
                }

                for(const orderItem of orderOrderItems) {

                    const orderItemWithProduct = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                        principal,
                        orderItem.id,
                        [ PRODUCT ],
                    );

                    const products = orderItemWithProduct[PRODUCT].dbRecords;

                    // Check if all the products on the order are Available
                    if (!products) {
                        throw new ExceptionType(
                            400,
                            `Order item ${orderItem.title} is missing a product`,
                            [],
                            order,
                        );
                    } else {
                        // TODO Auto split orders at checkout if there is a product not yet available
                        // TODO Move that split order into Pre Orders
                        // TODO Move the regular order into the correct stage based on the status of the premise
                        // TODO This is a catch all to prevent orders from being billing when the product is not

                        if ([ 'OrderStageActive' ].includes(stage.key)) {
                            for(const product of products) {
                                const availableFrom = getProperty(product, 'AvailableFrom');
                                const availableTo = getProperty(product, 'AvailableTo');

                                // Is the available from date in the future
                                if (availableFrom && moment(availableFrom).isAfter(moment().utc().format('YYYY-MM-DD'))) {
                                    throw new ExceptionType(
                                        400,
                                        `${product.title} is not available until ${availableFrom}. Split this item ont a new order.`,
                                        [],
                                        order,
                                    );
                                }

                                // is the available to date before today
                                if (availableTo && moment(availableTo).isBefore(moment().utc().format('YYYY-MM-DD'))) {
                                    throw new ExceptionType(
                                        400,
                                        `${product.title} expired on ${availableTo}. Remove it from the order`,
                                        [],
                                        order,
                                    );
                                }
                            }
                        }
                    }
                }

                // Validate Address
                // Before moving to Sold the order needs to have an address with the correct sales status
                if (orderAddress && orderAddress[0]) {
                    if ([ 'OrderStageSold', 'OrderStageSupply', 'OrderStageActive' ].includes(stage.key)) {
                        const salesStatus = getProperty(orderAddress[0], 'SalesStatus');
                        if (salesStatus !== 'ORDER') {
                            throw new ExceptionType(
                                400,
                                `the address has a sales status of ${salesStatus} and it needs to be set to ORDER before moving to ${stage.name}`,
                                [],
                                order,
                            );
                        }
                    }
                } else {
                    throw new ExceptionType(
                        400,
                        `the order is missing an address, please add one before moving to Sold`,
                        [],
                        order,
                    );
                }

                // Validate the order has a Contact
                if ([ 'OrderStageSold', 'OrderStageSupply', 'OrderStageActive' ].includes(stage.key)) {
                    if (!orderContact) {
                        throw new ExceptionType(
                            400,
                            `the order is missing a contact, please add one before moving to ${stage.name}`,
                            [],
                            order,
                        );
                    }
                }

                // Validate Work Orders
                if ([ 'OrderStageSupply' ].includes(stage.key)) {

                    // Before moving an order to Supply, the Work Order needs to be in the scheduled stage
                    if (!orderWorkOrders) {
                        throw new ExceptionType(
                            400,
                            `the order is missing a work order, please create one before moving to Supply`,
                            [],
                            order,
                        );
                    }
                    // //  validate the work order is scheduled
                    // for(const workOrder of orderWorkOrders) {
                    //     const workOrderType = getProperty(workOrder, 'Type');
                    //     if (workOrderType === 'INSTALL' && workOrder.stage.key !== 'WorkOrderStageScheduled') {
                    //         throw new ExceptionType(
                    //             400,
                    //             'The work order is not scheduled.',
                    //             [],
                    //             workOrder,
                    //         );
                    //     }
                    // }
                }


                if ([ 'OrderStageActive' ].includes(stage.key)) {
                    // Before moving an order to Active the install work order must be Done.
                    //  validate work orders
                    if (orderWorkOrders) {
                        // Check if the install work order is active
                        const activeInstallWorkOrders = orderWorkOrders.find(elem => {
                            return elem.stage.isSuccess && getProperty(elem, 'Type') === 'INSTALL'
                        });

                        if (!activeInstallWorkOrders) {
                            throw new ExceptionType(
                                400,
                                'This order has an install work order in progress, complete the work order before moving to active.',
                                [],
                                order,
                            );
                        }
                    }
                }
            }

            return true;

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param order
     */
    private async validatedEmail(order: DbRecordEntityTransform) {

        const { CONTACT, ORDER_ITEM } = SchemaModuleEntityTypeEnums;

        const orderContact = order[CONTACT].dbRecords;
        const orderItems = order[ORDER_ITEM].dbRecords;

        if (!getProperty(order, 'TotalPrice')) {
            throw new ExceptionType(400, `total price invalid on order ${order.title}, cannot send confirmation`);
        }
        // Contact
        if (!orderContact) {
            throw new ExceptionType(400, `no contact on order ${order.title}, cannot send confirmation`);
        }
        // Items
        if (!orderItems) {
            throw new ExceptionType(400, `no order items on order ${order.title}, cannot send confirmation`);
        }
    }

    /**
     *
     * @param order
     * @private
     */
    private createEmailSubject(order: DbRecordEntityTransform) {

        if (order.stage.key === 'OrderStagePreOrder') {
            return 'Your YouFibre Pre Order Confirmation';
        } else if (order.stage.key === 'OrderStageSold') {
            return 'Your YouFibre Order Confirmation';
        } else if (order.stage.key === 'OrderStageActive') {
            return 'Welcome to YouFibre';
        }
    }


    /**
     *
     * @param principal
     * @param workOrderId
     * @param body
     */
    public async handleOrderWorkOrderStageChange(
        principal: OrganizationUserEntity,
        workOrderId: string,
        body: DbRecordCreateUpdateDto,
    ) {
        try {
            // Get the service appointment work order
            const workOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                workOrderId,
                [ ORDER ],
            );

            // get the work order records
            const relatedOrders = workOrder[ORDER].dbRecords;

            if (relatedOrders) {

                if ([ 'WorkOrderStageScheduled', 'WorkOrderSurveyComplete' ].includes(workOrder.stage.key)) {
                    // Update the work order stage
                    const stageKey = 'OrderStageSupply';
                    const order = relatedOrders[0];
                    if (!order.stage.isSuccess && !order.stage.isFail && order.stage.key !== stageKey) {
                        await this.changeOrderStage(principal, order.id, stageKey);
                    }
                }
            }

            return;

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
    public async changeOrderStage(principal: OrganizationUserEntity, orderId: string, stageKey: string) {

        try {

            const stage = await this.pipelineEntitysStagesService.getPipelineAndStagesByStageKey(
                principal.organization,
                stageKey,
            );
            const updateDto = new DbRecordCreateUpdateDto();
            updateDto.entity = `${ORDER_MODULE}:${ORDER}`;
            updateDto.stageId = stage.id;

            await this.validateStageChange(principal, orderId, updateDto)

            const res = await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderId, updateDto);

            return res;
        } catch (e) {
            console.error(e);

            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * Handle address updated events and move the orders between stages
     * @param principal
     * @param addressId
     * @param body
     */
    async handleAddressUpdated(principal: OrganizationUserEntity, addressId: string, body?: DbRecordCreateUpdateDto) {

        try {
            // Get the service appointment work order
            const address = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                addressId,
                [ ORDER ],
            );

            const addressSalesStatus = getProperty(address, 'SalesStatus');

            if (addressSalesStatus === 'ORDER') {
                // move all the pre orders to order stage
                const relatedRecords = address[ORDER].dbRecords;
                if (relatedRecords) {
                    for(const order of relatedRecords) {
                        // If the order is in the Pre Order stage move it to Sold
                        if (order.stage.key === 'OrderStagePreOrder' || order.stage.key === 'OrderStageDraft') {
                            const stageKey = 'OrderStageSold';
                            await this.changeOrderStage(principal, order.id, stageKey);
                        }
                    }
                }
            } else if (addressSalesStatus === 'PRE_ORDER') {
                // move all the orders to the pre stage
                const relatedRecords = address[ORDER].dbRecords;
                if (relatedRecords) {
                    for(const order of relatedRecords) {
                        // If the order is in the Order stage move it back to PreOrder
                        if (order.stage.key === 'OrderStageSold' || order.stage.key === 'OrderStageDraft') {
                            const stageKey = 'OrderStagePreOrder';
                            await this.changeOrderStage(principal, order.id, stageKey);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * If an order needs to have the line items split into two orders
     * @param principal
     * @param orderId
     * @param body
     */
    async splitOrder(
        principal: OrganizationUserEntity,
        orderId: string,
        body: DbRecordAssociationCreateUpdateDto[],
    ): Promise<IDbRecordCreateUpdateRes> {

        try {
            const { ORDER_ITEM, CONTACT, ACCOUNT, ADDRESS, DISCOUNT, WORK_ORDER } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM, CONTACT, ADDRESS, ACCOUNT, DISCOUNT, WORK_ORDER ],
            );

            const contactRecords = order[CONTACT].dbRecords;
            const addressRecords = order[ADDRESS].dbRecords;
            const accountRecords = order[ACCOUNT].dbRecords;
            const discountRecords = order[DISCOUNT].dbRecords;
            const orderItemRecords = order[ORDER_ITEM].dbRecords;
            const workOrderRecords = order[WORK_ORDER].dbRecords;

            const orderItemsToSplit = orderItemRecords.filter(elem => body.map(obj => obj.recordId).includes(elem.id));

            if (orderItemsToSplit && orderItemsToSplit.length < 1) {
                throw new ExceptionType(409, 'No order items to split');
            }

            await this.verifyIfOrderItemExistsOnWorkOrder(principal, workOrderRecords, orderItemsToSplit);


            // Create a new Order with all the order associations (no work order)
            const orderCreate = new DbRecordCreateUpdateDto();
            orderCreate.entity = `${SchemaModuleTypeEnums.ORDER_MODULE}:${SchemaModuleEntityTypeEnums.ORDER}`;
            orderCreate.title = order.title;
            orderCreate.properties = order.properties;
            orderCreate.associations = [
                {
                    recordId: addressRecords ? addressRecords[0].id : undefined,
                },
                {
                    recordId: contactRecords ? contactRecords[0].id : undefined,
                },
                {
                    recordId: accountRecords ? accountRecords[0].id : undefined,
                },
                {
                    recordId: discountRecords ? discountRecords[0].id : undefined,
                },
                ...body,
            ];
            // create the new split order
            const orderCreateRes = await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                [ orderCreate ],
                { upsert: true },
            );
            const newOrder = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderCreateRes[0].id,
                [],
            );

            // Record the order was split using a split order entry
            const newSplitOrderEntry = new DbRecordCreateUpdateDto();
            newSplitOrderEntry.entity = `${SchemaModuleTypeEnums.ORDER_MODULE}:SplitOrder`;
            newSplitOrderEntry.title = newOrder.recordNumber + '- SPLIT';
            newSplitOrderEntry.properties = {
                Description: `order ${order.recordNumber} has items that have been split to order ${newOrder.recordNumber}`,
            }
            newSplitOrderEntry.associations = [
                {
                    recordId: newOrder.id,
                },
                ...body,
            ];
            const splitOrderEntryCreate = await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                [ newSplitOrderEntry ],
                { upsert: true },
            );

            const splitOrderEntry = splitOrderEntryCreate[0];

            // remove the order items from the original order
            for(const item of orderItemsToSplit) {
                await this.dbRecordsAssociationsService.deleteRelatedRecordById(
                    principal,
                    item.dbRecordAssociation.id,
                );
                // update order item to split, reset any billing fields
            }

            // create the new split order
            const orderUpdate = {
                entity: 'OrderModule:Order',
                associations: [
                    {
                        recordId: splitOrderEntry.id,
                    },
                ],
            }
            await this.dbService.updateDbRecordsByPrincipalAndId(principal, order.id, orderUpdate);

            //todo: fix ODN-1660 recalculate items as well
            await Promise.all([
                this.recalculateAndUpdateOrderItemsTotals(principal, order.id),
                this.recalculateAndUpdateOrderItemsTotals(principal, newOrder.id),
            ]);

            // calculate the new order totals
            await Promise.all([
                this.computeOrderTotals(principal, order.id),
                this.computeOrderTotals(principal, newOrder.id),
            ]);

            return splitOrderEntry;

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }

    }

    /**
     *
     * @param principal
     * @param workOrderRecords
     * @param orderItemsToSplit
     * @private
     */
    private async verifyIfOrderItemExistsOnWorkOrder(
        principal: OrganizationUserEntity,
        workOrderRecords: DbRecordEntityTransform[],
        orderItemsToSplit: DbRecordEntityTransform[],
    ) {
        if (workOrderRecords) {
            for(const workOrder of workOrderRecords) {
                for(const orderItem of orderItemsToSplit) {
                    const association = await this.dbRecordsAssociationsService.getRelatedRecordByParentAndChildId(
                        principal,
                        workOrder.id,
                        orderItem.id,
                    );
                    if (association) {
                        throw new ExceptionType(
                            409,
                            `order item ${orderItem.title} exists on a work order, please remove it before splitting the order`,
                        );
                    }
                }
            }
        }
    }

    /**
     *
     * @param principal
     * @param contractStartDate
     * @param orderItems
     * @private
     */
    private async computeContractEndDate(
        principal: OrganizationUserEntity,
        contractStartDate: string,
        orderItems: DbRecordEntityTransform[],
    ) {
        if (orderItems) {

            let contractEndDate;
            let contractType;

            console.log('orderItems', orderItems)

            // try to get the base broadband service
            let orderItem = orderItems.find(elem => getProperty(
                elem,
                'ProductCategory',
            ) === 'BROADBAND' && getProperty(elem, 'ProductType') === 'BASE_PRODUCT');

            // otherwise get the base voice service
            if (!orderItem) {
                orderItem = orderItems.find(elem => getProperty(
                    elem,
                    'ProductCategory',
                ) === 'VOICE' && getProperty(elem, 'ProductType') === 'BASE_PRODUCT');
            }

            // We need to check for ADD_ON_PRODUCTS in the event the order is just for add on items and
            // the base product exists on a different order.
            // get the addon broadband product
            if (!orderItem) {
                orderItem = orderItems.find(elem => getProperty(
                    elem,
                    'ProductCategory',
                ) === 'BROADBAND' && getProperty(elem, 'ProductType') === 'ADD_ON_PRODUCT');
            }

            // get the addon voice product
            if (!orderItem) {
                orderItem = orderItems.find(elem => getProperty(
                    elem,
                    'ProductCategory',
                ) === 'VOICE' && getProperty(elem, 'ProductType') === 'ADD_ON_PRODUCT');
            }

            console.log('orderItem', orderItem)

            if (orderItem) {

                // get the product for contract details
                const product = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    getProperty(orderItem, 'ProductRef'),
                    [],
                );

                console.log('product', product)

                contractType = getProperty(product, 'ContractType');
                const intervalUnit = getProperty(product, 'IntervalUnit');

                if (contractType && contractStartDate) {
                    // MONTHLY and NONE are the only two options for Product ContractType that do not have a
                    // value i.e IntervalUnit_Value
                    if (contractType === 'MONTHLY') {

                        let diffInPast = moment().diff(contractStartDate, 'months');

                        if (diffInPast < 1) {
                            diffInPast = 1;
                        }

                        contractEndDate = moment(contractStartDate).add(diffInPast, intervalUnit).format('YYYY-MM-DD');

                        const isInThePast = moment(contractEndDate).isBefore(moment());

                        // if this date is still in the past add 1 month
                        if (isInThePast) {
                            contractEndDate = moment(contractEndDate).add(
                                diffInPast,
                                intervalUnit,
                            ).format('YYYY-MM-DD');
                        }

                    } else if (contractType === 'NONE') {

                        contractEndDate = moment(contractStartDate).add(0, intervalUnit).format('YYYY-MM-DD');

                    } else {

                        const split = contractType.split('_');
                        const length = split[1];

                        console.log('contractStartDate', contractStartDate);

                        const endDate = moment(contractStartDate).add(
                            Number(length),
                            intervalUnit,
                        ).format('YYYY-MM-DD');

                        if (moment(endDate).isBefore(moment().utc().format('YYYY-MM-DD'))) {

                            contractEndDate = moment().utc().add(Number(length), intervalUnit).format('YYYY-MM-DD')

                        } else {

                            contractEndDate = endDate

                        }
                    }

                }
            }

            console.log({ contractEndDate, contractType })

            return { contractEndDate, contractType };
        }
    }

    /**
     * Deprecated as of 17-Jun-2021
     *
     * @param order
     * @param nextContractEndDate
     * @private
     */

    /*private setContractRenewalCount(order: DbRecordEntityTransform, nextContractEndDate: string) {

     const contractEndDate = getProperty(order, 'ContractEndDate');
     const contractRenewalCount = getProperty(order, 'ContractRenewalCount');

     console.log('contractEndDate', contractEndDate);

     if(contractEndDate) {

     const isInThePast = moment(contractEndDate).isBefore(nextContractEndDate);

     console.log('nextContractEndDate', nextContractEndDate);
     console.log('isInThePast', isInThePast);
     console.log('contractRenewalCount', contractRenewalCount);
     console.log('countAsNum', Number(contractRenewalCount));
     console.log('less than 1', Number(contractRenewalCount) < 1);

     if(isInThePast && contractRenewalCount && Number(contractRenewalCount)) {

     return Number(contractRenewalCount) + 1;

     } else if(isInThePast) {

     return 1;

     } else if(Number(contractRenewalCount) < 1) {

     return 0;

     }

     return contractRenewalCount;

     } else {

     console.log('SHOULD NOT BE HERE 2')

     return 0;
     }
     }*/

    /**
     * Get order active date, get contract duration and see how many of these contracts elapsed from the date of
     * activation to the current moment.
     *
     * @param order
     * @param contractDurationInMonths
     * @param currentDate
     * @private
     */
    private getContractRenewalCount(
        order: DbRecordEntityTransform,
        contractDurationInMonths: number,
        currentDate: string,
    ) {

        const orderActiveDate = getProperty(order, 'ActiveDate')
        const elapsedMonths = Math.abs(moment(orderActiveDate).diff(currentDate, 'months'))
        const elapsedContracts = Math.floor(elapsedMonths / contractDurationInMonths)

        console.log('████ getContractRenewalCount ███████████████████████████████████████████████████')

        const monitoring = {
            currentDate: currentDate,
            orderActiveDate: orderActiveDate,
            contractDurationInMonths: contractDurationInMonths,
            elapsedMonths: elapsedMonths,
            elapsedContracts: elapsedContracts,
        }

        console.log(monitoring)

        return elapsedContracts
    }


    /**
     * This is a test function for troubleshooting date calculation.
     * Note: Pass down orderId and optional overrideContractEndDate (YYYY-MM-DD) for testing purposes.
     *
     * @param principal
     * @param orderId
     * @param overrideContractEndDate
     */
    public async getAllDateCalculations(
        principal: OrganizationUserEntity,
        orderId: string,
        overrideContractEndDate?: any,
    ) {

        try {

            const { ORDER_ITEM } = SchemaModuleEntityTypeEnums

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            )

            let contractRenewalCount, contractDurationInMonths
            let contractStartDate = getProperty(order, 'ContractStartDate')
            let currentDate = overrideContractEndDate ? overrideContractEndDate : moment().format('YYYY-MM-DD')

            /* Get the contract Duration in months by parsing the ContractType value. */
            if (getProperty(order, 'ContractType') === 'MONTHLY') {
                contractDurationInMonths = 1
            } else {
                contractDurationInMonths = Number(getProperty(order, 'ContractType').split('_')[1])
            }

            /* Calculate Contract end date on ContractStartDate and contract duration  */
            let { contractEndDate, contractType } = await this.computeContractEndDate(
                principal,
                getProperty(order, 'ContractStartDate'),
                order[ORDER_ITEM].dbRecords,
            );

            console.log('contractEndDate, contractType', contractEndDate, contractType)


            /* CONTRACT HAS EXPIRED */
            if (moment(contractEndDate).isBefore(currentDate)) {

                console.log(`Today is ${currentDate} and the Contract has Expired...`)

                contractStartDate = moment().format('YYYY-MM-DD')

                const { contractEndDate, contractType } = await this.computeContractEndDate(
                    principal,
                    contractStartDate,
                    order[ORDER_ITEM].dbRecords,
                );

                contractRenewalCount = this.getContractRenewalCount(order, contractDurationInMonths, currentDate)

                return {
                    currentDate: currentDate,
                    contractStartDate: contractStartDate,
                    contractEndDate: contractEndDate,
                    contractType: contractType,
                    contractRenewalCount: contractRenewalCount,
                    contractDurationInMonths: contractDurationInMonths,
                }


            }

            /* CONTRACT IS ONGOING */
            else {

                console.log(`Today is ${currentDate} and the Contract is ongoing!`)
                contractRenewalCount = this.getContractRenewalCount(order, contractDurationInMonths, currentDate)

                return {
                    currentDate: currentDate,
                    contractStartDate: contractStartDate,
                    contractEndDate: contractEndDate,
                    contractType: contractType,
                    contractRenewalCount: contractRenewalCount,
                    contractDurationInMonths: contractDurationInMonths,
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
     * @param orderId
     * @param requestBody
     */
    public async canOrderBeUpdated(
        principal: OrganizationUserEntity,
        orderId: any,
        requestBody: any,
    ) {

        try {

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [],
            );

            // if Order stage isFail don't allow user to edit it
            if (order.stage.isFail) {
                throw new ExceptionType(
                    400,
                    'The order is in a failed stage and can no longer be modified',
                );
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }

    }

    /**
     * Validate if the product type matches adderss classification.
     *
     * @param principal
     * @param requestBody
     */
    async validateCheckoutOrderItems(
        principal: OrganizationUserEntity,
        requestBody: CheckoutDto,
    ): Promise<void> {

        try {

            const address = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                requestBody.addressId,
                [],
            );

            const addressClassification = getProperty(address, 'Classification');

            for(let productObj of requestBody.products) {

                let product = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal, productObj.recordId, [],
                );

                const productCustomerType = getProperty(product, 'CustomerType');

                if (addressClassification === 'C' && productCustomerType !== 'BUSINESS') {
                    // check if the address classification is business and check if the product type matches
                    throw new ExceptionType(
                        400,
                        'Please select a product for business customers',
                    );
                } else if (addressClassification !== 'C' && productCustomerType === 'BUSINESS') {
                    // check if the address classification is residential and check if the product type matches
                    throw new ExceptionType(
                        400,
                        'Please select a product for residential customers',
                    );
                }

            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }

    }

    /**
     * Validate if the product type matches adderss classification when items are added to Order
     *
     * @param principal
     * @param requestBody
     * @param requestParams
     */
    async validateOrderItems(
        principal: OrganizationUserEntity,
        requestBody: DbRecordAssociationCreateUpdateDto[],
        requestParams: { orderId: string },
    ): Promise<void> {

        const { ADDRESS } = SchemaModuleEntityTypeEnums;

        try {

            const addressAssociations = await this.dbRecordsAssociationsService.getRelatedRecordsByEntity(
                principal,
                {
                    recordId: requestParams.orderId,
                    entities: [ ADDRESS ],
                },
            );

            const address = addressAssociations[ADDRESS].dbRecords[0];

            const addressClasification = getProperty(address, 'Classification');

            for(let productObj of requestBody) {

                let product = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    productObj.recordId,
                    [],
                );

                const productCustomerType = getProperty(product, 'CustomerType');

                if (addressClasification === 'C' && productCustomerType !== 'BUSINESS') {
                    // check if the address classification is bussines and check if the product type matches
                    throw new ExceptionType(
                        400,
                        'Please select BUSINESS customer type products.',
                    );
                } else if (addressClasification !== 'C' && productCustomerType === 'BUSINESS') {
                    // check if the address classification is residential and check if the product type matches
                    throw new ExceptionType(
                        400,
                        'Please select RESIDENTIAL customer type products.',
                    );
                }

            }


        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }

    }

}
