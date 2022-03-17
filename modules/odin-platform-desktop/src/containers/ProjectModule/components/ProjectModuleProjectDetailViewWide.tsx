import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import RecordMainContentWide from '../../../core/records/components/DetailViewWide/RecordMainContentWide';
import { IRecordReducer } from '../../../core/records/store/reducer';
import { SchemaReducerState } from '../../../core/schemas/store/reducer';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../shared/utilities/schemaHelpers';
import CableDiagram from '../containers/CableDiagram';
import MapViewer from '../containers/MapViewer';

const { NOTE } = SchemaModuleEntityTypeEnums;

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


class ProjectModuleProjectRecordDetailViewWide extends React.Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);
    this.state = {
      detailsColumnExpanded: false,
    }
  }

  getPolygonId(record: DbRecordEntityTransform, schema: SchemaEntity | undefined) {
    let polygonId;

    if (schema?.entityName === 'Project') {
      polygonId = getProperty(record, 'ExternalRef')
    }
    if ([ 'Job', 'Task' ].includes(schema?.entityName || '')) {
      polygonId = getProperty(record, 'L1PolygonId')
    }


    return polygonId;
  }

  toggleColumnState = () => {
    this.setState({ detailsColumnExpanded: !this.state.detailsColumnExpanded })
  }


  addCableDiagramAndMapViewerTabs = (polygonId: any) => {
    if (polygonId) {

      return {
        tabs:
          [
            {
              key: 'CableDiagram',
              tab: 'Cable Diagram',
            },
            {
              key: 'MapViewer',
              tab: 'Map Viewer',
            },
          ],
        content: {
          CableDiagram: <CableDiagram polygonId={polygonId}
                                      columnFullscreen={this.state.detailsColumnExpanded}/>,
          MapViewer: <MapViewer polygonId={polygonId}
                                columnFullscreen={this.state.detailsColumnExpanded}/>,
        },
      }
    } else return { tabs: [], content: {} }
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

    return (<RecordMainContentWide
        disableClone={disableClone}
        disableEdit={disableEdit}
        disableDelete={disableDelete}
        defaultTabKey={defaultTabKey}
        record={record}
        schema={schema}
        relatedSchemas={relatedSchemas}
        toggleColumnState={this.toggleColumnState}
        detailsColumnExpanded={this.state.detailsColumnExpanded}
        customTabs={this.addCableDiagramAndMapViewerTabs(polygonId).tabs}
        customContent={this.addCableDiagramAndMapViewerTabs(polygonId).content}
      />
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({});

export default withRouter(connect(mapState, mapDispatch)(ProjectModuleProjectRecordDetailViewWide));
