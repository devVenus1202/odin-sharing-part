import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Button, Col, Layout, Popconfirm, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import { sendConfirmationEmail } from '../../../../../core/notifications/email/store/actions';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import TransactionRefundForm from '../../Transaction/RefundTransaction';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
  sendConfirmation: (payload: any) => {},
}

const { CREDIT_NOTE } = SchemaModuleEntityTypeEnums;

class CreditNoteDetailView extends React.Component<Props> {

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
                    title="Are you sure you want to send the Credit Note confirmation?"
                    onConfirm={() => sendConfirmation(`BillingModule/v1.0/credit-notes/${record.id}/email/SENDGRID_CREDIT_NOTE_NEW`)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="primary">Send confirmation</Button>
                  </Popconfirm>
                </div>
                <div style={{ marginRight: 14 }}>
                  <TransactionRefundForm record={record} refundSource={CREDIT_NOTE}/>
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
});

export default withRouter(connect(mapState, mapDispatch)(CreditNoteDetailView));
