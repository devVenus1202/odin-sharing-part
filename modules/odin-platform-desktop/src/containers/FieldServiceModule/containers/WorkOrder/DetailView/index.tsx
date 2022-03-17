import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Col, Layout, Popconfirm, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import MailActivityFeed from '../../../../../core/notifications/components/MailActivityFeed';
import { sendConfirmationEmail } from '../../../../../core/notifications/email/store/actions';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import FileUploaderDragAndDrop from '../../../../../core/records/components/Files/FileUploaderDragAndDrop';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import Pipeline from '../../../../../core/records/components/Pipeline/Pipeline';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationCardWithTabsList
  from '../../../../../core/recordsAssociations/components/AssociationCardWithTabsList';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import AssociationDescriptionList from '../../../../../core/recordsAssociations/components/AssociationDescriptionList';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import SwapCustomerDeviceRouter from '../../../../ServiceModule/SwapCustomerDeviceRouter';
import WorkOrderCancellationWorkflow from '../WorkOrderCancelModal';

const { ORDER_MODULE, CRM_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { ADDRESS, CONTACT, SERVICE_APPOINTMENT, ORDER_ITEM } = SchemaModuleEntityTypeEnums;

interface Props {
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  match: any,
  sendConfirmation: any,
}

interface State {
  nextStage: PipelineStageEntity | undefined,
}


class WorkOrderDetaiLView extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      nextStage: undefined,
    }

  }

  /* Get WO Type and assign appropriate Sendgrid template    */

  /* We deprecated this, but will return here at some point. */
  getEmailActionType(workOrder: any) {
    if (workOrder) {
      const workOrderType = getProperty(workOrder, 'Type')

      switch (workOrderType) {
        case 'INSTALL':
          return 'SENDGRID_WORK_ORDER_CONFIRMATION'
        case 'SERVICE':
          return 'SENDGRID_WORK_ORDER_SERVICE_CONFIRMATION'
        default:
          return null
      }
    }
  }

  render() {

    const { schemaReducer, recordReducer, match, sendConfirmation } = this.props;
    const { nextStage } = this.state;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note', 'File', 'ServiceAppointment', 'OrderItem', 'ChangeReason' ],
    );

    return (<Layout className="record-detail-view">
      <BreadcrumbComponent record={record}/>
      <WorkOrderCancellationWorkflow stage={nextStage} record={record}
                                     onClosEvent={() => this.setState({ nextStage: undefined })}/>
      <SwapCustomerDeviceRouter/>
      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft record={record}>
              <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
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
                'ExPolygonId',
                'L1PolygonId',
                'L2PolygonId',
                'L4PolygonId',
                'L4ClosureId',
              ]}/>

          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={12}>
          <div className="record-detail-left-panel">
            <Pipeline className="record-pipeline" record={record}
                      overrideInitializeFormOnFail={(stage: PipelineStageEntity) => this.setState({ nextStage: stage })}
            />

            <CardWithTabs
              title="Options"
              defaultTabKey="Summary"
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
                    title={SERVICE_APPOINTMENT}
                    record={record}
                    moduleName={FIELD_SERVICE_MODULE}
                    entityName={SERVICE_APPOINTMENT}/>

                  <AssociationDataTable
                    title={'Change Reason'}
                    record={record}
                    moduleName={FIELD_SERVICE_MODULE}
                    entityName={'ChangeReason'}
                    isCreateHidden/>

                  <AssociationCardWithTabsList
                    title={'Products'}
                    hideTabs={[ 'Summary', 'Product' ]}
                    record={record}
                    moduleName={ORDER_MODULE}
                    entityName={ORDER_ITEM}/>

                </div>,
                ...renderDynamicAssociations(record, relatedSchemas),
                Files:
                  <div>
                    <FileUploaderDragAndDrop record={record}/>
                    <AssociationDataTable
                      title="Files"
                      record={record}
                      moduleName="SchemaModule"
                      entityName="File"/>
                  </div>,
              }}
              extra={[
                <Popconfirm
                  title={
                    `Do you want to send the email confirmation?`
                  }
                  onConfirm={() => sendConfirmation(`FieldServiceModule/v1.0/WorkOrder/${record ? record.id : null}/email/SENDGRID_WORK_ORDER_CONFIRMATION`)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary">Send Confirmation</Button>
                </Popconfirm>,
              ]}
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
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  sendConfirmation: (payload: any) => dispatch(sendConfirmationEmail(payload)),
});

export default withRouter(connect(mapState, mapDispatch)(WorkOrderDetaiLView));
