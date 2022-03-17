import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { createConnection, getConnection } from 'typeorm';
import { Address } from 'uk-clear-addressing';
import { BaseHttpClient } from '../../common/Http/BaseHttpClient';
import * as overrides from './importers/overrides.json';
import moment = require('moment');

const fs = require('fs');

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;


// ts-node sync-premise-data-by-l4-polygons.ts interval='365 days' buildstatus='6-In Progress, 7-Build Done'
// salesstatus='PRE_ORDER' opsstatus=2

// ts-node sync-premise-data-by-l4-polygons.ts interval='60 days' buildstatus='8-RFS' salesstatus='ORDER' opsstatus=1

// ts-node sync-premise-data-by-l4-polygons.ts interval='365 days'
// buildstatus='0-Backlog,1-Plan,2-Survey,3-Design,4-Plan' salesstatus='REGISTER_INTEREST' opsstatus=3

// ts-node sync-premise-data-by-l4-polygons.ts interval='365 days' buildstatus='5-ToDo'
// salesstatus='REGISTER_INTEREST_PLUS' opsstatus=4


export async function execute() {

    let argPolygonId = process.argv.find(arg => arg.indexOf('polygonids') > -1);
    let polygonIds = argPolygonId ? argPolygonId.split('=')[1] : null;

    let argInterval = process.argv.find(arg => arg.indexOf('interval') > -1);
    let interval = argInterval ? argInterval.split('=')[1] : null;

    let argBuildStatus = process.argv.find(arg => arg.indexOf('buildstatus') > -1);
    let buildStatuses = argBuildStatus ? argBuildStatus.split('=')[1] : null;

    let argAddrStatus = process.argv.find(arg => arg.indexOf('salesstatus') > -1);
    let addressStatus = argAddrStatus ? argAddrStatus.split('=')[1] : null;

    let argOpsStatus = process.argv.find(arg => arg.indexOf('opsstatus') > -1);
    let opsStatus = argOpsStatus ? argOpsStatus.split('=')[1] : null;

    let argExport = process.argv.find(arg => arg.indexOf('export') > -1);
    let exportCsv = argExport ? argExport.split('=')[1] : null;

    const httpClient = new BaseHttpClient();

    let cosmosDb;
    let odinDb;

    try {

        cosmosDb = await createConnection({
            type: 'postgres',
            name: 'cosmosDb',
            host: process.env.DB_GIS_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_GIS_USERNAME,
            password: process.env.DB_GIS_PASSWORD,
            database: process.env.DB_GIS_NAME,
            entities: [],
        });
    } catch (e) {

        console.error(e);
        cosmosDb = await getConnection('cosmosDb');
    }

    try {
        odinDb = await createConnection({
            type: 'postgres',
            name: 'odinDb',
            host: process.env.DB_HOSTNAME,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    } catch (e) {

        console.error(e);
        odinDb = await getConnection('odinDb');
    }

    const parsedBuildStatuses = buildStatuses.split(',').map(elem => `'${elem.trim()}'`);

    console.log({
        buildStatuses,
        addressStatus,
        opsStatus,
        interval,
    })

    const missingExPolygon = await odinDb.query(
        `
        select c1.value as udprn, c.value
        from db_records r
        left join db_records_columns c on (c.record_id = r.id and c.column_name = 'ExPolygonId')
        left join db_records_columns c1 on (c1.record_id = r.id and c1.column_name = 'UDPRN')
        left join db_records_columns c2 on (c2.record_id = r.id and c2.column_name = 'BuildStatus')
        where r.entity = 'CrmModule:Address'
        and c.value = '0'
        `,
    )

    console.log('missingExPolygon', missingExPolygon)


    const connectionTypes = await cosmosDb.query(
        `
        select a.id, case when  st_intersects(a.geometry, ( SELECT st_union(x.geom) AS st_union
               FROM ( SELECT p.geometry AS geom
                       FROM ftth.pole p
                      WHERE st_contains(a.geometry, p.geometry)
                    UNION ALL
                     SELECT s.geom
                       FROM openreach.structure s
                      WHERE s.object_class::text = 'POLE'::text AND st_contains(a.geometry, s.geom)) x) )
                      then 'OVERHEAD'
                      else 'UNDERGROUND'
                      end ug_or_oh
         from ftth.polygon a left join ftth.closure b on a.l4_closure_id = b.id
         where a.build_status_id in (7,8) and a.l4_closure_id  is not null and b.type_id =5
         union all
         select a.id, 'NEEDS_CHECKING'
         from ftth.polygon a where a.l4_closure_id is null and a.build_status_id in (7,8)
        `,
    )


    for(const { udprn } of missingExPolygon) {
        console.log('udprn', udprn)

        let premise = await cosmosDb.query(`SELECT * FROM misc.full_ultimate t WHERE t.udprn = ${udprn}`)

        console.log('premise', premise)
        if (premise[0]) {

            const polygons = await cosmosDb.query(
                `SELECT
               DISTINCT(p1.id),
               ex.name                as ex_name,
               ex.id                  as ex_id,
               p2.name                as l2_name,
               p2.id                  as l2_id,
               p2.target_release_date as l2_target_release_date,
               p2.build_status        as l2_build_status,
               p2.build_status_id     as l2_build_status_id,
               p1.name                as l4_name,
               p1.geometry            as l4_geometry,
               p1.id                  as l4_id,
               p1bs.name              as l4_build_status,
               p1.modified_at         as modified_at
        FROM ftth.polygon as p1
        LEFT JOIN ftth.build_status AS p1bs ON (p1.build_status_id = p1bs.id)
        LEFT JOIN LATERAL (
            SELECT p2.id,
               p2.name,
               p2.geometry,
               p2.target_release_date as target_release_date,
               p2bs.id                as build_status_id,
               p2bs.name              as build_status
            FROM ftth.polygon AS p2
            LEFT JOIN ftth.build_status AS p2bs ON (p2.build_status_id = p2bs.id)
            WHERE p2.name = 'L2'
        ) AS p2 ON St_Intersects(ST_Centroid(p1.geometry), p2.geometry)
        LEFT JOIN LATERAL (
            SELECT ex.id, ex.name, ex.geometry, exbs.id as build_status_id, exbs.name as build_status
            FROM ftth.polygon AS ex
            LEFT JOIN ftth.build_status AS exbs ON (ex.build_status_id = exbs.id)
            WHERE ex.name = 'EX'
        ) AS ex ON St_Intersects(ex.geometry, p2.geometry)
        WHERE p1.name = 'L4'
        AND p1bs.name IN (${parsedBuildStatuses})
        AND St_Intersects(p1.geometry, '${premise[0].geom}')
        AND p1.id IN (
                70327,
                70440,
                70453,
                70466,
                70468,
                70484,
                70485,
                70488,
                70566,
                70573,
                70574,
                70610,
                70616,
                70617,
                70641,
                70642,
                70643,
                70644,
                70648,
                70650,
                70651,
                70653,
                70654,
                70655
                )
        ORDER BY p1.id DESC
        `);

            console.log('polygons', polygons)

            const errors = [];
            const modified = [];

            console.log('elem', polygons.length)

            // handle polygon overrides by status
            const l2PreOrderOverrides = overrides['OVERRIDE_PREORDER_L2'];
            const l4PreOrderOverrides = overrides['OVERRIDE_PREORDER_L4'];

            if (polygons.length > 0) {
                for(const poly of polygons) {

                    let opsPremiseStatus = opsStatus;
                    let salesStatus = addressStatus;

                    // set the new values
                    if (l2PreOrderOverrides) {
                        console.log('l2PreOrderOverrides', l2PreOrderOverrides)
                        if (l2PreOrderOverrides['l2PolygonIds'].includes(poly.l2_id)) {
                            poly.l4_build_status = l2PreOrderOverrides['buildStatus'];
                            salesStatus = l2PreOrderOverrides['addressStatus'];
                            opsPremiseStatus = l2PreOrderOverrides['opsStatus']
                        }
                    }

                    // set the new values for l4 polygon overrides
                    if (l4PreOrderOverrides) {
                        console.log('preOrderOverrides', l4PreOrderOverrides)
                        if (l4PreOrderOverrides['l4PolygonIds'].includes(poly.l4_id)) {
                            poly.l4_build_status = l4PreOrderOverrides['buildStatus'];
                            salesStatus = l4PreOrderOverrides['addressStatus'];
                            opsPremiseStatus = l4PreOrderOverrides['opsStatus']
                        }
                    }

                    let query = `SELECT *,
                ${poly.ex_id} as ex_polygon_id,
                ${poly.l2_id} as l2_polygon_id,
                ${poly.l4_id} as l4_polygon_id,
                ${poly.target_release_date ? `'${poly.target_release_date}'` : null} as target_release_date,
                '${poly.l4_build_status}' as build_status
            FROM misc.full_ultimate WHERE St_Intersects(misc.full_ultimate.geom, '${poly.l4_geometry}')`

                    const premises = await cosmosDb.query(query);

                    for(const elem of premises) {

                        console.log('poly.l4_id', poly.l4_id)
                        let connectionType = connectionTypes.find(elem => {
                            return elem.id === poly.l4_id
                        });
                        console.log('connectionType', connectionType)

                        if (elem.udprn) {

                            try {
                                const targetReleaseDate = moment(elem.target_release_date).isValid() ? moment(elem.target_release_date).format(
                                    'YYYY-MM-DD') : undefined;
                                const buildStatusName = elem.build_status;

                                const opsPremiseUpdated = await odinDb.query(`
                                    INSERT INTO ops.premises  (uprn, udprn, umprn, geom, target_release_date, build_status_name, sales_status_id)
                                    VALUES(${elem.uprn}, ${elem.udprn}, 0, '${elem.geom}', ${targetReleaseDate ? `'${targetReleaseDate}'` : null}, ${buildStatusName ? `'${buildStatusName}'` : null}, ${opsPremiseStatus})
                                    ON CONFLICT (udprn, umprn)
                                    DO
                                        UPDATE SET
                                        target_release_date = ${targetReleaseDate ? `'${targetReleaseDate}'` : null},
                                        build_status_name = ${buildStatusName ? `'${buildStatusName}'` : null},
                                        sales_status_id = ${opsPremiseStatus},
                                        ex_polygon_id = ${elem.ex_polygon_id},
                                        l2_polygon_id = ${elem.l2_polygon_id},
                                        l4_polygon_id = ${elem.l4_polygon_id},
                                        ab_plus_class_1 = '${elem.class_1}'
                                    RETURNING id
                                `);


                                const pafAddress = await odinDb.query(`select * from royal_mail.paf where udprn = ${udprn}`)
                                console.log('pafAddress', pafAddress)

                                // only if we have the address in royal_mail paf add it to the Address list
                                if (pafAddress[0]) {

                                    let {
                                        line_1,
                                        line_2,
                                        line_3,
                                        premise,
                                        post_town,
                                        postcode,
                                    } = new Address({
                                        postcode: pafAddress[0]['postcode'],
                                        post_town: pafAddress[0]['posttown'],
                                        dependant_locality: pafAddress[0]['dependent_locality'],
                                        double_dependant_locality: pafAddress[0]['double_dependent_locality'],
                                        thoroughfare: pafAddress[0]['thoroughfare_and_descriptor'],
                                        building_number: pafAddress[0]['building_number'],
                                        building_name: pafAddress[0]['building_name'],
                                        sub_building_name: pafAddress[0]['sub_building_name'],
                                        dependant_thoroughfare: pafAddress[0]['dependent_thoroughfare_and_descriptor'],
                                        organisation_name: pafAddress[0]['organization_name'],
                                    });

                                    let fullAddress = '';
                                    let buildingNumber = 0;
                                    let deliveryPointSuffixNumber = 0;
                                    let deliveryPointSuffixLetter = 'A';

                                    if (!!line_1) {
                                        fullAddress = fullAddress.concat(line_1 + ', ');
                                    }
                                    if (!!line_2) {
                                        fullAddress = fullAddress.concat(line_2 + ', ');
                                    }
                                    if (!!line_3) {
                                        fullAddress = fullAddress.concat(line_3 + ', ');
                                    }
                                    if (!!post_town) {
                                        fullAddress = fullAddress.concat(post_town + ', ');
                                    }
                                    if (!!post_town) {
                                        fullAddress = fullAddress.concat(postcode);
                                    }

                                    // Update or Create Address
                                    const newAddress = new DbRecordCreateUpdateDto();
                                    newAddress.entity = `${SchemaModuleTypeEnums.CRM_MODULE}:${SchemaModuleEntityTypeEnums.ADDRESS}`;
                                    newAddress.title = fullAddress;
                                    newAddress.properties = {
                                        ConnectionType: connectionType ? connectionType['ug_or_oh'] : undefined,
                                        FullAddress: fullAddress,
                                        AddressLine1: line_1,
                                        AddressLine2: line_2,
                                        AddressLine3: line_3,
                                        TargetReleaseDate: targetReleaseDate,
                                        BuildStatus: buildStatusName,
                                        SalesStatus: salesStatus,
                                        L4PolygonId: elem.l4_polygon_id,
                                        L2PolygonId: elem.l2_polygon_id,
                                        ExPolygonId: elem.ex_polygon_id,
                                        Classification: elem.class_1,
                                        UDPRN: elem.udprn,
                                        UMPRN: '0',
                                        PostTown: elem.post_town,
                                        PostalCode: elem.postcode,
                                        Premise: premise,
                                        CountryCode: 'GB',
                                    };


                                    console.log('------------------------------------------------')
                                    console.log('CREATE/UPDATE:', newAddress)

                                    const createRes = await
                                        httpClient.postRequest(
                                            Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                                            `v1.0/db/batch?queue=true`,
                                            apiToken,
                                            [ newAddress ],
                                        );

                                    if (createRes['data']) {
                                        console.log('SUCCESS: ', createRes)
                                    } else {
                                        console.log('ERROR: ', createRes)
                                    }

                                }

                            } catch (e) {
                                console.error('ERROR', e);
                            }
                        } else {
                            errors.push(elem);
                        }
                    }
                }
            }
        }
    }

    cosmosDb.close();
    odinDb.close();
}

execute();

