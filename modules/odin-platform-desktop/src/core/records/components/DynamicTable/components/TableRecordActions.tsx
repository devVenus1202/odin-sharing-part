import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Modal, notification, Spin } from 'antd';
import fileDownload from 'js-file-download';
import React from 'react';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import CreateAccountModal from '../../../../../containers/CrmModule/containers/Account/CreateAccount';
import CreateAddressModal from '../../../../../containers/CrmModule/containers/Address/CreateAddress';
import CreateContactModal from '../../../../../containers/CrmModule/containers/Contact/CreateContact';
import CreateOrderModal from '../../../../../containers/OrderModule/containers/Order/CreateOrderWorkflow';
import { httpGet } from '../../../../../shared/http/requests';
import {
  canUserCreateRecord,
  canUserMergeRecord,
  canUserUpdateRecord,
  hasPermissions,
} from '../../../../../shared/permissions/rbacRules';
import history from '../../../../../shared/utilities/browserHisory';
import {
  getDefaultFields,
  getSavedFilter,
  setSearchQuery,
  setSortQuery,
} from '../../../../../shared/utilities/searchHelpers';
import { listUsers } from '../../../../identity/store/actions';
import { getPipelinesByModuleAndEntity } from '../../../../pipelines/store/actions';
import { SchemaReducerState } from '../../../../schemas/store/reducer';
import { createAccountVisible, createAddressVisible, createOrderVisible } from '../../../../workflow/store/actions';
import { ISearchRecords, searchRecordsRequest } from '../../../store/actions';
import {
  BULK_UPDATE_DB_RECORDS_REQUEST,
  CREATE_DB_RECORD_REQUEST,
  UPDATE_DB_RECORD_BY_ID_REQUEST,
} from '../../../store/constants';
import { IRecordReducer } from '../../../store/reducer';
import OdinFormModal from '../../Forms/FormModal';
import { initializeRecordForm } from '../../Forms/store/actions';
import AssignGroupsToRecords from '../../Groups/AssignGroupsToRecords';
import { TableReducer } from '../store/reducer';

interface Props {
  schema: SchemaEntity | undefined,
  userReducer: any,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordTableReducer: TableReducer,
  initializeForm: any,
  getUsers: any,
  getPipelines: any,
  createOrderVisible: any,
  createAccountVisible: any,
  createAddressVisible: any,
  searchRecords: (params: ISearchRecords) => void,
}

interface State {
  createContactVisible: boolean
  isGettingFile: boolean
}

const { CRM_MODULE, ORDER_MODULE } = SchemaModuleTypeEnums;

const { CONTACT, ORDER, ACCOUNT, ADDRESS } = SchemaModuleEntityTypeEnums;

const uuid = uuidv4();


class TableRecordActions extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = {
      createContactVisible: false,
      isGettingFile: false,
    }
  }

  async initializeCreateForm() {
    const { initializeForm, getUsers, getPipelines, schema, createOrderVisible, createAccountVisible, createAddressVisible } = this.props;

    getUsers();

    if (schema) {

      if (schema.moduleName === CRM_MODULE && schema.entityName === CONTACT) {

        this.setState({
          createContactVisible: true,
        })

      } else if (schema.moduleName === ORDER_MODULE && schema.entityName === ORDER) {
        createOrderVisible()
      } else if (schema.moduleName === CRM_MODULE && schema.entityName === ACCOUNT) {
        createAccountVisible()
      } else if (schema.moduleName === CRM_MODULE && schema.entityName === ADDRESS) {
        createAddressVisible()
      } else {

        getPipelines({ schema: schema });

        initializeForm({
          formUUID: uuid,
          title: 'Initializing',
          showInitializing: true,
        });

        initializeForm({
          formUUID: uuid,
          title: `Create ${schema.entityName}`,
          showFormModal: true,
          isCreateReq: true,
          schema: schema,
          selected: null,
          sections: [ { name: schema.name, schema: schema } ],
        });
      }
    } else {
      return initializeForm({
        title: 'Create',
        formUUID: uuid,
        showFormModal: true,
      });
    }
  }

  private async initializeBulkUpdateForm() {
    const { initializeForm, schema, getUsers, getPipelines } = this.props;

    if (schema) {
      getUsers();
      getPipelines({ schema });

      initializeForm({
        formUUID: uuid,
        title: 'Initializing',
        showInitializing: true,
      });

      initializeForm({
        formUUID: uuid,
        title: `Bulk Update ${schema.entityName}`,
        showFormModal: true,
        isBulkUpdateReq: true,
        schema: schema,
        selected: null,
        sections: [ { name: schema.name, schema: schema } ],
      });
    }
  }

  private openNotificationWithIcon() {
    notification.success({
      message: 'File successfully generated',
      description:
        'To download the file, please check your email inbox and look for an email from us.',
    });
  };

  private async exportTable() {
    const { schema, schemaReducer, recordTableReducer, recordReducer } = this.props;

    if (schema && !this.state.isGettingFile) {
      this.setState({ isGettingFile: true })

      const moduleName = schema.moduleName;
      const entityName = schema.entityName;
      const savedFilter = getSavedFilter(schemaReducer, recordTableReducer, moduleName, entityName);

      let searchQuery = {
        terms: setSearchQuery(schemaReducer, recordReducer, moduleName, entityName),
        fields: getDefaultFields(schema, moduleName, entityName),
        schemas: schema.id,
        sort: setSortQuery(schemaReducer, recordReducer, moduleName, entityName),
        boolean: savedFilter?.queries,
        pageable: {
          page: 1,
          size: 9999,
        },
      }
      const { terms, schemas, fields, sort, pageable, boolean } = searchQuery;
      const pageNum = !!pageable && !!pageable.page ? Number(pageable.page) - 1 : 0;
      const sizeNum = !!pageable && !!pageable.size ? Number(pageable.size) : 25;
      const userFields = recordTableReducer.columns.map(column => column.dataIndex)
      const userFieldsString = userFields.join()
      const queryParams = `terms=${terms || ''}&boolean=${boolean ? JSON.stringify(boolean) : ''}&fields=${fields || ''}&schemas=${schemas}&page=${pageNum}&size=${sizeNum}&sort=${sort ? JSON.stringify(
        sort) : ''}&file=true&user_fields=${userFieldsString}`;
      // TODO: Restore after latest update
      // const path = `${schema ? schema.moduleName : 'SchemaModule'}/v1.0/db/${schema ? schema.entityName :
      // 'ALL'}/search?${queryParams}`;
      const path = `SchemaModule/v1.0/db/${schema ? schema.entityName : 'ALL'}/search?${queryParams}`;
      // const path = `SchemaModule/v1.0/db/${schema ? schema.entityName : 'ALL'}/search?${queryParams}`;
      await httpGet(path).then(res => {
        this.setState({ isGettingFile: false });
        if (res.data.sentToEmail) {
          this.openNotificationWithIcon()
        } else {
          fileDownload(res.data, `${schema ? schema.entityName : 'data'}.csv`);
        }
      }, () => {
        this.setState({ isGettingFile: false });
      });

    }
  }


  private refreshSearch() {
    const { schema, recordReducer, searchRecords } = this.props;

    if (schema && !recordReducer.isSearching) {

      const searchQuery = recordReducer.searchQuery[schema.id];

      if (searchQuery) {

        searchRecords({
          schema: schema,
          searchQuery: {
            schemas: schema.id,
            fields: searchQuery.fields,
            terms: searchQuery.terms,
            boolean: searchQuery.boolean,
            sort: searchQuery.sort,
            pageable: {
              page: 1,
            },
          },
        });

      }
    }
  }


  private handleFormSubmit(params: { event: string, results: DbRecordEntityTransform }) {
    const { schema } = this.props;
    if (schema) {
      switch (params.event) {
        case CREATE_DB_RECORD_REQUEST:
          history.push(`/${schema.moduleName}/${schema.entityName}/${params.results.id}`);
          break;
        case UPDATE_DB_RECORD_BY_ID_REQUEST:
          break;
        case BULK_UPDATE_DB_RECORDS_REQUEST:
          this.refreshSearch();
          break;
      }
    }
  }

  private enableMergeRecords() {
    const { recordTableReducer } = this.props;

    if (recordTableReducer.selectedItems) {
      return recordTableReducer.selectedItems.length === 2;
    }
  }

  private renderWorkFlowModals() {
    const { schema } = this.props;

    if (schema) {

      if (schema.moduleName === CRM_MODULE && schema.entityName === CONTACT) {
        return <CreateContactModal visible={this.state.createContactVisible} schema={schema}
                                   passDataToParent={(e: any) => {
                                     this.setState({ createContactVisible: e })
                                   }}/>
      }
      if (schema.moduleName === ORDER_MODULE && schema.entityName === ORDER) {
        return <CreateOrderModal/>
      }
      if (schema.moduleName === CRM_MODULE && schema.entityName === ACCOUNT) {
        return <CreateAccountModal/>
      }
      if (schema.moduleName === CRM_MODULE && schema.entityName === ADDRESS) {
        return <CreateAddressModal/>
      }
    }
  }

  render() {

    const { userReducer, schema } = this.props;

    return (
      <>

        {this.renderWorkFlowModals()}

        <Modal visible={this.state.isGettingFile} centered={true} footer={null}>
          <Spin spinning={this.state.isGettingFile}>data exporting...</Spin>
        </Modal>

        <OdinFormModal
          formUUID={uuid}
          onSubmitEvent={(params: { event: string, results: DbRecordEntityTransform }) => this.handleFormSubmit(params)}/>


        <div style={{ display: 'flex' }}>
          <Button
            style={{ marginRight: 8 }}
            key="2"
            disabled={schema ? !canUserCreateRecord(userReducer, schema) : false}
            onClick={() => this.initializeCreateForm()}>
            New
          </Button>
          <Button
            style={{ marginRight: 8 }}
            key="4"
            disabled={
              !hasPermissions(userReducer, 'records.bulkupdate')
              || !canUserUpdateRecord(userReducer, schema)
            }
            onClick={() => this.initializeBulkUpdateForm()}>
            Bulk Update
          </Button>
          <Button
            style={{ marginRight: 8 }}
            key="1"
            disabled={schema ? !canUserMergeRecord(userReducer, schema) && this.enableMergeRecords() : false}
            onClick={() => history.push(`/merge/${schema?.moduleName}/${schema?.entityName}`)}>
            Merge
          </Button>
          <Button
            style={{ marginRight: 8 }}
            key="3"
            disabled={this.state.isGettingFile}
            onClick={() => this.exportTable()}>
            Export
          </Button>
          <AssignGroupsToRecords schema={schema}/>
        </div>
      </>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  initializeForm: (params: any) => dispatch(initializeRecordForm(params)),
  getUsers: (cb: any) => dispatch(listUsers(cb)),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  createOrderVisible: () => dispatch(createOrderVisible()),
  createAccountVisible: () => dispatch(createAccountVisible()),
  createAddressVisible: () => dispatch(createAddressVisible()),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
});


export default connect(mapState, mapDispatch)(TableRecordActions);
