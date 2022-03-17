import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Modal } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import EmbeddedForm from '../../../../../core/records/components/Forms/EmbeddedForm';
import { ILeadWorkflow, updateLeadWorkflow } from '../../../../../core/workflow/store/actions';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import StepView from '../../../../../shared/components/StepView';
import { v4 as uuidv4 } from 'uuid';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import LookUpCreate from '../../../../../core/records/components/LookUpCreate';
import { changeStepNumber, IStepViewChangeStepNumber, IStepViewValidation, setStepValidationArray } from '../../../../../shared/components/StepView/store/actions';
import { StepViewReducerState } from '../../../../../shared/components/StepView/store/reducer';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { createRecordsRequest, getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import history from '../../../../../shared/utilities/browserHisory';
import { FormReducer } from '../../../../../core/records/components/Forms/store/reducer';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';

interface Props {
  workflowReducer: WorkflowReducer,
  schemaReducer: SchemaReducerState,
  recordFormReducer: FormReducer
  updateLeadWorkflow: (params: ILeadWorkflow) => void,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  stepViewReducer: StepViewReducerState,
  setValidationData: (params: IStepViewValidation[]) => void,
  alertMessage: Function,
  createRecord: (params: any, cb: any) => any,
  getRecordById: (payload: IGetRecordById, cb: any) => any
}

interface State {
  isLoading: boolean,
  createdContactId: string | undefined
}

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { LEAD, CONTACT } = SchemaModuleEntityTypeEnums;

const uuid = uuidv4();

class CreateLeadFromAddress extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    isLoading: false,
    createdContactId: undefined
  })

  renderSteps() {
    const { schemaReducer, workflowReducer, stepViewReducer } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, LEAD)
    const stepsArray = [
      {
        name: 'Add Contact',
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
                              }}
                              associations={[
                                { recordId: workflowReducer[LEAD]?.relatedRecord?.id ? workflowReducer[LEAD]?.relatedRecord?.id as string : '' }
                              ]}
                              lookupCreateComponent/>,
        entityName: 'Contact',
      },
      {
        name: 'Lead Create',
        content: <EmbeddedForm
                              isNextDisabled={(e: any) => this.setStepViewState(stepViewReducer.currentStep, e)}
                              isCreateRecord moduleName={CRM_MODULE} entityName={LEAD} formUUID={uuid} schema={schema}/>,
        entityName: 'Lead',
      }
    ];
    return stepsArray
  }

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if (tempStepData[stepNumber]) {
      if (tempStepData[stepNumber-1]) tempStepData[stepNumber-1].isNextDisabled = true;
      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);
      changeStep({ stepNumber });
    }
  }

  skipStep() {

    const { stepViewReducer, setValidationData, alertMessage, changeStep } = this.props;
    const tempArr = stepViewReducer.stepComponentsData;
    if ((tempArr.length - 2) === stepViewReducer.currentStep) {
      // if next step is the summary step
      tempArr[stepViewReducer.currentStep + 1].isNextDisabled = false;
    } else {
      tempArr[stepViewReducer.currentStep + 1].isNextDisabled = true;
    }
    setValidationData(tempArr);

    changeStep({ stepNumber: stepViewReducer.currentStep + 1 })

    alertMessage({ body: 'record association created', type: 'success' });

  }

  private resetModalData() {
    const { updateLeadWorkflow, stepViewReducer, setValidationData } = this.props;
    updateLeadWorkflow({ isCreateLeadFromAddressVisible: false });
    const tempArr = stepViewReducer.stepComponentsData;
    this.setState(this.getInitialState());
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }

  private finishLeadCreate(cb :any) {
    const { schemaReducer, createRecord, recordFormReducer, workflowReducer, getRecordById } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, LEAD);
    const contactSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, CONTACT);
    getRecordById({schema: contactSchema as SchemaEntity, recordId: this.state.createdContactId as string}, (contactRecord: DbRecordEntityTransform) => {
      let modified: any = [];
      modified = recordFormReducer.modified;
      modified[0].associations = [
        { recordId: this.state.createdContactId },
        { recordId: workflowReducer[LEAD]?.relatedRecord?.id }
      ];
      modified[0].title = workflowReducer[LEAD]?.relatedRecord?.title;
      modified[0].properties.EmailAddress = contactRecord.properties?.EmailAddress;
      createRecord({
        schema: schema,
        upsert: recordFormReducer.upsert,
        createUpdate: modified,
      }, (res: DbRecordEntityTransform) => {
        if (res) {
          cb(true);
          this.resetModalData();
          history.push(`/CrmModule/Lead/${res.id}`);
        } else {
          cb(false);
        }
      });
    });
  }

  private onNextButtonClick(params: any, cb: any) {
    switch (params.entityName) {
      case 'Contact':
        cb(true);
        this.setStepViewState(1, true);
      break
    }
  }

  render() {
    const { workflowReducer } = this.props

    return (
      <Modal className="cancel-appointment-modal"
            title="Create Lead"
            visible={workflowReducer[LEAD]?.isCreateLeadFromAddressVisible}
            width={1000}
            style={{ top: 20 }}
            onCancel={(e) => {
              this.resetModalData()
            }}
            footer={false}
            maskClosable={false}
            confirmLoading={this.state.isLoading}
      >
        <StepView
          isLookupCreate
          onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
          onSubmit={(cb: any) => {
            this.finishLeadCreate(cb)
          }}
          previousDisabled
          steps={this.renderSteps()}/>
      </Modal>
    )
  }

}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  schemaReducer: state.schemaReducer,
  stepViewReducer: state.stepViewReducer,
  recordFormReducer: state.recordFormReducer
});

const mapDispatch = (dispatch: any) => ({
  updateLeadWorkflow: (params: ILeadWorkflow) => dispatch(updateLeadWorkflow(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  createRecord: (params: any, cb: any) => dispatch(createRecordsRequest(params, cb)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(CreateLeadFromAddress);
