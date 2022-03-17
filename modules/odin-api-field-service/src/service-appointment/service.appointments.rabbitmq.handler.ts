import { SUB_DB_RECORD_ASSOCIATION_CREATED } from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { IDbRecordAssociationCreated } from '@d19n/models/dist/rabbitmq/rabbitmq.interfaces';
import { splitEntityToModuleAndEntity } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { ServiceAppointmentsService } from './service.appointments.service';

const { WORK_ORDER, SERVICE_APPOINTMENT } = SchemaModuleEntityTypeEnums;

dotenv.config();

@Injectable()
export class ServiceAppointmentsRabbitmqHandler {

    private serviceAppointmentsService: ServiceAppointmentsService;

    constructor(
        serviceAppointmentsService: ServiceAppointmentsService,
    ) {
        this.serviceAppointmentsService = serviceAppointmentsService;
    }

    /**
     *
     * @param msg
     * @private
     */
    @RabbitSubscribe({
        exchange: process.env.MODULE_NAME,
        routingKey: `${process.env.MODULE_NAME}.${SUB_DB_RECORD_ASSOCIATION_CREATED}`,
        queue: `${process.env.MODULE_NAME}.${WORK_ORDER}.${SERVICE_APPOINTMENT}.${SUB_DB_RECORD_ASSOCIATION_CREATED}`,
    })
    private async handleDbRecordAssociationCreated(msg: IDbRecordAssociationCreated) {

        if (msg.dbRecordAssociation) {
            // Handle message
            const splitParent = splitEntityToModuleAndEntity(msg.dbRecordAssociation.parentEntity);
            const splitChild = splitEntityToModuleAndEntity(msg.dbRecordAssociation.childEntity);
            // Handle discounts
            if (splitParent.entityName === WORK_ORDER && splitChild.entityName === SERVICE_APPOINTMENT) {

                const { parentRecordId, childRecordId } = msg.dbRecordAssociation;

                await this.serviceAppointmentsService.enrichServiceAppointment(
                    msg.principal,
                    parentRecordId,
                    childRecordId,
                );
            }
        }
    }
}
