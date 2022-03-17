import React from 'react'
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import DataGrid from './DataGrid'
import { Input, Modal, Space } from 'antd';
import { httpPost } from '../../shared/http/requests';
import { connect } from 'react-redux';
import { displayMessage } from '../../shared/system/messages/store/reducers';

const {
  PAYMENT_METHOD,
  INVOICE,
} = SchemaModuleEntityTypeEnums;
const { BILLING_MODULE } = SchemaModuleTypeEnums;

interface Props {
  record: any;
  userReducer: any;
  alertMessage: any;
}
function Billing(props: Props) {
  const { record, userReducer } = props;
  const [visibleModal, setVisibleModal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [accountNumber, setAccountNumber] = React.useState("");
  const [branchCode, setBranchCode] = React.useState("");
  const [currentItem, setCurrentItem] = React.useState({properties: {Provider:""}});
  const changePayment = () => {

  }
  const handleOk = async () => {
    const { alertMessage } = props;
    const identityName = currentItem.properties?.Provider
    setIsLoading(true);
    await httpPost(`BillingModule/v1.0/contact/${userReducer.user.contactId}/payment-methods`, {
      identityName: identityName,
      bankDetails: {
        accountNumber,
        branchCode,
      },
      authorizedDirectDebit: true,
    }).then(({ data }) => {
      setVisibleModal(false);
      setIsLoading(false);
    }).catch(err => {
      const error = err.response ? err.response.data : undefined;
      setIsLoading(false);
      alertMessage({ body: error && error.message || 'error generating invoice', type: 'error' });
    })
  }
  const handleCancel = () => {
    setVisibleModal(false);
  }
  const handleChange = (selectedItem: any) => {
    setCurrentItem(selectedItem);
    setVisibleModal(true);
  }
  return (
    <div>
      <Modal
        title="Add Mandate"
        visible={visibleModal}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={isLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.Password
            autoComplete="new-password"
            placeholder="bank account #"
            onChange={(e) => setAccountNumber(e.target.value)} />
          <Input.Password
            autoComplete="new-password"
            placeholder="sort code"
            onChange={(e) => setBranchCode(e.target.value)} />
        </Space>

      </Modal>
      <DataGrid
        title={PAYMENT_METHOD}
        record={record}
        moduleName={BILLING_MODULE}
        entityName={PAYMENT_METHOD}
        onClickAction={handleChange}
      />
      <DataGrid
        title={INVOICE}
        record={record}
        moduleName={BILLING_MODULE}
        entityName={INVOICE} />
    </div>
  )
}
const mapState = (state: any) => ({
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});

export default connect(mapState, mapDispatch)(Billing);
