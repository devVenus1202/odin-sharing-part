import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Button, Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { setInviteNewUserModalVisible } from '../../../../core/identityUser/store/actions';
import MailActivityFeed from '../../../../core/notifications/components/MailActivityFeed';
import SendDynamicEmail from '../../../../core/notifications/components/SendDynamicEmail';
import ActivityFeed from '../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import { renderDynamicAssociations } from '../../../../core/recordsAssociations/helpers/component-helpers';
import { IRecordAssociationsReducer } from '../../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../../core/schemas/store/reducer';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import { isBetaTester } from '../../../../shared/permissions/rbacRules';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import MandateUpdate from '../ContactIdentity/MandateUpdate';
import InviteNewUserModal from './InviteNewUserModal';

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  userReducer: any,
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  match: any,
  hasColumnMappings?: boolean,
  visibleProperties?: string[],
  schemaReducer: SchemaReducerState,
  setInviteNewUserModalVisible: any
}

class ContactDetailView extends React.Component<PropsType> {
  sendRegistrationLink = () => {
    const { setInviteNewUserModalVisible } = this.props;
    setInviteNewUserModalVisible(true);
  }

  render() {
    const { userReducer, schemaReducer, recordAssociationReducer, hasColumnMappings, recordReducer, match, visibleProperties } = this.props;

    let record;

    if (hasColumnMappings) {
      record = getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        match.params.dbRecordAssociationId,
        match.params.recordId,
      );
    } else {
      record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    }

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note' ],
    );    
    return (
      <>
        {record && <InviteNewUserModal email={record?.properties?.EmailAddress}/>}
        <MandateUpdate/>
        <Layout className="record-detail-view">
          <BreadcrumbComponent record={record}/>
          <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

            <Col xs={24} sm={24} md={24} lg={6}>
              <div className="record-detail-left-panel">
                <DetailPanelLeft
                  record={record}
                  hasColumnMappings={hasColumnMappings}
                  visibleProperties={visibleProperties}
                >
                  <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
                  {renderCreateUpdateDetails(record)}
                </DetailPanelLeft>
              </div>
            </Col>

            <Col xs={24} sm={24} md={24} lg={12}>
              <div className="record-detail-center-panel">
                <CardWithTabs
                  title="Options"
                  defaultTabKey="ContactIdentity"
                  tabList={[
                    ...relatedSchemas.map(elem => ({
                      key: elem.entityName,
                      tab: elem.entityName,
                    })),
                  ]}
                  contentList={{
                    ...renderDynamicAssociations(record, relatedSchemas),
                  }}
                  extra={[
                    <SendDynamicEmail
                      buttonText="Setup Mandate"
                      email={{
                        to: getProperty(record, 'EmailAddress'),
                        templateLabel: 'SENDGRID_DD_MISSING',
                        dynamicTemplateData: {
                          id: record?.id,
                          description: 'Setup Direct Debit - Payment info missing',
                          properties: {
                            FirstName: getProperty(record, 'FirstName'),
                          },
                        },
                      }}/>,
                    isBetaTester(userReducer) && <div style={{ display: 'flex' }}>
                        <div>
                            <Button onClick={() => this.sendRegistrationLink()}>Send Registration Link</Button>
                        </div>
                    </div>,
                  ]
                  }
                />
                <MailActivityFeed record={record}/>
              </div>
            </Col>

            <Col xs={24} sm={24} md={24} lg={6}>
              <div className="record-detail-right-panel">
                <CardWithTabs
                  title="Updates"
                  defaultTabKey="Notes"
                  tabList={[
                    {
                      key: 'Notes',
                      tab: 'Notes',
                    },
                    {
                      key: 'Activity',
                      tab: 'Activity',
                    },
                  ]}
                  contentList={{
                    Notes: <NoteForm record={record}/>,
                    Activity: <ActivityFeed/>,
                  }}
                />
              </div>
            </Col>

          </Row>
        </Layout>
      </>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  setInviteNewUserModalVisible: (visible: boolean) => dispatch(setInviteNewUserModalVisible(visible)),
});

export default withRouter(connect(mapState, mapDispatch)(ContactDetailView));
