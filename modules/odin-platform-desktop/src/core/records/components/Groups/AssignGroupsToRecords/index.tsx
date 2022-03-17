import { OrganizationUserGroupEntity } from '@d19n/models/dist/identity/organization/user/group/organization.user.group.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Button, Form, Modal, Select, Spin } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import { hasPermissions } from '../../../../../shared/permissions/rbacRules';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { getGroupsDataRequest } from '../../../../identityGroups/store/actions';
import { IdentityGroupsReducer } from '../../../../identityGroups/store/reducer';
import {
  bulkUpdateRecordsRequest,
  IBulkUpdateRecords,
  ISearchRecords,
  searchRecordsRequest,
} from '../../../store/actions';
import { IRecordReducer } from '../../../store/reducer';
import { TableReducer } from '../../DynamicTable/store/reducer';

const { Option } = Select;

export interface Props {
  schema: SchemaEntity | undefined,
  userReducer: any,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  searchRecords: (params: ISearchRecords) => {},
  bulkUpdateRecords: (params: IBulkUpdateRecords, cb: any) => {},
  alertMessage: (params: { body: string, type: string }) => {},
  identityGroupsReducer: IdentityGroupsReducer,
  getGroupsList: () => {},
}

interface State {
  visible: boolean;
  isLoading: boolean;
  isRequesting: boolean;
  overrideGroups: string[];
  addGroups: string[];
  removeGroups: string[];
}

class AssignGroupsToRecords extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);

    this.state = {
      visible: false,
      isLoading: false,
      isRequesting: false,
      overrideGroups: [],
      addGroups: [],
      removeGroups: []
    }
  }

  private showModal() {
    this.setState({
      visible: true,
      overrideGroups: [],
      addGroups: [],
      removeGroups: [],
    });
  };

  private closeModal() {
    this.setState({
      visible: false,
    });
  }

  componentDidMount() {
    this.loadGroups();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {

  }

  private loadGroups() {
    const { identityGroupsReducer, getGroupsList } = this.props;
    if (identityGroupsReducer.list?.length < 1 && !identityGroupsReducer.isRequesting) {
      getGroupsList();
    }
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

  private async handleSubmit() {
    const { schema, recordReducer, recordTableReducer, bulkUpdateRecords, alertMessage } = this.props;

    if (!schema 
      || (this.state.overrideGroups?.length < 1 
        && this.state.addGroups?.length < 1
        && this.state.removeGroups?.length < 1)
    ) {
      this.closeModal();
      return;
    }

    const update = {
      schemaId: schema?.id,
      groups: this.state.overrideGroups?.length > 0 ? this.state.overrideGroups : undefined,
      addGroups: this.state.addGroups?.length > 0 ? this.state.addGroups : undefined,
      removeGroups: this.state.removeGroups?.length > 0 ? this.state.removeGroups : undefined,
    };

    this.setState({
      isRequesting: true,
    });

    const bulkUpdateParams: IBulkUpdateRecords = {
      schema,
      createUpdate: update,
    };

    // ODN-1988 bulk update selected records
    if (recordTableReducer?.selectedItems?.length > 0) {
      bulkUpdateParams.recordIds = recordTableReducer.selectedItems;
    }
    // bulk update records in current search
    else {
      const searchQuery = recordReducer.searchQuery[schema.id];
      const isNotEmptyQuery = !!searchQuery?.terms
                || !!searchQuery?.boolean?.must?.length
                || !!searchQuery?.boolean?.must_not?.length
                || !!searchQuery?.boolean?.should?.length
                || !!searchQuery?.boolean?.filter?.length;
      if (isNotEmptyQuery) {
        bulkUpdateParams.searchQuery = {
          schemas: schema.id,
          fields: searchQuery?.fields,
          terms: searchQuery?.terms,
          boolean: searchQuery?.boolean,
          sort: searchQuery?.sort,
          pageable: {
            page: 1,
          },
        };
      }
    }

    if (bulkUpdateParams?.searchQuery || bulkUpdateParams?.recordIds) {
      bulkUpdateRecords(bulkUpdateParams, (resp: any) => {
        this.setState({
          isRequesting: false,
        });
        if (resp) {
          this.closeModal();
          if (resp.results?.sentToEmail) {
            alertMessage({ body: 'processing groups assignment, results will be sent to the email', type: 'success' });
          } else {
            alertMessage({ body: 'groups assignment successful', type: 'success' });
          }
          this.refreshSearch();
        }
      });
    } else {
      this.closeModal();
      alertMessage({ body: 'searchQuery is not defined, bulk update is not allowed', type: 'error' });
    }
  }

  private refreshSearch() {
    const { schema, recordReducer, searchRecords } = this.props;

    if (schema && !recordReducer.isSearching) {

      const searchQuery = recordReducer.searchQuery[schema.id];

      searchRecords({
        schema: schema,
        searchQuery: {
          schemas: schema.id,
          fields: searchQuery?.fields,
          terms: searchQuery?.terms,
          boolean: searchQuery?.boolean,
          sort: searchQuery?.sort,
          pageable: {
            page: 1,
          },
        },
      });
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

  render() {
    const { userReducer, identityGroupsReducer } = this.props;

    return (
      <div>
        <Button onClick={() => this.showModal()} disabled={
          !hasPermissions(userReducer, 'groups.assign') 
          || !hasPermissions(userReducer, 'records.bulkupdate')
        }>
          Assign Groups
        </Button>

        <Modal
          className='dynamic-form-modal'
          destroyOnClose
          maskClosable={false}
          title='Assign Groups'
          visible={this.state.visible}
          onOk={() => this.handleSubmit()}
          confirmLoading={this.state.isRequesting}
          onCancel={() => this.closeModal()}
        >
          <Spin spinning={identityGroupsReducer.isRequesting || this.state.isRequesting}>
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
      </div>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  identityGroupsReducer: state.identityGroupsReducer,
});

const mapDispatch = (dispatch: any) => ({
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  bulkUpdateRecords: (params: IBulkUpdateRecords, cb: any) => dispatch(bulkUpdateRecordsRequest(params, cb)),
  getGroupsList: () => dispatch(getGroupsDataRequest()),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(AssignGroupsToRecords);

