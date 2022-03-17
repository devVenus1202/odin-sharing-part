import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../../core/records/components/ActivityFeed';
import BreadcrumbComponent from '../../../../core/records/components/Breadcrumb';
import DetailPanelLeft from '../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../core/records/components/Note/NoteForm';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import { renderDynamicAssociations } from '../../../../core/recordsAssociations/helpers/component-helpers';
import { IRecordAssociationsReducer } from '../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../core/schemas/store/reducer';
import CardWithTabs from '../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../../../shared/utilities/recordHelpers';
import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../../../shared/utilities/schemaHelpers';
import CreateLeadFromAddress from '../Lead/CreateLeadFromAddress';
import LogVisitForm from './LogVisitModal';

const { CRM_MODULE } = SchemaModuleTypeEnums;

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  match: any,
  hasColumnMappings?: boolean,
  visibleProperties?: string[],
  schemaReducer: SchemaReducerState,
  getSchema: any,
}

interface State {
  Visit: any,
  UDPRN: string,
  UMPRN: string,
}

class AddressDetailView extends React.Component<PropsType, State> {

  constructor(props: any) {
    super(props);
    this.state = {
      Visit: null,
      UDPRN: '',
      UMPRN: '',
    }
  }


  getAddressRecord = () => {
    const { recordReducer, match, hasColumnMappings, recordAssociationReducer } = this.props;

    if (hasColumnMappings) {
      return getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        match.params.dbRecordAssociationId,
        match.params.recordId,
      );
    } else {
      return getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    }
  }

  componentDidMount() {
    const { getSchema, schemaReducer } = this.props
    const addressRecord = this.getAddressRecord()

    getSchema({ moduleName: CRM_MODULE, entityName: 'Visit' })

    const visitSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, 'Visit')

    if (visitSchema && addressRecord) {

      this.setState({
        UDPRN: getProperty(addressRecord, 'UDPRN'),
        UMPRN: getProperty(addressRecord, 'UMPRN'),
      })

    }

  }


  render() {
    const { schemaReducer, visibleProperties, hasColumnMappings } = this.props;

    let record = this.getAddressRecord()
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note' ],
    );

    return (
      <>
        <CreateLeadFromAddress/>
        <Layout className="record-detail-view">
          <BreadcrumbComponent record={record}/>
          <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
            <Col xs={24} sm={24} md={24} lg={6}>
              <div className="record-detail-left-panel">
                <DetailPanelLeft
                  record={record}
                  hasColumnMappings={hasColumnMappings}
                  visibleProperties={visibleProperties}
                >
                  <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
                  {renderCreateUpdateDetails(record)}
                </DetailPanelLeft>
              </div>
            </Col>

            <Col xs={24} sm={24} md={24} lg={12}>
              <div className="record-detail-center-panel">
                <CardWithTabs
                  title="Options"
                  defaultTabKey="CustomerDeviceOnt"
                  extra={<div style={{ display: 'flex' }}>
                    <LogVisitForm addressRecord={record}/>
                  </div>}
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
        </Layout>
      </>
    )
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (params: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(AddressDetailView));
