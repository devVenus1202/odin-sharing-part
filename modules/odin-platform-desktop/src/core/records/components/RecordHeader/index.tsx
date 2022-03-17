import { DownOutlined, LinkOutlined } from '@ant-design/icons';
import {
  DbRecordAssociationRecordsTransform,
} from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty, splitEntityToModuleAndEntity } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaAssociationEntity } from '@d19n/models/dist/schema-manager/schema/association/schema.association.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Button, Card, Col, Divider, Dropdown, Menu, Popconfirm, Row, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React from 'react';
import { isMobile } from 'react-device-detect';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import SwapAdress from '../../../../containers/CrmModule/containers/Address/SwapAddress';
import ServiceAppointmentCancelModal
  from '../../../../containers/FieldServiceModule/containers/ServiceAppointmentCancelModal';
import OdinIcons from '../../../../containers/Navigation/OdinIcons';
import BuildCompleteDrawer from '../../../../containers/ProjectModule/containers/Openreach/BuildComplete';
import {
  canUserCloneRecord,
  canUserDeleteRecord,
  canUserUpdateRecord,
  hasAnyRoles,
  isSystemAdmin,
} from '../../../../shared/permissions/rbacRules';
import { displayMessage } from '../../../../shared/system/messages/store/reducers';
import history from '../../../../shared/utilities/browserHisory';
import {
  checkRecordIsLocked,
  getAllSchemaAssociationEntities,
  getBrowserPath,
  getModuleAndEntityNameFromRecord,
} from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { initailizeCancelAppointmentModal } from '../../../appointments/store/actions';
import { listUsers } from '../../../identity/store/actions';
import { getPipelinesByModuleAndEntity } from '../../../pipelines/store/actions';
import {
  deleteRecordAssociationById,
  getRecordAssociationByIdRequest,
  getRecordAssociationsRequest,
  IDeleteRecordAssociation,
  IGetRecordAssociationById,
  IGetRecordAssociations,
} from '../../../recordsAssociations/store/actions';
import { DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST } from '../../../recordsAssociations/store/constants';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { IInitializeSwapAddress, initializeSwapAddress } from '../../../workflow/store/actions';
import { initProcessWorkflowForm } from '../../../workflowEngine/components/ProcessWorkflow/store/actions';
import {
  deleteRecordByIdRequest,
  getRecordByIdRequest,
  IDeleteRecordById,
  IGetRecordById,
  IRestoreRecordById,
  restoreRecordByIdRequest,
} from '../../store/actions';
import { CREATE_DB_RECORD_REQUEST, UPDATE_DB_RECORD_BY_ID_REQUEST } from '../../store/constants';
import { IRecordReducer } from '../../store/reducer';
import { InputChangeParams } from '../Forms/FormFields';
import OdinFormModal, { Props as OdinFormModalProps } from '../Forms/FormModal';
import { initializeRecordForm } from '../Forms/store/actions';
import './styles.scss'


const { Text } = Typography;

const { NOTE } = SchemaModuleEntityTypeEnums;

const excludeFromClone = {
  'Offer': [
    'OrderModule:OrderItem',
    'CrmModule:Lead',
  ],
  'PriceBook': [
    'OrderModule:OrderItem',
    'ProductModule:Vendor',
  ],
  'Contact': [
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'OrderModule:BillingAdjustment',
    'BillingModule:Transaction',
    'CrmModule:Lead',
  ],
  'Order': [
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'OrderModule:BillingAdjustment',
    'BillingModule:Transaction',
    'CrmModule:Lead',
  ],
  'Product': [
    'OrderModule:OrderItem',
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'OrderModule:BillingAdjustment',
    'BillingModule:Transaction',
    'CrmModule:Lead',
  ],
  'Discount': [
    'OrderModule:OrderItem',
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'OrderModule:BillingAdjustment',
    'BillingModule:Transaction',
    'CrmModule:Lead',
  ],
  'Account': [
    'OrderModule:Order',
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'OrderModule:BillingAdjustment',
    'CrmModule:Lead',
  ],
  'Address': [
    'OrderModule:Order',
    'FieldServiceModule:WorkOrder',
    'BillingModule:Invoice',
    'CrmModule:Lead',
    'CrmModule:Contact',
    'CrmModule:Account',
    'CrmModule:Visit',
    'ServiceModule:CustomerDeviceOnt',
  ],

}

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  match: any,
  userReducer: any,
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  initializeForm: any,
  deleteRecord: (param: IDeleteRecordById, cb: (res: any) => {}) => {},
  restoreRecord: (param: IRestoreRecordById, cb: (res: any) => {}) => {},
  getRecord: any,
  getRelatedRecordById: any,
  getUsers: any,
  getPipelines: any,
  getAssociations: any,
  hasColumnMappings?: boolean,
  visibleProperties?: string[],
  children?: any
  style?: any
  onDelete?: any,
  initializeCancelAppointment: any,
  updateFormDisabledFields?: string[],
  updateFromCustomValidations?: { [key: string]: any },
  updateFormAdditionalInputChangeHandler?: (updateFormProps: OdinFormModalProps, params: InputChangeParams) => void,
  initializeSwapAddress: (params: IInitializeSwapAddress) => void,
  disableRelatedProductEdit?: boolean,
  deleteRecordAssociation: (payload: IDeleteRecordAssociation, cb: any) => void,
  alertMessage: any,
  initProcessWorkflowForm: (params: any) => void,
  entityName?: string
}

type State = {
  isBuildCompleteDrawerOpen: boolean;
}

const uuid = uuidv4();

class RecordHeader extends React.Component<PropsType, State> {

  state: State = {
    isBuildCompleteDrawerOpen: false,
  };

  async initializeCloneForm() {

    const {
      record,
      schemaReducer,
      initializeForm,
      getUsers,
      getPipelines,
      getAssociations,
      visibleProperties,
    } = this.props;

    getUsers();

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    if (schema) {

      getPipelines({ schema: schema });

      initializeForm({
        formUUID: uuid,
        title: 'Initializing',
        showInitializing: true,
      });

      getAssociations({
        recordId: record.id,
        schema,
        entities: getAllSchemaAssociationEntities(schema.associations, [ NOTE ]),
      }, (params: { results: DbRecordAssociationRecordsTransform[] }) => {

        // parse associations into related records

        const sectionAssociations: any[] = [];
        const modifiedAssociations: any[] = [];

        for(const key of Object.keys(params.results)) {
          // @ts-ignore
          if (params.results[key].dbRecords) {
            // @ts-ignore
            params.results[key].dbRecords.filter(elem => excludeFromClone[schema.entityName] ? !excludeFromClone[schema.entityName].includes(
              elem.entity) : true).map(
              (elem: DbRecordEntityTransform) => {

                sectionAssociations.push({
                  recordId: elem.id,
                  title: `${elem.entity}: ${elem.title}`,
                });

                modifiedAssociations.push({
                  recordId: elem.id,
                  relatedAssociationId: elem.dbRecordAssociation?.relatedAssociationId,
                });
              });
          }
        }

        initializeForm({
          formUUID: uuid,
          title: `Clone ${schema.entityName}`,
          showFormModal: true,
          showInitializing: false,
          isCreateReq: true,
          isCloning: true,
          schema: schema,
          selected: record,
          recordType: record.type,
          visibleFieldOverride: visibleProperties,
          sections: [ { name: schema.name, schema: schema, associations: sectionAssociations } ],
          modified: [
            {
              schemaId: schema.id,
              type: record.type,
              title: record.title,
              ownerId: record.ownedBy?.id,
              properties: record.properties,
              associations: modifiedAssociations,
            },
          ],
        });
      });
    }
  }

  async initializeUpdateForm() {
    const {
      record,
      schemaReducer,
      initializeForm,
      getUsers,
      hasColumnMappings,
      getPipelines,
      visibleProperties,
      updateFormDisabledFields,
      updateFromCustomValidations,
      updateFormAdditionalInputChangeHandler,
    } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    if (schema) {

      getUsers();
      getPipelines({ schema: schema });

      initializeForm({
        formUUID: uuid,
        title: hasColumnMappings ? `Updating Related ${schema.entityName} Properties` : `Update ${schema.entityName}`,
        hasColumnMappings,
        visibleFieldOverride: visibleProperties,
        disabledFields: updateFormDisabledFields,
        customValidations: updateFromCustomValidations,
        additionalInputChangeHandler: updateFormAdditionalInputChangeHandler,
        showFormModal: true,
        isUpdateReq: true,
        schema: schema,
        selected: record,
        recordType: record.type,
        sections: [ { name: schema.name, schema: schema } ],
      });
    }
  }

  private deleteRecord() {

    const { record, schemaReducer, deleteRecord, onDelete, deleteRecordAssociation } = this.props;

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    if (schema) {
      // check if the path matches related product
      // if so, don't delete the product but association with related record
      // the record association id is extracted from the URL
      if (window.location.pathname.includes('/ProductModule/related/Product/')) {
        const parts = window.location.pathname.split('/');
        const dbRecordAssociationId = parts[parts.length - 2];
        const schemaAssociation = schema?.associations.find(elem => elem.label === 'PriceBook__Product');
        deleteRecordAssociation({
          schema: schema as SchemaEntity,
          schemaAssociation: schemaAssociation as SchemaAssociationEntity,
          dbRecordAssociationId: dbRecordAssociationId,
        }, () => {
          window.history.back()
        })
      } else {
        if (schema && record) {
          deleteRecord({
            schema: schema,
            recordId: record.id,
          }, () => {

            if (onDelete) {
              return onDelete();
            } else {
              history.push(`/${schema.moduleName}/${schema.entityName}`)
            }
          });
        }
      }
    }
  }

  private restoreRecord() {
    const { match, restoreRecord } = this.props;

    restoreRecord({
      recordId: match.params.recordId,
    }, (res) => {
      console.log('res')
      return res;
    });
  }


  private handleFormSubmit(params: { event: string, results: any }) {
    const { getRecord, getRelatedRecordById, record, schemaReducer } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    switch (params.event) {
      case DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST:
        getRelatedRecordById({
          schema: schema,
          recordId: record.id,
          dbRecordAssociationId: record?.dbRecordAssociation?.id,
        });
        break;
      case UPDATE_DB_RECORD_BY_ID_REQUEST:
        getRecord({ schema, recordId: params.results.id });
        break;
      case CREATE_DB_RECORD_REQUEST:
        history.push(`${getBrowserPath(params.results)}`);
        break;
    }
  }

  private initializeDeleteAppointmentForm() {
    const { record, initializeCancelAppointment } = this.props;
    initializeCancelAppointment({
      cancelModalVisible: true,
      cancelRelatedRecord: record,
      deleteFromDetail: true,
      schemaType: 'SA_CANCEL',
    })
  }

  private initializeProcessWorkflowForm(record: DbRecordEntityTransform) {
    const { initProcessWorkflowForm } = this.props;

    if (record) {
      const { entityName } = splitEntityToModuleAndEntity(record.entity);
      if (entityName === SchemaModuleEntityTypeEnums.WORKFLOW) {
        initProcessWorkflowForm({
          workflowId: record.id,
          canChangeWorkflow: false,
          canChangeRecord: true,
        });
      } else {
        initProcessWorkflowForm({
          record,
          canChangeRecord: false,
          canChangeWorkflow: true,
        });
      }
    }
  }

  showSwapAddressModal() {
    const { initializeSwapAddress, record } = this.props;
    initializeSwapAddress({
      isSwapAddressVisible: true,
      addressRecord: record,
    })
  }

  private copyLinkToClipboard() {
    const { alertMessage } = this.props;
    navigator.clipboard.writeText(window.location?.href);
    alertMessage({ body: 'Link to record copied to clipboard!', type: 'success' });
  }

  getSplicingPath = (record: DbRecordEntityTransform) => {

    let path: string = ''

    if ((record && record.type === 'CABLE') || (record && record.type === 'CLOSURE')) {

      const exPolygonId = getProperty(record, 'ExPolygonId')
      const L1PolygonId = getProperty(record, 'L1PolygonId')
      const L2PolygonId = getProperty(record, 'L2PolygonId')

      if (exPolygonId && L1PolygonId && L2PolygonId)
        path = `/ProjectModule/Connection/${exPolygonId}/${L1PolygonId}/${L2PolygonId}`

    }

    return path

  }

  getConfigureClosurePath = (record: DbRecordEntityTransform) => {

    let path: string = ''

    if (record && record?.type === 'CLOSURE')
      path = `/ProjectModule/Feature/${record?.id}/configure-closure`

    return path

  }

  getViewInMapPath = (record: DbRecordEntityTransform) => {

    let path: string = ''
    let recordType: string = ''

    if (record && getProperty(record!, 'ExternalRef')) {

      const moduleEntity = getModuleAndEntityNameFromRecord(record)

      if (record.type) {
        recordType = record?.type
      } else {
        if (moduleEntity && moduleEntity.entityName === 'Project')
          recordType = 'polygon'
      }

      if (recordType.length)
        path = `/ProjectModule/Map/${recordType}/${getProperty(record, 'ExternalRef')}`

    }

    return path

  }

  openBuildCompleteDrawer() {
    this.setState((state) => ({
      isBuildCompleteDrawerOpen: true,
    }));
  }

  closeBuildCompleteDrawer() {
    this.setState((state) => ({
      isBuildCompleteDrawerOpen: false,
    }));
  }


  canAccessBuildPack(record: DbRecordEntityTransform) {

    if (record && getProperty(record, 'ExternalRef')) {

      const moduleEntity = getModuleAndEntityNameFromRecord(record)
      return moduleEntity && moduleEntity.entityName === 'Project';

    } else
      return false

  }

  render() {

    const {
      userReducer,
      record,
      schemaReducer,
      children,
      hasColumnMappings,
      style,
      entityName,
      disableRelatedProductEdit,
    } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);


    return (
      <div className="detail-panel-left" style={style}>
        <OdinFormModal
          formUUID={uuid}
          onSubmitEvent={(params: { event: string, results: any }) => this.handleFormSubmit(params)}/>
        {schema?.entityName === SchemaModuleEntityTypeEnums.WORK_ORDER &&
            <ServiceAppointmentCancelModal record={record}/>}
        <SwapAdress/>
        <BuildCompleteDrawer
          record={record}
          isOpen={this.state.isBuildCompleteDrawerOpen}
          close={() => this.closeBuildCompleteDrawer()}
        />

        <Card size="small"
              className="recordHeaderCard"
              title={
                <div>
                  {OdinIcons('ProjectOutlined')}
                  <span style={{ marginLeft: '7px' }}>{schema?.entityName || entityName}</span>
                </div>
              } extra={

          <Row>

            <Col>

              <Dropdown
                trigger={[ 'click' ]} overlay={(
                <Menu className="detail-action-menu">

                  {/* Feature Actions */}
                  <div>
                    <Row style={{ padding: '5px 10px' }}>
                      <Col span={24} style={{ background: '#f2f2f2', padding: '3px 10px', borderRadius: 2 }}>
                        <span style={{ fontWeight: 600 }}>Feature Actions</span>
                      </Col>
                    </Row>
                  </div>

                  {/* Create Connections */}
                  <Menu.Item disabled={!this.getSplicingPath(record).length}>
                    <Link target="_blank" to={this.getSplicingPath(record)}>
                      Create Connections
                    </Link>
                  </Menu.Item>

                  {/* Configure Closure */}
                  {
                    record && record.type === 'CLOSURE' ?
                      <Menu.Item disabled={!this.getConfigureClosurePath(record).length}>
                        <Link target="_blank" to={this.getConfigureClosurePath(record)}>
                          Configure Closure
                        </Link>
                      </Menu.Item>
                      : <></>
                  }

                  {/* View in Map */}
                  <Menu.Item disabled={!this.getViewInMapPath(record).length}>
                    <Link target="_blank" to={this.getViewInMapPath(record)}>
                      View in Map
                    </Link>
                  </Menu.Item>

                  {/* Build Complete - PIA Structure*/}
                  {
                    record && record.type === 'PIA_STRUCTURE' ?
                      <Menu.Item onClick={() => this.openBuildCompleteDrawer()}>
                        Build Complete
                      </Menu.Item>
                      : <></>
                  }

                  {/* Build Pack */}
                  {
                    this.canAccessBuildPack(record) ?
                      <>
                        <Menu.Item>
                          <Link to={`/ProjectModule/BuildPack/Splicing/${record?.id}/${getProperty(
                            record,
                            'ExternalRef',
                          )}`}>
                            Build Pack - With Splicing
                          </Link>
                        </Menu.Item>

                        <Menu.Item>
                          <Link to={`/ProjectModule/BuildPack/Spliceless/${record?.id}/${getProperty(
                            record,
                            'ExternalRef',
                          )}`}>
                            Build Pack - Without Splicing
                          </Link>
                        </Menu.Item>
                      </>
                      : <></>
                  }


                  {/* -------------------------------------------------------------------------- */}
                  <Divider style={{ margin: '10px 0' }}/>


                  {/* Manage Record */}
                  <div>
                    <Row style={{ padding: '5px 10px' }}>
                      <Col span={24} style={{ background: '#f2f2f2', padding: '3px 10px', borderRadius: 2 }}>
                        <span style={{ fontWeight: 600 }}>Manage Record</span>
                      </Col>
                    </Row>
                  </div>

                  <Menu.Item
                    disabled={
                      !canUserUpdateRecord(userReducer, schema, record)
                      // ODN-1640 prevent editing if record is locked
                      || checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')
                      || disableRelatedProductEdit
                    }
                    onClick={() => this.initializeUpdateForm()}>
                    Edit
                  </Menu.Item>

                  <Menu.Item
                    disabled={!canUserCloneRecord(userReducer, schema, record) || disableRelatedProductEdit}
                    onClick={() => this.initializeCloneForm()}>
                    Clone
                  </Menu.Item>
                  {
                    record?.entity === 'FieldServiceModule:ServiceAppointment' ?
                      <Menu.Item
                        disabled={
                          !canUserDeleteRecord(userReducer, schema, record)
                          // ODN-1640 prevent deleting if record is locked
                          || checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')
                        }
                        onClick={() => this.initializeDeleteAppointmentForm()}>
                        Delete
                      </Menu.Item> :
                      <Menu.Item
                        disabled={
                          !canUserDeleteRecord(userReducer, schema, record)
                          // ODN-1640 prevent deleting if record is locked
                          || checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')
                          || disableRelatedProductEdit
                        }
                      >
                        <Popconfirm
                          title="Are you sure you want to delete this record?"
                          onConfirm={() => this.deleteRecord()}
                          disabled={
                            !canUserDeleteRecord(userReducer, schema, record)
                            // ODN-1640 prevent deleting if record is locked
                            || checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')
                          }
                          okText="Yes"
                          cancelText="No"
                        >
                          Delete
                        </Popconfirm>
                      </Menu.Item>
                  }
                  {isSystemAdmin(userReducer) &&
                      <Menu.Item>
                          <Popconfirm
                              title="Are you sure you want to restore this record?"
                              onConfirm={() => this.restoreRecord()}
                              okText="Yes"
                              cancelText="No"
                          >
                              Restore
                          </Popconfirm>
                      </Menu.Item>
                  }
                  {
                    record?.entity === 'CrmModule:Address' ?
                      <Menu.Item
                        disabled={!canUserCloneRecord(userReducer, schema, record)}
                        onClick={() => this.showSwapAddressModal()}>
                        Migrate Records
                      </Menu.Item> : <></>
                  }

                  {hasColumnMappings &&
                      <Menu.Item>
                          <Link to={getBrowserPath(record)}>Full View</Link>
                      </Menu.Item>
                  }
                  <Menu.Item
                    disabled={!canUserUpdateRecord(userReducer, schema, record)}
                    onClick={() => this.initializeProcessWorkflowForm(record)}
                  >Process Workflow</Menu.Item>
                </Menu>)}>
                <Button icon={<DownOutlined/>}/>
              </Dropdown>

            </Col>

          </Row>
        }>

          <Row>

            <Col xs={24} sm={24} md={24} lg={2} style={{ marginBottom: isMobile ? '10px' : 0 }}>
              <Text className="fieldTitle">Record Number</Text>
              <br/>
              <Text strong>{record?.recordNumber}</Text>
              <Tooltip title="Copy link to record">
                <LinkOutlined onClick={() => this.copyLinkToClipboard()} style={{ marginLeft: '3px' }}/>
              </Tooltip>
            </Col>

            <Col xs={24} sm={24} md={24} lg={2} style={{ marginBottom: isMobile ? '10px' : 0 }}>
              <Text className="fieldTitle">Record Type</Text><br/>
              <Text strong>{record?.type}</Text>
            </Col>

            <Col xs={24} sm={24} md={24} lg={12} style={{ marginBottom: isMobile ? '10px' : 0 }}>
              <Text className="fieldTitle">Record Title</Text><br/>
              <Text strong>{record?.title}</Text>
            </Col>

            <Col xs={24} sm={24} md={24} lg={4} style={{ marginBottom: isMobile ? '10px' : 0 }}>
              <Text className="fieldTitle">Created by:</Text>
              <br/>
              <Text>{record?.createdBy!.fullName} {moment(record?.createdAt!).format('YYYY-MM-DD HH:mm:ss')}</Text><br/>
            </Col>

            <Col xs={24} sm={24} md={24} lg={4}>
              <Text className="fieldTitle">Updated by:</Text>
              <br/>
              <Text>{record?.lastModifiedBy!.fullName} {moment(record?.updatedAt!).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </Col>

          </Row>

        </Card>
      </div>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  getUsers: (cb: any) => dispatch(listUsers(cb)),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  getRelatedRecordById: (payload: IGetRecordAssociationById) => dispatch(getRecordAssociationByIdRequest(payload)),
  getRecord: (payload: IGetRecordById) => dispatch(getRecordByIdRequest(payload)),
  deleteRecord: (payload: any, cb: any) => dispatch(deleteRecordByIdRequest(payload, cb)),
  restoreRecord: (payload: any, cb: any) => dispatch(restoreRecordByIdRequest(payload, cb)),
  initializeForm: (params: any) => dispatch(initializeRecordForm(params)),
  getAssociations: (params: IGetRecordAssociations, db: any) => dispatch(getRecordAssociationsRequest(params, db)),
  initializeCancelAppointment: (params: any) => dispatch(initailizeCancelAppointmentModal(params)),
  initializeSwapAddress: (params: IInitializeSwapAddress) => dispatch(initializeSwapAddress(params)),
  deleteRecordAssociation: (payload: IDeleteRecordAssociation, cb: any) => dispatch(deleteRecordAssociationById(
    payload,
    cb,
  )),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  initProcessWorkflowForm: (params: any) => dispatch(initProcessWorkflowForm(params)),
});


export default withRouter(connect(mapState, mapDispatch)(RecordHeader));
