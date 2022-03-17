import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../core/records/components/DetailView/RecordProperties';
import NoteFormWithChilds from '../../../../core/records/components/Note/NoteFormWithChilds';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import AssociationDescriptionList from '../../../../core/recordsAssociations/components/AssociationDescriptionList';
import { renderDynamicAssociations } from '../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import CreateOrderFromAccount from '../../../OrderModule/containers/Order/CreateOrderFromAccount';

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
}

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { ADDRESS, CONTACT } = SchemaModuleEntityTypeEnums;

class AccountDetail extends React.Component<PropsType> {

  render() {
    const { schemaReducer, recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note' ],
    );


    return (<Layout className="record-detail-view">
      <BreadcrumbComponent record={record}/>
      <CreateOrderFromAccount record={record}/>
      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft record={record}>
              <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>

            <AssociationDescriptionList
              title="Billing Contact"
              listKey="BillingContact"
              record={record}
              moduleName={CRM_MODULE}
              entityName={CONTACT}
              filters={[ 'Role:BILLING' ]}
              layout="horizontal"
              showRecordTitle
              hasColumnMappings
              addRecordTitleLink
              disableListActions
              recordKeys={[
                'title',
              ]}
              propKeys={[
                'Role',
                'EmailAddress',
                'Phone',
              ]}/>

            <AssociationDescriptionList
              title="Billing Address"
              listKey="BillingAddress"
              record={record}
              moduleName={CRM_MODULE}
              entityName={ADDRESS}
              filters={[ 'Type:BILLING' ]}
              layout="horizontal"
              showRecordTitle
              hasColumnMappings
              addRecordTitleLink
              disableListActions
              recordKeys={[
                'title',
              ]}
              propKeys={[
                'Type',
                'SalesStatus',
              ]}/>

          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={12}>
          <div className="record-detail-center-panel">
            <CardWithTabs
              title="Options"
              defaultTabKey="Notes"
              tabList={[
                {
                  key: 'Notes',
                  tab: 'Notes',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={{
                Notes: <NoteFormWithChilds record={record}/>,
                ...renderDynamicAssociations(record, relatedSchemas),
              }}
            />
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-right-panel">
            <CardWithTabs
              title="Updates"
              defaultTabKey="Activity"
              tabList={[
                {
                  key: 'Activity',
                  tab: 'Activity',
                },
              ]}
              contentList={{
                Activity: <ActivityFeed/>,
              }}
            />
          </div>
        </Col>

      </Row>
    </Layout>)
  }

}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({});

export default withRouter(connect(mapState, mapDispatch)(AccountDetail));
