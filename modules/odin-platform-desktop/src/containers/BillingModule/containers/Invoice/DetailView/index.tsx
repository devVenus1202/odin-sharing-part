import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Col, Layout, Modal, Popconfirm, Row, Spin } from 'antd';
import fileDownload from 'js-file-download';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import {
  getEmailDataRequest,
  previewEmailRequest,
  sendConfirmationEmail,
  SendgridEmailEntity,
} from '../../../../../core/notifications/email/store/actions';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import AssociationDescriptionList from '../../../../../core/recordsAssociations/components/AssociationDescriptionList';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import InvoiceTakePayment from '../TakePayment';
import VoidInvoice from '../VoidInvoice';

const { CRM_MODULE, BILLING_MODULE, ORDER_MODULE, PRODUCT_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { CONTACT, ORDER, INVOICE_ITEM, DISCOUNT, TRANSACTION, NOTE, WORK_ORDER } = SchemaModuleEntityTypeEnums;

const BILLING_ADJUSTMENT = 'BillingAdjustment';

const TEMPLATE_SENDGRID_INVOICE_NEW = 'SENDGRID_INVOICE_NEW';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
  sendConfirmation: (path: string, body?: SendgridEmailEntity) => {},
  getEmailData: (path: string, cb: any, body?: SendgridEmailEntity) => {},
  previewEmail: (body: SendgridEmailEntity, cb: any) => {},
}

interface State {
  isGeneratingPreview: boolean;
}


class InvoiceDetailView extends React.Component<Props, State> {

  state = { isGeneratingPreview: false }

  /**
   * ODN-866 Requests email preview
   */
  private previewEmail() {
    const { match, recordReducer, getEmailData, previewEmail } = this.props;

    this.setState({
      isGeneratingPreview: true,
    });

    // get the email data
    getEmailData(
      `BillingModule/v1.0/invoices/${match.params.recordId}/email-data/${TEMPLATE_SENDGRID_INVOICE_NEW}`,
      (resp: any) => {
        const emailData = resp?.results?.data;
        if (emailData) {

          // request the preview
          previewEmail(emailData, (previewResp: any) => {

            this.setState({
              isGeneratingPreview: false,
            });

            if (previewResp?.results) {

              const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);

              // try to open preview in a new tab
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(previewResp.results);
                newWindow.document.close();
                newWindow.document.title = `Invoice ${record?.recordNumber} preview`;
                newWindow.opener = null;

              } else {
                // otherwise download the preview as a html file
                fileDownload(previewResp.results, `preview_${record?.recordNumber}.html`);
              }
            }
          });

        } else {
          this.setState({
            isGeneratingPreview: false,
          });
        }
      },
    );
  }

  private sortInvoiceItems(items: DbRecordEntityTransform[]): DbRecordEntityTransform[] {
    return items.sort((a, b) => {
      const aType = getProperty(a, 'Type');
      const bType = getProperty(b, 'Type');
      if (aType === bType) return 0;
      else if (aType === 'PRODUCT' && bType === 'ADJUSTMENT') return -1;
      else if (aType === 'ADJUSTMENT' && bType === 'PRODUCT') return 1;
      else return 0;
    });
  }

  render() {

    const { schemaReducer, recordReducer, sendConfirmation, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note', 'Transaction', 'Discount', 'InvoiceItem', 'BillingAdjustment' ],
    );

    return (
      <>
        <Modal visible={this.state.isGeneratingPreview} centered={true} footer={null}>
          <Spin spinning={this.state.isGeneratingPreview}>generating preview...</Spin>
        </Modal>
        <Layout className="record-detail-view">
          <BreadcrumbComponent record={record}/>
          <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

            <Col xs={24} sm={24} md={24} lg={6}>
              <div className="record-detail-left-panel">
                <DetailPanelLeft record={record}>
                  <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
                  {renderCreateUpdateDetails(record)}
                </DetailPanelLeft>

                <AssociationDescriptionList
                  title="Order"
                  record={record}
                  moduleName={ORDER_MODULE}
                  entityName={ORDER}
                  layout="horizontal"
                  showRecordTitle
                  addRecordTitleLink
                  disableListActions
                  recordKeys={[
                    'title',
                  ]}
                  propKeys={[
                    'TotalPrice',
                  ]}/>
                <AssociationDescriptionList
                  title="Work Order"
                  record={record}
                  moduleName={FIELD_SERVICE_MODULE}
                  entityName={WORK_ORDER}
                  layout="horizontal"
                  showRecordTitle
                  addRecordTitleLink
                  disableListActions
                  recordKeys={[
                    'title',
                  ]}
                  propKeys={[
                    'Type', 'Cost', 'Description',
                  ]}/>
                <AssociationDescriptionList
                  title="Contact"
                  record={record}
                  moduleName={CRM_MODULE}
                  entityName={CONTACT}
                  layout="horizontal"
                  showRecordTitle
                  addRecordTitleLink
                  disableListActions
                  recordKeys={[
                    'title',
                  ]}
                  propKeys={[
                    'EmailAddress',
                    'Phone',
                  ]}/>

              </div>
            </Col>

            <Col xs={24} sm={24} md={24} lg={12}>
              <div className="record-detail-center-panel">
                <CardWithTabs
                  title="Options"
                  defaultTabKey="Summary"
                  extra={<div style={{ display: 'flex' }}>
                    <div style={{ marginRight: 14 }}>
                      <Button onClick={() => this.previewEmail()}>Preview</Button>
                    </div>
                    <div style={{ marginRight: 14 }}>
                      <Popconfirm
                        title="Are you sure you want to send the invoice confirmation?"
                        onConfirm={() => sendConfirmation(`BillingModule/v1.0/invoices/${record.id}/email/${TEMPLATE_SENDGRID_INVOICE_NEW}`)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button type="primary">Send Invoice</Button>
                      </Popconfirm>
                    </div>
                    <div style={{ marginRight: 14 }}>
                      <InvoiceTakePayment record={record} hidden={[ NOTE ]}/>
                    </div>
                    <VoidInvoice schema={schema} record={record}/>
                  </div>}
                  tabList={[
                    {
                      key: 'Summary',
                      tab: 'Summary',
                    },
                    ...relatedSchemas.map(elem => ({
                      key: elem.entityName,
                      tab: elem.entityName,
                    })),
                  ]}
                  contentList={{
                    Summary: <div>
                      <AssociationDataTable
                        title={INVOICE_ITEM}
                        record={record}
                        moduleName={BILLING_MODULE}
                        entityName={INVOICE_ITEM}
                        sortRecords={(items) => this.sortInvoiceItems(items)}/>

                      <AssociationDataTable
                        title={TRANSACTION}
                        record={record}
                        moduleName={BILLING_MODULE}
                        entityName={TRANSACTION}/>

                      <AssociationDataTable
                        title={DISCOUNT}
                        record={record}
                        moduleName={PRODUCT_MODULE}
                        entityName={DISCOUNT}/>

                      <AssociationDataTable
                        title={BILLING_ADJUSTMENT}
                        record={record}
                        moduleName={ORDER_MODULE}
                        entityName={BILLING_ADJUSTMENT}/>
                    </div>,
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
        </Layout>
      </>)
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  sendConfirmation: (path: string, body?: SendgridEmailEntity) => dispatch(sendConfirmationEmail(path, body)),
  getEmailData: (path: string, cb: any, body?: SendgridEmailEntity) => dispatch(getEmailDataRequest(path, cb, body)),
  previewEmail: (body: SendgridEmailEntity, cb: any) => dispatch(previewEmailRequest(body, cb)),
});


export default withRouter(connect(mapState, mapDispatch)(InvoiceDetailView));
