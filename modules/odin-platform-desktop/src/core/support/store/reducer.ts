import {
  CREAT_ZDTICKET_REQUEST,
  CREAT_ZDTICKET_SUCCESS,
  CREAT_ZDTICKET_ERROR,
  GET_ZDTICKETS_REQUEST,
  GET_ZDTICKETS_SUCCESS,
  GET_ZDTICKETS_ERROR,
  CREATE_ZDTICKET_COMMENT_REQUEST,
  CREATE_ZDTICKET_COMMENT_SUCCESS,
  CREATE_ZDTICKET_COMMENT_ERROR,
  GET_ZDTICKET_COMMENTS_REQUEST,
  GET_ZDTICKET_COMMENTS_SUCCESS,
  GET_ZDTICKET_COMMENTS_ERROR,
  UPDATE_ZDTICKET_REQUEST,
  UPDATE_ZDTICKET_ERROR,
  UPDATE_ZDTICKET_SUCCESS 
} from './constants';


export interface ISupportReducer {
  isRequesting: boolean,
  isCreating: boolean,
  isDeleting: boolean,
  isUpdating: boolean,
  isSearching: boolean,
  isCreatingComment: boolean;
  isRequestingComments: boolean;
  list: [],
  comments: []
  errors: [],
}


export const initialState: ISupportReducer = {
  isRequesting: false,
  isCreating: false,
  isDeleting: false,
  isUpdating: false,
  isSearching: false,
  isCreatingComment: false,
  isRequestingComments: false,
  list: [],
  errors: [],
  comments: []
};

function reducer(state = initialState, action: any) {
  switch (action.type) {
    // Get Zendesk Tickets
    case CREAT_ZDTICKET_REQUEST: {
      return {
        ...state,
        isCreating: true,
      }
    }
    case CREAT_ZDTICKET_SUCCESS: {
      return {
        ...state,
        list: [action.results.data, ...state.list],
        isCreating: false,
      }
    }
    case CREAT_ZDTICKET_ERROR: {
      return {
        ...initialState
      }
    }
    // Get Zendesk Tickets
    case GET_ZDTICKETS_REQUEST: {
      return {
        ...state,
        isRequesting: true,
      }
    }
    case GET_ZDTICKETS_SUCCESS: {
      return {
        ...state,
        list: action.results.data,
        isRequesting: false,
      }
    }
    case GET_ZDTICKETS_ERROR: {
      return {
        ...initialState
      }
    }

    // Get Zendesk Tickets
    case UPDATE_ZDTICKET_REQUEST: {
      return {
        ...state,
        isUpdating: true,
      }
    }
    case UPDATE_ZDTICKET_SUCCESS: {
      return {
        ...state,
        isUpdating: false,
      }
    }
    case UPDATE_ZDTICKET_ERROR: {
      return {
        ...state,
        isUpdating: false,
      }
    }

    // Create Comment for the Zendesk ticket
    case CREATE_ZDTICKET_COMMENT_REQUEST: {
      return {
        ...state,
        isCreatingComment: true,
      }
    }
    case CREATE_ZDTICKET_COMMENT_SUCCESS: {
      return {
        ...state,
        // comments: action.results.data,
        comments: [action.results.data, ...state.comments],
        isCreatingComment: false,
      }
    }
    case CREATE_ZDTICKET_COMMENT_ERROR: {
      return {
        ...state,
        isCreatingComment: false,
      }
    }

    // Create Comment for the Zendesk ticket
    case GET_ZDTICKET_COMMENTS_REQUEST: {
      return {
        ...state,
        isRequestingComments: true,
      }
    }
    case GET_ZDTICKET_COMMENTS_SUCCESS: {
      return {
        ...state,
        comments: action.results.data,
        isRequestingComments: false,
      }
    }
    case GET_ZDTICKET_COMMENTS_ERROR: {
      return {
        ...state
      }
    }
    default:
      return state;
  }
}

export default reducer;
