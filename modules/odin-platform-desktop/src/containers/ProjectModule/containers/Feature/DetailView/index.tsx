import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Button, Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import FileUploader from '../../../../../core/records/components/Files/FileUploaderDragAndDrop';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import Pipeline from '../../../../../core/records/components/Pipeline/Pipeline';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import BuildCompleteDrawer from '../../Openreach/BuildComplete';

type PathParams = {
  url: string;
  recordId: string;
};

type PropsType = RouteComponentProps<PathParams> & {
  match: any;
  recordReducer: IRecordReducer;
  schemaReducer: SchemaReducerState;
  recordAssociationReducer: IRecordAssociationsReducer;
  excludeRelations?: string[];
  hasColumnMappings?: boolean;
  visibleProperties?: string[];
};

type State = {
  isBuildCompleteDrawerOpen: boolean;
};
const { NOTE } = SchemaModuleEntityTypeEnums;

class FeatureDetailView extends React.Component<PropsType, State> {
  state: State = {
    isBuildCompleteDrawerOpen: false,
  };

  renderDynamicAssociations(
    record: DbRecordEntityTransform,
    relatedSchemas: SchemaEntity[],
  ) {
    const obj = {};
    for(const schema of relatedSchemas) {
      // @ts-ignore
      obj[schema.entityName] = (
        <AssociationDataTable
          title={schema.entityName}
          record={record}
          moduleName={schema.moduleName}
          entityName={schema.entityName}
        />
      );
    }

    return obj;
  }


  renderSplicingButton(record:DbRecordEntityTransform){

    const getPath = (record:DbRecordEntityTransform) => {

        let path = ''

        const exPolygonId = getProperty(record, 'ExPolygonId')
        const L1PolygonId = getProperty(record, 'L1PolygonId')
        const L2PolygonId = getProperty(record, 'L2PolygonId')

        if(exPolygonId && L1PolygonId && L2PolygonId)
          path = `/ProjectModule/Connection/${exPolygonId}/${L1PolygonId}/${L2PolygonId}`

        return path

    }

    if(record)
      if (record.type === 'CABLE' || record.type === 'CLOSURE')
        return (
          <Link target="_blank" to={getPath(record)}>
            <Button type="primary" disabled={!getPath(record)}>Connection</Button>
          </Link>
        )

  }

  renderCustomButtons(record: DbRecordEntityTransform) {

    /* Build Pack Button - only L2 for now. */
    if(record && record.type === 'POLYGON' && getProperty(record, 'PolygonType') === 'L2'){
      return [<Link target="_blank" to={`/ProjectModule/BuildPack/${getProperty(record, 'ExternalRef')}`}>
        <Button type="primary">Generate Build Pack</Button>
      </Link>]
    }

    if (record) {
      switch (record.type) {
        case 'CLOSURE':
          return [
            <Link to={`/ProjectModule/Feature/${record?.id}/configure-closure`}>
              <Button type="primary">Configure</Button>
            </Link>,
          ];
        case 'PIA_STRUCTURE':
          return [
            <Button
              type="primary"
              onClick={() => this.openBuildCompleteDrawer()}
            >
              Build Complete
            </Button>,
          ]
        default:
          return [];
      }
    }

    return [];
  }

  renderCustomTabs(record: DbRecordEntityTransform) {
    if (record) {
      switch (record.type) {
        // case 'CLOSURE':
        //   return [
        //     {
        //       key: 'Configurator',
        //       tab: 'Configurator',
        //     },
        //   ];
        default:
          return [];
      }
    }

    return [];
  }

  renderCustomTabContent(record: DbRecordEntityTransform) {
    if (record) {
      switch (record.type) {
        // case 'CLOSURE':
        //   return {
        //     Configurator: <ClosureConfigurator/>,
        //   };
        default:
          return {};
      }
    }

    return {};
  }

  openBuildCompleteDrawer() {
    this.setState((state) => ({
      isBuildCompleteDrawerOpen: true,
    }));
  }

  closeBuildCompleteDrawer() {
    this.setState((state) => ({
      isBuildCompleteDrawerOpen: false,
    }));
  }

  render() {
    const {
      recordAssociationReducer,
      schemaReducer,
      hasColumnMappings,
      recordReducer,
      match,
      visibleProperties,
      excludeRelations,
    } = this.props;

    const { isBuildCompleteDrawerOpen } = this.state;
    let record;

    if (hasColumnMappings) {
      record = getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        match.params.dbRecordAssociationId,
        match.params.recordId,
      );
    } else {
      record = getRecordFromShortListById(
        recordReducer.shortList,
        match.params.recordId,
      );
    }

    const schema = getSchemaFromShortListBySchemaId(
      schemaReducer.shortList,
      record?.schemaId,
    );
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      excludeRelations ? [ NOTE, ...excludeRelations ] : [ NOTE ],
    );

    return (<Layout className="record-detail-view">

      <BuildCompleteDrawer
        record={record}
        isOpen={isBuildCompleteDrawerOpen}
        close={() => this.closeBuildCompleteDrawer()}
      />

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
          <div className="record-detail-center-panel">

            {record?.stage &&
            <Pipeline className="record-pipeline" record={record}/>
            }

            <CardWithTabs
              title="Options"
              defaultTabKey="File"
              extra={[

                this.renderSplicingButton(record),

                ...this.renderCustomButtons(record),

                <Link target="_blank"
                      to={`/ProjectModule/Map/${record?.type}/${getProperty(record, 'ExternalRef')}`}>
                  <Button type="primary">View in Map</Button>
                </Link>,
              ]}
              tabList={[
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
                ...this.renderCustomTabs(record),
              ]}
              contentList={{
                ...this.renderDynamicAssociations(record, relatedSchemas),
                ...this.renderCustomTabContent(record),
              }}
            />
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={6}>
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
  recordAssociationReducer: state.recordAssociationReducer,
});

export default withRouter(connect(mapState)(FeatureDetailView));
