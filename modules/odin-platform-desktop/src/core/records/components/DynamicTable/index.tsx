import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { Col, Row, Table } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { canUserGetRecord } from '../../../../shared/permissions/rbacRules';
import { getRecordListFromShortListById } from '../../../../shared/utilities/recordHelpers';
import {
  getElasticSearchKeysFromSchemaColumn,
  getSchemaFromShortListByModuleAndEntity,
} from '../../../../shared/utilities/schemaHelpers';
import { generateFilterKey, generateModuleAndEntityKeyFromProps } from '../../../../shared/utilities/searchHelpers';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import {
  addRecordToShortList,
  getRecordByIdRequest,
  IAddRecordToShortList,
  IGetRecordById,
  searchRecordsRequest,
  setDbRecordSearchQuery,
} from '../../store/actions';
import { IRecordReducer } from '../../store/reducer';
import { formatDbRecordListColumns } from './helpers/configureColumns';
import { formatDbRecordListData } from './helpers/configureRows';
import QueryBuilderCard from './QueryBuilder';
import { setQueryBuilderState } from './QueryBuilder/store/actions';
import { getQueryBuilderReducer, QueryBuilderReducer } from './QueryBuilder/store/reducer';
import {
  bulkSelectTableRows,
  resetTableState,
  selectTableRow,
  setTableColumns,
  setTableConfig,
  setTableData,
} from './store/actions';
import { TableReducer } from './store/reducer';

interface PathParamsType {
}

// Your component own properties
type Props = RouteComponentProps<PathParamsType> & {
  userReducer: any,
  schema: SchemaEntity | undefined,
  moduleName: string,
  entityName: string,
  searchRecords: any,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  queryBuilderReducer: QueryBuilderReducer,
  resetTable: any,
  pipelinesEnabled?: boolean
  selectRow: any,
  bulkSelectRows: any,
  maxHeight?: number
  setQueryBuilder: (params: any) => {},
  setColumns: any,
  setData: any,
  setFilterableProps: any,
  shortListRecord: (params: IAddRecordToShortList) => {},
  getRecordById: (payload: IGetRecordById, cb: any) => {},
  match?: any
}


class DataTable extends React.Component<Props> {


  componentDidMount(): void {

    const { setColumns, setData } = this.props;

    setColumns([]);
    setData([]);
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
    if (prevProps.schemaReducer.isRequesting !== this.props.schemaReducer.isRequesting) {
      this.initializeTable();
    }
    if (prevProps.recordReducer.isSearching !== this.props.recordReducer.isSearching) {
      this.initializeTable();
    }
    const isRequestingPrev = prevProps.schemaReducer.isRequestingByEntity ? prevProps.schemaReducer.isRequestingByEntity[this.props.entityName] : prevProps.schemaReducer.isRequesting;
    const isRequestingCurrent = this.props.schemaReducer.isRequestingByEntity ? this.props.schemaReducer.isRequestingByEntity[this.props.entityName] : this.props.schemaReducer.isRequesting;
    if (isRequestingPrev !== isRequestingCurrent) {
      this.initializeTable();
    }
  }

  private initializeTable() {
    const {
      pipelinesEnabled,
      recordReducer,
      schemaReducer,
      setColumns,
      setData,
      setFilterableProps,
      moduleName,
      entityName,
      shortListRecord,
      getRecordById,
      userReducer,
    } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    if (schema) {

      let columns;
      let data;

      const listView = this.loadListView();

      if (listView) {
        setDbRecordSearchQuery({ searchQuery: listView.search });
      }

      const defaultColumns = getElasticSearchKeysFromSchemaColumn(schema);

      // Set the columns from the schema
      if (schema.id) {
        columns = formatDbRecordListColumns(
          schema,
          listView?.columns ? listView.columns : defaultColumns,
          getRecordListFromShortListById(recordReducer.list, schema.id),
          pipelinesEnabled,
          shortListRecord,
          getRecordById,
          undefined,
          undefined,
          canUserGetRecord(userReducer, schema),
          userReducer,
        );

        setColumns(columns);
      }

      // Form record lists into table rows and filterable columns
      const { tableRows, filterableCols } = formatDbRecordListData(
        schema,
        getRecordListFromShortListById(recordReducer.list, schema && schema.id ? schema.id : ''),
        pipelinesEnabled,
        true,
      );

      data = tableRows ? tableRows : [];
      // only set filter props if there is data
      if (data && data.length > 0) {
        setData(data);
        setFilterableProps({ filterableColumns: filterableCols });
      } else {
        setData([])
      }
    }
  }

  private loadListView() {
    const { recordTableReducer, moduleName, entityName } = this.props;
    const name = generateFilterKey(moduleName, entityName);
    const listView = recordTableReducer.listViews ? recordTableReducer.listViews[name] : undefined;
    if (!!listView && listView.columns.length > 0) {
      return listView;
    } else {
      return undefined;
    }
  }

  handleTableChange(pagination: any, localSort: any, colChange: any) {
    const { searchRecords, recordReducer, moduleName, entityName, schemaReducer } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    if (!!pagination || !!localSort || !!colChange) {

      if (!!recordReducer.searchQuery && schema) {

        // @ts-ignore
        const searchQuery = recordReducer.searchQuery[schema.id];

        searchRecords({
          schema: schema,
          searchQuery: {
            terms: searchQuery ? searchQuery.terms : '',
            schemas: schema.id,
            boolean: queryBuilderReducer.queries,
            pageable: {
              page: pagination.current,
              size: pagination.pageSize,
            },
            sort: !!colChange.field && !!colChange.column ? [
              this.setSortQuery(colChange),
            ] : searchQuery ? searchQuery.sort : undefined,
          },
        });
      }
    }
  }

  private setSortQuery(colChange: any) {

    if (colChange.column) {

      if (!colChange.column.columnType) {
        colChange.column.columnType = 'TEXT';
      }

      if ([
        'EMAIL',
        'PHONE_NUMBER',
        'PHONE_NUMBER_E164_GB',
        'NUMBER',
        'PERCENT',
        'TEXT',
        'TEXT_LONG',
        'ENUM',
      ].includes(
        colChange.column.columnType)) {


        if (colChange.field === 'stageName') {
          colChange.field = 'stage.name';
        }

        return {
          [`${colChange.field}.keyword`]: colChange.order === 'ascend' ? 'asc' : 'desc',
        }
      } else if ([ 'dbRecords.properties' ].includes(colChange.field)) {
        return {
          [`${colChange.field}`]: colChange.order === 'ascend' ? 'asc' : 'desc',
        }
      } else {
        return {
          [`${colChange.field}`]: colChange.order === 'ascend' ? 'asc' : 'desc',
        }
      }
    }
  }

  private handleRowSelection(selectedRowKeys: any) {
    const { bulkSelectRows, selectRow } = this.props;
    if (Array.isArray(selectedRowKeys)) {
      return bulkSelectRows(selectedRowKeys);
    }
    return selectRow(selectedRowKeys);
  }

  renderPagination() {
    const { recordReducer } = this.props;
    if (!!recordReducer.search) {
      return {
        current: recordReducer.search ? Number(recordReducer.search.pageable.page) + 1 : 1,
        pageSize: recordReducer.search ? Number(recordReducer.search.pageable.size) : 0,
        total: recordReducer.pageable ? Number(recordReducer.pageable.totalRecords) : 0,
      }
    }
  }

  render() {
    const { schemaReducer, recordReducer, recordTableReducer, maxHeight, schema, moduleName, entityName, pipelinesEnabled } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    return (
      <div>
        <Row>
          <Col span={queryBuilderReducer.isVisible ? 19 : 24}>
            <Table
              scroll={{ y: maxHeight ? maxHeight : 'calc(100vh - 340px)' }}
              style={{ minHeight: maxHeight ? maxHeight : '100%' }}
              size="small"
              // bordered
              loading={recordReducer.isSearching || schemaReducer.isRequesting}
              rowSelection={{
                type: 'checkbox',
                onChange: (selectedRowKeys: any) => this.handleRowSelection(selectedRowKeys),
                selectedRowKeys: recordTableReducer.selectedItems,
              }}
              onChange={(pagination, localSort, colChange) => this.handleTableChange(pagination, localSort, colChange)}
              columns={recordTableReducer.columns}
              dataSource={recordTableReducer.data}
              pagination={this.renderPagination()}
            />
          </Col>
          <QueryBuilderCard schema={schema} pipelinesEnabled={pipelinesEnabled}/>
        </Row>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  shortListRecord: (params: IAddRecordToShortList) => dispatch(addRecordToShortList(params)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  setQueryBuilder: (params: any) => dispatch(setQueryBuilderState(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
  resetTable: () => dispatch(resetTableState()),
  searchRecords: (params: { schema: SchemaEntity, searchQuery: SearchQueryType }) => dispatch(searchRecordsRequest(
    params)),
  selectRow: (row: string) => dispatch(selectTableRow(row)),
  bulkSelectRows: (rowKeys: string[]) => dispatch(bulkSelectTableRows(rowKeys)),
  setFilterableProps: (params: any) => dispatch(setTableConfig(params)),
  setColumns: (columns: any) => dispatch(setTableColumns(columns)),
  setData: (data: any) => dispatch(setTableData(data)),
  setDbRecordState: (params: any) => dispatch(setDbRecordSearchQuery(params)),
});

export default withRouter(connect(mapState, mapDispatch)(DataTable));
