import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal/Modal";
import { Table, Input } from "antd";
import { IdentityRbacRoleReducer } from "../../../../../core/identityRoles/store/reducer";
import {
  AssignRoleToRole, 
  assignRoleToRoleRequest, 
  getRolesDataRequest, 
  setAssignRolesModalVisible } from "../../../../../core/identityRoles/store/actions";
import { withRouter } from "react-router-dom";
import { searchString } from "../../../../../shared/utilities/searchHelpers";

const { Search } = Input;
interface Props {
  identityRbacRoleReducer: IdentityRbacRoleReducer,
  getRolesList: any,
  setModalVisible: any,
  match: any,
  assignRole: (params: AssignRoleToRole) => void;
}

interface State {
  selectedRowKeys: any[],
  searchKey: string
}
class AssignRolesToRoleModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if(prevProps.identityRbacRoleReducer.assignModalVisible !== this.props.identityRbacRoleReducer.assignModalVisible) {
      if(this.props.identityRbacRoleReducer.assignModalVisible) this.fetchData();
    }
  }

  fetchData() {
    const { getRolesList } = this.props;
    getRolesList();
  }

  onSelectChange = (selectedRowKeys: any) => {
    this.setState({ selectedRowKeys });
  };

  closemodal() {
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  assignRoleToRole() {
    const { assignRole, match } = this.props;
    assignRole({roleIds: this.state.selectedRowKeys, roleId: match.params.roleId})
  }

  setDisabledState(data: any) {
    const { identityRbacRoleReducer, match } = this.props
    let userRolesArray: any = [];
    userRolesArray = [match.params.roleId];
    identityRbacRoleReducer.rolesLinksList.forEach((element: any) => {
      userRolesArray.push(element.id)
    });
    if(userRolesArray.indexOf(data.id) > -1) {
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
    const { identityRbacRoleReducer } = this.props;
    const { selectedRowKeys } = this.state;
    const dataSource = identityRbacRoleReducer.list;
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
    const { identityRbacRoleReducer } = this.props;
    const columns = [
      { 
        title: 'Name', 
        dataIndex: 'name',
        defaultSortOrder: 'ascend' as 'descend' | 'ascend' | null,
        sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      },
      { 
        title: 'Description',
        dataIndex: 'description'
      }
    ];
    identityRbacRoleReducer?.list.forEach((element: any) => {
      element.key = element.id;
    });
    const { searchKey } = this.state;
    const dataSource = identityRbacRoleReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <Modal
        title={"Assign Roles to Role"}
        width={1000}
        visible={identityRbacRoleReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignRoleToRole()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch} style={{ width: 250, float: 'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,
            getCheckboxProps: (record: any) => ({
              disabled: this.setDisabledState(record)
            })
          }}
          loading={identityRbacRoleReducer.isRequesting}
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
    identityRbacRoleReducer: state.identityRbacRoleReducer,
});

const mapDispatch = (dispatch: any) => ({
  getRolesList: () => dispatch(getRolesDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignRolesModalVisible(visible)),
  assignRole: (params: AssignRoleToRole) => dispatch(assignRoleToRoleRequest(params))
});

export default withRouter(connect(mapState, mapDispatch)(AssignRolesToRoleModal));
