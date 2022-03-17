import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import {
  ASSIGN_USERS_TO_GROUP_SUCCESS,
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
  MOVE_USERS_TO_GROUP_SUCCESS,
  MOVE_USERS_TO_GROUP_ERROR,
  ASSIGN_GROUPS_TO_USERS_REQUEST,
  ASSIGN_GROUPS_TO_USERS_SUCCESS,
  ASSIGN_GROUPS_TO_USERS_ERROR,
  SET_SELECTED_GROUP_USERS,
  UPDATE_BULK_USERS_GROUPS_REQUEST,
  UPDATE_BULK_USERS_GROUPS_SUCCESS,
  UPDATE_BULK_USERS_GROUPS_ERROR
} from './constants';


export interface IdentityGroupsReducer {
  isRequesting: boolean,
  isSuccessful: boolean,
  list: OrganizationUserGroupEntity[],
  groupsLinksList: OrganizationUserGroupEntity[],
  shortList: {
    [key: string]: OrganizationUserGroupEntity
  },
  assignModalVisible: boolean,
  selectedGroupUsers: string[]

}

export const initialState: IdentityGroupsReducer = {
  isRequesting: false,
  isSuccessful: false,
  list: [],
  groupsLinksList: [],
  shortList: {},
  assignModalVisible: false,
  selectedGroupUsers: []
};


function reducer(state = initialState, action: any) {
  switch (action.type) {

    // Get all groups
    case GET_GROUPS_DATA_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }
    case GET_GROUPS_DATA_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
        list: action.results.data,
      }
    }
    case GET_GROUPS_DATA_ERROR: {
      return {
        isRequesting: false,
        isSuccessful: false,
        list: [],
      }
    }

    case SET_ASSIGN_GROUPS_MODAL_VISIBLE: {
      return {
        ...state,
        assignModalVisible: action.visible,
      }
    }

    case SET_SELECTED_GROUP_USERS: {
      return {
        ...state,
        selectedGroupUsers: action.selectedUsers
      }
    }

    // Get a single group by id
    case GET_GROUP_BY_ID_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }
    case GET_GROUP_BY_ID_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
        shortList: Object.assign({}, state.shortList, { [action.results.id]: action.results }),
      }
    }
    case GET_GROUP_BY_ID_ERROR: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: false,
      }
    }

    // Get all groups links
    case GET_GROUPS_LINKS_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }
    case GET_GROUPS_LINKS_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
        groupsLinksList: action.results,
      }
    }
    case GET_GROUPS_LINKS_ERROR: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: false,
        groupsLinksList: [],
      }
    }

    case ASSIGN_USERS_TO_GROUP_SUCCESS: {
      return {
        ...state,
        shortList: Object.assign({}, state.shortList, { [action.results.id]: action.results }),
      }
    }

    case MOVE_USERS_TO_GROUP_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }

    case MOVE_USERS_TO_GROUP_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
      }
    }

    case MOVE_USERS_TO_GROUP_ERROR: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: false,
      }
    }

    case ASSIGN_GROUPS_TO_USERS_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }

    case ASSIGN_GROUPS_TO_USERS_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
      }
    }

    case ASSIGN_GROUPS_TO_USERS_ERROR: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: false,
      }
    }

    case UPDATE_BULK_USERS_GROUPS_REQUEST: {
      return {
        ...state,
        isRequesting: true,
        isSuccessful: false,
      }
    }

    case UPDATE_BULK_USERS_GROUPS_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: true,
      }
    }

    case UPDATE_BULK_USERS_GROUPS_ERROR: {
      return {
        ...state,
        isRequesting: false,
        isSuccessful: false,
      }
    }

    default:
      return state;
  }
}

export default reducer;

