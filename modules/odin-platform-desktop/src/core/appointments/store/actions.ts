import {
  CANCEL_APPOINTMENT_RECORD_REQUEST,
  CLOSE_CANCEL_APPOINTMENT_MODAL,
  CREATE_APPOINTMENT_REQUEST,
  INITIALIZE_CANCEL_APPOINTMENT_MODAL,
  LOAD_AVAILABLE_APPOINTMENTS_REQUEST,
} from './constants';
import { ServiceAppointmentCreateDto } from './reducer';

export interface ICreateServiceAppointment {
  workOrderId: any,
  createUpdate: ServiceAppointmentCreateDto,
}

export interface ILoadAppointments {
  start: string,
  end: string,
  type: string | undefined,
  addressId?: string,
  exPolygonId?: string,
  isOverview?: boolean
}

export function loadAppointmentsRequest(params: ILoadAppointments) {
  return {
    type: LOAD_AVAILABLE_APPOINTMENTS_REQUEST,
    params,
  };
}


export function createAppointmentRequest(params: ICreateServiceAppointment, cb = () => {
                                         },
) {
  return {
    type: CREATE_APPOINTMENT_REQUEST,
    params,
    cb,
  };
}


export function cancelAppointmentRequest(params: any, cb: any) {
  return {
    type: CANCEL_APPOINTMENT_RECORD_REQUEST,
    params,
    cb,
  }
};

export function initailizeCancelAppointmentModal(params: any) {
  return {
    type: INITIALIZE_CANCEL_APPOINTMENT_MODAL,
    params,
  }
}

export function closeCancelAppointmentModal() {
  return {
    type: CLOSE_CANCEL_APPOINTMENT_MODAL,
  }
}
