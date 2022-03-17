import { RelationTypeEnum } from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Col, Layout, Modal, Row, Spin } from 'antd';
import React from 'react';
import { isMobile } from 'react-device-detect';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../core/records/components/Breadcrumb';
import RecordProperties from '../../../core/records/components/DetailViewWide/RecordProperties';
import NoteForm from '../../../core/records/components/Note/NoteForm';
import RecordHeader from '../../../core/records/components/RecordHeader';
import WidePipeline from '../../../core/records/components/WidePipeline/Pipeline';
import { IRecordReducer } from '../../../core/records/store/reducer';
import AssociationDataTable from '../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { renderDynamicAssociations } from '../../../core/recordsAssociations/helpers/component-helpers';
import { SchemaReducerState } from '../../../core/schemas/store/reducer';
import CardWithTabs from '../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../shared/components/RecordCreateUpdateDetails';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../shared/utilities/schemaHelpers';


type PathParams = {
  url: string,
  recordId: string
}

type State = {
  detailsColumnExpanded: boolean
}

type PropsType = RouteComponentProps<PathParams> & {
  match?: any,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  disableClone?: boolean,
  disableEdit?: boolean,
  disableDelete?: boolean,
  excludeRelations?: string[],
  defaultTabKey?: string,
}

const { NOTE } = SchemaModuleEntityTypeEnums;

class ProjectModuleTaskDetailViewWide extends React.Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);
    this.state = {
      detailsColumnExpanded: false,
    }
  }

  getPolygonId(record: DbRecordEntityTransform, schema: SchemaEntity | undefined) {
    let polygonId;

    if (schema) {
      polygonId = getProperty(record, 'ExternalRef')
    }

    return polygonId;
  }

  toggleColumnState = () => {
    this.setState({ detailsColumnExpanded: !this.state.detailsColumnExpanded })
  }

  render() {

    const { schemaReducer, recordReducer, match, excludeRelations, disableClone, disableEdit, disableDelete, defaultTabKey } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      excludeRelations ? [ NOTE, ...excludeRelations ] : [ NOTE ],
    );

    const polygonId = this.getPolygonId(record, schema)

    console.log('polygonId', polygonId)

    return (
      <Layout className="record-detail-view">
        <BreadcrumbComponent record={record}/>
        <Modal visible={recordReducer.isExportingAssociations} centered={true} footer={null}>
          <Spin spinning={recordReducer.isExportingAssociations}>data exporting...</Spin>
        </Modal>
        <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
          <Col xs={24} sm={24} md={24} lg={24}>

            <RecordHeader
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


          <Col xs={24} sm={24} md={24} lg={18}
               style={{ marginTop: record?.stage ? 0 : '10px' }} className="detailsColumn">
            <CardWithTabs
              title={
                <Row>
                  <Col span={20}>
                    <span>Details & Associated Records</span>
                  </Col>
                </Row>
              }
              defaultTabKey={defaultTabKey || 'RecordDetails'}
              tabList={[
                {
                  key: 'RecordDetails',
                  tab: 'Record Details',
                },
                {
                  key: 'Overview',
                  tab: 'Overview',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={
                {
                  RecordDetails: <RecordProperties columns={1} columnLayout="horizontal" record={record}/>,
                  ...renderDynamicAssociations(record, relatedSchemas),
                  Overview: <div>
                    <AssociationDataTable
                      title={'Project'}
                      record={record}
                      moduleName={'ProjectModule'}
                      entityName={'Project'}/>

                    <AssociationDataTable
                      title={'Parent Task'}
                      record={record}
                      moduleName={'ProjectModule'}
                      entityName={'Task'}
                      relationType={RelationTypeEnum.PARENT}/>

                    <AssociationDataTable
                      title={'Child Tasks'}
                      record={record}
                      moduleName={'ProjectModule'}
                      entityName={'Task'}
                      relationType={RelationTypeEnum.CHILD}/>

                    <AssociationDataTable
                      title={'Jobs'}
                      record={record}
                      moduleName={'ProjectModule'}
                      entityName={'Job'}/>

                  </div>,
                }
              }
            />
          </Col>

          <Col xs={24} sm={24} md={24} lg={6}
               style={{ marginTop: isMobile || record?.stage ? 0 : '10px' }} className="updatesColumn">
            <div className="record-detail-right-panel">
              <CardWithTabs

                title="Updates"
                defaultTabKey="Details"
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

const mapDispatch = (dispatch: any) => ({});

export default withRouter(connect(mapState, mapDispatch)(ProjectModuleTaskDetailViewWide));
