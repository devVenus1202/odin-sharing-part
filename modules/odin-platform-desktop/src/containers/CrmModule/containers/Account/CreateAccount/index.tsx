import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Descriptions } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import React from 'react';
import { connect } from 'react-redux';
import { FormReducer } from '../../../../../core/records/components/Forms/store/reducer';
import LookUpCreate from '../../../../../core/records/components/LookUpCreate';
import { createRecordsRequest, getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { createAccountVisible } from '../../../../../core/workflow/store/actions';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import StepView from '../../../../../shared/components/StepView';
import { changeStepNumber, IStepViewChangeStepNumber, IStepViewValidation, setStepValidationArray } from '../../../../../shared/components/StepView/store/actions';
import { StepViewReducerState } from '../../../../../shared/components/StepView/store/reducer';
import { getRecordFromShortListById } from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';
import history from '../../../../../shared/utilities/browserHisory';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { getRecordAssociationsRequest, IGetRecordAssociations, updateOrCreateRecordAssociations } from '../../../../../core/recordsAssociations/store/actions';
import { IGetSchemaById } from '@d19n/models/dist/rabbitmq/rabbitmq.interfaces';
import { getSchemaByIdRequest } from '../../../../../core/schemas/store/actions';
interface Props {
  workflowReducer: WorkflowReducer,
  createAccountVisible: any,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  stepViewReducer: StepViewReducerState,
  setValidationData: (params: IStepViewValidation[]) => void,
  schemaReducer: SchemaReducerState,
  createRecord: any,
  recordFormReducer: FormReducer,
  recordReducer: IRecordReducer,
  alertMessage: Function,
  getAssociations: (params: IGetRecordAssociations) => void,
  createAssociations: any,
  getSchemaById: any,
  getRecordById: (payload: IGetRecordById, cb?: any) => void
}

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { CONTACT, ADDRESS, ACCOUNT } = SchemaModuleEntityTypeEnums;

interface State {
  addressId: string | undefined,
  createdContactId: string | undefined
}

class CreateAccountModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    
    addressId: undefined,
    createdContactId: undefined
  })

  renderSteps() {
    const { stepViewReducer, schemaReducer, getAssociations } = this.props;
    let contactSchema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      CRM_MODULE,
      CONTACT,
    );
    const stepsArray = [
      {
        name: 'Create Address',
        content:  <LookUpCreate
                    isNextDisabled={(e: any) => this.setStepViewState(stepViewReducer.currentStep, e)}
                    entityName={ADDRESS}
                    moduleName={CRM_MODULE}
                    checkboxItemSelect={(e: any) => this.setState({ addressId: e.id })}
                    lookupCreateComponent/>,
        entityName: ADDRESS,
      },
      {
        name: 'Create Contact',
        content:  <LookUpCreate
                    isNextDisabled={(e: any) => this.setStepViewState(stepViewReducer.currentStep, e)}
                    entityName={CONTACT}
                    moduleName={CRM_MODULE}
                    checkboxItemSelect={(e: any) => {
                      this.setState({ createdContactId: e.id });
                    }}
                    skipAssociationSelect={(e: any) => {
                      this.skipStep();
                      this.setState({ createdContactId: e.id });
                      if(contactSchema && e){
                        getAssociations({
                          recordId: e.id,
                          key: CONTACT,
                          schema: contactSchema,
                          entities: [ ADDRESS ],
                        });
                      }
                    }}
                    associations={[
                      { recordId: this.state.addressId ? this.state.addressId : '' }
                    ]}
                    lookupCreateComponent/>,
                    entityName: 'Contact',
      },
      {
        name: 'Summary',
        content: this.renderSummaryStep(),
        entityName: 'Summary'
      }
    ];


    return stepsArray
  }

  skipStep() {

    const { stepViewReducer, setValidationData, alertMessage, changeStep } = this.props;
    const tempArr = stepViewReducer.stepComponentsData;
    if((tempArr.length - 2) === stepViewReducer.currentStep) {
      // if next step is the summary step
      tempArr[stepViewReducer.currentStep + 1].isNextDisabled = false;
    } else {
      tempArr[stepViewReducer.currentStep + 1].isNextDisabled = true;
    }
    setValidationData(tempArr);

    changeStep({ stepNumber: stepViewReducer.currentStep + 1 })

    alertMessage({ body: 'record association created', type: 'success' });

  }

  renderSummaryStep() {
    const { recordReducer } = this.props;
    const contactRecord = getRecordFromShortListById(recordReducer.shortList, this.state.createdContactId);
    const addressRecord = getRecordFromShortListById(recordReducer.shortList, this.state.addressId);
    return (
      <div>
        <Descriptions
          style={{ marginBottom: 14 }}
          size="small"
          layout="horizontal"
          column={1}
        >
          { 
            <Descriptions.Item label={'Address'}>
              {addressRecord?.properties.FullAddress}
            </Descriptions.Item>
          }
          
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
      </div>
    )
  }

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if(tempStepData[stepNumber]) {
      if(tempStepData[stepNumber-1]) tempStepData[stepNumber-1].isNextDisabled = true;
      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);

      changeStep({ stepNumber });

    }

  }

  onNextButtonClick(params: any, cb: any) {
    const { 
      schemaReducer,
      getSchemaById,
      createAssociations,
      getAssociations,
      getRecordById
    } = this.props;
    switch (params.entityName) {
      case ADDRESS:
        const addressSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, ADDRESS);
        cb(true);
        this.setStepViewState(1, true);
        if (addressSchema && this.state.addressId) {
          getRecordById({ schema: addressSchema, recordId: this.state.addressId });
        }
      break
      case 'Contact':
        const contactSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, CONTACT);
        getSchemaById({ schemaId: contactSchema?.id }, (res: any) => {
            
          const schema = res;

          const modelAssociation = schema?.associations?.find((elem: any) => elem?.label === 'Contact__Address');

          createAssociations({
            recordId: this.state.createdContactId,
            schema: schema,
            schemaAssociation: modelAssociation,
            createUpdate: [
              { recordId: this.state.addressId },
            ],
          }, (res: any) => {
            if(res) {
              if(contactSchema !== undefined && this.state.createdContactId) {
                getAssociations({
                  recordId: this.state.createdContactId,
                  key: CONTACT,
                  schema: contactSchema,
                  entities: [ ADDRESS ],
                });
                getRecordById({ schema: contactSchema, recordId: this.state.createdContactId })
              }
              cb(true);
              this.setStepViewState(2, false);
            } else {
              cb(false);
            }
          });
        });
      break
    }
  }


  finishAccountCreate = async (cb: any) => {
    const { createRecord, schemaReducer, recordReducer } = this.props;
    const accountSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, ACCOUNT);
    const contactRecord = getRecordFromShortListById(recordReducer.shortList, this.state.createdContactId);
    let modified: any = []
    modified = [
      {
        associations: [
          { recordId: this.state.addressId },
          { recordId: this.state.createdContactId },
        ],
        entity: "CrmModule:Account",
        title: contactRecord?.properties.FirstName +
                ' ' + contactRecord?.properties.LastName +
                (contactRecord?.properties.Phone !== null ? (' ' + contactRecord?.properties.Phone) : ''),
        schemaId: accountSchema?.id,
      }
    ]
    createRecord({
      schema: accountSchema,
      createUpdate: modified,
    }, (res: DbRecordEntityTransform) => {
      if(res) {
        cb(true);
        history.push(`/CrmModule/Account/${res.id}`);
        this.resetModalData();
      } else {
        cb(false);
      }
    });
  }

  resetModalData() {
    const { createAccountVisible, stepViewReducer, setValidationData } = this.props;
    createAccountVisible();
    const tempArr = stepViewReducer.stepComponentsData;
    this.setState(this.getInitialState());
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }

 

  render() {
    const { workflowReducer } = this.props;

    return (
      <>
        <Modal className="cancel-appointment-modal"
               title="Create Account"
               visible={workflowReducer.Account?.isCreateAccountVisible}
               footer={null}
               width={1000}
               style={{ top: 20 }}
               onCancel={(e) => {
                 this.resetModalData()
               }}
               maskClosable={false}
        >
          <StepView
            isLookupCreate
            onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
            onSubmit={(cb: any) => {
              this.finishAccountCreate(cb)
            }}
            previousDisabled
            steps={this.renderSteps()}
          />
        </Modal>
      </>
    )
  }
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  stepViewReducer: state.stepViewReducer,
  schemaReducer: state.schemaReducer,
  recordFormReducer: state.recordFormReducer,
  recordReducer: state.recordReducer
});

const mapDispatch = (dispatch: any) => ({
  createAccountVisible: () => dispatch(createAccountVisible()),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  createRecord: (params: any, cb: any) => dispatch(createRecordsRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  createAssociations: (params: any, cb: () => {}) => dispatch(updateOrCreateRecordAssociations(params, cb)),
  getSchemaById: (payload: IGetSchemaById, cb: any) => dispatch(getSchemaByIdRequest(payload, cb)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
});

// @ts-ignore
export default connect(mapState, mapDispatch)(CreateAccountModal);
