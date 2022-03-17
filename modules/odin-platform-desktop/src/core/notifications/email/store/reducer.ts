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
} from "./constants";

export const initialState = {
  isRequesting: false,
  path: null,
};

function reducer(state = initialState, action: any) {
  switch (action.type) {

    case SEND_CONFIRMATION_EMAIL_REQUEST:
      return {
        ...state,
        isRequesting: true,
        path: action.path,
      };
    case SEND_CONFIRMATION_EMAIL_SUCCESS:
      return {
        ...state,
        isRequesting: false,
      };
    case SEND_CONFIRMATION_EMAIL_ERROR:
      return {
        ...state,
        isRequesting: false,
      };
    /// ODN-866 request email data
    case GET_EMAIL_DATA_REQUEST:
      return {
        ...state,
        isRequesting: true,
      };
    case GET_EMAIL_DATA_SUCCESS:
      return {
        ...state,
        isRequesting: false,
      };
    case GET_EMAIL_DATA_ERROR:
      return {
        ...state,
        isRequesting: false,
      };
    // ODN-866 request email preview
    case PREVIEW_EMAIL_REQUEST:
      return {
        ...state,
        isRequesting: true,
      };
    case PREVIEW_EMAIL_SUCCESS:
      return {
        ...state,
        isRequesting: false,
      };
    case PREVIEW_EMAIL_ERROR:
      return {
        ...state,
        isRequesting: false,
      };
    default:
      return state;
  }
}

export default reducer;
