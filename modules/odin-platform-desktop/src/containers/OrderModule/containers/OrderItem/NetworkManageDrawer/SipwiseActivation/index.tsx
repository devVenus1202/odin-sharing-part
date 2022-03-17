import { DeleteOutlined } from '@ant-design/icons';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Card, Modal, Popconfirm, Spin, Table } from 'antd';
import Button from 'antd/es/button';
import React from 'react';
import { connect } from 'react-redux';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../../../../core/schemas/store/reducer';
import { WorkflowReducer } from '../../../../../../core/workflow/store/reducer';
import { httpPost } from '../../../../../../shared/http/requests';
import { displayMessage } from '../../../../../../shared/system/messages/store/reducers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../../shared/utilities/schemaHelpers';
import SipwiseDetail from '../../../../../CrmModule/containers/ContactIdentity/Sipwise';
import { parseDateToLocalFormat } from '../../../../../../shared/utilities/dateHelpers';
import { deleteRecordByIdRequest } from '../../../../../../core/records/store/actions';
import { IServiceReducer } from '../../../../../../core/service/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../../core/schemas/store/actions';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
interface Props {
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  workflowReducer: WorkflowReducer,
  serviceReducer: IServiceReducer,
  getAssociations: any,
  alertMessage: any,
  record: DbRecordEntityTransform,
  deleteRecord: (payload: any, cb: any) => any,
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => {}
}

interface State {
  showModal: boolean,
  isInitializing: boolean,
  isLoading: boolean,
  data: any | undefined,
  contactIdentityRecord: DbRecordEntityTransform | undefined,
  setupSipwiseOkButtonText: string
}

const { ORDER_MODULE, CRM_MODULE } = SchemaModuleTypeEnums;
const { ORDER } = SchemaModuleEntityTypeEnums;

class SipwiseActivationCard extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
    // this.getInitialData()
  }

  getInitialData() {
    const { schemaReducer, getSchema } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, 'ContactIdentity');
    if(!schema) {
      getSchema({ moduleName: CRM_MODULE, entityName: 'ContactIdentity' }, (schema: SchemaEntity) => {
        this.getSipwiseAssociationRecord(schema);
      });
    } else {
      this.getSipwiseAssociationRecord();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (prevProps.workflowReducer.NetworkManage?.networkManageDrawerVisible !== this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
      if (this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
        this.getInitialData();
      } else if (!this.props.workflowReducer.NetworkManage?.networkManageDrawerVisible) {
        this.getInitialState();
      }
    }
  }

  getInitialState = () => ({
    showModal: false,
    isInitializing: false,
    isLoading: false,
    data: undefined,
    contactIdentityRecord: undefined,
    setupSipwiseOkButtonText: "Submit"
  })

  initializeModal() {
    const { getAssociations, schemaReducer, workflowReducer } = this.props;

    this.setState({
      showModal: true,
      isInitializing: true,
      data: undefined
    });

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, ORDER_MODULE, ORDER)

    getAssociations({
      recordId: workflowReducer.NetworkManage?.record?.id,
      key: ORDER,
      schema: schema,
      entities: [ ORDER ],
    }, (res: any) => {
      this.setState({
        isInitializing: false,
      });
    });
  }

  handleCancel = () => {
    if(this.state.setupSipwiseOkButtonText === 'Ok') {
      this.getSipwiseAssociationRecord();
      this.setState({
        setupSipwiseOkButtonText: "Submit",
        showModal: false,
        isLoading: false,
      })
    } else {
      this.setState(this.getInitialState());
    }
  };

  handleOk = async () => {
    const { recordAssociationReducer, alertMessage, workflowReducer } = this.props;
    if(this.state.setupSipwiseOkButtonText === 'Ok') {
      this.getSipwiseAssociationRecord();
      this.setState({
        setupSipwiseOkButtonText: "Submit",
        showModal: false,
        isLoading: false,
      })
    } else {
      // get the orderItem Order
      const associationKey = `${workflowReducer.NetworkManage?.record?.id}_Order`;
      const associationObj: any = recordAssociationReducer.shortList[associationKey];
      const orderRecords = associationObj[ORDER].dbRecords;

      if(orderRecords) {

        this.setState({
          isLoading: true,
        });

        await httpPost(
          `ServiceModule/v1.0/voice/sipwise/flows/${orderRecords[0].id}/setup`,
          {},
        ).then(res => {
          alertMessage({ body: 'sipwise customer setup successfully', type: 'success' });
          this.setState({
            isLoading: false,
            data: res.data.data,
            setupSipwiseOkButtonText: "Ok"
          })
        }).catch(err => {
          this.setState({
            showModal: false,
            isLoading: false,
          });
          const error = err.response ? err.response.data : undefined;
          alertMessage({ body: error && error.message || 'error processing your request', type: 'error' });
        });
      }
    }
  };

  renderContactIdentityTable() {
    const columns = [
      { 
        title: 'Title',
        key: 'title', 
        dataIndex: 'title'
      },
      {
        title: 'External Id', 
        dataIndex: 'ExternalId',
        key: 'ExternalId',
        render: (text: any, record: any) => (
          record?.properties?.ExternalId
        ),
      },
      { 
        title: 'Created At',
        key: 'createdAt', 
        dataIndex: 'createdAt',
        render: (text: string | undefined) => (parseDateToLocalFormat(text)),
      },
      {
        title: '',
        dataIndex: 'operation',
        render: (text: any, record: any) => (
          record !== undefined ? 
          <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record)}>
            <DeleteOutlined/>
          </Popconfirm> : <></>
        ),
      },
    ]
    return (
      <div className="association-data-table-wrapper">
        <Card
          className="association-table-card"
          title={'Contact Identity'}>
          <Table
            size="small"
            tableLayout="auto"
            pagination={false}
            dataSource={[this.state.contactIdentityRecord as DbRecordEntityTransform]}
            columns={columns}
          />
        </Card>
      </div>
    )
  }

  handleDelete(phoneRecord: DbRecordEntityTransform) {
    const { deleteRecord, schemaReducer, serviceReducer, alertMessage } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, 'ContactIdentity');
    if(this.state.contactIdentityRecord && serviceReducer.list[this.state.contactIdentityRecord?.id]) {
      alertMessage({ body: 'Terminate customer and cancel it in order to delete SIPWISE', type: 'error' });
      return;
    }
    deleteRecord({
      schema: schema,
      recordId: phoneRecord?.id ? phoneRecord?.id : null,
    }, () => {
      this.getSipwiseAssociationRecord();
      this.setState({
        isInitializing: false,
      })
    });
  }

  getSipwiseAssociationRecord(schema?: SchemaEntity) {
    const { getAssociations, record, schemaReducer } = this.props;
    const contactIdentitySchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, 'ContactIdentity');
    
    getAssociations({
      recordId: record?.id,
      key: ORDER,
      schema: schema ? schema : contactIdentitySchema,
      entities: [ 'ContactIdentity' ],
    }, (res: any) => {
      if(res.results.ContactIdentity.dbRecords) {
        this.setState({
          contactIdentityRecord: res.results.ContactIdentity.dbRecords[0],
        })
      } else {
        this.setState({
          contactIdentityRecord: undefined,
        })
      }
    });
  }


  render() {
    const { workflowReducer } = this.props;
    return(
      <>
        <Modal
          title="Setup Sipwise Request"
          visible={this.state.showModal}
          onOk={() => this.handleOk()}
          onCancel={() => this.handleCancel()}
          maskClosable={false}
          confirmLoading={this.state.isLoading || this.state.isInitializing}
          okText={this.state.setupSipwiseOkButtonText}
          cancelText="Cancel"
        >

          {this.state.isInitializing ? <Spin spinning={this.state.isLoading}>initializing...</Spin> :
            <div>
              <p>{'Please confirm you would like to Setup a sipwsie profile for the customer'}</p>
              <ol>
                <li>Create Customer Contact</li>
                <li>Create Customer</li>
                <li>Create Subscriber</li>
              </ol>
              <p>Item: {workflowReducer.NetworkManage?.record?.title}</p>

              {this.state.isLoading ?
                <Spin spinning={this.state.isLoading}>
                  setting up profile...
                </Spin>
                : (
                  <div>
                    <code>
                      <pre style={{ overflow: 'auto', maxHeight: 400 }}>{JSON.stringify(this.state.data, null, 2)}</pre>
                    </code>
                  </div>
                )}
            </div>
          }
        </Modal>
        <Card 
          title="Sipwise Activation"
          extra={
            <>
              <Button 
                type='primary'
                ghost 
                onClick={() => this.initializeModal()}
                disabled={!workflowReducer.NetworkManage?.phoneRecord || !!this.state.contactIdentityRecord}
              >
                Setup Sipwise
              </Button>
              <Button
                style={{marginLeft: '.5rem'}}
                type='primary'
                disabled={true}
              >
                Cancel Sipwise
              </Button>
            </>
          }
        >
          { this.renderContactIdentityTable() }
          { this.state.contactIdentityRecord ? <SipwiseDetail record={this.state.contactIdentityRecord as DbRecordEntityTransform} /> : <></> }
        </Card>
      </>
    )
  }
  
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  workflowReducer: state.workflowReducer,
  serviceReducer: state.serviceReducer
});

const mapDispatch = (dispatch: any) => ({
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  deleteRecord: (payload: any, cb: any) => dispatch(deleteRecordByIdRequest(payload, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(SipwiseActivationCard);

