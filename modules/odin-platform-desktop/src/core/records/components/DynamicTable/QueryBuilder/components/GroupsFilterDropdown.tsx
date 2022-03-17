import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Select } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { SchemaReducerState } from '../../../../../schemas/store/reducer';
import { TableReducer } from '../../store/reducer';
import {
  setSearchQuery,
  resetQueryBuilderState,
  setQueryBuilderState,
} from '../store/actions';
import { getQueryBuilderReducer, IQueryBuilderByModuleAndEntityReducer, QueryBuilderReducer } from '../store/reducer';
import { parsePipelineFilterForQuery } from '../helpers/pipelineFilterParsers';
import { generateModuleAndEntityKeyFromProps, getSavedFilter } from '../../../../../../shared/utilities/searchHelpers';
import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import { IdentityGroupsReducer } from '../../../../../identityGroups/store/reducer';
import { getGroupsDataRequest } from '../../../../../identityGroups/store/actions';
import { parseGroupsFilterForQuery } from '../helpers/groupsFilterParsers';
import { hasPermissions } from '../../../../../../shared/permissions/rbacRules';

const { Option } = Select;

interface Props {
  schema: SchemaEntity | undefined,
  schemaReducer: SchemaReducerState,
  identityGroupsReducer: IdentityGroupsReducer,
  userReducer: any,
  queryBuilderReducer: QueryBuilderReducer,
  recordTableReducer: TableReducer,
  setBuilderState: (params: any) => {},
  configure:  (params: any) => {},
  getGroupsList: () => {},
}

interface State {
}

class GroupsFilterDropdown extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
    }
  }

  componentDidMount() {

    this.loadSavedQueries();
    this.loadGroupsFilters();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {

    if(prevProps.identityGroupsReducer.isRequesting !== this.props.identityGroupsReducer.isRequesting) {
       this.loadSavedQueries();
    }

  }

  private loadGroupsFilters() {
    const { getGroupsList } = this.props;
    getGroupsList();
  }

  private loadSavedQueries() {
    const { setBuilderState, schema, schemaReducer, recordTableReducer } = this.props;
    const savedFilter = getSavedFilter(schemaReducer, recordTableReducer, schema?.moduleName ?? '', schema?.entityName ?? '');

    if(!!savedFilter) {
      setBuilderState({
        formFields: savedFilter.formFields,
      });
      const filter = savedFilter.formFields.groupsFilters?.[0];
      if (filter) {
        this.applyFilters(filter.value, filter.valueAlias);
      }
    }
  }

  private renderGroupsFilterOptions() {
    const { identityGroupsReducer, userReducer, schema } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, schema?.moduleName, schema?.entityName);

    const groups: OrganizationUserGroupEntity[] = [];
    if (hasPermissions(userReducer, 'groups.assign')) {
      // use all groups if user has groups.assign permission
      groups.push(...identityGroupsReducer.list);
    } else {
      // otherwise use only current user groups
      groups.push(...userReducer.groups);
    }

    return <Select
      key='groups'
      mode='multiple'
      style={{ width: '100%' }}
      disabled={false}
      value={queryBuilderReducer.formFields.groupsFilters?.[0]?.value}
      onChange={(val, option) => {
        this.applyFilters(val, option?.map((op: any) => op?.children));
      }}
    >
      {groups.map((elem: OrganizationUserGroupEntity) => (
        <Option key={elem.id} value={elem.id ? elem.id.toString() : ''}>{elem.name}</Option>
      ))}

    </Select>
  };

  private applyFilters(values: string [] | null | undefined, valuesAliases: string[] | null | undefined) {
    const { configure, schema, setBuilderState } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, schema?.moduleName, schema?.entityName);
    const formFields = queryBuilderReducer.formFields;
    let queries = [];

    if((values && typeof values === 'string') || (Array.isArray(values) && values.length > 0)) {

      // add groups filter to query
      const groupsFilterForQuery = parseGroupsFilterForQuery(values);
      if (groupsFilterForQuery) {
        queries.push(groupsFilterForQuery);
      }

      // add groups filter to the query builder state
      const groupsFilter = {
        esPropPath: 'groups.id.keyword',
        condition: 'filter',
        value: values,
        valueAlias: valuesAliases,
      };
      setBuilderState({ formFields: { ...formFields, groupsFilters: [ groupsFilter ] } });

    } else {
      // remove groups filters from the query builder state
      setBuilderState({ formFields: { ...formFields, groupsFilters: [] } });
    }

    // add pipeline filter to query
    const pipelineFilterForQuery = parsePipelineFilterForQuery(formFields.pipelineFilters[0]?.value);
    if (pipelineFilterForQuery) {
      queries.push(pipelineFilterForQuery);
    }

    // add property filters to query
    formFields.propertyFilters.map(elem => queries.push(elem));

    // set search query
    configure({ schema: schema, query: queries, queryType: 'query_string' });
  }

  render() {
    const { identityGroupsReducer } = this.props;
    return (
      identityGroupsReducer.list.length > 0 &&
      <div style={{ margin: '10px', width: '95%' }}>
        {this.renderGroupsFilterOptions()}
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
  identityGroupsReducer: state.identityGroupsReducer,
  userReducer: state.userReducer,
  recordTableReducer: state.recordTableReducer,
});
const mapDispatch = (dispatch: any, ownProps: any) => ({
  reset: () => dispatch(resetQueryBuilderState(generateModuleAndEntityKeyFromProps(ownProps))),
  setBuilderState: (params: IQueryBuilderByModuleAndEntityReducer) => dispatch(setQueryBuilderState(generateModuleAndEntityKeyFromProps(ownProps), params)),
  configure: (params: any) => dispatch(setSearchQuery(generateModuleAndEntityKeyFromProps(ownProps), params)),
  getGroupsList: () => dispatch(getGroupsDataRequest()),
});
export default connect(mapState, mapDispatch)(GroupsFilterDropdown);
