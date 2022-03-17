import React from 'react';
import { Switch } from 'react-router-dom';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import RecordDetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import AccountDetail from './containers/Account';
import AddressDetailView from './containers/Address';
import ContactDetailView from './containers/Contact';
import ContactIdentityDetailView from './containers/ContactIdentity';
import Dashboard from './containers/Dashboard';
import LeadDetail from './containers/Lead';
import PremiseDetailView from './containers/Premise/DetailView';
import VisitDetailView from './containers/Visit';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { ACCOUNT, ADDRESS, CONTACT, LEAD, CONTACT_IDENTITY } = SchemaModuleEntityTypeEnums;


export const CrmModuleRoutes = () => {
  return <Switch>
    <ProtectedRoute
      exact
      path={`/CrmModule/Dashboard`}
      moduleName={CRM_MODULE}
      entityName="Dashboard"
      component={<Dashboard />} />
    <ProtectedRoute
      exact
      path={`/CrmModule/Premise/:udprn/:umprn`}
      moduleName={CRM_MODULE}
      entityName="Premise"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName="Premise">
          <PremiseDetailView />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/Visit/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Visit"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName="Visit">
          <VisitDetailView />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/Lead/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Lead"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName={LEAD}>
          <LeadDetail />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/Account/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Account"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName={ACCOUNT}>
          <AccountDetail />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/Contact/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Contact"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName={CONTACT}>
          <ContactDetailView />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/ContactIdentity/:recordId`}
      moduleName={CRM_MODULE}
      entityName="ContactIdentity"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName={CONTACT_IDENTITY}>
          <ContactIdentityDetailView />
        </RecordDetailView>
      } />

    <ProtectedRoute
      exact
      path={`/CrmModule/Address/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Address"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName={ADDRESS}>
          <AddressDetailView />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/related/Contact/:dbRecordAssociationId/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Contact"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName="Contact">
          <ContactDetailView hasColumnMappings={true} visibleProperties={['Role']} />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/CrmModule/related/Address/:dbRecordAssociationId/:recordId`}
      moduleName={CRM_MODULE}
      entityName="Address"
      component={
        <RecordDetailView moduleName={CRM_MODULE} entityName="Address">
          <AddressDetailView hasColumnMappings={true} visibleProperties={['Type']} />
        </RecordDetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${CRM_MODULE}/:entityName`}
      moduleName={CRM_MODULE}
      component={<RecordListView moduleName={CRM_MODULE} />} />
    <ProtectedRoute
      exact
      path={`/${CRM_MODULE}/:entityName/:recordId`}
      moduleName={CRM_MODULE}
      component={
        <RecordDetailView moduleName={CRM_MODULE}>
          <DefaultRecordDetail />
        </RecordDetailView>
      } />
  </Switch>

}


