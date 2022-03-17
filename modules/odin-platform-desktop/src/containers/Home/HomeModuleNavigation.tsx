import React from 'react';
import { Switch, useRouteMatch, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';

import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import Home from './Home';
import { isExternalUser as checkExternalUser } from '../../shared/permissions/rbacRules';

interface Props {
  userReducer: any,
}

const HomeModuleRoutes = ({userReducer}: Props) => {

  let match = useRouteMatch();
  console.log('match', match);
  console.log('match.url', match.url);
  console.log('match.path', match.path);
  console.log("userReducer", userReducer);
  const isExternalUser = checkExternalUser(userReducer);
  return <Switch>
    {!isExternalUser && <ProtectedRoute path="/" moduleName={'OVERIDE'} entityName="Dashboard" exact component={<Home/>}/>}
    {isExternalUser && <Redirect to={{ pathname: '/myAccount/dashboard' }}/>}
  </Switch>
}


const mapState = (state: any) => ({
  userReducer: state.userReducer,
});
const mapDispatch = (dispatch: any) => ({});

export default connect(mapState, mapDispatch)(HomeModuleRoutes);
