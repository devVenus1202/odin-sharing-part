import React from 'react';
import { Switch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import RoleBasedProtectedRoute from '../../core/navigation/RoleBasedProtectedRoute';
import DetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import FileDetailView from '../Files/containers/File/DetailView';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';
import SchemaColumnDetailView from './containers/Columns/DetailView';
import SchemasDetailView from './containers/Schemas/DetailView';
import SchemaListView from './containers/Schemas/ListView';
import WorkflowDetailView from './containers/Workflow/DetailView';
import FileListFeedView from "../../core/records/components/ListView/FileListFeedView";


const SCHEMA_MODULE = 'SchemaModule';

export const SchemaManagerModuleRoutes = () => {
  return <Switch>
    <ProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/Workflow/:recordId`}
      moduleName={SCHEMA_MODULE}
      entityName="Workflow"
      component={
        <DetailView moduleName={SCHEMA_MODULE} entityName="Workflow">
          <WorkflowDetailView/>
        </DetailView>
      }/>
    <RoleBasedProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/Schema`}
      moduleName={SCHEMA_MODULE}
      component={<SchemaListView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/Schema/:schemaId`}
      moduleName={SCHEMA_MODULE}
      component={<SchemasDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/SchemaColumn/:schemaId/:schemaColumnId`}
      moduleName={SCHEMA_MODULE}
      component={<SchemaColumnDetailView/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/File`}
      moduleName={SCHEMA_MODULE}
      component={<FileListFeedView moduleName={SCHEMA_MODULE} entityName={'File'}/>}/>
    <RoleBasedProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/File/:recordId`}
      moduleName={SCHEMA_MODULE}
      component={
        <DetailView moduleName={SCHEMA_MODULE} entityName="File">
          <FileDetailView/>
        </DetailView>
      }/>

    <ProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/:entityName`}
      moduleName={SCHEMA_MODULE}
      component={<RecordListView moduleName={SCHEMA_MODULE} />} />,
    <ProtectedRoute
      exact
      path={`/${SCHEMA_MODULE}/:entityName/:recordId`}
      moduleName={SCHEMA_MODULE}
      component={
        <DetailView moduleName={SCHEMA_MODULE}>
          <DefaultRecordDetail />
        </DetailView>
      } />
  </Switch>
}


