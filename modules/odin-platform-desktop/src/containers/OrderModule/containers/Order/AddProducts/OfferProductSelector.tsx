import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Divider, Drawer, Modal, Row, Select, Spin, Table } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { sendConfirmationEmail } from '../../../../../core/notifications/email/store/actions';
import { TableReducer } from '../../../../../core/records/components/DynamicTable/store/reducer';
import {
  getRecordByIdRequest,
  IGetRecordById,
  ISearchRecords,
  searchRecordsRequest,
} from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
  updateOrCreateRecordAssociations,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { canUserUpdateRecord } from '../../../../../shared/permissions/rbacRules';
import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../../../../shared/utilities/schemaHelpers';

const { Option } = Select;

interface Props {
  record: DbRecordEntityTransform,
  relation: DbRecordAssociationRecordsTransform,
  hidden?: string[],
  userReducer: any,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  pipelinesEnabled?: boolean,
  createAssociations: (params: any, cb: any) => {},
  getAssociations: any,
  getRecordById: any,
  getSchema: any,
  searchRecords: (params: ISearchRecords) => void,
  relatedProductUpdate?: boolean
  sendConfirmation: any
}

const moduleName = 'ProductModule';
const entityName = 'Product';

interface State {
  visible: boolean,
  selected: any[],
  offerArray: any,
  selectedOfferId: string | undefined,
  productsList: any,
  selectedContractType: string | undefined,
  preselectedItems: any,
  selectedBaseProductRowKeys: any,
  selectedRowKeys: any,
  selectedBaseProducts: any,
  selectedAddOnProducts: any,
  initialBaseProduct: boolean,
  isLoading: boolean,
  customerType: string | undefined,
  preselectedAddOnItems: any,
  addOrderItemToWorkOrder: boolean,
  entityName: string
}

const { WORK_ORDER } = SchemaModuleEntityTypeEnums;
const { FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;

const inactiveWorkOrderStages = [ 'WorkOrderStageDone', 'WorkOrderStageCancelled' ];

class OfferProductSelector extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    visible: false,
    selected: [],
    offerArray: [],
    selectedOfferId: undefined,
    productsList: [],
    selectedContractType: undefined,
    preselectedItems: [],
    selectedBaseProductRowKeys: [],
    selectedRowKeys: [],
    selectedBaseProducts: [],
    selectedAddOnProducts: [],
    initialBaseProduct: false,
    isLoading: false,
    customerType: undefined,
    preselectedAddOnItems: [],
    addOrderItemToWorkOrder: false,
    entityName: 'Offer',
  })

  private constructProductKey(record: DbRecordEntityTransform) {
    return `${record?.id}#${record?.dbRecordAssociation?.relatedAssociationId}`
  }

  private openDrawer() {
    this.setState({
      visible: true,
    });
    this.loadSchema();
  }


  loadSchema() {
    const { getSchema, relation, schemaReducer, getAssociations, relatedProductUpdate } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    if (!schema) {
      getSchema({ moduleName, entityName });
    }
    this.loadLists();
    this.setState({
      preselectedItems: relation.dbRecords !== undefined ? relation.dbRecords : [],
    });
    
    if (relatedProductUpdate) {

      relation.dbRecords?.map((elem: any) => {
        this.setState({
          customerType: elem.properties.CustomerType,
        })
        if (elem?.properties.Type === 'ADD_ON_PRODUCT') {
          this.setState(prevState => ({
            selectedRowKeys: [
              ...prevState.selectedRowKeys,
              this.constructProductKey(elem),
            ],
            selectedAddOnProducts: [
              ...prevState.selectedAddOnProducts,
              elem,
            ],
          }))
        } else if (elem?.properties.Type === 'BASE_PRODUCT') {
          this.setState({
            initialBaseProduct: true,
          })
          this.setState(prevState => ({
            selectedBaseProductRowKeys: [
              ...prevState.selectedBaseProductRowKeys,
              this.constructProductKey(elem),
            ],
            selectedBaseProducts: [
              ...prevState.selectedBaseProducts,
              elem,
            ],
          }))
        }
      });

    } else {

      relation.dbRecords?.map((elem: any) => {
        this.setState({
          customerType: elem.properties.ProductCustomerType,
        })
        elem.key = this.constructProductKey(elem)
        if (elem?.properties.ProductType === 'ADD_ON_PRODUCT' || elem?.properties.Type === 'ADD_ON_PRODUCT') {
          getAssociations({
            recordId: elem.id,
            key: 'Product',
            schema: schema,
            entities: [ 'Product' ],
          }, (result: any) => {
            this.setState(prevState => ({
              selectedRowKeys: [
                ...prevState.selectedRowKeys,
                this.constructProductKey(result?.results?.Product?.dbRecords?.[0]),
              ],
              selectedAddOnProducts: [
                ...prevState.selectedAddOnProducts,
                result?.results?.Product?.dbRecords?.[0],
              ],
              preselectedAddOnItems: [
                ...prevState.selectedAddOnProducts,
                result?.results?.Product?.dbRecords?.[0],
              ],
            }))
          });
        } else if (elem?.properties.ProductType === 'BASE_PRODUCT' || elem?.properties.Type === 'BASE_PRODUCT') {
          this.setState({
            initialBaseProduct: true,
          })
          getAssociations({
            recordId: elem.id,
            key: 'Product',
            schema: schema,
            entities: [ 'Product' ],
          }, (result: any) => {
            this.setState(prevState => ({
              selectedBaseProductRowKeys: [
                ...prevState.selectedBaseProductRowKeys,
                this.constructProductKey(result?.results?.Product?.dbRecords?.[0]),
              ],
              selectedBaseProducts: [
                ...prevState.selectedBaseProducts,
                result?.results?.Product?.dbRecords?.[0],
              ],
            }))
          });
        }
      })
    }

  }

  loadLists() {
    const { getSchema, searchRecords, recordReducer, schemaReducer } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, this.state.entityName);
    if (!schema) {
      // get schema by module and entity and save it to the local state
      getSchema({ moduleName: moduleName, entityName: this.state.entityName }, (result: SchemaEntity) => {
        searchRecords({
          schema: result,
          searchQuery: {
            terms: '*',
            schemas: result.id,
            pageable: {
              page: 1,
              size: 50,
            },
          },
        });
      });
    } else {
      searchRecords({
        schema: schema,
        searchQuery: {
          terms: '*',
          schemas: schema.id,
          pageable: {
            page: 1,
            size: 50,
          },
        },
      });
      const data = recordReducer.list[schema.id];
      data?.map((elem: DbRecordEntityTransform) => elem.key = elem?.id);
      this.setState({
        offerArray: data,
      });
    }
  }


  handleOk(addOrderItemsToWorkOrder: boolean) {
    const { record, relation, createAssociations, recordAssociationReducer } = this.props;
    const { schema, schemaAssociation } = relation;
    if (schemaAssociation && record && schema && recordAssociationReducer.shortList) {
      this.setState({
        isLoading: true,
        addOrderItemToWorkOrder: false,
      })

      const associationKey = `${this.state.selectedOfferId}_${entityName}`;
      const associationObj: any = recordAssociationReducer.shortList[associationKey];
      const data = associationObj[entityName].dbRecords;

      const body: DbRecordAssociationCreateUpdateDto[] = [];

      for(const product of [ ...this.state.selectedBaseProducts, ...this.state.selectedAddOnProducts ]) {

        const matchingProduct = data.find((elem: DbRecordEntityTransform) => this.constructProductKey(elem) === this.constructProductKey(
          product));

        if (matchingProduct) {
          body.push({
            recordId: matchingProduct?.id,
            relatedAssociationId: matchingProduct?.dbRecordAssociation?.relatedAssociationId,
            additionalParams: { offerId: this.state.selectedOfferId },
          })
        }
      }

      createAssociations({
        recordId: record.id,
        schema,
        schemaAssociation,
        createUpdate: body,
      }, (res: any) => {
        if (addOrderItemsToWorkOrder && res) {
          // create association between OrderItems and WorkOrder
          this.createAssociationOrderItemWorkOrder(res.result)
        }
        this.confirmMailSend();
        this.handleCancel();
      });
    }
  };

  confirmMailSend() {
    const { sendConfirmation, record } = this.props;
    Modal.confirm({
      title: 'Confirm',
      content: 'Do you want to send new order confirmation to the customer?',
      onOk: () => {
        sendConfirmation(`OrderModule/v1.0/orders/${record ? record.id : null}/email/SENDGRID_ORDER_CONFIRMATION_V2`);
        Modal.destroyAll();
      }
    });
  }

  // If user chosses create associaiton between OrderItems and WorkOrder
  createAssociationOrderItemWorkOrder(orderItems: any) {
    const { createAssociations, recordAssociationReducer, record, schemaReducer } = this.props;
    const associationKey = `${record?.id}_${WORK_ORDER}`;
    const associationObj: any = recordAssociationReducer.shortList?.[associationKey];
    const workOrderRocords = associationObj?.[WORK_ORDER].dbRecords;

    let body: any = [];
    orderItems.forEach((element: any) => {
      body.push({ recordId: element.id })
    });

    const activeWorkOrder = workOrderRocords?.find((elem: any) => !inactiveWorkOrderStages.includes(elem.stage?.key as string));
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, FIELD_SERVICE_MODULE, WORK_ORDER);
    const modelAssociation = schema?.associations?.find((elem: any) => elem?.label === 'WorkOrder__OrderItem');

    if (activeWorkOrder) {
      createAssociations({
        recordId: activeWorkOrder.id,
        schema: schema,
        schemaAssociation: modelAssociation,
        createUpdate: body,
      }, () => {
      })
    }
  }

  handleCancel = () => {
    this.setState(this.getInitialState())
  };

  private optionSelected(val: any) {
    const { schemaReducer, getAssociations } = this.props;
    if (val !== this.state.selectedOfferId && this.state.selectedOfferId !== undefined && !this.state.preselectedItems) {
      this.setState({
        selectedRowKeys: [],
        selectedBaseProductRowKeys: [],
        selectedBaseProducts: [],
        selectedAddOnProducts: [],
      });
    }
    this.setState({
      selectedOfferId: val,
      productsList: [],
      selectedContractType: undefined,
    });

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    if (schema) {
      getAssociations({
        recordId: val,
        key: 'Product',
        schema: schema,
        entities: [ 'Product' ],
      });
    }
  }

  private renderOfferOptions() {

    const { schemaReducer } = this.props;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, this.state.entityName);
    if (schema) {

      if (this.state.offerArray) {
        return (
          this.state.offerArray.map((elem: DbRecordEntityTransform) =>
            // @ts-ignore
            <Option key={elem?.id?.toString()} value={elem?.id}>{elem?.title}</Option>,
          ))
      } else {
        return;
      }
    }
  }

  contractTypeSelect(val: any) {
    const { recordAssociationReducer } = this.props;
    const associationKey = `${this.state.selectedOfferId}_Product`;
    const associationObj: any = recordAssociationReducer.shortList?.[associationKey];
    let productsList = associationObj?.Product?.dbRecords.filter((elem: any) => elem?.properties.ContractType === val);
    productsList.map((elem: any) => elem.key = this.constructProductKey(elem))
    this.setState({
      productsList: productsList,
      selectedContractType: val,
    });
  }

  renderContractTypeOptions() {
    const { recordAssociationReducer } = this.props;
    const associationKey = `${this.state.selectedOfferId}_Product`;
    const associationObj: any = recordAssociationReducer.shortList?.[associationKey];

    if (associationObj) {
      return (
        this.getUniqueValues(associationObj?.Product?.dbRecords, 'ContractType').map((elem: any) => (
          // @ts-ignore
          <Option key={elem} value={elem}>{elem}</Option>),
        ))
    } else {
      return;
    }
  }

  getUniqueValues(array: any, key: any) {
    var result = new Set();
    array?.forEach(function (item: any) {
      if (item.properties.hasOwnProperty(key)) {
        result.add(item.properties[key]);
      }
    });
    return Array.from(result);
  }

  renderAddOnProductList() {
    const { recordAssociationReducer } = this.props;
    const associationKey = `${this.state.selectedOfferId}_Product`;
    const associationObj: any = recordAssociationReducer.shortList?.[associationKey];
    const productsList = associationObj?.Product?.dbRecords;
    productsList?.map((elem: any) => elem.key = this.constructProductKey(elem));
    const columns = [
      {
        title: 'Title',
        key: 'title',
        dataIndex: 'title',
      },
      {
        title: 'Category',
        dataIndex: 'Category',
        key: 'Category',
        render: (text: any, record: any) => (
          <>{record.properties.Category}</>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'Type',
        key: 'Type',
        render: (text: any, record: any) => (
          <>{record.properties.Type}</>
        ),
      },
      {
        title: 'ContractType',
        dataIndex: 'ContractType',
        key: 'ContractType',
        render: (text: any, record: any) => (
          <>{record.properties.ContractType}</>
        ),
      },
      {
        title: 'Price',
        dataIndex: 'Price',
        key: 'Price',
        render: (text: any, record: any) => (
          <>{record.properties?.UnitPrice}</>
        ),
      },
    ];
    return (
      <Table
        rowSelection={{
          type: 'checkbox',
          onChange: (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
            this.setState({
              selectedRowKeys: selectedRowKeys,
              selectedAddOnProducts: selectedRows.filter((el: any) => el),
            });
          },
          preserveSelectedRowKeys: true,
          selectedRowKeys: this.state.selectedRowKeys,
          getCheckboxProps: (record: DbRecordEntityTransform) => ({
            disabled: !this.state.selectedBaseProductRowKeys.length || this.setDisabledAddOnProducts(record),
          }),
        }}

        loading={recordAssociationReducer?.isSearching}
        scroll={{ y: 'calc(100vh - 315px)' }}
        style={{ width: '100%' }}
        size="small"
        dataSource={productsList?.filter((elem: any) => elem?.properties.Type === 'ADD_ON_PRODUCT')}
        columns={columns}
      />
    )
  }

  setDisabledAddOnProducts(record: DbRecordEntityTransform) {
    // set disabled AddOn products
    if (this.state.selectedBaseProductRowKeys.length) {
      if (this.state.preselectedAddOnItems?.find((elem: DbRecordEntityTransform) => this.constructProductKey(elem) === this.constructProductKey(
        record))) {
        // disable clicking on preselected item - item that is already associated to the order
        return true
      } else if (this.state.selectedAddOnProducts.find((elem: any) => this.constructProductKey(elem) === this.constructProductKey(
        record))) {
        // allow uncheck of the item you previously clicked
        // but that item is not preselected
        return false
      } else {
        if (record.properties.Category === 'VOICE' && this.state.selectedBaseProducts?.[0]?.properties.Category === 'VOICE') {
          // if base product Category is VOICE don't allow the user to select VOICE add on product
          return true;
        } else if (record.properties.Category === 'VOICE' && this.state.selectedAddOnProducts.find((elem: any) => elem?.properties.Category === 'VOICE')) {
          // if user already selected VOICE add on don't allow the user to add another one
          return true;
        }
      }
    } else return false
  }

  renderBaseProductList() {
    const { recordAssociationReducer } = this.props;
    const columns = [
      {
        title: 'Title',
        key: 'title',
        dataIndex: 'title',
      },
      {
        title: 'Category',
        dataIndex: 'Category',
        key: 'Category',
        render: (text: any, record: any) => (
          <>{record.properties.Category}</>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'Type',
        key: 'Type',
        render: (text: any, record: any) => (
          <>{record.properties.Type}</>
        ),
      },
      {
        title: 'ContractType',
        dataIndex: 'ContractType',
        key: 'ContractType',
        render: (text: any, record: any) => (
          <>{record.properties.ContractType}</>
        ),
      },
      {
        title: 'Price',
        dataIndex: 'Price',
        key: 'Price',
        render: (text: any, record: any) => (
          <>{record.properties?.UnitPrice}</>
        ),
      },
    ];
    return (
      <Table
        rowSelection={{
          type: 'radio',
          preserveSelectedRowKeys: true,
          selectedRowKeys: this.state.selectedBaseProductRowKeys,
          onChange: (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
            this.setState({
              selectedBaseProductRowKeys: selectedRowKeys,
              selectedBaseProducts: selectedRows,
            });
          },
          getCheckboxProps: (record: DbRecordEntityTransform) => ({
            disabled: this.baseProductDisabledState(record),
          }),
        }}

        loading={recordAssociationReducer?.isSearching}
        scroll={{ y: 'calc(100vh - 315px)' }}
        style={{ width: '100%' }}
        size="small"
        dataSource={this.state.productsList?.filter((elem: any) => elem?.properties.Type === 'BASE_PRODUCT')}
        columns={columns}
      />
    )
  }

  baseProductDisabledState(record: DbRecordEntityTransform) {
    if (this.state.initialBaseProduct) {
      return true
    } else {
      return false
    }
  }


  // Check if there is active WorkOrder associated to the Order.
  // If there is then ask user if he wants to associate OrderItems to the WorkOrder.
  checkWorkOrder() {
    const { getAssociations, record, schemaReducer } = this.props;

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    getAssociations({
      recordId: record.id,
      key: WORK_ORDER,
      schema: schema,
      entities: [ WORK_ORDER ],
    }, (res: any) => {
      // check if there is an active WorkOrder
      // if there is, show modal and allow user to select to add OrderItems to WorkOrder
      // if not just associate OrderItems to the Order
      if (res.results[WORK_ORDER]?.dbRecords) {
        if (res.results[WORK_ORDER]?.dbRecords.find((elem: DbRecordEntityTransform) =>
          inactiveWorkOrderStages.includes(elem.stage?.key as string))) {
          this.handleOk(false);
        } else {
          this.setState({ addOrderItemToWorkOrder: true })
        }
      } else {
        this.handleOk(false);
      }
    });
  }

  // If User has role ProductModuleAdmin let him choose between Offer and PriceBook entity for Product selection
  renderEntitySelect() {
    const { userReducer } = this.props;
    if (userReducer?.roles?.includes('ProductModuleAdmin')) {
      return (
        <Select
          style={{ width: '100%', marginBottom: '1rem' }}
          placeholder="Select Entity"
          onSelect={(val) => this.setState({ entityName: val })}
          onClick={e => this.loadLists()}
          value={this.state.entityName || undefined}
        >
          <Option key={'Offer'} value={'Offer'}>Offer</Option>
          <Option key={'PriceBook'} value={'PriceBook'}>Price Book</Option>
        </Select>
      )
    } else {
      return false
    }
  }

  render() {
    const { recordReducer, record, userReducer, schemaReducer } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);

    return (
      <div>
        {/*Add OrderItem to WorkOrder*/}
        <Modal
          title="Add Order Items to Work Order"
          visible={this.state.addOrderItemToWorkOrder}
          onOk={() => this.handleOk(true)}
          onCancel={() => this.handleOk(false)}
          okText="Yes"
          cancelText="No"
        >
          <p>Do you want do add selected Order Items to the Work Order?</p>
        </Modal>

        <Button
          type="text"
          onClick={() => this.openDrawer()}
          disabled={schema ? !canUserUpdateRecord(userReducer, schema) : false}
        >
          Lookup Product
        </Button>
        <Drawer
          title={`Add Products`}
          visible={this.state.visible}
          onClose={() => this.handleCancel()}
          width={1000}
        >
          <Spin spinning={recordReducer.isRequesting} tip="Saving changes...">
            <Row>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div>
                  {this.renderEntitySelect()}
                  <Select
                    loading={recordReducer.isSearching}
                    style={{ width: '100%' }}
                    placeholder={'Select ' + this.state.entityName}
                    onSelect={(val) => this.optionSelected(val)}
                    onClick={e => this.loadLists()}
                    value={this.state.selectedOfferId || undefined}
                  >
                    {this.renderOfferOptions()}
                  </Select>
                  <Select
                    style={{ width: '100%', marginTop: '1rem' }}
                    placeholder="Select Contract Type"
                    onSelect={(val) => this.contractTypeSelect(val)}
                    disabled={this.state.selectedOfferId === undefined}
                    value={this.state.selectedContractType || undefined}
                  >
                    {this.renderContractTypeOptions()}
                  </Select>
                  <Divider/>
                  {this.renderAddOnProductList()}
                  {this.renderBaseProductList()}
                </div>
                <Divider/>
              </div>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: 16 }}>
              <Button
                type="primary"
                disabled={!this.state.selectedRowKeys && !this.state.selectedBaseProductRowKeys}
                onClick={(e) => this.checkWorkOrder()}
                loading={this.state.isLoading}
              >
                Save Changes
              </Button>
            </div>
          </Spin>
        </Drawer>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  recordTableReducer: state.recordTableReducer,
});

const mapDispatch = (dispatch: any) => ({
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  createAssociations: (params: any, cb: any) => dispatch(updateOrCreateRecordAssociations(params, cb)),
  getSchema: (params: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(params, cb)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  sendConfirmation: (payload: any) => dispatch(sendConfirmationEmail(payload)),
});


export default connect(mapState, mapDispatch)(OfferProductSelector);
