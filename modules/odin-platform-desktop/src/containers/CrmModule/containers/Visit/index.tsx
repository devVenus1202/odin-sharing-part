import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Col, Empty, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import DetailPanelLeft from '../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../core/records/components/DetailView/RecordProperties';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import { renderDynamicAssociations } from '../../../../core/recordsAssociations/helpers/component-helpers';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';

interface Props {
  recordReducer: IRecordReducer,
  match: any,
  schemaReducer: any,
}

class VisitDetailView extends React.Component<Props> {


  renderGoogleMapFromCoordinates(record: DbRecordEntityTransform) {

    if (getProperty(record, 'Coordinates')) {

      const split = getProperty(record, 'Coordinates').split(',');

      return <a target="__blank" href={`http://maps.google.com/maps?q=${split[1]},${split[0]}`}>view in google</a>

    } else {

      return <Empty/>

    }

  }

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
              <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
              {renderCreateUpdateDetails(record)}
            </DetailPanelLeft>
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={18}>
          <div className="record-detail-center-panel">
            <CardWithTabs
              title="Options"
              defaultTabKey="Map"
              tabList={[
                {
                  key: 'Map',
                  tab: 'Map',
                },
                ...relatedSchemas.map(elem => ({
                  key: elem.entityName,
                  tab: elem.entityName,
                })),
              ]}
              contentList={{
                Map: <div>
                  {this.renderGoogleMapFromCoordinates(record)}
                </div>,
                ...renderDynamicAssociations(record, relatedSchemas),
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

export default withRouter(connect(mapState, mapDispatch)(VisitDetailView));
