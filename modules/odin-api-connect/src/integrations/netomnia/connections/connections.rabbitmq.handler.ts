import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { Connection } from 'typeorm';
import { ConnectionsService } from './connections.service';
import { createLoopFiberConnections } from './template-actions/create-loop-fiber-connections';
import { createSingleCableConnection } from './template-actions/create-single-cable-connection';
import { createFiberConnections } from './template-actions/fiber-connections-create';
import { deleteFiberConnections } from './template-actions/fiber-connections-delete';
import { updateFiberConnections } from './template-actions/fiber-connections-update';
import { resetConnections } from './template-actions/reset-closure-connections';
import { generateLoopCableFibreMappings } from './template-generators/generate-fiber-mapping-for-loop-cables';

dayjs.extend(utc)

dotenv.config();

@Injectable()
export class ConnectionsRabbitmqHandler {


    private readonly amqpConnection: AmqpConnection;
    private readonly odinDb: Connection;
    private readonly cosmosDb: Connection;
    private readonly connectionsService: ConnectionsService;

    constructor(
        @InjectConnection('odinDb') odinDb: Connection,
        @InjectConnection('cosmosDb') cosmosDb: Connection,
        amqpConnection: AmqpConnection,
        connectionsService: ConnectionsService,
    ) {
        this.amqpConnection = amqpConnection;
        this.odinDb = odinDb;
        this.cosmosDb = cosmosDb;
        this.connectionsService = connectionsService;
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.IMPORT_FEATURES_INTO_ODIN`,
        queue: `${process.env.MODULE_NAME}.IMPORT_FEATURES_INTO_ODIN`,
    })
    private async importFeaturesIntoOdinHandler(msg: { body: any }) {
        if (msg.body) {
            await this.connectionsService.importFeatures(
                msg.body.principal,
                msg.body.l1PolygonId,
                msg.body.featureType,
            )
        }
    }


    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.TRACE_AND_MAP_CABLES`,
        queue: `${process.env.MODULE_NAME}.TRACE_AND_MAP_CABLES`,
    })
    private async traceAndMapCableHandler(msg: { body: any }) {
        if (msg.body) {
            await this.connectionsService.trace(
                msg.body.principal,
                msg.body.l0ClosureId,
                msg.body.l1PolygonId,
            )
        }
    }


    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_CABLE_CONNECTION`,
        queue: `${process.env.MODULE_NAME}.CREATE_CABLE_CONNECTION`,
    })
    private async createCableConnectionHandler(msg: { body: any }) {
        if (msg.body) {
            await createSingleCableConnection(msg.body, { odinDb: this.odinDb })
        }
    }


    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_MAPPING`,
        queue: `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_MAPPING`,
    })
    private async createLoopCableFibreMappingsHandler(msg: { body: any }) {
        if (msg.body) {
            await generateLoopCableFibreMappings(
                msg.body.principal,
                msg.body.l0ClosureId,
                msg.body.cableType,
                msg.body.l1PolygonId,
                { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
                msg.body.l2PolygonId,
            )
        }
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_CONNECTION`,
        queue: `${process.env.MODULE_NAME}.CREATE_LOOP_FIBER_CONNECTION`,
    })
    private async createLoopFiberConnectionHandler(msg: { body: any }) {
        if (msg.body) {
            await createLoopFiberConnections(
                msg.body.principal,
                msg.body.l0ClosureId,
                msg.body.l1PolygonId,
                msg.body.l2PolygonId,
                msg.body.closureType,
                msg.body.cableType,
                { odinDb: this.odinDb, cosmosDb: this.cosmosDb },
            )
        }
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.RESET_FIBER_CONNECTIONS`,
        queue: `${process.env.MODULE_NAME}.RESET_FIBER_CONNECTIONS`,
    })
    private async resetFiberConnectionHandler(msg: { body: { principal: OrganizationUserEntity, polygonId: string, closureExtRef: string, closureType: string } }) {
        if (msg.body) {
            await resetConnections(
                msg.body.principal,
                msg.body.polygonId,
                msg.body.closureExtRef,
                msg.body.closureType,
                { odinDb: this.odinDb },
            )
        }
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.APPLY_FIBER_CONNECTION_TEMPLATE`,
        queue: `${process.env.MODULE_NAME}.APPLY_FIBER_CONNECTION_TEMPLATE`,
    })
    private async applyFiberConnectionTemplateHandler(msg: { body: { principal: OrganizationUserEntity, polygonId: string, closureExtRef: string, closureType: string } }) {
        if (msg.body) {

            await updateFiberConnections(
                msg.body.polygonId,
                msg.body.closureExtRef,
                msg.body.closureType,
                { odinDb: this.odinDb },
            )

            await deleteFiberConnections(
                msg.body.polygonId,
                msg.body.closureExtRef,
                msg.body.closureType,
                { odinDb: this.odinDb },
            )

            await createFiberConnections(
                msg.body.principal,
                msg.body.polygonId,
                msg.body.closureExtRef,
                msg.body.closureType,
                { odinDb: this.odinDb },
            )
        }
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_L4_CONNECTION_TEMPLATE`,
        queue: `${process.env.MODULE_NAME}.CREATE_L4_CONNECTION_TEMPLATE`,
    })
    private async createL4FiberConnectionRequestHandler(msg: { body: { principal: OrganizationUserEntity, l0ClosureId: string, l2PolygonId: string, l1PolygonId: string, l4ClosureId?: string } }) {
        if (msg.body) {
            try {
                await this.connectionsService.createL4FiberConnections(
                    msg.body.principal,
                    msg.body.l0ClosureId,
                    msg.body.l2PolygonId,
                    msg.body.l1PolygonId,
                    msg.body.l4ClosureId,
                )
            } catch (e) {
                console.error(e)
            }
        }
    }


    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_L2_CONNECTION_TEMPLATE`,
        queue: `${process.env.MODULE_NAME}.CREATE_L2_CONNECTION_TEMPLATE`,
    })
    private async createL2FiberConnectionRequestHandler(msg: { body: { principal: OrganizationUserEntity, l0ClosureId: string, l2PolygonId: string, l1PolygonId: string, l2ClosureId?: string } }) {
        if (msg.body) {
            try {
                await this.connectionsService.createL2FiberConnections(
                    msg.body.principal,
                    msg.body.l0ClosureId,
                    msg.body.l2PolygonId,
                    msg.body.l1PolygonId,
                    msg.body.l2ClosureId,
                )
            } catch (e) {
                console.error(e)
            }
        }
    }


    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_L1_CONNECTION_TEMPLATE`,
        queue: `${process.env.MODULE_NAME}.CREATE_L1_CONNECTION_TEMPLATE`,
    })
    private async createL1FiberConnectionRequestHandler(msg: { body: { principal: OrganizationUserEntity, l0ClosureId: string, l1PolygonId: string, l1ClosureId?: string } }) {
        if (msg.body) {
            try {
                await this.connectionsService.createL1FiberConnections(
                    msg.body.principal,
                    msg.body.l0ClosureId,
                    msg.body.l1PolygonId,
                    msg.body.l1ClosureId,
                )
            } catch (e) {
                console.error(e)
            }
        }
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.CREATE_L0_CONNECTION_TEMPLATE`,
        queue: `${process.env.MODULE_NAME}.CREATE_L0_CONNECTION_TEMPLATE`,
    })
    private async createL0FiberConnectionRequestHandler(msg: { body: { principal: OrganizationUserEntity, exPolygonId: string, l0ClosureId: string } }) {
        if (msg.body) {
            try {
                await this.connectionsService.createL0FiberConnections(
                    msg.body.principal,
                    msg.body.exPolygonId,
                    msg.body.l0ClosureId,
                )
            } catch (e) {
                console.error(e)
            }
        }
    }


}

