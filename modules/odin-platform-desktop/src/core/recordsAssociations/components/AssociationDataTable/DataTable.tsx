import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { RelationTypeEnum } from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { Card, Empty, Table } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { canUserGetRecord, isSystemAdmin } from '../../../../shared/permissions/rbacRules';
import {
  getElasticSearchKeysFromSchemaColumn,
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../../../shared/utilities/schemaHelpers';
import { formatDbRecordListColumns } from '../../../records/components/DynamicTable/helpers/configureColumns';
import { formatDbRecordListData } from '../../../records/components/DynamicTable/helpers/configureRows';
import {
  addRecordToShortList,
  getRecordByIdRequest,
  IAddRecordToShortList,
  IGetRecordById,
  updateRecordByIdRequest,
} from '../../../records/store/actions';
import { IRecordReducer } from '../../../records/store/reducer';
import {
  getSchemaByIdRequest,
  getSchemaByModuleAndEntityRequest,
  ISchemaById,
  ISchemaByModuleAndEntity,
} from '../../../schemas/store/actions';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import {
  getRecordAssociationWithNestedEntitiesRequest,
  IGetRecordAssociationWithNestedEntites,
} from '../../store/actions';
import { IRecordAssociationsReducer } from '../../store/reducer';
import FileManagerOverview from '../FileManagerOverview/FileManagerOverview';
import ListActionMenu from '../ListActions/ListActionMenu';
import './styles.scss';

interface Props {
  userReducer: any;
  title?: string;
  expandable?: any;
  moduleName: string;
  entityName: string;
  nestedEntityName?: string;
  ignoreRelatedAssociationIdForNested?: boolean;
  record: DbRecordEntityTransform;
  schemaReducer: SchemaReducerState;
  recordReducer: IRecordReducer;
  recordAssociationReducer: IRecordAssociationsReducer;
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => {};
  getSchemaById: (params: ISchemaById, cb: any) => {};
  updateRecord: any;
  getAssociationWithNestedEntities: (
    params: IGetRecordAssociationWithNestedEntites,
  ) => {};
  shortListRecord: (params: IAddRecordToShortList) => {};
  getRecordById: (payload: IGetRecordById, cb: any) => {};
  hidden?: string[];
  filters?: string[];
  isCreateHidden?: boolean;
  customActionOverride?: boolean;
  disableRelatedProductEdit?: boolean;
  thumbnailSize?: number; // 8, 12, 24
  hideViewOptions?: boolean;
  relationType?: RelationTypeEnum;
  sortRecords?: (records: DbRecordEntityTransform[]) => DbRecordEntityTransform[];
}

class AssociationDataTable extends React.Component<Props> {
  timer: NodeJS.Timeout | undefined;

  componentDidMount() {
    this.timer = undefined;

    if (!this.timer) {
      this.timer = setInterval(() => this.getRecordAssociations(), 5000);
    }

    this.getRecordAssociations();
  }

  componentWillUnmount() {
    this.clearTimer();
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (
      prevProps.record?.id !== this.props.record?.id &&
      !this.props.recordAssociationReducer.isRequesting
    ) {
      this.getRecordAssociations();
    }
  }

  clearTimer() {
    //@ts-ignore
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private getRecordAssociations() {
    const {
      getAssociationWithNestedEntities,
      schemaReducer,
      getSchema,
      getSchemaById,
      moduleName,
      entityName,
      nestedEntityName,
      record,
      filters,
    } = this.props;

    if (record) {
      // request relations from module that hosts record entity
      const recordSchema = getSchemaFromShortListBySchemaId(
        schemaReducer.shortList,
        record.schemaId,
      );

      if (recordSchema) {
        // request to /one-relation to load nested entity
        getAssociationWithNestedEntities({
          recordId: record.id,
          key: filters ? `${entityName}_${filters}` : entityName,
          schema: recordSchema,
          entity: entityName,
          nestedEntities: nestedEntityName ? [ nestedEntityName ] : [],
          filters,
        });
      } else {
        getSchemaById(
          { schemaId: record.schemaId as string },
          (result: SchemaEntity) => {
            // request to /one-relation to load nested entity
            getAssociationWithNestedEntities({
              recordId: record.id,
              key: filters ? `${entityName}_${filters}` : entityName,
              schema: result,
              entity: entityName,
              nestedEntities: nestedEntityName ? [ nestedEntityName ] : [],
              filters,
            });
          },
        );
      }

      // load related entity or nested entity schema to build correct columns
      const relatedEntitySchema = getSchemaFromShortListByModuleAndEntity(
        schemaReducer.shortList,
        moduleName,
        nestedEntityName ?? entityName,
      );
      if (!relatedEntitySchema && !schemaReducer.isRequesting) {
        getSchema(
          {
            moduleName: moduleName,
            entityName: nestedEntityName ?? entityName,
          },
          undefined,
        );
      }
    }
  }

  parseDataSource(
    records: DbRecordEntityTransform[],
    relation: DbRecordAssociationRecordsTransform,
  ) {
    const { schemaReducer, entityName, relationType, sortRecords } = this.props;

    // use schema of the required relation (primary relation or nested)
    const schema = getSchemaFromShortListBySchemaId(
      schemaReducer.shortList,
      relation?.schema.id,
    );

    const hasPipelines = [
      'WorkOrder',
      'Order',
      'ReturnOrder',
      'Lead',
      'Account',
      'Program',
      'Project',
      'Task',
      'Job',
    ].includes(entityName);

    let data = records;
    // sort data on Position column
    if ([ 'Job' ].includes(entityName)) {
      data = data.sort(
        (recA, recB) =>
          Number(getProperty(recA, 'Order')) -
          Number(getProperty(recB, 'Order')),
      );
    }

    // ODN-1899 sort records
    if (sortRecords) {
      data = sortRecords(data);
    }

    if (relationType) {
      data = data.filter(elem => elem.relationType === relationType)
    }

    const { tableRows } = formatDbRecordListData(schema, data, hasPipelines);
    return tableRows;
  }

  parseColumns(
    records: DbRecordEntityTransform[],
    relation: DbRecordAssociationRecordsTransform,
    schemaTypeId?: string,
  ) {
    const {
      record,
      schemaReducer,
      entityName,
      shortListRecord,
      getRecordById,
      hidden,
      disableRelatedProductEdit,
      userReducer,
    } = this.props;

    // use schema of the required relation (primary relation or nested)
    const schema = getSchemaFromShortListBySchemaId(
      schemaReducer.shortList,
      relation?.schema.id,
    );

    const hasPipelines = [
      'WorkOrder',
      'Order',
      'ReturnOrder',
      'Lead',
      'Account',
      'Program',
      'Project',
      'Task',
      'Job',
    ].includes(entityName);

    if (schema && schema.columns) {
      let disableDataTableEdit = disableRelatedProductEdit;
      if (
        relation.schemaAssociation.label === 'PriceBook__Product' &&
        !isSystemAdmin(userReducer)
      ) {
        disableDataTableEdit = true;
      }

      const filteredColumns = schema.columns.filter(
        (elem) => elem.schemaTypeId === schemaTypeId || !elem.schemaTypeId,
      );

      const schemaFiltered = Object.assign({}, schema, {
        columns: filteredColumns,
      });

      const defaultColumns = getElasticSearchKeysFromSchemaColumn(
        schema,
        schemaTypeId,
      );

      return formatDbRecordListColumns(
        schemaFiltered,
        defaultColumns,
        records,
        hasPipelines,
        shortListRecord,
        getRecordById,
        {
          record,
          relation,
          hidden,
        },
        disableDataTableEdit,
        canUserGetRecord(userReducer, relation?.schema),
        userReducer,
      );
    }
  }

  hasData() {
    const { record, entityName, recordAssociationReducer } = this.props;
    const associationKey = `${record?.id}_${entityName}`;
    const associationObj: any =
      recordAssociationReducer.shortList[associationKey];
    if (
      associationObj &&
      associationObj[entityName] &&
      associationObj[entityName].dbRecords
    ) {
      return true;
    } else {
      return false;
    }
  }

  associationDataTableInCard(
    title: string,
    relation: DbRecordAssociationRecordsTransform,
    data: DbRecordEntityTransform[],
    schemaType?: SchemaTypeEntity,
  ) {
    const {
      expandable,
      record,
      hidden,
      isCreateHidden,
      customActionOverride,
      disableRelatedProductEdit,
    } = this.props;

    return (
      <div className="association-data-table-wrapper">
        <Card
          className="association-table-card"
          size="small"
          title={title}
          extra={
            !disableRelatedProductEdit ? (
              <ListActionMenu
                record={record}
                relation={relation}
                hidden={hidden}
                isCreateHidden={isCreateHidden}
                schemaType={schemaType}
                customActionOverride={customActionOverride}
              />
            ) : (
              <></>
            )
          }
        >
          <Table
            size="small"
            tableLayout="auto"
            expandable={expandable}
            pagination={false}
            dataSource={data ? this.parseDataSource(data, relation) : []}
            columns={data ? this.parseColumns(data, relation, schemaType?.id) : []}
          />
        </Card>
      </div>
    );
  }

  render() {
    const {
      title,
      record,
      entityName,
      filters,
      schemaReducer,
      recordAssociationReducer,
      nestedEntityName,
      ignoreRelatedAssociationIdForNested,
      hideViewOptions,
    } = this.props;
    const associationKey = filters
      ? `${record?.id}_${entityName}_${filters}`
      : `${record?.id}_${entityName}`;
    const associationObj: any =
      recordAssociationReducer.shortList[associationKey];

    // get primary relation data by entityName
    const primaryRelation = associationObj && associationObj[entityName];
    const primaryRecords = primaryRelation?.dbRecords;

    // check if nested relation by nestedEntityName was loaded
    // and get nested relation data
    const primaryRecordWithNestedRelation =
      primaryRecords &&
      primaryRecords.find((elem: any) => elem[`${nestedEntityName}`]);
    const nestedRelation =
      primaryRecordWithNestedRelation &&
      primaryRecordWithNestedRelation[`${nestedEntityName}`];

    let nestedRecords;
    if (nestedRelation && !ignoreRelatedAssociationIdForNested) {
      // if primary relation has relatedAssociationId, by default we filter nested relations by it
      // filter primary records that haven't relatedAssociationId specified
      const filtered =
        primaryRecords &&
        nestedRelation &&
        primaryRecords.filter(
          (elem: any) => elem.dbRecordAssociation?.relatedAssociationId,
        );
      // then filter nested relations by relatedAssociationId
      nestedRecords = filtered.flatMap((elem: any) => {
        return elem[`${nestedEntityName}`]?.dbRecords?.filter((nelem: any) => {
          return (
            nelem.dbRecordAssociation?.id ===
            elem.dbRecordAssociation?.relatedAssociationId ||
            nelem.dbRecordAssociation?.relatedAssociationId ===
            elem.dbRecordAssociation?.relatedAssociationId
          );
        });
      });
    } else {
      nestedRecords =
        primaryRecords &&
        nestedRelation &&
        primaryRecords.flatMap(
          (elem: any) => elem[`${nestedEntityName}`].dbRecords,
        );
    }

    // choose what relations data to use for the table: primary or nested
    const tableEntityName =
      nestedRelation && nestedEntityName ? nestedEntityName : entityName;
    const relation = nestedRelation ?? primaryRelation;
    const data =
      nestedRelation && nestedRecords
        ? nestedRecords.length > 0
        ? nestedRecords
        : undefined
        : primaryRecords;

    const schema = getSchemaFromShortListBySchemaId(
      schemaReducer.shortList,
      relation?.schema?.id,
    );

    if (tableEntityName === 'File') {
      if (data) {
        return (
          <FileManagerOverview
            hideViewOptions={hideViewOptions}
            files={data}
            thumbnailSize={this.props.thumbnailSize}
            dataSource={this.parseDataSource(data, relation)}
            columns={this.parseColumns(data, relation)}
          />
        );
      } else {
        return (
          <div style={{padding:80}}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>No Files to show</span>}/>
          </div>
        )
      }
    } else {
      // for schema types we want to render the lists grouped by type

      if (schema && schema.types && schema.types.length > 0) {
        const recordTypes = data
          ? data.map((elem: DbRecordEntityTransform) => elem.type)
          : [];
        const filtered = schema.types.filter((elem: any) =>
          recordTypes.includes(elem.name),
        );

        if (relation && !data) {
          return this.associationDataTableInCard(
            `${tableEntityName}`,
            relation,
            [],
            undefined,
          );
        }

        return filtered.map((elem: SchemaTypeEntity) =>
          this.associationDataTableInCard(
            `${tableEntityName} (${elem.name})`,
            relation,
            data.filter(
              (record: DbRecordEntityTransform) => record.type === elem.name,
            ),
            elem,
          ),
        );
      } else {
        return this.associationDataTableInCard(
          title || tableEntityName,
          relation,
          data,
        );
      }
    }
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  shortListRecord: (params: IAddRecordToShortList) =>
    dispatch(addRecordToShortList(params)),
  getRecordById: (payload: IGetRecordById, cb: any) =>
    dispatch(getRecordByIdRequest(payload, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) =>
    dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getSchemaById: (payload: ISchemaById, cb: any) =>
    dispatch(getSchemaByIdRequest(payload, cb)),
  updateRecord: (params: any, cb: any) =>
    dispatch(updateRecordByIdRequest(params, cb)),
  getAssociationWithNestedEntities: (
    params: IGetRecordAssociationWithNestedEntites,
  ) => dispatch(getRecordAssociationWithNestedEntitiesRequest(params)),
});

export default connect(mapState, mapDispatch)(AssociationDataTable);
