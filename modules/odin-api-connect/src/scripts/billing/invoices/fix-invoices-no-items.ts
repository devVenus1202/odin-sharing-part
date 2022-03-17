import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import {
    getAllRelations,
    getFirstRelation,
    getProperty,
} from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';

dotenv.config({ path: '../../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;
const baseUrl = process.env.K8_BASE_URL;

// Run this at 1:00am daily
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

        const errors = await pg.query(
            `select r.id, r.title, c.value, c2.value, c3.value
                from db_records r
                left join db_records_columns c on (r.id = c.record_id and c.column_name = 'Status')
                left join db_records_columns c2 on (r.id = c2.record_id and c2.column_name = 'Balance')
                left join db_records_columns c3 on (r.id = c3.record_id and c3.column_name = 'DueDate')
                where entity = 'BillingModule:Invoice'
                and c.value = 'ERROR'
                and r.deleted_at is null
                and r.created_at < now()
                and r.created_at > now() - INTERVAL '2 DAYS'
           `);

        console.log('invoices', [ ...errors ]);

        for(const record of [ ...errors ]) {

            const invoiceRes = await httpClient.getRequest(
                Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                `v1.0/db/Invoice/${record.id}?entities=["Transaction", "InvoiceItem"]`,
                apiToken,
            );
            const invoice = invoiceRes['data'];

            const invoiceItem = getAllRelations(invoice, 'InvoiceItem')

            const invoiceStatus = getProperty(invoice, 'Status');
            console.log('------', invoiceStatus);

            if (invoice && !invoiceItem) {
                console.log('NO INVOICE ITEM', invoiceItem)

                const orderRes = await httpClient.getRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                    `v1.0/db/Order/${getProperty(
                        invoice,
                        'OrderRef',
                    )}?entities=["Contact", "Address", "Account", "OrderItem", "Discount", "BillingAdjustment"]`,
                    apiToken,
                );
                const order = orderRes['data'];
                const account = getFirstRelation(order, 'Account')
                const address = getFirstRelation(order, 'Contact')
                const contact = getFirstRelation(order, 'Address')
                const discount = getFirstRelation(order, 'Discount')
                const orderItems = getAllRelations(order, 'OrderItem')
                const billingAdjustment = getFirstRelation(order, 'BillingAdjustment')

                if (account && address && contact) {
                    console.log('Build invoice ------ ')
                    console.log('invoiceId', invoice?.id)
                    console.log('orderId', order?.id)
                    console.log('accountId', account?.id)
                    console.log('addressId', address?.id)
                    console.log('contactId', contact?.id)
                    console.log('discountId', discount?.id)

                    // Add missing relations
                    const newRelations = [
                        {
                            recordId: order.id,
                        },
                        {
                            recordId: account.id,
                        },
                        {
                            recordId: address.id,
                        },
                        {
                            recordId: contact.id,
                        },
                        {
                            recordId: discount?.id,
                        },
                        {
                            recordId: billingAdjustment?.id,
                        },
                    ]

                    console.log('newRelations', newRelations)

                    const newAssociation = await httpClient.postRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                        `v1.0/db-associations/Invoice/${invoice.id}`,
                        apiToken,
                        newRelations,
                    );

                    console.log('newAssociation', newAssociation)


                    // Create the invoice items
                    const newProducts = []

                    for(const item of orderItems) {

                        const orderItemRes = await httpClient.getRequest(
                            Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                            `v1.0/db/Order/${item.id}`,
                            apiToken,
                        );
                        const orderItem = orderItemRes['data'];

                        const productLink = orderItem.links.find(elem => elem.entity === 'ProductModule:Product')

                        if (productLink) {
                            const product = {
                                recordId: productLink.id,
                                relatedAssociationId: productLink.relatedAssociationId,
                            }
                            newProducts.push(product)

                        } else {
                            const product = {
                                recordId: getProperty(orderItem, 'ProductRef'),
                                relatedAssociationId: undefined,
                            }
                            newProducts.push(product)
                        }
                    }

                    console.log('newProducts', newProducts)

                    const newInvoiceItems = await httpClient.postRequest(
                        Utilities.getBaseUrl(SERVICE_NAME.BILLING_MODULE),
                        `v1.0/invoices/${invoice.id}/items`,
                        apiToken,
                        newProducts,
                    );

                    console.log('newInvoiceItems', newInvoiceItems)

                }

            }
            console.log('SKIPPED---')
        }
        return;
    } catch (e) {
        console.error(e);
    }
}

sync();
