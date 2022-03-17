import { DbRecordCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/dto/db.record.create.update.dto';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import Editor from '@monaco-editor/react';
import { Button, Col, Layout, Row, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import NoteForm from '../../../../../core/records/components/Note/NoteForm';
import { IUpdateRecordById, updateRecordByIdRequest } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByIdRequest, ISchemaById, listSchemasRequest } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { OdinSyntaxCompletionItemProvider } from '../../../../../core/workflowEngine/helpers/odin.syntax.completion.items.provider';
import {
  getWActivityJsonSchema,
  getWFunctionJsonSchema,
  getWRecordsSelectorFuncJsonSchema,
  wActivityActionJsonSchema,
  wActivityIfElseJsonSchema,
  wActivitySequenceJsonSchema,
} from '../../../../../core/workflowEngine/types/workflows.json.schemas';
import CardWithTabs from '../../../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../../../shared/components/RecordCreateUpdateDetails';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';


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
  listSchemas: () => void,
  getSchema: (payload: ISchemaById, cb: any) => void,
  updateRecord: (params: IUpdateRecordById, cb?: (resp: any) => void) => void,
  alertMessage: (params: { body: string, type: string }) => void,
}

interface State {
  isEditingRecordSelectorFunc: boolean;
  isEditingActivity: boolean;
}


class WorkflowDetailView extends React.Component<PropsType, State> {

  state = {
    isEditingRecordSelectorFunc: false,
    isEditingActivity: false,
  }

  private editorsRefs: { selectorFunc?: any, activity?: any } = {};

  componentDidMount() {
    const { schemaReducer, listSchemas } = this.props;

    if (!(schemaReducer.list?.length > 0)) {
      listSchemas();
    }
  }

  private handleSelectorFuncEditorWillMount(monaco: any) {
    const { schemaReducer } = this.props;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [ getWRecordsSelectorFuncJsonSchema(monaco, schemaReducer.list) ],
    });
  }

  private handleActivityEditorWillMount(monaco: any) {
    const { schemaReducer, getSchema } = this.props;

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        getWRecordsSelectorFuncJsonSchema(monaco, schemaReducer.list),
        getWActivityJsonSchema(monaco),
        wActivityActionJsonSchema,
        getWFunctionJsonSchema(schemaReducer.list),
        wActivityIfElseJsonSchema,
        wActivitySequenceJsonSchema,
      ],
    });

    monaco.languages.registerCompletionItemProvider('json', new OdinSyntaxCompletionItemProvider(schemaReducer.list, schemaReducer.shortList, getSchema));
  }

  private updateRecordProperty(propertyName: string, value: any) {
    const { match, recordReducer, schemaReducer, updateRecord, alertMessage } = this.props;

    if (!value) return;

    const record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    if (!record) return;

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    if (!schema) return;

    const updateDto: DbRecordCreateUpdateDto = {
      schemaId: record.schemaId as any,
      properties: {
        [propertyName]: value,
      },
    }

    updateRecord({
      schema,
      recordId: record.id,
      createUpdate: updateDto,
    }, (resp: any) => {
      if (resp) {
        alertMessage({ body: `${propertyName} was updated`, type: 'success' });
      } else {
        alertMessage({ body: `error updating ${propertyName}`, type: 'error' });
      }
    });
  }

  render() {
    const { schemaReducer, recordAssociationReducer, hasColumnMappings, recordReducer, match, visibleProperties } = this.props;

    let record: any;

    if (hasColumnMappings) {
      record = getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        match.params.dbRecordAssociationId,
        match.params.recordId,
      );
    } else {
      record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    }

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      [ 'Note' ],
    );

    return (
      <>
        <Layout className="record-detail-view">
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

                  <div hidden={getProperty(record, 'RecordSelectorType') !== 'FUNC'}>
                    <Row>
                      <Col span={12}>
                        <h2>Record Selector Function</h2>
                      </Col>
                      <Col span={12} style={{ textAlign: 'right' }}>
                        {this.state.isEditingRecordSelectorFunc
                          ? <>
                            <Button type="primary" style={{ marginRight: 10, minWidth: 150 }}
                                    onClick={() => {
                                      this.setState({ isEditingRecordSelectorFunc: false });
                                      this.updateRecordProperty(
                                        'RecordSelectorFunc',
                                        this.editorsRefs.selectorFunc?.getValue(),
                                      );
                                    }}
                            >Save</Button>
                            <Button type="default" style={{ marginRight: '10%', minWidth: 100 }}
                                    onClick={() => {
                                      this.setState({ isEditingRecordSelectorFunc: false });
                                      this.editorsRefs.selectorFunc?.getModel().setValue(JSON.stringify(getProperty(
                                        record as any,
                                        'RecordSelectorFunc',
                                      ), undefined, '  '))
                                    }}
                            >Cancel</Button>
                          </>
                          : <Button type="primary" style={{ marginRight: '10%', minWidth: 150 }}
                                    onClick={() => this.setState({ isEditingRecordSelectorFunc: true })}
                                    disabled={this.state.isEditingRecordSelectorFunc || this.state.isEditingActivity}
                          >Edit Function</Button>}
                      </Col>
                    </Row>
                    <div>
                      <Spin spinning={recordReducer.isUpdating}>
                        <Editor
                          height="30vh"
                          path="//RecordSelectorFunc"
                          language="json"
                          value={JSON.stringify(getProperty(record, 'RecordSelectorFunc'), undefined, '  ')}
                          beforeMount={(m) => this.handleSelectorFuncEditorWillMount(m)}
                          onMount={(e, m) => {
                            this.editorsRefs.selectorFunc = e
                          }}
                          options={{
                            wordWrap: 'on',
                            readOnly: !this.state.isEditingRecordSelectorFunc,
                          }}
                        />
                      </Spin>
                    </div>
                  </div>

                <Row style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <h2>Workflow Activity</h2>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    {this.state.isEditingActivity
                      ? <>
                        <Button type="primary" style={{ marginRight: 10, minWidth: 150 }}
                                onClick={() => {
                                  this.setState({ isEditingActivity: false });
                                  this.updateRecordProperty('Activity', this.editorsRefs.activity?.getValue());
                                }}
                        >Save</Button>
                        <Button type="default" style={{ marginRight: '10%', minWidth: 100 }}
                                onClick={() => {
                                  this.setState({ isEditingActivity: false });
                                  this.editorsRefs.activity?.getModel().setValue(JSON.stringify(getProperty(
                                    record as any,
                                    'Activity',
                                  ), undefined, '  '))
                                }}
                        >Cancel</Button>
                      </>
                      : <Button type="primary" style={{ marginRight: '10%', minWidth: 150 }}
                                onClick={() => this.setState({ isEditingActivity: true })}
                                disabled={this.state.isEditingRecordSelectorFunc || this.state.isEditingActivity}
                      >Edit Activity</Button>}
                  </Col>
                </Row>
                <div>
                  <Spin spinning={recordReducer.isUpdating}>
                    <Editor
                      height="60vh"
                      path="//Activity"
                      language="json"
                      value={JSON.stringify(getProperty(record, 'Activity'), undefined, '  ')}
                      beforeMount={(m) => this.handleActivityEditorWillMount(m)}
                      onMount={(e, m) => {
                        this.editorsRefs.activity = e
                      }}
                      options={{
                        wordWrap: 'on',
                        readOnly: !this.state.isEditingActivity,
                      }}
                    />
                  </Spin>
                </div>
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
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  listSchemas: () => dispatch(listSchemasRequest()),
  getSchema: (payload: ISchemaById, cb: any) => dispatch(getSchemaByIdRequest(payload, cb)),
  updateRecord: (params: IUpdateRecordById, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});

export default withRouter(connect(mapState, mapDispatch)(WorkflowDetailView));
