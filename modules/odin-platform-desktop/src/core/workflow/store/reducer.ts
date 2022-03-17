import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import {
  CREATE_ORDER_FROM_LEAD_DRAWER_VISIBILE,
  CREATE_ORDER_MODAL_VISIBILE,
  UPDATE_ORDER_WORKFLOW,
  CREATE_ACCOUNT_MODAL_VISIBILE,
  CREATE_ADDRESS_MODAL_VISIBILE,
  INITIALIZE_SWAP_ADDRESS_MODAL,
  UPDATE_ADDRESS_WORKFLOW_OBJECT,
  UPDATE_CONTACT_IDENTITY_WORKFLOW_OBJECT,
  CREATE_ORDER_FROM_ACCOUNT_DRAWER_VISIBILE,
  UPDATE_NETWORK_MANAGE_WORKFLOW_OBJECT,
  UPDATE_LEAD_WORKFLOW_OBJECT,
  ORDER_AMEND_WORKFLOW,
  AMEND_ORDER_REQUEST,
  AMEND_ORDER_SUCCESS,
  AMEND_ORDER_ERROR,
} from './constants';
import { updateObject } from '../../../shared/utilities/reducerHelpers';

const { ORDER, ADDRESS, ACCOUNT, CONTACT_IDENTITY, LEAD } = SchemaModuleEntityTypeEnums;

export interface WorkflowReducer {
  [ORDER]: {
    isCreateOrderVisible: boolean,
    selectedProductItems: any,
    selectedBaseProductItems: any,
    isCreateOrderFromLeadVisible: boolean,
    selectedOfferId?: string,
    isCreateOrderFromAccountVisible?: boolean
  },
  AmendOrder: {
    orderId: string,
    isAmendOrderVisible: boolean,
    isRequesting: boolean,
  },
  [ADDRESS]: {
    isCreateAddressVisible: boolean,
    isSwapAddressVisible: boolean,
    addressRecord: DbRecordEntityTransform | undefined,
    associatedRecords: any
  },
  [ACCOUNT]: {
    isCreateAccountVisible: boolean
  },
  [CONTACT_IDENTITY]: {
    isUpdateMandateModalVisible: boolean,
    records: DbRecordEntityTransform[],
    contactRecord: DbRecordEntityTransform | undefined
  },
  [LEAD]: {
    isCreateLeadFromAddressVisible: boolean,
    relatedRecord: DbRecordEntityTransform | undefined
  },
  NetworkManage: {
    networkManageDrawerVisible: boolean,
    record: DbRecordEntityTransform | undefined,
    phoneRecord?: DbRecordEntityTransform | undefined
  }
}

const amendOrderInitialState = {
  orderId: undefined as any,
  isAmendOrderVisible: false,
  isRequesting: false,
};

export const initialState: WorkflowReducer = {
  [ORDER]: {
    isCreateOrderVisible: false,
    selectedProductItems: [],
    selectedBaseProductItems: [],
    isCreateOrderFromLeadVisible: false,
    isCreateOrderFromAccountVisible: false
  },
  AmendOrder: amendOrderInitialState,
  [ACCOUNT]: {
    isCreateAccountVisible: false
  },
  [ADDRESS]: {
    isCreateAddressVisible: false,
    isSwapAddressVisible: false,
    addressRecord: undefined,
    associatedRecords: []
  },
  [CONTACT_IDENTITY]: {
    isUpdateMandateModalVisible: false,
    records: [],
    contactRecord: undefined
  },
  [LEAD]: {
    isCreateLeadFromAddressVisible: false,
    relatedRecord: undefined
  },
  NetworkManage: {
    networkManageDrawerVisible: false,
    record: undefined,
    phoneRecord: undefined
  }
};

function reducer(state = initialState, action: any) {
  switch (action.type) {

    case CREATE_ORDER_MODAL_VISIBILE: {
      return {
        ...state,
        [ORDER]: {
          ...state[ORDER],
          isCreateOrderVisible: !state[ORDER].isCreateOrderVisible
        }
      }
    }

    case CREATE_ORDER_FROM_LEAD_DRAWER_VISIBILE: {
      return {
        ...state,
        [ORDER]: {
          ...state[ORDER],
          isCreateOrderFromLeadVisible: !state[ORDER]?.isCreateOrderFromLeadVisible
        }
      }
    }

    case CREATE_ORDER_FROM_ACCOUNT_DRAWER_VISIBILE : {
      return {
        ...state,
        [ORDER]: {
          ...state[ORDER],
          isCreateOrderFromAccountVisible: !state[ORDER].isCreateOrderFromAccountVisible
        }
      }
    }

    case UPDATE_ORDER_WORKFLOW: {
      return {
        [ORDER]: {
          ...state[ORDER],
          ...action.params
        }
      }
    }

    case ORDER_AMEND_WORKFLOW: {
      const amendOrderState = action.params.init ? amendOrderInitialState : state.AmendOrder;
      return {
        ...state,
        AmendOrder: {
          ...amendOrderState,
          ...action.params,
        }
      }
    }

    case AMEND_ORDER_REQUEST: 
      return {
        ...state,
        AmendOrder: {
          ...state.AmendOrder,
          isRequesting: true,
        }
      }

    case AMEND_ORDER_SUCCESS: 
      return {
        ...state,
        AmendOrder: {
          ...state.AmendOrder,
          isRequesting: false,
        }
      }

    case AMEND_ORDER_ERROR: 
      return {
        ...state,
        AmendOrder: {
          ...state.AmendOrder,
          isRequesting: false,
        }
      }

    case CREATE_ACCOUNT_MODAL_VISIBILE: {
      return {
        ...state,
        [ACCOUNT]: {
          ...state[ACCOUNT],
          isCreateAccountVisible: !state[ACCOUNT].isCreateAccountVisible
        }
      }
    }

    case CREATE_ADDRESS_MODAL_VISIBILE: {
      return {
        ...state,
        [ADDRESS]: {
          ...state[ADDRESS],
          isCreateAddressVisible: !state[ADDRESS].isCreateAddressVisible
        }
      }
    }

    case INITIALIZE_SWAP_ADDRESS_MODAL: {
      return {
        ...state,
        [ADDRESS]: {
          ...state[ADDRESS],
          isSwapAddressVisible: action.params.isSwapAddressVisible,
          addressRecord: action.params.addressRecord
        }
      }
    }

    case UPDATE_ADDRESS_WORKFLOW_OBJECT: {
      return {
        ...state,
        [ADDRESS]: updateObject(
            state[ADDRESS],
            action.params
          )
      }
    }

    case UPDATE_CONTACT_IDENTITY_WORKFLOW_OBJECT: {
      return {
        ...state,
        [CONTACT_IDENTITY]: updateObject(
            state[CONTACT_IDENTITY],
            action.params
          )
      }
    }

    case UPDATE_NETWORK_MANAGE_WORKFLOW_OBJECT: {
      return {
        NetworkManage: {
          ...state.NetworkManage,
          ...action.params
        }
      }
    }

    case UPDATE_LEAD_WORKFLOW_OBJECT: {
      return {
        ...state,
        [LEAD]: updateObject(
            state[LEAD],
            action.params
          )
      }
    }

    default:
      return state;
  }
}

export default reducer;

