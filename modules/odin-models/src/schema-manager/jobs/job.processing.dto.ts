import { IsUUID } from 'class-validator';
import { OrganizationUserEntity } from '../../identity/organization/user/organization.user.entity';
import { JobStatusConstants } from './job.constants';

export class JobProcessingDto {

  @IsUUID()
  public lastModifiedById: string;

  public lastModifiedBy: string;
  public status: JobStatusConstants;
  public queuedAt: Date

  constructor(principal: OrganizationUserEntity) {

    this.lastModifiedById = principal.id
    this.lastModifiedBy = principal.fullName || `${principal.firstname} ${principal.lastname}`
    this.queuedAt = new Date()
    this.status = JobStatusConstants.PROCESSING

  }


}
