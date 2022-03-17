import { parseUserRoles } from '../../../shared/utilities/parseUserRoles';
import {
  GET_USER_LIST_ERROR,
  GET_USER_LIST_REQUEST,
  GET_USER_LIST_SUCCESS,
  USER_LOGIN_CANCEL_REQUESTS,
  USER_LOGIN_ERROR,
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGOUT_ERROR,
  USER_LOGOUT_REQUEST,
  USER_LOGOUT_SUCCESS,
  UPDATE_USER_ROLES_AND_PERMISSIONS_SUCCESS,
  GENERATE_REGISTRATION_LINK_SUCCESS,
  GENERATE_REGISTRATION_LINK_ERROR,
  GENERATE_REGISTRATION_LINK_REQUEST,
  COMPLETE_REGISTRATION_REQUEST,
  COMPLETE_REGISTRATION_SUCCESS,
  COMPLETE_REGISTRATION_ERROR

} from './constants';

export const initialState = {
  isRequesting: false,
  user: null,
  list: [],
  roles: [],
  permissions: [],
  groups: [],
};

function userReducer(state = initialState, action: any) {
  switch (action.type) {
    case GET_USER_LIST_REQUEST: {
      return {
        ...state,
        isRequesting: true,
      }
    }
    case GET_USER_LIST_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        list: action.results,
      }
    }
    case GET_USER_LIST_ERROR: {
      return {
        ...state,
        isRequesting: false,
      }
    }
    case COMPLETE_REGISTRATION_REQUEST: {
      return {
        ...state,
        isRequesting: true,
      }
    }
    case GENERATE_REGISTRATION_LINK_REQUEST: {
      return {
        ...state,
        isRequesting: true,
      }
    }
    case USER_LOGIN_REQUEST: {
      return {
        ...state,
        isRequesting: true,
      }
    }
    case GENERATE_REGISTRATION_LINK_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
      }
    }
    case GENERATE_REGISTRATION_LINK_ERROR: {
      return {
        ...state,
        isRequesting: false,
      }
    }
    case COMPLETE_REGISTRATION_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
      }
    }
    case COMPLETE_REGISTRATION_ERROR: {
      return {
        ...state,
        isRequesting: false,
      }
    }
    
    case USER_LOGIN_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        user: action.results,
        roles: parseUserRoles(action.results).roles,
        permissions: parseUserRoles(action.results).permissions,
        groups: action.results.groups,
      }
    }

    case UPDATE_USER_ROLES_AND_PERMISSIONS_SUCCESS: {
      return {
        ...state,
        isRequesting: false,
        roles: parseUserRoles(action.results).roles,
        permissions: parseUserRoles(action.results).permissions,
        user: action.results
      }
    }

    case USER_LOGIN_ERROR: {
      return {
        ...initialState,
      }
    }

    case USER_LOGIN_CANCEL_REQUESTS: {
      return {
        ...initialState,
      }
    }

    case USER_LOGOUT_REQUEST: {
      return {
        ...initialState,
      }
    }
    case USER_LOGOUT_SUCCESS: {
      return {
        ...initialState,
      }
    }
    case USER_LOGOUT_ERROR: {
      return {
        ...initialState,
      }
    }

    default:
      return state;
  }
}

export default userReducer;

