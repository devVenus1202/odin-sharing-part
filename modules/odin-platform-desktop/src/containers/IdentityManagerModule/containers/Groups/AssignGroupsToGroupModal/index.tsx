import { Table, Input } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  AssignGroupToGroup,
  assignGroupToGroupsRequest,
  getGroupsDataRequest,
  setAssignGroupsModalVisible,
} from '../../../../../core/identityGroups/store/actions';
import { IdentityGroupsReducer } from '../../../../../core/identityGroups/store/reducer';
import { searchString } from '../../../../../shared/utilities/searchHelpers';

const { Search } = Input;

interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  getGroupsList: any,
  setModalVisible: any,
  match: any,
  assignGroup: (params: AssignGroupToGroup) => void;
}

interface State {
  selectedRowKeys: any[],
  searchKey: string
}

class AssignGroupsToGroupModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.identityGroupsReducer.assignModalVisible !== this.props.identityGroupsReducer.assignModalVisible) {
      if (this.props.identityGroupsReducer.assignModalVisible) this.fetchData();
    }
  }

  fetchData() {
    const { getGroupsList } = this.props;
    getGroupsList();
  }

  onSelectChange = (selectedRowKeys: any) => {
    this.setState({ selectedRowKeys });
  };

  closemodal() {
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  assignGroupsToGroup() {
    const { assignGroup, match } = this.props;
    assignGroup({ groupIds: this.state.selectedRowKeys, groupId: match.params.groupId })
  }

  setDisabledState(data: any) {
    const { identityGroupsReducer, match } = this.props
    let userGroupsArray: any = [];
    userGroupsArray = [ match.params.groupId ];
    identityGroupsReducer.groupsLinksList.forEach((element: any) => {
      userGroupsArray.push(element.id)
    });
    if (userGroupsArray.indexOf(data.id) > -1) {
      return true
    } else {
      return false
    }
  }

  onSearch = (e: any) => {
    this.setState({ searchKey: e.target.value });
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
    const { identityGroupsReducer } = this.props;
    const { searchKey, selectedRowKeys } = this.state;
    const dataSource = identityGroupsReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    if (selected) {
      if (filteredSource.length === dataSource.length) { // if nothing is filtered set all keys
        this.setState({selectedRowKeys: filteredSource.map((row:any) => row.key)})
      } else {
        filteredSource.forEach((row: any) => {
          if (!selectedRowKeys.includes(row.key)) {
            selectedRowKeys.push(row.key)
          }
        });
        this.setState({selectedRowKeys: [...selectedRowKeys]})
      }
    } else {
      if (filteredSource.length === dataSource.length) {  // if nothing is filtered remove all keys
        this.setState({selectedRowKeys: []})
      } else {
        filteredSource.forEach((row: any) => {
          const ind = selectedRowKeys.indexOf(row.key);
          if (ind >= 0) {
            selectedRowKeys.splice(ind, 1);
          }
        });
        this.setState({selectedRowKeys: [...selectedRowKeys]})
      }
    }
   
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
    ];
    identityGroupsReducer?.list.forEach((element: any) => {
      element.key = element.id;
    });
    const dataSource = identityGroupsReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <Modal
        title={'Assign Groups to Group'}
        width={1000}
        visible={identityGroupsReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignGroupsToGroup()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch} style={{ width: 250, float: 'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,
            getCheckboxProps: (record: any) => ({
              disabled: this.setDisabledState(record),
            }),
          }}
          loading={identityGroupsReducer.isRequesting}
          scroll={{ y: 'calc(100vh - 315px)' }}
          style={{ minHeight: '100%', width: '100%' }}
          size="small"
          dataSource={filteredSource}
          columns={columns}
        />
      </Modal>
    );
  }
}

const mapState = (state: any) => ({
  identityGroupsReducer: state.identityGroupsReducer,
});

const mapDispatch = (dispatch: any) => ({
  getGroupsList: () => dispatch(getGroupsDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignGroupsModalVisible(visible)),
  assignGroup: (params: AssignGroupToGroup) => dispatch(assignGroupToGroupsRequest(params)),
});

// @ts-ignore
export default withRouter(connect(mapState, mapDispatch)(AssignGroupsToGroupModal));
