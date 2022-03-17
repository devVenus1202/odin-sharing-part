import { APIClient } from '@d19n/client/dist/common/APIClient';
import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { RPC_CREATE_DB_RECORDS } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { DbRecordEntity } from '@d19n/models/dist/schema-manager/db/record/db.record.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getFirstRelation, getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { PipelineEntitysStagesService } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { OrdersItemsService } from 'src/orders/items/orders.items.service';
import { OrdersService } from '../orders/orders.service';
import { CheckoutDto } from './type/checkout.dto';
import moment = require('moment');


const { CRM_MODULE } = SchemaModuleTypeEnums;

const { ADDRESS } = SchemaModuleEntityTypeEnums;

@Injectable()
export class CheckoutService {

    private dbService: DbService;
    private pipelineEntitysStagesService: PipelineEntitysStagesService;
    private orderService: OrdersService;
    private ordersItemsService: OrdersItemsService;

    private amqpConnection: AmqpConnection;

    constructor(
        dbService: DbService,
        pipelineEntitysStagesService: PipelineEntitysStagesService,
        amqpConnection: AmqpConnection,
        orderService: OrdersService,
        @Inject(forwardRef(() => OrdersItemsService)) ordersItemsService: OrdersItemsService,
    ) {
        this.dbService = dbService;
        this.pipelineEntitysStagesService = pipelineEntitysStagesService;
        this.amqpConnection = amqpConnection;
        this.orderService = orderService;
        this.ordersItemsService = ordersItemsService;
    }

    /**
     *
     * @param principal
     * @param body
     * @param headers
     */
    public async handleOrderCheckout(
        principal: OrganizationUserEntity,
        body: CheckoutDto,
        headers: { [key: string]: any },
    ): Promise<{ orderId: string }> {
        try {

            await this.validateCheckout(body);

            let addressId = body.addressId;

            if (body.leadId) {
                const lead = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                    principal,
                    body.leadId,
                    [ ADDRESS ],
                );
                const address = getFirstRelation(lead, ADDRESS);
                addressId = address ? address.id : undefined;
            }


            // get the address
            const address = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                addressId,
            );

            // get the contact
            const contact = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                body.contactId,
            );

            if (body.accountNumber && body.branchCode) {
                // Verify bank details
                await APIClient.call<DbRecordEntity>({
                    facility: 'http',
                    baseUrl: Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    service: `v1.0/gocardless/bank-lookup`,
                    method: 'post',
                    headers: { Authorization: headers.authorization },
                    body: {
                        'accountNumber': body.accountNumber,
                        'branchCode': body.branchCode,
                        'countryCode': 'GB',
                    },
                    debug: false,
                });

                // Create customer payment method
                await APIClient.call<DbRecordEntity>({
                    facility: 'http',
                    baseUrl: Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                    service: `v1.0/contact/${body.contactId}/payment-methods`,
                    method: 'post',
                    headers: { Authorization: headers.authorization },
                    body: {
                        identityName: body.identityName,
                        authorizedDirectDebit: body.authorizedDirectDebit ? body.authorizedDirectDebit : true,
                        bankDetails: {
                            accountNumber: body.accountNumber,
                            branchCode: body.branchCode,
                        },
                    },
                    debug: true,
                });
            }

            // Check address sales status
            //  - Find 10% discount
            //  - If sales status is Pre Order
            const addrSalesStatus = getProperty(address, 'SalesStatus');
            let discountId;

            await this.validateAddressStatus(addrSalesStatus);

            if ([ null, 'null', undefined, 'undefined', '' ].includes(body.discountCode) === false) {
                try {
                    const discountRes = await APIClient.call<DbRecordEntity>({
                        facility: 'http',
                        baseUrl: Utilities.getBaseUrl(SERVICE_NAME.PRODUCT_MODULE),
                        service: `v1.0/discounts/byCode/${body.discountCode}`,
                        method: 'get',
                        headers: { Authorization: headers.authorization },
                        debug: false,
                    });

                    if (discountRes) {
                        discountId = discountRes.id;
                    }
                } catch (e) {
                    console.error('discount redeem issue by code', e);
                }
            } else if (addrSalesStatus && addrSalesStatus === 'PRE_ORDER') {

                try {
                    const discountRes = await APIClient.call<DbRecordEntity>({
                        facility: 'http',
                        baseUrl: Utilities.getBaseUrl(SERVICE_NAME.PRODUCT_MODULE),
                        service: `v1.0/discounts/byCode/10OFF18`,
                        method: 'get',
                        headers: { Authorization: headers.authorization },
                        debug: false,
                    });

                    if (discountRes) {
                        discountId = discountRes.id;
                    }

                } catch (e) {
                    console.error('discount redeem issue by code', e);
                }
            }

            // await this.validateCheckout(lead, body);

            // Create account
            const contactFirstName = getProperty(contact, 'FirstName');
            const contactLastName = getProperty(contact, 'LastName');
            const contactPhone = getProperty(contact, 'Phone');

            const newAccount = new DbRecordCreateUpdateDto();
            newAccount.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.ACCOUNT}`;
            newAccount.title = `${contactFirstName} ${contactLastName} ${contactPhone}`;
            newAccount.properties = {
                Type: getProperty(address, 'Classification') === 'C' ? 'BUSINESS' : 'RESIDENTIAL',
                GroupBilling: 'NO',
            };
            newAccount.associations = [
                {
                    recordId: address.id,
                },
                {
                    recordId: contact.id,
                },
            ];

            // Create a new account
            const accountRes = await this.amqpConnection.request<any>({
                exchange: CRM_MODULE,
                routingKey: `${CRM_MODULE}.${RPC_CREATE_DB_RECORDS}`,
                payload: {
                    principal,
                    body: [ newAccount ],
                    query: { upsert: true },
                },
                timeout: 30000,
            });

            if (accountRes && !accountRes.successful) {
                throw new ExceptionType(accountRes.statusCode, accountRes.message, accountRes.validation);
            }

            const account = accountRes['data'][0];

            // Create order
            const addrFullAddress = getProperty(address, 'FullAddress');
            const addrUdprn = getProperty(address, 'UDPRN');
            const addrUmprn = getProperty(address, 'UMPRN');

            const orderCreate = new DbRecordCreateUpdateDto();
            orderCreate.entity = `${SchemaModuleTypeEnums.ORDER_MODULE}:${SchemaModuleEntityTypeEnums.ORDER}`;
            orderCreate.title = addrFullAddress;
            orderCreate.properties = {
                IssuedDate: moment().format('YYYY-MM-DD'),
                RequestedDeliveryDate: undefined,
                ActivationStatus: 'DRAFT',
                BillingTerms: 'NET_3',
                CurrencyCode: 'GBP',
                UDPRN: addrUdprn,
                UMPRN: addrUmprn,
            };
            orderCreate.associations = [
                {
                    recordId: address.id,
                },
                {
                    recordId: contact.id,
                },
                {
                    recordId: account.id,
                },
                {
                    recordId: discountId, // undefined if no discount
                },
            ];

            // Create a new order
            const orderRes = await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                [ orderCreate ],
                { upsert: true },
            );

            if (!orderRes) {
                throw new ExceptionType(500, 'error creating order');
            }

            const order = orderRes[0];

            // Add products to the order

            // enrich products with offerId additional param
            let products = body.products;
            if (body.offerId) {
                products = products.map(elem => Object.assign(
                    {},
                    elem,
                    { additionalParams: { offerId: body.offerId } },
                ));
            }

            const orderItemsRes = await this.ordersItemsService.createOrderItemsFromProducts(
                principal,
                order.id,
                products,
            );

            if (!orderItemsRes) {
                throw new ExceptionType(500, 'error creating order items');
            }

            this.orderService.handleAddressUpdated(principal, address.id);

            // handle customer phone porting
            // TODO: Extract logic to be asynchronously handled with events
            if (body.customerPhonePorting) {

                const orderItems = await this.dbService.getManyDbRecordsByOrganizationAndIds(
                    principal,
                    { recordIds: orderItemsRes.map(elem => elem.id) },
                )

                for(const item of orderItems) {

                    const isVoiceItem = item.columns.find(elem => elem.column.name === 'ProductCategory' && elem.value === 'VOICE');

                    if (isVoiceItem) {

                        const newPhonePorting = new DbRecordCreateUpdateDto();
                        newPhonePorting.entity = 'ServiceModule:CustomerPhonePorting';
                        newPhonePorting.properties = {
                            AreaCode: body.customerPhonePorting.AreaCode,
                            CountryCode: body.customerPhonePorting.CountryCode,
                            SubscriberNumber: body.customerPhonePorting.SubscriberNumber,
                            AuthorizedLOA: body.customerPhonePorting.AuthorizedLOA,
                        };
                        newPhonePorting.associations = [
                            {
                                recordId: item.id,
                            },
                        ];

                        this.dbService.updateOrCreateDbRecordsByPrincipal(
                            principal,
                            [ newPhonePorting ],
                            { upsert: false },
                        );
                    }
                }
            }

            // Update the contacts properties
            if (!!body.contactProperties && Object.keys(body.contactProperties).length > 0) {
                const contactProperties = new DbRecordCreateUpdateDto();
                contactProperties.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.CONTACT}`;
                contactProperties.properties = body.contactProperties;
                this.dbService.updateDbRecordsByPrincipalAndId(principal, body.contactId, contactProperties);
            }

            if (body.leadId) {
                // change Lead status to Won
                const stage = await this.pipelineEntitysStagesService.getPipelineAndStagesByStageKey(
                    principal.organization,
                    'LeadStageWon',
                );
                const leadProperties = new DbRecordCreateUpdateDto();
                leadProperties.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.LEAD}`;
                leadProperties.stageId = stage.id;
                await this.dbService.updateDbRecordsByPrincipalAndId(principal, body.leadId, leadProperties);
            }

            return { orderId: order.id };
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *
     * @param lead
     * @param body
     */
    private async validateCheckout(body: CheckoutDto) {

        if (!body.products) {
            throw new ExceptionType(400, 'please select products');
        }

        if (!body.addressId) {
            throw new ExceptionType(400, 'please add an address to the lead');
        }

        if (!body.contactId) {
            throw new ExceptionType(400, 'please add a contact to the lead');
        }

    }

    /**
     * @param addrSalesStatus
     */
    private async validateAddressStatus(addrSalesStatus: string) {

        if (addrSalesStatus !== 'ORDER' && addrSalesStatus !== 'PRE_ORDER') {
            throw new ExceptionType(400, 'Address status must be Order or PreOrder');
        }

    }

}
