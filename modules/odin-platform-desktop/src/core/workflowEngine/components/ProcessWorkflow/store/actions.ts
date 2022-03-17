import {
  INIT_PROCESS_WORKFLOW_FORM,
  CLOSE_PROCESS_WORKFLOW_FORM,
  UPDATE_PROCESS_WORKFLOW_FORM_STATE
} from './constants';


export function initProcessWorkflowForm(params: any) {
  return {
    type: INIT_PROCESS_WORKFLOW_FORM,
    params,
  }
}

export function updateProcessWorkflowFormState(params: any) {
  return {
    type: UPDATE_PROCESS_WORKFLOW_FORM_STATE,
    params,
  }
}

export function closeProcessWorkflowForm() {
  return {
    type: CLOSE_PROCESS_WORKFLOW_FORM,
  }
}