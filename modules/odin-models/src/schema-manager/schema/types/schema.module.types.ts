// export enum SchemaModuleTypes {
//
//     CRM = "CRM", // Customer Relationship Management
//     ORM = "ORM", // Order Management
//     PCM = "PCM", // Product Catalog Management
//     BRM = "BRM", // Billing Revenue Management
//
// }

// export const SCHEMA_MODULE_TYPE_KEYS: Array<string> = Object.values(SchemaModuleTypes);

interface SchemaModuleType {
  name: string;
  label: string;
}

/**
 * Modules configurable by the user
 */
export enum SchemaModuleTypeEnums {
  CRM_MODULE = 'CrmModule',
  ORDER_MODULE = 'OrderModule',
  FIELD_SERVICE_MODULE = 'FieldServiceModule',
  PRODUCT_MODULE = 'ProductModule',
  BILLING_MODULE = 'BillingModule',
  NOTIFICATION_MODULE = 'NotificationModule',
  SUPPORT_MODULE = 'SupportModule',
  SERVICE_MODULE = 'ServiceModule',
  PROJECT_MODULE = 'ProjectModule',
  IDENTITY_MODULE = 'IdentityModule',
  SCHEMA_MODULE = 'SchemaModule'
}

export enum ChangeCaseEnums {
  UPPER_CASE = 'UPPER_CASE',
  LOWER_CASE = 'LOWER_CASE',
  CONSTANT_CASE = 'CONSTANT_CASE',
  SNAKE_CASE = 'SNAKE_CASE',
  PASCAL_CASE = 'PASCAL_CASE',
  CAMEL_CASE = 'CAMEL_CASE',
  CAPITAL_CASE = 'CAPITAL_CASE',
  DOT_CASE = 'DOT_CASE',
  HEADER_CASE = 'HEADER_CASE',
  PARAM_CASE = 'PARAM_CASE',
  PATH_CASE = 'PATH_CASE',
  SENTENCE_CASE = 'SENTENCE_CASE',
  NO_CASE = 'NO_CASE',
  CAMEL_UPPER_CASE = 'CAMEL_UPPER_CASE',
  CAMEL_LOWER_CASE = 'CAMEL_LOWER_CASE',
  UPPERCASE_NOCASE_NOSPACE = 'UPPERCASE_NOCASE_NOSPACE'
}

export const SchemaModuleTypes: { [name: string]: SchemaModuleType } = {

  FIELD_SERVICE_MODULE: {
    name: 'field service module',
    label: 'FieldServiceModule',
  },
  CRM_MODULE: {
    name: 'crm module',
    label: 'CrmModule',
  },
  ORDER_MODULE: {
    name: 'order module',
    label: 'OrderModule',
  },
  PRODUCT_MODULE: {
    name: 'product module',
    label: 'ProductModule',
  },
  BILLING_MODULE: {
    name: 'billing module',
    label: 'BillingModule',
  },
  NOTIFICATION_MODULE: {
    name: 'notification module',
    label: 'NotificationModule',
  },
  SUPPORT_MODULE: {
    name: 'support module',
    label: 'SupportModule',
  },
  PROJECT_MODULE: {
    name: 'project module',
    label: 'ProjectModule',
  },
  SCHEMA_MODULE: {
    name: 'schema module',
    label: 'SchemaModule',
  },
};

/**
 * Array of keys to validate @IsIn() enum class validator
 */
export const SCHEMA_MODULE_TYPE_KEYS = Object.keys(SchemaModuleTypes);

/**
 * Get the module entity name using the key
 * @param key
 */
export const getSchemaModuleName = (key: string): string | undefined => {
  const entity = SchemaModuleTypes[key];
  if (entity) {
    return entity.name
  } else {
    return undefined;
  }
};


/**
 * Get the module entity label using the key
 * @param key
 */
export const getSchemaModuleLabel = (key: string): string | undefined => {
  const entity = SchemaModuleTypes[key];
  if (entity) {
    return entity.label
  } else {
    return undefined;
  }
};
