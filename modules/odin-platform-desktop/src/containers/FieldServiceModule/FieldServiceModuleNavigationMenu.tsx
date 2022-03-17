import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import React from 'react';
import { Switch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import DetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';
import Dashboard from './containers/Dashboard';
import ServiceAppointmentCalendar from './containers/ServiceAppointmentCalendar';
import WorkOrderDetailView from './containers/WorkOrder/DetailView';

const { FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { WORK_ORDER } = SchemaModuleEntityTypeEnums;

export const FieldServiceModuleRoutes = () => {
  return <Switch>
    <ProtectedRoute
      exact
      path={`/${FIELD_SERVICE_MODULE}/Dashboard`}
      moduleName={FIELD_SERVICE_MODULE}
      entityName="Dashboard"
      component={<Dashboard/>}/>,
    <ProtectedRoute
      exact
      path={`/${FIELD_SERVICE_MODULE}/WorkOrder/:recordId`}
      moduleName={FIELD_SERVICE_MODULE}
      entityName="WorkOrder"
      component={
        <DetailView moduleName={FIELD_SERVICE_MODULE} entityName={WORK_ORDER}>
          <WorkOrderDetailView/>
        </DetailView>
      }/>,
    <ProtectedRoute
      exact
      path={`/${FIELD_SERVICE_MODULE}/Calendar`}
      moduleName={FIELD_SERVICE_MODULE}
      entityName="WorkOrder"
      component={<ServiceAppointmentCalendar/>}/>,
    <ProtectedRoute
      exact
      path={`/${FIELD_SERVICE_MODULE}/:entityName`}
      moduleName={FIELD_SERVICE_MODULE}
      component={<RecordListView moduleName={FIELD_SERVICE_MODULE}/>}/>,
    <ProtectedRoute
      exact
      path={`/${FIELD_SERVICE_MODULE}/:entityName/:recordId`}
      moduleName={FIELD_SERVICE_MODULE}
      component={
        <DetailView moduleName={FIELD_SERVICE_MODULE}>
          <DefaultRecordDetail/>
        </DetailView>
      }/>
  </Switch>
}
