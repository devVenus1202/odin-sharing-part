import { PlusOutlined, SwapRightOutlined } from '@ant-design/icons';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Input, Tag, Tooltip } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import {
  generateModuleAndEntityKeyFromProps,
  getDefaultFields,
  getSavedFilter,
  setSearchQuery,
  setSortQuery,
} from '../../../../shared/utilities/searchHelpers';
import { getPipelinesByModuleAndEntity } from '../../../pipelines/store/actions';
import { PipelineReducerState } from '../../../pipelines/store/reducer';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { ISearchRecords, resetRecordsList, searchRecordsRequest, setDbRecordSearchQuery } from '../../store/actions';
import { IRecordReducer } from '../../store/reducer';
import TableFilterActions from '../DynamicTable/components/TableFilterActions';
import {
  addFormField,
  removeFormField,
  setQueryBuilderDefaultTab,
  showQueryBuilder,
} from '../DynamicTable/QueryBuilder/store/actions';
import { QueryBuilderReducer } from '../DynamicTable/QueryBuilder/store/reducer';
import { TableReducer } from '../DynamicTable/store/reducer';


const { Search } = Input;

interface Props {
  moduleName: string,
  entityName: string,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  queryBuilderReducer: QueryBuilderReducer,
  pipelineReducer: PipelineReducerState,
  searchRecords: any,
  resetRecordState: any,
  setSearchQuery: any,
  noReset?: boolean,
  hideActionButtons?: boolean
  getPipelines: any,
  removeFormField: (UUID: string) => {},
  addFormField: () => {},
  showQueryBuilder: () => {},
  setQueryBuilderDefaultTab: (params: { activeKey: string }) => {},
  hideFilters?: boolean
}

class RecordSearch extends React.Component<Props> {

  componentDidMount() {
    const { noReset } = this.props;
    if(!noReset) this.props.resetRecordState();

    this.loadInitialList();
    this.loadPipelineFilters();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {

    if(prevProps.schemaReducer.isRequesting !== this.props.schemaReducer.isRequesting) {
      this.loadInitialList();
    }

    const isRequestingPrev = prevProps.schemaReducer.isRequestingByEntity ? prevProps.schemaReducer.isRequestingByEntity[this.props.entityName] : prevProps.schemaReducer.isRequesting;
    const isRequestingCurrent = this.props.schemaReducer.isRequestingByEntity ? this.props.schemaReducer.isRequestingByEntity[this.props.entityName] : this.props.schemaReducer.isRequesting;
    if(isRequestingPrev !== isRequestingCurrent) {
      this.loadInitialList();
    }
  }

  loadInitialList() {

    const { schemaReducer, recordTableReducer, recordReducer, moduleName, entityName, searchRecords } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    const savedFilter = getSavedFilter(schemaReducer, recordTableReducer, moduleName, entityName);

    const isSuccessful = schemaReducer.isSuccessfulByEntity ? schemaReducer.isSuccessfulByEntity[this.props.entityName] : schemaReducer.isSuccessful;

    console.log('isSuccessful', isSuccessful)

    if(schema && isSuccessful) {
      searchRecords({
        schema: schema,
        searchQuery: {
          terms: setSearchQuery(schemaReducer, recordReducer, moduleName, entityName),
          fields: getDefaultFields(schema, moduleName, entityName),
          schemas: schema.id,
          sort: setSortQuery(schemaReducer, recordReducer, moduleName, entityName),
          boolean: savedFilter?.queries,
        },
      });
    }
  }

  searchRecordOnChange(e: any) {
    const { schemaReducer, recordTableReducer, recordReducer, moduleName, entityName, searchRecords } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    const savedFilter = getSavedFilter(schemaReducer, recordTableReducer, moduleName, entityName);

    if(schema && e) {
      searchRecords({
        schema: schema,
        searchQuery: {
          terms: e.target.value,
          fields: getDefaultFields(schema, moduleName, entityName),
          schemas: schema.id,
          sort: setSortQuery(schemaReducer, recordReducer, moduleName, entityName),
          boolean: savedFilter?.queries,
        },
      });
    }
  }


  render() {
    const { schemaReducer, recordReducer, moduleName, entityName, hideActionButtons, hideFilters } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    return (
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {hideFilters ? <></> : <div style={{ maxWidth: '70%', display: 'flex', flexWrap: 'wrap' }}>
          {this.filterTags()}
        </div>}
        <div>
          {hideActionButtons ? <></> :
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <Search
                className="search-input"
                placeholder="search records"
                value={setSearchQuery(schemaReducer, recordReducer, moduleName, entityName)}
                loading={recordReducer.isRequesting}
                onChange={e => this.searchRecordOnChange(e)}
                onSearch={() => this.loadInitialList()}
              />
              {hideFilters ? <></> : <TableFilterActions schema={schema}/>}
            </div>}
        </div>
      </div>
    )
  }

  private loadPipelineFilters() {
    const { getPipelines, schemaReducer, moduleName, entityName } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    console.log('schema', schema);
    if(schema) {
      getPipelines({ schema: schema });
    }

  }

  private removeTag(filter: any) {
    this.props.removeFormField(filter.UUID)

  }

  private addNewFilter() {
    this.props.setQueryBuilderDefaultTab({ activeKey: '2' })
    this.props.showQueryBuilder()
    this.props.addFormField()

  }

  private getTagName(filter: any) {
    if(filter.type === 'property') {
      return `${filter.index === 0 ? '' : filter.andOr || 'AND '} ${filter.entityName}:${filter.property} ${filter.operator || '='} ${filter.valueAlias ?? filter.value}`;
    } else if(filter.type === 'groups') {
      return `Groups: ${filter.valueAlias}`;
    } else if(filter.type === 'dateRange') {
      let rangeName: string;
      switch (filter.property) {
        case 'createdAt':
          rangeName = 'Created:';
          break;
        case 'updatedAt':
          rangeName = 'Updated:';
          break;
        case 'stageUpdatedAt':
          rangeName = 'Stage updated:';
          break;
        case 'ServiceAppointment.dbRecords.properties.Date':
          rangeName = 'Service Appointment Date:';
          break;
        case 'properties.DueDate':
          rangeName = 'Due Date:';
          break;
        default:
          rangeName = 'Date range:';
          break;
      }
      return rangeName;
    }
    return filter
  }

  private filterTags() {
    const { schemaReducer, recordTableReducer, moduleName, entityName, pipelineReducer } = this.props;


    const savedFilter = getSavedFilter(schemaReducer, recordTableReducer, moduleName, entityName);

    let appliedFilters: any[] = []
    let stageFiltersString = 'All stages'
    if(savedFilter) {
      appliedFilters = savedFilter?.formFields?.propertyFilters?.map((filter: any, index: number) => {
        filter.type = 'property'
        filter.index = index
        return filter
      });
      if (savedFilter?.formFields?.groupsFilters?.length > 0) {
        for (const groupsFilter of savedFilter?.formFields?.groupsFilters) {
          if (groupsFilter.valueAlias) {
            let alias: string;
            if (Array.isArray(groupsFilter.valueAlias)) {
              alias = groupsFilter.valueAlias.join(', ');
            } else {
              alias = JSON.stringify(groupsFilter.valueAlias);
            }
            appliedFilters.unshift({
              type: 'groups',
              valueAlias: alias,
            });
          }
        }
      }
      if(savedFilter?.dateRangeFilters?.gte && savedFilter?.dateRangeFilters?.lte) {
        appliedFilters.unshift({
          type: 'dateRange',
          property: savedFilter?.dateRangeFilters?.property,
          start: savedFilter?.dateRangeFilters?.gte,
          end: savedFilter?.dateRangeFilters?.lte,
          rangeKey: savedFilter?.dateRangeFilters?.rangeKey,
        });
      }
      if(pipelineReducer?.list?.[0]?.stages) {

        const stageFilters: any = pipelineReducer?.list?.[0]?.stages?.filter((stage: any) => 
          savedFilter.formFields.pipelineFilters?.[0]?.value.some((val: any) => val === stage.key || val === stage.id)
        );

        const stageFiltersNames = stageFilters?.map((stage: any) => stage.name)

        if(savedFilter?.formFields?.pipelineFilters?.[0] && savedFilter?.formFields?.pipelineFilters?.[0]?.value) {
          savedFilter?.formFields?.pipelineFilters?.[0]?.value?.forEach((stage: string) => {
            if(!stage) {
              stageFiltersNames.unshift('All stages')
            }
          })
        }

        if (stageFiltersNames?.length < 1) {
          stageFiltersNames.unshift('All stages');
        }

        stageFiltersString = stageFiltersNames?.join('/')
      }
    }
    const filters = [
      ...appliedFilters,
    ]
    if(stageFiltersString) filters.unshift(stageFiltersString)

    return (
      <>
        {filters.map((filter, index) => {
          const tag = this.getTagName(filter)
          const isLongTag = tag.length > 30;
          const isDateRange = filter.type === 'dateRange';
          const isGroups = filter.type === 'groups';

          const tagElem = isDateRange ? (
            <Tag
              className="filter-tag"
              style={{ marginBottom: 15 }}
              key={index}
            >
              {tag} { filter.rangeKey ? <>{filter.rangeKey}</> : <>{filter.start} <SwapRightOutlined/> {filter.end}</> }
            </Tag>
          ) : (
            <Tag
              className="filter-tag"
              key={`${filter.id}_${index}`}
              closable={filter.type && !isGroups}
              onClose={() => this.removeTag(filter)}
              style={{ marginBottom: 15 }}
            >
              <span>
                {isLongTag && !isDateRange && !isGroups ? `${tag.slice(0, 20)}...` : tag}
              </span>
            </Tag>
          );
          return isLongTag && !isDateRange && !isGroups ? (
            <Tooltip title={tag} key={filter.id}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}

        <Tag className="site-tag-plus" style={{ marginBottom: 15 }}
             onClick={() => this.addNewFilter()}
        >
          <PlusOutlined/> New Filter
        </Tag>
      </>
    );

  }
}

const mapState = (state: any) => ({
  recordTableReducer: state.recordTableReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
  pipelineReducer: state.pipelineReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  setSearchQuery: (params: ISearchRecords) => dispatch(setDbRecordSearchQuery(params)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  resetRecordState: () => dispatch(resetRecordsList()),
  addFormField: () => dispatch(addFormField(generateModuleAndEntityKeyFromProps(ownProps))),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  removeFormField: (UUID: string) => dispatch(removeFormField(generateModuleAndEntityKeyFromProps(ownProps), UUID)),
  showQueryBuilder: () => dispatch(showQueryBuilder(generateModuleAndEntityKeyFromProps(ownProps))),
  setQueryBuilderDefaultTab: (params: { activeKey: string }) => dispatch(setQueryBuilderDefaultTab(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
});


export default connect(mapState, mapDispatch)(RecordSearch)
