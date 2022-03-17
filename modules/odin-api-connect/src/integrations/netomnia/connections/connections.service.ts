import { HelpersNotificationsApi } from '@d19n/client/dist/helpers/helpers.notifications.api';
import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { SendgridEmailEntity } from '@d19n/models/dist/notifications/sendgrid/email/sendgrid.email.entity';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import axios from 'axios';
import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import { Parser } from 'json2csv';
import 'reflect-metadata';
import { Connection } from 'typeorm';
import {
    deleteObjectFromS3,
    getPresignedUrl,
    listBucketObjects,
    putObjectToS3,
} from '../../../common/awsS3/buckets/buckets.service';
import { checkDataForL1Polygon } from './auto-connect-data-checks-l1';
import { checkDataForL2Polygon } from './auto-connect-data-checks-l2';
import { deleteFromS3, getFromS3 } from './data/http';
import {
    getAllClosuresInOdinByPolygonId,
    getAllClosuresWithCableConnections,
    getAllClosuresWithNoFiberConnections,
    getClosureByCableIdAndDirection,
    getClosureIdsByPolygonId,
    getClosuresByEXPolygonId,
    getClosuresByL1yPolygonId,
    getClosuresByL2yPolygonId,
    getConnectionsByClosureId,
    getExPolygonIdFromClosureId,
    getOdinRecordByExternalRef,
    getPolygonsAndClosuresInExPolygon,
} from './data/sql';
import { getClosureTypeByCableName, getClosureTypeFromId } from './data/utils';
import { importFeaturesIntoOdin } from './importers/import-features-into-odin';
import { resetFibersByL2PolygonId } from './template-actions/reset-fibers-by-l2-polygon';
import { generateCableMappings } from './template-generators/generate-cable-mappings';
import { createL0Connections } from './template-generators/generate-fiber-connection-map-l0';
import { createL1Connections } from './template-generators/generate-fiber-connection-map-l1';
import { createL2Connections } from './template-generators/generate-fiber-connection-map-l2';
import { spliceL4Connections } from './template-generators/generate-fiber-connection-map-l4';
import { traceByL0ClosureId } from './tracing/trace-connections-gis-parsed';

dayjs.extend(utc)

dotenv.config({ path: '../../../.env' });

const apiToken = process.env.ODIN_API_TOKEN;


@Injectable()
export class ConnectionsService {

    private readonly amqpConnection: AmqpConnection;
    private readonly odinDb: Connection;
    private readonly cosmosDb: Connection;

    constructor(
        @InjectConnection('odinDb') odinDb: Connection,
        @InjectConnection('cosmosDb') cosmosDb: Connection,
        amqpConnection: AmqpConnection,
    ) {
        this.amqpConnection = amqpConnection;
        this.odinDb = odinDb;
        this.cosmosDb = cosmosDb;
    }


    /**
     *
     * @param principal
     * @param exPolygonId
     */
    async getFiberConnectionDropdownOptions(
        principal: OrganizationUserEntity,
        exPolygonId: string,
    ) {

        const res = await getPolygonsAndClosuresInExPolygon(exPolygonId, { cosmosDb: this.cosmosDb })
        return res[0]

    }

    /**
     *
     * @param principal
     * @param l2PolygonId
     * @param exPolygonId
     * @param l1PolygonId
     */
    async checkClosures(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l1PolygonId: string,
        l2PolygonId: string,
    ) {

        try {

            if (l1PolygonId && !l2PolygonId) {
                return await checkDataForL1Polygon(
                    l0ClosureId,
                    l1PolygonId,
                    { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
                )
            }

            if (l1PolygonId && l2PolygonId) {
                return await checkDataForL2Polygon(
                    l0ClosureId,
                    l1PolygonId,
                    l2PolygonId,
                    { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
                )
            }

            return 'please pass down the correct polygon ids'

        } catch (e) {

            console.error(e)

        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async exportDataFromS3Path(principal: OrganizationUserEntity, pathName: string) {

        try {

            const link = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                pathName,
            )

            const response = await axios.get(link)
            return response['data'];

        } catch (e) {

            console.error(e)

        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async listAllFilesByPathNameInBucket(principal: OrganizationUserEntity, pathName: string) {

        try {

            const res = await listBucketObjects(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `${pathName}`,
            )

            return res;

        } catch (e) {

            console.error(e)

        }
    }


    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async listAllFilesInBucket(principal: OrganizationUserEntity, polygonId: string) {

        try {

            const res = await listBucketObjects(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}`,
            )

            return res;

        } catch (e) {

            console.error(e)

        }
    }

    /**
     *
     * @param l0ClosureId
     */
    async importFeaturesIntoOdinQueue(principal: OrganizationUserEntity, l1PolygonId: string, featureType: string) {
        try {

            await this.amqpConnection.publish(
                process.env.MODULE_NAME,
                `${process.env.MODULE_NAME}.IMPORT_FEATURES_INTO_ODIN`,
                {
                    body: {
                        principal,
                        l1PolygonId,
                        featureType,
                    },
                },
            );

            return 'An email will be sent when the import is complete. This process can take between 15 - 30 minutes for a full import'

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async importFeatures(principal: OrganizationUserEntity, l1PolygonId: string, featureType: string) {
        try {

            await importFeaturesIntoOdin(
                principal,
                l1PolygonId,
                featureType,
                { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
            )

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param l0ClosureId
     */
    async traceAndMapCables(principal: OrganizationUserEntity, l0ClosureId: string, l1PolygonId: string) {
        try {

            await this.amqpConnection.publish(
                process.env.MODULE_NAME,
                `${process.env.MODULE_NAME}.TRACE_AND_MAP_CABLES`,
                {
                    body: {
                        principal,
                        l0ClosureId,
                        l1PolygonId,
                    },
                },
            );

            return 'An email will be sent when the tracing is complete. This process can take between 7 - 10 minutes'

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async trace(principal: OrganizationUserEntity, l0ClosureId: string, l1PolygonId: string) {
        try {

            await traceByL0ClosureId(principal, l0ClosureId, l1PolygonId, 'Spine', { cosmosDb: this.cosmosDb })
            await generateCableMappings(principal, l0ClosureId, l1PolygonId)

            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `Tracing complete ${l0ClosureId}`,
                body: `ready to create cable connections.`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async createCableMappings(principal: OrganizationUserEntity, l0ClosureId: string, l1PolygonId: string) {
        try {

            await generateCableMappings(principal, l0ClosureId, l1PolygonId)

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     */
    public async createCableConnections(principal: OrganizationUserEntity, l0ClosureId: any, l1PolygonId: any) {
        try {
            const tracesUrl = await getFromS3(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/l0-${l0ClosureId}/closure-cable-mappings-gis-l1-polygon-${l1PolygonId}`,
            )
            const response = await axios.get(tracesUrl)
            let connectionMappings = response['data'];

            if (l1PolygonId) {

                // get the closures missing cables and only create connections for those closures
                const allOdinClosures = await getAllClosuresInOdinByPolygonId(
                    l1PolygonId,
                    { odinDb: this.odinDb },
                )

                console.log('allOdinClosures', allOdinClosures)

                if (allOdinClosures[0]) {

                    const closureIds = allOdinClosures.map(elem => elem['ext_ref'])

                    console.log('closureIds', closureIds)

                    const inCableConnections = connectionMappings.filter(elem => elem['inClosure'] ? closureIds.includes(
                        String(elem['inClosure'])) : false)
                    const outCableConnections = connectionMappings.filter(elem => elem['outClosure'] ? closureIds.includes(
                        String(elem['outClosure'])) : false)


                    connectionMappings = [ ...inCableConnections, ...outCableConnections ]

                }
            }

            console.log('connectionMappings', connectionMappings)

            for(const connection of connectionMappings) {
                console.log('connection', connection)
                await this.amqpConnection.publish(
                    process.env.MODULE_NAME,
                    `${process.env.MODULE_NAME}.CREATE_CABLE_CONNECTION`,
                    {
                        body: connection,
                    },
                );
            }

            const newEmail = new SendgridEmailEntity();

            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `Cable connections are being created for ${l0ClosureId}`,
                body: `Total connections queued ${connectionMappings.length}`,
            };
            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );

            return {
                messagesSent: connectionMappings.length,
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l1PolygonId
     * @param l2PolygonId
     */
    async createLoopCableFiberMappings(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l1PolygonId: string,
        l2PolygonId: string,
    ) {
        try {

            for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
                await this.amqpConnection.publish(
                    process.env.MODULE_NAME,
                    `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_MAPPING`,
                    {
                        body: {
                            principal,
                            l0ClosureId,
                            l1PolygonId,
                            l2PolygonId,
                            cableType,
                        },
                    },
                );
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l1PolygonId
     * @param l2PolygonId
     */
    async createLoopCableFiberConnections(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l1PolygonId: string,
        l2PolygonId: string,
    ) {
        try {

            for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
                const closureTypes = getClosureTypeByCableName(cableType)
                for(const closureType of closureTypes) {
                    await this.amqpConnection.publish(
                        process.env.MODULE_NAME,
                        `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_CONNECTION`,
                        {
                            body: {
                                principal,
                                l0ClosureId,
                                l2PolygonId,
                                l1PolygonId,
                                closureType,
                                cableType,
                            },
                        },
                    );
                }
            }

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param l4ClosureId
     */
    async createL4FiberConnectionRequest(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l2PolygonId: string,
        l1PolygonId: string,
        l4ClosureId?: string,
    ) {

        await this.amqpConnection.publish(
            process.env.MODULE_NAME,
            `${process.env.MODULE_NAME}.CREATE_L4_CONNECTION_TEMPLATE`,
            {
                body: {
                    principal,
                    l0ClosureId,
                    l2PolygonId,
                    l1PolygonId,
                    l4ClosureId,
                },
            },
        );

        return 'An email will be sent when the templates are ready. allow up to 10 minutes'
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param l4ClosureId
     */
    async createL4FiberConnections(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l2PolygonId: string,
        l1PolygonId: string,
        l4ClosureId?: string,
    ) {
        try {

            await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb: this.odinDb, cosmosDb: this.cosmosDb })
            await spliceL4Connections(
                l2PolygonId,
                l1PolygonId,
                l4ClosureId,
                { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
            )

            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L4 connection templates created ${l2PolygonId}`,
                body: `template can be applied for polygon ${l2PolygonId}`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
        } catch (e) {
            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L4 connection templates could not be created for polygon ${l2PolygonId}`,
                body: e,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param l2ClosureId
     */
    async createL2FiberConnectionRequest(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l2PolygonId: string,
        l1PolygonId: string,
        l2ClosureId?: string,
    ) {

        await this.amqpConnection.publish(
            process.env.MODULE_NAME,
            `${process.env.MODULE_NAME}.CREATE_L2_CONNECTION_TEMPLATE`,
            {
                body: {
                    principal,
                    l0ClosureId,
                    l2PolygonId,
                    l1PolygonId,
                    l2ClosureId,
                },
            },
        );

        return 'An email will be sent when the template is ready. allow up to 10 minutes'
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l2PolygonId
     * @param l1PolygonId
     * @param l2ClosureId
     */
    async createL2FiberConnections(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l2PolygonId: string,
        l1PolygonId: string,
        l2ClosureId?: string,
    ) {
        try {
            await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb: this.odinDb, cosmosDb: this.cosmosDb })
            await createL2Connections(
                l2PolygonId,
                l1PolygonId,
                l2ClosureId,
                { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
            )

            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L2 connection templates created ${l2PolygonId}`,
                body: `template can be applied for polygon ${l2PolygonId}`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
        } catch (e) {
            console.error(e);
            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L2 connection templates could not be created for polygon ${l2PolygonId}`,
                body: e,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     * @param l1PolygonId
     * @param l1ClosureId
     * @param l1ClosureId
     */
    async createL1FiberConnectionRequest(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l1PolygonId: string,
        l1ClosureId?: string,
    ) {

        await this.amqpConnection.publish(
            process.env.MODULE_NAME,
            `${process.env.MODULE_NAME}.CREATE_L1_CONNECTION_TEMPLATE`,
            {
                body: {
                    principal,
                    l0ClosureId,
                    l1PolygonId,
                    l1ClosureId,
                },
            },
        );

        return 'An email will be sent when the template is ready. allow up to 10 minutes'
    }


    /**
     *
     * @param principal
     * @param l1PolygonId
     * @param l1ClosureId
     */
    async createL1FiberConnections(
        principal: OrganizationUserEntity,
        l0ClosureId: string,
        l1PolygonId: string,
        l1ClosureId?: string,
    ) {
        try {

            await checkDataForL1Polygon(l0ClosureId, l1PolygonId, { odinDb: this.odinDb, cosmosDb: this.cosmosDb })
            await createL1Connections(l1PolygonId, l1ClosureId, { odinDb: this.odinDb, cosmosDb: this.cosmosDb })

            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L1 connection templates created ${l1PolygonId}`,
                body: `template can be applied for polygon ${l1PolygonId}`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
        } catch (e) {
            console.error(e);
            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L1 connection templates could not be created for polygon ${l1PolygonId}`,
                body: e,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param exPolygonId
     * @param l0ClosureId
     */
    async createL0FiberConnectionRequest(
        principal: OrganizationUserEntity,
        exPolygonId: string,
        l0ClosureId: string,
    ) {

        await this.amqpConnection.publish(
            process.env.MODULE_NAME,
            `${process.env.MODULE_NAME}.CREATE_L0_CONNECTION_TEMPLATE`,
            {
                body: {
                    principal,
                    exPolygonId,
                    l0ClosureId,
                },
            },
        );

        return 'An email will be sent when the template is ready. allow up to 10 minutes'
    }

    /**
     *
     * @param principal
     * @param exPolygonId
     * @param l0ClosureId
     */
    async createL0FiberConnections(
        principal: OrganizationUserEntity,
        exPolygonId: string,
        l0ClosureId: string,
    ) {
        try {

            await createL0Connections(exPolygonId, l0ClosureId, { odinDb: this.odinDb, cosmosDb: this.cosmosDb })

            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L0 connection templates created ${l0ClosureId}`,
                body: `template can be applied for closure ${l0ClosureId}`,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
        } catch (e) {
            console.error(e);
            const newEmail = new SendgridEmailEntity();
            newEmail.to = [ principal.email, 'frank@d19n.io' ];
            newEmail.templateLabel = 'SENDGRID_TEXT_EMAIL'
            newEmail.dynamicTemplateData = {
                subject: `L0 connection templates could not be created for closure ${l0ClosureId}`,
                body: e,
            };

            await HelpersNotificationsApi.sendDynamicEmail(
                newEmail,
                { authorization: 'Bearer ' + apiToken },
            );
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param principal
     * @param polygonId
     * @param closureType
     * @param closureId
     */
    async resetFiberConnections(
        principal: OrganizationUserEntity,
        polygonId: string,
        closureType: string,
        closureId: string,
    ) {

        try {
            let closureIds = closureId ? [ closureId ] : []

            if (polygonId && !closureId) {
                // if we are resetting L4 connections we also want to reset any LM connections
                if (closureType === 'L4') {
                    const lmClosures = await getClosureIdsByPolygonId(polygonId, 'LM', { cosmosDb: this.cosmosDb })
                    const lmClosureIds = lmClosures.map(elem => elem['id'])
                    for(const closureExtRef of lmClosureIds) {
                        console.log('RESET_FIBER_CONNECTIONS', closureExtRef)
                        // send to rabbitmq
                        await this.amqpConnection.publish(
                            process.env.MODULE_NAME,
                            `${process.env.MODULE_NAME}.RESET_FIBER_CONNECTIONS`,
                            {
                                body: {
                                    principal,
                                    polygonId,
                                    closureExtRef,
                                    closureType: 'LM',
                                },
                            },
                        );
                    }
                }

                const closures = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb: this.cosmosDb })

                if (closures[0]) {
                    closureIds = closures.map(elem => elem['id'])
                }
            }

            console.log('closureIds:214', closureIds)
            if (closureIds && closureIds.length > 0) {
                for(const closureExtRef of closureIds) {
                    console.log('RESET_FIBER_CONNECTIONS', closureExtRef)
                    // send to rabbitmq
                    await this.amqpConnection.publish(
                        process.env.MODULE_NAME,
                        `${process.env.MODULE_NAME}.RESET_FIBER_CONNECTIONS`,
                        {
                            body: {
                                principal,
                                polygonId,
                                closureExtRef,
                                closureType,
                            },
                        },
                    );
                }
            }

            // catch all reset fibers if closureType is L4
            if (closureType === 'L4') {
                await resetFibersByL2PolygonId(polygonId, { odinDb: this.odinDb })
            }

            // reset the loop fibers
            if ([ 'L2', 'L4' ].includes(closureType)) {
                for(const cableType of [ 'Spine', 'Access', 'Distribution' ]) {
                    try {
                        await deleteObjectFromS3(
                            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                            `auto-connect/polygon-${polygonId}/${cableType.toLowerCase()}-loop-fiber-mappings-applied`,
                        )
                    } catch (e) {
                        console.error(e)
                    }
                }
            }

            return 'resetting fiber connections, an email will be sent when complete.'
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param l0ClosureId
     */
    async applyFiberConnectionTemplateForL0(principal: OrganizationUserEntity, l0ClosureId: string) {
        const exPolygon = await getExPolygonIdFromClosureId(l0ClosureId, { cosmosDb: this.cosmosDb })
        return await this.applyFiberConnectionTemplate(principal, exPolygon['id'], 'L0')
    }

    /**
     *
     * @param l2PolygonId
     * @param closureType
     */
    async applyFiberConnectionTemplate(principal: OrganizationUserEntity, polygonId: string, closureType: string) {

        try {

            if (closureType === 'L4') {
                // when processing L4 closure types we want to also process LM closure types
                await Promise.all([
                    this.queueApplyTemplateJob(principal, polygonId, 'L4'),
                    this.queueApplyTemplateJob(principal, polygonId, 'LM'),
                ])

            } else {
                await this.queueApplyTemplateJob(principal, polygonId, closureType)
            }


            return `creating connections for polygon ${polygonId} and closure type ${closureType}. allow up to 10 minutes to complete`

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    private async queueApplyTemplateJob(principal: OrganizationUserEntity, polygonId: string, closureType: string) {

        let closureIds = []

        if (polygonId) {

            const ids = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb: this.cosmosDb })

            if (ids[0]) {
                closureIds = ids.map(elem => elem['id'])
            }

            console.log('closureIds:214', closureIds)

            let closures = []
            if ([ 'l0', 'L1', 'L2' ].includes(closureType)) {
                closures = await getAllClosuresWithCableConnections(
                    closureIds,
                    closureType,
                    { odinDb: this.odinDb },
                )
            } else {
                closures = await getAllClosuresWithNoFiberConnections(
                    closureIds,
                    closureType,
                    { odinDb: this.odinDb },
                )
            }

            const idsNoConnection = closureIds.filter(id => closures.map(elem => elem['ext_ref']).includes(String(id)))

            console.log('idsNoConnection', idsNoConnection)
            for(const closureExtRef of idsNoConnection) {
                // send to rabbitmq
                await this.amqpConnection.publish(
                    process.env.MODULE_NAME,
                    `${process.env.MODULE_NAME}.APPLY_FIBER_CONNECTION_TEMPLATE`,
                    {
                        body: {
                            principal,
                            polygonId,
                            closureExtRef,
                            closureType,
                        },
                    },
                );
            }
        }
    }

    /**
     *
     * @param l2PolygonId
     * @param closureType
     */
    async getConnectionsByClosureId(principal: OrganizationUserEntity, closureId: string) {

        try {
            console.log('closureId', closureId)

            const dbRecord = await getOdinRecordByExternalRef(Number(closureId), 'CLOSURE', { odinDb: this.odinDb });
            console.log('dbRecord', dbRecord)

            const closureConnections = await getConnectionsByClosureId(dbRecord['id'], { odinDb: this.odinDb });
            console.log('closureConnections', closureConnections)

            let parsedConnections = [];

            let lastInCableId = undefined;
            let inClosureExtRef;

            for(const connection of closureConnections) {

                if (!inClosureExtRef && lastInCableId !== connection['in_cable_id']) {
                    const upstreamClosure = await getClosureByCableIdAndDirection(
                        connection['in_cable_id'],
                        'IN',
                        { odinDb: this.odinDb },
                    )
                    inClosureExtRef = upstreamClosure[0]['to_closure_ext_ref'];
                }

                lastInCableId = connection['in_cable_id'];

                console.log('inClosureExtRef', inClosureExtRef)

                connection['in_closure'] = inClosureExtRef;
                connection['type'] = connection['type'];

                delete connection['in_cable_id']

                parsedConnections.push(connection)

            }


            return parsedConnections;


        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }


    /**
     *
     * @param principal
     * @param polygonId
     */
    async exportConnectionsByPolygonId(principal: OrganizationUserEntity, polygonId: string) {

        try {

            const l0Closures = await getClosuresByEXPolygonId(polygonId, { odinDb: this.odinDb })
            const l1Closures = await getClosuresByL1yPolygonId(polygonId, { odinDb: this.odinDb })
            const l2L3Closures = await getClosuresByL2yPolygonId(polygonId, { odinDb: this.odinDb })
            console.log('l0Closures', l0Closures)
            console.log('l1Closures', l1Closures)
            console.log('l2L3Closures', l2L3Closures)

            for(const closure of [ ...l0Closures, ...l1Closures, ...l2L3Closures ]) {

                const typeName = getClosureTypeFromId(Number(closure['type']))
                console.log('typeName', typeName)
                const closureTypeName = getClosureTypeFromId(Number(closure['type']))

                await deleteFromS3(
                    `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                    `auto-connect/polygon-${polygonId}/connections/${closureTypeName}-${closure['ext_ref']}.csv`,
                )

                const closureConnections = await getConnectionsByClosureId(closure['id'], { odinDb: this.odinDb })

                let parsedConnections = [];

                let lastInCableId = undefined;
                let inClosureExtRef;

                for(const connection of closureConnections) {

                    if (!inClosureExtRef && lastInCableId !== connection['in_cable_id']) {
                        const upstreamClosure = await getClosureByCableIdAndDirection(
                            connection['in_cable_id'],
                            'IN',
                            { odinDb: this.odinDb },
                        )
                        inClosureExtRef = upstreamClosure[0]['to_closure_ext_ref'];
                    }

                    lastInCableId = connection['in_cable_id'];

                    console.log('inClosureExtRef', inClosureExtRef)

                    connection['in_closure'] = inClosureExtRef;
                    connection['type'] = connection['type'];

                    delete connection['in_cable_id']

                    parsedConnections.push(connection)

                }

                if (parsedConnections[0]) {

                    let csv = null;
                    const fields = Object.keys(parsedConnections[0]).map(elem => (elem));

                    try {
                        // csv = parse({ data: report, fields });
                        const parser = new Parser({ fields });
                        csv = parser.parse(parsedConnections);
                    } catch (err) {
                        console.error(err);
                    }

                    if (csv) {
                        await putObjectToS3(
                            `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                            `auto-connect/polygon-${polygonId}/connections/${closureTypeName}-${closure['ext_ref']}.csv`,
                            csv,
                        )
                    }
                }
            }

            const res = await getPresignedUrl(
                `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                `auto-connect/polygon-${polygonId}/connections`,
            )

            return res;

        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

    /**
     *
     * @param principal
     * @param polygonId
     * @param closureType
     */
    async deleteS3Templates(principal: OrganizationUserEntity, polygonId: string, closureType: string) {

        try {
            let closureIds = []

            if (polygonId) {

                const ids = await getClosureIdsByPolygonId(polygonId, closureType, { cosmosDb: this.cosmosDb })

                if (ids[0]) {
                    closureIds = ids.map(elem => elem['id'])
                }

                // TODO: Check if closure has fiber connections

                for(const closureExtRef of closureIds) {
                    // send to rabbitmq
                    await deleteObjectFromS3(
                        `${process.env.S3_BUCKET_NAME_FOR_ORG_FILES}`,
                        `auto-connect/polygon-${polygonId}/${closureType.toLowerCase()}-fiber-connections-template-${closureExtRef}`,
                    )
                }
            }
        } catch (e) {
            console.error(e);
            throw new ExceptionType(e.statusCode, e.message);
        }
    }

}

