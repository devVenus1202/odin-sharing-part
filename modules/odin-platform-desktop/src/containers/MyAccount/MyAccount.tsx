import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter, Switch, Redirect, Route, Router } from 'react-router-dom';
import { Col, Layout, Row, Tabs, Table } from 'antd';

import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';

import { getSchemaFromShortListByModuleAndEntity } from '../../shared/utilities/schemaHelpers';
import history from '../../shared/utilities/browserHisory';
import {
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../shared/utilities/recordHelpers';

import RecordProperties from '../../core/records/components/DetailView/RecordProperties';
import { IRecordReducer } from '../../core/records/store/reducer';
import { IRecordAssociationsReducer } from '../../core/recordsAssociations/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../core/recordsAssociations/store/actions';
import { SchemaReducerState } from "../../core/schemas/store/reducer";
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../core/schemas/store/actions';

import { getRecordByIdRequest, IGetRecordById } from '../../core/records/store/actions';

import SiderBar from './LeftSider/SideBar';
import NavBar from './LeftSider/NavBar';
import Menu from "./LeftSider/Menu";
import Profile from './Profile';
import DataGrid from './DataGrid';
import Support from './Support';
import EntityDetail from './EntityDetail';

import './styles.scss';
import Dashboard from './Dashboard';
import Billing from './Billing';


const { Content } = Layout;
const { TabPane } = Tabs;

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  match: any,
  hasColumnMappings?: boolean,
  schemaReducer: SchemaReducerState,
  userReducer: any,
  getRecordById: (params: IGetRecordById, cb?: any) => void,
  getAssociations: (params: IGetRecordAssociations, cb?: any) => void,
  getSchema: (params: ISchemaByModuleAndEntity, cb?: any) => void,
}

const { CRM_MODULE, ORDER_MODULE, BILLING_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;

const {
  PAYMENT_METHOD,
  CONTACT_IDENTITY,
  CONTACT,
  INVOICE,
  ORDER,
  WORK_ORDER,
  ADDRESS
} = SchemaModuleEntityTypeEnums;

const MyAccount = (props: PropsType) => {
  const [currentMenu, setCurrentMenu] = useState("profile");
  const {
    schemaReducer,
    recordAssociationReducer,
    hasColumnMappings,
    recordReducer,
    match,
    userReducer,
    getAssociations,
    getSchema,
    getRecordById
  } = props;
  let record: any;
  let recordAssociation: any = {}; 
  if (hasColumnMappings) {
    record = getRecordRelatedFromShortListById(
      recordAssociationReducer.shortList,
      match.params.dbRecordAssociationId,
      match.params.recordId,
    );
  } else {
    const user = userReducer.user;
    if (!user) {
      history.push('/login');
    } else {
      record = getRecordFromShortListById(recordReducer.shortList, userReducer.user.contactId);
      if (Object.keys(recordAssociationReducer.shortList).length > 0) {
        recordAssociation = recordAssociationReducer.shortList[`${userReducer.user.contactId}_${CONTACT}`];
      }
    }
  }


  useEffect(() => {
    getSchema({ moduleName: CRM_MODULE, entityName: CONTACT }, (res: any) => {
      getAssociations({
        recordId: userReducer.user.contactId,
        key: CONTACT,
        schema: res,
        entities: [INVOICE, ORDER, WORK_ORDER, PAYMENT_METHOD, CONTACT_IDENTITY, ADDRESS],
      }, (data: any) => {
        console.log("associationSchemas", data);
      });
      getRecordById({ schema: res, recordId: userReducer.user.contactId })
    })
    return () => { }
  }, [])

  const changePayment = () => {
    
  }
  return (
    <>
      <Router history={history}>
        <NavBar menu={<Menu onSelectMenuItem={(menuKey: string) => { setCurrentMenu(menuKey) }}></Menu>} />
        <Layout>
          <SiderBar menu={<Menu onSelectMenuItem={(menuKey: string) => { setCurrentMenu(menuKey) }}></Menu>} />
          <Content className="portal-content">
            <Row>
              <Col xs={24} sm={24} md={24} lg={24}>
                <Route
                  exact
                  path={`/myAccount/dashboard`}
                  render={(props) => {
                    return <Dashboard contact={record} />
                  }} />
                <Route
                  exact
                  path={`/myAccount/profile`}
                  render={(props) => {
                    return <Profile record={record} recordAssociation={recordAssociation}/>
                  }} />
                <Route
                  path={`/myAccount/billing`}
                  render={(props) => {
                    return <Billing record={record}/>
                  }} />
                <Route
                  exact
                  path={`/myAccount/orders`}
                  render={(props) => {
                    return <DataGrid
                      title={ORDER}
                      record={record}
                      moduleName={ORDER_MODULE}
                      entityName={ORDER} />
                  }} />
                <Route
                  exact
                  path={`/myAccount/workorders`}
                  render={(props) => {
                    return <DataGrid
                      title={WORK_ORDER}
                      record={record}
                      moduleName={FIELD_SERVICE_MODULE}
                      entityName={WORK_ORDER} />
                  }} />
                <Route
                  exact
                  path={`/myAccount/support`}
                  render={(props) => {
                    return <Support />
                  }} />
                <Route
                  exact
                  path={`/myAccount/:moduleName/:entityName/:recordId`}
                  render={(props) => {
                    return <EntityDetail></EntityDetail>
                  }} />
              </Col>
            </Row>
          </Content>
        </Layout>
      </Router>
    </>
  )
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
  userReducer: state.userReducer
});

const mapDispatch = (dispatch: any) => ({
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(MyAccount);
