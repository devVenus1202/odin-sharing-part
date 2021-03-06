import { ExceptionType } from '@d19n/common/dist/exceptions/types/ExceptionType';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SearchPageType } from '@d19n/models/dist/search/search.page.type';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { updateObject } from '../../../shared/utilities/reducerHelpers';
import {
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_ERROR,
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_REQUEST,
  EXPORT_DB_RECORD_ASSOCIATION_RECORDS_SUCCESS,
} from '../../recordsAssociations/store/constants';
import {
  ADD_RECORD_TO_SHORT_LIST,
  BULK_UPDATE_DB_RECORDS_ERROR,
  BULK_UPDATE_DB_RECORDS_REQUEST,
  BULK_UPDATE_DB_RECORDS_SUCCESS,
  CREATE_DB_RECORD_ERROR,
  CREATE_DB_RECORD_REQUEST,
  CREATE_DB_RECORD_SUCCESS,
  DELETE_DB_RECORD_BY_ID_ERROR,
  DELETE_DB_RECORD_BY_ID_REQUEST,
  DELETE_DB_RECORD_BY_ID_SUCCESS,
  GET_DB_RECORD_BY_ID_ERROR,
  GET_DB_RECORD_BY_ID_REQUEST,
  GET_DB_RECORD_BY_ID_SUCCESS,
  MERGE_DB_RECORD_ERROR,
  MERGE_DB_RECORD_REQUEST,
  MERGE_DB_RECORD_SUCCESS,
  RESET_DB_RECORDS_LIST,
  RESET_DB_RECORDS_SEARCH_QUERY,
  RESTORE_DB_RECORD_BY_ID_ERROR,
  RESTORE_DB_RECORD_BY_ID_REQUEST,
  RESTORE_DB_RECORD_BY_ID_SUCCESS,
  SEARCH_DB_RECORD_ERROR,
  SEARCH_DB_RECORD_REQUEST,
  SEARCH_DB_RECORD_SUCCESS,
  SET_DB_RECORD_SEARCH_QUERY,
  SET_DB_RECORD_STATE,
  TOGGLE_SEARCH_VISIBILITY,
  UPDATE_DB_RECORD_BY_ID_ERROR,
  UPDATE_DB_RECORD_BY_ID_REQUEST,
  UPDATE_DB_RECORD_BY_ID_SUCCESS,
} from './constants';

export interface IRecordReducer {
  isSearching?: boolean;
  isRequesting?: boolean;
  isLookingUp: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isRestoring: boolean;
  isMergeSuccess: boolean;
  isExportingAssociations?: boolean;
  showPreview: boolean;
  previewDisableDelete?: boolean;
  previewDisableClone?: boolean;
  previewDisableEdit?: boolean;
  currentRecordId: string;
  search?: any;
  searchQuery: {
    [key: string]: SearchQueryType;
  };
  list: { [schemaId: string]: DbRecordEntityTransform[] };
  shortList: { [recordId: string]: DbRecordEntityTransform };
  pageable?: SearchPageType | null;
  isSearchVisible: boolean;
  buildCompleteVisibility: boolean;
  errors?: ExceptionType[];
}

export const initialState: IRecordReducer = {
  isLookingUp: false,
  isRequesting: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isRestoring: false,
  showPreview: false,
  isMergeSuccess: false,
  currentRecordId: '',
  searchQuery: {},
  list: {},
  shortList: {},
  search: null,
  pageable: null,
  isSearchVisible: false,
  buildCompleteVisibility: false,
  errors: [],
};

function reducer(state = initialState, action: any) {
  switch (action.type) {
    case SET_DB_RECORD_SEARCH_QUERY: {
      return {
        ...state,
        isSearching: false,
        resetAllQueries: false,
        searchQuery: {
          ...state.searchQuery,
          [action.params.schema.id]: updateObject(
            state.searchQuery[action.params.schema.id],
            action.params.searchQuery,
          ),
        },
      };
    }

    case SEARCH_DB_RECORD_REQUEST: {
      return {
        ...state,
        isSearching: true,
        resetAllQueries: false,
        searchQuery: {
          ...state.searchQuery,
          [action.params.schema.id]: updateObject(
            state.searchQuery[action.params.schema.id],
            action.params.searchQuery,
          ),
        },
      };
    }

    case SEARCH_DB_RECORD_SUCCESS: {
      return {
        ...state,
        search: action.results.search,
        pageable: action.results.pageable,
        list: {
          ...state.list,
          [action.listKey || action.schema.id]: action.results.data,
        },
        isSearching: false,
        resetAllQueries: false,
      };
    }

    case SEARCH_DB_RECORD_ERROR: {
      return {
        ...initialState,
      };
    }

    // Get record
    case GET_DB_RECORD_BY_ID_REQUEST: {
      return {
        ...state,
        format: action.format,
        isRequesting: true,
      };
    }
    case GET_DB_RECORD_BY_ID_SUCCESS: {
      return {
        ...state,
        shortList: { ...state.shortList, [action.results.id]: action.results },
        isRequesting: false,
      };
    }
    case GET_DB_RECORD_BY_ID_ERROR: {
      return {
        ...state,
        isRequesting: false,
      };
    }

    // ODN-1706 bulk update records
    case BULK_UPDATE_DB_RECORDS_REQUEST: {
      return {
        ...state,
        isUpdating: true,
      };
    }
    case BULK_UPDATE_DB_RECORDS_SUCCESS: {
      return {
        ...state,
        isUpdating: false,
        errors: [],
      };
    }
    case BULK_UPDATE_DB_RECORDS_ERROR: {
      return {
        ...state,
        isUpdating: false,
        errors: [ action.error ],
      };
    }

    // Update record
    case UPDATE_DB_RECORD_BY_ID_REQUEST: {
      return {
        ...state,
        isUpdating: true,
      };
    }
    case UPDATE_DB_RECORD_BY_ID_SUCCESS: {
      return {
        ...state,
        shortList: { ...state.shortList, [action.results.id]: action.results },
        isUpdating: false,
        errors: [],
      };
    }
    case UPDATE_DB_RECORD_BY_ID_ERROR: {
      return {
        ...state,
        isUpdating: false,
        errors: action.errors,
      };
    }

    // create & fail if exists
    case CREATE_DB_RECORD_REQUEST: {
      return {
        ...state,
        ...action.params,
        isCreating: true,
      };
    }
    case CREATE_DB_RECORD_SUCCESS: {
      return {
        ...state,
        shortList: { ...state.shortList, [action.results.id]: action.results },
        isCreating: false,
        errors: [],
      };
    }
    case CREATE_DB_RECORD_ERROR: {
      return {
        ...state,
        isCreating: false,
        errors: action.errors,
      };
    }

    // Merge records
    case MERGE_DB_RECORD_REQUEST: {
      return {
        ...state,
        isMergeSuccess: false,
        isRequesting: true,
      };
    }

    case MERGE_DB_RECORD_SUCCESS: {
      return {
        ...state,
        isMergeSuccess: true,
        isRequesting: false,
      };
    }

    case MERGE_DB_RECORD_ERROR: {
      return {
        ...state,
        isMergeSuccess: false,
        isRequesting: false,
      };
    }

    // Delete records
    case DELETE_DB_RECORD_BY_ID_REQUEST: {
      return {
        ...state,
        isDeleting: true,
      };
    }
    case DELETE_DB_RECORD_BY_ID_SUCCESS: {
      return {
        ...state,
        isDeleting: false,
      };
    }
    case DELETE_DB_RECORD_BY_ID_ERROR: {
      return {
        ...state,
        isDeleting: false,
        errors: action.errors,
      };
    }

    // Delete records
    case RESTORE_DB_RECORD_BY_ID_REQUEST: {
      return {
        ...state,
        isRestoring: true,
      };
    }
    case RESTORE_DB_RECORD_BY_ID_SUCCESS: {
      return {
        ...state,
        isRestoring: false,
      };
    }
    case RESTORE_DB_RECORD_BY_ID_ERROR: {
      return {
        ...state,
        isRestoring: false,
        errors: action.errors,
      };
    }


    case RESET_DB_RECORDS_LIST: {
      return {
        ...state,
        list: {},
        searchQuery: {},
        errors: [],
        isSearching: false,
        search: null,
        pageable: null,
      };
    }

    case ADD_RECORD_TO_SHORT_LIST: {
      return {
        ...state,
        showPreview: action.params.showPreview,
        previewDisableDelete: action.params.previewDisableDelete,
        previewDisableClone: action.params.previewDisableClone,
        previewDisableEdit: action.params.previewDisableEdit,
        currentRecordId: action.params.record?.id,
        shortList: action.params.record
          ? {
            ...state.shortList,
            [action.params.record.id]: action.params.record,
          }
          : { ...state.shortList },
      };
    }

    case SET_DB_RECORD_STATE: {
      return {
        ...state,
        ...action.params,
      };
    }

    case TOGGLE_SEARCH_VISIBILITY: {
      return {
        ...state,
        isSearching: false,
        isSearchVisible: !state.isSearchVisible,
      };
    }

    case RESET_DB_RECORDS_SEARCH_QUERY: {
      const newSearchQuery = state.searchQuery;
      delete newSearchQuery[action.params.schemaId];

      return {
        ...state,
        isSearching: false,
        resetAllQueries: true,
        searchQuery: newSearchQuery,
      };
    }

    case EXPORT_DB_RECORD_ASSOCIATION_RECORDS_REQUEST: {
      return {
        ...state,
        isExportingAssociations: true,
      };
    }
    case EXPORT_DB_RECORD_ASSOCIATION_RECORDS_SUCCESS:
    case EXPORT_DB_RECORD_ASSOCIATION_RECORDS_ERROR: {
      return {
        ...state,
        isExportingAssociations: false,
      };
    }

    default:
      return state;
  }
}

export default reducer;
