import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Card, Col, Layout, Modal, Row, Tabs } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import EmbeddedForm from '../../../../../../core/records/components/Forms/EmbeddedForm';
import { v4 as uuidv4 } from 'uuid';
import { SchemaReducerState } from '../../../../../../core/schemas/store/reducer';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../../shared/utilities/schemaHelpers';
import { WorkflowReducer } from '../../../../../../core/workflow/store/reducer';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../../../../core/recordsAssociations/store/actions';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { INetworkManageWorkflow, updateNetworkManageWorkflow } from '../../../../../../core/workflow/store/actions';
import RecordProperties from '../../../../../../core/records/components/DetailView/RecordProperties';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import MagraPhonOrderDetails from '../../../../../ServiceModule/CustomerPhonePorting/Detail/MagraPhoneOrderDetails';
import { httpPost } from '../../../../../../shared/http/requests';
import { displayMessage } from '../../../../../../shared/system/messages/store/reducers';
import { FormReducer } from '../../../../../../core/records/components/Forms/store/reducer';
import { createRecordsRequest, deleteRecordByIdRequest } from '../../../../../../core/records/store/actions';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../../core/schemas/store/actions';

interface Props {
  schemaReducer: SchemaReducerState,
  workflowReducer: WorkflowReducer,
  recordFormReducer: FormReducer
  getAssociations: (params: IGetRecordAssociations, cb: any) => void,
  updateNetworkManage: (params: INetworkManageWorkflow) => void,
  alertMessage: any,
  createRecord: (payload: any, cb: any) => void,
  deleteRecord: (payload: any, cb: any) => void,
  getSchema: (payload: ISchemaByModuleAndEntity) => void
}
interface State {
  showModal: boolean,
  isLoading: boolean,
  data: any | undefined,
  createNewLoading: boolean,
  confirmDeleteRecord: boolean
}

const { SERVICE_MODULE, ORDER_MODULE } = SchemaModuleTypeEnums;
const { ORDER_ITEM } = SchemaModuleEntityTypeEnums;

const uuid = uuidv4();

const { TabPane } = Tabs;
class PhonePortingCard extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
    this.getInitialData();
  }

  getInitialData() {
    const { schemaReducer, getSchema } = this.props;
    const phonePortingSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, SERVICE_MODULE, 'CustomerPhonePorting');
    if (!phonePortingSchema) {
      getSchema({ moduleName: SERVICE_MODULE, entityName: 'CustomerPhonePorting' })
    }
  }

  getInitialState = () => ({
    showModal: false,
    isLoading: false,
    data: undefined,
    createNewLoading: false,
    confirmDeleteRecord: false
  })

  componentDidMount() {
    this.loadPhonePortingData();
  }


  componentDidUpdate(prevProps: Readonly<Props>) {
    if (prevProps.workflowReducer.NetworkManage?.networkManageDrawerVisible !== this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
      if (this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
        this.loadPhonePortingData();
      } else if (!this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
        this.destroyPhonePortingDataOnClose()
      }
    }
  }

  loadPhonePortingData(){
    const { workflowReducer, getAssociations, schemaReducer, updateNetworkManage } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, ORDER_MODULE, ORDER_ITEM);
    getAssociations({
      recordId: workflowReducer.NetworkManage?.record?.id,
      key: ORDER_ITEM,
      schema: schema as SchemaEntity,
      entities: [ 'CustomerPhonePorting' ],
    }, (res: any) => {
      if (res.results?.CustomerPhonePorting?.dbRecords) {
        updateNetworkManage({
          phoneRecord: res.results.CustomerPhonePorting.dbRecords[0]
        })
      } else {
        updateNetworkManage({
          phoneRecord: undefined
        })
      }
    })
  }

  handleOk = async () => {
    const { workflowReducer, alertMessage } = this.props;

    const record = workflowReducer.NetworkManage?.phoneRecord as DbRecordEntityTransform;

    this.setState({
      isLoading: true,
    });

    await httpPost(
      `ServiceModule/v1.0/voice/magra/order/${record.id}`,
      {},
    ).then(res => {
      alertMessage({ body: 'successful', type: 'success' });
      this.setState({
        showModal: false,
        isLoading: false,
        data: res.data.data,
      });

    }).catch(err => {

      const error = err.response ? err.response.data : undefined;
      alertMessage({ body: error && error.message || 'error processing your request', type: 'error' });
      this.setState({
        showModal: false,
        isLoading: false,
      })
    });
  };

  handleCancel = () => {
    this.setState(this.getInitialState());
  };

  destroyPhonePortingDataOnClose() {
    const { updateNetworkManage } = this.props;
    updateNetworkManage({
      phoneRecord: undefined
    });
    this.handleCancel();
  }

  renderPhoneRecordData() {
    const { workflowReducer } = this.props;
    const record = workflowReducer.NetworkManage?.phoneRecord as DbRecordEntityTransform;

    return (
      <Layout className='record-detail-view'>
        <Modal
          title="Porting Request"
          visible={this.state.showModal}
          onOk={() => this.handleOk()}
          onCancel={() => this.handleCancel()}
          confirmLoading={this.state.isLoading}
          okText="Submit"
          cancelText="Cancel"
        >
          <p>{'Please confirm you would like to submit a porting request to Magrathea'}</p>
        </Modal>
        <Row gutter={12} className="record-main-content-row">
          <Col span={24}>
            <Col span={24}>
              <Card style={{ marginBottom: 10 }}>
                <RecordProperties columns={5} record={record}/>
              </Card>
            </Col>

            <Col span={24}>
              <Card>
                <Tabs defaultActiveKey={'#tab1_MagraOrders'}>
                  <TabPane tab="Magra Orders" key={`#tab1_MagraOrders`}>
                    { getProperty(record, 'MagraOrderId') ? <MagraPhonOrderDetails record={record}/> : <></>}
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </Col>
        </Row>
      </Layout>
    )
  }

  saveNewPhoneDevice() {
    const { recordFormReducer, workflowReducer, schemaReducer, createRecord } = this.props;
    
    if (recordFormReducer.modified[0]) {
      this.setState({
        createNewLoading: true
      });
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, SERVICE_MODULE, 'CustomerPhonePorting');
      let modified: any = []
      modified = recordFormReducer.modified;
      modified[0].associations = [
        { recordId: workflowReducer.NetworkManage?.record?.id },
      ]
      createRecord({
        schema: schema,
        upsert: recordFormReducer.upsert,
        createUpdate: modified,
      }, (res: DbRecordEntityTransform) => {
        this.loadPhonePortingData();
        this.setState({
          createNewLoading: false
        })
      });               
    }

  }

  deletePhoneDevice() {
    const { workflowReducer, schemaReducer, deleteRecord } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, SERVICE_MODULE, 'CustomerPhonePorting');
    this.setState({ confirmDeleteRecord: true });
    deleteRecord({
      schema: schema,
      recordId: !!workflowReducer.NetworkManage?.phoneRecord?.id ? workflowReducer.NetworkManage?.phoneRecord?.id : null,
    }, () => {
      this.setState({ confirmDeleteRecord: false });
      this.loadPhonePortingData();
    });
  }


  render() {
    const { schemaReducer, workflowReducer } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, SERVICE_MODULE, 'CustomerPhonePorting');
    return(
      <Card 
        title="Phone Porting"
        style={{ 
          marginBottom: '.5rem',
          marginTop: '.5rem'
        }}
        extra={
          <>
            <Button
              type='primary'
              disabled={!!workflowReducer.NetworkManage?.phoneRecord}
              onClick={() => this.saveNewPhoneDevice()}
              loading={this.state.createNewLoading}
            >
              Create New Device
            </Button>
            <Button
              style={{marginLeft: '.5rem'}}
              danger
              disabled={!workflowReducer.NetworkManage?.phoneRecord}
              onClick={() => this.deletePhoneDevice()}
              loading={this.state.confirmDeleteRecord}
            >
              Delete Device
            </Button>
            <Button
              style={{marginLeft: '.5rem'}}
              type='primary'
              disabled={!workflowReducer.NetworkManage?.phoneRecord}
              onClick={() => this.setState({ showModal: true })}
            >
              Submit Order
            </Button>
          </>
        }
      >
        { workflowReducer.NetworkManage?.phoneRecord ? 
            this.renderPhoneRecordData() :  
            <EmbeddedForm
              isCreateRecord 
              moduleName={SERVICE_MODULE} 
              entityName={'CustomerPhonePorting'} 
              formUUID={uuid} 
              schema={schema}
              recordFieldsDisabled
              />
        }
      </Card>
    )
  }
  
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  workflowReducer: state.workflowReducer,
  recordFormReducer: state.recordFormReducer
});

const mapDispatch = (dispatch: any) => ({
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  updateNetworkManage: (params: INetworkManageWorkflow) => dispatch(updateNetworkManageWorkflow(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  createRecord: (params: any, cb: any) => dispatch(createRecordsRequest(params, cb)),
  deleteRecord: (payload: any, cb: any) => dispatch(deleteRecordByIdRequest(payload, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(payload)),
});


export default connect(mapState, mapDispatch)(PhonePortingCard);

