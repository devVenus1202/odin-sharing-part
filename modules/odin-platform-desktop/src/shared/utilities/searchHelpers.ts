import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { TableReducer } from '../../core/records/components/DynamicTable/store/reducer';
import { IRecordReducer } from '../../core/records/store/reducer';
import { SchemaReducerState } from '../../core/schemas/store/reducer';
import { getSchemaFromShortListByModuleAndEntity } from './schemaHelpers';

/**
 * Generates key for Query Builder state
 * @param moduleName
 * @param entityName
 * @returns
 */
export function generateModuleAndEntityKey(moduleName: string | undefined, entityName: string | undefined): string {
  return `${moduleName}:${entityName}`;
}

/**
 * Generates key for Query Builder state
 * @param ownProps
 * @returns
 */
export function generateModuleAndEntityKeyFromProps(ownProps: any): string {
  if (ownProps?.moduleName && ownProps?.entityName) {
    return generateModuleAndEntityKey(ownProps.moduleName, ownProps.entityName);
  } else if (ownProps?.schema) {
    return generateModuleAndEntityKey(ownProps.schema?.moduleName, ownProps.schema?.entityName);
  }
  return generateModuleAndEntityKey(ownProps.moduleName, ownProps.entityName);
  ;
}

/**
 * Generates key for storing Saved Filters
 * @param moduleName
 * @param entityName
 * @returns
 */
export function generateFilterKey(moduleName: string, entityName: string): string {
  return `${moduleName}_${entityName}_filter`;
}

/**
 * This method will the the filters for a list view
 * @returns {QueryBuilder<any> | QueryBuilderReducer}
 * @param schemaReducer
 * @param recordTableReducer
 * @param moduleName
 * @param entityName
 */
export function getCurrentListView(
  schemaReducer: SchemaReducerState,
  recordTableReducer: TableReducer,
  moduleName: string,
  entityName: string,
) {

  const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

  if (schema) {
    const name = generateFilterKey(schema.moduleName, schema.entityName);
    const filter = recordTableReducer.listViews ? recordTableReducer.listViews[name] : undefined;
    if (!!filter) {
      return filter;
    }
  }
}

/**
 * This method will the the filters for a list view
 * @returns {QueryBuilder<any> | QueryBuilderReducer}
 * @param schemaReducer
 * @param recordTableReducer
 * @param moduleName
 * @param entityName
 */
export function getSavedFilter(
  schemaReducer: SchemaReducerState,
  recordTableReducer: TableReducer,
  moduleName: string,
  entityName: string,
) {

  const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

  if (schema) {
    const name = generateFilterKey(schema.moduleName, schema.entityName);
    const filter = recordTableReducer.listViews ? recordTableReducer.listViews[name] : undefined;
    if (!!filter && filter.queryBuilder) {
      return filter.queryBuilder;
    }
  }
}

/**
 *
 * @param schemaReducer
 * @param recordReducer
 * @param moduleName
 * @param entityName
 */
export function setSortQuery(
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  moduleName: string,
  entityName: string,
) {
  const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
  if (!!recordReducer.searchQuery && schema) {
    if (['Premise', 'Premise2', 'Address'].includes(schema.entityName)) {
      return [
        // { 'properties.UDPRN': { 'order': 'asc' } },
        { 'properties.BuildingNumber': { 'order': 'asc' } },
        { 'properties.DeliveryPointSuffixNumber': { 'order': 'asc' } },
        { 'properties.DeliveryPointSuffixLetter.keyword': { 'order': 'asc' } },
      ];
    } else {
      // @ts-ignore
      return !!recordReducer.searchQuery[schema.id] ? recordReducer.searchQuery[schema.id].sort : [{ updatedAt: { order: 'desc' } }];
    }
  }
}

/**
 *
 * @param schemaReducer
 * @param recordReducer
 * @param moduleName
 * @param entityName
 */
export function setSearchQuery(
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  moduleName: string,
  entityName: string,
) {
  const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
  if (!!recordReducer.searchQuery && schema) {
    // @ts-ignore
    return !!recordReducer.searchQuery[schema.id] ? recordReducer.searchQuery[schema.id].terms : ''
  }
}

/**
 * Set the default search fields for entities
 * @param moduleName
 * @param entityName
 */
export function getDefaultFields(schema: SchemaEntity, moduleName: string, entityName: string) {

  if (['Task', 'Milestone', 'Project', 'Program', 'Subtask'].includes(entityName)) {
    return [
      ...getPropertiesPathsForFullTextSearch(schema),
      'title',
      'recordNumber',
    ];
  }
  else if (moduleName === 'CrmModule' && ['Premise'].includes(entityName)) {
    return [
      'properties.PostalCode',
      'properties.UDPRN',
      'title',
    ];
  }
  else if (moduleName === 'OrderModule' && entityName === 'Order') {
    return [
      ...getPropertiesPathsForFullTextSearch(schema),
      'title',
      'recordNumber',
      ...getPropertiesPathsForFullTextSearch(schema, 'Address'),
      ...getPropertiesPathsForFullTextSearch(schema, 'Contact'),
    ];
  }
  else if (moduleName === 'FieldServiceModule' && entityName === 'WorkOrder') {
    return [
      ...getPropertiesPathsForFullTextSearch(schema),
      'title',
      'recordNumber',
      ...getPropertiesPathsForFullTextSearch(schema, 'Address'),
      ...getPropertiesPathsForFullTextSearch(schema, 'Contact'),
    ];
  }
  else if (moduleName === 'CrmModule' && entityName === 'Lead') {
    return [
      'title',
      'recordNumber',
      'Address.dbRecords.title',
      'Contact.dbRecords.title',
      'Contact.dbRecords.properties.FirstName',
      'Contact.dbRecords.properties.LastName',
      'Contact.dbRecords.properties.EmailAddress',
      'Contact.dbRecords.properties.Phone',
    ];
  }
  else if (moduleName === 'CrmModule' && entityName === 'Account') {
    return [
      'title',
      'recordNumber',
      'Address.dbRecords.title',
      'Contact.dbRecords.title',
      'Contact.dbRecords.properties.FirstName',
      'Contact.dbRecords.properties.LastName',
      'Contact.dbRecords.properties.EmailAddress',
      'Contact.dbRecords.properties.Phone',
    ];
  }
  else if (moduleName === 'CrmModule' && entityName === 'Contact') {
    return [
      'title',
      'recordNumber',
      'properties.EmailAddress',
      'properties.Phone',
    ];
  }
  else if (moduleName === 'ServiceModule' && entityName === 'NetworkDevice') {
    return [
      'title',
      'recordNumber',
      ...getPropertiesPathsForFullTextSearch(schema),
    ];
  }
  else if (moduleName === 'SchemaModule' && entityName === 'ALL') {
    return [
      'title',
      'recordNumber',
      'properties.IpAddress',
      'properties.EmailAddress',
      'properties.Phone',
      'Address.dbRecords.title',
      'Contact.dbRecords.title',
      'Contact.dbRecords.properties.FirstName',
      'Contact.dbRecords.properties.LastName',
      'Contact.dbRecords.properties.EmailAddress',
      /*'Contact.dbRecords.properties.Phone'*/
    ];
  }
  else {
    return [
      'title',
      'recordNumber',
      ...getPropertiesPathsForFullTextSearch(schema),
    ]
  }
}

function getPropertiesPathsForFullTextSearch(schema: SchemaEntity, associationEntityName?: string): string[] {
  const res: string[] = [];

  const srcSchema = !associationEntityName ? schema : schema.associations?.find(a => a.childSchema?.entityName === associationEntityName)?.childSchema;
  const prefix = !associationEntityName ? 'properties.' : `${associationEntityName}.dbRecords.properties.`;

  if (!srcSchema?.columns) return res;

  for (const col of srcSchema.columns) {
    switch (col.type) {
      case SchemaColumnTypes.ENUM:
      case SchemaColumnTypes.TEXT:
      case SchemaColumnTypes.TEXT_LONG:
      case SchemaColumnTypes.EMAIL:
      case SchemaColumnTypes.PHONE_NUMBER:
      case SchemaColumnTypes.PHONE_NUMBER_E164_GB:
      case SchemaColumnTypes.ADDRESS:
      case SchemaColumnTypes.ALPHA_NUMERICAL: //?
        res.push(`${prefix}${col.name}`);
        break;
      default:
        break;
    }
  }

  return res;
}

function regExpQuote(str: string) {
  if (!str) return '';
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

export function searchString(str: string, subStr: string) {
  if (!str) return false;
  const searchReg = new RegExp(regExpQuote(subStr), 'i');
  return str.match(searchReg)
}