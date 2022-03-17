import { BillingDatesCalculator } from '@d19n/common/dist/billing/helpers/BillingDatesCalculator';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { IDbRecordCreateUpdateRes } from '@d19n/models/dist/schema-manager/db/record/interfaces/interfaces';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import {
    getAllRelations,
    getFirstRelation,
    getProperty,
    getPropertyFromRelation,
} from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbService } from '@d19n/schema-manager/dist/db/db.service';
import { DbRecordsAssociationsService } from '@d19n/schema-manager/dist/db/records/associations/db.records.associations.service';
import { DbRecordsService } from '@d19n/schema-manager/dist/db/records/db.records.service';
import { SchemasService } from '@d19n/schema-manager/dist/schemas/schemas.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { CreateOrderItemFromProduct } from '../../helpers/CreateOrderItemFromProduct';
import { OrdersService } from '../orders.service';
import moment = require('moment');

dotenv.config();

const { ORDER_MODULE } = SchemaModuleTypeEnums;
const { ORDER } = SchemaModuleEntityTypeEnums;

@Injectable()
export class OrdersItemsService {

    private schemasService: SchemasService;
    private dbRecordsService: DbRecordsService;
    private dbRecordsAssociationsService: DbRecordsAssociationsService;
    private dbService: DbService;
    private ordersService: OrdersService;

    constructor(
        schemasService: SchemasService,
        dbRecordsService: DbRecordsService,
        @Inject(forwardRef(() => DbRecordsAssociationsService)) dbRecordsAssociationsService: DbRecordsAssociationsService,
        @Inject(forwardRef(() => DbService)) dbService: DbService,
        @Inject(forwardRef(() => OrdersService)) ordersService: OrdersService,
    ) {

        this.schemasService = schemasService;
        this.dbService = dbService;
        this.dbRecordsService = dbRecordsService;
        this.dbRecordsAssociationsService = dbRecordsAssociationsService;
        this.ordersService = ordersService;
    }


    /**
     *
     * @param principal
     * @param orderItemId
     * @param body
     */
    public async amendOrderItemProductById(
        principal: OrganizationUserEntity,
        orderItemId: string,
        body: DbRecordAssociationCreateUpdateDto,
    ): Promise<IDbRecordCreateUpdateRes> {
        try {
            const { ORDER, PRODUCT, OFFER } = SchemaModuleEntityTypeEnums;

            const orderItem = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderItemId,
                [ ORDER, PRODUCT, OFFER ],
            );

            const order = orderItem[ORDER].dbRecords[0];
            const existingProducts = orderItem[PRODUCT].dbRecords;
            const exitingOffers = orderItem[OFFER] && orderItem[OFFER].dbRecords;

            // Get new product
            const product = await this.dbRecordsAssociationsService.getRelatedRecordById(
                principal,
                {
                    recordId: body.recordId,
                    dbRecordAssociationId: body.relatedAssociationId,
                },
            );

            console.log('AMEND_PRODUCT', product)

            // TODO: Validate changes against work orders

            // TODO: Validate changes against invoices

            // TODO: Create order amendment entity with details of the amendment

            // TODO: Track whether this is an Upgrade / Downgrade

            // Delete current product association
            if (existingProducts) {
                await this.dbRecordsAssociationsService.deleteRelatedRecordById(
                    principal,
                    existingProducts[0].dbRecordAssociation.id,
                );
            }

            // ODN-1474 delete current offer association
            if (exitingOffers && exitingOffers.length > 0) {
                await this.dbRecordsAssociationsService.deleteRelatedRecordById(
                    principal,
                    exitingOffers[0].dbRecordAssociation.id,
                );
            }

            // Updated order item and add a new association
            const OrderItemUpdate = {
                entity: `${SchemaModuleTypeEnums.ORDER_MODULE}:${SchemaModuleEntityTypeEnums.ORDER_ITEM}`,
                title: getProperty(product, 'DisplayName') || product.title,
                properties: {
                    ...CreateOrderItemFromProduct.construct(product, getProperty(orderItem, 'Quantity'), order),
                    DiscountEndDate: null,
                    TrialEndDate: null,
                },
                associations: [
                    {
                        recordId: product.id,
                        relatedAssociationId: product.dbRecordAssociation.id,
                    },
                ],
            };

            console.log('OrderItemUpdate', OrderItemUpdate)

            // ODN-1474 add an association to offer if offerId additional param is specified
            if (body.additionalParams && body.additionalParams.offerId) {
                OrderItemUpdate.associations.push(
                    {
                        recordId: body.additionalParams.offerId,
                        relatedAssociationId: undefined,
                    },
                );
            }

            return await this.dbService.updateDbRecordsByPrincipalAndId(
                principal,
                orderItem.id,
                OrderItemUpdate,
            );

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     *  Add order items to an order
     * @param principal
     * @param orderId
     * @param headers
     * @param body
     */
    public async createOrderItemsFromProducts(
        principal: OrganizationUserEntity,
        orderId: string,
        body: DbRecordAssociationCreateUpdateDto[],
    ): Promise<IDbRecordCreateUpdateRes[]> {
        try {

            const { ORDER_ITEM } = SchemaModuleEntityTypeEnums;

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [ ORDER_ITEM ],
            );

            // de-duplicate the body of products
            const filtered = body.filter((
                item,
                index,
                self,
            ) => self.findIndex(t => t.recordId === item.recordId && t.relatedAssociationId === item.relatedAssociationId) === index)

            const existingItems = getAllRelations(order, ORDER_ITEM);
            const existingProducts = []

            // Get the existing product and price book
            if (existingItems) {
                for(const item of existingItems) {
                    const orderItem = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                        principal,
                        item.id,
                        [],
                        undefined,
                        true,
                    );
                    const productLink = orderItem.links.find(elem => elem.entity === 'ProductModule:Product')

                    console.log('orderItem', orderItem)
                    console.log('productLink', productLink)

                    if (productLink) {
                        const product = {
                            id: productLink.id,
                            relatedAssociationId: productLink.relatedAssociationId,
                        }
                        existingProducts.push(product)

                    } else {
                        const product = {
                            id: getProperty(orderItem, 'ProductRef'),
                            relatedAssociationId: undefined,
                        }
                        existingProducts.push(product)
                    }
                }
            }

            // TODO: Add all order product rule interpreters;

            // retrieve products
            const products = [];
            for(const item of filtered) {
                if (item.relatedAssociationId) {
                    const product = await this.dbRecordsAssociationsService.getRelatedRecordById(
                        principal,
                        {
                            recordId: item.recordId,
                            dbRecordAssociationId: item.relatedAssociationId,
                        },
                    );

                    // if the Product id and PriceBook relation do not exist then add the new item
                    if (!existingProducts.find(elem => elem.id === product.id && elem.relatedAssociationId === item.relatedAssociationId)) {
                        products.push(product);
                    }
                } else {
                    const product = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                        principal,
                        item.recordId,
                        [],
                    );
                    if (!existingProducts.find(elem => elem.id === product.id)) {
                        products.push(product);
                    }
                }
            }

            // Find all products that should be added to the order
            const orderItemsToCreate: DbRecordCreateUpdateDto[] = [];

            for(const newItem of filtered) {
                const product = products.find(elem => elem.id === newItem.recordId);

                if (product) {
                    const createOrderItem = {
                        entity: `${SchemaModuleTypeEnums.ORDER_MODULE}:${SchemaModuleEntityTypeEnums.ORDER_ITEM}`,
                        title: getProperty(product, 'DisplayName') || product.title,
                        properties: CreateOrderItemFromProduct.construct(product, 1, order),
                        associations: [
                            {
                                recordId: order.id,
                            },
                            {
                                recordId: product.id,
                                relatedAssociationId: product.dbRecordAssociation ? product.dbRecordAssociation.id : undefined,
                            },
                        ],
                    };
                    // ODN-1474 add an association to offer if offerId additionalParam is specified
                    if (newItem.additionalParams && newItem.additionalParams.offerId) {
                        createOrderItem.associations.push({ recordId: newItem.additionalParams.offerId });
                    }
                    orderItemsToCreate.push(createOrderItem);
                }
            }

            const createdItemsRes = await this.dbService.updateOrCreateDbRecordsByPrincipal(
                principal,
                orderItemsToCreate,
                { upsert: true },
            );

            // ODN-1660 recalculate all items to apply the order level AMOUNT discount correctly
            if (order.properties?.DiscountType === 'AMOUNT' && Number(order.properties?.DiscountValue) > 0) {
                const items = [];
                if (existingItems?.length > 0) {
                    items.push(...existingItems);
                }
                for(const itemCreateRes of createdItemsRes) {
                    const createdItem = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                        principal,
                        itemCreateRes.id,
                        [],
                    );
                    items.push(createdItem);
                }
                await this.recalculateAndUpdateOrderItemsTotals(principal, items, order);
            }

            return createdItemsRes;
        } catch (e) {
            console.error(e)
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * ODN-1660 Recalculates order items totals taking into account the order level AMOUNT discount
     *
     * @param principal
     * @param orderItems
     * @param order
     * @returns
     */
    public async recalculateAndUpdateOrderItemsTotals(
        principal: OrganizationUserEntity,
        orderItems: DbRecordEntityTransform[],
        order: DbRecordEntityTransform,
    ): Promise<IDbRecordCreateUpdateRes[]> {

        try {
            if (order && orderItems?.length > 0) {

                // recalculate items
                const recalculatedItems = OrderInvoiceItemCalculations.recalculateItemsTotals(orderItems, order);

                // update items
                const itemsToUpdate: [ string, DbRecordCreateUpdateDto ][] = [];
                const updatedItems: IDbRecordCreateUpdateRes[] = [];

                for(const item of recalculatedItems) {
                    const updateItemDto = new DbRecordCreateUpdateDto();
                    updateItemDto.entity = `OrderModule:OrderItem`;
                    updateItemDto.properties = {
                        TotalPrice: item.properties.TotalPrice,
                        TotalTaxAmount: item.properties.TotalTaxAmount,
                    };

                    itemsToUpdate.push([ item.id, updateItemDto ]);
                }

                for(const update of itemsToUpdate) {
                    const itemUpdateRes = await this.dbService.updateDbRecordsByPrincipalAndId(
                        principal,
                        update[0],
                        update[1],
                    );
                    updatedItems.push(itemUpdateRes);
                }

                return updatedItems;
            }
        } catch (e) {
            console.log(e);
            throw new ExceptionType(e.statusCode, e.message, e.validation);
        }
    }

    /**
     * ODN-1660 Recalculates all related orders
     *
     * @param principal
     * @param orderItemId
     * @param recalculateAllOrderItems
     */
    public async recalculateRelatedOrdersByOrderItem(
        principal: OrganizationUserEntity,
        orderItemId: string,
        recalculateAllOrderItems: boolean,
    ): Promise<boolean> {
        try {

            const orderSchema = await this.schemasService.getSchemaByOrganizationAndEntity(
                principal,
                `${ORDER_MODULE}:${ORDER}`,
            );

            const parentRecordIds = await this.dbRecordsAssociationsService.getRelatedParentRecordIds(
                principal,
                {
                    recordId: orderItemId,
                    parentSchemaId: orderSchema.id,
                    relatedAssociationId: undefined,
                },
                { withDeleted: true },
            );

            for(const parentId of parentRecordIds) {

                if (recalculateAllOrderItems) {
                    // ODN-1660 recalculate all items to apply the order level AMOUNT discount correctly
                    await this.ordersService.recalculateAndUpdateOrderItemsTotals(principal, parentId);
                }

                await this.ordersService.computeOrderTotals(principal, parentId);
            }

            return true;
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param orderItemId
     */
    public async handleProductAssociationAddedToOrderItem(
        principal: OrganizationUserEntity,
        orderItemId: string,
    ): Promise<any> {
        try {
            const orderItem = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderItemId,
                [ 'Order' ],
            )
            const orderItemOrder = getFirstRelation(orderItem, ORDER)

            // If the order is in the success stage process order item for billing
            if (orderItemOrder.stage.isSuccess) {

                await this.processOrderItemsForBilling(principal, orderItemOrder.id, [ orderItem.id ])

            } else {

                // ODN-1660 otherwise recalculate all items to apply the order level AMOUNT discount correctly
                await this.ordersService.recalculateAndUpdateOrderItemsTotals(principal, orderItemOrder.id);
            }

            // Compute order total
            return await this.ordersService.computeOrderTotals(principal, orderItemOrder.id);

        } catch (e) {
            console.error(e)
            throw new ExceptionType(e.statusCode, e.message);
        }

    }


    /**
     *
     * @param principal
     * @param orderId
     * @param billingStartDate
     * @param orderItemIds
     */
    public async processOrderItemsForBilling(
        principal: OrganizationUserEntity,
        orderId: string,
        orderItemIds: string[],
    ): Promise<IDbRecordCreateUpdateRes[]> {
        try {

            const { PRODUCT } = SchemaModuleEntityTypeEnums;
            let modified: IDbRecordCreateUpdateRes[] = [];

            const order = await this.dbService.getDbRecordTransformedByOrganizationAndId(
                principal,
                orderId,
                [],
            );

            if (order.stage.isSuccess) {

                // get items
                const orderItems: DbRecordEntityTransform[] = [];
                for(const id of orderItemIds) {
                    const orderItem = <DbRecordEntityTransform>await this.dbService.getDbRecordTransformedByOrganizationAndId(
                        principal,
                        id,
                        [ PRODUCT ],
                    );
                    orderItems.push(orderItem);
                }

                // set items properties for recalculation
                const billingStartDate = getProperty(order, 'BillingStartDate');
                const adjustedBillingStartDateToBillingDay = BillingDatesCalculator.getAdjustedBillingStartDateToBillingDay(
                    order);

                for(const orderItem of orderItems) {

                    console.log('orderItem', orderItem)

                    const product = getFirstRelation(orderItem, PRODUCT)

                    console.log('OrderItem__Product', product)

                    const {
                        nextBillingDate,
                        nextInvoiceDate,
                        periodType,
                        trialEndDate,
                        discountEndDate,
                    } = BillingDatesCalculator.computeBillingPeriodDates(
                        adjustedBillingStartDateToBillingDay,
                        orderItem,
                    );

                    const originalDiscountTypeBefore = getProperty(orderItem, 'DiscountType');
                    const originalDiscountValueBefore = getProperty(orderItem, 'DiscountValue');

                    console.log({
                        originalDiscountTypeBefore,
                        originalDiscountValueBefore,
                    })

                    /* Correct Discount / Free period for accurate total price calculation */
                    const originalDiscountType = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountType');
                    const originalDiscountValue = getPropertyFromRelation(orderItem, PRODUCT, 'DiscountValue');

                    console.log({
                        originalDiscountTypeAfter: originalDiscountType,
                        originalDiscountValueAfter: originalDiscountValue,

                    })

                    const { discountType, discountValue } = OrderInvoiceItemCalculations.getDiscountSettingsByPeriodType(
                        periodType,
                        originalDiscountType,
                        originalDiscountValue,
                    );
                    orderItem.properties.DiscountType = discountType;
                    orderItem.properties.DiscountValue = discountValue;

                    // set other properties
                    orderItem.properties.ActivationStatus = 'CLOSED';
                    orderItem.properties.BillingStartDate = moment(billingStartDate).format('YYYY-MM-DD');
                    orderItem.properties.NextBillingDate = moment(nextBillingDate).format('YYYY-MM-DD');
                    orderItem.properties.NextInvoiceDate = moment(nextInvoiceDate).format('YYYY-MM-DD');
                    orderItem.properties.DiscountEndDate = discountEndDate ? moment(discountEndDate).format('YYYY-MM-DD') : undefined;
                    orderItem.properties.TrialEndDate = trialEndDate ? moment(trialEndDate).format('YYYY-MM-DD') : undefined;
                    orderItem.properties.BillingPeriodType = periodType;

                    console.log({ orderItemProperties: orderItem.properties, nextBillingDate, nextInvoiceDate, periodType, trialEndDate, discountEndDate });
                }

                // recalculate items
                const recalculatedOrderItems = OrderInvoiceItemCalculations.recalculateItemsTotals(orderItems, order);

                // update items
                for(const orderItem of recalculatedOrderItems) {

                    // ODN-1542 fix: remove discount when the STANDARD period begins
                    const isRemoveDiscountPeriod = OrderInvoiceItemCalculations.checkIsRemoveDiscountPeriod(orderItem.properties.BillingPeriodType);

                    const update = new DbRecordCreateUpdateDto();
                    update.schemaId = orderItem.schemaId;
                    update.properties = {
                        ActivationStatus: orderItem.properties.ActivationStatus,
                        BillingStartDate: orderItem.properties.BillingStartDate,
                        NextBillingDate: orderItem.properties.NextBillingDate,
                        NextInvoiceDate: orderItem.properties.NextInvoiceDate,

                        // ODN-1542 fix: remove discount when the STANDARD period begins
                        DiscountType: isRemoveDiscountPeriod ? 'AMOUNT' : getPropertyFromRelation(orderItem, PRODUCT, 'DiscountType'),
                        DiscountValue: isRemoveDiscountPeriod ? 0 : getPropertyFromRelation(orderItem, PRODUCT, 'DiscountValue'),

                        DiscountEndDate: orderItem.properties.DiscountEndDate,
                        TrialEndDate: orderItem.properties.TrialEndDate,
                        BillingPeriodType: orderItem.properties.BillingPeriodType,
                        TotalPrice: orderItem.properties.TotalPrice,
                        TotalTaxAmount: orderItem.properties.TotalTaxAmount,
                    };

                    console.log('before', {
                        // ODN-1542 fix: remove discount when the STANDARD period begins
                        DiscountType: isRemoveDiscountPeriod ? 'AMOUNT' : undefined,
                        DiscountValue: isRemoveDiscountPeriod ? 0 : undefined,
                    })

                    console.log('update', update)

                    const updatedItem = await this.dbService.updateDbRecordsByPrincipalAndId(
                        principal,
                        orderItem.id,
                        update,
                    );
                    modified.push(updatedItem);
                }
            }

            return modified;

        } catch (e) {
            console.log(e);
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
        orderItemId: string,
    ): Promise<IDbRecordCreateUpdateRes> {
        try {
            return await this.dbService.updateDbRecordsByPrincipalAndId(principal, orderItemId, {
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
        } catch (e) {
            throw new ExceptionType(e.statusCode, e.message);
        }
    }
}
