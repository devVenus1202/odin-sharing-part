import { Button, Layout, PageHeader, Table, Input, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { CreateNewUser, createUserRequest, getUsersDataRequest } from '../../../../../core/identityUser/store/actions';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import FormModal, { FormReducerSubmitEvt } from '../../../../../shared/components/FormModal/FormModal';
import { initializeSharedForm } from '../../../../../shared/components/FormModal/store/actions';
import { SharedFormReducer } from '../../../../../shared/components/FormModal/store/reducer';
import { searchString } from '../../../../../shared/utilities/searchHelpers';
import * as formFields from '../FormFields';
const { Search } = Input;

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';

interface Props {
  identityUserReducer: IdentityUserReducer,
  getUsersList: any,
  initializeForm: any,
  formReducer: SharedFormReducer,
  createNewUser: (params: CreateNewUser) => void
}

interface State {
  searchKey: string,
}
const uuid = uuidv4();

class UsersListView extends React.Component<Props, State> {
  state = {
    searchKey: ''
  }
  componentDidMount() {
    this.fetchData()
  }

  fetchData() {
    const { getUsersList } = this.props;
    getUsersList();
  }

  showCreateForm() {

    const { initializeForm } = this.props;

    initializeForm({
      showModal: true,
      formUUID: uuid,
      title: 'Create User',
      formFields: formFields.formFields,
      entityName: 'User',
    })

  };

  handleFormSubmit(params: FormReducerSubmitEvt) {
    const { createNewUser, formReducer } = this.props;

    if(params.data && !formReducer.isUpdateReq) {

      const body = {
        firstname: params.data.firstname,
        lastname: params.data.lastname,
        email: params.data.email,
        password: params.data.password,
      };

      createNewUser({ body })

    }
  }

  onSearch = (e:any) => {
    this.setState({searchKey: e.target.value})
  }

  renderUsers() {
    const { identityUserReducer } = this.props;

    const columns = [
      {
        title: 'First Name',
        dataIndex: 'firstname',
        key: 'firstname',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.firstname.localeCompare(b.firstname),
        render: (text: any, record: any) => (
          <Link to={`/${IDENTITY_MANAGER_MODULE}/Users/${record?.id}`}>{record.firstname}</Link>
        ),
      },
      {
        title: 'Last Name',
        dataIndex: 'lastname',
        key: 'lastname',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.lastname.localeCompare(b.lastname),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        sorter: (a: any, b: any) => a.email.localeCompare(b.email),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        sorter: (a: any, b: any) => a.status.localeCompare(b.status),
      },
    ];
    const dataSource = identityUserReducer.list;
    const filteredUsers = dataSource.filter((item: any) => {
      return searchString(item.firstname, this.state.searchKey) || searchString(item.lastname, this.state.searchKey) || searchString(item.email, this.state.searchKey);
    });

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
            <Button type="primary" key="1" onClick={() => this.showCreateForm()}>New User</Button>
          </Row>
        </PageHeader>
        
        <Table
          size="small"
          loading={identityUserReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} dataSource={filteredUsers} columns={columns}/>
      </>
    );
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderUsers()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
  identityUserReducer: state.identityUserReducer,
  formReducer: state.formReducer,
});

const mapDispatch = (dispatch: any) => ({
  getUsersList: () => dispatch(getUsersDataRequest()),
  initializeForm: (params: any) => dispatch(initializeSharedForm(params)),
  createNewUser: (params: CreateNewUser) => dispatch(createUserRequest(params)),
});

export default connect(mapState, mapDispatch)(UsersListView);
