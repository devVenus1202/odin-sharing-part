import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import React from 'react';
import { Switch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import DetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';
import Dashboard from './containers/Dashboard';
import InvoiceDetailView from './containers/Invoice/DetailView';
import PaymentMethodDetailView from './containers/PaymentMethod/DetailView';
import TransactionDetailView from './containers/Transaction/DetailView';
import CreditNoteDetailView from './containers/CreditNote/DetailView';
import BillingRequestDetailView from './containers/BillingRequest/DetailView';

const { BILLING_MODULE } = SchemaModuleTypeEnums;
const { INVOICE, INVOICE_ITEM, TRANSACTION, PAYMENT_METHOD, CREDIT_NOTE, BILLING_REQUEST } = SchemaModuleEntityTypeEnums;


export const BillingModuleRoutes = () => {
  return <Switch>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/Dashboard`}
      moduleName={BILLING_MODULE}
      entityName="Dashboard"
      component={<Dashboard/>}/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/Invoice/:recordId`}
      moduleName={BILLING_MODULE}
      entityName="Invoice"
      component={
        <DetailView moduleName={BILLING_MODULE} entityName={INVOICE}>
          <InvoiceDetailView/>
        </DetailView>
      }/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/Transaction/:recordId`}
      moduleName={BILLING_MODULE}
      entityName="Transaction"
      component={
        <DetailView moduleName={BILLING_MODULE} entityName={TRANSACTION}>
          <TransactionDetailView/>
        </DetailView>
      }/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/${BILLING_REQUEST}/:recordId`}
      moduleName={BILLING_MODULE}
      entityName={BILLING_REQUEST}
      component={
        <DetailView moduleName={BILLING_MODULE} entityName={BILLING_REQUEST}>
          <BillingRequestDetailView/>
        </DetailView>
      }/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/PaymentMethod/:recordId`}
      moduleName={BILLING_MODULE}
      entityName="PaymentMethod"
      component={
        <DetailView moduleName={BILLING_MODULE} entityName={PAYMENT_METHOD}>
          <PaymentMethodDetailView/>
        </DetailView>
      }/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/${CREDIT_NOTE}/:recordId`}
      moduleName={BILLING_MODULE}
      entityName={CREDIT_NOTE}
      component={
        <DetailView moduleName={BILLING_MODULE} entityName={CREDIT_NOTE}>
          <CreditNoteDetailView/>
        </DetailView>
      }/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/:entityName`}
      moduleName={BILLING_MODULE}
      component={<RecordListView moduleName={BILLING_MODULE}/>}/>
    <ProtectedRoute
      exact
      path={`/${BILLING_MODULE}/:entityName/:recordId`}
      moduleName={BILLING_MODULE}
      component={
        <DetailView moduleName={BILLING_MODULE}>
          <DefaultRecordDetail/>
        </DetailView>
      }/>
  </Switch>
}

