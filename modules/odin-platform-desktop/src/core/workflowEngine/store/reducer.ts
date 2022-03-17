import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { WQueryParams } from '@d19n/models/dist/schema-manager/workflow/types/workflow.api.types';
import dayjs, { Dayjs } from 'dayjs';
import { 
  CLEAR_WORKFLOWS_SEARCH,
  GET_WORKFLOW_BY_ID_ERROR,
  GET_WORKFLOW_BY_ID_REQUEST,
  GET_WORKFLOW_BY_ID_SUCCESS,
  PROCESS_WORKFLOW_ERROR,
  PROCESS_WORKFLOW_REQUEST,
  PROCESS_WORKFLOW_SUCCESS,
  SEARCH_WORKFLOWS_BY_QUERY_ERROR, 
  SEARCH_WORKFLOWS_BY_QUERY_REQUEST, 
  SEARCH_WORKFLOWS_BY_QUERY_SUCCESS 
} from './constants';

export interface IWorkflowEngineReducer {
  isSearching: boolean;

  searchWorkflowsQuery?: WQueryParams;
  searchWorkflowsList: DbRecordEntityTransform[];

  workflowsShortList: { [key: string]: DbRecordEntityTransform };

  processingStates: { 
    [key: string]: {
      isProcessing: boolean;
      lastRunStartAt: Dayjs;
      lastRunFinishAt: Dayjs;
      recordIds: string[];
      results: any;
      error: any;
    }
  };
}

export const initialState: IWorkflowEngineReducer = {
  isSearching: false,

  searchWorkflowsList: [],

  workflowsShortList: {},

  processingStates: {},
}

function reducer(state = initialState, action: any): IWorkflowEngineReducer {
  
  const buildNewShortList = (results: any) => {
    const newShortList: { [key: string]: DbRecordEntityTransform } = {};
    if (Array.isArray(results.data)) {
      for (const wf of results.data) {
        newShortList[wf.id] = wf;
      }
    }
    return newShortList;
  };

  switch (action.type) {

    // search workflows
    case SEARCH_WORKFLOWS_BY_QUERY_REQUEST:
      return {
        ...state,
        isSearching: true,
        searchWorkflowsQuery: action.params,
        searchWorkflowsList: [],
      };

    case CLEAR_WORKFLOWS_SEARCH:
      return {
        ...state,
        isSearching: false,
        searchWorkflowsQuery: undefined,
        searchWorkflowsList: [],
      };

    case SEARCH_WORKFLOWS_BY_QUERY_SUCCESS:
      return {
        ...state,
        isSearching: false,
        searchWorkflowsList: action.results.data,
        workflowsShortList: {
          ...state.workflowsShortList,
          ...buildNewShortList(action.results),
        },
      };

    case SEARCH_WORKFLOWS_BY_QUERY_ERROR:
      return {
        ...state,
        isSearching: false,
        searchWorkflowsQuery: undefined,
      };


    // get workflow by id
    case GET_WORKFLOW_BY_ID_REQUEST:
      return {
        ...state,
        isSearching: true,
      };

    case GET_WORKFLOW_BY_ID_SUCCESS:
      return {
        ...state,
        isSearching: false,
        workflowsShortList: {
          ...state.workflowsShortList,
          ...buildNewShortList(action.results),
        },
      };

    case GET_WORKFLOW_BY_ID_ERROR:
      return {
        ...state,
        isSearching: false,
      }


    // process workflow
    case PROCESS_WORKFLOW_REQUEST:
      return {
        ...state,
        processingStates: {
          ...state.processingStates,
          [action.params.workflowId]: {
            isProcessing: true,
            lastRunStartAt: dayjs(),
            recordIds: action.params.recordIds,
            results: undefined,
          },
        },
      };

    case PROCESS_WORKFLOW_SUCCESS:
      return {
        ...state,
        processingStates: {
          ...state.processingStates,
          [action.params.workflowId]: {
            ...state.processingStates[action.params.workflowId],
            isProcessing: false,
            lastRunFinishAt: dayjs(),
            results: action.results.data,
          },
        },
      };

    case PROCESS_WORKFLOW_ERROR:
      return {
        ...state,
        processingStates: {
          ...state.processingStates,
          [action.params.workflowId]: {
            ...state.processingStates[action.params.workflowId],
            isProcessing: false,
            lastRunFinishAt: dayjs(),
            error: action.error,
          },
        },
      };

    default:
      return state;
  }
}

export default reducer;