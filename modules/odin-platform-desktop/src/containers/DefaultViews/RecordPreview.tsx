import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Card, Col, Empty, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { getRecordAuditLogs } from '../../core/records/auditLogs/store/actions';
import ActivityFeed from '../../core/records/components/ActivityFeed';
import RecordProperties from '../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../core/records/components/Note/NoteForm';
import RecordPageHeader from '../../core/records/components/PageHeader';
import Pipeline from '../../core/records/components/Pipeline/Pipeline';
import { setDbRecordState } from '../../core/records/store/actions';
import AssociationDataTable from '../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../core/schemas/store/actions';
import { SchemaReducerState } from '../../core/schemas/store/reducer';
import CardWithTabs from '../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../shared/components/RecordCreateUpdateDetails';
import { getAllSchemaAssociationSchemas } from '../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../shared/utilities/schemaHelpers';

const { NOTE } = SchemaModuleEntityTypeEnums;


type PathParams = {

  url: string,
  recordId: string

}

type Props = RouteComponentProps<PathParams> & {
  record: DbRecordEntityTransform | undefined,
  schema?: SchemaEntity,
  relatedSchemas: SchemaEntity[],
  modifyState: (params: any) => {},
  getAuditLogs: (params: any) => {},
  schemaReducer: SchemaReducerState,
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => {},
  disableDelete?: boolean,
  disableClone?: boolean,
  disableEdit?: boolean,
}

class RecordPreview extends React.Component<Props> {

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    if (prevProps.record?.id !== this.props.record?.id) {
      this.fetchData()
    }
  }

  fetchData() {
    const { record, schema, getAuditLogs } = this.props;
    if (record?.id && schema) {
      getAuditLogs({ schema, recordId: record?.id });
    }
  }


  renderImage() {
    const { record } = this.props;
    if (record) {
      return <img style={{
        width: 700,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '50% 50%',
      }} src={getProperty(record, 'Url')}/>;
    }
  }

  handleClose = () => {
    const { modifyState } = this.props;
    modifyState({ showPreview: false, currentRecordId: '' });
  }

  private renderDynamicAssociations(record: DbRecordEntityTransform, relatedSchemas: SchemaEntity[]) {
    const obj = {};
    if (record && relatedSchemas) {
      for(const schema of relatedSchemas) {
        // @ts-ignore
        obj[schema.entityName] =
          <AssociationDataTable
            title={schema.entityName}
            record={record}
            moduleName={schema.moduleName}
            entityName={schema.entityName}
          />;
      }
    }

    return obj;
  }

  render() {
    const { record, schemaReducer, getSchema, disableDelete, disableClone, disableEdit } = this.props;

    let recordSchema = this.props.schema;
    let relatedSchemas = this.props.relatedSchemas;

    if (!relatedSchemas || !(relatedSchemas.length > 0)) {
      if (!recordSchema || !recordSchema.associations) {
        recordSchema = getSchemaFromShortListBySchemaId(schemaReducer?.shortList, record?.schemaId);
      }
      if (recordSchema) {
        if (!recordSchema.associations) {
          if (!schemaReducer.isRequesting) {
            getSchema(
              { moduleName: recordSchema.moduleName, entityName: recordSchema.entityName, withAssociations: true },
              undefined,
            );
          }
        } else {
          relatedSchemas = getAllSchemaAssociationSchemas(recordSchema?.associations, [ NOTE ]);
        }
      }
    }

    return (
      record ?
        <Layout className="record-detail-view">
          <div style={{ height: 35, paddingLeft: 8 }}>
            <Link
              to={`/${record.entity.split(':')[0]}/${record.entity.split(':')[1]}/${record.id}`}
              onClick={this.handleClose}
            >
              Full view
            </Link>
          </div>
          <RecordPageHeader
            record={record}
            disableDelete={disableDelete}
            disableClone={disableClone}
            disableEdit={disableEdit}
          />
          <Card style={{ marginBottom: 10 }}>
            <RecordProperties columns={3} record={record}/>
            {renderCreateUpdateDetails(record)}
          </Card>
          {record?.stage &&
          <Pipeline className="record-pipeline" record={record}/>
          }
          <CardWithTabs
            title="Options"
            defaultTabKey=""
            tabList={[
              ...relatedSchemas.map(elem => ({
                key: elem.entityName,
                tab: elem.entityName,
              })),
            ]}
            contentList={{
              ...this.renderDynamicAssociations(record, relatedSchemas),
            }}
          />
          <Row gutter={8} className="record-main-content-row">
            {record?.entity?.split(':')[1] === 'File' &&
            <Col span={24}>
                <div style={{ marginBottom: 24 }}>
                  {this.renderImage()}
                </div>
            </Col>
            }
            <Col span={24}>
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
                    Activity: <ActivityFeed recordId={record?.id}
                                            dbRecordAssociationId={record?.dbRecordAssociation?.id}/>,
                  }}
                />
              </div>
            </Col>
          </Row>
        </Layout> : (<Empty/>))
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  modifyState: (params: any) => dispatch(setDbRecordState(params)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getAuditLogs: (params: any) => dispatch(getRecordAuditLogs(params)),
});

export default withRouter(connect(mapState, mapDispatch)(RecordPreview));
