import {
  GET_ZDTICKETS_REQUEST,
  CREAT_ZDTICKET_REQUEST,
  UPDATE_ZDTICKET_REQUEST,
  CREATE_ZDTICKET_COMMENT_REQUEST,
  GET_ZDTICKET_COMMENTS_REQUEST
} from './constants';

export enum IZDTicketPerspectives {
  TICKET = "ticket", 
  REQUEST = "request", 
}
export interface IGetZdTickets {
  userId?: number,
  externalId?: number
}

export interface ICreateZdTicket {
  perspective: string,
  subject: string,
  comment: any,
  type?: string,
  external_id?: string,
  requester_id?: string,
  assignee_id?: string,
  submitter_id?: string,
}

export interface IUpdateZdTicket {
  solved: boolean,
  ticketId: string
}

export interface ICreateZdComment {
  body: string,
  html_body: string,
  authorId: number,
  ticketId: number
}

export interface IGetZdComments {
  ticketId: string,
  perspective: string
}

export function getZdTicketsRequest(params: IGetZdTickets) {
  console.log("params-on acttion", params)
  return {
    type: GET_ZDTICKETS_REQUEST,
    params,
  };
}

export function createZdTicketRequest(params: ICreateZdTicket) {
  return {
    type: CREAT_ZDTICKET_REQUEST,
    params,
  };
}

export function updateZdTicketRequest(params: IUpdateZdTicket, cb?: (resp: any) => void) {
  return {
    type: UPDATE_ZDTICKET_REQUEST,
    params,
    cb
  }
} 
export function createZdTicketCommentRequest(params: ICreateZdComment) {
  return {
    type: CREATE_ZDTICKET_COMMENT_REQUEST,
    params,
  };
}

export function getCommentsRequest(params: IGetZdComments) {
  return {
    type: GET_ZDTICKET_COMMENTS_REQUEST,
    params,
  };
}

export function createCommentRequest(params: IGetZdComments) {
  return {
    type: CREATE_ZDTICKET_COMMENT_REQUEST,
    params,
  };
}