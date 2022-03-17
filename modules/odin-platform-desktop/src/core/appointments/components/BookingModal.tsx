import { ClockCircleOutlined } from '@ant-design/icons';
import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Card, DatePicker, Drawer, Input, Modal, Popconfirm, Space, Spin } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { httpPost } from '../../../shared/http/requests';
import { canUserUpdateRecord, isSystemAdmin } from '../../../shared/permissions/rbacRules';
import { displayMessage, goCardlessErrorMessage } from '../../../shared/system/messages/store/reducers';
import { parseDateToLocalFormat } from '../../../shared/utilities/dateHelpers';
import { getRecordLink } from '../../../shared/utilities/recordHelpers';
import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../../shared/utilities/schemaHelpers';
import {
  deleteRecordByIdRequest,
  getRecordByIdRequest,
  IDeleteRecordById,
  IGetRecordById,
} from '../../records/store/actions';
import { IRecordReducer } from '../../records/store/reducer';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../recordsAssociations/store/reducer';
import {
  getSchemaByIdRequest,
  getSchemaByModuleAndEntityRequest,
  ISchemaById,
  ISchemaByModuleAndEntity,
} from '../../schemas/store/actions';
import { SchemaReducerState } from '../../schemas/store/reducer';
import { createAppointmentRequest, ICreateServiceAppointment, initailizeCancelAppointmentModal, loadAppointmentsRequest } from '../store/actions';

interface Props {
  record: DbRecordEntityTransform,
  relation: DbRecordAssociationRecordsTransform,
  hidden?: string[],
  userReducer: any,
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  schemaReducer: SchemaReducerState,
  getSchema: any,
  loadAppointments: any,
  createAppointment: any,
  appointmentReducer: any,
  deleteRecord: any,
  getAssociations: any,
  getRecordById: any,
  alertMessage: any,
  getSchemaByModuleAndEntity: (payload: ISchemaByModuleAndEntity) => void,
  goCardlessErrorMessage: any,
  initializeCancelAppointment: any
}

interface State {
  visible: boolean,
  start: string,
  paymentMethodFormVisible: boolean,
  isLoading: boolean,
  accountNumber: string,
  branchCode: string,
  contactId: string
}

const { CRM_MODULE, BILLING_MODULE } = SchemaModuleTypeEnums;

const { SERVICE_APPOINTMENT, PAYMENT_METHOD, CONTACT, ADDRESS } = SchemaModuleEntityTypeEnums;

const validPaymentMethod = [
  'ACTIVE',
  'SUBMITTED',
  'REINSTATED',
  'CREATED',
  'PENDING_SUBMISSION',
  'CUSTOMER_APPROVAL_GRANTED',
];

class BookingModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      visible: false,
      start: moment().format('YYYY-MM-DD'),
      paymentMethodFormVisible: false,
      isLoading: false,
      accountNumber: '',
      branchCode: '',
      contactId: '',
    };
    this.handleCloseDrawer = this.handleCloseDrawer.bind(this);
  }

  getInitialData() {
    const { schemaReducer, getSchemaByModuleAndEntity } = this.props;
    let paymentMethodSchema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      BILLING_MODULE,
      PAYMENT_METHOD,
    );
    let addressSchema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      CRM_MODULE,
      ADDRESS,
    );
    if (paymentMethodSchema === undefined) {
      getSchemaByModuleAndEntity({ moduleName: BILLING_MODULE, entityName: PAYMENT_METHOD })
    }
    if (addressSchema === undefined) {
      getSchemaByModuleAndEntity({ moduleName: CRM_MODULE, entityName: ADDRESS })
    }
  }

  componentDidMount() {
    this.getInitialData();
  }

  private initializeModal() {
    const { record, loadAppointments, getAssociations, schemaReducer, alertMessage, userReducer } = this.props;

    const addressLink = getRecordLink(record, `${CRM_MODULE}:${ADDRESS}`)

    let contactSchema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      CRM_MODULE,
      CONTACT,
    );
    let paymentMethodSchema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      BILLING_MODULE,
      PAYMENT_METHOD,
    );
    if (isSystemAdmin(userReducer)) {
      // if user isSystemAdmin allow him to add appointments without mandate check
      loadAppointments({
        start: moment().format('YYYY-MM-DD'),
        end: moment().add(7, 'days').format('YYYY-MM-DD'),
        type: getProperty(record, 'Type'),
        addressId: addressLink ? addressLink.id : undefined,
      });
      this.setState({
        visible: true,
      });
    } else {
      getAssociations({
        recordId: record.id,
        key: CONTACT,
        schema: contactSchema,
        entities: [ CONTACT ],
      }, (res: any) => {
        if (res.results.Contact.dbRecords) {
          this.setState({
            contactId: res.results.Contact.dbRecords[0].id,
          })
          getAssociations({
            recordId: this.state.contactId,
            key: PAYMENT_METHOD,
            schema: paymentMethodSchema,
            entities: [ PAYMENT_METHOD ],
          }, (res: any) => {
            // check if contact has any mandates associated
            if (res.results.PaymentMethod.dbRecords) {
              // check if contact in WO has valid mandate status
              if (this.checkPaymentMethodStatus(res.results.PaymentMethod.dbRecords)) {
  
                // if contact has one mandate with valid status initiate Appointment schedule
                loadAppointments({
                  start: moment().format('YYYY-MM-DD'),
                  end: moment().add(7, 'days').format('YYYY-MM-DD'),
                  type: getProperty(record, 'Type'),
                  addressId: addressLink ? addressLink.id : undefined,
                });
                this.setState({
                  visible: true,
                });
              } else {
                // if contact does not have any valid mandate display error message
                alertMessage({
                  body: `Valid Payment Method is missing`, type: 'error',
                });
              }
            } else {
              // if contact has no mandates associated display add mandate form
              this.setState({
                paymentMethodFormVisible: true,
              })
            }
          });
        }
      });
    }
  }

  private checkPaymentMethodStatus(dbRecords: DbRecordEntityTransform[]) {

    if (dbRecords.find((elem: DbRecordEntityTransform) => validPaymentMethod.includes(elem.properties.Status))) {
      return true;
    } else {
      return false
    }
  }

  private handleDateChange(start: string) {
    const { record, loadAppointments } = this.props;

    this.setState({
      start,
    });

    const addressLink = getRecordLink(record, `${CRM_MODULE}:${ADDRESS}`)

    console.log('addressLink', addressLink)

    loadAppointments({
      start: moment(start).format('YYYY-MM-DD'),
      end: moment(start).add(7, 'days').format('YYYY-MM-DD'),
      type: getProperty(record, 'Type'),
      addressId: addressLink ? addressLink.id : undefined,
    });
  }

  private handleOk(apt: { Date: string, AM: boolean, PM: boolean }) {
    const { recordAssociationReducer, record, initializeCancelAppointment, relation } = this.props;

    if (record && record.id) {
      const associationKey = `${record?.id}_${SERVICE_APPOINTMENT}`;
      const associationObj: any = recordAssociationReducer.shortList[associationKey];

      if (associationObj[SERVICE_APPOINTMENT].dbRecords) {
        // handle appointments with records
        this.handleCloseDrawer();
        initializeCancelAppointment({
          cancelModalVisible: true,
          cancelRelatedRecord: relation.dbRecords[0],
          reScheduleServiceAppointment: true,
          saveData: {},
          newAppointmentData: apt,
          schemaType: 'SA_RESCHEDULE'
        })
      } else {
        // Create service appointment for work order
        this.createNewAppointment(apt);
      }
    }
  };

  private createNewAppointment(apt: { Date: string, AM: boolean, PM: boolean }) {
    const { record, createAppointment } = this.props;
    if (record) {
      createAppointment({
        workOrderId: record.id,
        createUpdate: {
          Date: apt.Date,
          TimeBlock: apt.AM ? 'AM' : 'PM',
        },
      }, () => {
        this.handleCloseDrawer();
        this.getRecordAssociations();
        // fetch new associations
      });
    }
  };

  private getRecordAssociations() {
    const { getAssociations, record, schemaReducer, getRecordById } = this.props;

    if (record) {
      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
      if (schema) {
        getRecordById({ schema, recordId: record.id });
        getAssociations({
          recordId: record.id,
          key: SERVICE_APPOINTMENT,
          schema,
          entities: [ SERVICE_APPOINTMENT ],
        });
      }
    }

    return <div>data fetched</div>;

  }


  private handleCloseDrawer() {
    this.setState({
      visible: false,
    });
  };

  private renderListTitle() {
    const { recordAssociationReducer } = this.props;
    if (!!recordAssociationReducer.selected && recordAssociationReducer.selected.schema) {
      return `Book ${recordAssociationReducer.selected.schema.entityName}`
    } else {
      return 'Book Appointment';
    }
  };

  private renderConfirmBookingText(date: string | undefined, timeBlock: string) {
    const { recordAssociationReducer } = this.props;

    if (recordAssociationReducer.selected) {
      if (recordAssociationReducer.selected.dbRecords.length > 0) {
        return `This will cancel the current appointment and reserve a new appointment on ${date} for an ${timeBlock} time block`;
      } else {
        return `confirm ${timeBlock} booking`;
      }
    } else {
      return `confirm ${timeBlock} booking`;
    }
  };

  private renderAppointments() {
    const { appointmentReducer } = this.props;
    if (!!appointmentReducer.list) {
      return appointmentReducer.list.map((elem: { Date: string, AM: boolean, PM: boolean }) => (
        <Card title={parseDateToLocalFormat(elem.Date)} bordered={false} className="calendar-day-card">
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <Popconfirm
              title={this.renderConfirmBookingText(parseDateToLocalFormat(elem.Date), 'AM')}
              onConfirm={() => this.handleOk({ Date: elem.Date, AM: true, PM: false })}
              okText="Yes"
              cancelText="No"
              disabled={!elem.AM}
            >
              <Button disabled={!elem.AM} icon={<ClockCircleOutlined/>} className="time-am">AM</Button>
            </Popconfirm>
            <Popconfirm
              title={this.renderConfirmBookingText(parseDateToLocalFormat(elem.Date), 'PM')}
              onConfirm={() => this.handleOk({ Date: elem.Date, AM: false, PM: true })}
              okText="Yes"
              cancelText="No"
              disabled={!elem.PM}
            >
              <Button disabled={!elem.PM} icon={<ClockCircleOutlined/>} className="time-pm">PM</Button>
            </Popconfirm>
          </div>
        </Card>
      ));
    }
  }

  submitPaymentMethodForm = async () => {
    const { alertMessage, loadAppointments, record, goCardlessErrorMessage } = this.props;

    this.setState({
      isLoading: true,
    });

    await httpPost(`BillingModule/v1.0/contact/${this.state.contactId}/payment-methods`, {
      identityName: 'GOCARDLESS',
      bankDetails: {
        accountNumber: this.state.accountNumber,
        branchCode: this.state.branchCode,
      },
      authorizedDirectDebit: true,
    }).then(({ data }) => {

      this.setState({
        paymentMethodFormVisible: false,
        isLoading: false,
        visible: true,
      });

      loadAppointments({
        start: moment().format('YYYY-MM-DD'),
        end: moment().add(7, 'days').format('YYYY-MM-DD'),
        type: getProperty(record, 'Type'),
      });

      if (data.data) {
        if (moment().utc().isAfter(data.data.createdAt)) {
          alertMessage({
            body: `nothing to do the customers mandate is ${getProperty(
              data.data,
              'Status',
            )}`, type: 'success',
          });
        } else {
          alertMessage({ body: 'A new mandate was created', type: 'success' });
        }
      }
    }).catch(err => goCardlessErrorMessage(err));
  }

  render() {

    const { schemaReducer, userReducer, record, appointmentReducer } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    return (
      <div>
        <Modal
          title="Add Mandate"
          visible={this.state.paymentMethodFormVisible}
          onOk={() => this.submitPaymentMethodForm()}
          onCancel={() => {
            this.setState({
              paymentMethodFormVisible: false,
            })
          }}
          confirmLoading={this.state.isLoading}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.Password
              autoComplete="new-password"
              placeholder="bank account #"
              onChange={(e) => this.setState({ accountNumber: e.target.value })}/>
            <Input.Password
              autoComplete="new-password"
              placeholder="sort code"
              onChange={(e) => this.setState({ branchCode: e.target.value })}/>
          </Space>

        </Modal>
        <Button
          disabled={!canUserUpdateRecord(userReducer, schema)}
          type="text"
          onClick={() => this.initializeModal()}>
          Schedule / Re-schedule
        </Button>
        <Drawer
          title={this.renderListTitle()}
          visible={this.state.visible}
          onClose={() => this.handleCloseDrawer()}
          width={365}
        >
          <Spin spinning={appointmentReducer.isSearching} tip="Finding Appointments...">
            <Spin spinning={appointmentReducer.isCreating} tip="Saving Appointment...">
              <div style={{ padding: 10 }}>
                <DatePicker style={{ width: '100%' }} defaultValue={moment(this.state.start, 'YYYY-MM-DD')}
                            format={'YYYY-MM-DD'}
                            onChange={(date) => this.handleDateChange(moment(date).format('YYYY-MM-DD'))}/>
              </div>
              {this.renderAppointments()}
            </Spin>
          </Spin>
        </Drawer>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  appointmentReducer: state.appointmentReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaById, cb: any) => dispatch(getSchemaByIdRequest(payload, cb)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  deleteRecord: (payload: IDeleteRecordById, cb: any) => dispatch(deleteRecordByIdRequest(payload, cb)),
  loadAppointments: (params: any) => dispatch(loadAppointmentsRequest(params)),
  createAppointment: (params: ICreateServiceAppointment, cb: () => {}) => dispatch(createAppointmentRequest(
    params,
    cb,
  )),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  getSchemaByModuleAndEntity: (payload: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(payload)),
  goCardlessErrorMessage: (params: any) => dispatch(goCardlessErrorMessage(params)),
  initializeCancelAppointment: (params: any) => dispatch(initailizeCancelAppointmentModal(params)),
});


export default connect(mapState, mapDispatch)(BookingModal);
