import { JobTypesConstants } from './job.constants';

export interface CreateJob {
  name: string,
  type: JobTypesConstants,
  payload: any,
  metadata?: any,
  batchJobId?: string,
}

export interface FailJob {
  error: any
}
