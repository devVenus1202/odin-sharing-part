import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrderInvoiceCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceCalculations';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../.env' });
//dotenv.config({ path: './modules/odin-api-connect/.env' }); // local debug

const apiToken = process.env.ODIN_API_TOKEN;

async function sync() {
    try {
        const httpClient = new BaseHttpClient();

        const pg = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const records = await pg.query(
            `SELECT r.id
                , c1.Value as DiscountLength, c2.Value as DiscountUnit
                , c3.Value as TrialLength, c4.Value as TrialUnit
                , pipelines_stages.name as Stage
            FROM db_records as r
                left join db_records_columns c1 on (c1.record_id = r.id AND c1.column_name = 'DiscountLength')
                left join db_records_columns c2 on (c2.record_id = r.id AND c2.column_name = 'DiscountUnit')
                left join db_records_columns c3 on (c3.record_id = r.id AND c3.column_name = 'TrialLength')
                left join db_records_columns c4 on (c4.record_id = r.id AND c4.column_name = 'TrialUnit')

                left join pipelines_stages ON (pipelines_stages.id = r.stage_id)

                --join db_records_associations ra on ra.parent_record_id = r.id
                    --and ra.child_schema_id='af9351cf-2b98-49da-b142-a3bd85956356' -- having related discount

            WHERE r.entity = 'OrderModule:Order' and r.deleted_at is null
                --and c1.Value is null
                --and pipelines_stages.name = 'Active'
                --and r.id = 'f5af6a0c-657f-4726-86bd-0dca8276a0ef'
                --and r.id not in ('abd854ab-a442-42f6-a758-6ba96e412a33','f5af6a0c-657f-4726-86bd-0dca8276a0ef')
            --limit 1
            `);

        console.log('records', records.length);
        let counter = 0;
        const failedRecords = [];

        for(const record of records) {
            counter++;
            console.log(`processing ${counter}/${records.length} order.id`, record.id);

            try {
                const orderRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                    `v1.0/db/Order/${record.id}?entities=["Discount","OrderItem"]`,
                    apiToken,
                );
                const order = orderRes['data'];

                // update trial / discount periods settings
                if (order?.Discount?.dbRecords?.length > 0) {
                    const discount = order.Discount.dbRecords[0];

                    order.properties.DiscountLength = getProperty(discount, 'DiscountLength');
                    order.properties.DiscountUnit = getProperty(discount, 'DiscountUnit');
                    order.properties.TrialLength = getProperty(discount, 'TrialLength');
                    order.properties.TrialUnit = getProperty(discount, 'TrialUnit');

                    const updateOrderDto = new DbRecordCreateUpdateDto();
                    updateOrderDto.entity = 'OrderModule:Order';
                    updateOrderDto.properties = {
                        DiscountLength: order.properties.DiscountLength,
                        DiscountUnit: order.properties.DiscountUnit,
                        TrialLength: order.properties.TrialLength,
                        TrialUnit: order.properties.TrialUnit,
                    };

                    const orderUpdateRes = await httpClient.putRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                        `v1.0/db/Order/${order.id}?queue=true`,
                        apiToken,
                        updateOrderDto,
                    );

                    if (orderUpdateRes['statusCode'] !== 200) {
                        console.log('Error updating order.id', order.id);
                        console.log('Response:', JSON.stringify(orderUpdateRes));
                    } else {
                        console.log(`Updated order: ${JSON.stringify(updateOrderDto.properties)}. order.id: `, order.id)
                    }
                }

                if (order.stage.name === 'Active') {

                    // process Active order for billing to recalculate totals
                    const processRes = await httpClient.postRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                        `v1.0/orders/${order.id}/billing`,
                        apiToken,
                        {
                            BillingStartDate: getProperty(order, 'BillingStartDate'),
                            ContractStartDate: getProperty(order, 'ContractStartDate') || getProperty(
                                order,
                                'BillingStartDate',
                            ),
                        },
                    );

                    if (processRes['statusCode'] !== 200 && processRes['statusCode'] !== 201) {
                        console.log('Error processing order.id', order.id);
                        console.log('Response:', JSON.stringify(processRes));
                    } else {
                        console.log(`Process order for billing succeeded. order.id: `, order.id)
                    }
                } else {

                    // otherwise recalculate and update orders and order items in the script
                    const orderItems = order?.OrderItem?.dbRecords;
                    if (orderItems?.length > 0) {

                        // ODN-1660 recalculate items
                        const recalculatedOrderItems = OrderInvoiceItemCalculations.recalculateItemsTotals(
                            orderItems,
                            order,
                        );

                        for(const item of recalculatedOrderItems) {

                            // update order item TotalPrice and TotalTaxAmount
                            const updateOrderItemDto = new DbRecordCreateUpdateDto();
                            updateOrderItemDto.entity = `OrderModule:OrderItem`;
                            updateOrderItemDto.properties = {
                                TotalTaxAmount: item.properties.TotalTaxAmount,
                                TotalPrice: item.properties.TotalPrice,
                            };

                            const orderItemUpdateRes = await httpClient.putRequest(
                                Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                                `v1.0/db/OrderItem/${item.id}?queue=true`,
                                apiToken,
                                updateOrderItemDto,
                            );

                            if (orderItemUpdateRes['statusCode'] !== 200) {
                                console.log('Error updating orderItem.id', item.id);
                                console.log('Response:', JSON.stringify(orderItemUpdateRes));
                            } else {
                                console.log(
                                    `Updated order item: ${JSON.stringify(updateOrderItemDto.properties)}. orderItem.id: `,
                                    item.id,
                                )
                            }
                        }

                        // calculate and update order totals
                        const updateOrderDto = new DbRecordCreateUpdateDto();
                        updateOrderDto.entity = 'OrderModule:Order';
                        updateOrderDto.properties = {
                            Subtotal: OrderInvoiceCalculations.computeSubtotal(orderItems),
                            TotalDiscounts: OrderInvoiceCalculations.computeTotalDiscounts(orderItems, order),
                            TotalTaxAmount: OrderInvoiceCalculations.computeTotalTaxAmount(orderItems, order),
                            TotalPrice: OrderInvoiceCalculations.computeTotal(orderItems, order),
                        };

                        const orderUpdateRes = await httpClient.putRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db/Order/${order.id}?queue=true`,
                            apiToken,
                            updateOrderDto,
                        );

                        if (orderUpdateRes['statusCode'] !== 200) {
                            console.log('Error updating order.id', order.id);
                            console.log('Response:', JSON.stringify(orderUpdateRes));
                        } else {
                            console.log(
                                `Updated order: ${JSON.stringify(updateOrderDto.properties)}. order.id: `,
                                order.id,
                            )
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                failedRecords.push(record.id);
            }
        }

        console.log('Failed records:');
        failedRecords.forEach(id => console.log(id));

        return 'done';
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
