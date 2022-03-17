import { call, put, takeLatest } from 'redux-saga/effects';
import { httpPost } from '../../../shared/http/requests';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import { IAmendOrderParams, IOrderCheckout } from './actions';
import { AMEND_ORDER_ERROR, AMEND_ORDER_REQUEST, AMEND_ORDER_SUCCESS, CANCEL_WORKORDER_REQUEST, ORDER_WORKFOLOW_CHECKOUT_ERROR, ORDER_WORKFOLOW_CHECKOUT_REQUEST, ORDER_WORKFOLOW_CHECKOUT_SUCCESS } from './constants';
import history from "../../../shared/utilities/browserHisory";
import { DISPLAY_MESSAGE } from '../../../shared/system/messages/store/reducers';

/**
 *
 * @param action
 */
 function* orderCheckout(action: { params: IOrderCheckout, cb: any }) {
  
  try {
    //@ts-ignore
    const res = yield call(async () => await httpPost(`OrderModule/v1.0/checkout`, action.params));

    yield put({
      type: ORDER_WORKFOLOW_CHECKOUT_SUCCESS, results: res.data.data,
    });
    action.cb(res.data.data);
    history.push(`/OrderModule/Order/${res.data.data.orderId}`)
  } catch (e: any) {
    action.cb(false);
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ORDER_WORKFOLOW_CHECKOUT_ERROR, error });
    if(e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

function* amendOrder(action: { params: IAmendOrderParams, cb?: (resp: any) => void}) {
  try {
    //@ts-ignore
    const res = yield call(async () => await httpPost(`OrderModule/v1.0/orders/${action.params.orderId}/amend`, action.params.body));

    yield put({ type: AMEND_ORDER_SUCCESS, results: res.data });

    if (action.cb) {
      yield call(action.cb, res.data);
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
    yield put({ type: AMEND_ORDER_ERROR, error });

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

function* cancelWorkOrder(action: { params: IAmendOrderParams, cb?: (resp: any) => void}) {
  try {
    //@ts-ignore
    const res = yield call(async () => await httpPost(`FieldServiceModule/v1.0/WorkOrder/${action.params.workOrderId}/cancel`, action.params.body));

    yield put({ type: DISPLAY_MESSAGE, message: { body: 'WorkOrder cancelled', type: 'success' } });

    if (action.cb) {
      yield call(action.cb, res.data);
    }

  } catch (e: any) {
    const error = e.response?.data ?? e;
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

function* rootSaga() {
  yield takeLatest<any>(ORDER_WORKFOLOW_CHECKOUT_REQUEST, orderCheckout);
  yield takeLatest<any>(AMEND_ORDER_REQUEST, amendOrder);
  yield takeLatest<any>(CANCEL_WORKORDER_REQUEST, cancelWorkOrder);
}

export default rootSaga;
