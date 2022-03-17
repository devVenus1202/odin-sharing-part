import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';
import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { ImportsController } from './imports.controller';
import { ImportsRabbitmqHandler } from './imports.rabbitmq.handler';
import { ImportsService } from './imports.service';

dotenv.config();

@Module({
    imports: [
        RabbitMessageQueueModule.forRoot(),
    ],
    controllers: [
        ImportsController,
    ],
    providers: [
        ImportsService,
        ImportsRabbitmqHandler,
    ],
    exports: [
        ImportsService,
    ],
})
export class ImportsModule {

}
