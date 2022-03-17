export const DISPLAY_MESSAGE = 'DISPLAY_MESSAGE';
export const RESET_MESSAGE = 'RESET_MESSAGE';

export function displayMessage(message: { body: string, type: string }) {
  return {
    type: DISPLAY_MESSAGE,
    ui: {
      hasError: true,
      placement: 'bottomRight',
    },
    message: {
      body: message.body,
      type: message.type,
    },
  }
}

export function resetMessage() {
  return {
    type: RESET_MESSAGE,
    ui: {
      hasError: false,
      placement: null,
    },
    message: {
      body: null,
      type: null,
    },
  }
}

export function goCardlessErrorMessage(error: any ) {
  let errorMsg: string = '';
  if (error.response) {
    // The request was made and the server responded with a
    // status code that falls out of the range of 2xx
    errorMsg = error.response.data.message;
  } else if (error.request) {
    // The request was made but no response was received, `error.request`
    // is an instance of XMLHttpRequest in the browser and an instance
    // of http.ClientRequest in Node.js
    errorMsg = error.request;
  } else {
    // Something happened in setting up the request that triggered an Error
    errorMsg = error.message;
  }
  return {
    type: DISPLAY_MESSAGE,
    ui: {
      hasError: true,
      placement: 'bottomRight',
    },    
    message: {
      body: errorMsg,
      type: 'error',
    },
  }
}

export const initialState = {
  ui: {
    hasError: false,
    placement: null,
  },
  message: {
    body: null,
    type: null,
  },
};


function reducer(state = initialState, action: any) {

  switch (action.type) {
    case DISPLAY_MESSAGE: {
      return {
        ui: {
          hasError: true,
          placement: action.placement,
        },
        message: {
          body: action.message.body,
          type: action.message.type,
        },
      }
    }
    case RESET_MESSAGE: {
      return {
        ...initialState,
      }
    }
    default:
      return state;
  }
}

export default reducer;

