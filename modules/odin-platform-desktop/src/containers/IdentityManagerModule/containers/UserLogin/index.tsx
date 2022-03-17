import {LockOutlined, UserOutlined} from '@ant-design/icons';
import {IdentityOrganizationUserLogin} from '@d19n/models/dist/identity/organization/user/types/identity.organization.user.login';
import {Button, Col, Form, Input, Layout, Row, Spin, Typography} from 'antd';
import React, {useEffect, useState} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';
import {loginCancelRequest, loginRequest} from '../../../../core/identity/store/actions';
import { storeSelectedEntity, storeSelectedModule } from "../../../../core/navigation/store/actions";
import { LoadingOutlined } from '@ant-design/icons';


const {Content} = Layout;
const {Title} = Typography;

interface Props {
  history: any,
  login: any,
  cancelRequest: any,
  userReducer: any,
  navigationReducer: any,
  storeSelectedEntity: any,
  storeSelectedModule: any
}


const LoginForm = (props: Props) => {

  const {login, cancelRequest, history, userReducer} = props;
  const [form] = Form.useForm();
  const [, forceUpdate] = useState();
  const antIcon = <LoadingOutlined style={{ fontSize: 24, color:'#bddfff', marginRight:'8px' }} spin />


  const onFinish = (values: any) => {

    storeSelectedModule({selectedModule:'Home'})
    storeSelectedEntity({selectedEntity:''})

    // Save the url entered before requiring login so we can redirect
    login(values, () => {
      return history.push('/');
    });
  };

  // To disable submit button at the beginning.
  useEffect(() => {
    cancelRequest();
    forceUpdate(undefined);
  }, []);

  return (
    <Layout style={{paddingTop: '100px'}}>
      <Content>
        <Row className='login-form-row'>
          <Col xs={{span: 20, offset: 2}} md={{span: 12, offset: 6}} xxl={{span: 8, offset: 8}}>
            <div className='login-container'>
                <Title level={3} style={{textAlign: 'center', marginBottom: '30px'}}>Log in</Title>
                <Form
                  name="user-login"
                  className="login-form"
                  initialValues={{remember: true}}
                  form={form}
                  onFinish={onFinish}
                >
                  <Form.Item
                    name="email"
                    rules={[{required: true, message: 'Please input your email'}]}
                  >
                    <Input
                      autoComplete='true'
                      prefix={<UserOutlined className="site-form-item-icon"/>}
                      placeholder="Username"
                      size="large"
                      disabled={userReducer.isRequesting}
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{required: true, message: 'Please input your password'}]}
                  >
                    <Input
                      autoComplete='true'
                      prefix={<LockOutlined className="site-form-item-icon"/>}
                      type="password"
                      placeholder="Password"
                      size="large"
                      disabled={userReducer.isRequesting}
                    />
                  </Form.Item>
                  <Form.Item style={{textAlign: 'center'}}>
                    {/*<Form.Item name="remember" valuePropName="checked" noStyle>*/}
                    {/*    <Checkbox>Remember me</Checkbox>*/}
                    {/*</Form.Item>*/}
                    <Link className="login-form-forgot" to={`/forgot-password`}>Forgot password</Link>
                  </Form.Item>

                  <Form.Item shouldUpdate={true} style={{textAlign: 'center', marginBottom: 0}}>
                    {() => (<Button
                      type="primary"
                      size="large"
                      className="loginSubmit"
                      htmlType="submit"
                      disabled={form.getFieldsError().filter(({errors}) => errors.length).length > 0}>
                      {userReducer.isRequesting ? <><Spin indicator={antIcon} /> Logging in...</> : 'Log in'}
                    </Button>)}
                  </Form.Item>
                </Form>
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  )
};

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer,
});

const mapDispatch = (dispatch: any) => ({
  login: (payload: IdentityOrganizationUserLogin, cb: () => {}) => dispatch(loginRequest(payload, cb)),
  cancelRequest: () => dispatch(loginCancelRequest()),
  storeSelectedModule: (params: { selectedModule: string }) => dispatch(storeSelectedModule(params)),
  storeSelectedEntity: (params: { selectedEntity: string }) => dispatch(storeSelectedEntity(params)),
});


export default withRouter(connect(mapState, mapDispatch)(LoginForm));


