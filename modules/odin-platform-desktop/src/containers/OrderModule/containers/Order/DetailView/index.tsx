import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Col, Layout, Popconfirm, Row, Tooltip } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import { sendConfirmationEmail } from '../../../../../core/notifications/email/store/actions';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import { InputChangeParams } from '../../../../../core/records/components/Forms/FormFields';
import { Props as OdinFormModalProps } from '../../../../../core/records/components/Forms/FormModal';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import Pipeline from '../../../../../core/records/components/Pipeline/Pipeline';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationCardWithTabsList
  from '../../../../../core/recordsAssociations/components/AssociationCardWithTabsList';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import AssociationDescriptionList from '../../../../../core/recordsAssociations/components/AssociationDescriptionList';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import ZDTickets from '../../../../../core/support/component/ZDTickets';
import { IOrderAmendWorkflowParams, orderAmendWorkflow } from '../../../../../core/workflow/store/actions';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import { isBetaTester, isSystemAdmin } from '../../../../../shared/permissions/rbacRules';
import * as dateHelpers from '../../../../../shared/utilities/dateHelpers';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import SwapCustomerDeviceRouter from '../../../../ServiceModule/SwapCustomerDeviceRouter';
import AmendOrderModal from '../AmendOrderWorkflow';
import OrderRecordProperties from './OrderRecordProperties';

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  userReducer: any,
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
  sendConfirmation: any,
  identityConnectedAppsReducer: any,
  orderAmendWorkflow: (params: IOrderAmendWorkflowParams) => void,
}


const { ORDER_MODULE, CRM_MODULE, BILLING_MODULE } = SchemaModuleTypeEnums;
const { ADDRESS, CONTACT, INVOICE, ORDER_ITEM } = SchemaModuleEntityTypeEnums;

class OrderDetailView extends React.Component<PropsType> {

  private getUpdateFormDisabledFields(record: DbRecordEntityTransform): string[] {
    const { userReducer } = this.props;
    const res: string[] = [];

    // if BillingDate != BillingStartDate disable BillingDay changing
    const val = dateHelpers.parseAdjustedDateDay(getProperty(record, 'BillingStartDate'), 28);
    const adjustedBsdDay = Number(val);

    const currentBillingDay = Number(getProperty(record, 'BillingDay'));
    let isBillingDayEditable = !Number.isNaN(adjustedBsdDay) && (currentBillingDay == 0 || currentBillingDay == adjustedBsdDay);
    isBillingDayEditable = isBillingDayEditable || isSystemAdmin(userReducer);
    if (!isBillingDayEditable) {
      res.push('BillingDay');
    }

    return res;
  }

  private getUpdateFormCustomValidations(record: DbRecordEntityTransform): { [key: string]: any } | undefined {
    const res: { [key: string]: any } = [];

    // BillingDay custom validation
    res['BillingDay'] = {
      numberRange: {
        min: 1,
        max: 28,
        message: 'Billing Day must be between 1 and 28',
      },
    };

    return res;
  }

  private updateFormAdditionalInputChangeHandler(updateFromProps: OdinFormModalProps, params: InputChangeParams) {
    const { recordFormReducer, updateFormProperties } = updateFromProps;
    const { selected } = recordFormReducer;

    // populate BillingDay from BillingStartDate in Order edit form
    if (params.id === `${selected.schemaId}_BillingStartDate`) {
      const adjustedTargetBsdDay = dateHelpers.parseAdjustedDateDay(params.value, 28);
      updateFormProperties({
        targetId: `${selected.schemaId}_BillingDay`,
        entity: selected.entity,
        targetValue: !Number.isNaN(adjustedTargetBsdDay) ? adjustedTargetBsdDay : null,
        record: selected,
      });
    }
  }

  private initAmendOrder() {
    const { orderAmendWorkflow, match } = this.props;
    orderAmendWorkflow({
      init: true,
      orderId: match.params.recordId,
      isAmendOrderVisible: true,
    })
  }

  render() {
    const { schemaReducer, recordReducer, match, sendConfirmation, identityConnectedAppsReducer, userReducer } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note', 'OrderItem' ],
    );
    const zendeskSupportApp = identityConnectedAppsReducer?.list?.find((item: any) => item.name === 'ZENDESK_SUPPORT');


    return (<Layout className="record-detail-view">
      <BreadcrumbComponent record={record}/>
      <SwapCustomerDeviceRouter/>
      <AmendOrderModal/>

      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft
              record={record}
              updateFormDisabledFields={this.getUpdateFormDisabledFields(record)}
              updateFromCustomValidations={this.getUpdateFormCustomValidations(record)}
              updateFormAdditionalInputChangeHandler={this.updateFormAdditionalInputChangeHandler}
            >
              <OrderRecordProperties columnLayout="horizontal" record={record} columns={1}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>

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
                'Mobile',
              ]}/>

            <AssociationDescriptionList
              title="Address"
              record={record}
              moduleName={CRM_MODULE}
              entityName={ADDRESS}
              layout="horizontal"
              showRecordTitle
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
          <div className="record-detail-left-panel">
            <Pipeline
              className="record-pipeline"
              record={record}
              updateFormAdditionalInputChangeHandler={this.updateFormAdditionalInputChangeHandler}
            />
            <CardWithTabs
              title="Options"
              defaultTabKey="Summary"
              extra={[
                <Popconfirm
                  title="Are you sure you want to send the order confirmation?"
                  onConfirm={() => sendConfirmation(`OrderModule/v1.0/orders/${record ? record.id : null}/email/SENDGRID_ORDER_CONFIRMATION_V2`)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary">Send Confirmation</Button>
                </Popconfirm>,
                <Popconfirm
                  title="Are you sure you want to send the install booking request?"
                  onConfirm={() => sendConfirmation(`OrderModule/v1.0/orders/${record ? record.id : null}/email/SENDGRID_INSTALL_SCHEDULING_REQUEST`)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary">Send Install Request </Button>
                </Popconfirm>,
                <Popconfirm
                  title="Are you sure you want amend the Order?"
                  onConfirm={() => this.initAmendOrder()}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip
                    placement="top"
                    title={
                      record?.stage?.key !== 'OrderStageActive'
                        ? 'the order should be in Active stage'
                        : 'upgrade/downgrade/remove items'
                    }>
                    <Button
                      type="primary"
                      disabled={record?.stage?.key !== 'OrderStageActive'}
                    >Amend</Button>
                  </Tooltip>
                </Popconfirm>,
              ]
              }
              tabList={[
                {
                  key: 'Summary',
                  tab: 'Summary',
                },
                {
                  key: 'Billing',
                  tab: 'Billing',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={{
                Summary: <AssociationCardWithTabsList
                  title={'Products'}
                  record={record}
                  moduleName={ORDER_MODULE}
                  entityName={ORDER_ITEM}/>,
                ...renderDynamicAssociations(record, relatedSchemas),
                Billing: <div>
                  <AssociationDataTable
                    title={INVOICE}
                    record={record}
                    moduleName={BILLING_MODULE}
                    entityName={INVOICE}/>
                  <AssociationDataTable
                    title={'BillingAdjustment'}
                    record={record}
                    moduleName={ORDER_MODULE}
                    entityName={'BillingAdjustment'}/>
                </div>,
                // Payments: <PaymentScheduleTable record={record}/>,
              }}
            >
              {zendeskSupportApp && isBetaTester(userReducer) && <ZDTickets record={record}/>}
              <MailActivityFeed record={record}/>
            </CardWithTabs>
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
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  identityConnectedAppsReducer: state.identityConnectedAppsReducer,
});

const mapDispatch = (dispatch: any) => ({
  sendConfirmation: (payload: any) => dispatch(sendConfirmationEmail(payload)),
  orderAmendWorkflow: (params: IOrderAmendWorkflowParams) => dispatch(orderAmendWorkflow(params)),
});

export default withRouter(connect(mapState, mapDispatch)(OrderDetailView));
