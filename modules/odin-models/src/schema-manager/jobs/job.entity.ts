import { IsUUID } from 'class-validator';
import { Column, Entity, Index } from 'typeorm';
import { Base } from '../../Base';


@Entity({ name: 'jobs' })
@Index([ 'organizationId', 'jobId' ])
export class JobEntity extends Base {
  @Column({ type: 'uuid', nullable: false })
  @IsUUID('4')
  public organizationId: string;

  @Column({ type: 'uuid', nullable: false })
  @IsUUID('4')
  public createdById: string;

  @Column({ type: 'uuid', nullable: false })
  @IsUUID('4')
  public lastModifiedById: string;

  @Column({ type: 'varchar', nullable: true })
  public lastModifiedBy: string;

  @Column({ type: 'text', nullable: false })
  public jobId: string;

  @Column({ type: 'text', nullable: false })
  public batchJobId: string;

  @Column({ type: 'varchar', nullable: false })
  public hostname: string

  @Column({ type: 'varchar', nullable: false })
  public name: string

  @Column({ type: 'varchar', nullable: false })
  public type: string

  @Column({ type: 'varchar', nullable: false })
  public status: string

  @Column({ type: 'jsonb', nullable: false })
  public payload: any;

  @Column({ type: 'jsonb', nullable: true, default: null })
  public error: any;

  @Column({ type: 'jsonb', nullable: false })
  public metadata: any;

  @Column({ type: 'timestamp', nullable: true, default: null })
  public queuedAt: any;

  @Column({ type: 'timestamp', nullable: true, default: null })
  public completedAt: any;

}
