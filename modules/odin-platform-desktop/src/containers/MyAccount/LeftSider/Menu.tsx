import React, {useState} from 'react'
import { Layout, Menu, Breadcrumb, Avatar} from 'antd';
import { Link, useRouteMatch } from 'react-router-dom';
import {
  FileOutlined,
  PoweroffOutlined,
  PayCircleOutlined,
  DollarCircleOutlined,
  UserOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  PhoneOutlined
  
} from '@ant-design/icons';
import { getOrganizationName } from '../../../shared/http/helpers';
import { logoutRequest } from '../../../core/identity/store/actions';
import { connect } from 'react-redux';
import history from '../../../shared/utilities/browserHisory';

import './styles.scss';
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;



interface Props {
  userReducer: any;
  onSelectMenuItem: any,
  logout:any
}

const LeftSider = (props:Props) => {
  const {userReducer} = props;
  const selectMenu = (selectedMenu:any) => {
    // props.onSelectMenuItem(selectedMenu.key)
    history.push(`/myAccount/${selectedMenu.key}`);
  }
  const handleLogout = () => {
    const { logout } = props;
    logout()
    history.push('/login');
  }
  const match = useRouteMatch();
  console.log(match);
  return (
    <div className="portal-menu">
      <div className="logo" >
        <Avatar size={48} icon={<UserOutlined />} />
        <div>
          <h3>{`${userReducer?.user?.firstname} ${userReducer?.user?.lastname}`}</h3>
        </div>
      </div>
      <Menu theme="dark" defaultSelectedKeys={['dashboard']} mode="inline"  className={`${getOrganizationName()}Colors`}>
        <Menu.Item key="dashboard" icon={<HomeOutlined />}>
          <Link to='/myAccount/dashboard'>Home</Link>
        </Menu.Item>
        <Menu.Item key="profile" icon={<UserOutlined />}>
          <Link to='/myAccount/profile'>Profile</Link>
        </Menu.Item>
        <Menu.Item key="billing" icon={<DollarCircleOutlined />}>
          <Link to='/myAccount/billing'>Billing</Link>
        </Menu.Item>
        <Menu.Item key="orders" icon={<ShoppingCartOutlined />} >
          <Link to="/myAccount/orders">Orders</Link>
        </Menu.Item>
        <Menu.Item key="workorders" icon={<PayCircleOutlined />} >
          <Link to="/myAccount/workorders">Work Orders</Link>
        </Menu.Item>
        <Menu.Item key="support" icon={<PhoneOutlined />}>
          <Link to="/myAccount/support">Support</Link>
        </Menu.Item>
        <Menu.Item key="signout" icon={<PoweroffOutlined />}  onClick={() => handleLogout()}>
          Sign Out
        </Menu.Item>
      </Menu>
    </div>
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer
})

const mapDispatch = (dispatch: any) => ({
  logout: () => dispatch(logoutRequest()),
})

export default connect(mapState, mapDispatch)(LeftSider)