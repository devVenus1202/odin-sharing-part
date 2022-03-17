import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Input, Modal, Space } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { IConatctIdentityWorkflow, updateContactIdentityWorkflow } from '../../../../../core/workflow/store/actions';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import StepView from '../../../../../shared/components/StepView';
import { changeStepNumber, IStepViewChangeStepNumber, IStepViewValidation, setStepValidationArray } from '../../../../../shared/components/StepView/store/actions';
import { StepViewReducerState } from '../../../../../shared/components/StepView/store/reducer';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';
import { displayMessage, goCardlessErrorMessage } from '../../../../../shared/system/messages/store/reducers';
import { httpDelete, httpPost } from '../../../../../shared/http/requests';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { deleteRecordByIdRequest } from '../../../../../core/records/store/actions';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../../../core/recordsAssociations/store/actions';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import moment from 'moment';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';

interface Props {
  workflowReducer: WorkflowReducer,
  updateWorkflow: (params: IConatctIdentityWorkflow) => void,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  stepViewReducer: StepViewReducerState,
  setValidationData: (params: IStepViewValidation[]) => void,
  schemaReducer: SchemaReducerState,
  alertMessage: any,
  deleteRecord: any,
  getAssociations: (params: IGetRecordAssociations, cb: any) => void,
  goCardlessErrorMessage: any,
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => void
}

interface State {
  accountNumber: string | undefined,
  branchCode: string | undefined
}

const { CONTACT_IDENTITY, PAYMENT_METHOD, CONTACT } = SchemaModuleEntityTypeEnums;
const { BILLING_MODULE, CRM_MODULE } = SchemaModuleTypeEnums;
const activeMandateStatus = [ 'ACTIVE', 'SUBMITTED', 'REINSTATED', 'CREATED', 'PENDING_SUBMISSION', 'CUSTOMER_APPROVAL_GRANTED' ];

class MandateUpdate extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    accountNumber: undefined,
    branchCode: undefined
  })

  componentDidUpdate(prevProps: Readonly<Props>) {
    if(prevProps.workflowReducer[CONTACT_IDENTITY]?.isUpdateMandateModalVisible !== this.props.workflowReducer[CONTACT_IDENTITY]?.isUpdateMandateModalVisible) {
      setTimeout(() => {
        this.setStepViewState(0, false)
      });
    }
  }

  renderSteps() {
    const stepsArray = [
      {
        name: 'Cancel the current Mandate',
        content:  this.renderCancelMandateStep(),
        entityName: 'cancelMandate',
      },
      {
        name: 'Add new Mandate',
        content: this.renderAddMandateStep(),
        entityName: 'addMandate',
      }
    ];
    return stepsArray
  }

  renderCancelMandateStep() {
    return (
      <div>
        <p>If you want to update mandate click on the <strong>Next</strong> button.</p>
        <p><strong>This action can not be undone.</strong></p>
      </div>
    )
  }

  renderAddMandateStep() {
    return (
      <>
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
      </>
    )
  }

  private onNextButtonClick(params: any, cb: any) {
    switch (params.entityName) {
      case 'cancelMandate':
        this.cancelMandate(cb);
      break
    }
  }

  private cancelMandate = async(cb: any) => {
    const { schemaReducer, getSchema } = this.props;
    
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, CONTACT_IDENTITY);
    if (!schema) {
      getSchema({moduleName: CRM_MODULE, entityName: CONTACT_IDENTITY}, (res: SchemaEntity) => {
        this.finishCancelMandate(res, cb);
      })
    } else {
      this.finishCancelMandate(schema, cb);
    }
  }

  private finishCancelMandate(schema: SchemaEntity, cb: any) {
    const { workflowReducer, alertMessage, getAssociations, goCardlessErrorMessage } = this.props;
    // get Contact identity related record in order to extract ExternalId prop
    getAssociations({
      recordId: workflowReducer[CONTACT_IDENTITY].contactRecord?.id,
      key: CONTACT,
      schema: schema,
      entities: [ CONTACT_IDENTITY ],
    }, async (res: any) => {
      if(res.results[CONTACT_IDENTITY].dbRecords) {
        const record = res.results[CONTACT_IDENTITY].dbRecords[0];
        const activeMandate = workflowReducer[CONTACT_IDENTITY].records.find((el: any) => activeMandateStatus.includes(el.properties?.Status));
        // cancel contact mandate
        if(activeMandate) {
          await httpPost(
            `BillingModule/v1.0/gocardless/mandates/${activeMandate?.properties.ExternalRef}/actions/cancel`,
            {},
          ).then(() => {
            this.removeCustomer(cb, record);
            alertMessage({ body: 'cancel mandate requested', type: 'success' });
            
          }).catch(err => {
            cb(false)
            goCardlessErrorMessage(err)
          });
        } else {
          this.removeContactIdentityAssociation(cb, record);
        }
      } else {
        alertMessage({ body: 'Sorry, something went wrong.', type: 'error' });
      }
    });
  }

  private removeCustomer(cb: any, contactIdentityRecord: DbRecordEntityTransform) {
    const { workflowReducer, alertMessage, goCardlessErrorMessage } = this.props;
    
    if(workflowReducer[CONTACT_IDENTITY].records.length) {
      // remove customer from contact identity
      httpDelete(
        `BillingModule/v1.0/gocardless/customers/${contactIdentityRecord?.properties.ExternalId}`,
        {},
      ).then(() => {
        this.removeContactIdentityAssociation(cb, contactIdentityRecord)
        alertMessage({ body: 'remove customer requested', type: 'success' });

      }).catch(err => {
        cb(false);
        goCardlessErrorMessage(err)
      });
    } else {
      cb(false);
    }
  }

  private removeContactIdentityAssociation(cb: any, contactIdentityRecord: DbRecordEntityTransform) {
    const { deleteRecord, schemaReducer, workflowReducer } = this.props;
    const contactIdentitySchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, CONTACT_IDENTITY);
    const paymentMethodSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, BILLING_MODULE, PAYMENT_METHOD);
    // delete contact identity
    deleteRecord({
      schema: contactIdentitySchema,
      recordId: contactIdentityRecord?.id ? contactIdentityRecord?.id : null,
    }, () => {
      // delete payment methods
      workflowReducer[CONTACT_IDENTITY].records.forEach((el: any) => {
        deleteRecord({
          schema: paymentMethodSchema,
          recordId: !!el?.id ? el?.id : null,
        });
      });
      cb(true);
    });
  }

  private resetModalData() {
    const { updateWorkflow } = this.props;
    updateWorkflow({isUpdateMandateModalVisible: false});
    this.setState(this.getInitialState());
  }

  private finishMandateUpdate = async (cb: any) => {
    const { workflowReducer, alertMessage, goCardlessErrorMessage } = this.props;
    if(this.state.accountNumber !== undefined && this.state.branchCode !== undefined) {
      if(workflowReducer[CONTACT_IDENTITY].contactRecord?.id) {
        // add new mandate
        await httpPost(`BillingModule/v1.0/contact/${workflowReducer[CONTACT_IDENTITY].contactRecord?.id}/payment-methods`, {
          identityName: 'GOCARDLESS',
          bankDetails: {
            accountNumber: this.state.accountNumber,
            branchCode: this.state.branchCode,
          },
          authorizedDirectDebit: true,
        }).then(({ data }) => {
  
          if(data.data) {
            if(moment().utc().isAfter(data.data.createdAt)) {
              cb(false);
              alertMessage({
                body: `nothing to do the customers mandate is ${getProperty(
                  data.data,
                  'Status',
                )}`, type: 'success',
              });
            } else {
              this.resetModalData();
              cb(true);
              alertMessage({ body: 'A new mandate was created', type: 'success' });
            }
          }
        }).catch(err => {
          cb(false);
          goCardlessErrorMessage(err);
        });
      } else {
        alertMessage({ body: 'Sorry, something went wrong.', type: 'error' });
      }
    } else {
      cb(false);
      alertMessage({ body: 'Please fill in the Account Number and Branch Code', type: 'error' });
    }

  } 

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if(tempStepData[stepNumber]) {
      
      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);

      changeStep({ stepNumber });

    }

  }

  render() {
    const { workflowReducer } = this.props;

    return (
      <Modal className="cancel-appointment-modal"
        title="Update Mandate"
        visible={workflowReducer[CONTACT_IDENTITY]?.isUpdateMandateModalVisible}
        width={1000}
        style={{ top: 20 }}
        onCancel={(e) => {
          this.resetModalData()
        }}
        maskClosable={false}
        footer={null}
      >
        <StepView
          isLookupCreate
          onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
          onSubmit={(cb: any) => {
            this.finishMandateUpdate(cb)
          }}
          previousDisabled
          steps={this.renderSteps()}/>
      </Modal>
    )
  }
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  stepViewReducer: state.stepViewReducer,
  schemaReducer: state.schemaReducer
});

const mapDispatch = (dispatch: any) => ({
  updateWorkflow: (params: any) => dispatch(updateContactIdentityWorkflow(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  deleteRecord: (payload: any, cb: any) => dispatch(deleteRecordByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  goCardlessErrorMessage: (params: any) => dispatch(goCardlessErrorMessage(params)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(MandateUpdate);
