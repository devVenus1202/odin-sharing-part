import { SchemaColumnOptionEntity } from '@d19n/models/dist/schema-manager/schema/column/option/schema.column.option.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { TableHeaderColumn } from '../../core/records/components/DynamicTable/helpers/configureColumns';


export const getSchemaFromShortListByModuleAndEntity = (
  shortList: { [key: string]: SchemaEntity },
  moduleName: string | undefined,
  entityName: string | undefined,
): SchemaEntity | undefined => {
  if (!shortList) return;
  const keys = Object.keys(shortList);
  for(const key of keys) {
    const schema = shortList[key];
    if(schema.moduleName === moduleName && schema.entityName === entityName) {
      return schema;
    }
  }
};

export const getSchemaFromShortListBySchemaId = (
  shortList: { [key: string]: SchemaEntity },
  schemaId: string | null | undefined,
): SchemaEntity | undefined => {
  return schemaId ? shortList?.[schemaId] : undefined;
};


/**
 *  formats schema columns into elastic search index mappings
 * @param schema
 */
export const getElasticSearchKeysFromSchemaColumn = (
  schema: SchemaEntity,
  schemaTypeId?: string,
): TableHeaderColumn[] => {

  return schema?.columns?.filter(col => col.isVisibleInTables && (col.schemaTypeId === schemaTypeId || !col.schemaTypeId)).map(
    col => ({
      title: col.label ? col.label : '',
      dataIndex: `properties.${col.name}`,
      columnType: col.type,
      position: col.position,
      isTitleColumn: col.isTitleColumn ? col.isTitleColumn : false,
    }));

}

/**
 * Sort schema column options
 *
 * Supports: strings and numbers
 * @param a
 * @param b
 */
export const sortOptions = (a: SchemaColumnOptionEntity, b: SchemaColumnOptionEntity) => {
  if(!isNaN(Number(a.value))) {
    return Number(a.value) - Number(b.value)
  } else {
    return a.value.localeCompare(b.value)
  }
}

/**
 * Sort schema column options by position parameter
 *
 * Supports: numbers
 * @param a
 * @param b
 */
export const sortByPosition = (a: SchemaColumnOptionEntity, b: SchemaColumnOptionEntity) => {
  return Number(a.position) - Number(b.position);
}

export const entityNamesByModules: [string, string][] = [];

/**
 * Return an array of tuples: [moduleName, entityName]
 * 
 * @param schemasList 
 * @param moduleName 
 * @returns 
 */
export const getEntityNamesByModules = (schemasList: SchemaEntity[], moduleName?: string): [string, string][] => {

    if (!(entityNamesByModules?.length > 0)) {
      if (schemasList?.length > 0) {
        for (const schema of schemasList) {
          entityNamesByModules.push([schema.moduleName, schema.entityName]);
        }
      }
    }

    if (moduleName) {
      return entityNamesByModules.filter(item => item[0] === moduleName);
    } else {
      return [...entityNamesByModules];
    }
  }