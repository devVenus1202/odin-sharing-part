import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { DbModule } from '@d19n/schema-manager/dist/db/db.module';
import { PipelineEntitysModule } from '@d19n/schema-manager/dist/pipelines/pipelines.module';
import { PipelineEntitysStagesModule } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.module';
import { SchemasModule } from '@d19n/schema-manager/dist/schemas/schemas.module';
import { forwardRef, Module } from '@nestjs/common';
import { OrdersItemsModule } from './items/orders.items.module';
import { OrdersController } from './orders.controller';
import { OrdersRabbitmqHandler } from './orders.rabbitmq.handler';
import { OrdersService } from './orders.service';

const { CRM_MODULE, FIELD_SERVICE_MODULE, SCHEMA_MODULE } = SchemaModuleTypeEnums

@Module({
    imports: [
        forwardRef(() => OrdersItemsModule),
        DbModule,
        SchemasModule,
        PipelineEntitysModule,
        PipelineEntitysStagesModule,
        RabbitMessageQueueModule.forRoot([
            {
                name: CRM_MODULE,
                type: 'topic',
            },
            {
                name: FIELD_SERVICE_MODULE,
                type: 'topic',
            },
            {
                name: SCHEMA_MODULE,
                type: 'topic'
            }
        ]),
    ],
    controllers: [ OrdersController ],
    providers: [ OrdersService, OrdersRabbitmqHandler ],
    exports: [ OrdersService ],

})
export class OrdersModule {

}
