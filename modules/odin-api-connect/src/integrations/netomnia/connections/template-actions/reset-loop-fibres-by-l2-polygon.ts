import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { deleteRecord } from '../data/http';

dotenv.config({ path: '../../../../../.env' });

export async function resetLoopFibersByL2PolygonId(
    polygonId: string,
    { odinDb },
) {

    try {

        const fibers = await odinDb.query(`
        select
            c4.value as fiber_id,
            cr.id as conn_id,
            cr.type,
            c6.value as in_closure,
            c3.value as in_cable,
            c.value as in_tube_fiber,
            c12.value as slot_number,
            c14.value as tray_number,
            c9.value as splitter_number,
            c10.value as splitter_type,
            c17.value as splice_number,
            c7.value as out_closure,
            c2.value as out_cable,
            c1.value as out_tube_fiber,
            c5.value as fiber_state,
            c15.value as in_cable_id,
            c18.value as l2_polygon_id
        from db_records_associations a
            left join db_records cr on (a.child_record_id = cr.id)
            left join db_records_columns c on (c.record_id = cr.id and c.column_name = 'TubeFiberIn')
            left join db_records_columns c1 on (c1.record_id = cr.id and c1.column_name = 'TubeFiberOut')
            left join db_records_columns c2 on (c2.record_id = cr.id and c2.column_name = 'CableOutExternalRef')
            left join db_records_columns c3 on (c3.record_id = cr.id and c3.column_name = 'CableInExternalRef')
            left join db_records_columns c4 on (c4.record_id = cr.id and c4.column_name = 'FiberInId')
            left join db_records_columns c5 on (c5.record_id = c4.value::uuid and c5.column_name = 'FiberState')
            left join db_records_columns c6 on (c6.record_id = cr.id and c6.column_name = 'InClosureExternalRef')
            left join db_records_columns c7 on (c7.record_id = cr.id and c7.column_name = 'OutClosureExternalRef')
            left join db_records_columns c8 on (c8.record_id = cr.id and c8.column_name = 'TraySplitterId')
            left join db_records_columns c9 on (c9.record_id = c8.value::uuid and c9.column_name = 'SplitterNumber')
            left join db_records_columns c10 on (c10.record_id = c8.value::uuid and c10.column_name = 'SplitterType')
            left join db_records_columns c11 on (c11.record_id = cr.id and c11.column_name = 'SlotId')
            left join db_records_columns c12 on (c12.record_id = c11.value::uuid and c12.column_name = 'SlotNumber')
            left join db_records_columns c13 on (c13.record_id = cr.id and c13.column_name = 'TrayId')
            left join db_records_columns c14 on (c14.record_id = c13.value::uuid and c14.column_name = 'TrayNumber')
            left join db_records_columns c15 on (c15.record_id = cr.id and c15.column_name = 'CableInId')
            left join db_records_columns c16 on (c16.record_id = cr.id and c16.column_name = 'TraySpliceId')
            left join db_records_columns c17 on (c17.record_id = c16.value::uuid and c17.column_name = 'SpliceNumber')
            left join db_records_columns c18 on (c18.record_id = a.parent_record_id and c18.column_name = 'L2PolygonId')
            left join db_records_columns c19 on (c19.record_id = a.parent_record_id and c19.column_name = 'ClosureType')
        where exists (
                select *
                from db_records as r
                left join db_records_columns c on (c.record_id = r.id and column_name = 'L2PolygonId')
                where r.type = 'CLOSURE'
                and to_tsvector('english', c.value) @@ to_tsquery('${polygonId}')
                and r.id = a.parent_record_id
            )
        and cr.entity = 'ProjectModule:FiberConnection'
        and a.deleted_at IS NULL
        and cr.deleted_at IS NULL
        `)

        console.log('fibers', fibers)

        for(const fiber of fibers) {

            const deleteRes = await deleteRecord(
                'FiberConnection',
                fiber['conn_id'],
            )

            console.log('deleteRes', deleteRes)

        }

    } catch (e) {
        console.error(e);
    }
}


