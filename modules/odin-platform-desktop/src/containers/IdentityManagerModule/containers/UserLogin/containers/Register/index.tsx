import { Button, Col, Form, Input, Layout, Row, Typography, Spin, FormInstance } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { completeRegistrationRequest, generateRegistrationLinkRequest } from '../../../../../../core/identity/store/actions';
import history from '../../../../../../shared/utilities/browserHisory';
import { httpGet } from '../../../../../../shared/http/requests';

import { displayMessage } from '../../../../../../shared/system/messages/store/reducers';
import { validateEmail } from '../../../../../../shared/utilities/domHelpers';
import Bowser from 'bowser';

const { Content } = Layout;
const { Title } = Typography;

interface Props {
  completeRegistrationReq: any,
  generateRegistrationLink: any,
  userReducer: any,
  match?: any,
  alertMessage?: any
}
interface State {
    token: string,
    email?: string,
    firstname: string,
    lastname: string,
    password: string,
    confirmPassword: string,
    contactId: string,
    apiToken: string
}

class Register extends React.Component<Props, State> {
  private formRef: React.RefObject<FormInstance>;
  constructor(props: Props) {
    super(props);
      this.state = 
      {
          token: props.match.params.token,
          contactId: props.match.params.contactId,
          apiToken: props.match.params.apiToken,
          email: '',
          firstname: '',
          lastname: '',
          password: '',
          confirmPassword: ''
      }
      this.formRef = React.createRef();
  }

  componentDidMount(){
    const {apiToken, contactId} = this.props.match.params;
    localStorage.setItem(`token`, apiToken);
    httpGet(`CrmModule/v1.0/db/Contact/${contactId}`).then(({data})=>{
      const contact = data.data;
      this.formRef.current?.setFieldsValue({
        email: contact.properties.EmailAddress,
        firstname: contact.properties.FirstName,
        lastname: contact.properties.LastName
      })
      this.setState({
        email: contact.properties.EmailAddress,
        firstname: contact.properties.FirstName,
        lastname: contact.properties.LastName
      })
    })
  }

  completeRegistration = (emailVisible: boolean) => {
    const { completeRegistrationReq, generateRegistrationLink, alertMessage } = this.props;
    
    if (emailVisible) {

      const roleIdDirty = this.state.token.split('roleId=')[1];
      const roleId      = roleIdDirty.split('&')[0];

      const organizationId = this.state.token.split('&organizationId=')[1];

      generateRegistrationLink({
        email: this.state?.email,
        roleId,
        organizationId
      },
        (resp: any) => {
          if (resp && resp.results.token) {
            const data = {
              firstname: this.state.firstname,
              lastname: this.state.lastname,
              password: this.state.password,
              confirmPassword: this.state.confirmPassword
            };
            completeRegistrationReq({ data: data, token: resp.results.token },
              (resp1: any) => {
                if (resp1?.results) {
                  alertMessage({ body: 'New user successfully registered.', type: 'success' });
                  history.push('/login');
                }
              }
            );
          }
        }
      );

    } else {
      const data = {
        firstname: this.state.firstname,
        lastname: this.state.lastname,
        password: this.state.password,
        confirmPassword: this.state.confirmPassword,
        contactId: this.state.contactId
      }
      completeRegistrationReq({data: data, token: this.state.token}, (resp: any) => {
        if(resp?.results) {
          alertMessage({ body: 'New user successfully registered.', type: 'success' });
          history.push('/login');
        }
      });
    }
  }

  render() {
    const emailVisible = this.state.token.includes('roleId');
    const isSafari = Bowser.getParser(window.navigator.userAgent).isBrowser('safari', true);
    const { userReducer } = this.props;
    const { contactId } = this.state;
    const isReadOnly = !!contactId
    return (
      <Layout style={{paddingTop: '100px'}}>
      <Content>
        <Row align='middle'>
          <Col xs={{span: 20, offset: 2}} md={{span: 12, offset: 6}} xxl={{span: 8, offset: 8}}>
            <div className='login-container' style={{textAlign: 'center'}}>
              <Spin spinning={userReducer.isRequesting} tip="Loading...">
                <Title level={3} style={{textAlign: 'center', marginBottom: '30px'}}>Register New User</Title>
                  <Form autoComplete={isSafari ? "off" : "false"} ref={this.formRef }> 
                  {
                    emailVisible &&
                    <Form.Item
                      key="email"
                      name="email"
                      // label="Email"
                      // labelCol={{ span: 24 }}
                      rules={[{ required: true, type: "email", message: "Please input valid Email"}]}
                    >
                      <Input autoComplete="new-email" size="large" type='email' placeholder="Enter Email" onChange={(e) => this.setState({email: e.target.value})}/>
                    </Form.Item>
                  }
                  
                  <Form.Item
                    key="firstname"
                    name="firstname"
                    // label="First Name"
                    // labelCol={{ span: 24 }}
                    rules={[{ required: true, message: "Please input First Name"}]}
                  >
                    <Input autoComplete="new-password" size="large" type='text' placeholder="Enter First Name" onChange={(e) => this.setState({firstname: e.target.value})} disabled={isReadOnly}/>
                  </Form.Item>
                  <Form.Item
                    key="lastname"
                    name="lastname"
                    // label="Last Name"
                    // labelCol={{ span: 24 }}
                    rules={[{ required: true, message: "Please input Last Name"}]}
                  >
                    <Input autoComplete="new-password" size="large" type='text' placeholder="Enter Last Name" onChange={(e) => this.setState({lastname: e.target.value})} disabled={isReadOnly}/>
                  </Form.Item>
                  <Form.Item
                    key="password"
                    name="password"
                    // label="Password"
                    // labelCol={{ span: 24 }}
                    rules={[
                      {
                        validator(rule, value, callback) {
                          if(value === undefined) {
                              callback()
                            } else if(value.length < 8 || value.length > 20) {
                              callback('Password must be longer than or equal to 8 characters and shorter than or equal to 20 characters')
                            } else {
                              return callback(undefined);
                            }
                        }
                      }
                    ]}
                  >
                    <Input autoComplete="new-password" size="large" type='password' placeholder="Enter Password" onChange={(e) => this.setState({password: e.target.value})}/>
                  </Form.Item>

                  <Form.Item
                    key="confirmPassword"
                    name="confirmPassword"
                    // label="Confirm Password"
                    // labelCol={{ span: 24 }}
                    rules={[
                      {
                        validator(rule, value, callback) {
                          if(value === undefined) {
                              callback()
                            } else if(value.length < 8 || value.length > 20) {
                              callback('Password must be longer than or equal to 8 characters and shorter than or equal to 20 characters')
                            } else {
                              return callback(undefined);
                            }
                        }
                      }
                    ]}
                  >
                    <Input autoComplete="new-password" size="large" style={{marginTop: '0.5rem'}} type='password' placeholder="Confirm Password" onChange={(e) => this.setState({confirmPassword: e.target.value})}/>
                  </Form.Item>
                </Form>
                <Button 
                  size="large"
                  className='loginSubmit' 
                  type='primary'
                  onClick={() => this.completeRegistration(emailVisible)} 
                    disabled={
                    (emailVisible && !validateEmail(this.state?.email))
                    || this.state?.password !== this.state?.confirmPassword 
                    || this.state?.password === '' 
                    || this.state?.confirmPassword === ''
                    || this.state?.firstname === ''
                    || this.state?.lastname === ''
                  }
                >
                  Complete
                </Button>
              </Spin>
            </div>          
          </Col>
          </Row>
        </Content>
      </Layout>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer
});

const mapDispatch = (dispatch: any) => ({
  completeRegistrationReq: (params: any, cb: any) => dispatch(completeRegistrationRequest(params, cb)),
  generateRegistrationLink: (params: any, cb: any) => dispatch(generateRegistrationLinkRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params))
});


export default connect(mapState, mapDispatch)(Register);


