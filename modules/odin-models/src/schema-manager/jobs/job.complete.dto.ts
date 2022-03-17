import { IsUUID } from 'class-validator';
import { OrganizationUserEntity } from '../../identity/organization/user/organization.user.entity';
import { JobStatusConstants } from './job.constants';

export class JobCompleteDto {

  @IsUUID()
  public lastModifiedById: string;
 
  public lastModifiedBy: string;
  public status: JobStatusConstants;
  public completedAt: Date

  constructor(principal: OrganizationUserEntity) {

    this.lastModifiedById = principal.id
    this.lastModifiedBy = principal.fullName || `${principal.firstname} ${principal.lastname}`
    this.completedAt = new Date()
    this.status = JobStatusConstants.COMPLETED

  }


}
