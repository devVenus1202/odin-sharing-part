import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getFirstRelation, getProperty, getRelation } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import moment from 'moment';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });

const httpClient = new BaseHttpClient();
const apiToken = process.env.ODIN_API_TOKEN;
const baseUrl = process.env.K8_BASE_URL;

async function sync() {
    try {

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const queryStart = moment().utc().startOf('day').format('YYYY-MM-DD');
        console.log('queryStart', queryStart);
        // Count # of months since order billing start date
        // Count # of invoices for the order
        // Check that the total orders = total invoices
        const records = await pg.query(
            `SELECT db_records.id as record_id
            FROM db_records
            LEFT JOIN pipelines_stages s on (s.id = db_records.stage_id)
            LEFT JOIN db_records_columns c on (c.record_id = db_records.id and c.column_name = 'ContractType')
            WHERE entity = 'OrderModule:Order'
            AND s.key NOT IN ('OrderStageCancelled', 'OrderStageDraft')
            AND c.value IS NULL
            AND deleted_at IS NULL`);

        console.log('records', records.length);

        let totalIssues = 0

        for(const record of records) {
            const orderRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                `v1.0/db/Order/${record.record_id}?entities=["Discount", "OrderItem"]`,
                apiToken,
            );
            const order = orderRes['data'];
            const orderItems = getRelation(order, 'OrderItem');
            const discount = getFirstRelation(order, 'Discount');

            if (orderItems && !discount) {
                let contractType = getProperty(order, 'ContractType')
                const discountLength = getProperty(discount, 'DiscountLength');

                console.log('contractType', contractType);

                if (!contractType) {
                    const parsedItems = await getContractType(orderItems)
                    console.log('parsedItems', parsedItems)
                    contractType = parsedItems.contractType

                    // set the contractType of the Order
                    const updateOrderDto = new DbRecordCreateUpdateDto();
                    updateOrderDto.entity = 'OrderModule:Order';
                    updateOrderDto.properties = {
                        ContractType: contractType,
                    };
                    console.log('updateOrderDto', updateOrderDto)

                    const orderUpdateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                        `v1.0/db/Order/${order.id}?queue=true`,
                        apiToken,
                        updateOrderDto,
                    );
                    console.log('orderUpdateRes', orderUpdateRes)
                }

                const contractLength = contractType.split('_')[1]

                console.log('discountLength', discountLength);
                console.log('contractLength', contractLength);


                if (discountLength !== contractLength && contractType !== 'MONTHLY') {
                    console.log('duration does not match', order.title, order.id)

                    if (contractLength === '18' && discountLength === '12') {
                        // remove the 12 month discount
                        console.log('discountAssociationId', discount.dbRecordAssociation.id)
                        const deleteRes = await httpClient.deleteRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db-associations/${discount.dbRecordAssociation.id}`,
                            apiToken,
                            false,
                        );
                        console.log('deleteRes', deleteRes['data'])

                        // add the 18 month discount
                        const discountRes = await httpClient.getRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.PRODUCT_MODULE),
                            `v1.0/discounts/byCode/10OFF18`,
                            apiToken,
                        );
                        const newDiscount = discountRes['data'];
                        console.log('newDiscount', newDiscount)

                        const updateDto = new DbRecordAssociationCreateUpdateDto();
                        updateDto.recordId = newDiscount.id;

                        console.log('updateDto', updateDto)

                        const res = await httpClient.postRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db-associations/Order/${order.id}`,
                            apiToken,
                            [ updateDto ],
                            false,
                        );
                        console.log('association', res['data'])


                    } else if (contractLength === '12' && discountLength === '18') {
                        // remove the 18 month discount
                        console.log('discountAssociationId', discount.dbRecordAssociation.id)
                        const deleteRes = await httpClient.deleteRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db-associations/${discount.dbRecordAssociation.id}`,
                            apiToken,
                            false,
                        );
                        console.log('deleteRes', deleteRes['data'])

                        // add the 12 month discount
                        const discountRes = await httpClient.getRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.PRODUCT_MODULE),
                            `v1.0/discounts/byCode/10OFF12`,
                            apiToken,
                        );
                        const newDiscount = discountRes['data'];
                        console.log('newDiscount', newDiscount)

                        const updateDto = new DbRecordAssociationCreateUpdateDto();
                        updateDto.recordId = newDiscount.id;

                        console.log('updateDto', updateDto)

                        const res = await httpClient.postRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db-associations/Order/${order.id}`,
                            apiToken,
                            [ updateDto ],
                            false,
                        );
                        console.log('association', res['data'])
                    }
                    totalIssues++
                }
            }
        }

        console.log('totalOrders', records.length)
        console.log('totalIssues', totalIssues)
        return;
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

/**
 *
 * @param orderItems
 */
const getContractType = async (orderItems) => {

    let contractType;

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

    if (orderItem) {
        const productRes = await httpClient.getRequest(
            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
            `v1.0/db/Product/${getProperty(orderItem, 'ProductRef')}`,
            apiToken,
        );
        const product = productRes['data']

        contractType = getProperty(product, 'ContractType');
    }

    return { contractType };

}

sync();
