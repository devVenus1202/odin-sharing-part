import { BillingAdjustmentHelper } from '@d19n/common/dist/billing/helpers/BillingAdjustmentHelper';
import { OrderInvoiceItemCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceItemCalculations';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getNewestDbRecord, getProperty, sortDbRecordsByDate } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Card, Checkbox, List, Typography } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  getRecordAssociationWithNestedEntitiesRequest,
  IGetRecordAssociations,
  IGetRecordAssociationWithNestedEntites,
} from '../../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import { getSchemaFromShortListByModuleAndEntity, getSchemaFromShortListBySchemaId } from '../../../../../shared/utilities/schemaHelpers';
import { OrderInvoiceCalculations } from '@d19n/common/dist/billing/helpers/OrderInvoiceCalculations';
import { BillingDatesCalculator } from '@d19n/common/dist/billing/helpers/BillingDatesCalculator';


interface Props {
  record: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  hidden?: string[],
  getAssociations: any,
  getAssociationWithNestedEntities: (params: IGetRecordAssociationWithNestedEntites, cb?: any) => {},
  alertMessage: any,
  getSchema: any,
  onStepComplete: any
}

const { ORDER_MODULE, BILLING_MODULE } = SchemaModuleTypeEnums;
const { ORDER, ORDER_ITEM, BILLING_ADJUSTMENT, INVOICE } = SchemaModuleEntityTypeEnums;

class OrderGenerateInvoice extends React.Component<Props> {
  state = { visible: false, isLoading: false, selected: [], currentStep: 1 };

  componentDidMount() {
    this.getOrderItems();
    this.getBillingAdjustments();
    this.getRecordAssociations();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    if(prevProps.record !== this.props.record) {
      this.getOrderItems();
      this.getBillingAdjustments();
      this.getRecordAssociations();
    }
  }

  addRemoveItem = (item: DbRecordEntityTransform) => {
    if(this.state.selected.find(elem => elem === item.id)) {
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


  handleOk = async () => {
    const { schemaReducer, record, alertMessage, onStepComplete } = this.props;
    this.setState({
      isLoading: true,
    });

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);

    if(record && schema) {

      const body = this.state.selected.map(elem => ({
        recordId: elem,
      }));

      await httpPost(
        `BillingModule/v1.0/invoices/orders/${record.id}`,
        body,
      ).then(res => {
        console.log(res);
        this.getRecordAssociations();
        alertMessage({ body: 'invoice created', type: 'success' });
        onStepComplete();
        // history.push(`/OrderModule/Order/${record.id}`);

      }).catch(err => {

        const error = err.response ? err.response.data : undefined;
        alertMessage({ body: error && error.message || 'error generating invoice', type: 'error' });
      });

      this.setState({
        visible: false,
        isLoading: false,
      });

    }
  };

  handleCancel = (e: any) => {
    this.setState({
      visible: false,
      isLoading: false,
    });
  };

  private getOrderItems() {
    const { getAssociations, record, getSchema } = this.props;
    if(record) {
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

  private getBillingAdjustments() {
    const { record, schemaReducer, getAssociationWithNestedEntities } = this.props;
    if(record) {
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, ORDER_MODULE, ORDER);
      if (schema) {
        getAssociationWithNestedEntities({
          recordId: record.id,
          key: BILLING_ADJUSTMENT,
          schema: schema,
          entity: BILLING_ADJUSTMENT,
          nestedEntities: [ INVOICE ],
        }, (resp: any) => {
          const billingAdjustment = resp.results?.[BILLING_ADJUSTMENT]?.dbRecords?.[0];
          const invoicesWithAdjustment = billingAdjustment?.[INVOICE]?.dbRecords;
        });
      }
    }
  }

  private getRecordAssociations() {
    const { getAssociations, record, getSchema } = this.props;
    if(record) {
      getSchema({ moduleName: BILLING_MODULE, entityName: INVOICE }, (result: SchemaEntity) => {
        getAssociations({
          recordId: record.id,
          key: INVOICE,
          schema: result,
          entities: [ INVOICE ],
        });
      });
    }
    return;
  }

  getNextAvailableAdjusment(adjustments: DbRecordEntityTransform[]) {
    if (adjustments.length === 0) return undefined;
    let result: any = undefined;
    
    let sorted = sortDbRecordsByDate(adjustments, 'asc');

    if (sorted) {
      for (let i = 0; i < sorted.length; i++) {
        const freePeriodLength = getProperty(sorted[i], 'FreePeriodLength') || 0;
        const discountLength = getProperty(sorted[i], 'DiscountLength') || 0;
        const discountType = getProperty(sorted[i], 'DiscountType');
        const discountValue = getProperty(sorted[i], 'DiscountValue');
        let adjustmentInvoices = sorted[i][INVOICE]?.dbRecords;
        // check if the billing adjustments have applied to the invoices
        if (adjustmentInvoices) {
          // exclude voided invoices
          const invoicesNotVoided = adjustmentInvoices.filter((elem: DbRecordEntityTransform) => getProperty(elem, 'Status') !== 'VOID');
          if (freePeriodLength && invoicesNotVoided.length < Number(freePeriodLength)) {
            // the adjustment should be applied
            result = sorted[i];
            break;
          } else if (discountType && discountValue && invoicesNotVoided.length < Number(freePeriodLength) + Number(
            discountLength)) {
              result = sorted[i];
              break;
          }
        } 
        // adjustment has no invoices add it to this invoice
        else if (Number(freePeriodLength) > 0) {
          result = sorted[i];
          break;
        } else if (discountType && discountValue && Number(discountLength) > 0) {
          result = sorted[i];
          break;
        }
      }
    }

    return result
  }

  private selectedItemTotals() {

    const { recordAssociationReducer, record } = this.props;

    const associationKey = `${record?.id}_${ORDER_ITEM}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];

    if (associationObj) {
      const selectedItems = this.state.selected
      const orderItems = associationObj[ORDER_ITEM].dbRecords;

      if (orderItems) {
        // @ts-ignore
        const filteredOrderItems = orderItems.filter((elem: DbRecordEntityTransform) => selectedItems.includes(elem.id));

        if (filteredOrderItems?.length > 0) {

          // get the earliest NextInvoiceDate from orderItems
          const adjustedBillingStartDateToBillingDay = BillingDatesCalculator.getAdjustedBillingStartDateToBillingDay(record);
          const nextInvoiceDate = BillingDatesCalculator.getNextInvoiceDateFromOrderItems(
            filteredOrderItems,
            adjustedBillingStartDateToBillingDay,
          );

          // ODN-1393 add billing adjustment
          let adjusmentItem;
          const adjustmentAssociationKey = `${record?.id}_${BILLING_ADJUSTMENT}`;
          const adjustmentAssociationObj: any = recordAssociationReducer.shortList[adjustmentAssociationKey];
          const adjustments = adjustmentAssociationObj?.[BILLING_ADJUSTMENT]?.dbRecords;
          if (adjustments?.length > 0) {
            const adjustment = this.getNextAvailableAdjusment(adjustments);
            if (adjustment) {
              const adjustmentInfo = BillingAdjustmentHelper.constructBillingAdjustmentInfo(adjustment);
              const { newAdjustmentItem } = OrderInvoiceItemCalculations.constructBillingAdjustmentItem(
                filteredOrderItems,
                record,
                adjustmentInfo,
                nextInvoiceDate,
              );
              adjusmentItem = newAdjustmentItem;
              if (adjusmentItem) {
                filteredOrderItems.push(adjusmentItem);
              }
            }
          }

          return {
            Adjustment: adjusmentItem,
            Subtotal: OrderInvoiceCalculations.computeSubtotal(filteredOrderItems),
            TotalDiscounts: OrderInvoiceCalculations.computeTotalDiscounts(filteredOrderItems, record, nextInvoiceDate),
            TotalTaxAmount: OrderInvoiceCalculations.computeTotalTaxAmount(filteredOrderItems, record, nextInvoiceDate),
            TotalPrice: OrderInvoiceCalculations.computeTotal(filteredOrderItems, record, nextInvoiceDate),
          };
        }
      }
    }

    return {
      Adjustment: undefined,
      Subtotal: '0.00',
      TotalDiscounts: '0.00',
      TotalTaxAmount: '0.00',
      TotalPrice: '0.00',
    };
  }

  render() {
    const { record, recordAssociationReducer } = this.props;
    const associationKey = `${record?.id}_${ORDER_ITEM}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    const items = [];
    if (associationObj?.[ORDER_ITEM]?.dbRecords?.length > 0) {
      items.push(...associationObj[ORDER_ITEM].dbRecords);
    }
    const totals = this.selectedItemTotals();

    // ODN-1393 add billing adjustment
    if (totals.Adjustment) {
      items.push(totals.Adjustment);
    }

    return (
      <Card type="inner" title="Order Items" style={{ marginBottom: 10, width: '100%', minWidth: 500 }}
            extra={<Button type="primary" onClick={() => this.handleOk()}>Generate Invoice</Button>}>
        <List
          size="small"
          loading={this.state.isLoading}
          dataSource={items}
          renderItem={(item: DbRecordEntityTransform) =>
            <List.Item 
              actions={
                [ <Checkbox 
                    onChange={() => this.addRemoveItem(item)}
                    defaultChecked={item.properties.Type === 'ADJUSTMENT'}
                    disabled={item.properties.Type === 'ADJUSTMENT'}
                  >Add</Checkbox>
                ]
              }
            >
              <List.Item.Meta
                title={(item.properties.Type === 'ADJUSTMENT' ? 'Adjustment - ' : '') + item.title}
                description={
                  <table width='100%'>
                    <tbody>
                      <tr>
                        <td width='70%'>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography.Text style={{ marginRight: 24 }}><strong>Billing start date: </strong>
                        {getProperty(item,'BillingStartDate')}
                      </Typography.Text>
                      <Typography.Text style={{ marginRight: 24 }}><strong>Next invoice date: </strong>
                        {getProperty(item,'NextInvoiceDate')}
                      </Typography.Text>
                      <Typography.Text style={{ marginRight: 24 }}><strong>Next billing date: </strong>
                        {getProperty(item,'NextBillingDate')}
                      </Typography.Text>
                    </div>
                        </td>
                        <td width='30%' valign='top' align='left'>
                        <Typography.Text><strong> Unit Price </strong>
                          {getProperty(item,'UnitPrice')}
                        </Typography.Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                }
              />
            </List.Item>
          }
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <div>
            { totals.Adjustment
              ? <div><strong>Subtotal excl. adjustment: </strong>
                  {(Number(totals.Subtotal) - 
                      Number(totals.Adjustment.properties.UnitPrice) * Number(totals.Adjustment.properties.Quantity)
                    ).toFixed(2)
                  }
                </div>
              : '' 
            }
            <div><strong>Subtotal: </strong>{totals.Subtotal}</div>
            <div><strong>Total Discounts: </strong>{totals.TotalDiscounts}</div>
            <div><strong>Total TaxAmount: </strong>{totals.TotalTaxAmount}</div>
            <div><strong>Total Price: </strong>{totals.TotalPrice}</div>
          </div>
        </div>
      </Card>
    );
  }

  private isItemInvoiceAble(item: DbRecordEntityTransform) {
    // Disables invoicing anything more than 2 months from today
    return moment(getProperty(item, 'NextBillingDate'), 'YYYY-MM-DD').diff(
      moment().format('YYYY-MM-DD'),
      'days',
    ) < 31;
  }

}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
  getAssociationWithNestedEntities: (params: IGetRecordAssociationWithNestedEntites, cb?: any) => dispatch(
    getRecordAssociationWithNestedEntitiesRequest(params, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(OrderGenerateInvoice);

