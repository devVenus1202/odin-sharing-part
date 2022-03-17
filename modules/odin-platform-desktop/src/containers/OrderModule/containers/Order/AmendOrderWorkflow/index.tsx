import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import StepView from '../../../../../shared/components/StepView';
import { changeStepNumber, IStepViewChangeStepNumber, IStepViewValidation, setStepValidationArray } from '../../../../../shared/components/StepView/store/actions';
import { StepViewReducerState } from '../../../../../shared/components/StepView/store/reducer';
import { getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Button, Drawer, Space, Table, Typography } from 'antd';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import { amendOrderRequest, IAmendOrderParams, IOrderAmendWorkflowParams, orderAmendWorkflow } from '../../../../../core/workflow/store/actions';
import { getRecordFromShortListById } from '../../../../../shared/utilities/recordHelpers';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import OrderItemProductManager from '../../OrderItem/ReplaceProduct/OrderItemProductManager';
import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { ColumnType } from 'antd/lib/table';
import history from '../../../../../shared/utilities/browserHisory';
import { computeItemDiscountedUnitPrice } from '../../../../../core/billing/helpers/itemCalculations';


interface Props {
  recordReducer: IRecordReducer;
  recordAssociationReducer: IRecordAssociationsReducer;
  stepViewReducer: StepViewReducerState;
  schemaReducer: SchemaReducerState;
  workflowReducer: WorkflowReducer;
  setValidationData: (params: IStepViewValidation[]) => void;
  changeStep: (params: IStepViewChangeStepNumber) => void;
  getAssociations: (params: IGetRecordAssociations, cb?: any) => void;
  orderAmendWorkflow: (params: IOrderAmendWorkflowParams) => void;
  amendOrder: (params: IAmendOrderParams, cb?: (resp: any) => void) => void;
}

interface State {
  selectedKeepItems: DbRecordEntityTransform[];
  selectedKeepItemsRowKeys: any[];
  selectedProductAmendItem: any;
  isAmendProductVisible: boolean;
  amendProducts: {
    itemId: string;
    amendmentType: 'UPGRADE' | 'DOWNGRADE';
    product: DbRecordAssociationCreateUpdateDto;
    itemEntity: DbRecordEntityTransform;
    productEntity: DbRecordEntityTransform;
  }[];
  isOrderItemsLoading: boolean;
  isOrderItemProductsLoading: boolean;
}

const { ORDER_MODULE } = SchemaModuleTypeEnums;
const { ORDER_ITEM, PRODUCT } = SchemaModuleEntityTypeEnums;

class AmendOrderModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  private getInitialState() {
    return {
      selectedKeepItems: [],
      selectedKeepItemsRowKeys: [],
      selectedProductAmendItem: undefined,
      isAmendProductVisible: false,
      amendProducts: [],
      isOrderItemsLoading: false,
      isOrderItemProductsLoading: false,
    };
  };

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (prevProps.workflowReducer.AmendOrder?.isAmendOrderVisible !== this.props.workflowReducer.AmendOrder?.isAmendOrderVisible) {
      this.setStepViewState(0, false);
    }
  }

  renderSteps() {
    const { stepViewReducer } = this.props;
    
    const stepsArray = [
      {
        name: 'Keep Items',
        content: this.renderKeepItemsStep(),
        isNextDisabled: false,
      },
      {
        name: 'Upgrade Products',
        content: this.renderAmendProductsStep('UPGRADE'),
        isNextDisabled: false,
        isPreviousDisabled: false,
      },
      {
        name: 'Downgrade Products',
        content: this.renderAmendProductsStep('DOWNGRADE'),
        isPreviousDisabled: false,
      },
      {
         name: 'Summary',
         content: this.renderSummaryStep(),
         isPreviousDisabled: false,
      },
    ];
    return stepsArray
  }

  private renderKeepItemsStep() {
    const { recordReducer, recordAssociationReducer, workflowReducer, stepViewReducer, schemaReducer, getAssociations } = this.props;

    if (stepViewReducer.currentStep !== 0) return <></>;

    const record = getRecordFromShortListById(recordReducer.shortList, workflowReducer.AmendOrder?.orderId);

    let data: DbRecordEntityTransform[] = [];
    const orderItemsAssociationKey = `${record?.id}_${ORDER_ITEM}`;
    const orderItemsAssociationObj: any = recordAssociationReducer?.shortList?.[orderItemsAssociationKey];
    if (!orderItemsAssociationObj) {
      if (!this.state.isOrderItemsLoading) {
        const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
        if (schema) {
          this.setState({ isOrderItemsLoading: true });
          getAssociations({
            recordId: record?.id,
            key: ORDER_ITEM,
            schema,
            entities: [ORDER_ITEM]
          }, () => {
            this.setState({ isOrderItemsLoading: false });
          });
        }
      }
    } else {
      data = orderItemsAssociationObj?.[ORDER_ITEM]?.dbRecords;
    }

    const onChangeHandler = (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
      this.setState({
        selectedKeepItems: selectedRows,
        selectedKeepItemsRowKeys: selectedRowKeys,
        isAmendProductVisible: false,
      });
    };

    return this.renderItemsTable({
      data, 
      selectType: 'checkbox', 
      onChangeHandler, 
      selectedRowKeys: this.state.selectedKeepItemsRowKeys,
    });
  }

  private renderItemsTable(params: {
      data: DbRecordEntityTransform[];
      selectType?: 'checkbox' | 'radio';
      onChangeHandler?: (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => void;
      selectedRowKeys?: any[];
      onActionHandler?: (item: DbRecordEntityTransform) => void;
    }
  ) {

    params.data?.forEach((el: any) => {
      el.key = el.id
    });

    const columns: ColumnType<DbRecordEntityTransform>[] = [
      { 
        title: 'Title',
        dataIndex: 'title',
        render: (text: any, record: any) => (
          <>
            <Typography.Text>{record.title}</Typography.Text><br/>
            {record.oldTitle ? <Typography.Text>(old: {record.oldTitle})</Typography.Text> : '' }
          </>
        )
      },
      { 
        title: 'Category', 
        dataIndex: 'Category', 
        render: (text: any, record: any) => (
          <>{getProperty(record,'ProductCategory')}</>
        )
      },
      { 
        title: 'Type', 
        dataIndex: 'Type', 
        render: (text: any, record: any) => (
          <>{getProperty(record,'ProductType')}</>
        )
      },
      { 
        title: 'Unit Price', 
        dataIndex: 'UnitPrice', 
        render: (text: any, record: any) => (
          <>{getProperty(record,'UnitPrice')}</>
        )
      },
      { 
        title: 'Discounted Unit Price', 
        dataIndex: 'DicountedUnitPrice', 
        render: (text: any, record: any) => (
          <>{computeItemDiscountedUnitPrice(record).toFixed(2)}</>
        )
      }
    ];

    if (params.onActionHandler) {
      const onActionHandler = params.onActionHandler;
      columns.push({
        title: 'actions',
        dataIndex: 'actions',
        render: (text: any, record: any) => (
          <Space size='middle'>
            <a onClick={() => onActionHandler(record)}>discard changes</a>
          </Space>
        )
      });
    }

    return (
      <Table
        rowSelection={ params.selectType ?
          {
            type: params.selectType,
            onChange: params.onChangeHandler,
            selectedRowKeys: params.selectedRowKeys,
          }
          : undefined
        }
        scroll={{ y: "calc(100vh - 315px)" }}
        style={{ minHeight: "100%", width: "100%" }}
        size="small"
        dataSource={params.data}
        columns={columns}
      ></Table>
    )
  }

  private renderAmendProductsStep(amendmentType: 'UPGRADE' | 'DOWNGRADE') {
    const { recordReducer, workflowReducer, recordAssociationReducer, stepViewReducer } = this.props;

    if ((amendmentType === 'UPGRADE' && stepViewReducer.currentStep !== 1)
      || (amendmentType === 'DOWNGRADE' && stepViewReducer.currentStep !== 2)
    ) return <></>;

    const record = getRecordFromShortListById(recordReducer.shortList, workflowReducer.AmendOrder?.orderId);

    // order items data
    const orderItemsAssociationKey = `${record?.id}_${ORDER_ITEM}`;
    const orderItemsAssociationObj: any = recordAssociationReducer?.shortList?.[orderItemsAssociationKey];
    const orderItemsData = orderItemsAssociationObj?.[ORDER_ITEM]?.dbRecords?.filter((item: DbRecordEntityTransform) => 
      !this.state.selectedKeepItems.some(keep => keep.id === item.id)
      && !this.state.amendProducts.some(amend => amend.itemId === item.id && amend.amendmentType !== amendmentType)
    );

    const selectedItem: DbRecordEntityTransform = this.state.selectedProductAmendItem;
    const selectedItemDiscountedUnitPrice = computeItemDiscountedUnitPrice(selectedItem);

    const orderItemOnChangeHandler = (selectedRowKeys: React.Key[], selectedRows: DbRecordEntityTransform[]) => {
      if (selectedRows?.length > 0) {
        this.setState({
          selectedProductAmendItem: selectedRows[0],
        });
      } else {
        this.setState({
          selectedProductAmendItem: undefined,
        });
      }
    };

    // order items amendment data
    const itemsAmendmentData = this.getItemsAmendmentData(amendmentType);

    return (<>
      <div>
        {this.renderItemsTable({
          data: orderItemsData, 
          selectType: 'radio', 
          onChangeHandler: orderItemOnChangeHandler,
        })}
      </div>
      <div>
        <Button
          type='default'
          onClick={(e: any) => {
            this.setState({
              isAmendProductVisible: true,
            });
          }}
          disabled={!selectedItem}
        >{amendmentType} PRODUCT</Button>
      </div>
      <div hidden={!this.state.isAmendProductVisible} style={{ border: '1px solid #efefef' }}>
        <OrderItemProductManager 
          record={selectedItem}
          onlySelect
          handleSubmit={(e: any) => {
            this.addItemProductAmendment(selectedItem, amendmentType, e[0]);
            this.setState({
              isAmendProductVisible: false,
            });
          }}
          additionalFilter={(item: DbRecordEntityTransform) => {
            if (amendmentType === 'UPGRADE') {
              return computeItemDiscountedUnitPrice(item) >= selectedItemDiscountedUnitPrice;
            } else if (amendmentType === 'DOWNGRADE') {
              return computeItemDiscountedUnitPrice(item) <= selectedItemDiscountedUnitPrice;
            }
            return true;
          }}
        />
      </div>
      <div>
        {this.renderItemsTable({
          data: itemsAmendmentData,
          onActionHandler: (item: DbRecordEntityTransform) => this.removeItemProductAmendment(item.id),
        })}
      </div>
    </>);
  }

  private getItemsAmendmentData(amendmentType: 'UPGRADE' | 'DOWNGRADE'): DbRecordEntityTransform[] {
    const itemsAmendmentData: any[] = [];
    if (this.state.amendProducts?.length > 0) {
      itemsAmendmentData.push(...this.state.amendProducts
        .filter(elem => elem.amendmentType === amendmentType)
        .map(elem => ({
          id: elem.itemId,
          key: elem.itemId,
          title: getProperty(elem.productEntity, 'DisplayName') || elem.productEntity.title,
          oldTitle: elem.itemEntity.title,
          properties: {
            ProductCategory: getProperty(elem.itemEntity, 'ProductCategory'),
            ProductType: getProperty(elem.itemEntity,'ProductType'),
            UnitPrice: getProperty(elem.productEntity, 'UnitPrice'),
          }
        }))
      );
    }
    return itemsAmendmentData;
  }

  private addItemProductAmendment(
    orderItem: DbRecordEntityTransform,
    amendmentType: 'UPGRADE' | 'DOWNGRADE',
    data: {
      productEntity: DbRecordEntityTransform;
      productAssociationDto: DbRecordAssociationCreateUpdateDto;
    },
  ) {
    this.setState(prevState => ({
      ...prevState,
      amendProducts: [
        ...prevState.amendProducts.filter(elem => elem.itemId !== orderItem.id),
        ...[{
          itemId: orderItem.id,
          amendmentType,
          product: data.productAssociationDto,
          itemEntity: orderItem,
          productEntity: data.productEntity,
        }]
      ]
    }));
  }

  private removeItemProductAmendment(itemId: string) {
    this.setState(prevState => ({
      ...prevState,
      amendProducts: [
        ...prevState.amendProducts.filter(elem => elem.itemId !== itemId)
      ]
    }));
  }

  private renderSummaryStep() {
    const { workflowReducer, recordAssociationReducer, schemaReducer, getAssociations, stepViewReducer } = this.props;

    if (stepViewReducer.currentStep !== 3) return <></>;

    const keepItemsData = this.state.selectedKeepItems;
    const productUpgradeItems = this.getItemsAmendmentData('UPGRADE');
    const productDowngradeItems = this.getItemsAmendmentData('DOWNGRADE');

    // get return items data
    const returnItemsData: DbRecordEntityTransform[] = [];
    if (keepItemsData?.length > 0 || productUpgradeItems?.length > 0 || productDowngradeItems?.length > 0) {
      const orderItemsAssociationKey = `${workflowReducer.AmendOrder?.orderId}_${ORDER_ITEM}`;
      const orderItemsAssociationObj: any = recordAssociationReducer?.shortList?.[orderItemsAssociationKey];
      const removeOrderItems = orderItemsAssociationObj?.[ORDER_ITEM]?.dbRecords?.filter((item: DbRecordEntityTransform) => 
        !this.state.selectedKeepItems.some(keep => keep.id === item.id)
        && !this.state.amendProducts.some(amend => amend.itemId === item.id)
      );
      if (removeOrderItems?.length > 0) {
        for (const item of removeOrderItems) {
          const productsAssociationKey = `${item.id}_${PRODUCT}`;
          const productsAssociationObj: any = recordAssociationReducer?.shortList?.[productsAssociationKey];
          if (!productsAssociationObj) {
            if (!this.state.isOrderItemProductsLoading) {
              const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, item.schemaId);
              if (schema) {
                this.setState({ isOrderItemProductsLoading: true });
                getAssociations({
                  recordId: item.id,
                  key: PRODUCT,
                  schema,
                  entities: [PRODUCT],
                }, () => {
                  this.setState({ isOrderItemProductsLoading: false });
                });
                break;
              }
            }
          } else {
            if (productsAssociationObj[PRODUCT]?.dbRecords?.some((p: DbRecordEntityTransform) => getProperty(p, 'Retrievable') === 'YES')) {
              returnItemsData.push(item);
            }
          }
        }
      }
    }

    return (
      <>
        <div>
          <Typography.Text strong>Keep Items</Typography.Text>
          {this.renderItemsTable({ data: keepItemsData })}
        </div>
        <div style={{ marginTop: 5 }}>
          <Typography.Text strong>Upgrade Items</Typography.Text>
          {this.renderItemsTable({ data: productUpgradeItems })}
        </div>
        <div style={{ marginTop: 10 }}>
          <Typography.Text strong>Downgrade Items</Typography.Text>
          {this.renderItemsTable({ data: productDowngradeItems })}
        </div>
        <div style={{ marginTop: 10 }}>
          <Typography.Text strong>Return Items</Typography.Text>
          {this.renderItemsTable({ data: returnItemsData })}
        </div>
      </>
    )
  }

  private onNextButtonClick(params: any, cb: any) {
    switch(params.step) {
      case 0:
        cb(true);
        this.setStepViewState(1, false);
        break;
      case 1:
        cb(true);
        this.setStepViewState(2, false);
        break;
      case 2:
        cb(true);
        const haveAmendParams = this.state.selectedKeepItems?.length > 0 || this.state.amendProducts?.length > 0;
        this.setStepViewState(3, !haveAmendParams);
        break;
    }
  }

  private onPrevButtonClick(params: any, cb: any) {
    switch(params.step) {
      case 1:
        cb(true);
        this.setStepViewState(0, false);
        break;
      case 2: 
        this.setStepViewState(1, false)
        cb(true);
        break;
      case 3: 
        this.setStepViewState(2, false)
        cb(true);
        break;
    }
  }

  private setStepViewState(stepNumber: number, isNextDisabled: boolean) {
    const { setValidationData, stepViewReducer, changeStep } = this.props;
    const tempStepData = stepViewReducer.stepComponentsData;

    if (tempStepData[stepNumber]) {
      tempStepData[stepNumber].isNextDisabled = isNextDisabled;
      setValidationData(tempStepData);
      changeStep({ stepNumber: stepNumber });
    }
  }

  private submitAmendOrder(cb: any) {
    const { amendOrder, workflowReducer } = this.props;

    const params: IAmendOrderParams = {
      orderId: workflowReducer.AmendOrder?.orderId,
      body: {
        keepItemsIds: this.state.selectedKeepItems.map(item => item.id),
        amendProducts: this.state.amendProducts.map(elem => ({
          itemId: elem.itemId,
          amendmentType: elem.amendmentType,
          product: elem.product,
        })),
      },
    };

    amendOrder(params, (res: any) => {
      if (res) {
        cb(true)
        this.resetModalData();
        if (res.data?.amendedOrder?.id) {
          history.push(`/OrderModule/Order/${res.data.amendedOrder.id}`)
        }
      } else {
        cb(false)
      }
    })
  }

  private resetModalData() {

    const { setValidationData, stepViewReducer, orderAmendWorkflow } = this.props;
    orderAmendWorkflow({
      orderId: undefined,
      isAmendOrderVisible: false,
    })
    const tempArr = stepViewReducer.stepComponentsData;
    this.setState(this.getInitialState());
    this.setStepViewState(0, true);
    setValidationData(tempArr);
  }


  render() {
    const { workflowReducer } = this.props;
    return (
      <>
        <Drawer
          className="custom-drawer"
          title={`Amend Order`}
          visible={workflowReducer?.AmendOrder?.isAmendOrderVisible}
          onClose={(e) => {
            this.resetModalData()
          }}
          width={1000}
          //destroyOnClose
        >
          <StepView
            isLookupCreate
            onNextActionClick={(params: any, cb: any) => this.onNextButtonClick(params, cb)}
            onPrevActionClick={((params: any, cb: any) => this.onPrevButtonClick(params, cb))}
            onSubmit={(cb: any) => {
              this.submitAmendOrder(cb)
            }}
            steps={this.renderSteps()}
            hideCancel
          />
        </Drawer>
      </>
    )
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  stepViewReducer: state.stepViewReducer,
  schemaReducer: state.schemaReducer,
  workflowReducer: state.workflowReducer,
  recordAssociationReducer: state.recordAssociationReducer
});

const mapDispatch = (dispatch: any) => ({
  setValidationData: (params: any) => dispatch(setStepValidationArray(params)),
  changeStep: (params: IStepViewChangeStepNumber) => dispatch(changeStepNumber(params)),
  getAssociations: (params: IGetRecordAssociations, cb?: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  orderAmendWorkflow: (params: IOrderAmendWorkflowParams) => dispatch(orderAmendWorkflow(params)),
  amendOrder: (params: IAmendOrderParams, cb?: (resp: any) => void) => dispatch(amendOrderRequest(params, cb)),
});

// @ts-ignore
export default connect(mapState, mapDispatch)(AmendOrderModal);
