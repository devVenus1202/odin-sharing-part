import {
  ASSIGN_GROUP_TO_GROUP_REQUEST,
  ASSIGN_USERS_TO_GROUP_REQUEST,
  CREATE_GROUP_REQUEST,
  DELETE_GROUP_LINK_REQUEST,
  DELETE_GROUP_REQUEST,
  GET_GROUP_BY_ID_REQUEST,
  GET_GROUPS_DATA_REQUEST,
  GET_GROUPS_LINKS_REQUEST,
  SET_ASSIGN_GROUPS_MODAL_VISIBLE,
  MOVE_USERS_TO_GROUP_REQUEST,
  SET_SELECTED_GROUP_USERS,
  ASSIGN_GROUPS_TO_USERS_REQUEST,
  UPDATE_BULK_USERS_GROUPS_REQUEST
} from './constants';

export interface DeleteGroup {
  groupId: string
}

export interface CreateNewGroup {
  body: {
    name: string,
    description: string
  }
}

export interface AssignUsersToGroup {
  id: string,
  userIds: string[]
}

export interface AssignGroupToGroup {
  groupId: string,
  groupIds: string[]
}

export interface MoveUsersToGroup {
  sourceGroupId: string,
  groupIds: string[]
  userIds: string[]
}

export interface AssignGroupsToUsers {
  groupIds: string[]
  userIds: string[]
}

export interface BulkUpdateUsersGroups {
  userIds: string[]
  addGroups: string[]
  removeGroups: string[]
  overrideGroups: string[]
}

export function getGroupsDataRequest() {
  return {
    type: GET_GROUPS_DATA_REQUEST,
  };
}

export function setAssignGroupsModalVisible(visible: boolean) {
  return {
    type: SET_ASSIGN_GROUPS_MODAL_VISIBLE,
    visible,
  }
}

export function setSelectedGroupUsers(selectedUsers: string[]) {
  return {
    type: SET_SELECTED_GROUP_USERS,
    selectedUsers
  }
}
export function getGroupByIdRequest(params: any, cb = () => {
}) {
  return {
    type: GET_GROUP_BY_ID_REQUEST,
    params,
    cb,
  }
}

export function deleteGroupRequest(params: DeleteGroup, cb = () => {
}) {
  return {
    type: DELETE_GROUP_REQUEST,
    params,
    cb,
  }
}

export function createGroupRequest(params: CreateNewGroup, cb = () => {
}) {
  return {
    type: CREATE_GROUP_REQUEST,
    params,
    cb,
  }
}

export function assignUsersToGroupRequest(params: AssignUsersToGroup) {
  return {
    type: ASSIGN_USERS_TO_GROUP_REQUEST,
    params,
  }
}


// Groups Links

export function getGroupsLinksRequest(params: any, cb = () => {
}) {
  return {
    type: GET_GROUPS_LINKS_REQUEST,
    params,
    cb,
  }
}

export function assignGroupToGroupsRequest(params: AssignGroupToGroup) {
  return {
    type: ASSIGN_GROUP_TO_GROUP_REQUEST,
    params,
  }
}


export function unassignGroupLinkRequest(params: any) {
  return {
    type: DELETE_GROUP_LINK_REQUEST,
    params,
  }
}


export function moveUsersToGroupRequest(params: any, cb = () => {}) {
  return {
    type: MOVE_USERS_TO_GROUP_REQUEST,
    params,
    cb
  }
}

export function assignGroupsToUsersRequest(params: any, cb = () => {}) {
  return {
    type: ASSIGN_GROUPS_TO_USERS_REQUEST,
    params,
    cb
  }
}

export function bulkUpdateUsersRequest(params: any, cb = () => {}) {
  return {
    type: UPDATE_BULK_USERS_GROUPS_REQUEST,
    params,
    cb
  }
}