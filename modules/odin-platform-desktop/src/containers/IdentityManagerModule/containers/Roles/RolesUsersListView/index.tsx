import { Button, Layout, PageHeader, Table, Row, Input, Space } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import { getRoleFromShortListByUserId } from '../../../../../shared/utilities/identityHelpers';
import { IdentityRbacRoleReducer } from '../../../../../core/identityRoles/store/reducer';
import AssignUsersToRoleModal from '../AssignUsersToRoleModal';
import InviteNewUserToRoleModal from '../InviteNewUserToRoleModal';
import GenerateRegistrationUrlModal from '../GenerateRegistrationUrlModal';
import { setAssignUserModalVisible, setInviteNewUserModalVisible, setGenerateRegistrationUrlModalVisible } from '../../../../../core/identityUser/store/actions';
import AssignGroupsToUsersModal from '../../Groups/AssignGroupsToUsersModal';
import { searchString } from '../../../../../shared/utilities/searchHelpers';

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';
const { Search } = Input;
interface Props {
  identityRbacRoleReducer: IdentityRbacRoleReducer;
  match: any;
  setAssingUserModalVisible: any;
  setInviteNewUserModalVisible: any;
  setGenerateRegistrationUrlModalVisible: any;
}

interface State {
  searchKey: string;
  selectedRowKeys: Array<any>;
  visibleAssignGroupsModal: boolean;
}
class RolesUsersListView extends React.Component<Props, State> {

  state = {
    searchKey: '',
    selectedRowKeys: [],
    visibleAssignGroupsModal: false
  }

  handleShowAssingRoleModal() {
    const { setAssingUserModalVisible } = this.props;
    setAssingUserModalVisible(true);
  }
  handleInviteNewUserModal() {
    const { setInviteNewUserModalVisible } = this.props;
    setInviteNewUserModalVisible(true);
  }
  handleGenerateRegistrationUrl() {
    const { setGenerateRegistrationUrlModalVisible } = this.props;
    setGenerateRegistrationUrlModalVisible(true);
  }

  handleAssignGroupsModal() {
    this.setState({visibleAssignGroupsModal:true})
  }
  onSearch = (e: any) => {
    this.setState({ searchKey: e.target.value })
  }

  onSelectRow = (selectedRow: any, selected: boolean) => {
    let newSelectedKeys = [];
    if (selected) {
      newSelectedKeys = [...new Set([...this.state.selectedRowKeys, selectedRow.key])];
    } else {
      newSelectedKeys = [...this.state.selectedRowKeys];
      const rowIndex = newSelectedKeys.findIndex((key:string) => key === selectedRow.key);
      if (rowIndex >= 0) {
        newSelectedKeys.splice(rowIndex, 1);
      }
    }
    this.setState({selectedRowKeys: newSelectedKeys})
  }

  onSelectAll = (selected: boolean, selectedRows: any) => {
    if (selected) {
      this.setState({selectedRowKeys: selectedRows.map((row: any) => row.key)})
    } else {
      this.setState({selectedRowKeys: []})
    }
  }

  renderRolesUsers() {
    const { identityRbacRoleReducer, match } = this.props;
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
    const roleId = match.params.roleId;
    const role = getRoleFromShortListByUserId(identityRbacRoleReducer.shortList, roleId);
    const dataSource = role?.users || [];
    dataSource.forEach((element: any) => {
      element.key = element.id;
    });
    const filteredSource = dataSource.filter((item: any) => {
      return searchString(item.firstname, this.state.searchKey) || searchString(item.lastname, this.state.searchKey) || searchString(item.email, this.state.searchKey);
    });

    return (
      <>
        <AssignUsersToRoleModal />
        <InviteNewUserToRoleModal />
        <GenerateRegistrationUrlModal />
        <AssignGroupsToUsersModal  
          visible={this.state.visibleAssignGroupsModal} 
          onClose={() => this.setState({ visibleAssignGroupsModal : false })}
          selectedUsers = {this.state.selectedRowKeys}
          />
        <PageHeader className="page-tool-bar">
          <Row style={{ justifyContent: 'space-between' }}>
            <div style={{ flex: 1, maxWidth: 400 }}>
              <Search placeholder="input search text(name or email)" onChange={this.onSearch} />
            </div>
            <Space>
              <Button type="primary" key="1" onClick={() => { this.handleGenerateRegistrationUrl() }}>Generate Registration URL</Button>
              <Button type="primary" key="2" onClick={() => { this.handleShowAssingRoleModal() }}>Add/Remove Users</Button>
              <Button type="default" key="3" onClick={() => { this.handleInviteNewUserModal() }}>Register New User</Button>
              <Button 
                type="default" 
                key="4" 
                onClick={() => { this.handleAssignGroupsModal() }}
                disabled={!this.state.selectedRowKeys.length}
              >Assign Groups</Button>
            </Space>
          </Row>
        </PageHeader>
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,
          }}
          size="small"
          loading={identityRbacRoleReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} dataSource={filteredSource} columns={columns} />
      </>
    );
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderRolesUsers()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
  identityRbacRoleReducer: state.identityRbacRoleReducer,
});

const mapDispatch = (dispatch: any) => ({
  setAssingUserModalVisible: (visible: boolean) => dispatch(setAssignUserModalVisible(visible)),
  setInviteNewUserModalVisible: (visible: boolean) => dispatch(setInviteNewUserModalVisible(visible)),
  setGenerateRegistrationUrlModalVisible: (visible: boolean) => dispatch(setGenerateRegistrationUrlModalVisible(visible))
});

export default withRouter(connect(mapState, mapDispatch)(RolesUsersListView));
