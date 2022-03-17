import {
  SUB_ORGANIZATION_UPDATED,
} from '@d19n/models/dist/rabbitmq/rabbitmq.constants';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from "@nestjs/common";
import { OrganizationUsersService } from "./organizations.users.service";

@Injectable()
export class OrganizationUsersRabbitmqHandler {

  constructor(
    private readonly usersService: OrganizationUsersService,
  ) { }

  /**
   * Handles the organization updated event and clears the user cache
   * 
   * @param msg 
   */
  @RabbitSubscribe({
    exchange: SchemaModuleTypeEnums.IDENTITY_MODULE,
    routingKey: `${SchemaModuleTypeEnums.IDENTITY_MODULE}.${SUB_ORGANIZATION_UPDATED}`,
    queue: `${process.env.MODULE_NAME}.${SUB_ORGANIZATION_UPDATED}`,
  })
  private async handleOrganizationUpdated(msg: any) {
    if (msg?.principal) {
      this.usersService.removeAllFromCache(msg.principal.id);
    }
  }
}