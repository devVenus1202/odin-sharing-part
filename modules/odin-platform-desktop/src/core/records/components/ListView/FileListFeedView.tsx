import { Button, Col, Divider, Layout, PageHeader, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import Error403 from '../../../../shared/pages/403';
import { canUserSearchRecord } from '../../../../shared/permissions/rbacRules'
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import { generateFilterKey } from '../../../../shared/utilities/searchHelpers';
import { updateUserRolesAndPermissionsRequest } from '../../../identity/store/actions';
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
import { AppstoreOutlined, MenuOutlined } from "@ant-design/icons";
import FileFeed from "../Files/FileFeed";

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

}

interface State {
  entityName: string | undefined,
  fileView: 'LIST' | 'FEED'
}

class FileListFeedView extends React.Component<PropsType, State> {


  constructor(props: PropsType) {
    super(props);

    this.state = {
      entityName: undefined,
      fileView: 'LIST'
    }
  }


  // Load schema
  componentDidMount(): void {

    const { match, entityName } = this.props;

    this.loadSchema();
    this.fetchUserPermissions();

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

    // get schema by module and entity and save it to the local state
    this.props.resetRecordState();

    if (match.params.entityName || entityName) {
      getSchema({ moduleName, entityName: match.params.entityName || entityName, withAssociations: true });
      resetTableReducer();
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
    const { schemaReducer, pipelinesEnabled, moduleName, userReducer } = this.props;
    const { entityName } = this.state;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    if (schema && userReducer && !canUserSearchRecord(userReducer, schema)) {

      return <Error403/>

    } else {
      
      return (
        <Layout className="list-view" style={{ overflowY: 'auto' }}>
          <PageHeader
            style={{ border: '1px solid #dadada' }}
            className="page-header"
            title={entityName}
            subTitle={<ViewManager moduleName={moduleName} entityName={entityName}/>}
            extra={[ <TableRecordActions key={1} schema={schema}/> ]}
          >
            <RecordSearch moduleName={moduleName} entityName={entityName}/>

            {
              entityName === 'File' ?
                <Row>
                  <Col span={24} style={{ textAlign: 'center' }}>

                    <Button
                      type="primary"
                      ghost={this.state.fileView === 'FEED'}
                      onClick={() => this.setState({ fileView: 'LIST' })}
                      style={{ marginRight: 10 }}
                    >
                      <MenuOutlined/>
                    </Button>

                    <Button
                      type="primary"
                      ghost={this.state.fileView === 'LIST'}
                      onClick={() => this.setState({ fileView: 'FEED' })}
                    >
                      <AppstoreOutlined/>
                    </Button>

                  </Col>
                </Row>
                : <></>
            }

          </PageHeader>

          {/* FEED */}
          <div className="list-view-table" style={{ display: this.state.fileView === 'FEED' ? 'block' : 'none', marginBottom:20 }}>
            <FileFeed
              displayed={this.state.fileView}
              schema={schema}
              moduleName={moduleName}
              entityName={entityName}
            />
          </div>

          {/* LIST */}
          <div className="list-view-table" style={{ display: this.state.fileView === 'LIST' ? 'block' : 'none' }}>
            <DataTable
              schema={schema!}
              moduleName={moduleName!}
              entityName={entityName!}
              pipelinesEnabled={pipelinesEnabled}
            />
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
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (params: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(params)),
  saveFilter: (name: string, params: any) => dispatch(saveTableFilters(name, params)),
  resetRecordState: () => dispatch(resetRecordsList()),
  resetTableReducer: () => dispatch(resetTableState()),
  updateUserRolesAndPermissions: () => dispatch(updateUserRolesAndPermissionsRequest()),
});


export default withRouter(connect(mapState, mapDispatch)(FileListFeedView));
