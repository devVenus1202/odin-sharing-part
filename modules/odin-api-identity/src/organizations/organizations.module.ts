import { Module }                        from '@nestjs/common';
import { TypeOrmModule }                 from '@nestjs/typeorm';
import { OrganizationEntityRepository }  from "./organizations.repository";
import { OrganizationEntitysController } from "./organizations.controller";
import { OrganizationEntitysService }    from "./organizations.service";
import { RabbitMessageQueueModule } from '@d19n/client/dist/rabbitmq/rabbitmq.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ OrganizationEntityRepository ]),
        RabbitMessageQueueModule.forRoot(),
    ],
    controllers: [ OrganizationEntitysController ],
    providers: [ OrganizationEntitysService ],
    exports: [ OrganizationEntitysService ]
})
export class OrganizationEntitysModule {

}
