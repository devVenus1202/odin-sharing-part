import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Button, Col, Layout, Modal, Row, Spin } from 'antd';
import React from 'react';
import { isMobile } from 'react-device-detect';
import { connect } from 'react-redux';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import AssociationDataTable from '../../../recordsAssociations/components/AssociationDataTable/DataTable';
import { renderDynamicAssociations } from '../../../recordsAssociations/helpers/component-helpers';
import { IRecordReducer } from '../../store/reducer';
import ActivityFeed from '../ActivityFeed';
import BreadcrumbComponent from '../Breadcrumb';
import FileUploader from '../Files/FileUploaderDragAndDrop';
import NoteForm from '../Note/NoteForm';
import RecordHeader from '../RecordHeader';
import WidePipeline from '../WidePipeline/Pipeline';
import RecordProperties from './RecordProperties';
import './styles.scss'


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
  customTabs?: { key: string, tab: string }[],
  customContent?: { [key: string]: any },
  toggleColumnState: any,
  detailsColumnExpanded: boolean
}

class RecordMainContentWide extends React.Component<Props> {

  render() {
    const { record, recordReducer, hasColumnMappings, relatedSchemas, visibleProperties, customTabs, customContent, defaultTabKey, detailsColumnExpanded } = this.props;

    return (
      <Layout className="record-detail-view">
        <BreadcrumbComponent record={record}/>
        <Modal visible={recordReducer.isExportingAssociations} centered={true} footer={null}>
          <Spin spinning={recordReducer.isExportingAssociations}>data exporting...</Spin>
        </Modal>
        <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
          <Col xs={24} sm={24} md={24} lg={24}>

            <RecordHeader
              hasColumnMappings={hasColumnMappings}
              visibleProperties={visibleProperties}
              record={record}>
              <RecordProperties columns={1} columnLayout="horizontal" record={record}/>
              {renderCreateUpdateDetails(record)}
            </RecordHeader>

          </Col>


          {record?.stage &&
          <Col xs={24} sm={24} md={24} lg={24} style={{ marginTop: isMobile ? 0 : '15px' }}>
              <div className="record-detail-left-panel">
                  <WidePipeline className="record-pipeline" record={record}/>
              </div>
          </Col>
          }

          <Col xs={24} sm={24} md={24} lg={detailsColumnExpanded ? 24 : 18}
               style={{ marginTop: record?.stage ? 0 : '10px' }} className="detailsColumn">
            <CardWithTabs
              title={
                <Row>
                  <Col span={20}>
                    <span>Details & Associated Records</span>
                  </Col>
                  <Col span={4} style={{ textAlign: 'right' }}>

                    <Button
                      disabled={isMobile}
                      icon={detailsColumnExpanded ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
                      onClick={() => {
                        this.props.toggleColumnState()
                      }}/>

                  </Col>
                </Row>
              }
              defaultTabKey={defaultTabKey || 'RecordDetails'}
              tabList={[
                {
                  key: 'RecordDetails',
                  tab: 'Record Details',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
                ...customTabs ? customTabs : [],
              ]}
              contentList={
                {
                  RecordDetails: <RecordProperties columns={1} columnLayout="horizontal" record={record}/>,
                  ...renderDynamicAssociations(record, relatedSchemas),
                  ...customContent ? customContent : {},
                }
              }
            />
          </Col>

          <Col xs={24} sm={24} md={24} lg={detailsColumnExpanded ? 24 : 6}
               style={{ marginTop: isMobile || record?.stage ? 0 : '10px' }} className="updatesColumn">
            <div className="record-detail-right-panel">
              <CardWithTabs
                title="Updates"
                defaultTabKey="Files"
                tabList={[
                  {
                    key: 'Files',
                    tab: 'Files',
                  },
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
                  Files: <div>
                    <div>
                      <FileUploader record={record}/>
                    </div>
                    <AssociationDataTable
                      title="Files"
                      record={record}
                      moduleName="SchemaModule"
                      entityName="File"/>
                  </div>,
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


export default connect(mapState)(RecordMainContentWide);
