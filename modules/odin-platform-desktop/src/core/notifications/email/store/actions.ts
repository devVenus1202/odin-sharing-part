import { GET_EMAIL_DATA_REQUEST, PREVIEW_EMAIL_REQUEST, SEND_CONFIRMATION_EMAIL_REQUEST } from './constants';

export interface SendgridEmailEntity {
  to: any,
  cc?: any,
  bcc?: any,
  from?: any,
  subject?: string,
  body?: any,
  attachments?: any,
  links?: { [key: string]: string },
  signature?: string,
  // Sendgrid template id
  templateId?: string,
  // odin template label
  templateLabel: string,
  // Sendgrid dynamic template data
  dynamicTemplateData: { [key: string]: any },
}

export function sendConfirmationEmail(path: string, body?: SendgridEmailEntity) {
  return {
    type: SEND_CONFIRMATION_EMAIL_REQUEST,
    path,
    body,
  }
}

/**
 * ODN-866 Requests email data
 * 
 * @param path 
 * @param cb 
 * @param body 
 * @returns 
 */
export function getEmailDataRequest(path: string, cb: () => {}, body?: SendgridEmailEntity) {
  return {
    type: GET_EMAIL_DATA_REQUEST,
    path,
    body,
    cb
  }
}

/**
 * ODN-866 Requests email preview
 * 
 * @param body 
 * @param cb 
 * @returns 
 */
export function previewEmailRequest(body: SendgridEmailEntity, cb = () => {}) {
  return {
    type: PREVIEW_EMAIL_REQUEST,
    body,
    cb,
  }
}

export function sendEmail() {
  return null;
}

