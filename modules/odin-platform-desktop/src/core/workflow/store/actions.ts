import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import {
  CREATE_ORDER_FROM_LEAD_DRAWER_VISIBILE,
  CREATE_ORDER_MODAL_VISIBILE,
  ORDER_WORKFOLOW_CHECKOUT_REQUEST,
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
  CANCEL_WORKORDER_REQUEST,
} from './constants';

export interface product {
  recordId: string | undefined 
}

export interface IOrderCheckout {
  addressId: string | undefined,
  contactId: string | undefined,
  products: product[],
  discountCode?: string,
  offerId?: string,
}

export interface IOrderAmendWorkflowParams {
  init?: boolean;
  orderId?: string;
  isAmendOrderVisible?: boolean;
}

export interface IAmendOrderParams {
  orderId: string;
  body: {
    keepItemsIds: string[];
    amendProducts: {
      itemId: string;
      amendmentType: 'UPGRADE' | 'DOWNGRADE';
      product: DbRecordAssociationCreateUpdateDto;
    }[];
  }
}

export interface IInitializeSwapAddress {
  isSwapAddressVisible: boolean,
  addressRecord?: DbRecordEntityTransform
}

export interface IConatctIdentityWorkflow {
  isUpdateMandateModalVisible: boolean,
  records?: DbRecordEntityTransform[],
  contactRecord?: DbRecordEntityTransform
}

export interface INetworkManageWorkflow {
  networkManageDrawerVisible?: boolean,
  record?: DbRecordEntityTransform,
  phoneRecord?: DbRecordEntityTransform
}
export interface ILeadWorkflow {
  isCreateLeadFromAddressVisible?: boolean,
  relatedRecord?: DbRecordEntityTransform
}

export function createOrderVisible() {
  return {
    type: CREATE_ORDER_MODAL_VISIBILE,
  }
}

export function updateOrderWorkflow(params: any) {
  return {
    type: UPDATE_ORDER_WORKFLOW,
    params 
  }
}

export function orderCheckoutRequest(params: IOrderCheckout, cb = () => {}) {
  return {
    type: ORDER_WORKFOLOW_CHECKOUT_REQUEST,
    params,
    cb
  }
}

export function orderAmendWorkflow(params: IOrderAmendWorkflowParams) {
  return {
    type: ORDER_AMEND_WORKFLOW,
    params,
  }
}

export function amendOrderRequest(params: IAmendOrderParams, cb?: (resp: any) => void) {
  return {
    type: AMEND_ORDER_REQUEST,
    params,
    cb
  }
}

export function createOrderFromLeadVisible() {
  return {
    type: CREATE_ORDER_FROM_LEAD_DRAWER_VISIBILE,
  }
}

export function createOrderFromAccountVisible() {
  return {
    type: CREATE_ORDER_FROM_ACCOUNT_DRAWER_VISIBILE,
  }
}

export function createAccountVisible() {
  return {
    type: CREATE_ACCOUNT_MODAL_VISIBILE,
  }
}

export function createAddressVisible() {
  return {
    type: CREATE_ADDRESS_MODAL_VISIBILE,
  }
}

export function initializeSwapAddress(params: IInitializeSwapAddress) {
  return {
    type: INITIALIZE_SWAP_ADDRESS_MODAL,
    params
  }
}

export function updateAddressWorkflow(params: any) {
  return {
    type: UPDATE_ADDRESS_WORKFLOW_OBJECT,
    params
  }
}

export function updateContactIdentityWorkflow(params: IConatctIdentityWorkflow) {
  return {
    type: UPDATE_CONTACT_IDENTITY_WORKFLOW_OBJECT,
    params
  }
}

export function updateNetworkManageWorkflow(params: INetworkManageWorkflow) {
  return {
    type: UPDATE_NETWORK_MANAGE_WORKFLOW_OBJECT,
    params
  }
}

export function updateLeadWorkflow(params: ILeadWorkflow) {
  return {
    type: UPDATE_LEAD_WORKFLOW_OBJECT,
    params
  }
}

export function cancelWorkOrderRequest(params: { body: any, workOrderId: string }, cb: any) {
  return {
    type: CANCEL_WORKORDER_REQUEST,
    params,
    cb
  }
}