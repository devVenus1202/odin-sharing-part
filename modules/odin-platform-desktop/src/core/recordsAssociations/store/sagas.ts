import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { call, debounce, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { httpDelete, httpGet, httpPost, httpPut } from '../../../shared/http/requests';
import { DISPLAY_MESSAGE } from '../../../shared/system/messages/store/reducers';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import {
  ICreateOrUpdateRecordAssociation,
  IDeleteRecordAssociation,
  IExportAssociationRecords,
  IGetRecordAssociationById,
  IGetRecordAssociations,
  IGetRecordAssociationWithNestedEntites,
  ISearchRecordAssociations,
  IUpdateRelatedRecordAssociation,
} from './actions';
import {
  DB_RECORD_ASSOCIATIONS_CREATE_ERROR,
  DB_RECORD_ASSOCIATIONS_CREATE_REQUEST,
  DB_RECORD_ASSOCIATIONS_CREATE_SUCCESS,
  DB_RECORD_ASSOCIATIONS_UPDATE_ERROR,
  DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST,
  DB_RECORD_ASSOCIATIONS_UPDATE_SUCCESS,
  DELETE_DB_RECORD_ASSOCIATION_BY_ID_ERROR,
  DELETE_DB_RECORD_ASSOCIATION_BY_ID_REQUEST,
  DELETE_DB_RECORD_ASSOCIATION_BY_ID_SUCCESS,
  DELETE_DB_RECORD_ASSOCIATION_BY_MODULE_AND_ID_REQUEST,
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_ERROR,
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_REQUEST,
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_SUCCESS,
  GET_DB_RECORD_ASSOCIATION_BY_ID_ERROR,
  GET_DB_RECORD_ASSOCIATION_BY_ID_REQUEST,
  GET_DB_RECORD_ASSOCIATION_BY_ID_SUCCESS,
  GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_ERROR,
  GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_REQUEST,
  GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_SUCCESS,
  GET_DB_RECORD_ASSOCIATIONS_ERROR,
  GET_DB_RECORD_ASSOCIATIONS_REQUEST,
  GET_DB_RECORD_ASSOCIATIONS_SUCCESS,
  SEARCH_DB_RECORD_ASSOCIATIONS_ERROR,
  SEARCH_DB_RECORD_ASSOCIATIONS_REQUEST,
  SEARCH_DB_RECORD_ASSOCIATIONS_SUCCESS,
} from './constants';


/**
 *
 * @param action
 */
function* searchRecords(action: { params: ISearchRecordAssociations, cb: any; }) {
  const { recordId, schema, schemaAssociation, searchQuery } = action.params;
  const { terms, schemas, sort, pageable } = searchQuery;

  const pageNum = !!pageable && !!pageable.page ? Number(pageable.page) - 1 : 0;
  const sizeNum = !!pageable && !!pageable.size ? Number(pageable.size) : 50;

  let path = `${schema.moduleName}/v1.0/db/${schema.entityName}/search?`;
  path = path + `terms=${terms || '*'}`;
  path = path + `&schemas=${schemas}`;
  path = path + `&page=${pageNum}`;
  path = path + `&size=${sizeNum}`;
  if(!!schemaAssociation.findInSchema) {
    path = path + `&findInSchema=${schemaAssociation.findInSchema}`;
  }
  if(!!schemaAssociation.findInChildSchema) {
    path = path + `&findInChildSchema=${schemaAssociation.findInChildSchema}`;
  }
  if(recordId) {
    path = path + `&recordId=${recordId}`;
  }
  path = path + `&sort=${JSON.stringify(sort)}`;

  try {
    //@ts-ignore
    const res = yield call(async () => await httpGet(`${path}`));
    yield put({ type: SEARCH_DB_RECORD_ASSOCIATIONS_SUCCESS, results: res.data });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: SEARCH_DB_RECORD_ASSOCIATIONS_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* updateOrCreateRecordAssociations(action: { params: ICreateOrUpdateRecordAssociation, cb: any; }) {
  const { recordId, schema, schemaAssociation, createUpdate } = action.params;
  try {

    if(schemaAssociation && schemaAssociation.postUrl) {

      let path = schemaAssociation.postUrl.replace('{recordId}', recordId);
      path = path.replace('{entityName}', schema.entityName);

      //@ts-ignore
      const res = yield call(async () => await httpPost(`${path}`, createUpdate));

      yield put({
        type: DB_RECORD_ASSOCIATIONS_CREATE_SUCCESS,
        results: res.data.data,
      });

      yield put({ type: DISPLAY_MESSAGE, message: { body: 'record association created', type: 'success' } });

      if(action.cb) {
        yield call(action.cb, { result: res.data.data });
      }
    }
  } catch (e) {
    if(action.cb) {
      yield call(action.cb, false);
    }
    const error = e.response ? e.response.data : undefined;
    yield put({ type: DB_RECORD_ASSOCIATIONS_CREATE_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* updateRecordAssociationById(action: { params: IUpdateRelatedRecordAssociation, cb: any; }) {
  const { dbRecordAssociationId, recordId, schema, createUpdate } = action.params;
  try {

    const path = `${schema.moduleName}/v1.0/db-associations/${dbRecordAssociationId}/${recordId}`;

    console.log('path', path);

    //@ts-ignore
    const res = yield call(async () => await httpPut(`${path}`, createUpdate));

    yield put({
      type: DB_RECORD_ASSOCIATIONS_UPDATE_SUCCESS,
      results: res.data.data,
    });

    yield put({ type: DISPLAY_MESSAGE, message: { body: 'record association updated', type: 'success' } });

    if(action.cb) {
      yield call(action.cb, true);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: DB_RECORD_ASSOCIATIONS_UPDATE_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* getRecordAssociationById(action: { params: IGetRecordAssociationById, cb: any; }) {
  const { dbRecordAssociationId, recordId, schema } = action.params;
  try {

    const path = `${schema.moduleName}/v1.0/db-associations/${dbRecordAssociationId}/${recordId}?withLinks=true`;

    //@ts-ignore
    const res = yield call(async () => await httpGet(`${path}`));

    yield put({
      type: GET_DB_RECORD_ASSOCIATION_BY_ID_SUCCESS,
      results: res.data.data,
    });

    if(action.cb) {
      yield call(action.cb, true);
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_DB_RECORD_ASSOCIATION_BY_ID_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* getRecordAssociationsRequest(action: { params: IGetRecordAssociations, cb: any }) {
  const { recordId, schema, entities, key, filters } = action.params;

  try {

    // return no data if the schema does not have any associations
    if(schema.associations && schema.associations.length < 1) {
      yield put({
        type: GET_DB_RECORD_ASSOCIATIONS_SUCCESS,
        recordId,
        results: [],
        key,
      });

      if(action.cb) {
        yield call(action.cb, { results: [] });
      }
    } else {

      let path = `${schema.moduleName}/v1.0/db-associations/${schema.entityName}/${recordId}/relations`;
      //@ts-ignore
      const res = yield call(async () => await httpGet(path, {
        entities,
        filters,
      }));

      yield put({
        type: GET_DB_RECORD_ASSOCIATIONS_SUCCESS,
        recordId,
        results: res.data.data,
        key,
      });

      if(action.cb) {
        yield call(action.cb, { results: res.data.data });
      }
    }
  } catch (e) {
    console.error(e)
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_DB_RECORD_ASSOCIATIONS_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

function* getRecordAssociationWithNestedEntitiesRequest(action: { params: IGetRecordAssociationWithNestedEntites, cb: any }) {
  const { recordId, schema, entity, nestedEntities, filters, key } = action.params;

  try {
    const path = `${schema.moduleName}/v1.0/db-associations/${schema.entityName}/${recordId}/one-relation`;
    //const path = `SchemaModule/v1.0/db-associations/${schema.entityName}/${recordId}/one-relation`;
    //@ts-ignore
    const res = yield call(async () => await httpGet(path, {
      entity,
      filters,
      nestedEntities,
    }));

    yield put({
      type: GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_SUCCESS,
      recordId,
      results: res.data,
      key,
    });

    if(action.cb) {
      yield call(action.cb, { results: res.data });
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}


function* exportAssociationRecordsRequest(action: { params: IExportAssociationRecords, cb: any }) {
  const { recordId, schema, entity, userFields, nestedEntities, filters } = action.params;

  try {
    const path = `${schema.moduleName}/v1.0/db-associations/${schema.entityName}/${recordId}/one-relation`;
    //const path = `SchemaModule/v1.0/db-associations/${schema.entityName}/${recordId}/one-relation`;
    //@ts-ignore
    const res = yield call(async () => await httpGet(path, {
      entity,
      filters,
      nestedEntities,
      file: true,
      user_fields: userFields,
    }));

    yield put({
      type: EXPORT_DB_RECORD_ASSOCIATION_RECORDS_SUCCESS,
      recordId,
      results: res.data,
    });

    if(action.cb) {
      yield call(action.cb, { results: res.data });
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: EXPORT_DB_RECORD_ASSOCIATION_RECORDS_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* deleteAssociationById(action: { params: IDeleteRecordAssociation, cb: any }) {
  const { schema, schemaAssociation, dbRecordAssociationId } = action.params;
  try {

    if(schemaAssociation && schemaAssociation.deleteUrl) {
      let path = schemaAssociation.deleteUrl.replace('{entityName}', schema.entityName);
      path = path.replace('{dbRecordAssociationId}', dbRecordAssociationId);

      //@ts-ignore
      const res = yield call(async () => await httpDelete(path));
      if(!!res) {
        yield put({ type: DISPLAY_MESSAGE, message: { body: 'successfully deleted association', type: 'success' } });
        yield put({ type: DELETE_DB_RECORD_ASSOCIATION_BY_ID_SUCCESS, results: res.data });
        if(action.cb) {
          yield call(action.cb, true);
        }
      } else {
        yield put({ type: DELETE_DB_RECORD_ASSOCIATION_BY_ID_ERROR, error: 'no response from the server' });
      }
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: DELETE_DB_RECORD_ASSOCIATION_BY_ID_ERROR, error });
    if(!!error && e.response.data.statusCode === 401) {
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
function* deleteRecordAssociationByModuleAndId(action: { params: DbRecordEntityTransform, cb: any }) {
  const { entity, dbRecordAssociation } = action.params;
  try {

    if(dbRecordAssociation) {
      const moduleName = entity.split(':')[0]
      const path = `${moduleName}/v1.0/db-associations/${dbRecordAssociation.id}`;

      //@ts-ignore
      const res = yield call(async () => await httpDelete(path));
      if(!!res) {
        if(action.cb) {
          yield call(action.cb, true);
        }
      } else {
        if(action.cb) {
          yield call(action.cb, false);
        }
      }
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    if(action.cb) {
      yield call(action.cb, false);
    }
    if(!!error && e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error: !!error ? error : e });
    }
  }
}

function* rootSaga() {
  yield debounce<any>(1500, SEARCH_DB_RECORD_ASSOCIATIONS_REQUEST, searchRecords);
  yield takeEvery<any>(GET_DB_RECORD_ASSOCIATIONS_REQUEST, getRecordAssociationsRequest);
  yield takeEvery<any>(
    GET_DB_RECORD_ASSOCIATION_WITH_NESTED_ENTITIES_REQUEST,
    getRecordAssociationWithNestedEntitiesRequest,
  );
  yield takeLatest<any>(EXPORT_DB_RECORD_ASSOCIATION_RECORDS_REQUEST, exportAssociationRecordsRequest);
  yield takeLatest<any>(DELETE_DB_RECORD_ASSOCIATION_BY_ID_REQUEST, deleteAssociationById);
  yield takeLatest<any>(GET_DB_RECORD_ASSOCIATION_BY_ID_REQUEST, getRecordAssociationById);
  yield takeLatest<any>(DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST, updateRecordAssociationById);
  yield takeLatest<any>(DB_RECORD_ASSOCIATIONS_CREATE_REQUEST, updateOrCreateRecordAssociations);
  yield takeLatest<any>(DELETE_DB_RECORD_ASSOCIATION_BY_MODULE_AND_ID_REQUEST, deleteRecordAssociationByModuleAndId)
}

export default rootSaga;
