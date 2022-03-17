import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Layout, PageHeader } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import Error403 from '../../../../shared/pages/403';
import { canUserSearchRecord } from '../../../../shared/permissions/rbacRules'
import { getPipelineFromShortListByModuleAndEntity } from '../../../../shared/utilities/pipelineHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import { generateFilterKey } from '../../../../shared/utilities/searchHelpers';
import { updateUserRolesAndPermissionsRequest } from '../../../identity/store/actions';
import { getPipelinesByModuleAndEntity } from '../../../pipelines/store/actions';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../schemas/store/actions';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { resetRecordsList } from '../../store/actions';
import { IRecordReducer } from '../../store/reducer';
import DataTable from '../DynamicTable';
import TableRecordActions from '../DynamicTable/components/TableRecordActions';
import { getQueryBuilderReducer, QueryBuilderReducer } from '../DynamicTable/QueryBuilder/store/reducer';
import { resetTableState, saveTableFilters } from '../DynamicTable/store/actions';
import RecordSearch from '../Search';
import ViewManager from './ViewManager';

type PathParams = {
  url: string,
  entityName: string
}

type PropsType = RouteComponentProps<PathParams> & {

  moduleName: string,
  entityName?: string,
  userReducer?: Object,
  schemaReducer: SchemaReducerState;
  recordReducer: IRecordReducer;
  queryBuilderReducer: QueryBuilderReducer
  recordTableReducer: any,
  saveFilter: any,
  getSchema: any,
  resetRecordState: any,
  resetTableReducer: any,
  pipelinesEnabled?: boolean,
  updateUserRolesAndPermissions: any,
  match: any,
  pipelineReducer: any,
  getPipelines: any
}

interface State {
  entityName: string | undefined
}

class RecordListView extends React.Component<PropsType, State> {


  constructor(props: PropsType) {
    super(props);

    this.state = {
      entityName: undefined,
    }
  }

  // Load schema
  componentDidMount(): void {

    const { match, entityName } = this.props;

    this.loadSchema();
    this.fetchUserPermissions();

    console.log('match', match)
    console.log('match.params', match.params)

    this.setState({
      entityName: match.params.entityName || entityName,
    })

  }

  fetchUserPermissions() {
    const { updateUserRolesAndPermissions } = this.props;
    updateUserRolesAndPermissions();
  }

  componentDidUpdate(prevProps: Readonly<PropsType>, prevState: Readonly<State>, snapshot?: any) {
    const { moduleName } = this.props;
    const { entityName } = this.state;

    if (prevProps.entityName !== this.props.entityName) {
      this.loadSchema();
    }

    if (prevProps.match.params.entityName !== this.props.match.params.entityName) {
      this.loadSchema();
    }

    if (prevProps.recordTableReducer.columns !== this.props.recordTableReducer.columns) {
      this.saveTableFilters();
    }

    if (prevProps.recordReducer.searchQuery !== this.props.recordReducer.searchQuery) {
      this.saveTableFilters();
    }

    const prevQbr = getQueryBuilderReducer(prevProps.queryBuilderReducer, moduleName, entityName);
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);
    if (prevQbr.queries !== queryBuilderReducer.queries) {
      this.saveTableFilters();
    }

    if (prevQbr.dateRangeFilters !== queryBuilderReducer.dateRangeFilters) {
      this.saveTableFilters();
    }

    if (prevQbr.formFields !== queryBuilderReducer.formFields) {
      this.saveTableFilters();
    }

  }

  loadSchema() {
    const { getSchema, moduleName, entityName, resetTableReducer, match } = this.props;

    this.setState({
      entityName: match.params.entityName || entityName,
    })

    console.log('list_view', moduleName, match.params.entityName)
    // get schema by module and entity and save it to the local state
    this.props.resetRecordState();

    if (match.params.entityName || entityName) {
      getSchema({ moduleName, entityName: match.params.entityName || entityName, withAssociations: true }, () => {
        this.loadPipelines();
      });
      resetTableReducer();
    }
  }

  loadPipelines() {
    const { getPipelines, moduleName, entityName, match, schemaReducer } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      moduleName,
      match.params.entityName || entityName,
    );
    if (schema) {
      getPipelines(schema);
    }
  }

  private saveTableFilters() {

    const { moduleName, recordReducer, schemaReducer, recordTableReducer, saveFilter } = this.props;
    const { entityName } = this.state;

    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    if (!schemaReducer.isRequesting && !recordReducer.isSearching) {

      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

      if (schema) {
        const name = generateFilterKey(schema.moduleName, schema.entityName);
        saveFilter(name, {
          search: recordReducer.searchQuery,
          columns: recordTableReducer.columns,
          queryBuilder: queryBuilderReducer,
        });
      }
    }
  }


  render() {
    const { schemaReducer, pipelinesEnabled, moduleName, userReducer, pipelineReducer } = this.props;
    const { entityName } = this.state;

    console.log('ENTITY_NAME', entityName)

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    let pipelinesEnabledInTable = false;
    if (pipelinesEnabled === undefined) {
      if (pipelineReducer.list.length > 0)
        pipelinesEnabledInTable = !!getPipelineFromShortListByModuleAndEntity(
          pipelineReducer.shortList,
          moduleName,
          entityName,
        );
      else
        pipelinesEnabledInTable = false;
    } else {
      pipelinesEnabledInTable = pipelinesEnabled;
    }

    console.log('pipelinesEnabledInTable', pipelinesEnabledInTable);
    if (schema && userReducer && !canUserSearchRecord(userReducer, schema)) {

      return <Error403/>

    } else {

      return (
        <Layout className="list-view">

          <PageHeader
            style={{ border: '1px solid #dadada' }}
            className="page-header"
            title={entityName}
            subTitle={<ViewManager moduleName={moduleName} entityName={entityName}/>}
            extra={[ <TableRecordActions key={1} schema={schema}/> ]}
          >
            <RecordSearch moduleName={moduleName} entityName={entityName}/>
          </PageHeader>

          <div className="list-view-table">
            <DataTable
              schema={schema}
              moduleName={moduleName}
              entityName={entityName}
              pipelinesEnabled={pipelinesEnabledInTable}/>
          </div>

        </Layout>
      )
    }
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  queryBuilderReducer: state.queryBuilderReducer,
  pipelineReducer: state.pipelineReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (params: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(params, cb)),
  saveFilter: (name: string, params: any) => dispatch(saveTableFilters(name, params)),
  resetRecordState: () => dispatch(resetRecordsList()),
  resetTableReducer: () => dispatch(resetTableState()),
  updateUserRolesAndPermissions: () => dispatch(updateUserRolesAndPermissionsRequest()),
  getPipelines: (params: SchemaEntity) => dispatch(getPipelinesByModuleAndEntity({ schema: params })),
});


export default withRouter(connect(mapState, mapDispatch)(RecordListView));
