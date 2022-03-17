import { Button, Drawer, Modal, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { INetworkManageWorkflow, updateNetworkManageWorkflow } from '../../../../../core/workflow/store/actions';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import PhonePortingCard from './PhonePorting';
import SipwiseActivationCard from './SipwiseActivation';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';


interface Props {
  workflowReducer: WorkflowReducer,
  updateNetworkManage: (params: INetworkManageWorkflow) => void,
  alertMessage: any,
  record: DbRecordEntityTransform
}

interface State {
  showModal: boolean,
  isLoading: boolean,
  data: any | undefined
}
class NetworkManageDrawer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    showModal: false,
    isLoading: false,
    data: undefined
  })

  handleCancel() {
    const { updateNetworkManage } = this.props
    updateNetworkManage({ networkManageDrawerVisible: false })
  }

  activateSipwise = async () => {
    const { workflowReducer, alertMessage } = this.props;
    this.setState({
      isLoading: true,
    });

    await httpPost(
      `ServiceModule/v1.0/network/adtranont/voice/${workflowReducer.NetworkManage?.record?.id}/activate`,
      {},
    ).then(res => {
      alertMessage({ body: 'voice activation successful', type: 'success' });
      this.setState({
        showModal: false,
        isLoading: false,
        data: res.data.data,
      })
    }).catch(err => {

      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error processing your request', type: 'error' });
    });
  };

  handleOk() {

  }

  render() {
    const { workflowReducer, record } = this.props;
    return(
      <>
        <Modal
          title="Activate Voice Request"
          visible={this.state.showModal}
          onOk={() => this.activateSipwise()}
          onCancel={() => this.setState({ showModal: false })}
          confirmLoading={this.state.isLoading}
          okText="Submit"
          cancelText="Cancel"
        >

          <p>{'Please confirm you would like to activate the voice service on the OLT'}</p>
          <p>Item: {workflowReducer.NetworkManage?.record?.title}</p>

          {this.state.isLoading ?
            <Spin spinning={this.state.isLoading}>
              Requesting...
            </Spin>
            : (
              <div>
                <code>
                  <pre style={{ overflow: 'auto', maxHeight: 400 }}>{JSON.stringify(this.state.data, null, 2)}</pre>
                </code>
              </div>
            )}
        </Modal>
        <Drawer
          title={`Manage Network Devices`}
          visible={workflowReducer.NetworkManage?.networkManageDrawerVisible}
          onClose={() => this.handleCancel()}
          width={1000}
        >
          <div 
            style={{
              display: 'flex',
              justifyContent: 'end'
            }}
          >
            <Button
              type='primary'
              style={{ marginRight: '.5rem' }}
              disabled={!workflowReducer.NetworkManage?.phoneRecord}
              onClick={() => this.setState({ showModal: true })}
            >
              Activate
            </Button>
            <Button 
              type='primary'
              disabled={true}
            >
              Check
            </Button>
          </div>
          <PhonePortingCard />
          <SipwiseActivationCard record={record}/>
        </Drawer>
      </>
      
    )
  }
  
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer
});

const mapDispatch = (dispatch: any) => ({
  updateNetworkManage: (params: INetworkManageWorkflow) => dispatch(updateNetworkManageWorkflow(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(NetworkManageDrawer);

