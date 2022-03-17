import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';
import { DbModule } from '@d19n/schema-manager/dist/db/db.module';
import { PipelineEntitysStagesModule } from '@d19n/schema-manager/dist/pipelines/stages/pipelines.stages.module';
import { forwardRef, Module } from '@nestjs/common';
import { OrdersItemsModule } from 'src/orders/items/orders.items.module';
import { OrdersModule } from 'src/orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
    imports: [
        DbModule,
        PipelineEntitysStagesModule,
        RabbitMessageQueueModule.forRoot(),
        OrdersModule,
        forwardRef(() => OrdersItemsModule)
    ],
    controllers: [ CheckoutController ],
    providers: [ CheckoutService ],
    exports: [ CheckoutService ],
})
export class CheckoutModule {
}
