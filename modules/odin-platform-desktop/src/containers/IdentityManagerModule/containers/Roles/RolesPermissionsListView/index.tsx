import { Button, Layout, PageHeader, Table, Row, Input } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import { getRoleFromShortListByUserId } from '../../../../../shared/utilities/identityHelpers';
import { IdentityRbacRoleReducer } from '../../../../../core/identityRoles/store/reducer';
import AssignPermissionToRoleModal from '../AssignPermissionToRoleModal'
import { setAssignPermissionsModalVisible } from '../../../../../core/identityPermissions/store/actions';
import { searchString } from '../../../../../shared/utilities/searchHelpers';

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';
const { Search } = Input;

interface Props {
  identityRbacRoleReducer: IdentityRbacRoleReducer,
  match: any,
  setModalVisible: any
}

interface State {
  searchKey: string,
}

class RolesPermissionsListView extends React.Component<Props, State> {

  state = {
    searchKey: ''
  }

  setAssingRoleModalVisible() {
    const { setModalVisible } = this.props;
    setModalVisible(true);
  }

  onSearch = (e:any) => {
    this.setState({searchKey: e.target.value})
  }
  
  renderRolesPermissions() {
    const { identityRbacRoleReducer, match } = this.props;
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
    const roleId = match.params.roleId;
    const role = getRoleFromShortListByUserId(identityRbacRoleReducer.shortList, roleId);
    const dataSource = role?.permissions || [];
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <>
        <AssignPermissionToRoleModal />
        <PageHeader className="page-tool-bar">
          <Row style={{justifyContent: 'space-between'}}>
            <div style={{ flex: 1, maxWidth: 400 }}>
              <Search placeholder="input search text" onChange={this.onSearch} />
            </div>
            <Button type="primary" key="1" onClick={() => {this.setAssingRoleModalVisible()}}>Add/Remove Permissions</Button>
          </Row>
        </PageHeader>
        <Table
          size="small"
          loading={identityRbacRoleReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} dataSource={filteredSource} columns={columns}/>
      </>
    );
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderRolesPermissions()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
    identityRbacRoleReducer: state.identityRbacRoleReducer,
});

const mapDispatch = (dispatch: any) => ({
  setModalVisible: (visible: boolean) => dispatch(setAssignPermissionsModalVisible(visible))
});

export default withRouter(connect(mapState, mapDispatch)(RolesPermissionsListView));
