import { Button, Layout, PageHeader, Table } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import { getGroupFromShortListByGroupId } from '../../../../../shared/utilities/identityHelpers';
import { setAssignUserModalVisible, setMoveUsersModalVisible } from '../../../../../core/identityUser/store/actions';
import { IdentityGroupsReducer } from '../../../../../core/identityGroups/store/reducer';
import AssignUsersToGroupModal from '../AssignUsersToGroupModal';
import MoveUsersToGroupModal from '../MoveUsersToGroupModal';
import { setSelectedGroupUsers } from '../../../../../core/identityGroups/store/actions';

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';

interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  match: any,
  setModalVisible: any,
  setMoveModalVisible: any,
  setSelectedUsers: any
}

interface State {
  selectedRowKeys: any[]
}

class GroupUsersListView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: []
    }
  }

  setAssingRoleModalVisible() {
    const { setModalVisible } = this.props;
    setModalVisible(true);
  }

  setMoveUsersModalVisiable() {
    const { setMoveModalVisible } = this.props;
    setMoveModalVisible(true);
  }

  onSelectChange = (selectedRowKeys: any) => {
    console.log("selectedRowKeys", selectedRowKeys);
    this.setState({ selectedRowKeys });
    this.props.setSelectedUsers(selectedRowKeys);
  };
  
  renderGroupUsers() {
    const { identityGroupsReducer, match } = this.props;
    const columns = [
      { 
        title: 'First Name', 
        dataIndex: 'firstname',
        key: 'firstname',
        sorter: (a: any, b: any) => a.firstname.localeCompare(b.firstname),
        render: (text: any, record: any) => (
          <Link to={`/${IDENTITY_MANAGER_MODULE}/Users/${record?.id}`}>{record.firstname}</Link>
        ),
      },
      { 
        title: 'Last Name', 
        dataIndex: 'lastname',
        key: 'lastname',
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
    const groupId = match.params.groupId;
    const group = getGroupFromShortListByGroupId(identityGroupsReducer.shortList, groupId);
    const dataSource = group?.users;
    dataSource?.forEach((element: any) => {
      element.key = element.id;
    });
    return (
      <>
        <AssignUsersToGroupModal />
        <MoveUsersToGroupModal />
        <PageHeader
          extra={[
            <Button type="primary" key="1" onClick={() => {this.setAssingRoleModalVisible()}}>Add/Remove Users</Button>,
            <Button type="primary" key="2" disabled={this.state.selectedRowKeys.length === 0} onClick={() => {this.setMoveUsersModalVisiable()}}>Move Users</Button>,
          ]}
        />
        <Table
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys: any) => this.onSelectChange(selectedRowKeys),
            selectedRowKeys: this.state.selectedRowKeys,
          }}
          size="small"
          loading={identityGroupsReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} 
          dataSource={dataSource} 
          columns={columns}/>
      </>
    );
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderGroupUsers()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
    identityGroupsReducer: state.identityGroupsReducer,
});

const mapDispatch = (dispatch: any) => ({
  setModalVisible: (visible: boolean) => dispatch(setAssignUserModalVisible(visible)),
  setMoveModalVisible: (visible: boolean) => dispatch(setMoveUsersModalVisible(visible)),
  setSelectedUsers: (selectedUsers: string[]) => dispatch(setSelectedGroupUsers(selectedUsers))
});

export default withRouter(connect(mapState, mapDispatch)(GroupUsersListView));
