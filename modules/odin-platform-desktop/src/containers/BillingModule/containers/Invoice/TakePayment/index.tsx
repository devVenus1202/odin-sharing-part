import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select, Tabs } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';


const { Option } = Select;
const { TabPane } = Tabs;

interface Props {
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  hidden?: string[]
  getAssociations: any,
  alertMessage: any,
  getRecordById: any
}

const { TRANSACTION } = SchemaModuleEntityTypeEnums;

class InvoiceTakePayment extends React.Component<Props> {
  state = {
    visible: false,
    isLoading: false,
    authorized: false,
    paymentMethod: 'GOCARDLESS',
    externalRef: undefined,
    statusUpdatedAt: undefined,
    amount: 0,
  };

  showModal = () => {
    this.setState({
      visible: true,
    });
  };

  handleOk = async (e: any) => {
    const { schemaReducer, record, alertMessage } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    this.setState({
      isLoading: true,
    });
    if (record && schema) {
      await httpPost(
        `BillingModule/v1.0/transactions/invoices/${record.id}`,
        {
          externalRef: this.state.externalRef,
          paymentMethod: this.state.paymentMethod,
          amount: this.state.amount,
          properties: {
            StatusUpdatedAt: this.state.statusUpdatedAt,
          },
        },
      ).then(res => {

        this.setState({
          isLoading: false,
        });
        alertMessage({ body: res.data?.message || 'payment transaction created', type: 'success' });

      }).catch(err => {

        const error = err.response ? err.response.data : undefined;
        alertMessage({ body: error && error.message || 'error processing payment', type: 'error' });

      });

      this.setState({
        visible: false,
        isLoading: false,
      });
    }
  };

  handleCancel = (e: any) => {
    this.resetForm()
  };

  renderPaymentButtonState() {
    const { record, recordAssociationReducer } = this.props;
    const associationKey = `${record?.id}_${TRANSACTION}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    const invalidPaymentStatus = [ 'SUBMITTED', 'PAYMENT_PENDING', 'PENDING_SUBMISSION', 'PAID_OUT', 'CREATED' ];
    // if transaction status is one of the above disable 'Process Payment' button
    if (!!(associationObj?.[TRANSACTION]?.dbRecords?.find((el: any) => invalidPaymentStatus.includes(
      el.properties.Status))) || !(Number(getProperty(record, 'Balance')) > 0)) {
      return true
    } else {
      return false
    }
  }

  resetForm() {

    this.setState({
      visible: false,
      isLoading: false,
      authorized: false,
      amount: 0,
      paymentMethod: undefined,
      externalRef: undefined,
    })
  }


  render() {
    const { record } = this.props;

    return (
      <div>
        <Button type="primary" onClick={this.showModal} disabled={this.renderPaymentButtonState()}>
          Process Payment
        </Button>
        <Modal
          destroyOnClose
          title="Confirm Payment"
          visible={this.state.visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          okButtonProps={{
            disabled:
              !this.state.authorized ||
              !this.state.paymentMethod ||
              (this.state.paymentMethod !== 'GOCARDLESS' && !this.state.externalRef) ||
              (this.state.paymentMethod !== 'GOCARDLESS' && !this.state.statusUpdatedAt),
          }}
          confirmLoading={this.state.isLoading}
        >
          <Form>

            <Form.Item>
              <Select defaultValue="" value={this.state.paymentMethod} style={{ width: 300 }}
                      onChange={(val) => this.setState({
                        paymentMethod: val,
                        externalRef: undefined,
                      })}>
                <Option value="">Select Payment Method</Option>
                <Option value="GOCARDLESS">Gocardless</Option>
                <Option value="BANK_TRANSFER">Bank Transfer</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <DatePicker
                style={{ width: 300 }}
                defaultValue={this.state.statusUpdatedAt}
                format={'YYYY-MM-DD'}
                onChange={(val) => this.setState({
                  statusUpdatedAt: moment(val).format('YYYY-MM-DD'),
                })}
              />
            </Form.Item>

            <Form.Item
              initialValue={Number(getProperty(record, 'Balance'))}
            >
              <InputNumber
                style={{ width: 300 }}
                min={0}
                max={Number(getProperty(record, 'Balance'))}
                value={this.state.amount || Number(getProperty(record, 'Balance'))}
                onChange={(val) => this.setState({ amount: val })}/>
            </Form.Item>

            {this.state.paymentMethod !== 'GOCARDLESS' &&
            <Form.Item>
                <Input
                    style={{ width: 300 }}
                    placeholder={'payment reference number'}
                    value={this.state.externalRef}
                    onChange={(e) => this.setState({ externalRef: e.target.value })}/>
            </Form.Item>
            }
            <Form.Item>
              <Checkbox checked={this.state.authorized} onClick={() => this.setState({ authorized: true })}>Authorize
                payment</Checkbox>
            </Form.Item>

          </Form>
        </Modal>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(InvoiceTakePayment);

