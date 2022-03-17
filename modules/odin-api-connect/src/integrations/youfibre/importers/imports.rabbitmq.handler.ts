import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { ImportsService } from './imports.service';

dayjs.extend(utc)

dotenv.config();

@Injectable()
export class ImportsRabbitmqHandler {


    private readonly amqpConnection: AmqpConnection;
    private readonly importsService: ImportsService;

    constructor(
        amqpConnection: AmqpConnection,
        importsService: ImportsService,
    ) {
        this.amqpConnection = amqpConnection;
        this.importsService = importsService;
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.IMPORT_ADDRESSES_INTO_ODIN_FROM_NETOMNIA`,
        queue: `${process.env.MODULE_NAME}.IMPORT_ADDRESSES_INTO_ODIN_FROM_NETOMNIA`,
    })
    private async importAddressHandler(msg: { body: any }) {
        console.log('msg.body', msg.body)
        if(msg.body) {
            await this.importsService.importAddressesFromNetomnia(
                msg.body.principal,
                msg.body.polygons,
                msg.body.buildStatuses,
                msg.body.addressStatus,
                msg.body.opsStatus,
            )
        }
    }
}

