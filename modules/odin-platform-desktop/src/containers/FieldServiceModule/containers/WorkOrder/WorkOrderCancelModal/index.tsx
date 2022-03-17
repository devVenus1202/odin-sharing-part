import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { Alert, Modal, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { cancelWorkOrderRequest } from '../../../../../core/workflow/store/actions';
import StepView from '../../../../../shared/components/StepView';
import ChangeReasonForm from './containers/ChangeReasonForm';


interface Props {
  record: DbRecordEntityTransform,
  stage: PipelineStageEntity | undefined,
  onClosEvent?: any,
  cancelWorkOrder: any
}

interface State {
  showModal: boolean,
  handlingStep2: boolean,
  saveData: any
}

class WorkOrderCancellationWorkflow extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      showModal: false,
      handlingStep2: false,
      saveData: {},
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {

    if (prevProps.stage !== this.props.stage) {

      if (this.props.stage) {

        this.initializeForm()

      }

    }
  }

  initializeForm() {

    this.setState({
      showModal: true,
    })
  }

  closeForm() {

    const { onClosEvent } = this.props;

    this.setState({
      showModal: false,
      handlingStep2: false,
    })

    onClosEvent()
  }

  handleSubmit() {

    const { record, cancelWorkOrder } = this.props;
    let saveData = this.state.saveData;

    if (saveData !== undefined) {

      const body = {
        properties: saveData
      }
      cancelWorkOrder({body, workOrderId: record.id}, (res: any) => {
        this.closeForm();
      });
    }
  }


  render() {

    const { stage } = this.props;

    return (
      <>
        <Modal className="cancel-appointment-modal"
               title="Cancel Work Order"
               visible={this.state.showModal}
               footer={null}
               onCancel={() => this.closeForm()}
        >
          {this.state.handlingStep2 ?
            <Spin tip="Loading...">
              <Alert
                message="Updating work order"
                description={`Updating the stage of the work order to ${stage?.name}`}
                type="info"
              />
            </Spin>
            :
            <StepView
              onSubmit={(cb: any) => this.handleSubmit()}
              previousDisabled
              steps={[
                {
                  name: 'Cancellation Reason',
                  content: <ChangeReasonForm saveData={(e: any) => this.setState({ saveData: e })}/>,
                },
              ]}
            />}
        </Modal>
      </>
    )
  }
}

const mapState = (state: any) => ({});

const mapDispatch = (dispatch: any) => ({
  cancelWorkOrder: (payload: any, cb: any) => dispatch(cancelWorkOrderRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(WorkOrderCancellationWorkflow);
