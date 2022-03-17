import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal/Modal";
import { Table, Input  } from "antd";
import { IdentityUserReducer } from "../../../../../core/identityUser/store/reducer";
import { withRouter } from "react-router-dom";
import { getGroupFromShortListByGroupId } from "../../../../../shared/utilities/identityHelpers";
import { getUsersDataRequest, setAssignUserModalVisible } from "../../../../../core/identityUser/store/actions";
import { IdentityGroupsReducer } from "../../../../../core/identityGroups/store/reducer";
import { AssignUsersToGroup, assignUsersToGroupRequest } from "../../../../../core/identityGroups/store/actions";
import { searchString } from "../../../../../shared/utilities/searchHelpers";

const { Search } = Input;
interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  getUsersList: any,
  setModalVisible: any,
  identityUserReducer: IdentityUserReducer,
  match: any,
  assignUsers: any
}

interface State {
  selectedRowKeys: any[],
  searchKey: string
}

class AssignUsersToGroupModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { identityGroupsReducer, match } = this.props;
    if(prevProps.identityUserReducer.assignModalVisible !== this.props.identityUserReducer.assignModalVisible) {
      if(this.props.identityUserReducer.assignModalVisible) this.fetchData();
      // preselect users if any
      let tempArr: any = [];
      const groupId = match.params.groupId;
      const group = getGroupFromShortListByGroupId(identityGroupsReducer.shortList, groupId);
      group?.users?.forEach((element: any) => {
        tempArr.push(element.id);
        this.setState({
          selectedRowKeys: tempArr
        })
      });
    }
  }

  fetchData() {
    const { getUsersList } = this.props;
    getUsersList();
  }

  closemodal() {
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  assignUsersToGroup() {
    const { assignUsers, match } = this.props;
    assignUsers({userIds: this.state.selectedRowKeys, id: match.params.groupId})
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
    const { identityUserReducer } = this.props;
    const { selectedRowKeys } = this.state;
    const dataSource = identityUserReducer.list;
    const filteredSource = dataSource.filter((item: any) => {
      return searchString(item.firstname, this.state.searchKey) || searchString(item.lastname, this.state.searchKey) || searchString(item.email, this.state.searchKey);
    });    
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
    const { identityUserReducer } = this.props;
    const columns = [
      { 
        title: 'First Name', 
        dataIndex: 'firstname',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.firstname.localeCompare(b.firstname),
      },
      { 
        title: 'Last Name',
        dataIndex: 'lastname',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.lastname.localeCompare(b.lastname),
      },
      { 
        title: 'Email',
        dataIndex: 'email'
      },
      {
        title: 'Status',
        dataIndex: 'status'
      }
    ];
    identityUserReducer?.list.forEach((element: any) => {
      element.key = element.id;
    });
    const { searchKey } = this.state;
    const dataSource = identityUserReducer.list;
    const filteredSource = dataSource.filter((item: any) => {
      return searchString(item.firstname, this.state.searchKey) || searchString(item.lastname, this.state.searchKey) || searchString(item.email, this.state.searchKey);
    });
    return (
      <Modal
        title={"Assign Users to Group"}
        width={1000}
        visible={identityUserReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignUsersToGroup()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch} style={{ width: 250, float: 'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,

          }}
          loading={identityUserReducer.isRequesting}
          scroll={{ y: "calc(100vh - 315px)" }}
          style={{ minHeight: "100%", width: "100%" }}
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
    identityUserReducer: state.identityUserReducer
});

const mapDispatch = (dispatch: any) => ({
  getUsersList: () => dispatch(getUsersDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignUserModalVisible(visible)),
  assignUsers: (params: AssignUsersToGroup) => dispatch(assignUsersToGroupRequest(params))
});

export default withRouter(connect(mapState, mapDispatch)(AssignUsersToGroupModal));
