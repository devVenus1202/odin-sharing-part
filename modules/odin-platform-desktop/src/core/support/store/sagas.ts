import { all, call, put, takeLatest } from 'redux-saga/effects';
import { httpDelete, httpGet, httpPost, httpPut } from '../../../shared/http/requests';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import {
  IGetZdTickets,
  IGetZdComments,
  ICreateZdTicket,
  IUpdateZdTicket,
  ICreateZdComment
} from './actions';
import {
  GET_ZDTICKETS_REQUEST,
  GET_ZDTICKETS_SUCCESS,
  GET_ZDTICKETS_ERROR,
  CREATE_ZDTICKET_COMMENT_REQUEST,
  CREATE_ZDTICKET_COMMENT_SUCCESS,
  CREATE_ZDTICKET_COMMENT_ERROR,
  CREAT_ZDTICKET_REQUEST,
  CREAT_ZDTICKET_SUCCESS,
  CREAT_ZDTICKET_ERROR,
  GET_ZDTICKET_COMMENTS_REQUEST,
  GET_ZDTICKET_COMMENTS_SUCCESS,
  GET_ZDTICKET_COMMENTS_ERROR,
  UPDATE_ZDTICKET_REQUEST,
  UPDATE_ZDTICKET_SUCCESS,
  UPDATE_ZDTICKET_ERROR,
} from './constants';


/**
 *
 * @param params
 */
function* getZdTickets(action: { params: IGetZdTickets }): any {
  const { userId, externalId } = action.params;
  try {
    let apiUrl:string = '';
    if (userId){
      apiUrl = `CrmModule/v2.0/zendesk/users/requests?userId=${userId}`;
    } else if(externalId) {
      apiUrl = `CrmModule/v2.0/zendesk/tickets?externalId=${externalId}`;
    }
    const tickets = yield call(async () => await httpGet(apiUrl));
    tickets.data.data.sort((a:any, b:any) => a.updated_at > b.updated_at ? -1 : 1);
    yield put({
      type: GET_ZDTICKETS_SUCCESS, results: {
        data: tickets.data.data,
      },
    });

    return;

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_ZDTICKETS_ERROR, error });
  }
}

/**
 *
 * @param params
 */
function* createZdTicket(action: { params: ICreateZdTicket }): any {
  const { perspective } = action.params;
  try {
    let apiUrl = '';
    if (perspective === 'request') {
      apiUrl = `CrmModule/v2.0/zendesk/tickets/request`;
    } else {
      apiUrl = `CrmModule/v2.0/zendesk/tickets`;
    }
    const tickets = yield call(async () => await httpPost(apiUrl, {
      [perspective]: action.params
    }));

    yield put({
      type: CREAT_ZDTICKET_SUCCESS, results: {
        data: tickets.data.data,
      },
    });

    return;

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: CREAT_ZDTICKET_ERROR, error });
  }
}

/**
 *
 * @param params
 */
function* createComment(action: { params: ICreateZdComment }): any {
  const { body, authorId, ticketId, html_body } = action.params;
  try {
    const res = yield call(async () => await httpPut(`CrmModule/v2.0/zendesk/tickets/request/${ticketId}`, {
      request : {
        comment: {
          body,
          authorId,
          html_body
        }
      }
    }));

    yield put({
      type: CREATE_ZDTICKET_COMMENT_SUCCESS, results: {
        data: {body, author_id: authorId, html_body: html_body, created_at: new Date().toISOString()},
      },
    });

    return;

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: CREATE_ZDTICKET_COMMENT_ERROR, error });
  }
}

/**
 *
 * @param params
 */
 function* updateZdTicket(action: { params: IUpdateZdTicket, cb: any }): any {
  const { solved, ticketId } = action.params;
  try {
    const res = yield call(async () => await httpPut(`CrmModule/v2.0/zendesk/tickets/request/${ticketId}`, {
      request : {
        solved
      }
    }));
    action.cb(res.data.data);
    yield put({
      type: UPDATE_ZDTICKET_SUCCESS, results: {
        data: res.data.data,
      },
    });

    return;

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: UPDATE_ZDTICKET_ERROR, error });
  }
}


/**
 *
 * @param params
 */
function* getComments(action: { params: IGetZdComments }): any {
  const { ticketId, perspective } = action.params;
  try {
    const tickets = yield call(async () => await httpGet(`CrmModule/v2.0/zendesk/tickets/${perspective}/${ticketId}/comments`));
    tickets.data.data.sort((a:any, b:any) => a.created_at > b.created_at ? -1 : 1);
    yield put({
      type: GET_ZDTICKET_COMMENTS_SUCCESS, results: {
        data: tickets.data.data,
      },
    });

    return;

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_ZDTICKET_COMMENTS_ERROR, error });
  }
}

function* rootSaga() {
  yield takeLatest<any>(CREAT_ZDTICKET_REQUEST, createZdTicket);
  yield takeLatest<any>(UPDATE_ZDTICKET_REQUEST, updateZdTicket)
  yield takeLatest<any>(CREATE_ZDTICKET_COMMENT_REQUEST, createComment);
  yield takeLatest<any>(GET_ZDTICKETS_REQUEST, getZdTickets);
  yield takeLatest<any>(GET_ZDTICKET_COMMENTS_REQUEST, getComments);
}

export default rootSaga;
