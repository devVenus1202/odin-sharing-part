import { Layout } from 'antd';
import React from 'react';
import { hotjar } from 'react-hotjar';
import { connect } from 'react-redux';
import { Route, Router, Switch } from 'react-router-dom';
import './App.scss';
import { BillingModuleRoutes } from './containers/BillingModule/BillingModuleNavigationMenu';
import { CrmModuleRoutes } from './containers/CrmModule/CrmModuleNavigationMenu';
import { DashboardModuleRoutes } from './containers/Dashboard/DashboardModuleNavigatoinMenu';
import { FieldServiceModuleRoutes } from './containers/FieldServiceModule/FieldServiceModuleNavigationMenu';
import HomeModuleRoutes from './containers/Home/HomeModuleNavigation';
import Login from './containers/IdentityManagerModule/containers/UserLogin';
import ForgotPassword from './containers/IdentityManagerModule/containers/UserLogin/containers/ForgotPassword';
import LoginModal from './containers/IdentityManagerModule/containers/UserLogin/containers/LoginModal';
import Register from './containers/IdentityManagerModule/containers/UserLogin/containers/Register';
import ResetPassword from './containers/IdentityManagerModule/containers/UserLogin/containers/ResetPassword';
import { IdentityManagerModuleRoutes } from './containers/IdentityManagerModule/IdentityManagerModuleNavigationMenu';
import { MergeModuleRoutes } from './containers/Merge/MergeModuleNavigation';
import MyAccount from './containers/MyAccount/MyAccount';
import Navigation from './containers/Navigation/Navigation';
import { OrderModuleRoutes } from './containers/OrderModule/OrderModuleNavigationMenu';
import { PlanningModuleRoutes } from './containers/PlanningModule/PlanningModuleNavigation';
import { ProductModuleRoutes } from './containers/ProductModule/ProductModuleNavigation';
import { ProjectModuleRoutes } from './containers/ProjectModule/ProjectModuleNavigationMenu';
import { SchemaManagerModuleRoutes } from './containers/SchemaManagerModule/SchemaManagerModuleNavigationMenu';
import Search from './containers/Search/Search';
import { ServiceModuleRoutes } from './containers/ServiceModule/ServiceModuleNavigation';
import { SupportModuleRoutes } from './containers/SupportModule/SupportModuleNavigation';
import { logoutRequest, updateUserRolesAndPermissionsRequest } from './core/identity/store/actions';
import NavigationHistoryTabs from './core/navigation/NavigationHistoryTabs';
import OdinHelmet from './core/navigation/OdinHelmet';
import RecordQuickView from './core/records/components/QuickView/Drawer';
import { toggleSearchVisibility } from './core/records/store/actions';
import ProcessWorkflow from './core/workflowEngine/components/ProcessWorkflow';
import Error403 from './shared/pages/403';
import Error404 from './shared/pages/404';
import Error500 from './shared/pages/500';
import { isUserAuthenticated, isExternalUser as checkExternalUser } from './shared/permissions/rbacRules';
import HotKeyWrapper from './shared/system/hotkeys';
import Message from './shared/system/messages';
import Notification from './shared/system/notifications';
import history from './shared/utilities/browserHisory';
import Zendesk, {ZendeskAPI} from "./core/support/component/Zendesk";


// @ts-ignore
// ReactGA.initialize(process.env.REACT_APP_ODIN_GAID, {
//   debug: true,
//   gaOptions: {
//     siteSpeedSampleRate: 100,
//   },
// })
// history.listen((location: any, action: any) => {
//   ReactGA.pageview(location.pathname + location.search);
// });

// @ts-ignore
hotjar.initialize(2102565, 6);



const { Header } = Layout;

interface Props {
  userReducer: any,
  navigationReducer: any,
  toggleSearchVisibility: any,
  logout: any,
  updateUserRolesAndPermissions: any,
}

class App extends React.Component<Props> {

  timer: NodeJS.Timeout | undefined;

  setMenuStyle() {
    const { userReducer } = this.props;
    if (userReducer.user && userReducer.user.organization.id === '8c96572c-eee6-4e78-9e3f-8c56c5bb9242') {
      // Set menu color for Netomnia Limited
      return 'netomnia-theme-menu';
    } else {
      return 'youfibre-theme-menu';
    }
  }

  componentDidMount() {
    setTimeout(() => {
      this.timer = setInterval(() => this.props.updateUserRolesAndPermissions(), 60000);
    }, 30)
  }

  componentDidUpdate(prevProps:Props) {
    this.onLoadZendesk();
  }
  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined;
  }

  handleLogout() {
    const { logout } = this.props;
    logout()
    history.push('/login');
  }

  blurBackgroundForLoggedOutUsers() {
    const { userReducer } = this.props;
    if (history && history.location && history.location.pathname) {
      return !isUserAuthenticated(userReducer)
        && history.location.pathname.indexOf('login') === -1
        && history.location.pathname !== '/forgot-password'
        && !history.location.pathname.includes('/reset-password')
        && !history.location.pathname.includes('/register');
    }
  }

  onLoadZendesk = () => {
    const { userReducer } = this.props;
    if (userReducer.user && userReducer.user.contactId) {
      ZendeskAPI('webWidget', 'show');
      ZendeskAPI("webWidget", "identify", {
        name: `${userReducer.user.firstname} ${userReducer.user.lastname}`,
        email: userReducer.user.email,
        organization: userReducer.user.organization.name 
      })
    } else {
      ZendeskAPI('webWidget', 'clear');
      ZendeskAPI('webWidget', 'reset');
      ZendeskAPI('webWidget', 'hide');
    }
  }

  render() {
    const { userReducer } = this.props;
    return (
      <div className="app-container"
           style={{
             filter: this.blurBackgroundForLoggedOutUsers()
               ? 'blur(0.8em)'
               : '',
           }}>
        <Layout className="page-layout">
          <Notification/>
          <Message/>
          <Router history={history}>
            <HotKeyWrapper/>
            <OdinHelmet/>
            <LoginModal/>
            {
              isUserAuthenticated(userReducer) && !checkExternalUser(userReducer) && 
                <>
                  <Search
                    entities={[
                      'CrmModule:Account',
                      'CrmModule:Address',
                      'CrmModule:Contact',
                      'ProductModule:Product',
                      'OrderModule:Order',
                      'FieldServiceModule:WorkOrder',
                      'BillingModule:Invoice',
                      'ServiceModule:NetworkDevice',
                    ]}
                    schema={{ id: 'GLOBAL_SEARCH_DRAWER', moduleName: 'SchemaModule', entityName: 'ALL' }}
                    renderStyle="drawer"
                  />
                  <RecordQuickView/>
                  <ProcessWorkflow/>
                  <Header className="header">
                    <Navigation/>
                  </Header>
                  <NavigationHistoryTabs/>
                </>
            }
            {
              isUserAuthenticated(userReducer) && checkExternalUser(userReducer) && 
                <>
                  {/* <Header className="header">
                    <Navigation/>
                  </Header> */}
                </>
            }
          </Router>
          <Router history={history}>
            <Switch>
              <Route exact path="/">
                <HomeModuleRoutes/>
              </Route>
              <Route path="/OrderModule">
                <OrderModuleRoutes/>
              </Route>
              <Route path="/CrmModule">
                <CrmModuleRoutes/>
              </Route>
              <Route path="/FieldServiceModule">
                <FieldServiceModuleRoutes/>
              </Route>
              <Route path="/SupportModule">
                <SupportModuleRoutes/>
              </Route>
              <Route path="/ProductModule">
                <ProductModuleRoutes/>
              </Route>
              <Route path="/BillingModule">
                <BillingModuleRoutes/>
              </Route>
              <Route path="/IdentityManagerModule">
                <IdentityManagerModuleRoutes/>
              </Route>
              <Route path="/SchemaModule">
                <SchemaManagerModuleRoutes/>
              </Route>
              <Route path="/ServiceModule">
                <ServiceModuleRoutes/>
              </Route>
              <Route path="/ProjectModule">
                <ProjectModuleRoutes/>
              </Route>
              <Route path="/Dashboard">
                <DashboardModuleRoutes/>
              </Route>
              <Route path="/PlanningModule">
                <PlanningModuleRoutes/>
              </Route>
              <Route path="/merge">
                <MergeModuleRoutes/>
              </Route>
              <Route path="/myaccount" component={MyAccount}/>

              <Route exact path="/forgot-password" component={ForgotPassword}/>
              <Route exact path="/reset-password/:token" component={ResetPassword}/>
              <Route exact path="/register/:token" component={Register}/>
              <Route exact path="/register/:token/:apiToken/:contactId" component={Register}/>
              <Route path="/login" exact>
              <Login/>
              </Route>
              <Route path="/500">
                <Error500/>
              </Route>
              <Route path="/403">
                <Error403/>
              </Route>
              <Route>
                <Error404/>
              </Route>

            </Switch>
          </Router>
        </Layout>
        {userReducer.user && <Zendesk defer onLoaded={this.onLoadZendesk}/>}
      </div>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  logout: () => dispatch(logoutRequest()),
  toggleSearchVisibility: () => dispatch(toggleSearchVisibility()),
  updateUserRolesAndPermissions: () => dispatch(updateUserRolesAndPermissionsRequest()),
});

export default connect(mapState, mapDispatch)(App);
