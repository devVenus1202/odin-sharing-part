import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { WQueryParams } from '@d19n/models/dist/schema-manager/workflow/types/workflow.api.types';
import { 
  CLEAR_WORKFLOWS_SEARCH,
  GET_WORKFLOW_BY_ID_REQUEST,
  PROCESS_WORKFLOW_REQUEST,
  SEARCH_WORKFLOWS_BY_QUERY_REQUEST 
} from './constants';

export interface IProcessWorkflowParams {
  workflowId: string;
  recordIds?: string[];
  processInactive?: boolean;
  simulation?: boolean;
}

export function searchWorkflowsRequest(params?: WQueryParams, cb?: (resp: any) => void) {
  if (!params) {
    return {
      type: CLEAR_WORKFLOWS_SEARCH,
    };
  } else {
    return {
      type: SEARCH_WORKFLOWS_BY_QUERY_REQUEST,
      params,
      cb,
    };
  }
}

export function getWorkflowByIdRequest(params: { id: string }, cb?: (workflow: DbRecordEntityTransform) => void) {
  return {
    type: GET_WORKFLOW_BY_ID_REQUEST,
    params,
    cb,
  };
}

export function processWorkflowRequest(params: IProcessWorkflowParams, cb?: (resp: any) => void) {
  return {
    type: PROCESS_WORKFLOW_REQUEST,
    params,
    cb,
  }
}