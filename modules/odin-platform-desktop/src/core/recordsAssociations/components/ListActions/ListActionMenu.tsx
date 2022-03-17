import { DownOutlined } from '@ant-design/icons';
import {
  DbRecordAssociationRecordsTransform,
} from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import {
  RelationTypeEnum,
} from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import {
  SchemaAssociationCardinalityTypes,
} from '@d19n/models/dist/schema-manager/schema/association/types/schema.association.cardinality.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { Button, Dropdown, Menu, Popconfirm } from 'antd';
import fileDownload from 'js-file-download';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import PaymentMethodForm from '../../../../containers/BillingModule/containers/PaymentMethod/PaymentMethodForm';
import CreateContactModal from '../../../../containers/CrmModule/containers/Contact/CreateContact';
import OfferProductSelector from '../../../../containers/OrderModule/containers/Order/AddProducts/OfferProductSelector';
import GenerateWorkOrder from '../../../../containers/OrderModule/containers/Order/GenerateWorkOrder';
import SplitOrder from '../../../../containers/OrderModule/containers/Order/SplitOrder';
import PriceBookProductSelector from '../../../../containers/ProductModule/AddProducts/PriceBookProductSelector';
import ActivateCustomerDeviceOnt from '../../../../containers/ServiceModule/ActivateCustomerDeviceOnt';
import SwapCustomerDeviceOnt from '../../../../containers/ServiceModule/SwapCustomerDeviceOnt';
import { httpPost } from '../../../../shared/http/requests';
import { canUserCreateRecord, canUserUpdateRecord, hasAnyRoles, isSystemAdmin } from '../../../../shared/permissions/rbacRules';
import { displayMessage } from '../../../../shared/system/messages/store/reducers';
import history from '../../../../shared/utilities/browserHisory';
import {
  checkRecordIsLocked,
  getModuleAndEntityNameFromRecord,
  getRecordFromShortListById,
} from '../../../../shared/utilities/recordHelpers';
import {
  getElasticSearchKeysFromSchemaColumn,
  getSchemaFromShortListBySchemaId,
} from '../../../../shared/utilities/schemaHelpers';
import BookingModal from '../../../appointments/components/BookingModal';
import { listUsers } from '../../../identity/store/actions';
import { getPipelinesByModuleAndEntity } from '../../../pipelines/store/actions';
import OdinFormModal from '../../../records/components/Forms/FormModal';
import { initializeRecordForm } from '../../../records/components/Forms/store/actions';
import { getRecordByIdRequest, IGetRecordById } from '../../../records/store/actions';
import { CREATE_DB_RECORD_REQUEST, UPDATE_DB_RECORD_BY_ID_REQUEST } from '../../../records/store/constants';
import { IRecordReducer } from '../../../records/store/reducer';
import { getSchemaByIdRequest, ISchemaById } from '../../../schemas/store/actions';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { createOrderFromAccountVisible, ILeadWorkflow, updateLeadWorkflow } from '../../../workflow/store/actions';
import {
  exportAssociationRecordsRequest,
  getRecordAssociationsRequest,
  IExportAssociationRecords,
  IGetRecordAssociations,
} from '../../store/actions';
import { IRecordAssociationsReducer } from '../../store/reducer';
import LookUpDrawer from '../Lookup/LookUpDrawer';
import LookUpCreateModal from '../LookUpCreateModal';


const LOOKUP_AND_CREATE = 'LOOKUP_AND_CREATE';
const CREATE_ONLY = 'CREATE_ONLY';
const LOOKUP_ONLY = 'LOOKUP_ONLY';


const {
  SERVICE_APPOINTMENT,
  PAYMENT_METHOD,
  PRODUCT,
} = SchemaModuleEntityTypeEnums;


interface Props {
  record: DbRecordEntityTransform,
  relation: DbRecordAssociationRecordsTransform,
  recordAssociationReducer: IRecordAssociationsReducer,
  schemaType?: SchemaTypeEntity,
  hidden?: string[],
  userReducer: any,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  getSchema: any,
  initializeForm: any,
  getAssociations: any,
  getRecordById: any,
  getUsers: any,
  getPipelines: any
  isCreateHidden?: boolean,
  customActionOverride?: boolean,
  exportAssociationRecords: any,
  alertMessage: any,
  createOrderVisible: () => void,
  updateLeadWorkflow: (params: ILeadWorkflow) => void
}

interface State {
  uuid: string,
  createContactVisible: boolean,
  schema: any,
  excludeFromCreate: string | undefined,
  associatingRecordId: string | undefined,
  createBroadbandVisible: boolean,
  swapCustomerDeviceOntVisible: boolean
}

const addressParentAssociationsLabels = [
  'Contact__Address',
  'Account__Address',
  'Lead__Address',
]

class ListActionMenu extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      uuid: uuidv4(),
      createContactVisible: false,
      schema: {},
      excludeFromCreate: undefined,
      associatingRecordId: undefined,
      createBroadbandVisible: false,
      swapCustomerDeviceOntVisible: false,
    }
  }

  private async initializeCreateForm() {
    const { initializeForm, getSchema, relation, record, getUsers, getPipelines, schemaType, createOrderVisible } = this.props;

    getUsers();

    getSchema({ schemaId: relation?.schema?.id }, (result: SchemaEntity) => {

      getPipelines({ schema: result });

      if (record.entity === 'CrmModule:Account' && result.entityName === 'Contact') {

        this.setState({
          schema: result,
          createContactVisible: true,
          excludeFromCreate: 'Account',
          associatingRecordId: record.id,
        })

      } else if (record.entity === 'CrmModule:Address' && result.entityName === 'Contact') {

        this.setState({
          schema: result,
          createContactVisible: true,
          excludeFromCreate: 'Premise',
          associatingRecordId: record.id,
        })

      } else if (record.entity === 'OrderModule:OrderItem' && result.entityName === 'CustomerDeviceOnt') {

        this.setState({
          schema: result,
          createBroadbandVisible: true,
          associatingRecordId: record.id,
        })

      } else if (record.entity === 'CrmModule:Account' && result.entityName === 'Order') {
        createOrderVisible();
      } else {

        initializeForm({
          formUUID: this.state.uuid,
          title: `Create ${relation?.schema?.entityName}`,
          showFormModal: true,
          isCreateReq: true,
          schema: result,
          selected: null,
          recordType: schemaType?.name,
          sections: [
            {
              name: result.name,
              schema: result,
              associations: [ {
                recordId: record.id,
                title: record.title,
                recordNumber: record.recordNumber,
                schemaAssociationId: relation.schemaAssociationId,
              } ],
            },
          ],
          modified: [
            {
              schemaId: relation?.schema?.id,
              associations: [
                {
                  recordId: record.id,
                  // if this is a child relation then we are associating the PARENT otherwise if it is
                  // a parent relation then we are associating the CHILD
                  relationType: relation?.schemaAssociation?.relationType === 'child' ? RelationTypeEnum.PARENT : RelationTypeEnum.CHILD,
                },
              ],
            },
          ],
        });
      }

    });
  }

  private initializeCreateLaedFromAddressForm() {
    const { updateLeadWorkflow, record } = this.props;
    updateLeadWorkflow({
      isCreateLeadFromAddressVisible: true,
      relatedRecord: record,
    });
  }

  private exportRecords() {
    const { record, relation, exportAssociationRecords, alertMessage, schemaReducer } = this.props;

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    const relationSchema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, relation?.schema?.id);

    if (!relationSchema?.columns) {
      return;
    }
    const defaultColumns = getElasticSearchKeysFromSchemaColumn(relationSchema, undefined);
    const userFields = [
      'title',
      'recordNumber',
      'createdAt',
      'updatedAt',
      ...defaultColumns?.map(column => column.dataIndex),
    ];

    let nestedEntities: string | undefined = undefined;
    if (relation.schema.entityName === 'CustomerDeviceOnt') {
      nestedEntities = 'Address';
      userFields.push('Address.dbRecords.properties.FullAddress');
    }

    exportAssociationRecords({
      recordId: record.id,
      schema,
      entity: relation.schema.entityName,
      userFields: userFields.join(),
      nestedEntities,
    }, (resp: any) => {
      if (resp) {
        fileDownload(resp.results, `${schema ? schema.entityName : 'data'}.csv`);
        alertMessage({ body: 'Records exported.', type: 'success' });
      }
    });
  }

  private async createInvoiceFromWorkOrder() {
    const { record, alertMessage } = this.props;
    await httpPost(
      `BillingModule/v1.0/invoices/workorder/${record.id}`, undefined,
    ).then(res => {
      const invoiceId = res.data?.data?.id;
      if (invoiceId) {
        alertMessage({ body: 'invoice created', type: 'success' });
        history.push(`/BillingModule/Invoice/${invoiceId}`);
      } else {
        alertMessage({ body: 'error creating invoice', type: 'error' });
      }
    }).catch(err => {
      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error creating invoice', type: 'error' });
    });
  }

  private async createBillingRequestFromContact() {
    const { record, alertMessage } = this.props;

    await httpPost(
      `${SchemaModuleTypeEnums.BILLING_MODULE}/v1.0/billing-requests/contact/${record.id}`, undefined,
    ).then(res => {
      const billingRequestId = res.data?.data?.id;
      if (billingRequestId) {
        alertMessage({ body: 'billing request created', type: 'success' });
        history.push(`/${SchemaModuleTypeEnums.BILLING_MODULE}/${SchemaModuleEntityTypeEnums.BILLING_REQUEST}/${billingRequestId}`);
      } else {
        alertMessage({ body: 'error creating billing request', type: 'error' });
      }
    }).catch(err => {
      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error creating billing request', type: 'error' });
    });
  }

  private renderActions() {
    // Render diff actions based on the record , related record
    const { relation, record, userReducer } = this.props;

    // when there is an association for ONE_TO_ONE and there are more than one records
    // hide the actions.
    if (relation?.schemaAssociation?.type === SchemaAssociationCardinalityTypes.ONE_TO_ONE) {
      const entityName = relation?.schema?.entityName ? relation?.schema?.entityName : '';
      // exclude service appointments
      if (relation.dbRecords && relation.dbRecords.length > 0 && ![
        'ServiceAppointment',
        'Product',
      ].includes(entityName) && [
        'OrderItem',
        'WorkOrder',
      ].includes(getModuleAndEntityNameFromRecord(record).entityName)) {
        if ([ 'OrderItem__CustomerDeviceOnt' ].includes(relation.schemaAssociation.label as string)) {
          return <Button
            disabled={relation ? !canUserUpdateRecord(userReducer, relation?.schema, record) : false}
            onClick={() => this.setState({ swapCustomerDeviceOntVisible: true })}>swap</Button>
        } else {
          return;
        }
      }
    }

    // ODN-1640 disable any action with related entities if record is locked
    if (checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin') && ![ 'Invoice__CreditNote' ].includes(relation?.schemaAssociation.label as string)) {
      return;
    }

    if (relation?.schemaAssociation?.relationType === RelationTypeEnum.PARENT) {
      return this.renderChildActions();
    }

    if (relation?.schemaAssociation?.relationType === RelationTypeEnum.CHILD) {
      return this.renderParentActions();
    }
  }

  private renderParentActions() {
    const { userReducer, record, relation, hidden, customActionOverride, recordReducer } = this.props;

    // get main record id based on the URL
    // and get it from the reducer in order to check it's stage
    const urlArr = window.location.pathname.split('/');
    const recordId = urlArr?.[urlArr.length - 1];
    const mainRecord = getRecordFromShortListById(recordReducer.shortList, recordId);

    // disable any action if Stage is Cancelled
    // if (mainRecord?.stage?.isFail) {
    //  return false
    // }

    if (customActionOverride) {
      <LookUpCreateModal record={record} relation={relation}/>
    }

    switch (relation?.schemaAssociation?.parentActions) {
      // Todo: This needs to be updated.
      case LOOKUP_AND_CREATE:
        if (relation?.schema?.entityName === SERVICE_APPOINTMENT) {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <BookingModal record={record} relation={relation} hidden={hidden}/>
                  </Menu.Item>
                  {relation.dbRecords ? <></> : <Menu.Item
                    disabled={!isSystemAdmin(userReducer)}
                    onClick={() => this.initializeCreateForm()}
                  >
                    Create New
                  </Menu.Item>}
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          );
        } else if (relation.schema.entityName === 'Product' && relation.schema.moduleName === 'ProductModule') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <OfferProductSelector record={record} relation={relation} relatedProductUpdate/>
                  </Menu.Item>
                </Menu>
              )}>
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        } else if (addressParentAssociationsLabels.includes(relation?.schemaAssociation?.label as string)) {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <LookUpCreateModal record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        } else {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!canUserCreateRecord(userReducer, relation.schema)}
                    onClick={() => this.initializeCreateForm()}
                  >
                    Create
                  </Menu.Item>
                  <Menu.Item className="list-action-menu-item">
                    <LookUpDrawer record={record} relation={relation}/>
                  </Menu.Item>
                  {this.renderExportAction()}
                </Menu>
              )}>
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        }

      case LOOKUP_ONLY:
        if (relation?.schema?.entityName === SERVICE_APPOINTMENT) {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <BookingModal record={record} relation={relation} hidden={hidden}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          );
        } else if (relation?.schemaAssociation?.label === 'Order__OrderItem') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <OfferProductSelector record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        } else if (relation?.schemaAssociation?.label === 'OrderItem__Product') {
          return false
        } else if (relation?.schemaAssociation?.label === 'PriceBook__Product') {

          return (

            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <LookUpDrawer record={record} relation={relation} hidden={hidden}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )

        } else if (relation?.schemaAssociation?.label === 'Offer__Product') {

          return (

            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <PriceBookProductSelector record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )

        } else if (relation?.schemaAssociation?.label === 'Invoice__InvoiceItem') {

          return (

            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <PriceBookProductSelector record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )

        } else if (relation?.schemaAssociation?.label === 'Feature__Product') {

          return (

            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <LookUpDrawer record={record} relation={relation} hidden={hidden}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          );

        } else if (relation?.schema?.entityName === PRODUCT) {

          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <PriceBookProductSelector record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          )
        } else {

          if (customActionOverride) {
            return <LookUpCreateModal record={record} relation={relation}/>
          } else if (addressParentAssociationsLabels.includes(relation?.schemaAssociation?.label as string)) {
            return (
              <Dropdown
                trigger={[ 'click' ]}
                overlay={(
                  <Menu className="list-action-menu">
                    <Menu.Item className="list-action-menu-item">
                      <LookUpCreateModal record={record} relation={relation}/>
                    </Menu.Item>
                  </Menu>
                )}
              >
                <Button icon={<DownOutlined/>}/>
              </Dropdown>
            )
          } else {

            return (

              <Dropdown
                trigger={[ 'click' ]}
                overlay={(
                  <Menu className="list-action-menu">
                    <Menu.Item className="list-action-menu-item">
                      <LookUpDrawer record={record} relation={relation} hidden={hidden}/>
                    </Menu.Item>
                    {this.renderExportAction()}
                  </Menu>
                )}
              >
                <Button icon={<DownOutlined/>}/>
              </Dropdown>

            );
          }

        }
      case CREATE_ONLY:

        if (relation?.schemaAssociation?.label === 'Order__SplitOrder') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <SplitOrder record={record}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          );
        } else if (relation?.schemaAssociation?.label === 'Order__Invoice') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!record.stage?.isSuccess}
                    onClick={() => history.push(`/OrderModule/Order/${record?.id}/activate`)}
                  >
                    Create Invoice
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          )
        } else if (relation?.schemaAssociation?.label === 'WorkOrder__Invoice') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item>
                    <Popconfirm
                      title="Are you sure want to create an invoice from the work order?"
                      onConfirm={() => this.createInvoiceFromWorkOrder()}
                      okText="Yes"
                      cancelText="No"
                    >
                      Create Invoice
                    </Popconfirm>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          )
        } else if (relation?.schemaAssociation?.label === 'Contact__BillingRequest') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!canUserCreateRecord(userReducer, relation.schema)}
                  >
                    <Popconfirm
                      title="Are you sure want to create a Billing Request for all unpaid invoices of the contact?"
                      onConfirm={async () => await this.createBillingRequestFromContact()}
                      okText="Yes"
                      cancelText="No"
                    >
                      Create Billing Request
                    </Popconfirm>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          )
        } else if (relation?.schema?.entityName === PAYMENT_METHOD) {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <PaymentMethodForm record={record}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>

            </Dropdown>
          )
        } else if (relation?.schemaAssociation?.label === 'Order__WorkOrder') {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item className="list-action-menu-item">
                    <GenerateWorkOrder record={record}/>
                  </Menu.Item>
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>

          )
        } else {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!canUserCreateRecord(userReducer, relation.schema)}
                    onClick={() => this.initializeCreateForm()}
                  >
                    Create New
                  </Menu.Item>
                  {this.renderExportAction()}
                </Menu>
              )}
            >
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          );
        }
      default:
        return <div/>;
    }
  }

  private renderExportAction() {
    const { relation, recordAssociationReducer } = this.props;

    if (relation?.schemaAssociation?.label === 'NetworkDevice__CustomerDeviceOnt') {
      return (
        <Menu.Item
          disabled={recordAssociationReducer.isExporting}
          onClick={() => this.exportRecords()}
        >Export</Menu.Item>
      );
    }
  }

  private renderChildActions() {
    const { userReducer, record, relation, hidden, recordReducer } = this.props;
    const { schemaAssociation } = relation;

    // get main record id based on the URL
    // and get it from the reducer in order to check it's stage
    const urlArr = window.location.pathname.split('/');
    const recordId = urlArr?.[urlArr.length - 1];
    const mainRecord = getRecordFromShortListById(recordReducer.shortList, recordId);

    // disable any action if Stage is Cancelled
    // if (mainRecord?.stage?.isFail) {
    //  return false
    // }

    switch (schemaAssociation.childActions) {
      case LOOKUP_AND_CREATE:
        if ([ 'Lead__Address' ].includes(relation.schemaAssociation.label as string)) {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!canUserCreateRecord(userReducer, relation.schema)}
                    onClick={() => this.initializeCreateLaedFromAddressForm()}
                  >
                    Create New
                  </Menu.Item>
                  <Menu.Item className="list-action-menu-item">
                    <LookUpDrawer record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}>
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        } else {
          return (
            <Dropdown
              trigger={[ 'click' ]}
              overlay={(
                <Menu className="list-action-menu">
                  <Menu.Item
                    disabled={!canUserCreateRecord(userReducer, relation.schema)}
                    onClick={() => this.initializeCreateForm()}
                  >
                    Create New
                  </Menu.Item>
                  <Menu.Item className="list-action-menu-item">
                    <LookUpDrawer record={record} relation={relation}/>
                  </Menu.Item>
                </Menu>
              )}>
              <Button icon={<DownOutlined/>}/>
            </Dropdown>
          )
        }

      case LOOKUP_ONLY:
        return (
          <Dropdown
            trigger={[ 'click' ]}
            overlay={(
              <Menu className="list-action-menu">
                <Menu.Item className="list-action-menu-item">
                  <LookUpDrawer record={record} relation={relation} hidden={hidden}/>
                </Menu.Item>
              </Menu>
            )}
          >
            <Button icon={<DownOutlined/>}/>
          </Dropdown>
        );
      case CREATE_ONLY:
        return (
          <Dropdown
            trigger={[ 'click' ]}
            overlay={(
              <Menu className="list-action-menu">
                <Menu.Item
                  disabled={!canUserCreateRecord(userReducer, relation.schema)}
                  onClick={() => this.initializeCreateForm()}
                >
                  Create New
                </Menu.Item>
              </Menu>
            )}
          >
            <Button icon={<DownOutlined/>}/>
          </Dropdown>
        );
      default:
        return <div/>;
    }
  }

  private handleFormSubmit(params: { event: string, res: any }) {
    switch (params.event) {

      case CREATE_DB_RECORD_REQUEST:
        this.fetchAssociations();
        break;

      case UPDATE_DB_RECORD_BY_ID_REQUEST:
        this.fetchAssociations();
        break;
    }
  }

  private fetchAssociations() {
    const { getAssociations, record, relation, schemaReducer, getRecordById } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    if (record) {
      if (record && schema) {
        getRecordById({ schema, recordId: record.id });
        getAssociations({
          recordId: record.id,
          key: relation.schema.entityName,
          schema: relation.schema,
          entities: [ relation.schema.entityName ],
        });
      }
      return <div>data fetched</div>;
    }
  }

  returnDisabledBillingAdjustment() {

    const { record, recordAssociationReducer, relation } = this.props;

    const associationKey = `${record?.id}_OrderItem`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    if (relation.dbRecords === undefined) {
      return false
    }
    if (moment(relation.dbRecords?.[0].createdAt).add(relation.dbRecords?.[0].properties.FreePeriodLength, 'M')
      .isBefore(moment(associationObj?.OrderItem?.dbRecords?.[0].properties.NextBillingDate))) {
      return false
    } else {
      return true
    }

  }


  render() {
    const { record, relation } = this.props;
    return (
      <>
        <CreateContactModal associatingRecordId={this.state.associatingRecordId}
                            excludeFromCreate={this.state.excludeFromCreate} visible={this.state.createContactVisible}
                            schema={this.state.schema} passDataToParent={(e: any) => {
          this.setState({ createContactVisible: e })
        }}/>
        {relation !== undefined ?
          <SwapCustomerDeviceOnt
            record={record}
            relatedRecord={relation.dbRecords}
            swapCustomerDeviceOntVisible={this.state.swapCustomerDeviceOntVisible}
            passDataToParent={(e: any) => {
              this.setState({ swapCustomerDeviceOntVisible: e })
            }}
            relation={relation}/>
          :
          <></>
        }
        <ActivateCustomerDeviceOnt
          relation={relation}
          record={record}
          schema={this.state.schema}
          passDataToParent={(e: any) => {
            this.setState({ createBroadbandVisible: e })
          }}
          visible={this.state.createBroadbandVisible}
          associatingRecordId={this.state.associatingRecordId}/>

        <OdinFormModal
          formUUID={this.state.uuid}
          onSubmitEvent={(params: { event: string, res: any }) => this.handleFormSubmit(params)}/>

        <div style={{ display: 'flex' }}>
          {this.renderActions()}
        </div>
      </>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  getUsers: (cb: any) => dispatch(listUsers(cb)),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  getSchema: (payload: ISchemaById, cb: any) => dispatch(getSchemaByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  initializeForm: (params: any) => dispatch(initializeRecordForm(params)),
  exportAssociationRecords: (params: IExportAssociationRecords, cb: () => {}) => dispatch(
    exportAssociationRecordsRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  createOrderVisible: () => dispatch(createOrderFromAccountVisible()),
  updateLeadWorkflow: (params: ILeadWorkflow) => dispatch(updateLeadWorkflow(params)),
});


// @ts-ignore
export default connect(mapState, mapDispatch)(ListActionMenu);
