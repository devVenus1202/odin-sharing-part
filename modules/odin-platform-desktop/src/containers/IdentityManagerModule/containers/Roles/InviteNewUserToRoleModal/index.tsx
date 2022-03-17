import { Input, Form, Modal } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from "react-router-dom";
import { setInviteNewUserModalVisible } from '../../../../../core/identityUser/store/actions';
import { IdentityUserReducer } from '../../../../../core/identityUser/store/reducer';
import { sendRegistrationLinkRequest } from '../../../../../core/identity/store/actions'
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { validate as uuidValidate } from 'uuid';

interface Props {
  identityUserReducer: IdentityUserReducer,
  setModalVisible: any,
  alertMessage: any,
  sendRegistrationLink: any,
  match: any
}

interface State {
  email: string,
  roleId: string
}

class InviteNewUserToRoleModal extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      email: '',
      roleId: uuidValidate(props.match?.params?.roleId) ? props.match?.params?.roleId : undefined,
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    const test = 1;
  }

  handleOnChange = (email: string) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (re.test(email)) {
      this.setState({email: email});
    } else {
      this.setState({email: ''});
    }
  }

  handleSubmit = async () => {
    const { alertMessage, sendRegistrationLink } = this.props;

    let formHasErrors = false;

    try {
      await this.formRef?.current?.validateFields();
      const formErrors = this.formRef?.current?.getFieldsError() ?? [];
      const hasErrors = formErrors.filter(({ errors }) => errors.length).length > 0;

      if(hasErrors) {

        this.setState({email: ''});
        alertMessage({body: 'Form has errors, fix them and resubmit.', type: 'error'});

      } else if(this.state?.email && this.state?.roleId) {

        sendRegistrationLink({
          email: this.state?.email,
          roleId: this.state?.roleId
        }, (resp: any) => {
          if (resp) {
            alertMessage({body: 'Registration link was sent to the specified email.', type: 'success'});
          }
        });
        
        this.closeModal();
      } else {

        alertMessage({body: 'Specify the correct email to submit the form.', type: 'error'});
      }
    } catch (e) {
      this.setState({email: ''});
      console.error(e);
      alertMessage({body: 'Form has errors, fix them and resubmit.', type: 'error'});
    }

    if (formHasErrors) alertMessage({body: 'Form has errors, fix them and resubmit.', type: 'error'});
  }

  closeModal() {
    const { setModalVisible } = this.props;
    this.formRef.current?.resetFields();
    this.setState({email: ''});
    setModalVisible(false);
  }

  renderForm() {
    return (
      <Form 
        name={'Register New User'}
        ref={this.formRef}
        autoComplete='off'
      >
        <Form.Item
          key={'invite-email'}
          name={'invite-email'}
          //label="Email"
          //labelCol={{ span: 24 }}
          rules={[ { required: true, message: 'Please input email' } ]}
        >
          <Input
            type='email'
            placeholder='Email to send the registration link'
            size='large'
            autoFocus
            onChange={(e) => this.handleOnChange(e.target.value)}
          />
        </Form.Item>
      </Form>
    )
  }

  render() {

    const { identityUserReducer } = this.props;

    return (
      <Modal
        title={'Register New User'}
        visible={identityUserReducer?.inviteNewUserModalVisible && !!this.state?.roleId}
        onCancel={() => this.closeModal()}
        onOk={() => this.handleSubmit()}
      >
        {this.renderForm()}
      </Modal>
    );
  }
}

const mapState = (state: any) => ({
    identityUserReducer: state.identityUserReducer
});

const mapDispatch = (dispatch: any) => ({
  setModalVisible: (visible: boolean) => dispatch(setInviteNewUserModalVisible(visible)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  sendRegistrationLink: (params: { email: string, roleId: string}, cb: any) => dispatch(sendRegistrationLinkRequest(params, cb)),
});

export default withRouter(connect(mapState, mapDispatch)(InviteNewUserToRoleModal));