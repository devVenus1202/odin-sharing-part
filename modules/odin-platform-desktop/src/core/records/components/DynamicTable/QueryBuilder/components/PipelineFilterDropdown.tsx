import { PipelineEntity } from '@d19n/models/dist/schema-manager/pipeline/pipeline.entity';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Select } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { generateModuleAndEntityKeyFromProps, getSavedFilter } from '../../../../../../shared/utilities/searchHelpers';
import { getPipelinesByModuleAndEntity, setPipelineReducerState } from '../../../../../pipelines/store/actions';
import { PipelineReducerState } from '../../../../../pipelines/store/reducer';
import { SchemaReducerState } from '../../../../../schemas/store/reducer';
import { TableReducer } from '../../store/reducer';
import { parseGroupsFilterForQuery } from '../helpers/groupsFilterParsers';
import { parsePipelineFilterForQuery } from '../helpers/pipelineFilterParsers';
import {
  resetQueryBuilderState,
  setQueryBuilderFormFields,
  setQueryBuilderState,
  setSearchQuery,
} from '../store/actions';
import { getQueryBuilderReducer, IQueryBuilderByModuleAndEntityReducer, QueryBuilderReducer } from '../store/reducer';

const { Option } = Select;

interface Props {
  schema: SchemaEntity | undefined,
  schemaReducer: SchemaReducerState,
  pipelineReducer: PipelineReducerState,
  queryBuilderReducer: QueryBuilderReducer,
  recordTableReducer: TableReducer,
  setBuilderState: (params: any) => {},
  getPipelines: any,
  setPipelineState: any,
  configure: (params: any) => {},
}

interface State {
  isAllSelected: boolean,
}

const sortColumns = (stage1: PipelineStageEntity, stage2: PipelineStageEntity) => {
  if (stage1.position && stage2.position) {
    return stage1.position - stage2.position;
  } else {
    return 0;
  }
};

class PipelineFilterDropdown extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      isAllSelected: false,
    }
  }

  componentDidMount() {

    this.loadSavedQueries();
    this.loadPipelineFilters();

  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {

    if (prevProps.pipelineReducer.isRequesting !== this.props.pipelineReducer.isRequesting) {

      this.loadSavedQueries();
    }

  }

  private loadPipelineFilters() {

    const { getPipelines, schema } = this.props;
    console.log('schema', schema);
    if (schema) {
      getPipelines({ schema: schema });
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
    console.log('pipeline_savedFilter', savedFilter);

    if (!!savedFilter) {
      setBuilderState({
        formFields: savedFilter.formFields,
      });
      if (savedFilter.formFields.pipelineFilters) {
        const filter = savedFilter.formFields.pipelineFilters[0];
        if (filter) {
          this.applyFilters(filter.value);
          this.selectedPipelineFromStages(filter.value);
        }
      }
    }
  }

  private selectedPipelineFromStages(stages: string[] | null | undefined) {
    const { pipelineReducer, setPipelineState } = this.props;
    if (stages) {
      const pipeline = pipelineReducer.list.find((elem: PipelineEntity) => elem.stages && elem.stages.find(elem => stages.some(
        stage => elem.id === stage || elem.key === stage)));
      setPipelineState({ selected: pipeline });
    }
  }

  private renderStageFilterOptions() {
    const { pipelineReducer, schema } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(
      this.props.queryBuilderReducer,
      schema?.moduleName,
      schema?.entityName,
    );
    return <Select
      key="stage"
      mode="multiple"
      defaultValue={[ '' ]}
      style={{ width: '100%' }}
      disabled={false}
      value={queryBuilderReducer.formFields?.pipelineFilters?.[0]?.value || [ '' ]}
      onChange={(val) => this.applyFilters(val)}
    >
      {pipelineReducer?.selected?.stages.sort((
        stage1: PipelineStageEntity,
        stage2: PipelineStageEntity,
      ) => sortColumns(
        stage1,
        stage2,
      )).map((elem: PipelineStageEntity) => (
        <Option key={elem.key} value={elem.key ? elem.key.toString() : ''}>{elem.name}</Option>
      ))}
      <Option key="1" value={''}>All stages</Option>

    </Select>
  };

  private applyFilters(stages: string [] | null | undefined) {
    const { configure, schema, setBuilderState } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(
      this.props.queryBuilderReducer,
      schema?.moduleName,
      schema?.entityName,
    );
    const formFields = queryBuilderReducer.formFields;
    let queries = [];

    if ((stages && typeof stages === 'string') || (stages && Array.isArray(stages) && (stages[0] || (stages.length > 1)))) {

      // add pipeline filter to query
      const pipelineFilterForQuery = parsePipelineFilterForQuery(stages);
      if (pipelineFilterForQuery) {
        queries.push(pipelineFilterForQuery);
      }

      // add pipeline filter to the query builder state
      const pipelineFilter = {
        esPropPath: 'stage.key.keyword',
        condition: 'filter',
        value: stages,
      };
      setBuilderState({ formFields: { ...formFields, pipelineFilters: [ pipelineFilter ] } });

    } else {
      // remove pipeline filters from the query builder state
      setBuilderState({ formFields: { ...formFields, pipelineFilters: [] } });
    }

    // add groups filter to query
    const groupsFilterForQuery = parseGroupsFilterForQuery(formFields?.groupsFilters?.[0]?.value);
    if (groupsFilterForQuery) {
      queries.push(groupsFilterForQuery);
    }

    // add property filters to query
    formFields.propertyFilters.map(elem => queries.push(elem));

    // set search query
    configure({ schema: schema, query: queries, queryType: 'query_string' });
  }

  render() {
    const { pipelineReducer } = this.props;
    return (
      pipelineReducer.list.length > 0 &&
      <div style={{ margin: '10px', width: '95%' }}>
        {this.renderStageFilterOptions()}
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
  pipelineReducer: state.pipelineReducer,
  recordTableReducer: state.recordTableReducer,
});
const mapDispatch = (dispatch: any, ownProps: any) => ({
  reset: () => dispatch(resetQueryBuilderState(generateModuleAndEntityKeyFromProps(ownProps))),
  setBuilderState: (params: IQueryBuilderByModuleAndEntityReducer) => dispatch(setQueryBuilderState(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
  configure: (params: any) => dispatch(setSearchQuery(generateModuleAndEntityKeyFromProps(ownProps), params)),
  setFormFields: (params: any) => dispatch(setQueryBuilderFormFields(
    generateModuleAndEntityKeyFromProps(ownProps),
    params,
  )),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  setPipelineState: (params: PipelineReducerState) => dispatch(setPipelineReducerState(params)),
});
export default connect(mapState, mapDispatch)(PipelineFilterDropdown);
