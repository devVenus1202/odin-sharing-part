import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';
import { DbModule } from '@d19n/schema-manager/dist/db/db.module';
import { SchemasModule } from '@d19n/schema-manager/dist/schemas/schemas.module';
import { forwardRef, Module } from '@nestjs/common';
import { ServiceAppointmentsController } from './service.appointments.controller';
import { ServiceAppointmentsRabbitmqHandler } from './service.appointments.rabbitmq.handler';
import { ServiceAppointmentsService } from './service.appointments.service';

@Module({
    imports: [
        forwardRef(() => DbModule),
        forwardRef(() => SchemasModule),
        RabbitMessageQueueModule.forRoot(),
    ],
    controllers: [ ServiceAppointmentsController ],
    providers: [ ServiceAppointmentsService, ServiceAppointmentsRabbitmqHandler ],
    exports: [ ServiceAppointmentsService ],

})
export class ServiceAppointmentModule {
}
