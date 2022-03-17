import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Descriptions, Drawer, Input, Space, Table } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { FormReducer } from '../../../../../core/records/components/Forms/store/reducer';
import { updateRecordByIdRequest } from '../../../../../core/records/store/actions';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import {
  getRecordAssociationsRequest,
  getRecordAssociationWithNestedEntitiesRequest,
  IGetRecordAssociations,
  IGetRecordAssociationWithNestedEntites,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import {
  createOrderFromLeadVisible,
  IOrderCheckout,
  orderCheckoutRequest,
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
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';

interface Props {
  workflowReducer: WorkflowReducer,
  schemaReducer: SchemaReducerState
  createOrderFromLeadVisible: any,
  stepViewReducer: StepViewReducerState,
  setValidationData: (params: IStepViewValidation[]) => void
  changeStep: (params: IStepViewChangeStepNumber) => void,
  record: DbRecordEntityTransform,
  recordAssociationReducer: IRecordAssociationsReducer,
  alertMessage: Function,
  orderCheckout: (params: IOrderCheckout, cb: any) => void,
  recordFormReducer: FormReducer,
  updateRecord: any,
  getAssociationWithNestedEntities: (params: IGetRecordAssociationWithNestedEntites, cb: any) => {},
  getAssociations: (params: IGetRecordAssociations, cb: any) => void,
  goCardlessErrorMessage: any
}

interface State {
  paymentMethodForm: {
    accountNumber: string | undefined,
    branchCode: string | undefined
  },
  createdPaymenthMethodId: string | undefined
}

const { ADDRESS, CONTACT, PRODUCT, OFFER, PAYMENT_METHOD } = SchemaModuleEntityTypeEnums;

const { CRM_MODULE, PRODUCT_MODULE } = SchemaModuleTypeEnums;

class CreateOrderFromLead extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }


  componentDidUpdate(prevProps: Readonly<Props>) {
    if(prevProps.workflowReducer.Order?.isCreateOrderFromLeadVisible !== this.props.workflowReducer.Order?.isCreateOrderFromLeadVisible) {
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
        name: PRODUCT,
        content: <AssociationDataTable
          title={PRODUCT}
          record={record}
          moduleName={PRODUCT_MODULE}
          entityName={PRODUCT}
          customActionOverride/>,
        entityName: PRODUCT,
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
    const { record, recordAssociationReducer } = this.props;

    const associationKeyAddress = `${record?.id}_${ADDRESS}`;
    const associationObjAddress: any = recordAssociationReducer.shortList[associationKeyAddress];
    const addressRecord = associationObjAddress && associationObjAddress[ADDRESS] ? associationObjAddress?.[ADDRESS].dbRecords : undefined;

    const associationKeyContact = `${record?.id}_${CONTACT}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const contactRecord = associationObjContact && associationObjContact[CONTACT] ? associationObjContact?.[CONTACT].dbRecords?.[0] : undefined;

    const associationKeyProduct = `${record?.id}_${PRODUCT}`;
    const associationObjProduct: any = recordAssociationReducer.shortList[associationKeyProduct];
    let productRecord = associationObjProduct && associationObjProduct[PRODUCT] ? associationObjProduct?.[PRODUCT].dbRecords : undefined;

    if(contactRecord && addressRecord && productRecord) {

      productRecord?.map((elem: any) => (elem.key = elem.id));

      return (
        <>
          <Descriptions
            style={{ marginBottom: 14 }}
            size="small"
            layout="horizontal"
            column={1}
          >
            {addressRecord?.map((element: any, index: number) => {
              return (
                <Descriptions.Item label={'Address' + (index === 0 ? '' : index)}>
                  {element?.properties.FullAddress}
                </Descriptions.Item>
              )
            })}

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
                  record.properties.Name
                ),
              },
              {
                dataIndex: 'UnitPrice',
                key: 'unitPrice',
                render: (text: any, record: any) => (
                  record.properties?.UnitPrice
                ),
              },
            ]}
            dataSource={productRecord}
            pagination={false}
            showHeader={false}
            expandable={{
              expandedRowRender: record =>
                <>
                  {record.properties?.DiscountType ?
                    <p style={{ margin: 0 }}><strong>Discount Type: </strong>{record.properties.DiscountType}
                    </p> : <></>}
                  {record.properties?.DiscountValue ?
                    <p style={{ margin: 0 }}><strong>Discount Value: </strong>{record.properties.DiscountValue}
                    </p> : <></>}
                  {record.properties?.LegalTerms ?
                    <p style={{ margin: 0 }}><strong>Legal Terms: </strong>{record.properties.LegalTerms}</p> : <></>}
                </>,
            }}
            summary={pageData => {
              let total = 0;
              pageData?.forEach(({ properties }) => {
                total += parseInt(properties?.UnitPrice);
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
    } else {
      return (
        <></>
      )
    }
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
    const { schemaReducer, changeStep, getAssociations, record, recordAssociationReducer } = this.props;
    switch (params.entityName) {
      case ADDRESS:
        this.setStepViewState(1, false);
        cb(true);
        break
      case CONTACT:
        this.setStepViewState(2, false);
        cb(true);
        break
      case PRODUCT:
        const associationKeyContact = `${record?.id}_${CONTACT}`;
        const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
        const contactRecord = associationObjContact?.[CONTACT].dbRecords?.[0];
        const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, CONTACT)
        getAssociations({
          recordId: contactRecord.id,
          key: CONTACT,
          schema: schema as SchemaEntity,
          entities: [ PAYMENT_METHOD ],
        }, (res: any) => {
          // if contact has paymenth method skip adding payment method step
          if(res.results[PAYMENT_METHOD]?.dbRecords) {
            this.setStepViewState(4, false);
            changeStep({stepNumber: 4})
            cb(false);
          } else {
            this.setStepViewState(3, false);
            cb(true);
          }
        });
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
        this.setState({
          createdPaymenthMethodId: data.data.id,
        })
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
    const { record, recordAssociationReducer, recordFormReducer, getAssociationWithNestedEntities } = this.props;
    let tempArr: any = [];
    const associationKeyAddress = `${record?.id}_${ADDRESS}`;
    const associationObjAddress: any = recordAssociationReducer.shortList[associationKeyAddress];
    const addressRecord = associationObjAddress?.[ADDRESS].dbRecords?.[0];

    const associationKeyContact = `${record?.id}_${CONTACT}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const contactRecord = associationObjContact?.[CONTACT].dbRecords?.[0];

    const associationKeyProduct = `${record?.id}_${PRODUCT}`;
    const associationObjProduct: any = recordAssociationReducer.shortList[associationKeyProduct];
    const productRecord = associationObjProduct?.[PRODUCT].dbRecords;

    productRecord?.forEach((el: any) => {
      tempArr.push(
        {
          recordId: el?.id,
          relatedAssociationId: el?.dbRecordAssociation?.relatedAssociationId,
        },
      )
    });

    const body: IOrderCheckout = {
      addressId: addressRecord.id,
      contactId: contactRecord.id,
      products: tempArr,
    }

    const associationKeyOffer = `${record?.id}_${OFFER}`;
    const associationObjOffer: any = recordAssociationReducer.shortList[associationKeyOffer];
    if(!associationObjOffer) {
      getAssociationWithNestedEntities({
        recordId: this.props.record.id,
        key: OFFER,
        schema: recordFormReducer.schema as SchemaEntity,
        entity: OFFER,
        nestedEntities: [],
      }, (res: any) => {
        const offerRecord = res.results?.[OFFER]?.dbRecords?.[0];
        this.perfomCheckout(body, offerRecord?.id, recordFormReducer, record, cb);
      });
    } else {
      const offerRecord = associationObjOffer?.[OFFER]?.dbRecords?.[0];
      this.perfomCheckout(body, offerRecord?.id, recordFormReducer, record, cb);
    }
  }

  private perfomCheckout(
    body: IOrderCheckout,
    offerId: string,
    recordFormReducer: FormReducer,
    record: DbRecordEntityTransform,
    cb: any,
  ) {
    const { orderCheckout, updateRecord } = this.props;

    body.offerId = offerId;

    orderCheckout(body, (res: any) => {
      updateRecord({
        schema: recordFormReducer.schema,
        recordId: record.id,
        createUpdate: recordFormReducer.modified[0],
      });
      cb(true)
      this.resetDrawerData();
    })
  }

  resetDrawerData() {
    const { createOrderFromLeadVisible, stepViewReducer, setValidationData } = this.props;
    createOrderFromLeadVisible();
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
          title={`Update Lead`}
          visible={workflowReducer?.Order?.isCreateOrderFromLeadVisible}
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
  recordFormReducer: state.recordFormReducer,
  schemaReducer: state.schemaReducer
});

const mapDispatch = (dispatch: any) => ({
  createOrderFromLeadVisible: () => dispatch(createOrderFromLeadVisible()),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  orderCheckout: (params: IOrderCheckout, cb: any) => dispatch(orderCheckoutRequest(params, cb)),
  updateRecord: (params: any, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  getAssociationWithNestedEntities: (params: IGetRecordAssociationWithNestedEntites, cb: any) => dispatch(
    getRecordAssociationWithNestedEntitiesRequest(params, cb)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  goCardlessErrorMessage: (params: any) => dispatch(goCardlessErrorMessage(params)),
});



export default connect(mapState, mapDispatch)(CreateOrderFromLead);

