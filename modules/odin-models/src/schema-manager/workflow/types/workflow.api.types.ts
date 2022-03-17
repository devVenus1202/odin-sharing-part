import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationUserEntity } from '../../../identity/organization/user/organization.user.entity';
import { DbRecordEntityTransform } from '../../db/record/transform/db.record.entity.transform';
import { DataTypesUtils } from '../../helpers/DataTypesUtils';
import { WTriggerEntityEventEnum, WTriggerTypeEnum } from './workflow.types';

export class WTriggerQueryParams {
  triggerType?: WTriggerTypeEnum;
  triggerCron?: string;
  triggerEntityEvents?: WTriggerEntityEventEnum[];

  public constructor(request: any) {
    this.triggerType = request.query.triggerType;
    this.triggerEntityEvents = request.query.triggerEntityEvents;
  }
}

export class WQueryParams extends WTriggerQueryParams {
    moduleName?: string;
    entityName?: string;
    isActive?: boolean;

    public constructor(request: any) {
      super(request);

      this.moduleName = request.query.moduleName;
      this.entityName = request.query.entityName;
      
      this.isActive = request.query.isActive !== undefined ? DataTypesUtils.parseBoolean(request.query.isActive) : undefined;
    }
}

/**
 * Custom decorator for method injection.
 * NOTE: you need to use ExecutionContext and switch to http when using interceptors.
 * @type {(...dataOrPipes: Type<PipeTransform> | PipeTransform | any[]) => ParameterDecorator}
 */
export const WQueryParamsDecorator = createParamDecorator((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return new WQueryParams(request);

});

export class ProcessWorkflowForRecordsDto {
  principal: OrganizationUserEntity;
  records: DbRecordEntityTransform[];
  triggerParams?: WTriggerQueryParams;
  simulation?: boolean;
}
