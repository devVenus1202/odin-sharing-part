import { Modal, Table, Input } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { getGroupsDataRequest, setAssignGroupsModalVisible } from '../../../../../core/identityGroups/store/actions';
import { IdentityGroupsReducer } from '../../../../../core/identityGroups/store/reducer';
import { AssignGroupsToUser, assignGroupsToUserRequest } from '../../../../../core/identityUser/store/actions';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import { getUserFromShortListByUserId } from '../../../../../shared/utilities/identityHelpers';
import { searchString } from '../../../../../shared/utilities/searchHelpers';

const { Search } = Input;

interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  getGroupsList: any,
  setModalVisible: any,
  identityUserReducer: IdentityUserReducer,
  match: any,
  assignGroups: any
}

interface State {
  selectedRowKeys: any[],
  searchKey: string
}

class AssignGroupToUserModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { identityUserReducer, match } = this.props;
    if (prevProps.identityGroupsReducer.assignModalVisible !== this.props.identityGroupsReducer.assignModalVisible) {
      if (this.props.identityGroupsReducer.assignModalVisible) this.fetchData();
      // preselect groups if any
      let tempArr: any = [];
      const userId = match.params.userId;
      const user = getUserFromShortListByUserId(identityUserReducer.shortList, userId);
      user?.groups.forEach((element: any) => {
        tempArr.push(element.id);
        this.setState({
          selectedRowKeys: tempArr,
        })
      });
    }
  }

  fetchData() {
    const { getGroupsList } = this.props;
    getGroupsList();
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

  closemodal() {
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  assignGroupsToUser() {
    const { assignGroups, match } = this.props;
    assignGroups({ groupIds: this.state.selectedRowKeys, id: match.params.userId })
  }

  onSearch = (e: any) => {
    this.setState({ searchKey: e.target.value });
  }

  render() {
    const { identityGroupsReducer } = this.props;
    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      },
      {
        title: 'Description',
        dataIndex: 'description',
      },
      {
        title: 'Groups',
        dataIndex: 'groups',
      },
    ];
    identityGroupsReducer.list.forEach((element: any) => {
      element.key = element.id;
    });

    const { searchKey } = this.state;
    const dataSource = identityGroupsReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <Modal
        title={'Assign Groups to User'}
        width={1000}
        visible={identityGroupsReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignGroupsToUser()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch} style={{ width: 250, float: 'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,
          }}
          loading={identityGroupsReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 315px)' }}
          style={{ minHeight: '100%', width: '100%' }}
          size="small"
          dataSource={filteredSource}
          columns={columns}
        ></Table>
      </Modal>
    );
  }
}

const mapState = (state: any) => ({
  identityGroupsReducer: state.identityGroupsReducer,
  identityUserReducer: state.identityUserReducer,
});

const mapDispatch = (dispatch: any) => ({
  getGroupsList: () => dispatch(getGroupsDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignGroupsModalVisible(visible)),
  assignGroups: (params: AssignGroupsToUser) => dispatch(assignGroupsToUserRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(AssignGroupToUserModal));
