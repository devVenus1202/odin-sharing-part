import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal/Modal";
import { Spin, Select, Form } from "antd";
import { FormInstance } from 'antd/lib/form';
import { IdentityUserReducer } from "../../../../../core/identityUser/store/reducer";
import { getGroupFromShortListByGroupId } from "../../../../../shared/utilities/identityHelpers";
import { getUsersDataRequest } from "../../../../../core/identityUser/store/actions";
import { IdentityGroupsReducer } from "../../../../../core/identityGroups/store/reducer";
import { BulkUpdateUsersGroups, bulkUpdateUsersRequest, getGroupsDataRequest } from "../../../../../core/identityGroups/store/actions";
import { hasPermissions } from '../../../../../shared/permissions/rbacRules';
import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';

const { Option } = Select;

interface Props {
  identityGroupsReducer: IdentityGroupsReducer;
  getUsersList: any;
  identityUserReducer: IdentityUserReducer;
  match: any;
  moveUsers: any;
  visible: boolean;
  selectedUsers: any;
  onClose: any;
  getGroupList: any;
  userReducer: any;
  alertMessage: any;
  bulkUpdateUsers: (params: BulkUpdateUsersGroups, cb: any) => {},
  schemaReducer: any;
}

interface State {
  selectedRowKeys: any[];
  searchKey: string;
  isRequesting: boolean;
  overrideGroups: Array<any>;
  addGroups: Array<any>;
  removeGroups: Array<any>;
}

class AssignGroupsToUsersModal extends React.Component<Props, State> {
  formRef = React.createRef<FormInstance>();
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: [],
      searchKey: "",
      isRequesting: false,
      overrideGroups: [],
      addGroups: [],
      removeGroups: []
    }
  }

  componentDidMount() {
    this.loadGroups()
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    const { identityGroupsReducer, match } = this.props;
    if(prevProps.identityUserReducer.moveUsersModalVisible !== this.props.identityUserReducer.moveUsersModalVisible) {
      if(this.props.identityUserReducer.moveUsersModalVisible) this.fetchData();
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

  onSelectChange = (selectedRowKeys: any) => {
    this.setState({ selectedRowKeys });
  };

  closemodal() {
    this.props.onClose(false);
  }

  assignUsersToGroups() {
    this.props.onClose(false);
    const { selectedUsers } = this.props;
    this.props.bulkUpdateUsers({
      overrideGroups: this.state.overrideGroups, 
      addGroups: this.state.addGroups,
      removeGroups: this.state.removeGroups,
      userIds: selectedUsers
    }, (res:any) => {
      console.log(res);
    })
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
    if (selected) {
      this.setState({selectedRowKeys: selectedRows.map((row: any) => row.key)})
    } else {
      this.setState({selectedRowKeys: []})
    }
  }

  private renderGroupsOptions() {
    const { identityGroupsReducer, userReducer } = this.props;

    const groups: OrganizationUserGroupEntity[] = [];
    if (hasPermissions(userReducer, 'groups.assign')) {
      // use all groups if user has groups.assign permission
      groups.push(...identityGroupsReducer.list);
    } else {
      // otherwise use only current user groups
      groups.push(...userReducer.groups);
    }
    
    return groups.map((elem: OrganizationUserGroupEntity) => (
      <Option key={elem.id} value={elem.id ? elem.id.toString() : ''}>{elem.name}</Option>
    ));
  }
  private handleOverrideGroupsChange(values: string[] | null | undefined, valuesAliases: string[] | null | undefined) {
    this.formRef.current?.setFieldsValue({
      addGroups: [],
      removeGroups: [],
    });
    this.setState({
      overrideGroups: values as string[],
      addGroups: [],
      removeGroups: [],
    });
    return;
  }

  private handleAddGroupsChange(values: string[] | null | undefined, valuesAliases: string[] | null | undefined) {
    this.formRef.current?.setFieldsValue({
      overrideGroups: [],
    });
    this.setState({
      overrideGroups: [],
      addGroups: values as string[],
    });
    return;
  }

  private handleRemoveGroupsChange(values: string[] | null | undefined, valuesAliases: string[] | null | undefined) {
    this.formRef.current?.setFieldsValue({
      overrideGroups: [],
    });
    this.setState({
      overrideGroups: [],
      removeGroups: values as string[],
    });
    return;
  }

  private loadGroups() {
    const { identityGroupsReducer, getGroupList } = this.props;
    if (identityGroupsReducer.list?.length < 1 && !identityGroupsReducer.isRequesting) {
      getGroupList();
    }
  }

  render() {
    const { identityUserReducer , identityGroupsReducer} = this.props;
    const columns = [
      { 
        title: 'Group', 
        dataIndex: 'name'
      },
      { 
        title: 'Description',
        dataIndex: 'description'
      }
    ];
    identityGroupsReducer?.list.forEach((element: any) => {
      element.key = element.id;
    });

    const { searchKey } = this.state;
    const dataSource = identityGroupsReducer.list;
    return (
      <Modal
        title={"Assign Groups To The Selected Users"}
        visible={this.props.visible}
        onCancel={() => this.closemodal()}
        onOk={() => this.assignUsersToGroups()}
      >
         <Spin spinning={this.state.isRequesting}>
            <Form
              ref={this.formRef}
              layout='vertical'
            >
              <Form.Item
                key='overrideGroups'
                name='overrideGroups'
                label='Override Groups'
                initialValue={[]}
                rules={[]}
              >
                <Select
                  key='overrideGroups'
                  mode='multiple'
                  style={{ width: 300 }}
                  disabled={false}
                  onChange={(val: string[], option) => {
                    this.handleOverrideGroupsChange(val, option?.map((op: any) => op?.children));
                  }}
                >
                  {this.renderGroupsOptions()}
                </Select>
              </Form.Item>

              <Form.Item
                key='addGroups'
                name='addGroups'
                label='Add Groups'
                initialValue={[]}
                rules={[]}
              >
                <Select
                  key='addGroups'
                  mode='multiple'
                  style={{ width: 300 }}
                  disabled={false}
                  onChange={(val: string[], option) => {
                    this.handleAddGroupsChange(val, option?.map((op: any) => op?.children));
                  }}
                >
                  {this.renderGroupsOptions()}
                </Select>
              </Form.Item>

              <Form.Item
                key='removeGroups'
                name='removeGroups'
                label='Remove Groups'
                initialValue={[]}
                rules={[]}
              >
                <Select
                  key='removeGroups'
                  mode='multiple'
                  style={{ width: 300 }}
                  disabled={false}
                  onChange={(val: string[], option) => {
                    this.handleRemoveGroupsChange(val, option?.map((op: any) => op?.children));
                  }}
                >
                  {this.renderGroupsOptions()}
                </Select>
              </Form.Item>
            </Form>
          </Spin>
      </Modal>
    );
  }
}

const mapState = (state: any, props: any) => ({
  identityGroupsReducer: state.identityGroupsReducer,
  identityUserReducer: state.identityUserReducer,
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
  ...props
});

const mapDispatch = (dispatch: any) => ({
  getUsersList: () => dispatch(getUsersDataRequest()),
  bulkUpdateUsers: (params: BulkUpdateUsersGroups, cb:any) => dispatch(bulkUpdateUsersRequest(params, cb)),
  getGroupList: () => dispatch(getGroupsDataRequest()),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});

export default connect(mapState, mapDispatch)(AssignGroupsToUsersModal);
