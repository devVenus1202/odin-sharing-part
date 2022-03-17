import { call, debounce, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { httpDelete, httpGet, httpPost, httpPut } from '../../../shared/http/requests';
import { DISPLAY_MESSAGE } from '../../../shared/system/messages/store/reducers';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import { splitModuleAndEntityName } from '../../../shared/utilities/recordHelpers';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import {
  IBulkUpdateRecords,
  ICreateRecords,
  IDeleteRecordById,
  IGetRecordById,
  IMergeDbRecords,
  ISearchRecords,
  IUpdateRecordById,
} from './actions';
import {
  BULK_UPDATE_DB_RECORDS_ERROR,
  BULK_UPDATE_DB_RECORDS_REQUEST,
  BULK_UPDATE_DB_RECORDS_SUCCESS,
  CREATE_DB_RECORD_ERROR,
  CREATE_DB_RECORD_REQUEST,
  CREATE_DB_RECORD_SUCCESS,
  DELETE_DB_RECORD_BY_ID_ERROR,
  DELETE_DB_RECORD_BY_ID_REQUEST,
  DELETE_DB_RECORD_BY_ID_SUCCESS,
  GET_DB_RECORD_BY_ID_ERROR,
  GET_DB_RECORD_BY_ID_REQUEST,
  GET_DB_RECORD_BY_ID_SUCCESS,
  MERGE_DB_RECORD_ERROR,
  MERGE_DB_RECORD_REQUEST,
  MERGE_DB_RECORD_SUCCESS,
  RESTORE_DB_RECORD_BY_ID_ERROR,
  RESTORE_DB_RECORD_BY_ID_REQUEST,
  RESTORE_DB_RECORD_BY_ID_SUCCESS,
  SEARCH_DB_RECORD_ERROR,
  SEARCH_DB_RECORD_REQUEST,
  SEARCH_DB_RECORD_SUCCESS,
  UPDATE_DB_RECORD_BY_ID_ERROR,
  UPDATE_DB_RECORD_BY_ID_REQUEST,
  UPDATE_DB_RECORD_BY_ID_SUCCESS,
} from './constants';


/**
 *
 * @param action
 */
function* searchRecords(action: { params: ISearchRecords, cb: any }) {
  try {

    const { listKey, schema, searchQuery } = action.params;
    const { terms, schemas, fields, sort, pageable, boolean } = searchQuery;

    const pageNum = !!pageable && !!pageable.page ? Number(pageable.page) - 1 : 0;
    const sizeNum = !!pageable && !!pageable.size ? Number(pageable.size) : 25;
    const queryParams = `terms=${terms || ''}&boolean=${boolean ? JSON.stringify(boolean) : ''}&fields=${fields || ''}&schemas=${schemas}&page=${pageNum}&size=${sizeNum}&sort=${sort ? JSON.stringify(
      sort) : ''}`;

    const path = `${schema ? schema.moduleName : 'SchemaModule'}/v1.0/db/${schema ? schema.entityName : 'ALL'}/search?${queryParams}`;

    const res = yield call(async () => await httpGet(path));

    yield put({ type: SEARCH_DB_RECORD_SUCCESS, schema, listKey, results: res.data });

    if (action.cb) {
      yield call(action.cb, res);
    }

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: SEARCH_DB_RECORD_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

/**
 *
 * @param action
 */
function* createRecord(action: { params: ICreateRecords; cb: any; }) {
  try {

    const { schema, createUpdate } = action.params;

    const postPath = `${schema.moduleName}/v1.0/db/batch`;

    const createRes = yield call(async () => await httpPost(postPath, createUpdate));

    yield put({ type: DISPLAY_MESSAGE, message: { body: 'record created', type: 'success' } });

    // match the records created with the schema for the primary record created (if multiple records are
    const record = createRes.data.data.find((elem: any) => splitModuleAndEntityName(elem.entity).entityName === schema.entityName);

    // get the latest record
    let getPath = schema && schema.getUrl ? schema.getUrl.replace('{entityName}', schema.entityName) : '';
    getPath = getPath.replace('{recordId}', record.id);

    // ODN-1883 load record.links
    getPath = getPath + '?withLinks=true';

    const getRes = yield call(async () => await httpGet(getPath));

    yield put({ type: CREATE_DB_RECORD_SUCCESS, results: getRes.data.data });

    if (action.cb) {
      yield call(action.cb, record);
    }

  } catch (e) {

    const error = e.response ? e.response.data : undefined;

    if (!!error && error.statusCode === 409) {
      yield call(action.cb, error);
      if (error.data.entity === 'ServiceModule:CustomerDeviceOnt') {
        const { schema } = action.params;
        // get the latest record
        let getPath = schema && schema.getUrl ? schema.getUrl.replace('{entityName}', schema.entityName) : '';
        getPath = getPath.replace('{recordId}', error.data.id);

        const getRes = yield call(async () => await httpGet(getPath));

        yield put({ type: CREATE_DB_RECORD_SUCCESS, results: getRes.data.data });
      }
    } else {
      yield call(action.cb, undefined);
      yield put({ type: CREATE_DB_RECORD_ERROR, error });
    }

    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }

  }
}


/**
 *
 * @param action
 */
function* getRecordById(action: { params: IGetRecordById, cb: any }) {
  try {
    const { schema, recordId } = action.params;

    let path = schema && schema.getUrl ? schema.getUrl.replace('{entityName}', schema.entityName) : '';
    path = path.replace('{recordId}', recordId);

    // ODN-1883 load record.links
    path = path + '?withLinks=true';

    const res = yield call(async () => await httpGet(path));

    yield put({ type: GET_DB_RECORD_BY_ID_SUCCESS, results: res.data.data });
    // yield put({ type: GET_DB_RECORD_AUDIT_LOGS_REQUEST, params: { schema, recordId } });
    if (action.cb) {
      yield call(action.cb, res.data.data);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_DB_RECORD_BY_ID_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

/**
 * ODN-1706 Bulk update records
 *
 * @param action
 */
function* bulkUpdateRecords(action: { params: IBulkUpdateRecords, cb: any }) {
  try {

    const { schema, searchQuery, createUpdate, recordIds } = action.params;
    const queryParams: string[] = [];

    if (recordIds && recordIds?.length > 0) {
      recordIds.forEach(rId => queryParams.push(`recordIds[]=${rId}`));

    } else if (searchQuery) {
      const { schemas, terms, fields, boolean, sort, pageable } = searchQuery;

      const pageNum = !!pageable && !!pageable.page ? Number(pageable.page) - 1 : 0;
      const sizeNum = !!pageable && !!pageable.size ? Number(pageable.size) : 25;

      queryParams.push(`terms=${terms || ''}`);
      queryParams.push(`boolean=${boolean ? JSON.stringify(boolean) : ''}`);
      queryParams.push(`fields=${fields || ''}`);
      queryParams.push(`schemas=${schemas}`);
      queryParams.push(`page=${pageNum}`);
      queryParams.push(`size=${sizeNum}`);
      queryParams.push(`sort=${sort ? JSON.stringify(sort) : ''}`);
    }

    const path = `${schema ? schema.moduleName : 'SchemaModule'}/v1.0/db/${schema ? schema.entityName : 'ALL'}/bulk-update?${queryParams.join(
      '&')}`;

    //@ts-ignore
    const res = yield call(async () => await httpPost(path, createUpdate));
    yield put({ type: DISPLAY_MESSAGE, message: { body: 'bulk update performed', type: 'success' } });
    yield put({ type: BULK_UPDATE_DB_RECORDS_SUCCESS, schema, results: res.data });

    if (action.cb) {
      yield call(action.cb, { results: res.data });
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
    yield put({ type: BULK_UPDATE_DB_RECORDS_ERROR, error });

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

/**
 *
 * @param action
 */
function* updateRecordById(action: { params: IUpdateRecordById; cb: any }) {
  try {
    const { schema, recordId, createUpdate } = action.params;

    let path = schema && schema.putUrl ? schema.putUrl.replace('{entityName}', schema.entityName) : '';
    path = path.replace('{recordId}', recordId);

    const res = yield call(async () => await httpPut(path, createUpdate));

    // get the latest record
    let getPath = schema && schema.getUrl ? schema.getUrl.replace('{entityName}', schema.entityName) : '';
    getPath = getPath.replace('{recordId}', res.data.data.id);

    // ODN-1883 load record.links
    getPath = getPath + '?withLinks=true';

    const getRes = yield call(async () => await httpGet(getPath));

    yield put({ type: DISPLAY_MESSAGE, message: { body: 'record updated', type: 'success' } });
    yield put({ type: UPDATE_DB_RECORD_BY_ID_SUCCESS, results: getRes.data.data });
    if (action.cb) {
      yield call(action.cb, getRes.data.data);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: UPDATE_DB_RECORD_BY_ID_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

/**
 *
 * @param action
 */
function* deleteRecordById(action: { params: IDeleteRecordById; cb: any }) {
  try {
    const { schema, recordId } = action.params;

    let path = schema && schema.deleteUrl ? schema.deleteUrl.replace('{entityName}', schema.entityName) : '';
    path = path.replace('{recordId}', recordId);
    path = path + '?queue=true'

    const res = yield call(async () => await httpDelete(path));
    yield put({ type: DISPLAY_MESSAGE, message: { body: 'record deleted', type: 'success' } });
    yield put({ type: DELETE_DB_RECORD_BY_ID_SUCCESS, results: res });
    if (action.cb) {
      yield call(action.cb, res);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: DELETE_DB_RECORD_BY_ID_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

/**
 *
 * @param action
 */
function* restoreRecordById(action: { params: IDeleteRecordById; cb: any }) {
  try {
    const { recordId } = action.params;

    const path = `SchemaModule/v1.0/db/restore/${recordId}?queue=true`;

    const res = yield call(async () => await httpPost(path, undefined));
    yield put({ type: DISPLAY_MESSAGE, message: { body: 'record restored', type: 'success' } });
    yield put({ type: RESTORE_DB_RECORD_BY_ID_SUCCESS, results: res });
    if (action.cb) {
      yield call(action.cb, res);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: RESTORE_DB_RECORD_BY_ID_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

/**
 *
 * @param action
 */
function* mergeDbRecords(action: { params: IMergeDbRecords; cb: any }) {
  try {
    const { schema, masterRecordId, mergeRecordId, associations, properties } = action.params;

    let path = `${schema.moduleName}/v1.0/db/merge`;

    const res = yield call(async () => await httpPost(
      path,
      { masterRecordId, mergeRecordId, associations, properties },
    ));
    yield put({ type: DISPLAY_MESSAGE, message: { body: 'records merged', type: 'success' } });
    yield put({ type: MERGE_DB_RECORD_SUCCESS, results: res.data.data });

    if (action.cb) {
      yield call(action.cb, res.data.data);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: MERGE_DB_RECORD_ERROR, error });
    if (!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

function* rootSaga() {
  yield debounce<any>(2000, SEARCH_DB_RECORD_REQUEST, searchRecords);
  yield takeLatest<any>(CREATE_DB_RECORD_REQUEST, createRecord);
  yield takeEvery<any>(GET_DB_RECORD_BY_ID_REQUEST, getRecordById);
  yield takeLatest<any>(BULK_UPDATE_DB_RECORDS_REQUEST, bulkUpdateRecords);
  yield takeLatest<any>(UPDATE_DB_RECORD_BY_ID_REQUEST, updateRecordById);
  yield takeLatest<any>(DELETE_DB_RECORD_BY_ID_REQUEST, deleteRecordById);
  yield takeLatest<any>(RESTORE_DB_RECORD_BY_ID_REQUEST, restoreRecordById);
  yield takeLatest<any>(MERGE_DB_RECORD_REQUEST, mergeDbRecords);
}

export default rootSaga;
