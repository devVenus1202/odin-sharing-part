import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Col, Layout, Popconfirm, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import GoCardlessActivityFeed from '../../../../../core/billing/GocardlessActivityFeed';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import { sendConfirmationEmail } from '../../../../../core/notifications/email/store/actions';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import { getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
  sendConfirmation: (payload: any) => {},
  alertMessage: (params: { body: string, type: string }) => void,
  getRecordById: (payload: IGetRecordById, cb?: any) => void
}

class BillingRequestDetailView extends React.Component<Props> {
  state = {
    isStartingFlow: false,
    isCancellingBillingRequest: false,
  };

  private async startBillingRequestFlow() {
    const { schemaReducer, recordReducer, match, alertMessage, getRecordById } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    if (record && schema) {
      this.setState({
        isStartingFlow: true,
      });

      const getUrl = window.location;
      const redirectUri = getUrl.protocol + '//' + getUrl.host;

      await httpPost(
        `${SchemaModuleTypeEnums.BILLING_MODULE}/v1.0/billing-requests/start-flow/${record.id}`,
        {
          redirectUri,
        },
      ).then(res => {

        this.setState({
          isStartingFlow: false,
        });

        alertMessage({ body: `billing request flow ${res.data.data.BRFExternalRef} started`, type: 'success' });

        getRecordById({ schema: schema, recordId: record.id })

      }).catch(err => {

        this.setState({
          isStartingFlow: false,
        });

        const error = err.response ? err.response.data : undefined;
        alertMessage({ body: error && error.message || 'error starting billing request flow', type: 'error' });

      });
    }
  }

  private async cancelBillingRequest() {
    const { schemaReducer, recordReducer, match, alertMessage, getRecordById } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    if (record && schema) {
      this.setState({
        isCancellingBillingRequest: true,
      });

      await httpPost(
        `${SchemaModuleTypeEnums.BILLING_MODULE}/v1.0/billing-requests/${record.id}/cancel`, {}
      ).then(res => {

        this.setState({
          isCancellingBillingRequest: false,
        });

        alertMessage({ body: res.data?.message, type: 'success' });

        getRecordById({ schema: schema, recordId: record.id })

      }).catch(err => {

        this.setState({
          isCancellingBillingRequest: false,
        });

        const error = err.response ? err.response.data : undefined;
        alertMessage({ body: error && error.message || 'error cancelling the billing request', type: 'error' });

      });
    }
  }

  render() {
    const { schemaReducer, recordReducer, match, sendConfirmation } = this.props;

    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(schema?.associations);

    return (<Layout className="record-detail-view">
      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft record={record}>
              <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={12}>
          <div className="record-detail-center-panel">
            <CardWithTabs
              title="Options"
              defaultTabKey="Invoice"
              extra={<div style={{ display: 'flex' }}>
                <div style={{ marginRight: 14 }}>
                  <Popconfirm
                    title="Are you sure you want to start the Billing Request Flow?"
                    onConfirm={async () => await this.startBillingRequestFlow()}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="primary" disabled={this.state.isStartingFlow || this.state.isCancellingBillingRequest}>Start flow</Button>
                  </Popconfirm>
                </div>
                <div style={{ marginRight: 14 }}>
                  <Popconfirm
                    title="Are you sure you want to send the Billing Request authorization url?"
                    onConfirm={() => sendConfirmation(`${SchemaModuleTypeEnums.BILLING_MODULE}/v1.0/billing-requests/${record.id}/email/SENDGRID_BILLING_REQUEST_FLOW`)}
                    okText="Yes"
                    cancelText="No"
                    disabled={!record?.properties?.AuthorizationUrl}
                  >
                    <Button type="primary" disabled={!record?.properties?.AuthorizationUrl}>Send auth url</Button>
                  </Popconfirm>
                </div>
                <div style={{ marginRight: 14 }}>
                  <Popconfirm
                    title="Please confirm that you would like to cancel this billing request?"
                    onConfirm={async () => await this.cancelBillingRequest()}
                    okText="OK"
                    cancelText="NO"
                  >
                    <Button danger disabled={this.state.isStartingFlow || this.state.isCancellingBillingRequest}>Cancel</Button>
                  </Popconfirm>
                </div>
              </div>}
              tabList={[
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={{
                ...renderDynamicAssociations(record, relatedSchemas),
              }}
            />

            <GoCardlessActivityFeed record={record} filterBy={'BILLING_REQUEST'}/>
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
    </Layout>)
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  sendConfirmation: (payload: any) => dispatch(sendConfirmationEmail(payload)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  getRecordById: (payload: IGetRecordById, cb?: any) => dispatch(getRecordByIdRequest(payload, cb)),
});

export default withRouter(connect(mapState, mapDispatch)(BillingRequestDetailView));
