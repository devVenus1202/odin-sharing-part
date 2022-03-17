import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Descriptions, Drawer, Input, Space, Table } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import {
  createOrderFromAccountVisible,
  IOrderCheckout,
  orderCheckoutRequest,
  updateOrderWorkflow,
} from '../../../../../core/workflow/store/actions';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import StepView from '../../../../../shared/components/StepView';
import {
  changeStepNumber,
  IStepViewChangeStepNumber,
  IStepViewValidation,
  setStepValidationArray,
} from '../../../../../shared/components/StepView/store/actions';
import { StepViewReducerState } from '../../../../../shared/components/StepView/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage, goCardlessErrorMessage } from '../../../../../shared/system/messages/store/reducers';
import CreateOrderOffer from '../CreateOrderWorkflow/containers/CreateOrderOffer';

interface Props {
  workflowReducer: WorkflowReducer,
  stepViewReducer: StepViewReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  recordReducer: IRecordReducer,
  record: DbRecordEntityTransform,
  setValidationData: (params: IStepViewValidation[]) => void,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  createOrderVisible: () => void,
  alertMessage: Function,
  orderCheckout: (params: IOrderCheckout, cb: any) => void,
  updateOrderWorkflow: (params: any) => void,
  goCardlessErrorMessage: any
}

interface State {
  paymentMethodForm: {
    accountNumber: string | undefined,
    branchCode: string | undefined
  }
}

const { ADDRESS, CONTACT, OFFER, ORDER } = SchemaModuleEntityTypeEnums;

const { CRM_MODULE } = SchemaModuleTypeEnums;

class CreateOrderFromAccount extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }


  componentDidUpdate(prevProps: Readonly<Props>) {
    if(prevProps.workflowReducer.Order.isCreateOrderFromAccountVisible !== this.props.workflowReducer.Order.isCreateOrderFromAccountVisible) {
      setTimeout(() => {
        this.setStepViewState(0, false)
      });
    }
  }

  getInitialState = () => ({
    paymentMethodForm: {
      accountNumber: '',
      branchCode: '',
    },
    createdPaymenthMethodId: undefined,
  });

  renderSteps() {
    const { record } = this.props;
    const stepsArray = [      
      {
        name: ADDRESS,
        content: <AssociationDataTable
          title={ADDRESS}
          record={record}
          moduleName={CRM_MODULE}
          entityName={ADDRESS}
          customActionOverride/>,
        entityName: ADDRESS,
      },
      {
        name: CONTACT,
        content: <AssociationDataTable
          title={CONTACT}
          record={record}
          moduleName={CRM_MODULE}
          entityName={CONTACT}
          customActionOverride/>,
        entityName: CONTACT,
      },
      {
        name: 'Select Offer',
        content: <CreateOrderOffer sendProductsToParent={(params: any) => this.selectProducts(params)} />,
        entityName: OFFER,
      },
      {
        name: 'Payment method',
        content: <>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.Password
              autoComplete="new-password"
              placeholder="bank account #"
              onChange={(e) => this.handlePaymentForm('accountNumber', e)}
              defaultValue={this.state.paymentMethodForm.accountNumber ? this.state.paymentMethodForm.accountNumber : ''}
            />
            <Input.Password
              autoComplete="new-password"
              placeholder="sort code"
              onChange={(e) => this.handlePaymentForm('branchCode', e)}
              defaultValue={this.state.paymentMethodForm.branchCode ? this.state.paymentMethodForm.branchCode : ''}
            />
          </Space>
        </>,
        entityName: 'PaymentMethod',
      },
      {
        name: 'Summary',
        content: this.renderSummaryStep(),
        entityName: 'Summary',
      },
    ];
    return stepsArray
  }

  renderSummaryStep() {
    const { record, workflowReducer, recordAssociationReducer } = this.props;

    const data = workflowReducer.Order?.selectedProductItems.concat(workflowReducer.Order.selectedBaseProductItems);

    const associationKeyAddress = `${record?.id}_${ADDRESS}`;
    const associationObjAddress: any = recordAssociationReducer.shortList[associationKeyAddress];
    const addressRecord = associationObjAddress && associationObjAddress[ADDRESS] ? associationObjAddress?.[ADDRESS].dbRecords?.[0] : undefined;

    const associationKeyContact = `${record?.id}_${CONTACT}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const contactRecord = associationObjContact && associationObjContact[CONTACT] ? associationObjContact?.[CONTACT].dbRecords?.[0] : undefined;

    return(
      <>
        <Descriptions
          style={{ marginBottom: 14 }}
          size="small"
          layout="horizontal"
          column={1}
        >
          <Descriptions.Item label={'Address'}>
            {addressRecord?.properties?.FullAddress}
          </Descriptions.Item>
          
        </Descriptions>
        <Descriptions
          style={{ marginBottom: 14 }}
          size="small"
          layout="horizontal"
          column={2}
        >
          <Descriptions.Item label={'Full Name'}>
            {contactRecord?.properties.FirstName + ' ' + contactRecord?.properties.LastName}
          </Descriptions.Item>
          <Descriptions.Item label={'Email'}>
            {contactRecord?.properties.EmailAddress}
          </Descriptions.Item>
        </Descriptions>
        <Table
          columns={[
            {
              dataIndex: 'Name',
              key: 'name',
              render: (text: any, record: any) => (
                record.title
              ),
            },
            {
              dataIndex: 'UnitPrice',
              key: 'unitPrice',
              render: (text: any, record: any) => (
                record.properties?.UnitPrice
              ),
            }
          ]}
          dataSource={data}
          pagination={false}
          showHeader={false}
          expandable={{
            expandedRowRender: record => 
              <>
                {record.properties?.DiscountType ? <p style={{ margin: 0 }}><strong>Discount Type: </strong>{record.properties.DiscountType}</p> : <></>}
                {record.properties?.DiscountValue ? <p style={{ margin: 0 }}><strong>Discount Value: </strong>{record.properties.DiscountValue}</p> : <></>}
                {record.properties?.LegalTerms ? <p style={{ margin: 0 }}><strong>Legal Terms: </strong>{record.properties.LegalTerms}</p> : <></>}
              </>,
          }}
          summary={pageData => {
            let total = 0;
            pageData?.forEach(({ properties }) => {
              total += parseInt(properties?.UnitPrice) ;
            });

            return (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><strong>Total:</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <strong>{total}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            );
          }}
        />
      </>
    )
  }

  handlePaymentForm(prop: string, e: any) {
    const { stepViewReducer } = this.props;
    this.setState({ paymentMethodForm: { ...this.state.paymentMethodForm, [prop]: e.target.value } })
    if(this.state.paymentMethodForm.accountNumber !== undefined &&
      this.state.paymentMethodForm.branchCode !== undefined &&
      this.state.paymentMethodForm.accountNumber !== '' &&
      this.state.paymentMethodForm.branchCode !== '') {
      this.setStepViewState(stepViewReducer.currentStep, false);
    }
  }

  selectProducts(params: {selectedAddOnProducts: any, selectedBaseProductItems: any}) {
    if(params.selectedBaseProductItems.length) {
      this.setStepViewState(2, false);
    } else {
      this.setStepViewState(2, true);
    }
  }

  

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if(tempStepData[stepNumber]) {
      if(tempStepData[stepNumber - 1]) tempStepData[stepNumber - 1].isNextDisabled = true;
      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);

      changeStep({ stepNumber });

    }

  }


  onNextButtonClick(params: any, cb: any) {
    switch (params.entityName) {
      case ADDRESS:
        this.setStepViewState(1, false);
        cb(true);
      break
      case CONTACT:
        this.setStepViewState(2, true);
        cb(true);
      break
      case OFFER:
        this.setStepViewState(3, false);
        cb(true);
      break
      case 'PaymentMethod':
        if(this.state.paymentMethodForm.accountNumber === '' && this.state.paymentMethodForm.branchCode === '') {
          this.setStepViewState(4, false);
          cb(true);
        } else {
          this.paymentMethodSubmit((callback: any) => {
            if(callback) {
              this.setStepViewState(4, false);
              cb(true);
            } else {
              cb(false);
            }
          })
        }
      break
    }
  }

  paymentMethodSubmit = async (cb: any) => {
    const { alertMessage, record, recordAssociationReducer, goCardlessErrorMessage } = this.props;
    const associationKeyContact = `${record?.id}_${CONTACT}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const contactRecord = associationObjContact?.[CONTACT].dbRecords?.[0];
    await httpPost(`BillingModule/v1.0/contact/${contactRecord?.id}/payment-methods`, {
      identityName: 'GOCARDLESS',
      bankDetails: {
        accountNumber: this.state.paymentMethodForm.accountNumber,
        branchCode: this.state.paymentMethodForm.branchCode,
      },
      authorizedDirectDebit: true,
    }).then(({ data }) => {
      if(data.data) {
        cb(true);
        if(moment().utc().isAfter(data.data.createdAt)) {
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
    }).catch(err => {
      cb(false);
      goCardlessErrorMessage(err);
    });
  }

  finishOrderFromLeadCreate(cb: any) {
    const { orderCheckout, workflowReducer, record, recordAssociationReducer } = this.props;
    let tempArr: any = [];
    const data = workflowReducer[ORDER]?.selectedProductItems.concat(workflowReducer[ORDER].selectedBaseProductItems);
    const offerId = workflowReducer[ORDER].selectedOfferId;

    const associationKeyAddress = `${record?.id}_${ADDRESS}`;
    const associationObjAddress: any = recordAssociationReducer.shortList[associationKeyAddress];
    const addressRecord = associationObjAddress && associationObjAddress[ADDRESS] ? associationObjAddress?.[ADDRESS].dbRecords?.[0] : undefined;

    const associationKeyContact = `${record?.id}_${CONTACT}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const contactRecord = associationObjContact && associationObjContact[CONTACT] ? associationObjContact?.[CONTACT].dbRecords?.[0] : undefined;

    data.forEach((el: any) => {
      tempArr.push(
        { recordId: el?.id ,
          relatedAssociationId: el?.dbRecordAssociation?.relatedAssociationId 
        }
      )
    })
    let body: IOrderCheckout;
    
    body = {
      addressId: addressRecord.id,
      contactId: contactRecord.id,
      products: tempArr,
      offerId
    }


    orderCheckout(body, (res: any) => {
      if(res) {
        cb(true)
        this.resetDrawerData();
      } else {
        cb(false)
      }
    })
  }


  resetDrawerData() {
    const { createOrderVisible, stepViewReducer, setValidationData, updateOrderWorkflow } = this.props;
    createOrderVisible();
    updateOrderWorkflow({selectedProductItems: [], selectedOfferId: undefined})
    const tempArr = stepViewReducer.stepComponentsData;
    this.setState(this.getInitialState());
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }


  render() {
    const { workflowReducer } = this.props;
    return (
      <>
        <Drawer
          className="custom-drawer"
          title={`Create Order`}
          visible={workflowReducer.Order.isCreateOrderFromAccountVisible}
          onClose={(e) => {
            this.resetDrawerData()
          }}
          width={1000}
        >
          <StepView
            isLookupCreate
            onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
            onSubmit={(cb: any) => {
              this.finishOrderFromLeadCreate(cb)
            }}
            steps={this.renderSteps()}
          />
        </Drawer>
      </>
    );
  }
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  stepViewReducer: state.stepViewReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  recordReducer: state.recordReducer
});

const mapDispatch = (dispatch: any) => ({  
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  createOrderVisible: () => dispatch(createOrderFromAccountVisible()),
  orderCheckout: (params: IOrderCheckout, cb: any) => dispatch(orderCheckoutRequest(params, cb)),
  updateOrderWorkflow: (params: any) => dispatch(updateOrderWorkflow(params)),
  goCardlessErrorMessage: (params: any) => dispatch(goCardlessErrorMessage(params)),
});


export default connect(mapState, mapDispatch)(CreateOrderFromAccount);

