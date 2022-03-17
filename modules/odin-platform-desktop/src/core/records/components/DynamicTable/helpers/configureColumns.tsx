import {
  DbRecordAssociationRecordsTransform,
} from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaColumnEntity } from '@d19n/models/dist/schema-manager/schema/column/schema.column.entity';
import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Space, Tag, Tooltip } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import StageNameTag from '../../../../../shared/components/StageNameTag';
import { hasAnyRoles } from '../../../../../shared/permissions/rbacRules';
import { parseDateAndTimeLocal, parseDateToLocalFormat } from '../../../../../shared/utilities/dateHelpers';
import { checkRecordIsLocked, splitModuleAndEntityName } from '../../../../../shared/utilities/recordHelpers';
import ListItemActionMenu from '../../../../recordsAssociations/components/ListActions/ListItemActionMenu';
import { IAddRecordToShortList, IGetRecordById } from '../../../store/actions';

export interface TableHeaderColumn {
  title: string,
  dataIndex: string,
  position: number,
  columnType?: string,
  isTitleColumn: boolean,
  width?: string | number,
  render?: any
  sorter?: boolean,
}

const renderActions = (
  schema: SchemaEntity | undefined,
  dbRecords: DbRecordEntityTransform[] | undefined,
  dataIndex: string,
  text: any,
  record: DbRecordEntityTransform,
  isTitleCol: boolean,
  relatedObj?: { record: DbRecordEntityTransform; relation: DbRecordAssociationRecordsTransform; hidden?: string[] },
  column?: TableHeaderColumn | undefined,
) => {

  const excludeAssociationlabels = [ 'Offer__Product' ];

  if (!!dbRecords && dbRecords.length >= 1 && !!schema) {
    // Entity specific conditions
    if ([ 'Premise', 'Premise2' ].includes(schema.entityName)) {
      return <Link
        to={`/${schema.moduleName}/${schema.entityName}/${getProperty(record, 'UDPRN')}/${getProperty(
          record,
          'UMPRN',
        )}`}>{text}</Link>
    } else if (schema.entityName === 'Note') {

      return <Link to={`/${schema.moduleName}/${schema.entityName}/${record.id}`}>{text}</Link>
    } else if (record.title && dataIndex === 'title') {

      let textEl = text;

      if (relatedObj
        && relatedObj.relation.schemaAssociation.hasColumnMappings
        && isTitleCol
        && relatedObj.relation.schemaAssociation.relationType === 'child') {

        if (!excludeAssociationlabels.includes(relatedObj.relation.schemaAssociation.label as string)) {
          textEl = <Link
            to={`/${schema.moduleName}/related/${schema.entityName}/${record?.dbRecordAssociation?.id}/${record.id}`}>
            {text}</Link>
        }

      } else if (relatedObj
        && record.dbRecordAssociation
        && isTitleCol
        && record.dbRecordAssociation.relatedAssociationId) {

        if (!excludeAssociationlabels.includes(relatedObj.relation.schemaAssociation.label as string)) {
          textEl = <Link
            to={`/${schema.moduleName}/related/${schema.entityName}/${record?.dbRecordAssociation?.id}/${record.id}`}>
            {text}</Link>
        }

      } else if (isTitleCol) {
        textEl = <Link to={`/${schema.moduleName}/${schema.entityName}/${record.id}`}>{text}</Link>
      }

      if (isTitleCol) {
        // ODN-2043 render 'Archived' tag on the relation
        return <>{renderArchivedTag(record)}{textEl}</>;
      } else {
        return textEl;
      }

    } else if (dataIndex === 'groups') {
      // ODN-2100 render record groups
      return renderRecordGroups(record);
    } else if (isTitleCol) {

      // ODN-2043 render 'Archived' tag on the relation
      return <>{renderArchivedTag(record)}<Link
        to={`/${schema.moduleName}/${schema.entityName}/${record.id}`}>{text}</Link></>;

    }
    // ODN-2100 render record groups
    else if (dataIndex === 'groups') {
      return renderRecordGroups(record);
    } else {
      //TODO:  format data based on schema col types here....
      if (column) {
        switch (column.columnType) {
          case 'TAG':
            return <>{text && text.split(',').map((tag: string) => <Tag>{tag}</Tag>)}</>
          default:
            return text
        }
      }
      return text;
    }
  } else {
    return text;
  }
  return undefined;
};

// ODN-2100
export const renderRecordGroups = (record: DbRecordEntityTransform) => {
  const tags: any[] = [];
  record.groups?.forEach(g => {
    if (tags.length > 0) tags.push(<br/>);
    tags.push(<Tooltip placement="top" title={g.name}><Tag>{g.name}</Tag></Tooltip>);
  });
  return tags;
}

const renderArchivedTag = (record: DbRecordEntityTransform) => {
  if (record?.isArchived) return <>
    <Tooltip
      placement="top"
      title="Archived"
    >
      <Space/><Tag style={{ backgroundColor: 'wheat' }}>A</Tag><Space/>
    </Tooltip></>;
  else return '';
};


const sortColumns = (col1: SchemaColumnEntity, col2: SchemaColumnEntity) => {
  if (col1.position && col2.position) {
    return col1.position - col2.position;
  } else {
    return 0;
  }
};

export const formatDbRecordListColumns = (
  schema: SchemaEntity | undefined,
  visibleColumns: TableHeaderColumn[],
  dbRecords: DbRecordEntityTransform[] | undefined,
  pipelinesEnabled: boolean | undefined,
  shortListRecord: (params: IAddRecordToShortList) => {},
  getRecordById: (payload: IGetRecordById, cb: any) => {},
  relatedObj?: { record: DbRecordEntityTransform; relation: DbRecordAssociationRecordsTransform; hidden?: string[] },
  disableRelatedProductEdit?: boolean,
  canUserGetRecord?: boolean,
  authUser?: any,
) => {

  const columns = () => {

    // @ts-ignore
    const headerColumns = [];
    if (schema) {

      const standardColumns = [
        'createdAt',
        'updatedAt',
        'recordNumber',
        'title',
        'stage',
        'stageName',
        'actions',
        'type',
      ];

      // Initialize table with default columns
      if (schema.isSequential) {
        headerColumns.push({
          title: 'record #',
          sorter: true,
          dataIndex: 'recordNumber',
          width: 'auto',
          columnType: 'TEXT',
          position: -3,
          ellipsis: true,
          render: (
            text: string | undefined,
            row: { [x: string]: any, rowRecord: DbRecordEntityTransform },
          ) => renderActions(
            schema,
            dbRecords,
            'recordNumber',
            text,
            row.rowRecord,
            true,
            relatedObj,
          ),
        });
      }

      if (schema.types && schema.types.length > 0) {
        headerColumns.push({
          title: 'Type',
          dataIndex: 'type',
          width: 'auto',
          position: -1,
          columnType: 'TEXT',
          ellipsis: true,
          sorter: true,
        });
      }

      if (schema.hasTitle) {
        headerColumns.push({
          title: 'Title',
          sorter: true,
          dataIndex: 'title',
          width: 350,
          position: -4,
          columnType: 'TEXT',
          ellipsis: true,
          render: (
            text: string | undefined,
            row: { [x: string]: any, rowRecord: DbRecordEntityTransform },
          ) => renderActions(
            schema,
            dbRecords,
            'title',
            text,
            row.rowRecord,
            true,
            relatedObj,
          ),
        });
      }

      if (pipelinesEnabled) {
        headerColumns.push({
          title: 'stage',
          sorter: true,
          dataIndex: 'stageName',
          width: 'auto',
          columnType: 'TEXT',
          position: -2,
          ellipsis: true,
          render: (text: string | undefined, row: { [x: string]: any, rowRecord: DbRecordEntityTransform }) =>
            <StageNameTag text={text} record={row.rowRecord}/>,
        });
      }

      // parse visible columns from the list view and exclude the standard columns

      if (visibleColumns) {
        for(const col of visibleColumns) {

          if (standardColumns.includes(col.dataIndex) === false) {
            headerColumns.push({
              sorter: col.columnType != null,
              title: col.title,
              dataIndex: col.dataIndex,
              width: 'auto',
              columnType: col.columnType,
              position: col.position + 1,
              ellipsis: true,
              render: (
                text: string | undefined,
                row: { [x: string]: any, rowRecord: DbRecordEntityTransform },
                index: any,
              ) => {
                const formattedDataIndex = `${col.dataIndex}_Fmt`;
                const formattedValue = row[formattedDataIndex];
                if (col.columnType === SchemaColumnTypes.DATE && !formattedValue) {
                  return parseDateToLocalFormat(text) ?? text;
                } else if (col.columnType === SchemaColumnTypes.DATE_TIME && !formattedValue) {
                  return parseDateAndTimeLocal(text) ?? text;
                } else {
                  if (col.columnType === SchemaColumnTypes.LOOKUP) {
                    const link = row.rowRecord?.links?.find(l => l.id === text);
                    if (link) {
                      const { moduleName, entityName } = splitModuleAndEntityName(link.entity)
                      return <Link
                        to={`/${moduleName}/${entityName}/${link?.id}`}>{`${link.recordNumber ? `${link.recordNumber} - ` : ''}${link.title || ''}`}</Link>
                    }
                  }

                  return renderActions(
                    schema,
                    dbRecords,
                    col.dataIndex,
                    formattedValue ?? text,
                    row.rowRecord,
                    col.isTitleColumn,
                    undefined,
                    col,
                  )
                }
              },
            });
          }
        }
      }

      headerColumns.push({
        title: 'created',
        dataIndex: 'createdAt',
        width: 'auto',
        columnType: 'DATE_TIME',
        position: 99998,
        ellipsis: true,
        sorter: true,
        render: (text: string | undefined) => (parseDateToLocalFormat(text)),
      });

      headerColumns.push({
        title: 'updated',
        dataIndex: 'updatedAt',
        width: 'auto',
        columnType: 'DATE_TIME',
        position: 99998,
        ellipsis: true,
        sorter: true,
        render: (text: string | undefined) => (parseDateToLocalFormat(text)),
      });

      if (schema.entityName !== 'Premise' && !disableRelatedProductEdit) {
        headerColumns.push({
          sorter: true,
          title: 'actions',
          dataIndex: 'actions',
          width: 100,
          ellipsis: true,
          position: 99999,
          render: (text: string | undefined, row: { [x: string]: any, rowRecord: DbRecordEntityTransform }) => (
            <Space size="middle">
              {canUserGetRecord && <a onClick={() =>
                // ODN-1692 load a full record to the shortlist instead of truncated rowRecord
                getRecordById(
                  { schema: schema, recordId: row.rowRecord.id },
                  (record: any) => shortListRecord({
                    showPreview: true,
                    record: record,
                    previewDisableDelete: checkRecordIsLocked(relatedObj?.record) && !hasAnyRoles(
                      authUser,
                      'system.admin',
                      'BillingModuleAdmin',
                    ),
                    previewDisableClone: checkRecordIsLocked(relatedObj?.record) && !hasAnyRoles(
                      authUser,
                      'system.admin',
                      'BillingModuleAdmin',
                    ),
                    previewDisableEdit: checkRecordIsLocked(relatedObj?.record) && !hasAnyRoles(
                      authUser,
                      'system.admin',
                      'BillingModuleAdmin',
                    ),
                  }),
                )
              }>Quick View</a>}
              {relatedObj && <ListItemActionMenu
                  relatedRecord={row.rowRecord}
                  record={relatedObj.record}
                  relation={relatedObj.relation}
                  hidden={relatedObj.hidden}/>}
            </Space>
          ),
        });
      }

    }

    // @ts-ignore
    return headerColumns.sort(sortColumns);
  };

  return (
    columns()
  );
};

