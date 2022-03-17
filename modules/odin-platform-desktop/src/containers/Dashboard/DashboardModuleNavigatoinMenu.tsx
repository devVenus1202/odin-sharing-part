import React from 'react';
import { Switch, useRouteMatch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import SalesDashboard from './SalesDashboard';


export const DashboardModuleRoutes = () => {
  let match = useRouteMatch();
  console.log('match', match);
  console.log('match.url', match.url);
  console.log('match.path', match.path);

  return <Switch>
    <ProtectedRoute
      exact
      path={`/Dashboard`}
      moduleName={'REPORTING'}
      component={<SalesDashboard/>}/>
  </Switch>
}

