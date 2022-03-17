import { getCableTypeFromId, getCableTypeIdByName, getClosureTypeFromId, getClosureTypeIdByName } from './utils';


/**
 *
 * @param featureType
 */
export function getIntegrationParamsByFeatureType(featureType: string) {

    let tableName;
    let typeProperty;
    let modelProperty;
    let featureTypeIds;

    if (featureType === 'CLOSURE') {
        tableName = 'ftth.closure'
        typeProperty = 'ClosureType'
        modelProperty = 'ClosureModel'
        featureTypeIds = [ 1, 2, 3, 4, 5, 11 ]
    }

    if (featureType === 'CABLE') {
        tableName = 'ftth.cable'
        typeProperty = 'CableType'
        modelProperty = 'CableModel'
        featureTypeIds = [ 1, 2, 3, 4 ]
    }

    if (featureType === 'CHAMBER') {
        tableName = 'ftth.chamber'
        typeProperty = undefined
        modelProperty = 'ChamberModel'
        featureTypeIds = []
    }

    if (featureType === 'DUCT') {
        tableName = 'ftth.duct'
        typeProperty = undefined
        modelProperty = 'DuctModel'
        featureTypeIds = []
    }


    return { tableName, typeProperty, modelProperty, featureTypeIds }

}

export async function getClosureIdsByPolygonId(polygonId: string, closureType: string, { cosmosDb }) {

    const typeId = getClosureTypeIdByName(closureType);

    return await cosmosDb.query(`
        SELECT ftth.closure.id
        FROM ftth.closure
        left join ftth.polygon p on st_intersects(ftth.closure.geometry, p.geometry)
        WHERE p.id = ${polygonId}
        AND ftth.closure.type_id = ${typeId}
        ORDER BY ftth.closure.id asc
    `);
}

/**
 *
 * @param closureId
 * @param cosmosDb
 */
export async function getExPolygonIdFromClosureId(closureId: number | string, { cosmosDb }) {

    // get the exPolygonId
    let polygons = await cosmosDb.query(
        `
            SELECT
            a.id, a.name
            FROM ftth.polygon as a, ftth.closure as b
            WHERE ST_Intersects(a.geometry, b.geometry)
            AND a.name = 'EX'
            AND b.id = ${Number(closureId)}
        `);

    return polygons.find(elem => elem.name === 'EX')

}

/**
 *
 1    "L0"
 2    "L1"
 3    "L2"
 4    "L3"
 5    "L4"
 */
export async function getAllClosuresWithCableConnections(closureIds: string[], closureType: string, { odinDb }) {

    const type = getClosureTypeIdByName(closureType)

    return await odinDb.query(`
        select
        db_records.id,
        c.value as ext_ref,
        c1.value as type
        from db_records
        left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
        left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
        where db_records.entity = 'ProjectModule:Feature'
        and db_records.type = 'CLOSURE'
        and c1.value IN ('${type}')
        ${closureIds ? `and c.value IN (${closureIds.map(elem => `'${elem}'`)})` : 'and c.value IS NOT NULL'}
        and db_records.deleted_at IS NULL
        and exists (
            select * from db_records_associations a
            left join db_records as r on (r.id = a.child_record_id)
            where a.child_entity = 'ProjectModule:CableConnection'
            and a.parent_record_id = db_records.id
            and a.deleted_at IS NULL
        )
        order by c.value::integer asc
    `)
}

/**
 *
 * @param closureId
 * @param odinDb
 */
export async function getFiberConnectionByClosureId(closureId: string, { odinDb }) {

    if (closureId) {
        return await odinDb.query(`
        select c1.record_id as id
        from db_records_columns c1
        left join db_records as r on (r.id = c1.record_id)
        where r.entity = 'ProjectModule:FiberConnection'
        and c1.column_name = 'OutClosureExternalRef'
        and c1.value  = '${closureId}'
        and c1.deleted_at IS NULL
    `)
    }

    return undefined
}

/**
 *
 1    "L0"
 2    "L1"
 3    "L2"
 4    "L3"
 5    "L4"
 */
export async function getAllClosuresWithFiberConnections(closureIds: string[], closureType: string, { odinDb }) {

    const type = getClosureTypeIdByName(closureType)

    if (closureIds && closureIds.length > 0) {
        return await odinDb.query(`
        select
            db_records.id,
            c.value as ext_ref,
            c1.value as type
        from db_records
        left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
        left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
        where db_records.entity = 'ProjectModule:Feature'
        and db_records.type = 'CLOSURE'
        and c1.value IN ('${type}')
        ${closureIds ? `and c.value IN (${closureIds.map(elem => `'${elem}'`)})` : 'and c.value IS NOT NULL'}
        and db_records.deleted_at IS NULL
        and exists (
            select * from db_records_columns c1
            left join db_records as r on (r.id = c1.record_id)
            where r.entity = 'ProjectModule:FiberConnection'
            and c1.column_name = 'OutClosureExternalRef'
            and c1.value  = c.value
            and c1.deleted_at IS NULL
        )
        order by c.value::integer asc
    `)
    }

    return []
}

export async function getAllClosuresWithNoFiberConnections(closureIds: string[], closureType: string, { odinDb }) {

    const type = getClosureTypeIdByName(closureType)

    if (closureIds && closureIds.length > 0) {
        return await odinDb.query(`
        select
            db_records.id,
            c.value as ext_ref,
            c1.value as type
        from db_records
        left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
        left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
        where db_records.entity = 'ProjectModule:Feature'
        and db_records.type = 'CLOSURE'
        and c1.value IN ('${type}')
        ${closureIds ? `and c.value IN (${closureIds.map(elem => `'${elem}'`)})` : 'and c.value IS NOT NULL'}
        and db_records.deleted_at IS NULL
        and not exists (
            select * from db_records_columns c1
            left join db_records as r on (r.id = c1.record_id)
            where r.entity = 'ProjectModule:FiberConnection'
            and c1.column_name = 'OutClosureExternalRef'
            and c1.value  = c.value
            and c1.deleted_at IS NULL
        )
        order by c.value::integer asc
    `)
    }

    return []
}


/**
 *
 *
 * @param closureId
 * @param odinDb
 */
export async function getSlotsByClosureId(closureId: string, { odinDb }) {

    return await odinDb.query(`
        select
        a.id as association_id,
        a.parent_entity,
        a.child_entity,
        cra.id,
        cra.type,
        cra1.value as slot_number,
        d.trays
        from db_records_associations a
        left join db_records cra on (a.child_record_id = cra.id)
        left join db_records_columns as cra1 on (cra1.record_id = cra.id and cra1.column_name = 'SlotNumber')
        left join lateral(
          select
          json_agg(
          json_build_object(
          'id', crb.id,
          'type', crb.type
           )
          ) as trays
          from db_records_associations c
            left join db_records crb on (c.child_record_id = crb.id)
          where c.child_entity = 'ProjectModule:FeatureComponent'
          and c.parent_record_id = cra.id
          and c.deleted_at IS NULL
          and crb.type = 'SLOT_TRAY'
        ) as d on true
        where a.parent_record_id = '${closureId}'
        and cra.type = 'CLOSURE_SLOT'
        and a.deleted_at IS NULL
        order by cra1.value::integer asc
    `)
}


/**
 *
 *
 * @param closureId
 * @param odinDb
 */
export async function getInCableByClosureId(closureId: string, { odinDb }) {

    return await odinDb.query(`
        select
            r.entity,
            r.type,
            c.value as is_loop,
            c1.value as direction,
            c2.value as cable_id,
            c4.value as from_closure_ext_ref,
            c3.value as in_cable_ext_ref_from_closure,
            c5.value as to_closure_ext_ref
        from db_records r
            left join db_records_columns as c on (c.record_id = r.id and c.column_name = 'IsLoop')
            left join db_records_columns as c1 on (c1.record_id = r.id and c1.column_name = 'Direction')
            left join db_records_columns as c2 on (c2.record_id = r.id and c2.column_name = 'CableId')
            left join db_records_columns as c3 on (c3.record_id = r.id and c3.column_name = 'CableExternalRef')
            left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'OutClosureExternalRef')
            left join db_records_columns as c5 on (c5.record_id = r.id and c5.column_name = 'InClosureExternalRef')
        where r.entity = 'ProjectModule:CableConnection'
            and c1.value = 'IN'
            and r.deleted_at IS NULL
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:CableConnection'
                and a.parent_record_id = '${closureId}'
                and a.child_record_id = r.id
                and a.deleted_at IS NULL
            )
        `);
}

/**
 *
 *
 * @param closureId
 * @param odinDb
 */
export async function getOutCableByClosureId(closureId: string, { odinDb }) {

    return await odinDb.query(`
        select
            r.entity,
            r.type,
            c.value as is_loop,
            c1.value as direction,
            c2.value as cable_id,
            c4.value as from_closure_ext_ref,
            c3.value as in_cable_ext_ref_from_closure,
            c5.value as to_closure_ext_ref
        from db_records r
            left join db_records_columns as c on (c.record_id = r.id and c.column_name = 'IsLoop')
            left join db_records_columns as c1 on (c1.record_id = r.id and c1.column_name = 'Direction')
            left join db_records_columns as c2 on (c2.record_id = r.id and c2.column_name = 'CableId')
            left join db_records_columns as c3 on (c3.record_id = r.id and c3.column_name = 'CableExternalRef')
            left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'OutClosureExternalRef')
            left join db_records_columns as c5 on (c5.record_id = r.id and c5.column_name = 'InClosureExternalRef')
        where r.entity = 'ProjectModule:CableConnection'
            and c1.value = 'OUT'
            and r.deleted_at IS NULL
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:CableConnection'
                and a.parent_record_id = '${closureId}'
                and a.child_record_id = r.id
                and a.deleted_at IS NULL
            )
        `);
}


/**
 *
 *
 * @param closureId
 * @param odinDb
 */
export async function getClosureByCableIdAndDirection(cableId: string, direction: 'IN' | 'OUT', { odinDb }) {

    return await odinDb.query(`
        select
            r.entity,
            r.type,
            c2.value as closure_id,
            c4.value as to_closure_ext_ref,
            c3.value as in_cable_ext_ref_from_closure,
            c5.value as from_closure_ext_ref
        from db_records r
            left join db_records_columns as c on (c.record_id = r.id and c.column_name = 'IsLoop')
            left join db_records_columns as c1 on (c1.record_id = r.id and c1.column_name = 'Direction')
            left join db_records_columns as c2 on (c2.record_id = r.id and c2.column_name = 'ClosureId')
            left join db_records_columns as c3 on (c3.record_id = r.id and c3.column_name = 'CableExternalRef')
            left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'OutClosureExternalRef')
            left join db_records_columns as c5 on (c5.record_id = r.id and c5.column_name = 'InClosureExternalRef')
        where r.entity = 'ProjectModule:CableConnection'
            and c1.value = '${direction}'
            and r.deleted_at IS NULL
            and exists (
                select * from db_records_associations a
                where a.child_entity = 'ProjectModule:CableConnection'
                and a.parent_record_id = '${cableId}'
                and a.child_record_id = r.id
                and a.deleted_at IS NULL
            )
        `);
}

/**
 * This will return the next connection info by fibreId
 *
 * @param fibreId
 */
export async function getFiberConnectionsByFibreId(fibreId: string, { odinDb }, isUsed?: boolean) {

    return await odinDb.query(`
     select
         a.parent_entity,
         a.child_entity,
         a.parent_record_id as connection_id,
         cr.type,
         c.value as tube_fiber_in,
         c1.value as tube_fiber_out,
         c2.value as cable_out,
         c3.value as cable_in,
         c4.value as fiber_in_id,
         c7.value as fiber_state,
         c8.value as fiber_out_id,
         c9.value as tube_in_id,
         c10.value as tube_out_id,
         c6.value as in_cable_ext_ref_to_closure,
         c11.value as closure_to_ext_ref,
         c5.value as in_cable_ext_ref_from_closure,
         c12.value as closure_from_ext_ref,
         c13.value as tray_splitter_id,
         c13.value as tray_model_id
    from db_records_associations a
         left join db_records cr on (a.parent_record_id = cr.id)
         left join db_records_columns c on (c.record_id = cr.id and c.column_name = 'TubeFiberIn')
         left join db_records_columns c1 on (c1.record_id = cr.id and c1.column_name = 'TubeFiberOut')
         left join db_records_columns c2 on (c2.record_id = cr.id and c2.column_name = 'CableOutId')
         left join db_records_columns c3 on (c3.record_id = cr.id and c3.column_name = 'CableInId')
         left join db_records_columns c4 on (c4.record_id = cr.id and c4.column_name = 'FiberInId')
         left join db_records_columns c5 on (c5.record_id = cr.id and c5.column_name = 'CableOutExternalRef')
         left join db_records_columns c6 on (c6.record_id = cr.id and c6.column_name = 'CableInExternalRef')
         left join db_records_columns c7 on (c7.record_id = c4.value::uuid and c7.column_name = 'FiberState')
         left join db_records_columns c8 on (c8.record_id = cr.id and c8.column_name = 'FiberOutId')
         left join db_records_columns c9 on (c9.record_id = cr.id and c9.column_name = 'TubeInId')
         left join db_records_columns c10 on (c10.record_id = cr.id and c10.column_name = 'TubeOutId')
         left join db_records_columns c11 on (c11.record_id = cr.id and c11.column_name = 'OutClosureExternalRef')
         left join db_records_columns c12 on (c12.record_id = cr.id and c12.column_name = 'InClosureExternalRef')
         left join db_records_columns c13 on (c13.record_id = cr.id and c13.column_name = 'TraySplitterId')
         left join db_records_columns c14 on (c14.record_id = cr.id and c13.column_name = 'TrayModelId')
    where a.child_record_id = '${fibreId}'
        and cr.entity = 'ProjectModule:FiberConnection'
        and a.deleted_at IS NULL
        and cr.deleted_at IS NULL
    ${!isUsed ? 'and c7.value IS NULL' : 'and c7.value IS NOT NULL'}
    order by c.value asc
        `);
}

/**
 * This will return the next connection info by fibreId
 *
 * @param fibreId
 */
export async function getAllFiberConnectionsByFibreId(fibreId: string, { odinDb }) {

    return await odinDb.query(`
     select
         a.parent_entity,
         a.child_entity,
         a.parent_record_id as connection_id,
         cr.type,
         c.value as tube_fiber_in,
         c1.value as tube_fiber_out,
         c2.value as cable_out,
         c3.value as cable_in,
         c4.value as fiber_in_id,
         c7.value as fiber_state,
         c8.value as fiber_out_id,
         c9.value as tube_in_id,
         c10.value as tube_out_id,
         c6.value as in_cable_ext_ref_to_closure,
         c11.value as closure_to_ext_ref,
         c5.value as in_cable_ext_ref_from_closure,
         c12.value as closure_from_ext_ref,
         c13.value as tray_splitter_id,
         c13.value as tray_model_id
    from db_records_associations a
         left join db_records cr on (a.parent_record_id = cr.id)
         left join db_records_columns c on (c.record_id = cr.id and c.column_name = 'TubeFiberIn')
         left join db_records_columns c1 on (c1.record_id = cr.id and c1.column_name = 'TubeFiberOut')
         left join db_records_columns c2 on (c2.record_id = cr.id and c2.column_name = 'CableOutId')
         left join db_records_columns c3 on (c3.record_id = cr.id and c3.column_name = 'CableInId')
         left join db_records_columns c4 on (c4.record_id = cr.id and c4.column_name = 'FiberInId')
         left join db_records_columns c5 on (c5.record_id = cr.id and c5.column_name = 'CableOutExternalRef')
         left join db_records_columns c6 on (c6.record_id = cr.id and c6.column_name = 'CableInExternalRef')
         left join db_records_columns c7 on (c7.record_id = c4.value::uuid and c7.column_name = 'FiberState')
         left join db_records_columns c8 on (c8.record_id = cr.id and c8.column_name = 'FiberOutId')
         left join db_records_columns c9 on (c9.record_id = cr.id and c9.column_name = 'TubeInId')
         left join db_records_columns c10 on (c10.record_id = cr.id and c10.column_name = 'TubeOutId')
         left join db_records_columns c11 on (c11.record_id = cr.id and c11.column_name = 'OutClosureExternalRef')
         left join db_records_columns c12 on (c12.record_id = cr.id and c12.column_name = 'InClosureExternalRef')
         left join db_records_columns c13 on (c13.record_id = cr.id and c13.column_name = 'TraySplitterId')
         left join db_records_columns c14 on (c14.record_id = cr.id and c13.column_name = 'TrayModelId')
    where a.child_record_id = '${fibreId}'
        and cr.entity = 'ProjectModule:FiberConnection'
        and a.deleted_at IS NULL
        and cr.deleted_at IS NULL
    order by c.value asc
        `);
}


/**
 * This will return the next connection info by cableId
 * It will get the other connections for this cable
 *
 * @param cableId
 * @param direction
 */
export async function getCableConnectionsByCableId(cableId: string, direction: 'IN' | 'OUT', { odinDb }) {

    return await odinDb.query(`
        select
        r.entity,
        r.type,
        c.value as is_loop,
        c1.value as direction,
        c2.value as cable_id,
        c4.value as from_closure_ext_ref,
        c5.value as cable_external_ref,
        c3.value as to_closure_ext_ref
        from db_records r
        left join db_records_columns as c on (c.record_id = r.id and c.column_name = 'IsLoop')
        left join db_records_columns as c1 on (c1.record_id = r.id and c1.column_name = 'Direction')
        left join db_records_columns as c2 on (c2.record_id = r.id and c2.column_name = 'CableId')
        left join db_records_columns as c3 on (c3.record_id = r.id and c3.column_name = 'OutClosureExternalRef')
        left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'InClosureExternalRef')
        left join db_records_columns as c5 on (c5.record_id = r.id and c5.column_name = 'CableExternalRef')
        where r.entity = 'ProjectModule:CableConnection'
        and c1.value = '${direction}'
        and r.deleted_at IS NULL
        and exists (
            select * from db_records_associations a
            where a.child_entity = 'ProjectModule:CableConnection'
            and a.parent_record_id = '${cableId}'
            and a.child_record_id = r.id
            and a.deleted_at IS NULL
        )
      `);
}

/**
 * This will return the next connection info by cableId
 * It will get the other connections for this cable
 *
 * @param cableId
 * @param direction
 */
export async function getClosureTypeByClosureId(closureId: string, { odinDb }) {

    return await odinDb.query(`
        select c1.column_name, sco.label
        from db_records r
        left join db_records_columns as c1 on (c1.record_id = r.id and c1.column_name = 'ClosureType')
        left join schemas_columns_options as sco on (sco.column_id = c1.column_id and sco.value = c1.value)
        where r.id = '${closureId}'
        and r.deleted_at is null
      `);
}


/**
 *
 * @param trayId
 */
export async function getSplicesByTrayId(trayId: string, { odinDb }) {

    const res = await odinDb.query(`
                select
                    a.id as tray_id,
                    d.splices
                from db_records a
                    left join lateral(
                    select
                      json_agg(
                      json_build_object(
                          'id', crb.id,
                          'type', crb.type,
                          'splice_number', crb1.value,
                          'connections', e.connections
                       )
                      ) as splices
                      from db_records_associations b
                    left join db_records crb on (b.child_record_id = crb.id)
                    left join db_records_columns as crb1 on (crb1.record_id = crb.id and crb1.column_name = 'SpliceNumber')
                    left join lateral(
                          select
                              json_agg(
                                  json_build_object(
                                      'id', crc.id,
                                      'type', crc.type
                                   )
                              ) as connections
                          from db_records_associations c
                          left join db_records crc on (c.parent_record_id = crc.id)
                          where c.parent_entity = 'ProjectModule:FiberConnection'
                          and c.child_record_id = b.child_record_id
                          and c.deleted_at IS NULL
                        ) as e on true
                      where b.child_entity = 'ProjectModule:FeatureComponent'
                      and b.parent_record_id = a.id
                      and b.deleted_at IS NULL
                      and crb.type = 'TRAY_SPLICE'
                    ) as d on true
                where a.id = '${trayId}'
                and a.deleted_at IS NULL
            `)

    return res[0]
}


/**
 * This function will return the splitters already added to the closure
 * that do not have any out fibers connected
 * @param closureId
 * @param odinDb
 */
export async function getUnUsedSplitterConnections(closureId: string, { odinDb }) {

    return await odinDb.query(
        `
        select r.id, r.record_number
        from db_records r
            left join db_records_columns c on (c.record_id = r.id and column_name = 'TubeFiberOut')
        where r.entity = 'ProjectModule:FiberConnection'
          and exists (
            select a.parent_record_id
            from db_records_associations a
            where a.child_record_id = r.id
                and a.parent_record_id = '${closureId}'
                and a.deleted_at is null
          )
         and c.value IS NULL
         and c.deleted_at is null
        `,
    )
}

/**
 *
 * @param trayId
 */
export async function getSplittersByTrayId(trayId: string, { odinDb }) {
    const res = await odinDb.query(`
        select
            a.id as tray_id,
            d.splitters
        from db_records a
            left join lateral(
            select
              json_agg(
              json_build_object(
                  'id', crb.id,
                  'type', crb.type,
                  'splitter_number', crb1.value,
                  'splitter_type', crb2.value,
                  'connections', e.connections
               )
              ) as splitters
              from db_records_associations b
            left join db_records crb on (b.child_record_id = crb.id)
            left join db_records_columns as crb1 on (crb1.record_id = crb.id and crb1.column_name = 'SplitterNumber')
            left join db_records_columns as crb2 on (crb2.record_id = crb.id and crb2.column_name = 'SplitterType')
            left join lateral(
              select
              json_agg(
              json_build_object(
                  'id', crc.id,
                  'type', crc.type
               )
              ) as connections
              from db_records_associations c
                left join db_records crc on (c.parent_record_id = crc.id)
              where c.parent_entity = 'ProjectModule:FiberConnection'
              and c.child_record_id = b.child_record_id
              and c.deleted_at IS NULL
            ) as e on true
              where b.child_entity = 'ProjectModule:FeatureComponent'
              and b.parent_record_id = a.id
              and b.deleted_at IS NULL
              and crb.type = 'TRAY_SPLITTER'
            ) as d on true
        where a.id = '${trayId}'
        and a.deleted_at IS NULL
    `)

    return res[0]
}


/**
 * This will return fibre connections by cable id
 *
 * @param fibreId
 */
export async function getCableFiberConnectionsByCableId(cableIds: string[], { odinDb }) {

    return await odinDb.query(`
        select
        distinct(cr.id),
        cr.type,
        c6.value as in_closure,
        c3.value as in_cable,
        c8.value as in_cable_id,
        c10.value as in_tube_id,
        c4.value as in_fiber_id,
        c1.value as in_tube_fiber,
        c5.value as fiber_state,
        c7.value as out_closure,
        c2.value as out_cable,
        c13.value as out_cable_id,
        c11.value as out_fiber_id,
        c14.value as out_tube_id,
        c12.value as out_tube_fiber
        from db_records_associations a
        left join db_records cr on (a.child_record_id = cr.id)
        left join db_records_columns c1 on (c1.record_id = cr.id and c1.column_name = 'TubeFiberIn')
        left join db_records_columns c2 on (c2.record_id = cr.id and c2.column_name = 'CableOutExternalRef')
        left join db_records_columns c3 on (c3.record_id = cr.id and c3.column_name = 'CableInExternalRef')
        left join db_records_columns c4 on (c4.record_id = cr.id and c4.column_name = 'FiberInId')
        left join db_records_columns c5 on (c5.record_id = c4.value::uuid and c5.column_name = 'FiberState')
        left join db_records_columns c6 on (c6.record_id = cr.id and c6.column_name = 'InClosureExternalRef')
        left join db_records_columns c7 on (c7.record_id = cr.id and c7.column_name = 'OutClosureExternalRef')
        left join db_records_columns c8 on (c8.record_id = cr.id and c8.column_name = 'CableInId')
        left join db_records_columns c10 on (c10.record_id = cr.id and c10.column_name = 'TubeInId')
        left join db_records_columns c11 on (c11.record_id = cr.id and c11.column_name = 'FiberOutId')
        left join db_records_columns c12 on (c12.record_id = cr.id and c12.column_name = 'TubeFiberOut')
        left join db_records_columns c13 on (c13.record_id = cr.id and c13.column_name = 'CableOutId')
        left join db_records_columns c14 on (c14.record_id = cr.id and c14.column_name = 'TubeOutId')
        where a.parent_record_id IN (${cableIds.map(elem => `'${elem}'`)})
        and cr.entity = 'ProjectModule:FiberConnection'
        and a.parent_entity = 'ProjectModule:Feature'
        and a.deleted_at IS NULL
        and cr.deleted_at IS NULL
        order by cr.id, c5.value, c2.value
        `);
}


/**
 *
 * @param closureId
 */
export async function getCablesAndConnectionsByClosureId(closureId: string, cableType: string, { odinDb }) {

    const type = getCableTypeIdByName(cableType)

    return await odinDb.query(`
        select
            c4.value as type,
            c3.value as cable_direction,
            c2.value as cable_ext_ref,
            c1.value as cable_id
        from db_records_associations a
            left join db_records cr on (a.child_record_id = cr.id)
            left join db_records_columns c1 on (c1.record_id = cr.id and c1.column_name = 'CableId')
            left join db_records_columns c2 on (c2.record_id = cr.id and c2.column_name = 'CableExternalRef')
            left join db_records_columns c3 on (c3.record_id = cr.id and c3.column_name = 'Direction')
            left join db_records_columns c4 on (c4.record_id = cr.id and c4.column_name = 'CableType')
        where a.parent_record_id IN ('${closureId}')
        and cr.entity = 'ProjectModule:CableConnection'
        and c4.value = '${type}'
        and c3.value = 'OUT'
        and cr.deleted_at IS NULL
        and a.deleted_at IS NULL
    `)
}


/**
 * This will return the next connection info by cableId
 * It will get the other connections for this cable
 *
 * @param cableId
 * @param direction
 */
export async function getAllFibresByCableId(cableId: string, { odinDb }) {

    return await odinDb.query(`
        select
        a.parent_record_id as cable_id,
        cra.id as tube_id,
        crac1.value as tube_number,
        crb.id as fiber_id,
        crbc1.value as fiber_number,
        crbc2.value as fiber_state
        from db_records_associations a
        left join db_records cra on (a.child_record_id = cra.id and cra.type = 'CABLE_TUBE')
        left join db_records_columns as crac1 on (crac1.record_id = cra.id and crac1.column_name = 'TubeNumber')
        left join db_records_associations b on (b.parent_record_id = cra.id and b.child_entity = 'ProjectModule:FeatureComponent')
        left join db_records crb on (b.child_record_id = crb.id and crb.type = 'TUBE_FIBER')
        left join db_records_columns as crbc1 on (crbc1.record_id = crb.id and crbc1.column_name = 'FiberNumber')
        left join db_records_columns as crbc2 on (crbc2.record_id = crb.id and crbc2.column_name = 'FiberState')
        where a.parent_record_id = '${cableId}'
        and cra.type = 'CABLE_TUBE'
        and crb.type = 'TUBE_FIBER'
        and a.deleted_at IS NULL
        and b.deleted_at IS NULL
        and cra.deleted_at IS NULL
        and crb.deleted_at IS NULL
        order by
            crac1.value::integer asc,
            crbc1.value::integer asc
        `);
}


/**
 *
 * This returns a 1 level nested closure -> cables -> closures
 *
 * @param cosmosDb
 * @param startClosureType
 * @param startClosureId
 * @param cableType
 * @param searchedCables
 */
export async function getIntersectingCablesByClosureId(
    startClosureId: any,
    cableType: string,
    searchedCables: any[],
    { cosmosDb },
) {

    const nestedIntersects = await cosmosDb.query(`
             SELECT
                c.id,
                ct.name as type,
                d.cables
            FROM ftth.closure c
            LEFT JOIN ftth.closure_type as ct ON (ct.id = c.type_id)
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'id', cb.id,
                        'type', cbt.name,
                        'length', cb.length
                    )
                ) AS cables
                FROM ftth.cable as cb
                LEFT JOIN ftth.cable_type as cbt ON (cb.type_id = cbt.id)
                WHERE cbt.name = '${cableType}'
                AND cb.id NOT IN (${searchedCables && searchedCables.length < 1 ? '0' : searchedCables.map(elem => `'${elem}'`)})
                AND CASE
                    WHEN st_isvalid(cb.geometry) is not true
                        THEN ST_Intersects(ST_Centroid(cb.geometry), c.geometry)
                    WHEN ST_GeometryType(cb.geometry) <> 'ST_MultiCurve'
                        THEN ST_Intersects(cb.geometry, c.geometry)
                    WHEN ST_GeometryType(cb.geometry) = 'ST_MultiCurve'
                        THEN ST_Intersects(ST_CurveToLine(cb.geometry), c.geometry)
                END
                 ) AS d on true
            WHERE d.cables IS NOT NULL
            AND c.id = ${startClosureId};
        `);

    // we want to sort the cables ascending by length
    if (nestedIntersects[0] && nestedIntersects[0].cables) {
        nestedIntersects[0].cables.sort((a, b) => a.length - b.length);
    }

    return nestedIntersects[0]

}

/**
 *
 * This returns a 1 level nested closure -> cables -> closures
 *
 * @param cosmosDb
 * @param closureType
 * @param cableId
 * @param startClosureId
 * @param closureTypes
 */
export async function getIntersectingClosuresByCableId(
    cableId: string,
    startClosureId: string,
    closureTypes: string[],
    { cosmosDb },
) {

    const nestedIntersects = await cosmosDb.query(`
              SELECT
                cb.id,
                cbt.name as type,
                e.closures
            FROM ftth.cable as cb
            LEFT JOIN ftth.cable_type as cbt ON (cb.type_id = cbt.id)
            LEFT JOIN LATERAL (
                SELECT json_agg(
                        json_build_object(
                            'id', clo.id,
                            'type', ftth.closure_type.name
                        )
                    ) AS closures
                    FROM ftth.closure as clo
                    LEFT JOIN ftth.closure_type ON (ftth.closure_type.id = clo.type_id)
                    WHERE ftth.closure_type.name IN (${closureTypes.map(elem => `'${elem}'`)})
                    AND clo.id != ${startClosureId}
                    AND CASE
                        WHEN ST_GeometryType(cb.geometry) <> 'ST_MultiCurve'
                            THEN ST_Intersects(cb.geometry, clo.geometry)
                        WHEN ST_GeometryType(cb.geometry) = 'ST_MultiCurve'
                            THEN ST_Intersects(ST_CurveToLine(cb.geometry), clo.geometry)
                    END
                ) AS e on true
            WHERE cb.id = ${cableId};
        `);


    let closureWithDistances = []

    let endClosure = await cosmosDb.query(`
             SELECT
                cb.id,
                clo.id
            FROM ftth.cable cb, ftth.closure clo
            WHERE ST_Intersects(clo.geometry,  ST_PointN(cb.geometry, 1))
            AND cb.id = ${cableId};
        `);

    if (endClosure[0] && endClosure[0]['id'] === startClosureId) {
        endClosure = await cosmosDb.query(`
             SELECT
                cb.id,
                clo.id
            FROM ftth.cable cb, ftth.closure clo
            WHERE ST_Intersects(clo.geometry,  ST_PointN(cb.geometry, -1))
            AND cb.id = ${cableId};
        `);
    }

    console.log('endClosure', endClosure)

    if (nestedIntersects[0]['closures']) {
        for(const closure of nestedIntersects[0]['closures']) {

            const distFromStartClosure = await cosmosDb.query(`
             SELECT
                a.id,
                ST_Distance(a.geometry, b.geometry)
            FROM ftth.closure a, ftth.closure b
            WHERE a.id = ${startClosureId}
            AND b.id = ${closure.id};
        `);

            closure['startClosureId'] = startClosureId;
            closure['endClosureId'] = endClosure[0] ? endClosure[0]['id'] : undefined
            closure['distFromStart'] = distFromStartClosure[0]['st_distance']
            closureWithDistances.push(closure)

        }
    }

    return closureWithDistances

}

/**
 *
 * @param closureAId
 * @param closureBId
 * @param cosmosDb
 */
export async function getDistanceBetweenClosures(closureAId: number, closureBId: number, { cosmosDb }) {

    const distFromStartClosure = await cosmosDb.query(`
             SELECT
                a.id,
                a_type.name as a_type,
                ST_Distance(a.geometry, b.geometry)
            FROM ftth.closure b, ftth.closure a
            LEFT JOIN ftth.closure_type a_type ON (a.type_id = a_type.id)
            WHERE a.id = ${closureAId}
            AND b.id = ${closureBId};
        `);

    return distFromStartClosure[0]['st_distance']
}

/**
 *
 * @param l2PolygonId
 * @param l1PolygonId
 * @param featureType
 * @param odinDb
 */
export async function getTotalCountOfFeaturesByPolygon(
    l1PolygonId: any,
    l2PolygonId: any,
    featureType: string,
    { odinDb },
) {

    const { featureTypeIds, typeProperty } = getIntegrationParamsByFeatureType(featureType)

    return await odinDb.query(`
    select count(r.id)
    from db_records r
    left join db_records_columns as c2 on (c2.record_id = r.id and c2.column_name = '${typeProperty}')
    left join db_records_columns as c3 on (c3.record_id = r.id and c3.column_name = 'L1PolygonId')
    left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'L2PolygonId')
    where r.entity = 'ProjectModule:Feature'
    and c2.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and r.type = '${featureType}'
    and r.deleted_at IS NULL
    ${l2PolygonId ? 'and to_tsvector(\'english\', c4.value)' : 'and to_tsvector(\'english\', c3.value)'} @@ to_tsquery('${l2PolygonId || l1PolygonId}')
    `)

}

export async function getClosuresByEXPolygonId(polygonId: any, { odinDb }) {

    return await odinDb.query(`
    select
    db_records.id as id,
    c.value as ext_ref,
    c1.value as type
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'ExPolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and c1.value IN ('1')
    and to_tsvector('english', c3.value) @@ to_tsquery('${polygonId}')
    `)

}

export async function getClosuresByL1yPolygonId(polygonId: any, { odinDb }) {

    return await odinDb.query(`
    select
    db_records.id as id,
    c.value as ext_ref,
    c1.value as type
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and c1.value IN ('2')
    and to_tsvector('english', c3.value) @@ to_tsquery('${polygonId}')
    `)

}


export async function getClosuresByL2yPolygonId(polygonId: any, { odinDb }) {

    return await odinDb.query(`
    select
    db_records.id as id,
    c.value as ext_ref,
    c1.value as type
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L2PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and c1.value IN ('3', '4')
    and to_tsvector('english', c3.value) @@ to_tsquery('${polygonId}')
    `)

}


export async function getClosuresByTypeInOdinByPolygonId(polygonId: any, { odinDb }) {

    return await odinDb.query(`
    select
    db_records.id as id,
    c.value as ext_ref,
    c1.value as type
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and c1.value IN ('1', '2', '3', '4')
    and to_tsvector('english', c3.value) @@ to_tsquery('${polygonId}')
    `)

}

/**
 *
 * @param polygonId
 * @param featureType
 * @param property
 * @param cosmosDb
 */
export async function getAllFeaturesByTypeAndPolygonId(
    polygonId: any,
    featureType: string,
    { cosmosDb },
) {

    const { tableName, featureTypeIds } = getIntegrationParamsByFeatureType(featureType)

    return await cosmosDb.query(`
    SELECT
        a.id
    FROM ${tableName} as a
    LEFT JOIN ftth.polygon as p on ST_Intersects(a.geometry, p.geometry)
    WHERE p.id = ${polygonId}
    ${featureTypeIds.length > 0 ? `AND a.type_id IN (${featureTypeIds})` : ''}
    `);
}

export async function getAllFeaturesByPolygonId(polygonId: any, featureType: string, property: string, { odinDb }) {

    const { featureTypeIds, typeProperty } = getIntegrationParamsByFeatureType(featureType)

    return await odinDb.query(`
    select
    db_records.id as id,
    c.value as ext_ref,
    c2.value as type
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c2 on (c2.record_id = db_records.id and c2.column_name = '${typeProperty}')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = '${property}')
    where db_records.entity = 'ProjectModule:Feature'
    and c2.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and db_records.type = '${featureType}'
    and db_records.deleted_at IS NULL
    and to_tsvector('english', c3.value) @@ to_tsquery('${polygonId}')
    `)

}

export async function getTotalClosuresByTypeInOdinByPolygonId(l1PolygonId: any, l2PolygonId: any, { odinDb }) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CLOSURE')

    const res = await odinDb.query(`
    select
    c1.value as type,
    count(*)
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    left join db_records_columns as c4 on (c4.record_id = db_records.id and c4.column_name = 'L2PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and c1.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and db_records.type = 'CLOSURE'
    ${l2PolygonId ? 'and to_tsvector(\'english\', c4.value)' : 'and to_tsvector(\'english\', c3.value)'} @@ to_tsquery('${l2PolygonId || l1PolygonId}')
    and db_records.deleted_at IS NULL
    group by c1.value
    order by c1.value::integer asc
    `)

    if (res && res.length > 0) {
        return res.map(elem => ({
            ...elem,
            type: getClosureTypeFromId(Number(elem['type'])),
        }))
    }

    return res

}

export async function getTotalCablesByTypeInOdinByPolygonId(l1PolygonId: any, l2PolygonId: any, { odinDb }) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CABLE')

    const res = await odinDb.query(`
    select
    c1.value as type,
    count(*)
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'CableType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    left join db_records_columns as c4 on (c4.record_id = db_records.id and c4.column_name = 'L2PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and c1.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and db_records.type = 'CABLE'
    and db_records.deleted_at IS NULL
    ${l2PolygonId ? 'and to_tsvector(\'english\', c4.value)' : 'and to_tsvector(\'english\', c3.value)'}  @@ to_tsquery('${l2PolygonId || l1PolygonId}')
    group by c1.value
    order by c1.value::integer asc
    `)

    if (res && res.length > 0) {
        return res.map(elem => ({
            ...elem,
            type: getCableTypeFromId(Number(elem['type'])),
        }))
    }

    return res

}

export async function getAllClosuresInOdinByPolygonId(
    l1PolygonId: any,
    { odinDb },
) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CLOSURE')

    return await odinDb.query(`
    select
    c.value as ext_ref,
    c1.value as type,
    c2.value as l2_poly,
    c3.value as ex_poly
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c2 on (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and c1.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and to_tsvector('english', c3.value) @@ to_tsquery('${l1PolygonId}')
    order by c1.value::integer asc
    `)

}


export async function getTotalClosuresWithCableConnectionsInOdinByPolygonId(
    l1PolygonId: any,
    { odinDb },
) {

    return await odinDb.query(`
    select
    c.value as ext_ref,
    c1.value as type,
    c2.value as l2_poly,
    c3.value as ex_poly
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c2 on (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and exists (
        select * from db_records_associations a
        left join db_records r on (a.child_record_id = r.id)
        where a.child_entity = 'ProjectModule:CableConnection'
        and a.parent_record_id = db_records.id
        and a.deleted_at IS NULL
    )
    and to_tsvector('english', c3.value) @@ to_tsquery('${l1PolygonId}')
    `)

}


export async function getTotalClosuresNoCableConnectionsInOdinByPolygonId(
    l1PolygonId: any,
    l2PolygonId: any,
    { odinDb },
) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CLOSURE')

    const res = await odinDb.query(`
    select
    c.value as ext_ref,
    c1.value as type,
    c2.value as l2_poly,
    c3.value as ex_poly
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'ClosureType')
    left join db_records_columns as c2 on (c2.record_id = db_records.id and c2.column_name = 'L2PolygonId')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and c1.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and db_records.type = 'CLOSURE'
    and db_records.deleted_at IS NULL
    and not exists (
        select * from db_records_associations a
        left join db_records r on (a.child_record_id = r.id)
        left join db_records_columns as c4 on (c4.record_id = r.id and c4.column_name = 'Direction')
        where a.child_entity = 'ProjectModule:CableConnection'
        and a.parent_record_id = db_records.id
        and a.deleted_at IS NULL
    )
   ${l2PolygonId ? `and to_tsvector('english', c2.value) @@ to_tsquery('${l2PolygonId}')`: `and to_tsvector('english', c3.value) @@ to_tsquery('${l1PolygonId}')`}
   order by c1.value::integer asc
    `)
    if (res && res.length > 0) {
        return res.map(elem => ({
            ...elem,
            type: getClosureTypeFromId(Number(elem['type'])),
        }))
    }

    return res;

}

export async function getLoopCablesByTypeInOdinByPolygonId(l1PolygonId, { odinDb }) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CABLE')

    return await odinDb.query(`
    select
    c1.value,
    count(*)
    from db_records
    left join db_records_columns as c on (c.record_id = db_records.id and c.column_name = 'ExternalRef')
    left join db_records_columns as c1 on (c1.record_id = db_records.id and c1.column_name = 'CableType')
    left join db_records_columns as c3 on (c3.record_id = db_records.id and c3.column_name = 'L1PolygonId')
    where db_records.entity = 'ProjectModule:Feature'
    and db_records.type = 'CABLE'
    and c1.value IN (${featureTypeIds.map(elem => `'${elem}'`)})
    and exists (
        select * from db_records_associations a
        left join db_records_columns as c3 on (c3.record_id = a.child_record_id and c3.column_name = 'IsLoop')
        where a.child_entity = 'ProjectModule:CableConnection'
        and a.parent_record_id = db_records.id
        and c3.value = 'true'
        and a.deleted_at IS NULL
    )
    and db_records.deleted_at IS NULL
    and to_tsvector('english', c3.value) @@ to_tsquery('${l1PolygonId}')
    group by c1.value
    `)
}


/**
 *
 */
export async function getPolygonsAndClosuresInExPolygon(exPolygonId: string | number, { cosmosDb }) {

    return await cosmosDb.query(
        `SELECT
        p1.id,
            p1.name,
            c1.closures as closures,
            p2.polygons as polygons
        FROM ftth.polygon p1
        LEFT JOIN LATERAL (
            SELECT
        json_agg(
            json_build_object(
                'id', c1.id
            )
        ) as closures
        FROM ftth.closure AS c1
        WHERE c1.type_id = 1
        AND St_Intersects(c1.geometry, p1.geometry)
    ) as c1 on true
        LEFT JOIN LATERAL (
            SELECT
                json_agg(
                    json_build_object(
                        'id', p2.id,
                        'name', p2.name,
                        'closures', c2.closures,
                        'polygons', p3.polygons
                    )
                ) as polygons
                FROM ftth.polygon AS p2
                LEFT JOIN LATERAL (
                    SELECT
                    json_agg(
                        json_build_object(
                            'id', c2.id
                        )
                    ) as closures
                FROM ftth.closure AS c2
                WHERE c2.type_id = 2
                AND St_Intersects(c2.geometry, p2.geometry)
        ) as c2 on true
        LEFT JOIN LATERAL (
            SELECT json_agg(
                json_build_object(
                    'id', p3.id,
                    'name', p3.name
                )
            ) as polygons
        FROM ftth.polygon AS p3
        WHERE p3.name = 'L2'
        AND St_Intersects(ST_Centroid(p3.geometry), p2.geometry)
    ) AS p3 on true
        WHERE p2.name = 'L1'
        AND St_Intersects(p1.geometry, p2.geometry)
    ) as p2 on true
        WHERE p1.id = ${Number(exPolygonId)}`,
    )


}


export async function getTotalFeatureCountInGisByPolygonId(polygonId: any, tableName: string, { cosmosDb }) {

    let featureType;

    if (tableName === 'ftth.cable') {
        featureType = 'CABLE'
    } else if (tableName === 'ftth.closure') {
        featureType = 'CLOSURE'
    }

    const { featureTypeIds } = getIntegrationParamsByFeatureType(featureType)

    let gisIds: any[]

    if (featureType === 'CABLE') {
        gisIds = await cosmosDb.query(`
            SELECT count(cableid)
            FROM pedro.frankcable
            WHERE polyid = ${polygonId}
            AND cabletype IN (${featureTypeIds})
        `)
    } else {
        gisIds = await cosmosDb.query(`
            SELECT count(${tableName}.id)
            FROM ${tableName}
            ${featureType === 'CABLE' ? `left join ftth.polygon p on
             CASE
                WHEN st_isvalid(${tableName}.geometry) is not true
                    THEN ST_Intersects(ST_Centroid(${tableName}.geometry), p.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) <> 'ST_MultiCurve'
                    THEN ST_Intersects(${tableName}.geometry, p.geometry)
                WHEN ST_GeometryType(${tableName}.geometry) = 'ST_MultiCurve'
                    THEN ST_Intersects(ST_CurveToLine(${tableName}.geometry), p.geometry)
            END
           `: `left join ftth.polygon p on st_intersects(${tableName}.geometry, p.geometry)`}
            WHERE ${tableName}.type_id IN (${featureTypeIds})
            AND p.id  = ${polygonId}
        `);
    }

    return gisIds[0]

}

export async function getTotalClosuresByTypeInGisByPolygonId(polygonId: any, { cosmosDb }) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CLOSURE')

    return await cosmosDb.query(`
    SELECT ct.name as type, count(*)
    FROM ftth.closure
    left join ftth.polygon p on st_intersects(ftth.closure.geometry, p.geometry)
    LEFT JOIN ftth.closure_type as ct ON (ct.id = ftth.closure.type_id)
    WHERE p.id  = ${polygonId}
    AND ftth.closure.type_id IN (${featureTypeIds})
    GROUP BY ct.id
    ORDER BY ct.id ASC
    `)

}

export async function getTotalCablesByTypeInGisByPolygonId(polygonId: any, { cosmosDb }) {

    const { featureTypeIds } = getIntegrationParamsByFeatureType('CABLE')

    return await cosmosDb.query(`
        SELECT ct.name as type, count(*)
        FROM pedro.frankcable
        LEFT JOIN ftth.cable_type ct ON ct.id = cabletype
        WHERE polyid = ${polygonId}
        AND cabletype IN (${featureTypeIds})
        GROUP BY cabletype, ct.name
        ORDER BY cabletype asc
    `)

}


export async function getIntersectingCablesAndClosureByPolygon(polygonId: any, { cosmosDb }) {

    return await cosmosDb.query(`
    SELECT
        c.id,
        ct.name as type,
        d.cables
    FROM ftth.closure c
    left join ftth.polygon p on st_intersects(c.geometry, p.geometry)
    LEFT JOIN ftth.closure_type as ct ON (ct.id = c.type_id)
    LEFT JOIN LATERAL (
        SELECT json_agg(
            json_build_object(
                'id', cb.id,
                'type', cbt.name,
                'length', cb.length
            )
        ) AS cables
        FROM ftth.cable as cb
        LEFT JOIN ftth.cable_type as cbt ON (cb.type_id = cbt.id)
        WHERE cbt.name IN ('Distribution', 'Access', 'Feed')
        AND CASE
            WHEN st_isvalid(cb.geometry) is not true
                THEN ST_Intersects(ST_Centroid(cb.geometry), c.geometry)
            WHEN ST_GeometryType(cb.geometry) <> 'ST_LineString'
                THEN ST_Intersects(ST_Geometry(cb.geometry), c.geometry)
            WHEN ST_GeometryType(cb.geometry) <> 'ST_MultiCurve'
                THEN ST_Intersects(cb.geometry, c.geometry)
            WHEN ST_GeometryType(cb.geometry) = 'ST_MultiCurve'
                THEN ST_Intersects(ST_CurveToLine(cb.geometry), c.geometry)
        END
        ) AS d on true
    WHERE d.cables IS NOT NULL
    AND p.id  = ${polygonId}
    ORDER BY ct.name ASC
    `)
}


/**
 * This will return the next connection info by cableId
 * It will get the other connections for this cable
 *
 * @param cableId
 * @param odinDb
 * @param direction
 * @param cableType
 */
export async function getNextConnectionByCableIdAndDirection(
    cableId: string,
    direction: 'IN' | 'OUT',
    cableType: string,
    { odinDb },
) {

    return await odinDb.query(`
        SELECT r.record_number,
               r.type,
               r.entity,
               c.connections
        FROM db_records as r
            LEFT JOIN LATERAL (
                SELECT json_agg(
                       json_build_object(
                           'connId', conn.id,
                           'closureId', closureId.value,
                           'closureType', closureType.value,
                           'closureExt', closureExternalRef.value,
                           'cableId', cableId.value,
                           'cableExt', cableExternalRef.value,
                           'cableType', cableType.value,
                           'direction', direction.value
                          )
                   ) AS connections
                FROM db_records_associations AS a
                    LEFT JOIN db_records as conn on (conn.id = a.child_record_id)
                    LEFT JOIN db_records_columns as direction on (direction.record_id = conn.id and direction.column_name = 'Direction')
                    LEFT JOIN db_records_columns as cableId on (cableId.record_id = conn.id and cableId.column_name = 'CableId')
                    LEFT JOIN db_records_columns as cableExternalRef on (cableExternalRef.record_id = conn.id and cableExternalRef.column_name = 'CableExternalRef')
                    LEFT JOIN db_records_columns as cableType on (cableType.record_id = conn.id and cableType.column_name = 'CableType')
                    LEFT JOIN db_records_columns as closureId on (closureId.record_id = conn.id and closureId.column_name = 'ClosureId')
                    LEFT JOIN db_records_columns as closureExternalRef on (closureExternalRef.record_id = conn.id and closureExternalRef.column_name = 'OutClosureExternalRef')
                    LEFT JOIN db_records_columns as closureType on (closureType.record_id = conn.id and closureType.column_name = 'ClosureType')
                WHERE a.child_entity = 'ProjectModule:CableConnection'
                    AND a.parent_record_id = r.id
                    AND cableType.value = '${cableType}'
                    AND direction.value IN ('${direction}')
                    AND a.deleted_at IS NULL
            ) as c on true
        WHERE r.entity = 'ProjectModule:Feature'
        and r.deleted_at IS NULL
        AND r.id = '${cableId}'
        `);
}


export async function getConnectionsByClosureId(closureId: string, { odinDb }) {

    return await odinDb.query(`
        select
            c4.value,
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
            c15.value as in_cable_id
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
        where a.parent_record_id = '${closureId}'
            and cr.entity = 'ProjectModule:FiberConnection'
            and a.deleted_at IS NULL
            and cr.deleted_at IS NULL
        order by c5.value, c3.value, c2.value, c.value, c1.value desc
    `)

}

export async function getOutClosureByCableId(cableId: string, { odinDb }) {

    const res = await odinDb.query(`
        select d1.value
        from db_records_columns as d1
        where exists (
            select id from db_records_columns as d2
            where d2.record_id = d1.record_id
            and d2.column_name = 'CableOutId'
            and to_tsvector('english', d2.value) @@ to_tsquery('${cableId}')
        )
        and d1.deleted_at IS NULL
        and d1.column_name = 'InClosureExternalRef'
        `)

    if (res[0]) {
        return res[0]['value']
    }

    return res[0]

}

/**
 * This returns the most recently created record
 *
 * @param externalRef
 * @param type
 * @param odinDb
 * @param entities
 */
export async function getOdinRecordByExternalRef(
    externalRef: number,
    type: string,
    { odinDb },
) {

    const res = await odinDb.query(`
        SELECT r.id, r.type, c.value as ext_ref
        FROM db_records r
         LEFT JOIN db_records_columns c ON (c.record_id = r.id and c.column_name = 'ExternalRef')
         WHERE r.type  = '${type}'
         AND r.deleted_at IS NULL
         AND to_tsvector('english', c.value) @@ to_tsquery('${externalRef}')
         ORDER BY r.created_at DESC`)

    return res[0]

}













