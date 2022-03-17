import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { Card, Col, Tabs, Typography } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { getPipelineFromShortListBySchemaId } from '../../../../../shared/utilities/pipelineHelpers';
import {
  generateModuleAndEntityKeyFromProps,
  getSavedFilter,
  setSearchQuery,
  setSortQuery,
} from '../../../../../shared/utilities/searchHelpers';
import { getPipelinesByModuleAndEntity } from '../../../../pipelines/store/actions';
import { PipelineReducerState } from '../../../../pipelines/store/reducer';
import { SchemaReducerState } from '../../../../schemas/store/reducer';
import { searchRecordsRequest } from '../../../store/actions';
import { IRecordReducer } from '../../../store/reducer';
import { setTableConfig } from '../store/actions';
import { TableReducer } from '../store/reducer';
import DateFilters from './components/DateFilters';
import GroupsFilterDropdown from './components/GroupsFilterDropdown';
import PipelineFilterDropdown from './components/PipelineFilterDropdown';
import TablePropertiesFilter from './components/PropertyFilters';
import SearchButton from './components/SearchButton';
import TableColumnsFilter from './components/VisibilityFilters';
import { createElasticSearchFieldNames } from './helpers/recordFilterParsers';

import { resetQueryBuilderState, setQueryBuilderDefaultTab, setQueryBuilderState } from './store/actions';
import { getQueryBuilderReducer, IQueryBuilderByModuleAndEntityReducer, QueryBuilderReducer } from './store/reducer';

const { TabPane } = Tabs;
const { Title } = Typography;

interface Props {
  schema: SchemaEntity | undefined,
  pipelinesEnabled: boolean,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  pipelineReducer: PipelineReducerState,
  getPipelines: (params: { schema: SchemaEntity }) => {},
  queryBuilderReducer: QueryBuilderReducer,
  recordTableReducer: TableReducer,
  searchRecords: any,
  setFilterableProps: any,
  setBuilderState: (params: any) => {},
  reset: () => {},
  setQueryBuilderDefaultTab: (params: { activeKey: string }) => {},
}

class QueryBuilder extends React.Component<Props> {

  componentDidMount(): void {

    const { schema, setFilterableProps } = this.props;
    this.loadSavedQueries();

    createElasticSearchFieldNames(schema, setFilterableProps);

  }

  componentWillUnmount() {

    this.props.reset();

  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
    const { schema } = this.props;
    const prevQbr = getQueryBuilderReducer(prevProps.queryBuilderReducer, schema?.moduleName, schema?.entityName);
    const currentQbr = getQueryBuilderReducer(this.props.queryBuilderReducer, schema?.moduleName, schema?.entityName);
    if (prevQbr?.queries !== currentQbr?.queries) {

      this.fetchData();

    }

    // ODN-1524 preload associations schemas pipelines
    const { pipelineReducer, getPipelines } = this.props;
    if (prevProps.schema?.id !== this.props.schema?.id
      || prevProps.schema?.associations?.length !== this.props.schema?.associations?.length
    ) {
      schema?.associations?.forEach(association => {
        if (association.childSchema) {
          const pipeline = getPipelineFromShortListBySchemaId(pipelineReducer.shortList, association.childSchema.id);
          if (!pipeline) {
            getPipelines({ schema: association.childSchema });
          }
        }
      });
    }

  }

  private loadSavedQueries() {
    const { setBuilderState, schema, schemaReducer, recordTableReducer } = this.props;
    const savedFilter = getSavedFilter(
      schemaReducer,
      recordTableReducer,
      schema?.moduleName ?? '',
      schema?.entityName ?? '',
    );

    if (!!savedFilter) {
      setBuilderState(savedFilter);
    }

  }


  private fetchData() {
    const { schema, schemaReducer, recordReducer, searchRecords } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(
      this.props.queryBuilderReducer,
      schema?.moduleName,
      schema?.entityName,
    );

    if (schema) {

      searchRecords({
        schema: schema,
        searchQuery: {
          schemas: schema.id,
          terms: setSearchQuery(schemaReducer, recordReducer, schema.moduleName, schema.entityName),
          sort: setSortQuery(schemaReducer, recordReducer, schema.moduleName, schema.entityName),
          boolean: queryBuilderReducer.queries,
        },
      });

    }

  }

  render() {
    const { schema, pipelinesEnabled } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(
      this.props.queryBuilderReducer,
      schema?.moduleName,
      schema?.entityName,
    );

    return (
      queryBuilderReducer.isVisible &&
      <Col span={5}>
          <Card
              className="query-builder"
              bordered={false}
              style={{ height: 'calc(100vh - 300px)', overflow: 'hidden' }}
          >
              <Tabs
                  activeKey={queryBuilderReducer.activeKey}
                  onTabClick={activeKey => this.props.setQueryBuilderDefaultTab({ activeKey })}
              >
                  <TabPane tab="Show / Hide" key="1">
                      <div className="scroll-content">
                          <TableColumnsFilter moduleName={schema?.moduleName} entityName={schema?.entityName}/>
                      </div>
                  </TabPane>
                  <TabPane tab="Filters" key="2">
                      <div className="scroll-content" style={{ height: 'calc(100% - 52px)' }}>
                        {pipelinesEnabled && <div style={{ marginBottom: 24 }}>
                            <Title level={4}>Stage Filters</Title>
                            <PipelineFilterDropdown schema={schema}/>
                        </div>}
                          <div style={{ marginBottom: 24 }}>
                              <Title level={4}>Groups Filters</Title>
                              <GroupsFilterDropdown schema={schema}/>
                          </div>
                          <div style={{ marginBottom: 24 }}>
                              <Title level={4}>Date Filters</Title>
                              <DateFilters moduleName={schema?.moduleName} entityName={schema?.entityName}/>
                          </div>
                          <div style={{ marginBottom: 24 }}>
                              <Title level={4}>Property Filters</Title>
                              <TablePropertiesFilter moduleName={schema?.moduleName} entityName={schema?.entityName}/>
                          </div>
                      </div>
                      <SearchButton moduleName={schema?.moduleName} entityName={schema?.entityName}/>
                  </TabPane>
              </Tabs>
          </Card>
      </Col>
    );
  }
}

const mapState = (state: any) => ({
  queryBuilderReducer: state.queryBuilderReducer,
  recordTableReducer: state.recordTableReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  pipelineReducer: state.pipelineReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  setBuilderState: (params: IQueryBuilderByModuleAndEntityReducer) => dispatch(setQueryBuilderState(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
  setFilterableProps: (params: any) => dispatch(setTableConfig(params)),
  reset: () => dispatch(resetQueryBuilderState(generateModuleAndEntityKeyFromProps(ownProps))),
  searchRecords: (params: { schema: SchemaEntity, searchQuery: SearchQueryType }) => dispatch(searchRecordsRequest(
    params)),
  setQueryBuilderDefaultTab: (params: { activeKey: string }) => dispatch(setQueryBuilderDefaultTab(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
});

export default connect(mapState, mapDispatch)(QueryBuilder);
