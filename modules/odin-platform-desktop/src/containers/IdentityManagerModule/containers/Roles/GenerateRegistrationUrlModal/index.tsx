import { Input, Form, Modal } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from "react-router-dom";
import { setGenerateRegistrationUrlModalVisible } from '../../../../../core/identityUser/store/actions';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { copyText } from '../../../../../shared/utilities/domHelpers';

import { validate as uuidValidate } from 'uuid';

const registrationText = 'registration-text';

interface Props {
  identityUserReducer: IdentityUserReducer,
  userReducer: any,
  setModalVisible: any,
  alertMessage: any,
  match: any
}

interface State {
  roleId: string
}

class GenerateRegistrationUrlModal extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      roleId: uuidValidate(props.match?.params?.roleId) ? props.match?.params?.roleId : undefined,
    }
  }

  closeModal() {
    const { setModalVisible } = this.props;
    setModalVisible(false);
  }

  handleOk = async (e: any) => {
    const { alertMessage } = this.props;
    copyText(registrationText);
    alertMessage({body: 'URL has been copied.', type: 'success'});
  }

  renderForm() {
    const getUrl = window.location;
    const registrationUrl = getUrl.protocol + "//" + getUrl.host + "/register/roleId=" + this.state.roleId + "&organizationId=" + this.props.userReducer.user.organization.id;
    return (
      <div id={registrationText}>{registrationUrl}</div>
    )
  }

  render() {

    const { identityUserReducer } = this.props;
    return (
      <Modal
        title={'Registration URL'}
        visible={identityUserReducer?.generateRegistrationUrlModalVisible && !!this.state?.roleId}
        onCancel={() => this.closeModal()}
        onOk={this.handleOk}
        okText="Copy URL"
        cancelText="Cancel"
      >
        {this.renderForm()}
      </Modal>
    );
  }
}

const mapState = (state: any) => ({
    identityUserReducer: state.identityUserReducer,
    userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  setModalVisible: (visible: boolean) => dispatch(setGenerateRegistrationUrlModalVisible(visible)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params))
});

export default withRouter(connect(mapState, mapDispatch)(GenerateRegistrationUrlModal));