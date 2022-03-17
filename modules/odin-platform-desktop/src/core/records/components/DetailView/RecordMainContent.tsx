import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Col, Layout, Modal, Row, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import { IRecordReducer } from '../../../records/store/reducer';
import { renderDynamicAssociations } from '../../../recordsAssociations/helpers/component-helpers';
import ActivityFeed from '../ActivityFeed';
import BreadcrumbComponent from '../Breadcrumb';
import DetailPanelLeft from '../DetailPanelLeft';
import NoteForm from '../Note/NoteForm';
import Pipeline from '../Pipeline/Pipeline';
import RecordProperties from './RecordProperties';

interface Props {
  record: DbRecordEntityTransform,
  schema?: SchemaEntity,
  relatedSchemas: SchemaEntity[],
  hasColumnMappings?: boolean,
  disableClone?: boolean,
  disableEdit?: boolean,
  disableDelete?: boolean,
  visibleProperties?: string[],
  recordReducer: IRecordReducer,
  defaultTabKey?: string
}

class RecordMainContent extends React.Component<Props> {

  render() {
    const { record, recordReducer, hasColumnMappings, relatedSchemas, visibleProperties, defaultTabKey } = this.props;

    return (
      <Layout className="record-detail-view">
        <BreadcrumbComponent record={record}/>
        <Modal visible={recordReducer.isExportingAssociations} centered={true} footer={null}>
          <Spin spinning={recordReducer.isExportingAssociations}>data exporting...</Spin>
        </Modal>
        <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
          <Col xs={24} sm={24} md={24} lg={6}>
            <div className="record-detail-left-panel">
              <DetailPanelLeft
                hasColumnMappings={hasColumnMappings}
                visibleProperties={visibleProperties}
                record={record}>
                <RecordProperties columns={1} columnLayout="horizontal" record={record}/>
                {renderCreateUpdateDetails(record)}
              </DetailPanelLeft>
            </div>
          </Col>

          <Col xs={24} sm={24} md={24} lg={12}>
            <div className="record-detail-left-panel">
              {record?.stage &&
              <Pipeline className="record-pipeline" record={record}/>
              }
              <CardWithTabs
                title="Options"
                defaultTabKey={defaultTabKey}
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


export default connect(mapState)(RecordMainContent);
