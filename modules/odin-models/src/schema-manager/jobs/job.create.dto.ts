import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrganizationUserEntity } from '../../identity/organization/user/organization.user.entity';
import { JobStatusConstants, JobTypesConstants } from './job.constants';

export class JobCreateDto {

  @ApiProperty()
  @IsUUID()
  public organizationId: string | undefined;

  @ApiProperty()
  @IsUUID()
  public createdById: string;

  @ApiProperty()
  @IsUUID()
  public lastModifiedById: string;

  @ApiProperty()
  public lastModifiedBy: string

  @ApiProperty()
  public name: string

  @ApiProperty()
  public jobId: string;

  @ApiProperty()
  public payload: any;

  @ApiProperty()
  @IsEnum(JobStatusConstants)
  public status: JobStatusConstants;

  @ApiProperty()
  @IsEnum(JobTypesConstants)
  public type: JobTypesConstants;

  @ApiProperty()
  @IsOptional()
  public batchJobId?: string;

  constructor(
    principal: OrganizationUserEntity,
    name: string,
    jobId: string,
    payload: any,
    type: JobTypesConstants,
    batchJobId?: string,
  ) {

    this.organizationId = principal?.organization?.id
    this.name = name
    this.createdById = principal.id
    this.lastModifiedById = principal.id
    this.lastModifiedBy = principal.fullName || `${principal.firstname} ${principal.lastname}`
    this.jobId = jobId
    this.batchJobId = batchJobId
    this.payload = payload
    this.status = JobStatusConstants.CREATED
    this.type = type

  }

}
