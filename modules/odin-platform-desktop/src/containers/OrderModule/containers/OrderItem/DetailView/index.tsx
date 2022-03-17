import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { renderDynamicAssociations } from '../../../../../core/recordsAssociations/helpers/component-helpers';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import NetworkProvisioningModal from '../NetworkActivateModal';
import NetworkCheckModal from '../NetworkCheckModal';
import NetworkDeactivateModal from '../NetworkDeactivateModal';
import SipwiseCustomerContactSetupModal from '../SipwiseCustomerContactSetupModal';
import VoiceActivateModal from '../VoiceActivateModal';
import {
  showCustomerDeviceOnt,
  showCustomerDeviceRouter,
  showNetworkTab,
  showVoiceTab,
} from './component-rendering-conditions';

interface Props {
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  match: any
}

const { SERVICE_MODULE, ORDER_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { CUSTOMER_DEVICE_ONT, CUSTOMER_DEVICE_ROUTER, ORDER, WORK_ORDER } = SchemaModuleEntityTypeEnums;

class OrderItemDetailView extends React.Component<Props> {
  render() {
    const { schemaReducer, recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note' ],
    );

    return (<Layout className="record-detail-view">
      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-left-panel">
            <DetailPanelLeft record={record}>
              <RecordProperties columns={1} columnLayout="horizontal" record={record}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={18}>
          <div className="record-detail-left-panel">
            <CardWithTabs
              title="Options"
              defaultTabKey="Device"
              tabList={[
                {
                  key: 'Device',
                  tab: 'Devices',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
                {
                  key: 'Activity',
                  tab: 'Activity',
                },
              ]}
              contentList={{
                Device: <div>
                  {showVoiceTab(record) &&
                  <div>
                      <ol>
                          <li>If the customer is porting their phone number,<br/> create a phone porting entry first.
                              Otherwise skip to step 2.
                          </li>
                          <li>Setup Sipwise profile</li>
                          <li>Activate voice on the network</li>
                      </ol>
                      <div style={{ display: 'flex', marginBottom: 24 }}>
                          <div style={{ marginRight: 12 }}>
                              <SipwiseCustomerContactSetupModal record={record}/>
                          </div>
                          <div style={{ marginRight: 12 }}>
                              <VoiceActivateModal record={record}/>
                          </div>
                      </div>
                      <AssociationDataTable
                          title={'Phone Porting'}
                          record={record}
                          moduleName={SERVICE_MODULE}
                          entityName={'CustomerPhonePorting'}/>
                  </div>
                  }

                  {showNetworkTab(record) &&
                  <div>
                      <div>
                        {showCustomerDeviceOnt(record) &&
                        <div style={{ display: 'flex', marginBottom: 24 }}>
                            <div style={{ marginRight: 12 }}>
                                <NetworkProvisioningModal record={record}/>
                            </div>
                            <div style={{ marginRight: 12 }}>
                                <NetworkDeactivateModal record={record}/>
                            </div>
                            <div style={{ marginRight: 12 }}>
                                <NetworkCheckModal record={record}/>
                            </div>
                        </div>
                        }
                      </div>
                      <div>
                        {showCustomerDeviceOnt(record) &&
                        <AssociationDataTable
                            title={'ONT'}
                            record={record}
                            moduleName={SERVICE_MODULE}
                            entityName={CUSTOMER_DEVICE_ONT}/>
                        }

                        {showCustomerDeviceRouter(record) &&
                        <AssociationDataTable
                            title={'Router'}
                            record={record}
                            moduleName={SERVICE_MODULE}
                            entityName={CUSTOMER_DEVICE_ROUTER}/>
                        }
                      </div>
                  </div>
                  }
                </div>,
                ...renderDynamicAssociations(record, relatedSchemas),
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


export default withRouter(connect(mapState)(OrderItemDetailView));
