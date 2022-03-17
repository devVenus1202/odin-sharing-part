import { Button, Checkbox, Divider, Drawer, Form, FormInstance, Row, Input, Select, Spin, Table, Col, Tooltip, Typography, Descriptions, Space, Empty } from 'antd';
import React from 'react';
import { displayMessage } from '../../../../shared/system/messages/store/reducers';
import { IWorkflowEngineReducer } from '../../store/reducer';
import { IProcessWorkflowFormReducer } from './store/reducer';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { closeProcessWorkflowForm, updateProcessWorkflowFormState } from './store/actions';
import { connect } from 'react-redux';
import { getWorkflowByIdRequest, IProcessWorkflowParams, processWorkflowRequest, searchWorkflowsRequest } from '../../store/actions';
import LinkOutlined from '@ant-design/icons/lib/icons/LinkOutlined';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { changeToCapitalCase } from '../../../../shared/utilities/dataTransformationHelpers';
import Editor from '@monaco-editor/react';
import { WQueryParams } from '@d19n/models/dist/schema-manager/workflow/types/workflow.api.types';
import { WTriggerEntityEventEnum, WTriggerTypeEnum } from '@d19n/models/dist/schema-manager/workflow/types/workflow.types';
import dayjs from 'dayjs';
import { listSchemasRequest } from '../../../schemas/store/actions';
import { DataTypesUtils } from '@d19n/models/dist/schema-manager/helpers/DataTypesUtils';
import { getEntityNamesByModules } from '../../../../shared/utilities/schemaHelpers';


interface Props {
  schemaReducer: SchemaReducerState,
  listSchemas: () => void,
  workflowEngineReducer: IWorkflowEngineReducer;
  searchWorkflows: (params?: WQueryParams, cb?: (resp: any) => void) => void;
  getWorkflowById: (params: { id: string }, cb?: (workflow: DbRecordEntityTransform) => void) => void;
  processWorkflow: (params: IProcessWorkflowParams, cb?: (resp: any) => void) => void;
  processWorkflowFormReducer: IProcessWorkflowFormReducer;
  updateFormState: (params: any) => void;
  closeForm: () => void;
  alertMessage: (params: { body: string, type: string }) => void;
}

interface State {
}

class ProcessWorkflow extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  componentDidMount() {
    this.initializeForm();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (this.props.processWorkflowFormReducer.isVisible 
      && this.props.processWorkflowFormReducer.isVisible !== prevProps.processWorkflowFormReducer.isVisible
    ) {
      this.initializeForm();
    }
  }

  private handleClose() {
    const { closeForm } = this.props;
    closeForm();
  }

  private handleProcess(simulation: boolean) {
    const { processWorkflowFormReducer, workflowEngineReducer, processWorkflow } = this.props;

    if (processWorkflowFormReducer.workflowId) {
      const processingState = workflowEngineReducer.processingStates[processWorkflowFormReducer.workflowId];
      if (!processingState?.isProcessing) {
        processWorkflow({
          workflowId: processWorkflowFormReducer.workflowId,
          recordIds: processWorkflowFormReducer.recordId ? [processWorkflowFormReducer.recordId] : undefined,
          processInactive: processWorkflowFormReducer.isActive !== undefined ? !processWorkflowFormReducer.isActive : undefined,
          simulation,
        });
      }
    }
  }

  private initializeForm() {
    const { schemaReducer, listSchemas, processWorkflowFormReducer, workflowEngineReducer, getWorkflowById } = this.props;

    if (!(schemaReducer.list?.length > 0)) {
      listSchemas();
    }

    if (processWorkflowFormReducer.workflowId) {
      const wf = workflowEngineReducer.workflowsShortList[processWorkflowFormReducer.workflowId];
      if (wf) {
        this.initializeFormByWorkflow(wf);
      } else {
        getWorkflowById({ id: processWorkflowFormReducer.workflowId }, (workflow: DbRecordEntityTransform) => {
          if (workflow) {
            this.initializeFormByWorkflow(workflow);
          }
        });
      }
    }

    this.refreshWorkflows();
  }

  private initializeFormByWorkflow(workflow: DbRecordEntityTransform) {
    const { updateFormState } = this.props;

    if (!workflow) return;
    
    const newState: any = {};
    if (workflow.properties?.ModuleName) {
      newState.moduleName = workflow.properties.ModuleName;
    }
    if (workflow.properties?.EntityName) {
      newState.entityName = workflow.properties?.EntityName;
    }
    if (workflow.properties?.TriggerType) {
      newState.triggerType = workflow.properties?.TriggerType;
    }
    if (workflow.properties?.TriggerEntityEvents) {
      if (typeof(workflow.properties.TriggerEntityEvents) === 'string') {
        newState.triggerEntityEvents = workflow.properties?.TriggerEntityEvents?.split(',');
      } else if (Array.isArray(workflow.properties.TriggerEntityEvents)) {
        newState.triggerEntityEvents = workflow.properties?.TriggerEntityEvents;
      }
      if (!newState.triggerEntityEvents) newState.triggerEntityEvents = [];
    }
    newState.isActive = DataTypesUtils.parseBoolean(workflow.properties?.isActive);

    updateFormState(newState);

    this.formRef.current?.setFieldsValue(newState);
  }

  private refreshWorkflows(overrideQueryParams?: any) {
    const { searchWorkflows, processWorkflowFormReducer, workflowEngineReducer, updateFormState } = this.props;
    
    if (processWorkflowFormReducer.canChangeWorkflow) {

      if (!workflowEngineReducer.isSearching && processWorkflowFormReducer.isVisible) {
        // search workflows
        searchWorkflows({
          moduleName: processWorkflowFormReducer.moduleName,
          entityName: processWorkflowFormReducer.entityName,
          isActive: processWorkflowFormReducer.isActive,
          triggerType: processWorkflowFormReducer.triggerType,
          triggerEntityEvents: processWorkflowFormReducer.triggerEntityEvents,
          ...overrideQueryParams,
        }, (resp: any) => {
          const workflows = resp?.data?.data;
          if (!workflows || !workflows.some((wf: DbRecordEntityTransform) => wf.id === processWorkflowFormReducer.workflowId)) {
            updateFormState({
              workflowId: '',
            });
          }
        });
      }

    } else {
      // clear search results
      searchWorkflows(undefined);
    }
  }

  private handleRecordIdChange(value: string) {
    const { updateFormState } = this.props;

    updateFormState({
      recordId: value ?? '',
    });
  }

  private handleModuleNameChange(value: string) {
    const { updateFormState, processWorkflowFormReducer, schemaReducer } = this.props;

    const newState: { [key: string]: any } = {
      moduleName: value ?? '',
    };

    if (processWorkflowFormReducer.entityName) {
      const entityNames = getEntityNamesByModules(schemaReducer.list, value);
      if (!entityNames.map(item => item[1]).includes(processWorkflowFormReducer.entityName)) {
        newState.entityName = '';
        this.formRef.current?.setFieldsValue({
          entityName: '',
        });
      }
    }

    updateFormState(newState);

    this.refreshWorkflows(newState);
  }

  private handleEntityNameChange(value: string) {
    const { updateFormState } = this.props;
    
    updateFormState({
      entityName: value ?? '',
    });

    this.refreshWorkflows({
      entityName: value,
    });
  }

  private handleTriggerTypeChange(value: string) {
    const { updateFormState } = this.props;

    const newState: { [key: string]: any } = {
      triggerType: value,
    }

    if (value !== WTriggerTypeEnum.ENTITY_EVENT) {
      newState.triggerEntityEvents = [];
      this.formRef.current?.setFieldsValue({
        triggerEntityEvents: [],
      });
    }

    updateFormState(newState);

    this.refreshWorkflows(newState);
  }

  private handleTriggerEntityEventsChange(values: string[]) {
    const { updateFormState } = this.props;

    updateFormState({
      triggerEntityEvents: values,
    });

    this.refreshWorkflows({
      triggerEntityEvents: values,
    });
  }

  private handleIsActiveChange(value: boolean) {
    const { updateFormState } = this.props;
    
    updateFormState({
      isActive: value,
    });

    this.refreshWorkflows({
      isActive: value,
    });
  }

  private handleWorkflowSelect(selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) {
    const { updateFormState } = this.props;

    if (selectedRowKeys?.length > 0) {
      updateFormState({
        workflowId: selectedRowKeys[0],
      })
    }
  }

  private renderModuleNames() {
    const { schemaReducer } = this.props;

    const entityNamesByModules = getEntityNamesByModules(schemaReducer.list);

    const names: string[] = [];
    new Set(entityNamesByModules.map(item => item[0])).forEach(item => names.push(item));
    
    return names.sort().map(item => 
      <Select.Option value={item} key={item}>{item}</Select.Option>
    );
  }

  private renderEntityNames() {
    const { processWorkflowFormReducer, schemaReducer } = this.props;

    const entityNamesByModules = getEntityNamesByModules(schemaReducer.list, processWorkflowFormReducer.moduleName);

    const names: string[] = [];
    new Set(entityNamesByModules.map(item => item[1])).forEach(item => names.push(item));

    return names.sort().map(item => 
      <Select.Option value={item} key={item}>{item}</Select.Option>
    );
  }

  private renderWorkflows() {
    const { processWorkflowFormReducer, workflowEngineReducer } = this.props;

    const workflows: DbRecordEntityTransform[] = [];
    if (processWorkflowFormReducer.canChangeWorkflow) {
      workflows.push(...workflowEngineReducer.searchWorkflowsList);
    } else if (processWorkflowFormReducer.workflowId) {
      const wf = workflowEngineReducer.workflowsShortList[processWorkflowFormReducer.workflowId];
      if (wf) workflows.push(wf);
    }

    workflows.forEach(wf => wf.key = wf.id);

    const columns: any[] = [
      {
        title: 'Title',
        dataIndex: 'title',
      },
      {
        title: 'Module & Entity',
        render: (text: any, record: any) => 
          <>
          {record.properties.ModuleName}<br/>{record.properties.EntityName}
          </>
      }
    ];

    if (processWorkflowFormReducer.triggerType === WTriggerTypeEnum.ENTITY_EVENT) {
      columns.push({
        title: 'Entity Events',
        render: (text: any, record: any) => {
          return Array.isArray(record.properties.TriggerEntityEvents)
          ? record.properties.TriggerEntityEvents.join(', ')
          : record.properties.TriggerEntityEvents
        },
      });
    } else if (processWorkflowFormReducer.triggerType === WTriggerTypeEnum.CRON) {
      columns.push({
        title: 'Cron',
        render: (text: any, record: any) => record.properties.TriggerCron,
      });
    }

    return (
      <Table
        rowSelection={{
          type: 'radio',
          preserveSelectedRowKeys: false,
          selectedRowKeys: processWorkflowFormReducer.workflowId ? [processWorkflowFormReducer.workflowId] : [],
          onChange: (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
            this.handleWorkflowSelect(selectedRowKeys, selectedRows);
          },
          getCheckboxProps: (record: DbRecordEntityTransform) => ({
            disabled: !processWorkflowFormReducer.canChangeWorkflow
          }),
        }}
        loading={workflowEngineReducer.isSearching}
        scroll={{ y: 'calc(100vh - 315px)' }}
        style={{ width: '100%' }}
        size='small'
        dataSource={workflows}
        columns={columns}
      />
    );
  }

  private copyLinkToClipboard() {
    const { alertMessage } = this.props;
    navigator.clipboard.writeText(window.location?.href);
    alertMessage({ body: 'Link to record copied to clipboard!', type: 'success' });
  }

  private renderSelectedWorkflow() {
    const { processWorkflowFormReducer, workflowEngineReducer } = this.props;

    if (processWorkflowFormReducer.workflowId) {
      const record = workflowEngineReducer.workflowsShortList[processWorkflowFormReducer.workflowId];
      if (record) {
        const excludePropKeys = [ 
          'Activity', 'RecordSelectorFunc', 
          'ModuleName', 'EntityName', 
          'TriggerType', 'TriggerEntityEvents', 
          'TriggerCron', 'IsActive', 
        ];
        let propKeysToRender: string[] = [];
        if (record.properties) {
          propKeysToRender = Object.keys(record.properties).filter(propKey => !excludePropKeys.includes(propKey));
        }
        return (
          <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className='record-title-wrapper'  style={{ display: 'flex', flexDirection: 'row' }}>
              <Typography.Text className='record-title' strong>{record?.title}</Typography.Text>
              <Tooltip title='Copy link to record'>
                <LinkOutlined onClick={() => this.copyLinkToClipboard()} />
              </Tooltip>
            </div>
          </div>
          <div style={{ marginTop: 5 }}>
            <Descriptions column={2} layout='vertical' size='small'>
              <Descriptions.Item key='id' label='Id'>{processWorkflowFormReducer.workflowId}</Descriptions.Item>
              {propKeysToRender.map(key => {
                return <Descriptions.Item key={key} label={changeToCapitalCase(key)}>{getProperty(record, key, true)}</Descriptions.Item>
              })}
            </Descriptions>
          </div>
          { getProperty(record, 'RecordSelectorType') === 'FUNC' ?
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography.Text strong>Record Selector Func:</Typography.Text>
            <Editor
              height='30vh'
              width='90%'
              defaultLanguage='json'
              value={JSON.stringify(getProperty(record, 'RecordSelectorFunc'), null, ' ')}
              options={{
                wordWrap: 'on',
                readOnly: true,
              }}
            />
          </div>
          : <></>
          }
          </>
        );
      }
    }
  }

  private renderProcessingState() {
    const { processWorkflowFormReducer, workflowEngineReducer } = this.props;

    if (processWorkflowFormReducer.workflowId) {
      const processingState = workflowEngineReducer.processingStates[processWorkflowFormReducer.workflowId];
      if (!processingState) return;

      return (
        <>
        <Spin spinning={processingState.isProcessing}>
          <h3>Processing</h3>
          <h4>Last run:</h4>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography.Text style={{ marginLeft: 30 }}>Started: {dayjs(processingState.lastRunStartAt).toISOString()}</Typography.Text>
            <Typography.Text style={{ marginLeft: 30 }}>Finished: {dayjs(processingState.lastRunFinishAt).toISOString()}</Typography.Text>
          </div>
          <h4>Input:</h4>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography.Text style={{ marginLeft: 30 }}>Records Ids: {processingState.recordIds?.join(', ')}</Typography.Text>
          </div>
          { processingState.isProcessing ?
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
            <Typography.Text style={{ fontStyle: 'italic', fontSize: 16 }}>Executing...</Typography.Text>
          </div>
          :
          <>
          <h4>Results:</h4>
          {this.renderWorkflowResults(processingState.results, processingState.error)}
          </>
          }
        </Spin>
        </>
      );
    }
  }

  private renderWorkflowResults(
    results: { 
      results: { 
        records: DbRecordEntityTransform[], 
        allResults: any[], 
      },
      trace: any, 
    },
    error: any,
  ) {

    if (!results && !error) return;

    if (error) {
      const renderObject = {
        ...error,
        message: error.message,
        stack: error.stack,
      };
      return (
        <>
        <Typography.Paragraph strong style={{ color: 'red' }}>Error!</Typography.Paragraph>
        <Editor
          height='40vh'
          width='90%'
          defaultLanguage='json'
          value={JSON.stringify(renderObject, null, ' ')}
          options={{
            wordWrap: 'on',
            readOnly: true,
          }}
        />
        </>
      );

    } else if (results?.results) {
      const renderObject = {
        recordsCount: results.results?.records?.length ?? 0,
        allResults: results.results?.allResults,
      }

      return (
        <>
        <Editor
          height='40vh'
          width='90%'
          defaultLanguage='json'
          value={JSON.stringify(renderObject, null, ' ')}
          options={{
            wordWrap: 'on',
            readOnly: true,
          }}
        />
        { results.trace ?
        <>
        <h4>Trace:</h4>
        <Editor
          height='40vh'
          width='90%'
          defaultLanguage='json'
          value={JSON.stringify(results.trace, null, ' ')}
          options={{
            wordWrap: 'on',
            readOnly: true,
          }}
        />
        </>
        : '' }
        </>
      );
    }
  }

  render() {
    const { processWorkflowFormReducer, workflowEngineReducer } = this.props;

    return (
    <div>
      <Drawer
        width={900}
        title='Process Workflow'
        visible={processWorkflowFormReducer.isVisible}
        onClose={() => this.handleClose()}
        destroyOnClose
      >
        <Spin spinning={false}>
          <Form
            ref={this.formRef}
            layout='inline'
          >
            <Col>

              <Row>
                <Col span={24}>
                  <h3>Select record</h3>
                </Col>
              </Row>

              <Row style={{ marginTop: 10 }}>
                <Col span={12}>
                  <Form.Item
                    name='recordId'
                    label='Record Id'
                    style={{ width: '100%' }}
                    initialValue={processWorkflowFormReducer.recordId}
                  >
                    <Input
                      placeholder='record id'
                      disabled={!processWorkflowFormReducer.canChangeRecord}
                      onChange={(e) => this.handleRecordIdChange(e.target.value)}
                    />
                  </Form.Item>
                </Col>

                <Col span={12} style={{ textAlign: 'right' }}>
                  <Tooltip
                    title={
                      !processWorkflowFormReducer.workflowId 
                      ? 'Please select the workflow'
                      : ''
                    }
                  >
                    <Button
                      type='default'
                      size='large'
                      htmlType='submit'
                      style={{ marginBottom: 3 }}
                      disabled={
                        !processWorkflowFormReducer.workflowId
                        || workflowEngineReducer.processingStates[processWorkflowFormReducer.workflowId]?.isProcessing
                      }
                      onClick={() => this.handleProcess(true)}
                    >Simulate</Button>

                    <Button
                      type='primary'
                      size='large'
                      htmlType='submit'
                      style={{ marginBottom: 3 }}
                      disabled={
                        !processWorkflowFormReducer.workflowId
                        || workflowEngineReducer.processingStates[processWorkflowFormReducer.workflowId]?.isProcessing
                      }
                      onClick={() => this.handleProcess(false)}
                    >Process</Button>
                  </Tooltip>
                </Col>
              </Row>

              <Row>
                <Col span={24}>
                  <Divider style={{ marginTop: 7, marginBottom: 10 }}/>
                  <h3>Select workflow</h3>
                </Col>
              </Row>

              <Row style={{ marginTop: 10 }}>
                <Col span={12}>
                  <Form.Item
                    name='moduleName'
                    label='Module Name'
                    style={{ width: '100%' }}
                    initialValue={processWorkflowFormReducer.moduleName}
                  >
                    <Select
                      disabled={!processWorkflowFormReducer.canChangeWorkflow}
                      allowClear
                      onChange={(val: string) => this.handleModuleNameChange(val)}
                    >
                      {this.renderModuleNames()}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12} style={{ paddingLeft: 10 }}>
                  <Form.Item
                    name='entityName'
                    label='Entity Name'
                    style={{ width: '100%' }}
                    initialValue={processWorkflowFormReducer.entityName}
                  >
                    <Select
                      disabled={!processWorkflowFormReducer.canChangeWorkflow}
                      allowClear
                      onChange={(val: string) => this.handleEntityNameChange(val)}
                    >
                      {this.renderEntityNames()}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginTop: 7 }}>
                <Col span={12}>
                  <Form.Item
                    name='triggerType'
                    label='Trigger Type'
                    style={{ width: '100%' }}
                    initialValue={processWorkflowFormReducer.triggerType}
                  >
                    <Select
                      disabled={!processWorkflowFormReducer.canChangeWorkflow}
                      onChange={(val: string) => this.handleTriggerTypeChange(val)}
                    >
                      { Object.keys(WTriggerTypeEnum).map(item => 
                        <Select.Option value={item} key={item}>{item}</Select.Option>
                      ) }
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12} style={{ paddingLeft: 10 }}>
                  <Form.Item
                    name='triggerEntityEvents'
                    label='Entity Events'
                    style={{ width: '100%' }}
                    initialValue={processWorkflowFormReducer.triggerEntityEvents}
                  >
                    <Select
                      mode='tags'
                      disabled={!processWorkflowFormReducer.canChangeWorkflow 
                        || processWorkflowFormReducer.triggerType !== WTriggerTypeEnum.ENTITY_EVENT
                      }
                      onChange={(vals: string[]) => this.handleTriggerEntityEventsChange(vals)}
                    >
                      { Object.keys(WTriggerEntityEventEnum).map(item => 
                        <Select.Option value={item} key={item}>{item}</Select.Option>
                      ) }
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row style={{ marginTop: 7 }}>
                <Col span={24}>
                  <Form.Item
                    name='isActive'
                    label='Is Active'
                  >
                    <Checkbox
                      disabled={!processWorkflowFormReducer.canChangeWorkflow}
                      onChange={(e) => this.handleIsActiveChange(e.target.checked)}
                      checked={processWorkflowFormReducer.isActive}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row>
                <Col span={24}>
                  <Divider style={{ marginTop: 7, marginBottom: 10 }}/>
                </Col>
              </Row>

              <Row>
                <Col span={24}>
                  {this.renderWorkflows()}
                </Col>
              </Row>

              { processWorkflowFormReducer.workflowId ? 
              <Row>
                <Col span={24}>
                  {this.renderSelectedWorkflow()}
                </Col>
              </Row>
              : <></> }

              { processWorkflowFormReducer.workflowId && workflowEngineReducer.processingStates[processWorkflowFormReducer.workflowId] ? 
              <Row>
                <Col span={24}>
                  <Divider style={{ marginTop: 7, marginBottom: 10 }}/>
                  {this.renderProcessingState()}
                </Col>
              </Row>
              : <></> }

            </Col>
          </Form>
        </Spin>
      </Drawer>
    </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  workflowEngineReducer: state.workflowEngineReducer,
  processWorkflowFormReducer: state.processWorkflowFormReducer,
});

const mapDispatch = (dispatch: any) => ({
  listSchemas: () => dispatch(listSchemasRequest()),
  updateFormState: (params: any) => dispatch(updateProcessWorkflowFormState(params)),
  closeForm: () => dispatch(closeProcessWorkflowForm()),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  searchWorkflows: (params?: WQueryParams, cb?: (resp: any) => void) => dispatch(searchWorkflowsRequest(params, cb)),
  getWorkflowById: (params: { id: string }, cb?: (workflow: DbRecordEntityTransform) => void) => dispatch(getWorkflowByIdRequest(params, cb)),
  processWorkflow: (params: IProcessWorkflowParams, cb?: (resp: any) => void) => dispatch(processWorkflowRequest(params, cb)),
});

export default connect(mapState, mapDispatch)(ProcessWorkflow);