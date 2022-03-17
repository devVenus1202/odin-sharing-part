import React from 'react'
import { connect } from 'react-redux';
import { Redirect, Route } from 'react-router-dom'
import { canUserAccessModule, canUserAccessModuleAndEntityInRoutes } from '../../shared/permissions/rbacRules';

interface Props {
  moduleName: string,
  entityName?: string,
  exact?: boolean,
  path: string;
  userReducer: any,
  navigationReducer: any,
  component: React.ReactNode
}

const ProtectedRoute = ({ moduleName, entityName, path, userReducer, navigationReducer, component, ...rest }: Props) => {
  return (
    <Route {...rest} exact path={path} render={(props) => {

      let canAccess = false
      if (moduleName === 'OVERIDE') {
        canAccess = true
      } else if (moduleName === 'REPORTING') {
        canAccess = canUserAccessModule(userReducer, 'fullreporting')
      } else {
        if (navigationReducer && navigationReducer.routingStructure && moduleName && entityName) {
          canAccess = canUserAccessModuleAndEntityInRoutes(navigationReducer.routingStructure, moduleName, entityName)
        } else if (navigationReducer && navigationReducer.routingStructure && moduleName && props.match.params.entityName){
          canAccess = canUserAccessModuleAndEntityInRoutes(navigationReducer.routingStructure, moduleName, props.match.params.entityName)
        } else {
          canAccess = false
        }
      }

      if (canAccess) {
        return (
          component
        )
      } else {
        return (<Redirect to={{ pathname: '/403', state: { from: props.location } }} />)
      }
    }}
    />
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer
});

const mapDispatch = (dispatch: any) => ({});

export default connect(mapState, mapDispatch)(ProtectedRoute);


