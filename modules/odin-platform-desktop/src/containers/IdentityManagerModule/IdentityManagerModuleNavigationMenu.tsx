import React from 'react';
import {Switch, useRouteMatch } from 'react-router-dom';
import ConnectedAppsDetailView from './containers/ConnectedApps/DetailView';
import GroupsDetailView from './containers/Groups/DetailView';
import IdentityManager from './containers/IdentityManager';
import PermissionsDetailView from './containers/Permissions/DetailView';
import RolesDetailView from './containers/Roles/DetailView';
import TokensDetailView from './containers/Tokens/DetailView';
import UserDetailView from './containers/User/DetailView';
import RoleBasedProtectedRoute from "../../core/navigation/RoleBasedProtectedRoute";

const IDENTITY_MANAGER_MODULE = 'IdentityManagerModule';

export const IdentityManagerModuleRoutes = () => {
  return <Switch>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<IdentityManager/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/Users/:userId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<UserDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/Roles/:roleId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<RolesDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/Permissions/:permissionId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<PermissionsDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/Groups/:groupId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<GroupsDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/Tokens/:tokenId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<TokensDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${IDENTITY_MANAGER_MODULE}/ConnectedApps/:connectedAppId`}
      moduleName={IDENTITY_MANAGER_MODULE}
      component={<ConnectedAppsDetailView/>}/>
  </Switch>
}


