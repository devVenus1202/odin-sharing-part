import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import GoCardlessActivityFeed from '../../../../../core/billing/GocardlessActivityFeed';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationDescriptionList from '../../../../../core/recordsAssociations/components/AssociationDescriptionList';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import CancelTransactionForm from '../CancelTransaction';
import TransactionRefundForm from '../RefundTransaction';
import RetryTransactionForm from '../RetryTransaction';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
}

const { BILLING_MODULE } = SchemaModuleTypeEnums;
const { NOTE, INVOICE, PAYMENT_METHOD } = SchemaModuleEntityTypeEnums;

class TransactionDetailView extends React.Component<Props> {

  render() {
    const { schemaReducer, recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note', 'PaymentMethod' ],
    );
    const recordType = getProperty(record, 'Type')

    return (<Layout className="record-detail-view">
      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft record={record}>
              <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>

            <AssociationDescriptionList
              title="Payment Method"
              record={record}
              moduleName={BILLING_MODULE}
              entityName={PAYMENT_METHOD}
              layout="horizontal"
              showRecordTitle
              addRecordTitleLink
              disableListActions
              recordKeys={[
                'title',
              ]}
              propKeys={[
                'Status',
                'Type',
              ]}/>
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={12}>
          <div className="record-detail-center-panel">
            <CardWithTabs
              title="Options"
              defaultTabKey="GocardlessActivity"
              extra={<div style={{ display: 'flex' }}>
                <TransactionRefundForm record={record} hidden={[ NOTE ]}/>
                <RetryTransactionForm record={record} hidden={[ NOTE ]}/>
                <CancelTransactionForm record={record} hidden={[ NOTE ]}/>
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
            <GoCardlessActivityFeed record={record} filterBy={recordType}/>
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

const mapDispatch = (dispatch: any) => ({});

//@ts-ignore
export default withRouter(connect(mapState, mapDispatch)(TransactionDetailView));
