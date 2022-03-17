import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import React from 'react';
import { Switch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import DetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import HtmlContentView from '../DefaultViews/HtmlContentView';
import HtmlContentViewWithSlate from '../DefaultViews/HtmlContentViewWithSlate';
import HtmlRecordDetailView from '../DefaultViews/HtmlRecordDetailView';
import HtmlRecordDetailViewWithSlate from '../DefaultViews/HtmlRecordDetailViewWithSlate';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';

const { SUPPORT_MODULE } = SchemaModuleTypeEnums;

export const SupportModuleRoutes = () => {
  return <Switch>
    <ProtectedRoute
      exact
      path={`/${SUPPORT_MODULE}/KnowledgeArticle/:recordId`}
      moduleName={SUPPORT_MODULE}
      entityName="KnowledgeArticle"
      component={
        <DetailView moduleName={SUPPORT_MODULE} entityName="KnowledgeArticle">
          <HtmlRecordDetailViewWithSlate />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${SUPPORT_MODULE}/KnowledgeArticle/:recordId/preview`}
      moduleName={SUPPORT_MODULE}
      entityName="KnowledgeArticle"
      component={
        <DetailView moduleName={SUPPORT_MODULE} entityName="KnowledgeArticle">
          <HtmlContentViewWithSlate />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${SUPPORT_MODULE}/:entityName`}
      moduleName={SUPPORT_MODULE}
      component={
        <RecordListView moduleName={SUPPORT_MODULE} />
      } />
    <ProtectedRoute
      exact
      path={`/${SUPPORT_MODULE}/:entityName/:recordId`}
      moduleName={SUPPORT_MODULE}
      component={
        <DetailView moduleName={SUPPORT_MODULE}>
          <DefaultRecordDetail />
        </DetailView>
      } />
  </Switch>
}

