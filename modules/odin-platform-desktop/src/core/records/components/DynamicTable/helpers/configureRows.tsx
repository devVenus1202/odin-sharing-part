import { GROUP_NAME__ARCHIVED } from '@d19n/models/dist/identity/identity.constants';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import React from 'react';

export interface TableRowData {
  key: string;
  name: string
}

const flattenNestedData = (record: DbRecordEntityTransform, schema: SchemaEntity) => {

  let newObj: { [key: string]: any } = {};

  for(const key of Object.keys(record)) {

    // Parses the records relationships
    const recordValue = record[key];

    // need parse through related records and related records properties
    if (recordValue && recordValue.dbRecords && Array.isArray(recordValue.dbRecords)) {
      const relatedRecord = recordValue.dbRecords[0];

      const relatedSchema = schema.associations.find(as => as?.childSchema?.entityName === key);

      // Only one level nested
      if (relatedRecord && relatedSchema) {
        if (!!relatedRecord.properties) {
          for(const propKey of Object.keys(relatedRecord.properties)) {
            newObj = Object.assign(
              {},
              newObj,
              { [`${key}.dbRecords.properties.${propKey}`]: relatedRecord.properties[propKey] },
            );

            // ODN-2201 append formatted value
            const column = relatedSchema?.childSchema.columns.find(col => col.name === propKey);
            if (column?.format) {
              newObj = Object.assign(
                {},
                newObj,
                { [`${key}.dbRecords.properties.${propKey}_Fmt`]: relatedRecord?.formattedProperties?.[propKey] },
              );
            }
          }
          // ODN-1524 adds stage name column
          newObj = Object.assign(
            {},
            newObj,
            { [`${key}.dbRecords.title`]: relatedRecord['title'] },
            { [`${key}.dbRecords.stage.name`]: relatedRecord?.stage?.name },
          );
        }
      }
    }
  }
  return newObj;
};


export const formatDbRecordListData = (
  schema: SchemaEntity | undefined,
  list: DbRecordEntityTransform[] | undefined,
  pipelinesEnabled: boolean | undefined,
  queryBuilderEnabled?: boolean | false,
) => {
  let tableRows: any[] = [];
  let filterableCols = {};

  if (!!list && schema && schema.columns) {

    for(const record of list) {
      let tableCell = {};
      tableCell = Object.assign({}, tableCell, { key: record.id });
      tableCell = Object.assign({}, tableCell, { title: record.title });

      if (!!record['properties']) {

        if (pipelinesEnabled && !!record.stage) {
          tableCell = Object.assign(
            {},
            tableCell,
            { stageName: record.stage.name, stagePosition: record.stage.position },
          );
        }

        if (schema.isSequential) {
          tableCell = Object.assign({}, tableCell, { recordNumber: record.recordNumber });
        }

        for(const col of schema?.columns) {
          tableCell = Object.assign(
            {},
            tableCell,
            { [`properties.${col.name}`]: record.properties[col.name] },
          );

          // ODN-2201 append formatted value
          if (col.format) {
            tableCell = Object.assign(
              {},
              tableCell,
              { [`properties.${col.name}_Fmt`]: record?.formattedProperties?.[col.name] },
            );
          }
        }
        tableCell = Object.assign(
          {},
          tableCell,
          { createdBy: record.createdBy ? record.createdBy.fullName : undefined },
        );
        tableCell = Object.assign(
          {},
          tableCell,
          { lastModifiedBy: record.lastModifiedBy ? record.lastModifiedBy.fullName : undefined },
        );
        tableCell = Object.assign(
          {},
          tableCell,
          { ownedBy: record.ownedBy ? record.ownedBy.fullName : undefined },
        );
        tableCell = Object.assign(
          {},
          tableCell,
          { type: record.type ? record.type : undefined },
        );
        tableCell = Object.assign(
          {},
          tableCell,
          { createdAt: record.createdAt },
        );
        tableCell = Object.assign(
          {},
          tableCell,
          { updatedAt: record.updatedAt },
        );

        // only when we have the query builder enabled use this otherwise no need
        if (queryBuilderEnabled) {
          // Flatten nested data
          // TODO: Refactor this as it is causing performance issues parsing rows N + 1
          const flattened = flattenNestedData(record, schema);

          filterableCols = Object.assign({}, filterableCols, flattened);
          tableCell = Object.assign({}, tableCell, flattened);
          // TODO: Refactor this do not use the entire record causing performance issues due to data size
        }
        tableCell = Object.assign({}, tableCell, {
          rowRecord: {
            id: record.id,
            title: record.title,
            recordNumber: record.recordNumber,
            entity: record.entity,
            schemaId: record.schemaId,
            stage: record.stage,
            properties: record.properties,
            formattedProperties: record.formattedProperties,
            dbRecordAssociation: record.dbRecordAssociation,
            links: record.links, // ODN-2224
            groups: record.groups, // ODN-2100 render record groups
            isArchived: record.isArchived !== undefined ? record.isArchived : record.groups?.some(g => g.name === GROUP_NAME__ARCHIVED),
          },
        });
        tableRows.push(tableCell);

      } else {
        for(const col of schema.columns) {
          tableCell = Object.assign({}, tableCell, { key: col.id });
          // @ts-ignore
          tableCell = Object.assign({}, tableCell, { [col.name]: record[col.name] });
        }
        tableRows.push(tableCell);
      }
    }
  }
  return { tableRows, filterableCols };
};
