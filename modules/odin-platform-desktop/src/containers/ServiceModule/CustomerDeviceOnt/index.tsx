import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import ActivityFeed from '../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../core/records/store/reducer';
import AssociationDataTable from '../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { renderDynamicAssociations } from '../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../shared/components/RecordCreateUpdateDetails';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../shared/utilities/schemaHelpers';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
}

const { SERVICE_MODULE, CRM_MODULE, ORDER_MODULE } = SchemaModuleTypeEnums;
const { CUSTOMER_DEVICE_ROUTER, ADDRESS, ORDER_ITEM, NETWORK_DEVICE } = SchemaModuleEntityTypeEnums;

class CustomerDeviceOntDetail extends React.Component<Props> {

  render() {
    const { schemaReducer, recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note', 'NetworkDevice', 'CustomerDeviceRouter' ],
    );

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
              defaultTabKey="DeviceInfo"
              tabList={[
                {
                  key: 'DeviceInfo',
                  tab: 'Device Info',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={{
                DeviceInfo:
                  <div>
                    <AssociationDataTable
                      title={NETWORK_DEVICE}
                      record={record}
                      moduleName={SERVICE_MODULE}
                      entityName={NETWORK_DEVICE}/>
                    <AssociationDataTable
                      title={CUSTOMER_DEVICE_ROUTER}
                      record={record}
                      moduleName={SERVICE_MODULE}
                      entityName={CUSTOMER_DEVICE_ROUTER}/>
                  </div>,
                ...renderDynamicAssociations(record, relatedSchemas),
              }}
            />
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

export default withRouter(connect(mapState, mapDispatch)(CustomerDeviceOntDetail));
