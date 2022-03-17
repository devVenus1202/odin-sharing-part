/**
 * All of the rabbitMq routeKey constants for routing to queues
 */

// Schema Module Db Records
export const SUB_DB_RECORD_CREATED = 'SubDbRecordCreated';
export const SUB_DB_RECORD_UPDATED = 'SubDbRecordUpdated';
export const SUB_DB_RECORD_DELETED = 'SubDbRecordDeleted';
export const SUB_DB_RECORD_RESTORED = 'SubDbRecordRestored';
export const SUB_DB_RECORD_OWNER_ASSIGNED = 'SubDbRecordOwnerAssigned';

export const RPC_CREATE_DB_RECORDS = 'RpcCreateDbRecords';
export const SUB_CREATE_DB_RECORDS = 'SubCreateDbRecords';
export const SUB_UPDATE_DB_RECORDS = 'SubUpdateDbRecords';

export const SUB_DELETE_DB_RECORD = 'SubDeleteDbRecord'
export const SUB_RESTORE_DB_RECORD = 'SubRestoreDbRecord'

export const SUB_DB_RECORD_ASSOCIATION_CREATED = 'SubDbRecordAssociationCreated';
export const SUB_DB_RECORD_ASSOCIATION_UPDATED = 'SubDbRecordAssociationUpdated';
export const SUB_DB_RECORD_ASSOCIATION_DELETED = 'SubDbRecordAssociationDeleted';
export const SUB_DB_RECORD_ASSOCIATION_RESTORED = 'SubDbRecordAssociationRestored';

export const CREATE_DB_RECORD_ASSOCIATIONS = 'CreateDbRecordAssociations';

// Schema Module Schemas
export const RPC_GET_SCHEMA_BY_ID = 'RpcGetSchemaById';

export const SUB_SCHEMA_COLUMN_CREATED = 'SubSchemaColumnCreated';
export const SUB_SCHEMA_COLUMN_UPDATED = 'SubSchemaColumnUpdated';
export const SUB_SCHEMA_COLUMN_DELETED = 'SubSchemaColumnDeleted';

export const SUB_SCHEMA_COLUMN_OPTION_CREATED = 'SubSchemaColumnOptionCreated';
export const SUB_SCHEMA_COLUMN_OPTION_UPDATED = 'SubSchemaColumnOptionUpdated';
export const SUB_SCHEMA_COLUMN_OPTION_DELETED = 'SubSchemaColumnOptionDeleted';
// the event that is triggered when an ENUM column is saved ( create, update, delete )
export const SUB_SCHEMA_COLUMN_OPTION_MODIFIED = 'SubSchemaColumnOptionModified';

export const SUB_SCHEMA_CREATED = 'SubSchemaCreated';
export const SUB_SCHEMA_UPDATED = 'SubSchemaUpdated';
export const SUB_SCHEMA_DELETED = 'SubSchemaDeleted';

// Identity Module
export const RPC_GET_USER_BY_ID = 'RpcGetUserById';
export const RPC_GET_ORG_APP_BY_NAME = 'RpcGetOrgAppByName';
export const SUB_ORGANIZATION_UPDATED = 'SubOrganizationUpdated';

// Notification Module
export const SUB_SEND_DYNAMIC_EMAIL = 'SubSendDynamicEmail';
export const RPC_GET_EMAIL_TEMPLATE_BY_LABEL = 'SubGetEmailTemplateByLabel';

// Order Module
export const RPC_CREATE_ORDER_ITEMS = 'RpcCreateOrderItems';

// Standard actions

export const SUB_ACTIVATE = 'SubActivate';
export const SUB_CANCEL = 'SubCancel';
export const SUB_PAUSE = 'SubPause';

export const INDEX_DB_RECORDS = 'IndexDbRecords';


// Workflows

export const PROCESS_WORKFLOW_ON_QUEUE = 'ProcessWorkflowOn';

export const RPC_PROCESS_WORKFLOWS_FOR_RECORDS = 'RpcProcessWorkflowsForRecords';

export const CRON_WORKFLOW_QUEUE = 'CronWorkflow';
export const SUB_EXEC_CRON_WORKFLOW = 'SubExecCronWorkflow';
