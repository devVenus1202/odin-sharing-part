import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal/Modal";
import { Table } from "antd";
import { IdentityUserReducer } from "../../../../../core/identityUser/store/reducer";
import { withRouter } from "react-router-dom";
import { getGroupFromShortListByGroupId } from "../../../../../shared/utilities/identityHelpers";
import { getUsersDataRequest, setAssignUserModalVisible, setMoveUsersModalVisible } from "../../../../../core/identityUser/store/actions";
import { IdentityGroupsReducer } from "../../../../../core/identityGroups/store/reducer";
import { MoveUsersToGroup, moveUsersToGroupRequest } from "../../../../../core/identityGroups/store/actions";

interface Props {
  identityGroupsReducer: IdentityGroupsReducer,
  getUsersList: any,
  setModalVisible: any,
  identityUserReducer: IdentityUserReducer,
  match: any,
  moveUsers: any,
}

interface State {
  selectedRowKeys: any[]
}

class MoveUsersToGroupModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRowKeys: []
    }
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
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  moveUsersToGroup() {
    const { moveUsers, match } = this.props;
    moveUsers({
      groupIds: this.state.selectedRowKeys, 
      sourceGroupId: match.params.groupId,
      userIds: this.props.identityGroupsReducer.selectedGroupUsers
    })
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
    return (
      <Modal
        title={"Move Selected Users To Another Groups"}
        width={1000}
        visible={identityUserReducer?.moveUsersModalVisible}
        onCancel={() => this.closemodal()}
        onOk={() => this.moveUsersToGroup()}
      >
        <Table
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys: any) => this.onSelectChange(selectedRowKeys),
            selectedRowKeys: this.state.selectedRowKeys,

          }}
          loading={identityGroupsReducer.isRequesting}
          scroll={{ y: "calc(100vh - 315px)" }}
          style={{ minHeight: "100%", width: "100%" }}
          size="small"
          dataSource={identityGroupsReducer.list}
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
  setModalVisible: (visible: boolean) => dispatch(setMoveUsersModalVisible(visible)),
  moveUsers: (params: MoveUsersToGroup) => dispatch(moveUsersToGroupRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(MoveUsersToGroupModal));
