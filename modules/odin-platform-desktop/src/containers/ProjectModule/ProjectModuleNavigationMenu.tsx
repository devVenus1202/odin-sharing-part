import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import React from 'react';
import { Switch } from 'react-router-dom';
import ProtectedRoute from '../../core/navigation/ProtectedRoute';
import DetailView from '../../core/records/components/DetailView';
import RecordListView from '../../core/records/components/ListView';
import DefaultRecordDetail from '../DefaultViews/RecordDetailView';
import PlanningModuleMap from '../PlanningModule/containers/Map';
import ProjectModuleProjectRecordDetailViewWide from './components/ProjectModuleProjectDetailViewWide';
import ProjectModuleRecordDetailViewWide from './components/ProjectModuleRecordDetailViewWide';
import ProjectModuleTaskDetailViewWide from './components/ProjectModuleTaskDetailViewWide';
import AutoConnectFibers from './containers/AutoConnect/FiberConnections';
import Dashboard from './containers/Dashboard';
import ClosureConfigurator from './containers/Feature/ClosureConfigurator';
import FeatureDetailView from './containers/Feature/DetailView';
import Inventory from './containers/Openreach/Inventory';
import Noi from './containers/Openreach/NoticeOfIntent';
import BuildPack from "./containers/BuildPack";

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { PROGRAM, PROJECT, REGION, TASK, JOB } = SchemaModuleEntityTypeEnums;

const EXCHANGE = 'Exchange'

export const ProjectModuleRoutes = () => {

  return <Switch>
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Dashboard`}
      moduleName={PROJECT_MODULE}
      entityName="Dashboard"
      component={<Dashboard />} />,
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Connection`}
      moduleName={PROJECT_MODULE}
      entityName="Connection"
      component={
        <AutoConnectFibers />
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Connection/:exPolygonId/:L1PolygonId/:L2PolygonId/:L0ClosureId?`}
      moduleName={PROJECT_MODULE}
      entityName="Connection"
      component={
        <AutoConnectFibers />
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Region/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Region"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={REGION}>
          <ProjectModuleRecordDetailViewWide excludeRelations={['File']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Exchange/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Exchange"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={EXCHANGE}>
          <ProjectModuleRecordDetailViewWide excludeRelations={['File']} />
        </DetailView>
      } />

    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Program/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Program"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={PROGRAM}>
          <ProjectModuleRecordDetailViewWide />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Project/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Project"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={PROJECT}>
          <ProjectModuleProjectRecordDetailViewWide excludeRelations={['File']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Task/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Task"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={TASK}>
          <ProjectModuleTaskDetailViewWide excludeRelations={['File', 'Job', 'Project', 'Task']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Job/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Job"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={JOB}>
          <ProjectModuleRecordDetailViewWide excludeRelations={['File']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Feature/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Feature"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'Feature'}>
          <ProjectModuleRecordDetailViewWide excludeRelations={['File', 'Note']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Feature/:recordId/configure-closure`}
      moduleName={PROJECT_MODULE}
      entityName="Feature"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'Feature'}>
          <ClosureConfigurator />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/FeatureModel/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="FeatureModel"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'FeatureModel'}>
          {/*<FeatureModelDetailView excludeRelations={[ 'File' ]}/>*/}
          <ProjectModuleRecordDetailViewWide />
        </DetailView>
      } />

    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/FeatureComponent/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="FeatureComponent"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'FeatureComponent'}>
          {/*<FeatureComponentDetailView excludeRelations={[ 'File' ]}/>*/}
          <ProjectModuleRecordDetailViewWide />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/ChangeRequest/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="ChangeRequest"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'ChangeRequest'}>
          <DefaultRecordDetail excludeRelations={['File']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/JobTemplate/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="JobTemplate"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'JobTemplate'}>
          <ProjectModuleRecordDetailViewWide />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/OpenreachNoi`}
      moduleName={PROJECT_MODULE}
      entityName="OpenreachNoi"
      component={<Noi />} />,
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/OpenreachInventory`}
      moduleName={PROJECT_MODULE}
      entityName="OpenreachInventory"
      component={<Inventory />} />

    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/BuildComplete/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="BuildComplete"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName={'BuildComplete'}>
          <ProjectModuleRecordDetailViewWide />
        </DetailView>
      } />
    {/*<ProtectedRoute*/}
    {/*  exact*/}
    {/*  path={`/${PRODUCT_MODULE}/related/Product/:dbRecordAssociationId/:recordId`}*/}
    {/*  moduleName={PRODUCT_MODULE}*/}
    {/*  component={*/}
    {/*    <RecordDetailView moduleName={PRODUCT_MODULE} entityName="Product">*/}
    {/*      <ContactDetailView hasColumnMappings={true} visibleProperties={[ 'Quantity' ]}/>*/}
    {/*    </RecordDetailView>*/}
    {/*  }/>*/}
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/Map/:featureType?/:featureId?`}
      moduleName={PROJECT_MODULE}
      entityName="Map"
      component={<PlanningModuleMap />}
    />
    {/* <Build Pack> -------------------------------------------------------- */}
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/BuildPack/Splicing/:recordId/:polygonId?`}
      moduleName={PROJECT_MODULE}
      entityName="Map"
      component={<BuildPack withSplicing={true} />}
    />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/BuildPack/Spliceless/:recordId/:polygonId?`}
      moduleName={PROJECT_MODULE}
      entityName="Map"
      component={<BuildPack withSplicing={false} />}
    />
    {/* </Build Pack> -------------------------------------------------------- */}
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/related/:entityName/:dbRecordAssociationId/:recordId`}
      moduleName={PROJECT_MODULE}
      entityName="Dashboard"
      component={
        <DetailView moduleName={PROJECT_MODULE} entityName="Feature">
          <FeatureDetailView hasColumnMappings excludeRelations={['File', 'Task']} />
        </DetailView>
      } />
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/:entityName`}
      moduleName={PROJECT_MODULE}
      component={<RecordListView moduleName={PROJECT_MODULE} />} />,
    <ProtectedRoute
      exact
      path={`/${PROJECT_MODULE}/:entityName/:recordId`}
      moduleName={PROJECT_MODULE}
      component={
        <DetailView moduleName={PROJECT_MODULE}>
          <DefaultRecordDetail />
        </DetailView>
      } />
  </Switch>
}

