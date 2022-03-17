import { Alert, Button, Descriptions, Divider, Modal } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { cancelAppointmentRequest, closeCancelAppointmentModal, createAppointmentRequest, ICreateServiceAppointment, initailizeCancelAppointmentModal } from '../../../../core/appointments/store/actions';
import { IAppointmentReducer } from '../../../../core/appointments/store/reducer';
import StepView from '../../../../shared/components/StepView';
import ChangeReasonForm from './containers/ChangeReasonForm';
import {
  changeStepNumber,
  IStepViewChangeStepNumber,
  setStepValidationArray,
} from '../../../../shared/components/StepView/store/actions';
import history from '../../../../shared/utilities/browserHisory';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { getRecordFromShortListById } from '../../../../shared/utilities/recordHelpers';
import { IRecordReducer } from '../../../../core/records/store/reducer';

interface Props {
  record: DbRecordEntityTransform,
  appointmentReducer: IAppointmentReducer,
  closeModal: any,
  cancelAppointment: any,
  stepViewReducer: any,
  setValidationData: any,
  changeStep: (params: IStepViewChangeStepNumber) => void,
  initializeCancelAppointment: any,
  createAppointment: (params: ICreateServiceAppointment, cb: () => any) => any,
  recordReducer: IRecordReducer
}

interface State {
  saveData: any
}

class ServiceAppointmentCancelModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      saveData: {},
    }
    this.setStepViewState(0, true);
  }

  handleSubmit(cb: any) {

    const { appointmentReducer, cancelAppointment, initializeCancelAppointment, record, createAppointment } = this.props;
    const saveData = this.state.saveData;

    if (saveData !== undefined) {

      if (appointmentReducer.reScheduleServiceAppointment) {
        initializeCancelAppointment({
          cancelModalVisible: false,
          reScheduleServiceAppointment: false,
        })
        createAppointment({
          workOrderId: record.id,
          createUpdate: {
            Date: appointmentReducer.newAppointmentData.Date,
            TimeBlock: appointmentReducer.newAppointmentData.AM ? 'AM' : 'PM',
            properties: saveData
          },
        }, () => {
          cb(true);
          this.resetModal();
        });
      } else {
        cancelAppointment(
          { id: appointmentReducer.cancelRelatedRecord?.id, saveData: { properties: saveData } },
          (res: any) => {
            cb(true);
            if (appointmentReducer.deleteFromDetail) {
              history.goBack();
            }
            this.resetModal();
          },
        );
      }
    }

  }

  // Step number is a positive number 1 >=
  setStepViewState(stepNumber: number, isTrue: boolean) {

    const { setValidationData, stepViewReducer, changeStep } = this.props;
    let tempStepData = stepViewReducer.stepComponentsData;

    if (tempStepData[stepNumber]) {

      tempStepData[stepNumber].isNextDisabled = isTrue;
      setValidationData(tempStepData);

      changeStep({ stepNumber });

    }

  }

  resetModal() {
    const { closeModal, stepViewReducer, setValidationData } = this.props;
    closeModal();
    const tempArr = stepViewReducer.stepComponentsData;
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }

  renderConfirmationDialog() {
    const { appointmentReducer } = this.props;
    if (appointmentReducer.cancelRelatedRecord && appointmentReducer.newAppointmentData) {
      return (
        <>
          <Descriptions layout='horizontal' size='small' title='Previous Appointment: '>
            <Descriptions.Item label="Date">
              {getProperty(appointmentReducer.cancelRelatedRecord, 'Date')}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {getProperty(appointmentReducer.cancelRelatedRecord, 'Type')}
            </Descriptions.Item>
            <Descriptions.Item label="TimeBlock">
              {getProperty(appointmentReducer.cancelRelatedRecord, 'TimeBlock')}
            </Descriptions.Item>
          </Descriptions>
          <Divider />
          <Descriptions layout='horizontal' size='small' title='New Appointment: '>
            <Descriptions.Item label="Date">
              {appointmentReducer.newAppointmentData?.Date}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {getProperty(appointmentReducer.cancelRelatedRecord, 'Type')}
            </Descriptions.Item>
            <Descriptions.Item label="TimeBlock">
              {appointmentReducer.newAppointmentData?.AM ? 'AM' : 'PM'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )
    } else return <></>

  }

  render() {

    const { appointmentReducer } = this.props;

    return (
      <>
        <Modal className="cancel-appointment-modal"
               title={(appointmentReducer.schemaType === 'SA_RESCHEDULE' ? "Reschedule" : "Cancellation") + ' Reason'}
               visible={appointmentReducer.cancelModalVisible}
               footer={null}
               onCancel={() => this.resetModal()}
        >
          <StepView
            onSubmit={(cb: any) => {
              this.handleSubmit(cb)
            }}
            previousDisabled
            steps={[
              {
                name: (appointmentReducer.schemaType === 'SA_RESCHEDULE' ? "Reschedule" : "Cancellation") + ' Reason',
                content: <ChangeReasonForm passDataToParent={(e: boolean) => this.setStepViewState(0, e)} saveData={(e: any) => this.setState({ saveData: e })}/>,        
              },
              {
                name: 'Confirmation',
                content:  (appointmentReducer.schemaType === 'SA_RESCHEDULE') ? this.renderConfirmationDialog() : <Alert
                  message="Cancelling Appointminet"
                  description="You are about to cancel an appointment. Click submit."
                  type="info"
                /> ,
              },
            ]}
          />
        </Modal>
      </>
    )
  }
}

const mapState = (state: any) => ({
  appointmentReducer: state.appointmentReducer,
  stepViewReducer: state.stepViewReducer,
  recordReducer: state.recordReducer
});

const mapDispatch = (dispatch: any) => ({
  closeModal: () => dispatch(closeCancelAppointmentModal()),
  cancelAppointment: (params: any, cb: any) => dispatch(cancelAppointmentRequest(params, cb)),
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  initializeCancelAppointment: (params: any) => dispatch(initailizeCancelAppointmentModal(params)),
  createAppointment: (params: ICreateServiceAppointment, cb: () => {}) => dispatch(createAppointmentRequest(
    params,
    cb,
  )),
});

// @ts-ignore
export default connect(mapState, mapDispatch)(ServiceAppointmentCancelModal);
