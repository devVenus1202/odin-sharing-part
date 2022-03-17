import { Button, Layout, PageHeader, Popconfirm, Table, Typography } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import {
  getGroupsLinksRequest,
  setAssignGroupsModalVisible,
  unassignGroupLinkRequest,
} from '../../../../../core/identityGroups/store/actions';
import { IdentityGroupsReducer } from '../../../../../core/identityGroups/store/reducer';
import AssignGroupsToGroupModal from '../AssignGroupsToGroupModal';

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';

interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  match: any,
  setModalVisible: any,
  getGroupsLinks: any,
  unassignGroup: any
}

class GroupsGroupsListView extends React.Component<Props> {

  componentDidMount() {
    this.fetchData();
  }

  fetchData() {

    const { getGroupsLinks, match } = this.props;
    const groupId = match.params.groupId;

    if (groupId) {
      getGroupsLinks({ groupId: groupId }, (result: any) => {
      });
    }

  }

  setAssignModalVisible() {
    const { setModalVisible } = this.props;
    setModalVisible(true);
  }

  handleUnassign(record: any) {
    const { unassignGroup, match } = this.props;
    unassignGroup({ groupId: match.params.groupId, roleToLinkId: record.id })
  }

  renderGroups() {
    const { identityGroupsReducer } = this.props;
    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        render: (text: any, record: any) => (
          <Link to={`/${IDENTITY_MANAGER_MODULE}/Groups/${record?.id}`} component={Typography.Link}>{record.name}</Link>
        ),
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        sorter: (a: any, b: any) => a.description.localeCompare(b.description),
      },
      {
        title: '',
        dataIndex: 'operation',
        render: (text: any, record: any) => (
          <Popconfirm title="Sure to delete?" onConfirm={() => this.handleUnassign(record)}>
            <Button danger key="2">Delete</Button>
          </Popconfirm>
        ),
      },
    ];

    const dataSource = identityGroupsReducer.groupsLinksList;
    return (
      <>
        <AssignGroupsToGroupModal/>
        <PageHeader
          extra={[
            <Button type="primary" key="1" onClick={() => {
              this.setAssignModalVisible()
            }}>Add Groups</Button>,
          ]}
        />
        <Table
          size="small"
          loading={identityGroupsReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 350px)' }}
          style={{ minHeight: '100%' }}
          pagination={false} dataSource={dataSource} columns={columns}/>
      </>
    );
  }

  render() {
    return (
      <Layout className="list-view">
        {this.renderGroups()}
      </Layout>
    );
  }
}

const mapState = (state: any) => ({
  identityGroupsReducer: state.identityGroupsReducer,
});

const mapDispatch = (dispatch: any) => ({
  setModalVisible: (visible: boolean) => dispatch(setAssignGroupsModalVisible(visible)),
  getGroupsLinks: (params: any) => dispatch(getGroupsLinksRequest(params)),
  unassignGroup: (params: any) => dispatch(unassignGroupLinkRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(GroupsGroupsListView));
