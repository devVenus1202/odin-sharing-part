import { Modal, Table, Input } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { getRolesDataRequest, setAssignRolesModalVisible } from '../../../../../core/identityRoles/store/actions';
import { IdentityRbacRoleReducer } from '../../../../../core/identityRoles/store/reducer';
import { AssignRolesToUser, assignRolesToUserRequest } from '../../../../../core/identityUser/store/actions';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import { getUserFromShortListByUserId } from '../../../../../shared/utilities/identityHelpers';
import { searchString } from '../../../../../shared/utilities/searchHelpers';
const { Search } = Input;
interface Props {
  identityRbacRoleReducer: IdentityRbacRoleReducer,
  getRolesList: any,
  setModalVisible: any,
  identityUserReducer: IdentityUserReducer,
  match: any,
  assignRoles: any
}

interface State {
  selectedRowKeys: any[],
  searchKey: string
}

class AssignRoleToUserModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: ""
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { identityUserReducer, match } = this.props;
    if(prevProps.identityRbacRoleReducer.assignModalVisible !== this.props.identityRbacRoleReducer.assignModalVisible) {
      if(this.props.identityRbacRoleReducer.assignModalVisible) this.fetchData();
      // preselect roles if any
      let tempArr: any = [];
      const userId = match.params.userId;
      const user = getUserFromShortListByUserId(identityUserReducer.shortList, userId);
      user?.roles.forEach((element: any) => {
        tempArr.push(element.id);
        this.setState({
          selectedRowKeys: tempArr,
        })
      });
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

  assignRolesToUser() {
    const { assignRoles, match } = this.props;
    assignRoles({ roleIds: this.state.selectedRowKeys, id: match.params.userId })
  }

  onSearch = (e:any) => {
    this.setState({searchKey: e.target.value});
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
    const { searchKey, selectedRowKeys } = this.state;
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
        dataIndex: 'description',
      },
    ];
    identityRbacRoleReducer.list.forEach((element: any) => {
      element.key = element.id;
    });

    const dataSource = identityRbacRoleReducer.list;
    const filteredSource = dataSource.filter((item: any) => searchString(item.name, this.state.searchKey));

    return (
      <Modal
        title={'Assign Roles to User'}
        width={1000}
        visible={identityRbacRoleReducer?.assignModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignRolesToUser()}
      >
        <Search placeholder="Input search text" onChange={this.onSearch} style={{ width: 250, float:'right', marginBottom: 10 }} />
        <Table
          rowSelection={{
            type: 'checkbox',
            onSelect: (selectedRow: any, selected:boolean) => this.onSelectRow(selectedRow, selected),
            onSelectAll: (selected: boolean, selectedRows: any) => this.onSelectAll(selected, selectedRows),
            selectedRowKeys: this.state.selectedRowKeys,
          }}
          loading={identityRbacRoleReducer.isRequesting}
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
  identityRbacRoleReducer: state.identityRbacRoleReducer,
  identityUserReducer: state.identityUserReducer,
});

const mapDispatch = (dispatch: any) => ({
  getRolesList: () => dispatch(getRolesDataRequest()),
  setModalVisible: (visible: boolean) => dispatch(setAssignRolesModalVisible(visible)),
  assignRoles: (params: AssignRolesToUser) => dispatch(assignRolesToUserRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(AssignRoleToUserModal));
