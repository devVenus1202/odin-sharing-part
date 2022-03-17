import React from 'react';
import { Link } from 'react-router-dom';
import { Col, Layout, Row, Card, Table, Spin, Empty, Button, Space } from 'antd';
import { connect } from 'react-redux';

import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';

import { createCurrencyString } from '../../shared/utilities/currencyConverter';
import { timeAgo } from "../../shared/utilities/dateHelpers";
import { httpDelete, httpGet, httpPost, httpPut } from '../../shared/http/requests';

import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../shared/utilities/schemaHelpers';
import {
  addRecordToShortList,
  getRecordByIdRequest,
  IAddRecordToShortList,
  IGetRecordById,
  updateRecordByIdRequest,
} from '../../core/records/store/actions';
import { IRecordReducer } from '../../core/records/store/reducer';
import {
  getSchemaByIdRequest,
  getSchemaByModuleAndEntityRequest,
  ISchemaById,
  ISchemaByModuleAndEntity,
} from '../../core/schemas/store/actions';
import { SchemaReducerState } from '../../core/schemas/store/reducer';
import {
  getRecordAssociationWithNestedEntitiesRequest,
  IGetRecordAssociationWithNestedEntites,
} from '../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../core/recordsAssociations/store/reducer';
import './styles.scss';
const {
  PAYMENT_METHOD,
  INVOICE,
  ORDER,
  WORK_ORDER,
} = SchemaModuleEntityTypeEnums;

enum FormatterEnums {
  Currency = 'Currency',
  Date = 'Date',
  Status = 'Status',
  Stage = 'Stage'
}
type ColumnType = {
  [key: string]: any;
};
const columns: ColumnType = {
  [ORDER]: [{ key: 'TotalPrice', label: 'Price', cols: 4, formatter: 'Currency' }, { key: 'IssuedDate', label: 'Issued Date', cols: 3, formatter: 'Date' }, { key: 'Stage', label: 'Stage', cols: 2, formatter: 'Stage' }],
  [INVOICE]: [{ key: 'TotalDue', label: 'Amount', cols: 4, formatter: 'Currency' }, { key: 'IssuedDate', cols: 3, formatter: 'Date', label: 'Issued Date' }, { key: 'Status', cols: 2, formatter: 'Status', label: 'Status' }],
  [PAYMENT_METHOD]: [{ key: 'BankAccountNumberEnding', label: 'Bank Account Number Ending ', cols: 5 }, { key: 'BankAccountId', label: 'Bank Id', cols: 4 }, { key: 'Status', cols: 3, formatter: 'Status', label: 'Status' }],
  [WORK_ORDER]: [{ key: 'Stage', cols: 2, formatter: 'Stage', label: 'Stage' }]
}
interface Props {
  userReducer: any;
  title?: string;
  expandable?: any;
  moduleName: string;
  entityName: any;
  nestedEntityName?: string;
  ignoreRelatedAssociationIdForNested?: boolean;
  record: DbRecordEntityTransform;
  schemaReducer: SchemaReducerState;
  recordReducer: IRecordReducer;
  recordAssociationReducer: IRecordAssociationsReducer;
  updateRecord: any;
  hidden?: string[];
  filters?: string[];
  isCreateHidden?: boolean;
  thumbnailSize?: number; // 8, 12, 24
  hideViewOptions?: boolean;
  fetchFunction?: string;
  fetchParams?: any;
  onClickAction? :any;
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => {};
  getSchemaById: (params: ISchemaById, cb: any) => {};
  getAssociationWithNestedEntities: (
    params: IGetRecordAssociationWithNestedEntites,
  ) => {};
  shortListRecord: (params: IAddRecordToShortList) => {};
  getRecordById: (payload: IGetRecordById, cb: any) => {};
  sortRecords?: (records: DbRecordEntityTransform[]) => DbRecordEntityTransform[];
  filterFunction?: (item: any) => {}
}
interface State {
  loading?: boolean;
  localData?: DbRecordEntityTransform[];
}
class DataGrid extends React.Component<Props, State> {
  timer: NodeJS.Timeout | undefined;

  constructor(props: Props) {
    super(props);

    this.state = {
      loading: false,
      localData : []
    };
  }
  componentDidMount() {
    if (this.props.fetchFunction === 'lookup') {
      this.lookupRecords();
    } else {
      this.getRecordAssociations();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (
      prevProps.record?.id !== this.props.record?.id &&
      !this.props.recordAssociationReducer.isRequesting
    ) {
      if (this.props.fetchFunction === 'lookup') {
        this.lookupRecords();
      } else {
        this.getRecordAssociations();
      }
    }
  }

  formatter(data: any, key: string, formatterType: string) {
    if (formatterType === FormatterEnums.Currency) {
      return `${createCurrencyString(data.properties['CurrencyCode'], data.properties[key])}`
    } else if (formatterType === FormatterEnums.Date) {
      return `${timeAgo(new Date(data.properties[key]))}`
    } else if (formatterType === FormatterEnums.Stage) {
      return data.stage.name;
    }
    return data.properties[key]
  }

  lookupRecords() {
    const url = `SchemaModule/v1.0/db/lookup`;
    const { fetchParams } = this.props;
    this.setState({loading: true})
    httpPost(url, fetchParams).then((res: any) => {
      this.setState({loading: false});
      this.setState({localData: res.data.data})
    })
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
          nestedEntities: nestedEntityName ? [nestedEntityName] : [],
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
              nestedEntities: nestedEntityName ? [nestedEntityName] : [],
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

  associationDataTableInCard(
    title: string,
    relation: DbRecordAssociationRecordsTransform,
    data: DbRecordEntityTransform[],
    schemaType?: SchemaTypeEntity,
  ) {
    const {
      entityName,
      moduleName,
      expandable,
      record,
      hidden,
      isCreateHidden,
      recordAssociationReducer
    } = this.props;

    const {loading} = this.state;
    return (
      <div className="association-data-table-wrapper">
        <Spin spinning={recordAssociationReducer.isRequesting || loading}>
        <Card
          size="small"
          title={
            <>
              <div>{title}</div>
              <div className={'rows-num'}> Total: {data ? data.length : 0}</div>
            </>}
        >
        {data && data.length ? 
          <>
            <Row className={'data-grid-item'}>
              <Col className={'table-header'} xs={24} md={8}>Record#</Col>
              {columns[entityName].map((p: any) => <Col key={p.label} className={'table-header'} flex={1} md={p.cols}>{p.label}</Col>)}
            </Row>
            {data ? (
              data.map((item: any) => {
                return <Row className={'data-grid-item'}>
                  <Col xs={24} md={8} className="title">
                    <Space size={16}>
                      <Link to={`${moduleName}/${entityName}/${item.id}`}>{item.recordNumber || item.title}</Link>
                      {entityName === PAYMENT_METHOD && <Button type="primary" onClick={() => this.props.onClickAction(item)}>Change</Button>}
                    </Space>
                  </Col>
                  {columns[entityName].map((p: any) => <Col flex={1} md={p.cols}>{this.formatter(item, p.key, p.formatter)}</Col>)}
                </Row>
              })
            ) : (
              <></>
            )}
          </>
          :
          <Empty style={{margin: '20px'}}/>
        }
        </Card>
        </Spin>
        
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
      fetchFunction
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
    } else {
      // for schema types we want to render the lists grouped by type

      if (schema && schema.types && schema.types.length > 0 && fetchFunction !== 'lookup') {
        const recordTypes = data
          ? data.map((elem: DbRecordEntityTransform) => elem.type)
          : [];
        const filtered = schema.types.filter((elem: any) =>
          recordTypes.includes(elem.name),
        );

        if (relation && !data) {
          return this.associationDataTableInCard(
            title || `${tableEntityName}`,
            relation,
            [],
            undefined,
          );
        }

        return filtered.map((elem: SchemaTypeEntity) =>
          this.associationDataTableInCard(
            `${title || tableEntityName} (${elem.name})`,
            relation,
            data.filter(
              (record: DbRecordEntityTransform) => {
                if (this.props.filterFunction) {
                  return record.type === elem.name && this.props.filterFunction(record);
                }
                return record.type === elem.name;
              },
            ),
            elem,
          ),
        );
      } else if(fetchFunction === 'lookup'){
        const {localData} = this.state;
        return this.associationDataTableInCard(
          title || tableEntityName,
          relation,
          localData || [],
        );
      } 
      else {
        if (this.props.filterFunction && data) {
          return this.associationDataTableInCard(
            title || tableEntityName,
            relation,
            data.filter(this.props.filterFunction),
          );
        }
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

export default connect(mapState, mapDispatch)(DataGrid);
