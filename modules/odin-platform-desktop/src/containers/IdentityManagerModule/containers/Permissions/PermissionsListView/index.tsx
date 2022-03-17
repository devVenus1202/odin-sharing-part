import { Button, Layout, PageHeader, Table, Row, Input } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { initializeSharedForm } from '../../../../../shared/components/FormModal/store/actions';
import { v4 as uuidv4 } from 'uuid';
import * as formFields from '../FormFields';
import FormModal, { FormReducerSubmitEvt } from '../../../../../shared/components/FormModal/FormModal';
import { SharedFormReducer } from '../../../../../shared/components/FormModal/store/reducer';
import { IdentityRbacPermissionReducer } from '../../../../../core/identityPermissions/store/reducer';
import { CreateNewPermission, createPermissionRequest, getPermissionsDataRequest } from '../../../../../core/identityPermissions/store/actions';
import { searchString } from '../../../../../shared/utilities/searchHelpers';

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';
const { Search } = Input;
interface Props {
  identityRbacPermissionReducer: IdentityRbacPermissionReducer,
  getPermissionsList: any,
  initializeForm: any,
  formReducer: SharedFormReducer,
  createNewPermission: (params: CreateNewPermission) => void
}

interface State {
  searchKey: string,
}

const uuid = uuidv4();

class PermissionsListView extends React.Component<Props, State> {
  state = {
    searchKey: ''
  }
  componentDidMount() {
    this.fetchData()
  }

  fetchData() {
    const { getPermissionsList } = this.props;
    getPermissionsList();
  }

  showCreateForm() {

    const { initializeForm } = this.props;

    initializeForm({
      showModal: true,
      formUUID: uuid,
      title: 'Create Permission',
      formFields: formFields.formFields,
      entityName: 'Permissions',
    })

  };

  handleFormSubmit(params: FormReducerSubmitEvt) {
    const { createNewPermission, formReducer } = this.props;

    if(params.data && !formReducer.isUpdateReq) {

      const body = {
        name: params.data.name,
        description: params.data.description,
        type: params.data.type
      };

      createNewPermission({ body })

    }
  }

  renderPermissions() {
    const { identityRbacPermissionReducer } = this.props;
    const columns = [
      { 
        title: 'Name', 
        dataIndex: 'name',
        key: 'name',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        render: (text: any, record: any) => (
          <Link to={`/${IDENTITY_MANAGER_MODULE}/Permissions/${record?.id}`}>{record.name}</Link>
        ),
      },
      { 
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        sorter: (a: any, b: any) => a.description.localeCompare(b.description),
      },
      { 
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        sorter: (a: any, b: any) => a.type.localeCompare(b.type),
      }
    ];
    const dataSource = identityRbacPermissionReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <>
        <FormModal
          formUUID={uuid}
          onSubmitEvent={(params: FormReducerSubmitEvt) => this.handleFormSubmit(params)}/>
        <PageHeader className="page-tool-bar">
          <Row style={{justifyContent: 'space-between'}}>
            <div style={{ flex: 1, maxWidth: 400 }}>
              <Search placeholder="input search text" onChange={this.onSearch} />
            </div>
            <Button type="primary" key="1" onClick={() => this.showCreateForm()}>New Permission</Button>
          </Row>
        </PageHeader>
        <Table
          size="small"
          loading={identityRbacPermissionReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} dataSource={filteredSource} columns={columns}/>
      </>
    );
  }

  onSearch = (e:any) => {
    this.setState({searchKey: e.target.value})
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderPermissions()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
  identityRbacPermissionReducer: state.identityRbacPermissionReducer,
  formReducer: state.formReducer,
});

const mapDispatch = (dispatch: any) => ({  
  getPermissionsList: () => dispatch(getPermissionsDataRequest()),
  initializeForm: (params: any) => dispatch(initializeSharedForm(params)),
  createNewPermission: (params: CreateNewPermission) => dispatch(createPermissionRequest(params)),
});

export default connect(mapState, mapDispatch)(PermissionsListView);
