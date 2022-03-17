import React from 'react'
import { connect } from 'react-redux';
import { Redirect, Route } from 'react-router-dom'
import { canUserAccessModule } from '../../shared/permissions/rbacRules';

interface Props {
  moduleName: string,
  exact?: boolean,
  path: string;
  userReducer: any,
  component: React.ReactNode
}

/*
 We use this for SchemaManagerModule and IdentityManagerModule.
 All other modules are managed by ProtectedRoute
 */

const RoleBasedProtectedRoute = ({ moduleName, path, userReducer, component, ...rest }: Props) => {

  const canAccess = moduleName === 'OVERIDE' ? true : canUserAccessModule(userReducer, moduleName);
  return (
    <Route {...rest} exact path={path} render={(props) => {
      if(canAccess) {
        return (
          component
        )
      } else {
        return (<Redirect to={{ pathname: '/403', state: { from: props.location } }}/>)
      }
    }}
    />
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({});

export default connect(mapState, mapDispatch)(RoleBasedProtectedRoute);