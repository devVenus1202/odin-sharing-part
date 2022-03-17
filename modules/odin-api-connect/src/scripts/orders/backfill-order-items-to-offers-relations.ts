import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
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
            `
select
	ra_oir.parent_record_id as id
	, ra_oir.parent_entity
	, ra_oir.child_entity
	, ra_oir.child_record_id
	, ra_oir.related_association_id
	, ra_ofp.related_association_id
	, ra_ofp.parent_record_id as offer_id
	, ra_ofp.parent_entity
from (
	select
		ra_ooi.created_at as order_to_order_item_created_at
		, ra_ooi.deleted_at
		, ra_ooi.parent_record_id as order_id
		, ra_ooi.parent_entity as order_to_order_item_parent_entity
		, ra_oir.parent_record_id --as order_item_id
		, ra_oir.parent_entity -- as order_item_to_product_parent_entity
		, ra_oir.child_entity --as order_item_to_product_child_entity
		, ra_oir.child_record_id --as product_id
		, ra_oir.related_association_id --as related_pricebook_to_product_association_id
		, ra_oir.deleted_at
		, count(ra_ofp.parent_record_id) as countOffers -- count of offers having the same pricebook<>product relation
	from db_records_associations ra_ooi -- order <> order item relation
		inner join db_records order_items on order_items.id = ra_ooi.child_record_id
			and order_items.deleted_at is null
		left join db_records_associations ra_oir on -- order item relations
			ra_oir.parent_record_id = ra_ooi.child_record_id
			and ra_oir.deleted_at is null
		left join public.db_records_associations ra_ofp on -- offer <> produt relations
			ra_ofp.parent_schema_id = '66b2f17d-f7d2-41f6-b6cb-c5b23566aa1d' -- offer
			and ra_ofp.related_association_id = ra_oir.related_association_id -- having the same pricebook<>product related association as in order item
			and ra_ofp.child_record_id = ra_oir.child_record_id -- linked to the same product as an order item
			and ra_ofp.deleted_at is null
	where 
		ra_ooi.parent_schema_id='1c5fde92-c8ac-4fd9-b93b-26f5920218bf' -- order
		and ra_ooi.child_schema_id='05896109-7282-443a-be9e-4092abae5be5' -- order item in order
		and (
			ra_oir.child_schema_id='82b38bf4-5bb6-4687-9e26-3dcbcdcf9fdd' -- product in order item
			--or 
			--ra_oir.child_schema_id='66b2f17d-f7d2-41f6-b6cb-c5b23566aa1d' -- offer in order item
		)
		--and ra_ooi.parent_record_id='fdc611de-ba7b-4a2b-be7a-eeb093071b35' -- current order
		and ra_ooi.deleted_at is null
	group by
		ra_ooi.created_at,
		ra_ooi.deleted_at,
		ra_ooi.parent_record_id,
		ra_ooi.parent_entity,
		ra_oir.parent_record_id,
		ra_oir.parent_entity,
		ra_oir.child_entity,
		ra_oir.child_record_id,
		ra_oir.related_association_id, 
		ra_oir.deleted_at
	having count(ra_ofp.parent_record_id) = 1
) ra_oir
	left join db_records_associations ra_ofp on -- offer <> produt relations
		ra_ofp.parent_schema_id = '66b2f17d-f7d2-41f6-b6cb-c5b23566aa1d' -- offer
		and ra_ofp.child_schema_id = '82b38bf4-5bb6-4687-9e26-3dcbcdcf9fdd' -- product
		and ra_ofp.related_association_id = ra_oir.related_association_id -- having the same pricebook<>product related association as in order item
		and ra_ofp.child_record_id = ra_oir.child_record_id -- linked to the same product as an order item
		and ra_ofp.deleted_at is null
	inner join db_records offers on offers.id = ra_ofp.parent_record_id
		and offers.deleted_at is null
	left join db_records_associations ra_oio on -- order item <> offer relations
		ra_oio.child_schema_id='66b2f17d-f7d2-41f6-b6cb-c5b23566aa1d' -- offer
		and ra_oio.parent_record_id = ra_oir.parent_record_id
		and ra_oio.deleted_at is null
where ra_oio.child_record_id is null
	--and ra_oir.parent_record_id in ('fd4336cd-7e92-4040-b97e-98b0188b24e9','30b98bb9-dd22-4d66-b1b9-e3bd6ed631b4')
--limit 100
            `);

        console.log('records', records.length);
        let counter = 0;
        const failedRecords= [];

        for (const record of records) {
            counter++;
            console.log(`processing ${counter}/${records.length} orderItem.id`, record.id);

            try {
                const updateOrderItemDto = new DbRecordCreateUpdateDto();
                updateOrderItemDto.entity = `OrderModule:OrderItem`;
                updateOrderItemDto.associations = [
                    {
                        recordId: record.offer_id,
                    }
                ];

                const orderItemUpdateRes = await httpClient.putRequest(
                    Utilities.getBaseUrl(SERVICE_NAME.ORDER_MODULE),
                    `v1.0/db/OrderItem/${record.id}`,
                    apiToken,
                    updateOrderItemDto,
                );
                
                if (orderItemUpdateRes['statusCode'] !== 200) {
                    console.log('Error updating orderItem.id', record.id);
                    console.log('Response:', JSON.stringify(orderItemUpdateRes));
                } else {
                    console.log(`Updated order item associations: ${JSON.stringify(updateOrderItemDto.associations)}. orderItem.id: `, record.id)
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
