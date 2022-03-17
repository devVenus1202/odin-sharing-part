import { SERVICE_NAME } from '@d19n/client/dist/helpers/Services';
import { Utilities } from '@d19n/client/dist/helpers/Utilities';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import moment from 'moment';
import 'reflect-metadata';
import { Connection } from 'typeorm';
import { Address } from 'uk-clear-addressing';
import { BaseHttpClient } from '../../../common/Http/BaseHttpClient';
import { sleep } from '../../../helpers/utilities';
import * as overrides from './overrides.json';


dayjs.extend(utc)

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;

const httpClient = new BaseHttpClient();

@Injectable()
export class ImportsService {

    private readonly amqpConnection: AmqpConnection;
    private readonly odinDb: Connection;
    private readonly cosmosDb: Connection;
    private readonly myahDb: Connection;

    constructor(
        @InjectConnection('odinDb') odinDb: Connection,
        @InjectConnection('cosmosDb') cosmosDb: Connection,
        @InjectConnection('myahDb') myahDb: Connection,
        amqpConnection: AmqpConnection,
    ) {
        this.amqpConnection = amqpConnection;
        this.odinDb = odinDb;
        this.cosmosDb = cosmosDb;
        this.myahDb = myahDb;
    }


    /**
     *
     * @param principal
     * @param polygons
     * @param buildStatuses
     * @param addressStatus
     * @param opsStatus
     */
    async importAddressesFromNetomnia(
        principal: OrganizationUserEntity,
        polygons: any[],
        buildStatuses: string,
        addressStatus: string,
        opsStatus: string,
    ) {

        try {

            let connectionTypes = []
            if (addressStatus === 'ORDER') {
                connectionTypes = await this.cosmosDb.query(
                    `
             select a.id, case when p.id is not null or s.objectid is not null then 'OVERHEAD' else 'UNDERGROUND' end ug_or_oh
             from ftth.polygon a
             left join ftth.closure b on a.l4_closure_id = b.id
             left join ftth.pole p on st_intersects(p.geometry,b.geometry)
             left join (select * from openreach.structure where object_class::text = 'POLE') s on st_intersects(s.geom,b.geometry)
             where a.build_status_id in (7,8) and a.l4_closure_id  is not null and b.type_id =5 and a.name = 'L4'
             union all
             select a.id, 'NEEDS_CHECKING'
             from ftth.polygon a where a.l4_closure_id  is null and a.build_status_id in (7,8) and a.name = 'L4'
            `,
                )
            }


            // handle polygon overrides by status
            const l2PreOrderOverrides = overrides['OVERRIDE_PREORDER_L2'];
            const l4PreOrderOverrides = overrides['OVERRIDE_PREORDER_L4'];
            const backhaulPreOrderOverrides = overrides['OVERRIDE_BACKHAUL'];

            for(const poly of polygons) {

                const targetReleaseDate = poly.l2_target_release_date && moment(poly.l2_target_release_date).isValid() ? moment(
                    poly.l2_target_release_date).format(
                    'YYYY-MM-DD') : undefined;

                let opsPremiseStatus = opsStatus;
                let salesStatus = addressStatus;

                // set the new values for l2 polygon overrides
                if (l2PreOrderOverrides) {
                    console.log('preOrderOverrides', l2PreOrderOverrides)
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

                // if the target_release_date is < 3 months and salesStatus is not 8-RFS then set PRE_ORDER
                const nowPlusThreeMonths = moment().add(3, 'months')
                if (targetReleaseDate && moment(targetReleaseDate).isBefore(nowPlusThreeMonths) && poly.l4_build_status !== '8-RFS') {
                    salesStatus = 'PRE_ORDER';
                    opsPremiseStatus = '2';
                }

                if (poly.l2_eco === null || poly.l2_eco === false) {
                    // If the L2 eco property is null or false then the premise should be REGISTER_INTEREST only
                    salesStatus = 'REGISTER_INTEREST';
                    opsPremiseStatus = '3';
                } else if (poly.l4_eco === null || poly.l4_eco === false) {
                    // If the L4 eco property is null or false then the premise should be REGISTER_INTEREST onl
                    salesStatus = 'REGISTER_INTEREST';
                    opsPremiseStatus = '3';
                }

                // set the new values for ex polygon overrides
                // run this check last!
                if (backhaulPreOrderOverrides && poly.l4_build_status === '8-RFS') {
                    console.log('backhaulPreOrderOverrides', backhaulPreOrderOverrides)
                    if (backhaulPreOrderOverrides['exPolygonIds'].includes(poly.ex_id)) {
                        poly.l4_build_status = backhaulPreOrderOverrides['buildStatus'];
                        salesStatus = backhaulPreOrderOverrides['addressStatus'];
                        opsPremiseStatus = backhaulPreOrderOverrides['opsStatus']
                    }
                }

                let query = `SELECT *,
                ${poly.ex_id} as ex_polygon_id,
                ${poly.l2_id} as l2_polygon_id,
                ${poly.l4_id} as l4_polygon_id,
                ${poly.l2_target_release_date ? `'${poly.l2_target_release_date}'` : null} as target_release_date,
                '${poly.l4_build_status}' as build_status
                FROM misc.full_ultimate WHERE St_Intersects(misc.full_ultimate.geom, '${poly.l4_geometry}')`

                const premises = await this.cosmosDb.query(query);

                console.log('premises', premises)

                const processed = []

                for(const elem of premises) {

                    let recordId;

                    await sleep(100)

                    let connectionType = connectionTypes.find(elem => elem.id === poly.l4_id);
                    const buildStatusName = elem.build_status;

                    console.log('connectionType', connectionType)

                    if (elem.udprn) {

                        try {

                            const opsPremiseUpdated = await this.odinDb.query(`
                                INSERT INTO ops.premises  (uprn, udprn, umprn, geom, target_release_date, build_status_name, sales_status_id)
                                VALUES(${elem.uprn}, ${elem.udprn}, 0, '${elem.geom}', ${targetReleaseDate ? `'${targetReleaseDate}'` : null}, ${buildStatusName ? `'${buildStatusName}'` : null}, ${Number(opsPremiseStatus)})
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

                            const pafAddress = await this.odinDb.query(`select * from royal_mail.paf where udprn = ${elem.udprn}`)

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
                                    UPRN: elem.uprn,
                                    UDPRN: elem.udprn,
                                    UMPRN: '0',
                                    PostTown: elem.post_town,
                                    PostalCode: elem.postcode,
                                    Premise: premise,
                                    CountryCode: 'GB',
                                };


                                console.log('------------------------------------------------')
                                console.log('CREATE/UPDATE:', newAddress)

                                const createRes = await httpClient.postRequest(
                                    Utilities.getBaseUrl(SERVICE_NAME.CRM_MODULE),
                                    `v1.0/db/Address`,
                                    apiToken,
                                    [ newAddress ],
                                );

                                if (createRes['data']) {
                                    console.log('SUCCESS: ', createRes)
                                    recordId = createRes['data'][0]['id']
                                } else {
                                    console.log('ERROR: ', createRes)
                                }
                            }

                        } catch (e) {
                            console.error('ERROR', e);
                        }
                    } else {
                        // errors.push(elem);
                    }

                    processed.push({
                        l4_id: elem.l4_polygon_id,
                        build_status: buildStatusName,
                        sales_status: salesStatus,
                        uprn: elem.uprn,
                        udprn: elem.udprn,
                        odin_id: recordId,
                    })
                }

                // Insert into logs
                const res = await this.odinDb.manager.createQueryBuilder()
                    .insert()
                    .into('logs.address_import', [
                        'l4_id',
                        'build_status',
                        'sales_status',
                        'uprn',
                        'udprn',
                        'odin_id',
                    ])
                    .values(processed)
                    .execute();

                console.log('logs recorded:', res)

            }

        } catch (e) {
            console.error(e)
        }

    }

    /**
     *
     * @param principal
     * @param interval
     * @param buildStatuses
     * @param addressStatus
     * @param opsStatus
     */
    async importAddressesFromNetomniaRequest(
        principal: OrganizationUserEntity,
        interval: string,
        buildStatuses: string,
        addressStatus: string,
        opsStatus: string,
    ) {
        try {

            const parsedBuildStatuses = buildStatuses.split(',').map(elem => `'${elem.trim()}'`).join();

            console.log({
                buildStatuses,
                parsedBuildStatuses,
                addressStatus,
                opsStatus,
                interval,
            })


            let buildStatusModified = []
            if (interval !== 'ALL') {
                buildStatusModified = await this.cosmosDb.query(
                    `SELECT
                   DISTINCT(p1.id),
                   ex.name                as ex_name,
                   ex.id                  as ex_id,
                   p2.name                as l2_name,
                   p2.eco                 as l2_eco,
                   p2.id                  as l2_id,
                   p2.target_release_date as l2_target_release_date,
                   p2.build_status        as l2_build_status,
                   p2.build_status_id     as l2_build_status_id,
                   p1.eco                 as l4_eco,
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
                       p2.modified_at,
                       p2.target_release_date as target_release_date,
                       p2bs.id                as build_status_id,
                       p2bs.name              as build_status,
                       p2.eco                 as eco
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
                ${interval === 'ALL' ? '' : `AND (p2.modified_at > now() - '${interval}'::interval)`}
                AND p2.target_release_date IS NOT NULL
                ORDER BY p1.id DESC
                `);
            }

            const l4PolygonsModified = await this.cosmosDb.query(
                `SELECT
                   DISTINCT(p1.id),
                   ex.name                as ex_name,
                   ex.id                  as ex_id,
                   p2.name                as l2_name,
                   p2.eco                 as l2_eco,
                   p2.id                  as l2_id,
                   p2.target_release_date as l2_target_release_date,
                   p2.build_status        as l2_build_status,
                   p2.build_status_id     as l2_build_status_id,
                   p1.eco                 as l4_eco,
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
                       p2.modified_at,
                       p2.target_release_date as target_release_date,
                       p2bs.id                as build_status_id,
                       p2bs.name              as build_status,
                       p2.eco                 as eco
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
                ${interval === 'ALL' ? '' : `AND (p1.modified_at > now() - '${interval}'::interval)`}
                ORDER BY p1.id DESC
                `);

            const polygons = [ ...buildStatusModified, ...l4PolygonsModified ]

            let totalPolygons = polygons.length

            let remaining = polygons.length

            for(const polygon of polygons) {
                console.log('total: ', totalPolygons, 'remaining: ', remaining -= 1, [ polygon ])
                await sleep(50)
                await this.amqpConnection.publish(
                    process.env.MODULE_NAME,
                    `${process.env.MODULE_NAME}.IMPORT_ADDRESSES_INTO_ODIN_FROM_NETOMNIA`,
                    {
                        body: {
                            principal,
                            polygons: [ polygon ],
                            buildStatuses,
                            addressStatus,
                            opsStatus,
                        },
                    },
                );
            }

            return {
                message: 'addresses are being imported',
                totalPolygons,
                buildStatuses,
                addressStatus,
                opsStatus,
            }

        } catch (e) {
            console.error(e)
        }

    }

}
