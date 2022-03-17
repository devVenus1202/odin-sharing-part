import { call, put, takeLatest } from 'redux-saga/effects';
import { httpDelete, httpGet, httpPost } from '../../../shared/http/requests';
import { DISPLAY_MESSAGE } from '../../../shared/system/messages/store/reducers';
import { ERROR_NOTIFICATION } from '../../../shared/system/notifications/store/reducers';
import history from '../../../shared/utilities/browserHisory';
import { USER_LOGOUT_REQUEST } from '../../identity/store/constants';
import { SET_ASSIGN_USER_MODAL_VISIBLE, SET_MOVE_USERS_MODAL_VISIBLE } from '../../identityUser/store/constants';
import { AssignGroupToGroup, AssignUsersToGroup, CreateNewGroup, DeleteGroup, MoveUsersToGroup, AssignGroupsToUsers, BulkUpdateUsersGroups } from './actions';
import {
  ASSIGN_GROUP_TO_GROUP_REQUEST,
  ASSIGN_USERS_TO_GROUP_ERROR,
  ASSIGN_USERS_TO_GROUP_REQUEST,
  ASSIGN_USERS_TO_GROUP_SUCCESS,
  CREATE_GROUP_ERROR,
  CREATE_GROUP_REQUEST,
  CREATE_GROUP_SUCCESS,
  DELETE_GROUP_ERROR,
  DELETE_GROUP_LINK_REQUEST,
  DELETE_GROUP_REQUEST,
  DELETE_GROUP_SUCCESS,
  GET_GROUP_BY_ID_ERROR,
  GET_GROUP_BY_ID_REQUEST,
  GET_GROUP_BY_ID_SUCCESS,
  GET_GROUPS_DATA_ERROR,
  GET_GROUPS_DATA_REQUEST,
  GET_GROUPS_DATA_SUCCESS,
  GET_GROUPS_LINKS_ERROR,
  GET_GROUPS_LINKS_REQUEST,
  GET_GROUPS_LINKS_SUCCESS,
  SET_ASSIGN_GROUPS_MODAL_VISIBLE,
  MOVE_USERS_TO_GROUP_REQUEST,
  ASSIGN_GROUPS_TO_USERS_REQUEST,
  UPDATE_BULK_USERS_GROUPS_ERROR,
  UPDATE_BULK_USERS_GROUPS_REQUEST
} from './constants';

// @ts-ignore
function* getGroups() {
  try {
    const res = yield call(async () => await httpGet('IdentityModule/v1.0/rbac/groups'));
    yield put({ type: GET_GROUPS_DATA_SUCCESS, results: res.data });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_GROUPS_DATA_ERROR, error });
    if (e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}


// @ts-ignore
function* getGroupById(params: any) {
  try {
    const res = yield call(
      async () => await httpGet(`IdentityModule/v1.0/rbac/groups/${params.params.groupId}`),
    );
    yield put({
      type: GET_GROUP_BY_ID_SUCCESS,
      results: res.data.data,
    });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_GROUP_BY_ID_ERROR, error });
    if (e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

// @ts-ignore
function* deleteGroup(action: { type: any, take: any, params: DeleteGroup, cb: any }) {
  try {
    yield call(async () => await httpDelete(`IdentityModule/v1.0/rbac/groups/${action.params.groupId}`));
    yield history.goBack();
    yield put({ type: DELETE_GROUP_SUCCESS, results: action.params.groupId });
    yield put({
      type: DISPLAY_MESSAGE,
      message: { body: 'successfully deleted group', type: 'success' },
    });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: DELETE_GROUP_ERROR, error });
    if (e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

//@ts-ignore
function* createGroup(action: { type: any, take: any, params: CreateNewGroup, cb: any }) {

  try {
    const url = `IdentityModule/v1.0/rbac/groups`;
    const { body } = action.params;
    let res = yield call(async () => await httpPost(url, body));
    yield put({ type: CREATE_GROUP_SUCCESS, results: res.data.data });
    history.push(`/IdentityManagerModule/Groups/${res.data.data.id}`);
    if (action.cb) {
      yield call(action.cb, { data: res.data.data })
    }
    yield put({
      type: DISPLAY_MESSAGE,
      message: { body: 'successfully created group', type: 'success' },
    });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: CREATE_GROUP_ERROR, error });
    if (e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

// @ts-ignore
function* assignUsersToGroup(action: { type: any, take: any, params: AssignUsersToGroup, cb: any }) {
  try {
    const res = yield call(async () => await httpPost(
      `IdentityModule/v1.0/rbac/groups/${action.params.id}/users`,
      { userIds: action.params.userIds },
    ));
    yield put({ type: ASSIGN_USERS_TO_GROUP_SUCCESS, results: res.data.data });
    yield put({ type: SET_ASSIGN_USER_MODAL_VISIBLE, visible: false });
    yield put({
      type: DISPLAY_MESSAGE,
      message: { body: `users successfully linked to group`, type: 'success' },
    });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ASSIGN_USERS_TO_GROUP_ERROR, error });
    if (e.response.data.statusCode === 401) {
      yield put({ type: USER_LOGOUT_REQUEST, error });
    } else {
      yield put({ type: ERROR_NOTIFICATION, error });
    }
  }
}

function* getGroupsLinks(action: { type: any, take: any, params: any, cb: any }) {
  if (action.params === undefined) {
    return;
  }
  try {
    const res = yield call(async () => await httpGet(`IdentityModule/v1.0/rbac/groups/${action.params.groupId}/links`));

    yield put({ type: GET_GROUPS_LINKS_SUCCESS, results: res.data.data });

    yield call(action.cb, { results: res.data.data });


  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: GET_GROUPS_LINKS_ERROR, error });
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}

function* unassignGroup(action: any) {
  if (action.params === undefined) {
    return;
  }
  try {
    yield call(async () => await httpDelete(`IdentityModule/v1.0/rbac/groups/${action.params.groupId}/links/${action.params.groupToLinkId}`));
    const res = yield call(async () => await httpGet(`IdentityModule/v1.0/rbac/groups/${action.params.groupId}/links`));
    yield put({ type: GET_GROUPS_LINKS_SUCCESS, results: res.data.data });
    yield put({
      type: DISPLAY_MESSAGE,
      message: { body: 'link successfully deleted', type: 'success' },
    });

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}


function* assignGroupToGroup(action: { type: any, take: any, params: AssignGroupToGroup, cb: any }) {
  if (action.params === undefined) {
    return;
  }
  try {
    yield call(async () => await httpPost(
      `IdentityModule/v1.0/rbac/groups/${action.params.groupId}/links`,
      { groupIds: action.params.groupIds },
    ));
    const res = yield call(async () => await httpGet(`IdentityModule/v1.0/rbac/groups/${action.params.groupId}/links`));
    yield put({ type: GET_GROUPS_LINKS_SUCCESS, results: res.data.data });
    yield put({ type: SET_ASSIGN_GROUPS_MODAL_VISIBLE, visible: false });
    yield put({
      type: DISPLAY_MESSAGE,
      message: { body: 'group successfully linked', type: 'success' },
    });

  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}

function* moveUsersToGroup(action: { type:any, take:any, params: MoveUsersToGroup, cb: any}) {
  try {
    yield call(async () => await httpPost(
      `IdentityModule/v1.0/rbac/groups/${action.params.sourceGroupId}/move-users`,
      { groupIds: action.params.groupIds, userIds: action.params.userIds },
    ));
    const res = yield call(async () => await httpGet(`IdentityModule/v1.0/rbac/groups/${action.params.sourceGroupId}/links`));
    yield put({ type: GET_GROUPS_LINKS_SUCCESS, results: res.data.data });
    yield put({ type: SET_MOVE_USERS_MODAL_VISIBLE, visible: false });
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}

function* assignGroupsToUsers(action: { type:any, take:any, params: AssignGroupsToUsers, cb: any}) {
  try {
    yield call(async () => await httpPost(
      `IdentityModule/v1.0/rbac/groups/assign-users`,
      { groupIds: action.params.groupIds, userIds: action.params.userIds },
    ));
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}

function* bulkUpdateUsers(action: {type:any, take:any, params: BulkUpdateUsersGroups, cb:any}) {
  try {
    yield call(async () => await httpPost(
      `IdentityModule/v1.0/rbac/groups/update-bulk-users`,
      { 
        userIds: action.params.userIds, 
        overrideGroups: action.params.overrideGroups,
        addGroups: action.params.addGroups,
        removeGroups: action.params.removeGroups
      },
    ));
  } catch (e) {
    const error = e.response ? e.response.data : undefined;
    yield put({ type: ERROR_NOTIFICATION, error });
  }
}

function* rootSaga() {
  yield takeLatest(GET_GROUPS_DATA_REQUEST, getGroups);
  yield takeLatest(GET_GROUP_BY_ID_REQUEST, getGroupById);
  yield takeLatest(DELETE_GROUP_REQUEST, deleteGroup);
  yield takeLatest(CREATE_GROUP_REQUEST, createGroup);
  yield takeLatest(ASSIGN_USERS_TO_GROUP_REQUEST, assignUsersToGroup);
  yield takeLatest(GET_GROUPS_LINKS_REQUEST, getGroupsLinks);
  yield takeLatest(ASSIGN_GROUP_TO_GROUP_REQUEST, assignGroupToGroup);
  yield takeLatest(DELETE_GROUP_LINK_REQUEST, unassignGroup);
  yield takeLatest(MOVE_USERS_TO_GROUP_REQUEST, moveUsersToGroup)
  yield takeLatest(ASSIGN_GROUPS_TO_USERS_REQUEST, assignGroupsToUsers)
  yield takeLatest(UPDATE_BULK_USERS_GROUPS_REQUEST, bulkUpdateUsers)
}

export default rootSaga;
