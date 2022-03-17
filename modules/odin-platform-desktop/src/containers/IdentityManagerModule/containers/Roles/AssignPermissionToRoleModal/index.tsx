import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal/Modal";
import { Table, Input } from "antd";
import { IdentityRbacRoleReducer } from "../../../../../core/identityRoles/store/reducer";
import { AssignPermissionsToRole, assignPermissionsToRoleRequest } from "../../../../../core/identityRoles/store/actions";
import { withRouter } from "react-router-dom";
import { getRoleFromShortListByUserId } from "../../../../../shared/utilities/identityHelpers";
import { getPermissionsDataRequest, setAssignPermissionsModalVisible } from "../../../../../core/identityPermissions/store/actions";
import { IdentityRbacPermissionReducer } from "../../../../../core/identityPermissions/store/reducer";

interface Props {
  identityRbacRoleReducer: IdentityRbacRoleReducer,
  getPermissionsList: any,
  setModalVisible: any,
  identityRbacPermissionReducer: IdentityRbacPermissionReducer,
  match: any,
  assignPermissions: any
}

interface State {
  selectedRowKeys: any[],
  searchKey: string,
}

const { Search } = Input;
class AssignPermissionToRoleModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { identityRbacRoleReducer, match } = this.props;
    if(prevProps.identityRbacPermissionReducer.assignModalVisible !== this.props.identityRbacPermissionReducer.assignModalVisible) {
      if(this.props.identityRbacPermissionReducer.assignModalVisible) this.fetchData();
      // preselect permissions if any
      let tempArr: any = [];
      const roleId = match.params.roleId;
      const role = getRoleFromShortListByUserId(identityRbacRoleReducer.shortList, roleId);
      role?.permissions?.forEach((element: any) => {
        tempArr.push(element.id);
        this.setState({
          selectedRowKeys: tempArr
        })
      });
      console.log("selectedRowKeys", tempArr);
    }
  }

  fetchData() {
    const { getPermissionsList } = this.props;
    getPermissionsList();
  }

  onSelectChange = (selectedRowKeys: any) => {
    const newSelectedKeys = [...new Set([...this.state.selectedRowKeys, ...selectedRowKeys])]

    this.setState({ selectedRowKeys: newSelectedKeys });
  };
  
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

  assignPermissionsToRole() {
    const { assignPermissions, match } = this.props;
    assignPermissions({permissionIds: this.state.selectedRowKeys, id: match.params.roleId})
  }

  onSearch = (e:any) => {
    this.setState({searchKey: e.target.value})
  }
  
  render() {
    const { identityRbacPermissionReducer } = this.props;
    const { searchKey } = this.state;
    const columns = [
      { 
        title: 'Name', 
        dataIndex: 'name',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.name.localeCompare(b.name)
      },
      { 
        title: 'Description',
        dataIndex: 'description'
      },
    ];
    identityRbacPermissionReducer?.list.forEach((element: any) => {
      element.key = element.id;
    });
    return (
      <Modal
        title={"Assign Permissions to Role"}
        width={1000}
        visible={identityRbacPermissionReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignPermissionsToRole()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch}  style={{ width: 250, float:'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            // onChange: (selectedRowKeys: any) => this.onSelectChange(selectedRowKeys),
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,

          }}
          loading={identityRbacPermissionReducer.isRequesting}
          scroll={{ y: "calc(100vh - 315px)" }}
          style={{ minHeight: "100%", width: "100%" }}
          size="small"
          dataSource={identityRbacPermissionReducer.list.filter(item => item.name.includes(searchKey))}
          columns={columns}
        ></Table>
      </Modal>
    );
  }
}

const mapState = (state: any) => ({
    identityRbacRoleReducer: state.identityRbacRoleReducer,
    identityRbacPermissionReducer: state.identityRbacPermissionReducer
});

const mapDispatch = (dispatch: any) => ({
  getPermissionsList: () => dispatch(getPermissionsDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignPermissionsModalVisible(visible)),
  assignPermissions: (params: AssignPermissionsToRole) => dispatch(assignPermissionsToRoleRequest(params))
});

export default withRouter(connect(mapState, mapDispatch)(AssignPermissionToRoleModal));
