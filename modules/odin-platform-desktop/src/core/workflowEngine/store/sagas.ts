import { WQueryParams } from '@d19n/models/dist/schema-manager/workflow/types/workflow.api.types';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { httpGet, httpPost } from '../../../shared/http/requests';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import { IProcessWorkflowParams } from './actions';
import { 
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

function* searchWorkflows(action: { params: WQueryParams, cb?: (resp: any) => void }) {
  try {

    //@ts-ignore
    const res = yield call(async () => await httpGet('SchemaModule/v1.0/workflows', action.params));

    yield put({ type: SEARCH_WORKFLOWS_BY_QUERY_SUCCESS, results: res.data });

    if (action.cb) {
      yield call(action.cb, res);
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
    yield put({ type: SEARCH_WORKFLOWS_BY_QUERY_ERROR, error });

    if (action.cb) {
      yield call(action.cb, undefined);
    }
    
    if (error?.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else if (error?.statusCode !== 404) {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

function* getWorkflowById(action: { params: { id: string }, cb?: (resp: any) => void }) {
  try {

    const workflowIds = action.params?.id ? [action.params?.id] : [];

    //@ts-ignore
    const res = yield call(async () => await httpGet('SchemaModule/v1.0/workflows', { workflowIds }));

    yield put({ type: GET_WORKFLOW_BY_ID_SUCCESS, results: res.data });

    if (action.cb) {
      yield call(action.cb, res.data?.data?.length > 0 ? res.data.data[0] : undefined);
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
    yield put({ type: GET_WORKFLOW_BY_ID_ERROR, error });

    if (action.cb) {
      yield call(action.cb, undefined);
    }
    
    if (error?.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else if (error?.statusCode !== 404) {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

function* processWorkflow(action: { params: IProcessWorkflowParams, cb?: (resp: any) => void }) {
  try {

    //@ts-ignore
    const res = yield call(async () => await httpPost(
      `SchemaModule/v1.0/workflows/${action.params.workflowId}/process`,
      undefined,
      {
        recordIds: action.params.recordIds,
        inactive: action.params.processInactive,
        simulation: action.params.simulation,
      }
    ));

    yield put({ type: PROCESS_WORKFLOW_SUCCESS, params: { workflowId: action.params.workflowId }, results: res.data });

    if (action.cb) {
      yield call(action.cb, res);
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
    yield put({ type: PROCESS_WORKFLOW_ERROR, params: { workflowId: action.params.workflowId }, error });

    if (action.cb) {
      yield call(action.cb, undefined);
    }
    
    if (error?.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

function* rootSaga() {
  yield takeLatest<any>(SEARCH_WORKFLOWS_BY_QUERY_REQUEST, searchWorkflows);
  yield takeEvery<any>(GET_WORKFLOW_BY_ID_REQUEST, getWorkflowById);
  yield takeEvery<any>(PROCESS_WORKFLOW_REQUEST, processWorkflow);
}

export default rootSaga;