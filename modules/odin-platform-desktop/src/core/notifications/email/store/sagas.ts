import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { httpPost } from '../../../../shared/http/requests';
import { DISPLAY_MESSAGE } from '../../../../shared/system/messages/store/reducers';
import { ERROR_NOTIFICATION } from '../../../../shared/system/notifications/store/reducers';
import { USER_LOGOUT_REQUEST } from '../../../identity/store/constants';
import { SendgridEmailEntity } from './actions';
import {
  GET_EMAIL_DATA_ERROR,
  GET_EMAIL_DATA_REQUEST,
  GET_EMAIL_DATA_SUCCESS,
  PREVIEW_EMAIL_ERROR,
  PREVIEW_EMAIL_REQUEST,
  PREVIEW_EMAIL_SUCCESS,
  SEND_CONFIRMATION_EMAIL_ERROR,
  SEND_CONFIRMATION_EMAIL_REQUEST,
  SEND_CONFIRMATION_EMAIL_SUCCESS,
} from './constants';


function* sendConfirmationEmail(action: { path: string, body: SendgridEmailEntity }) {
  const { path, body } = action;
  try {
    //@ts-ignore
    const res = yield call(async () => await httpPost(`${path}`, body));
    yield put({ type: DISPLAY_MESSAGE, message: { body: 'confirmation email sent', type: 'success' } });
    yield put({ type: SEND_CONFIRMATION_EMAIL_SUCCESS, results: res.data });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: SEND_CONFIRMATION_EMAIL_ERROR, error });
    if(e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

/**
 * ODN-866 Requests email data
 * 
 * @param action 
 */
function* getEmailData(action: { path: string, body: SendgridEmailEntity, cb: any}) {
  const { path, body } = action;
  try {
    //@ts-ignore
    const res = yield call(async () => await httpPost(`${path}`, body));
    yield put({ type: GET_EMAIL_DATA_SUCCESS, results: res.data });
    if (action.cb) {
      yield call(action.cb, { results: res.data });
    }
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_EMAIL_DATA_ERROR, error });
    if(e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
    if (action.cb) {
      yield call(action.cb, undefined);
    }
  }
}

/**
 * ODN-866 Requests email preview
 * 
 * @param action 
 */
function* previewEmail(action: { body: SendgridEmailEntity, cb: any }) {
  try {
    const path = `${SchemaModuleTypeEnums.NOTIFICATION_MODULE}/v1.0/sendgrid/dynamic_template/?preview=true`;

    //@ts-ignore
    const res = yield call(async () => await httpPost(`${path}`, action.body));

    yield put({ type: DISPLAY_MESSAGE, message: { body: 'email preview generated', type: 'success' } });
    yield put({ type: PREVIEW_EMAIL_SUCCESS, results: res.data });

    if (action.cb) {
      yield call(action.cb, { results: res.data });
    }

  } catch (e) {
    const error = e.response ? e.response?.data : undefined;
    yield put({ type: PREVIEW_EMAIL_ERROR, error });
    if(e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
    if (action.cb) {
      yield call(action.cb, undefined);
    }
  }
}

function* rootSaga() {
  yield takeLatest<any>(SEND_CONFIRMATION_EMAIL_REQUEST, sendConfirmationEmail);
  yield takeEvery<any>(GET_EMAIL_DATA_REQUEST, getEmailData);
  yield takeLatest<any>(PREVIEW_EMAIL_REQUEST, previewEmail);
}

export default rootSaga;
