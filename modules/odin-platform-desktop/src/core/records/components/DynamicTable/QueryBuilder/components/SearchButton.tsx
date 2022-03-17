import { SearchOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../../shared/utilities/schemaHelpers';
import { generateModuleAndEntityKeyFromProps } from '../../../../../../shared/utilities/searchHelpers';
import { SchemaReducerState } from '../../../../../schemas/store/reducer';
import { parseGroupsFilterForQuery } from '../helpers/groupsFilterParsers';
import { parsePipelineFilterForQuery } from '../helpers/pipelineFilterParsers';
import { setSearchQuery } from '../store/actions';
import { getQueryBuilderReducer } from '../store/reducer';
import '../styles.scss';

interface Props {
  moduleName: string | undefined,
  entityName: string | undefined,
  recordReducer: any,
  recordTableReducer: any,
  schemaReducer: SchemaReducerState,
  queryBuilderReducer: any,
  configure: (params: any) => {},
}

class SearchButton extends React.Component<Props> {
  constructor(props: any) {
    super(props);
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
    const { moduleName, entityName } = this.props;
    const prevQbr = getQueryBuilderReducer(prevProps.queryBuilderReducer, moduleName, entityName);
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    if (prevQbr.formFields.propertyFilters?.length > queryBuilderReducer.formFields.propertyFilters?.length) {
      this.applyFilters();
    }
  }

  private applyFilters() {
    const { configure, schemaReducer, moduleName, entityName } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);
    const formFields = queryBuilderReducer.formFields;
    let queries = [];

    // add pipeline filter to query
    const pipelineFilter = formFields.pipelineFilters.find((elem: any) => elem.esPropPath === 'stage.id' || elem.esPropPath === 'stage.key.keyword');
    const pipelineFilterForQuery = parsePipelineFilterForQuery(pipelineFilter?.value);
    if (pipelineFilterForQuery) {
      queries.push(pipelineFilterForQuery);
    }

    // add groups filter to query
    const groupsFilterForQuery = parseGroupsFilterForQuery(formFields.groupsFilters?.[0]?.value);
    if (groupsFilterForQuery) {
      queries.push(groupsFilterForQuery);
    }

    // add property filters to query
    queries.push(...formFields.propertyFilters);

    // set search query
    if(moduleName && entityName) {
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
      configure({ schema: schema, query: queries, queryType: 'query_string' });
    }
  }

  render() {
    const { moduleName, entityName } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);
    return (
      <div style={{ margin: '10px' }}>
        <Button
          key="2"
          icon={<SearchOutlined/>}
          style={{ width: '100%' }}
          type="primary"
          onClick={() => this.applyFilters()}
        >
          Search
        </Button>
      </div>
    )
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  configure: (params: any) => dispatch(setSearchQuery(generateModuleAndEntityKeyFromProps(ownProps), params)),
});

export default connect(mapState, mapDispatch)(SearchButton);
