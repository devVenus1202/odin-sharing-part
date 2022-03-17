import { IsUUID } from 'class-validator';
import { OrganizationUserEntity } from '../../identity/organization/user/organization.user.entity';
import { JobStatusConstants } from './job.constants';

export class JobErrorDto {

  @IsUUID()
  public lastModifiedById: string;

  public lastModifiedBy: string;
  public status: JobStatusConstants;
  public completedAt: Date
  public error: any

  constructor(principal: OrganizationUserEntity, error: any) {

    this.lastModifiedById = principal.id
    this.lastModifiedBy = principal.fullName || `${principal.firstname} ${principal.lastname}`
    this.completedAt = new Date()
    this.status = JobStatusConstants.ERROR
    this.error = error

  }

}
