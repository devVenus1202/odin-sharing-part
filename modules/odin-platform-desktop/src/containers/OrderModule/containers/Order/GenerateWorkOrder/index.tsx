import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Checkbox, List, Modal, Select } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { canUserCreateRecord } from '../../../../../shared/permissions/rbacRules';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';

const { Option } = Select;

const { FIELD_SERVICE_MODULE, ORDER_MODULE } = SchemaModuleTypeEnums;
const { WORK_ORDER, ORDER_ITEM, ADDRESS } = SchemaModuleEntityTypeEnums;

interface Props {
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  hidden?: string[],
  getAssociations: any,
  alertMessage: any,
  getSchema: any,
  userReducer: any
}

class GenerateWorkOrder extends React.Component<Props> {
  state = { visible: false, isLoading: false, type: 'INSTALL', subType: '', serviceCallReason: undefined, selected: [] };

  showModal = () => {
    this.setState({
      visible: true,
      isLoading: false,
      selected: [],
      type: 'INSTALL',
      subType: '',
      serviceCallReason: undefined,
    });
    this.getOrderItems();
  };

  addRemoveItem = (item: DbRecordEntityTransform) => {
    if (this.state.selected.find(elem => elem === item.id)) {
      // remove the item
      this.setState({
        selected: this.state.selected.filter(elem => elem !== item.id),
      });
    } else {
      this.setState(prevState => ({
        // @ts-ignore
        selected: [ ...prevState.selected, ...[ item.id ] ],
      }));
    }
  };


  handleOk = async (e: any) => {
    const { schemaReducer, record, alertMessage } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, FIELD_SERVICE_MODULE, WORK_ORDER);

    if (this.state.selected && this.state.selected.length < 1) {
      alertMessage({ body: 'please select items for the work order', type: 'error' });
      return;
    }

    this.setState({
      isLoading: true,
    });

    if (record && schema) {

      const orderItems = this.state.selected.map(elem => ({
        recordId: elem,
      }));

      await httpPost(
        `${FIELD_SERVICE_MODULE}/v1.0/${WORK_ORDER}/order/${record.id}`,
        {
          properties: {
            Type: this.state.type,
            SubType: this.state.subType,
            ServiceCallReason: this.state.serviceCallReason,
          },
          orderItems,
        },
      ).then(res => {

        this.getRecordAssociations();
        alertMessage({ body: 'work order successfully created', type: 'success' });

      }).catch(err => {
        const error = err.response ? err.response.data : undefined;
        alertMessage({ body: error && error.message || 'error generating work order', type: 'error' });
      });

      this.setState({
        visible: false,
        isLoading: false,
        selected: [],
        type: 'INSTALL',
        subType: '',
      });
    }
  };

  handleCancel = (e: any) => {
    this.setState({
      visible: false,
      isLoading: false,
      selected: [],
      type: 'INSTALL',
      subType: '',
    });
  };

  private getOrderItems() {
    const { getAssociations, record, getSchema } = this.props;
    if (record) {
      getSchema({ moduleName: ORDER_MODULE, entityName: ORDER_ITEM }, (result: SchemaEntity) => {
        getAssociations({
          recordId: record.id,
          key: ORDER_ITEM,
          schema: result,
          entities: [ ORDER_ITEM ],
        });
      });
    }
    return;
  }

  private getRecordAssociations() {
    const { getAssociations, record, getSchema } = this.props;
    if (record) {
      getSchema({ moduleName: FIELD_SERVICE_MODULE, entityName: WORK_ORDER }, (result: SchemaEntity) => {
        getAssociations({
          recordId: record.id,
          key: WORK_ORDER,
          schema: result,
          entities: [ WORK_ORDER ],
        });
      });
    }
    return;
  }

  createWorkOrderButtonState() {
    const { record, recordAssociationReducer } = this.props;
    const associationKeyContact = `${record?.id}_${ADDRESS}`;
    const associationObjContact: any = recordAssociationReducer.shortList[associationKeyContact];
    const addressRecord = associationObjContact?.[ADDRESS].dbRecords?.[0];
    const addressStatus = getProperty(
      addressRecord,
      'SalesStatus',
    );
    if (addressStatus && addressStatus === 'ORDER') {
      return false;
    } else {
      return true;
    }
  }

  render() {
    const { record, recordAssociationReducer, schemaReducer, userReducer } = this.props;
    const associationKey = `${record?.id}_${ORDER_ITEM}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, FIELD_SERVICE_MODULE, WORK_ORDER);

    console.log('columns', schema?.columns)
    console.log('column', schema?.columns?.find(col => col['name'] === 'ServiceCallReason'))
    console.log('this.state', this.state);

    return (
      <div>
        <Button
          type="text"
          onClick={this.showModal}
          disabled={schema ? !canUserCreateRecord(userReducer, schema) || this.createWorkOrderButtonState() : true}
        >
          Create New
        </Button>
        <Modal
          title="New Work Order"
          visible={this.state.visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          confirmLoading={this.state.isLoading}
          okButtonProps={
            { disabled: (this.state.type === 'SERVICE' && !this.state.serviceCallReason) || this.state.selected.length < 1 }
          }
        >
          <Select
            style={{ width: '100%' }}
            defaultValue={this.state.type}
            placeholder="Select Type"
            onSelect={(val) => {
              this.setState({ type: val, serviceCallReason: undefined });
            }}
            getPopupContainer={trigger => trigger.parentNode}
          >
            <Option value="INSTALL">Install</Option>
            <Option value="SERVICE">Service</Option>
          </Select>

          {this.state.type === 'INSTALL' &&
          <Select
              style={{ width: '100%', marginTop: 16 }}
              defaultValue={this.state.subType}
              placeholder="Sub Type"
              allowClear
              onSelect={(val) => {
                this.setState({ subType: !!val ? val : null, serviceCallReason: undefined });
              }}
              getPopupContainer={trigger => trigger.parentNode}
          >
              <Option value="">Default</Option>
              <Option value="UPGRADE">Upgrade</Option>
          </Select>}

          {this.state.type === 'SERVICE' && <Select
              style={{ width: '100%', paddingTop: 16 }}
              defaultValue={this.state.serviceCallReason}
              placeholder="Select Reason"
              onSelect={(val) => {
                this.setState({ serviceCallReason: val });
              }}
              getPopupContainer={trigger => trigger.parentNode}
          >
            {schema?.columns?.find(col => col['name'] === 'ServiceCallReason')?.options?.map(opt => (
              <Option value={opt.value}>{opt.label}</Option>
            ))}
          </Select>}

          <List
            style={{ marginTop: 24 }}
            size="small"
            header={<div>Items</div>}
            bordered
            dataSource={associationObj && associationObj[ORDER_ITEM] ? associationObj[ORDER_ITEM].dbRecords : []}
            renderItem={(item: DbRecordEntityTransform) =>
              <List.Item
                actions={[
                  <Checkbox
                    checked={
                      //@ts-ignore
                      this.state.selected.includes(item.id)
                    }
                    onChange={() => this.addRemoveItem(item)}>Add</Checkbox>,
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={getProperty(item, 'Description')}
                />
                <div>{getProperty(item, 'TotalPrice')}</div>
              </List.Item>
            }
          />
        </Modal>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(GenerateWorkOrder);

