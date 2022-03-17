import { ExclamationCircleOutlined } from '@ant-design/icons';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Button, Modal } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import { getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { canUserDeleteRecord, hasAnyRoles, isSystemAdmin } from '../../../../../shared/permissions/rbacRules';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { checkRecordIsLocked } from '../../../../../shared/utilities/recordHelpers';


interface Props {
  schema: SchemaEntity | undefined,
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  userReducer: IdentityUserReducer,
  alertMessage: any,
  getSchema: any,
  getRecordById: any
  hidden?: string[],
}

interface State {
  isLoading: boolean,
  confirmDeleteRecord: boolean,
}

class VoidInvoice extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      isLoading: false,
      confirmDeleteRecord: false,
    }
  }

  handleOk = async () => {
    const { schemaReducer, record, alertMessage } = this.props;
    this.setState({
      isLoading: true,
    });

    const body = {};

    await httpPost(
      `BillingModule/v1.0/invoices/${record.id}/void`,
      body,
    ).then(res => {

      alertMessage({ body: 'invoice voided', type: 'success' });

    }).catch(err => {

      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error processing payment', type: 'error' });

    });

    this.setState({
      isLoading: false,
      confirmDeleteRecord: false,
    });
  };

  renderDisabledState() {
    const { userReducer, schema, record } = this.props;
    
    if (!canUserDeleteRecord(userReducer, schema, record) || checkRecordIsLocked(record) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')) {
      return true;
    } else if ((getProperty(record, 'Status') === 'VOID') && !isSystemAdmin(userReducer)) {
      return true;
    } else {
      return false;
    }
  }

  render() {

    return (
      <>
        <Modal
          title="Confirmation"
          confirmLoading={this.state.isLoading}
          visible={this.state.confirmDeleteRecord}
          onOk={() => this.handleOk()}
          onCancel={() => this.setState({ confirmDeleteRecord: false })}
          okText="Confirm"
          cancelText="Cancel"
        >
          <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#ff4d4f' }}/>
          <p>Are you sure you want to void the invoice?.</p>
        </Modal>
        <Button
          type="primary"
          danger
          disabled={
            this.renderDisabledState()
          }
          onClick={() => this.setState({ confirmDeleteRecord: true })}>Void</Button>
      </>
    );
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(VoidInvoice);

