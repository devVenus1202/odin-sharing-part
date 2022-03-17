import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { PipelineEntity } from '@d19n/models/dist/schema-manager/pipeline/pipeline.entity';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Modal, Radio } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import CreateOrderFromLead from '../../../../containers/OrderModule/containers/Order/CreateOrderFromLead';
import history from '../../../../shared/utilities/browserHisory';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { listUsers } from '../../../identity/store/actions';
import {
  getPipelineByStageIdRequest,
  getPipelinesByModuleAndEntity,
  IPipelineByStageId,
} from '../../../pipelines/store/actions';
import { PipelineReducerState } from '../../../pipelines/store/reducer';
import { IRecordAssociationsReducer } from '../../../recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { createOrderFromLeadVisible } from '../../../workflow/store/actions';
import { getRecordByIdRequest, IGetRecordById } from '../../store/actions';
import { UPDATE_DB_RECORD_BY_ID_REQUEST } from '../../store/constants';
import { IRecordReducer } from '../../store/reducer';
import { InputChangeParams } from '../Forms/FormFields';
import OdinFormModal, { Props as OdinFormModalProps } from '../Forms/FormModal';
import { initializeRecordForm } from '../Forms/store/actions';
import { renderDisabledFields } from './disableFields';
import { renderVisibleFormFields } from './filterVisibleFields';

interface Props {
  recordReducer: IRecordReducer;
  pipelineReducer: PipelineReducerState;
  schemaReducer: SchemaReducerState;
  className: string;
  record: DbRecordEntityTransform;
  initializeForm: any,
  getPipeline: any,
  getRecord: any,
  getPipelines: any,
  getUsers: any,
  redirectRules?: { [key: string]: { redirectUrl: string, redirectMessage?: string, } },
  stageKey?: string,
  overrideInitializeFormOnFail?: (elem: PipelineStageEntity) => any,
  createOrderFromLeadVisible: any,
  recordAssociationReducer: IRecordAssociationsReducer,
  updateFormAdditionalInputChangeHandler?: (updateFormProps: OdinFormModalProps, params: InputChangeParams) => void
}

interface State {
  pipeline: PipelineEntity | undefined,
  confirmRouteChange: boolean,
  redirectUrl: string,
  redirectMessage: string | undefined
}

const uuid = uuidv4();

const { ADDRESS, CONTACT } = SchemaModuleEntityTypeEnums;

class Pipeline extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      pipeline: undefined,
      confirmRouteChange: false,
      redirectUrl: '',
      redirectMessage: undefined,
    }
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
    if(prevProps.recordReducer.isRequesting !== this.props.recordReducer.isRequesting) {
      this.fetchData();
    }
  }

  private fetchData() {
    const { record, getPipeline, schemaReducer, pipelineReducer } = this.props;
    if(record && !pipelineReducer.isRequesting) {
      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
      if(record && record.stage) {
        getPipeline({ schema, stageId: record.stage.id }, (res: PipelineEntity) => {
          this.setState({
            pipeline: res,
          });
        });
      }
    }
  }

  private configurePipelineState(elem: PipelineStageEntity) {
    const { record } = this.props;

    if(record && record.stage ? record.stage.id === elem.id : false) {
      return 'current-stage';
    } else if(record && record.stage && record.stage.position > elem.position) {
      return 'past-stage';
    }
  }

  private handleStageSelected(elem: PipelineStageEntity) {
    const {
      record,
      schemaReducer,
      getUsers,
      getPipelines,
      overrideInitializeFormOnFail,
      createOrderFromLeadVisible
    } = this.props;

    if(record) {

      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

      if(!!record && schema) {

        if(overrideInitializeFormOnFail && elem.isFail) {
          return overrideInitializeFormOnFail(elem)
        }

        getUsers();
        getPipelines({ schema: schema });

        if(elem?.name === 'Won' && record?.entity === 'CrmModule:Lead') {
          // initialize Order checkout from Lead
          createOrderFromLeadVisible();
          // initialize Pipeline change form, but hide the modal in order
          // to extract data needed for Pipeline change to Won after Order is created
          this.initializePipelineChangeForm(schema, elem, false);
        } else {
          // initialize Pipeline change form
          this.initializePipelineChangeForm(schema, elem, true)
        }
      }
    }
  };

  private initializePipelineChangeForm(schema: SchemaEntity, elem: PipelineStageEntity, isModalVisible: boolean) {
    const { initializeForm, record, updateFormAdditionalInputChangeHandler } = this.props;

    initializeForm({
      formUUID: uuid,
      title: `Update ${schema.entityName}`,
      showFormModal: isModalVisible,
      isUpdateReq: true,
      schema: schema,
      selected: record,
      sections: [ { name: schema.name, schema: schema } ],
      visibleFieldOverride: renderVisibleFormFields(elem),
      disabledFields: renderDisabledFields(elem),
      additionalInputChangeHandler: updateFormAdditionalInputChangeHandler,
      nextStageId: elem.id,
      modified: [
        {
          entity: `${schema.moduleName}:${schema.entityName}`,
          schemaId: schema.id,
          stageId: elem.id,
        },
      ],
    });
  }

  private handleFormSubmit(params: { event: string, results: any }) {
    const { getRecord, record, schemaReducer, redirectRules } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    switch (params.event) {
      case UPDATE_DB_RECORD_BY_ID_REQUEST:

        if(redirectRules && params.results && redirectRules[params.results.stage.key]) {

          const redirectUrl = redirectRules[params.results.stage.key]['redirectUrl'];
          const redirectMessage = redirectRules[params.results.stage.key]['redirectMessage'];
          this.setState({
            confirmRouteChange: true,
            redirectUrl,
            redirectMessage,
          });

        } else {
          getRecord({ schema, recordId: params.results.id });
        }
    }
  }

  private sortColumns(stage1: PipelineStageEntity, stage2: PipelineStageEntity) {
    if(stage1.position && stage2.position) {
      return stage1.position - stage2.position;
    } else {
      return 0;
    }
  };

  renderDisabledState(record: DbRecordEntityTransform, elem: PipelineStageEntity) {
    const { recordAssociationReducer } = this.props;
    if(elem?.name === 'Won' && record?.entity === 'CrmModule:Lead') {
      const associationKeyAddress = `${record?.id}_${ADDRESS}`;
      const associationObjAddress: any = recordAssociationReducer.shortList[associationKeyAddress];
      const addressRecord = associationObjAddress?.[ADDRESS].dbRecords?.[0];
      const associationKeyContact = `${record?.id}_${CONTACT}`;
      const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
      const addrSalesStatus = getProperty(addressRecord, 'SalesStatus');
      if(![
        'ORDER',
        'PRE_ORDER',
      ].includes(addrSalesStatus) || record.stage?.name === 'Won' || !associationObjContact?.[CONTACT].dbRecords) {
        return true
      } else {
        // enable edit on cancelled record
        // return record?.stage?.isFail
        return false
      }
    } else {
      // enable edit on cancelled record
      // return record?.stage?.isFail
      return false
    }
  }

  render() {
    const { className, record } = this.props;
    const { pipeline, confirmRouteChange, redirectUrl, redirectMessage } = this.state;
    return (
      <>
        <CreateOrderFromLead record={record}/>
        {/*Confirm redirecting */}
        <Modal
          title="Redirect Confirmation"
          visible={confirmRouteChange}
          onOk={() => history.push(redirectUrl)}
          onCancel={() => this.setState({ confirmRouteChange: false, redirectUrl: '' })}
          okText="Yes"
          cancelText="No"
        >
          <p>{redirectMessage || 'You are about to be redirected to a new page,would you would like to proceed?'}</p>
        </Modal>

        <div className={`pipeline-wrapper ` + className}>
          <OdinFormModal formUUID={uuid}
                         onSubmitEvent={(params: { event: string, results: any }) => this.handleFormSubmit(params)}/>
          <Radio.Group value="medium">
            {pipeline && pipeline.stages ? pipeline.stages.sort((
              stage1: PipelineStageEntity,
              stage2: PipelineStageEntity,
            ) => this.sortColumns(
              stage1,
              stage2,
            )).map((elem: PipelineStageEntity) => (
              <Radio.Button
                disabled={this.renderDisabledState(record, elem)}
                className={this.configurePipelineState(elem)}
                onClick={(e) => this.handleStageSelected(elem)}
                value={elem.id}
              >{elem.name}</Radio.Button>
            )) : (
              <Radio.Button value="#">No data</Radio.Button>
            )}
          </Radio.Group>
        </div>
      </>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  pipelineReducer: state.pipelineReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
  getUsers: (cb: any) => dispatch(listUsers(cb)),
  initializeForm: (params: any) => dispatch(initializeRecordForm(params)),
  getPipeline: (params: IPipelineByStageId, cb: any) => dispatch(getPipelineByStageIdRequest(params, cb)),
  getRecord: (payload: IGetRecordById) => dispatch(getRecordByIdRequest(payload)),
  createOrderFromLeadVisible: () => dispatch(createOrderFromLeadVisible()),
});

export default connect(mapState, mapDispatch)(Pipeline);

