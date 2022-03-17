import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Divider, Modal, Popover, Table } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import LookUpCreate from '../../../../../core/records/components/LookUpCreate';
import { getRecordByIdRequest, IGetRecordById, updateRecordByIdRequest } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  deleteAssociationByModuleNameAndId,
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../../../../core/recordsAssociations/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import {
  IInitializeSwapAddress,
  initializeSwapAddress,
  updateAddressWorkflow,
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
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import history from '../../../../../shared/utilities/browserHisory';
import { getRecordFromShortListById } from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';


interface Props {
  workflowReducer: WorkflowReducer,
  initializeSwapAddress: (params: IInitializeSwapAddress) => void,
  getAssociations: (params: IGetRecordAssociations, cb: any) => void,
  schemaReducer: SchemaReducerState,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  stepViewReducer: StepViewReducerState,
  setValidationData: (params: IStepViewValidation[]) => void,
  updateAddressWorkflow: any,
  recordReducer: IRecordReducer,
  alertMessage: any,
  updateRecord: any,
  deleteAssociation: (params: DbRecordEntityTransform, cb: any) => void
  getRecordById: (payload: IGetRecordById, cb?: any) => any
}

interface State {
  addressId: string | undefined,
  selected: any,
  selectedRowKeys: any
}

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { ORDER, WORK_ORDER, VISIT, INVOICE, CUSTOMER_DEVICE_ONT, CONTACT, LEAD, ACCOUNT, ADDRESS } = SchemaModuleEntityTypeEnums;

class SwapAddress extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    addressId: undefined,
    selected: [],
    selectedRowKeys: [],
  })

  finishAddressSwap(cb: any) {
    const { schemaReducer, alertMessage, updateRecord, deleteAssociation } = this.props;
    const addressSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, ADDRESS);
    // if no records are selected display error message
    if (!this.state.selected.length) {
      alertMessage({
        body: `Please select record to swap`, type: 'error',
      });
      cb(false)
      return
    }
    if (addressSchema) {
      let tempAssociations: any = [];
      this.state.selected.forEach((element: any) => {
        tempAssociations.push({ recordId: element.id })
      });
      // delete the associations whit selected records and previous address
      this.state.selected.forEach((element: DbRecordEntityTransform) => {
        deleteAssociation(element, (res: any) => {
        })
      });
      // update created address with selected records
      updateRecord({
        schema: addressSchema,
        recordId: this.state.addressId,
        schemaAssociation: undefined,
        createUpdate: {
          entity: `${CRM_MODULE}:${ADDRESS}`,
          associations: tempAssociations,
        },
      }, (res: DbRecordEntityTransform) => {
        // go to the created address detail view
        history.push(`/CrmModule/Address/${this.state.addressId}`);
        this.resetModalData();
        cb(true);
      });
    }
  }

  resetModalData() {
    const { initializeSwapAddress, updateAddressWorkflow, stepViewReducer, setValidationData } = this.props;
    initializeSwapAddress({
      isSwapAddressVisible: false,
    });
    updateAddressWorkflow({
      associatedRecords: [],
      addressRecord: undefined,
    });
    this.setState(this.getInitialState());
    const tempArr = stepViewReducer.stepComponentsData;
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }

  renderSteps() {
    const stepsArray = [
      {
        name: 'Create Address',
        content: <LookUpCreate
          entityName={ADDRESS}
          moduleName={CRM_MODULE}
          checkboxItemSelect={(e: any) => {
            this.setState({ addressId: e.id });
            this.setStepViewState(0, false);
          }}
          lookupCreateComponent/>,
        entityName: ADDRESS,
      },
      {
        name: 'Swap Associations',
        content: this.renderSwapAssociationsStep(),
        entityName: 'SwapAssociations',
      },
    ];
    return stepsArray
  }

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if (tempStepData[stepNumber]) {
      if (tempStepData[stepNumber - 1]) tempStepData[stepNumber - 1].isNextDisabled = true;
      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);

      changeStep({ stepNumber });

    }

  }

  onNextButtonClick(params: any, cb: any) {
    const { getAssociations, schemaReducer, workflowReducer, getRecordById, updateAddressWorkflow } = this.props;
    switch (params.entityName) {
      case ADDRESS:
        const addressSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, ADDRESS);
        if (addressSchema && workflowReducer.Address?.addressRecord && this.state.addressId) {
          getRecordById({ schema: addressSchema, recordId: this.state.addressId });
          // fetch all associations that are connected to the address
          getAssociations({
            recordId: workflowReducer.Address?.addressRecord?.id,
            key: ADDRESS,
            schema: addressSchema,
            entities: [ ORDER, WORK_ORDER, VISIT, INVOICE, CUSTOMER_DEVICE_ONT, CONTACT, LEAD, ACCOUNT ],
          }, (result: any) => {
            let tempArr = [] as any;

            if (result.results) {
              // make a new array of associated records
              const keys = Object.keys(result.results);
              for(const key of keys) {
                result.results[key]?.dbRecords?.forEach((el: any) => {
                  tempArr.push(el)
                })
              }
              // update workflow with associated records
              updateAddressWorkflow({ associatedRecords: tempArr })
            }

          });
        }
        cb(true);
        this.setStepViewState(1, false);
        break
    }
  }

  addRemoveItem = (items: any) => {
    this.setState({
      selected: items,
    })
  };

  renderSwapAssociationsStep() {
    const { workflowReducer, recordReducer } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, this.state.addressId);
    const dataSource = workflowReducer[ADDRESS]?.associatedRecords;
    dataSource?.map((el: any) => el.key = el.id)
    const columns = [
      {
        title: 'Title',
        key: 'title',
        dataIndex: 'title',
      },
      {
        title: 'Entity',
        dataIndex: 'entity',
        key: 'entity',
      },
      {
        title: 'Record Number',
        dataIndex: 'recordNumber',
        key: 'recordNumber',
      },
      {
        title: '',
        dataIndex: 'details',
        key: 'details',
        render: (text: any, record: any) => (
          <>
            <Popover
              title={record.type ? `${record.type} ${record.title}` : record.title}
              content={
                <div
                  style={{
                    width: 300,
                  }}
                >
                  <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
                </div>}>
              <span style={{ cursor: 'pointer', color: 'rgba(0, 0, 0, 0.45)' }}>Details</span>
            </Popover>
          </>
        ),
      },
    ];
    return <>
      <div>
        <div>Please select record to associate with <strong>{record?.title}</strong>.</div>
        <div>Note: All associations with <strong>{workflowReducer.Address?.addressRecord?.title}</strong> will be
          deleted.
        </div>
      </div>
      <Divider/>
      <Table
        rowSelection={{
          type: 'checkbox',
          onChange: (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
            this.addRemoveItem(selectedRows);
            this.setState({ selectedRowKeys: selectedRowKeys })
          },
          selectedRowKeys: this.state.selectedRowKeys,
        }}
        scroll={{ y: 'calc(100vh - 315px)' }}
        style={{ minHeight: '100%', width: '100%' }}
        size="small"
        dataSource={dataSource}
        columns={columns}
      ></Table>
    </>
  }

  render() {
    const { workflowReducer } = this.props;
    return (

      <Modal className="cancel-appointment-modal"
             title="Migrate Records"
             visible={workflowReducer.Address?.isSwapAddressVisible}
             width={1000}
             style={{ top: 20 }}
             onCancel={(e) => {
               this.resetModalData()
             }}
             footer={null}
             maskClosable={false}
      >
        <StepView
          isLookupCreate
          onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
          onSubmit={(cb: any) => {
            this.finishAddressSwap(cb)
          }}
          previousDisabled
          steps={this.renderSteps()}
        />
      </Modal>

    );
  }
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  schemaReducer: state.schemaReducer,
  stepViewReducer: state.stepViewReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  initializeSwapAddress: (params: IInitializeSwapAddress) => dispatch(initializeSwapAddress(params)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  updateAddressWorkflow: (params: any) => dispatch(updateAddressWorkflow(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  updateRecord: (params: any, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  deleteAssociation: (params: any, cb: any) => dispatch(deleteAssociationByModuleNameAndId(params, cb)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
});


export default connect(mapState, mapDispatch)(SwapAddress);

