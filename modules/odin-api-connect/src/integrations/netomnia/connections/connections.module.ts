import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';
import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRabbitmqHandler } from './connections.rabbitmq.handler';
import { ConnectionsService } from './connections.service';

dotenv.config();

@Module({
    imports: [
        RabbitMessageQueueModule.forRoot(),
    ],
    controllers: [
        ConnectionsController,
    ],
    providers: [
        ConnectionsService,
        ConnectionsRabbitmqHandler,
    ],
    exports: [
        ConnectionsService,
    ],
})
export class ConnectionsModule {

}
