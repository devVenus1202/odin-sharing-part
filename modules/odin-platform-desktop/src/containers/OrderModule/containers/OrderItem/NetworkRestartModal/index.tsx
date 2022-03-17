import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Button, Modal, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';


interface Props {
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  hidden?: string[],
  getAssociations: any,
  alertMessage: any,
  getSchema: any,
}


class NetworkRestartModal extends React.Component<Props> {
  state = { showModal: false, isLoading: false, data: undefined };

  handleCancel = () => {
    this.setState({
      showModal: false,
      isLoading: false,
      data: undefined,
    });
  };


  handleOk = async () => {
    const { record, alertMessage } = this.props;
    this.setState({
      isLoading: true,
    });

    console.log(JSON.stringify(record));

    await httpPost(
      `ServiceModule/v1.0/network/adtranont/data/${record.id}/restart`,
      {},
    ).then(res => {
      console.log(res);
      alertMessage({ body: 'restart successful', type: 'success' });
      this.setState({
        isLoading: false,
        data: res.data.data,
      })
    }).catch(err => {

      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error processing your request', type: 'error' });
    });
  };


  render() {
    const { record } = this.props;

    return (
      <>
        <Button onClick={() => this.setState({ showModal: true })}>Reboot ONT</Button>
        <Modal
          title="Reboot ONU"
          visible={this.state.showModal}
          onOk={() => this.handleOk()}
          onCancel={() => this.handleCancel()}
          confirmLoading={this.state.isLoading}
          okText="Reboot"
          cancelText="Cancel"
        >
          <p>{'Rebooting will take approximately 1-3 minutes and will disrupt connection, would you like to continue?'}</p>

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
      </>
    );
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(NetworkRestartModal);

