import { DeleteOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { httpDelete, httpGet } from '../../../../shared/http/requests';
import { displayMessage } from '../../../../shared/system/messages/store/reducers';
import history from '../../../../shared/utilities/browserHisory';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import {
  generateFilterKey,
  generateModuleAndEntityKeyFromProps,
  getSavedFilter,
} from '../../../../shared/utilities/searchHelpers';
import { ISearchRecords, searchRecordsRequest, setDbRecordSearchQuery } from '../../store/actions';
import { IRecordReducer } from '../../store/reducer';
import { setQueryBuilderState } from '../DynamicTable/QueryBuilder/store/actions';
import { IQueryBuilderByModuleAndEntityReducer } from '../DynamicTable/QueryBuilder/store/reducer';
import { saveTableFilters, setTableColumns } from '../DynamicTable/store/actions';


interface Props {
  moduleName: string,
  entityName: string,
  schemaReducer: any,
  recordReducer: IRecordReducer,
  recordTableReducer: any,
  initQueryBuilder: (params: any) => {},
  initSearchQuery: any,
  initTableColumns: any,
  updateTableListView: any,
  searchRecords: any,
  alertMessage: any,
}

interface State {
  isLoading: boolean,
  views: any[],
  selected: any
}

class ViewManager extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      isLoading: false,
      views: [],
      selected: undefined,
    }
  }

  componentDidMount() {
    this.initializeListView();
    this.loadLists()
  }


  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {

    if(prevProps.entityName !== this.props.entityName) {
      // this.loadLists();
      // this.resetState();
    }

    if(prevState.views !== this.state.views) {
      this.initializeListView();
    }

    if(prevState.selected !== this.state.selected) {
      this.applyView();
    }
  }

  resetState() {

    const urlNoHash = window.location.href.substr(0, window.location.href.indexOf('#'))

    window.location.href = urlNoHash;

    this.setState({
      isLoading: false,
      views: [],
      selected: undefined,
    });

  }


  private async initializeListView() {
    const { views } = this.state;
    if(history.location.hash) {
      console.log('history.location.hash', history.location.hash);
      console.log('views', views);
      const viewKey = history.location.hash.replace('#View_', '');
      await this.getViewByKey(viewKey);
      console.log('viewKey', viewKey);
    } else {
      this.applyView();
    }
  }

  async getViewByKey(viewKey: string) {
    const { moduleName } = this.props;
    this.setState({
      isLoading: true,
    });
    await httpGet(
      `${moduleName}/v1.0/views/byKey/${viewKey}`,
    ).then(res => {
      console.log('GET_VIEW', res);

      this.setState({
        isLoading: false,
        selected: res.data.data,
      });

      this.applyView();

    }).catch(err => {

      const error = err.response ? err.response.data : undefined;

      this.setState({
        isLoading: false,
        selected: undefined,
      });

      console.error(error);

    });
  };

  async loadLists() {

    const { moduleName, entityName } = this.props;

    this.setState({
      isLoading: true,
    });

    console.log('LOAD_LISTS', moduleName, entityName)

    await httpGet(
      `${moduleName}/v1.0/views/byModule/${moduleName}/${entityName}`,
    ).then(res => {

      this.setState({
        isLoading: false,
        views: res.data.data,
      });

    }).catch(err => {

      const error = err.response ? err.response.data : undefined;
      this.setState({
        isLoading: false,
        views: [],
      });
      console.error(error);
    });
  };

  async deleteList(viewId: string) {
    const { alertMessage, moduleName } = this.props;
    await httpDelete(
      `${moduleName}/v1.0/views/${viewId}`,
    ).then(res => {
      console.log(res);
      alertMessage({ body: 'view successfully deleted', type: 'success' });

    }).catch(err => {
      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error?.message || 'error deleting view', type: 'error' });
    });
  }

  applyView() {

    const { searchRecords, moduleName, entityName, schemaReducer, recordTableReducer, recordReducer, updateTableListView, initSearchQuery, initQueryBuilder, initTableColumns } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

    if(schema && this.state.selected) {

      console.log('APPLY_VIEW', this.state.selected.view);

      const name = generateFilterKey(schema.moduleName, schema.entityName);
      updateTableListView(name, {
        // @ts-ignore
        search: this.state.selected.view.search[schema.id],
        columns: this.state.selected.view.columns,
        queryBuilder: this.state.selected.view.queryBuilder,
      });
      // set the query builder reducer state
      initQueryBuilder(this.state.selected.view.queryBuilder);
      // set the table columns
      initTableColumns(this.state.selected.view.columns);
    } else if(schema) {
      // set the query builder reducer state
      const queryBuilder = getSavedFilter(schemaReducer, recordTableReducer, moduleName, entityName);

      console.log('applyView queryBuilder', queryBuilder);
      initQueryBuilder(queryBuilder);
    }
  }

  render() {
    const { moduleName, entityName } = this.props;

    return (
      <Dropdown
        trigger={[ 'click' ]}
        onVisibleChange={e => this.loadLists()}
        overlay={<Menu>
          {this.state.views && this.state.views.map(elem => (
            <Menu.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span onClick={() => {
                  this.setState({ selected: elem });
                  history.push(`#View_${elem.key}`);
                }}>{elem?.title}</span>
                <Tooltip title="delete">
                  <Button onClick={() => {
                    this.deleteList(elem.id)
                  }} type="primary" size="small" shape="circle" icon={<DeleteOutlined/>}/>
                </Tooltip>
              </div>
            </Menu.Item>
          ))}
        </Menu>}>
        {this.state.selected ?
          <a style={{ fontSize: 16 }}>{this.state.selected.title} <DownOutlined/></a>
          :
          <a style={{ fontSize: 16 }} className="ant-dropdown-link">
            List Views <DownOutlined/>
          </a>
        }
      </Dropdown>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  updateTableListView: (name: string, params: any) => dispatch(saveTableFilters(name, params)),
  initSearchQuery: (params: ISearchRecords) => dispatch(setDbRecordSearchQuery(params)),
  initQueryBuilder: (params: IQueryBuilderByModuleAndEntityReducer) => dispatch(
    setQueryBuilderState(generateModuleAndEntityKeyFromProps(ownProps), params),
  ),
  initTableColumns: (columns: any) => dispatch(setTableColumns(columns)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(ViewManager);
