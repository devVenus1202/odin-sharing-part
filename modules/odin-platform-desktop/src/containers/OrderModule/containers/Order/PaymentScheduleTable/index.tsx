import React from 'react';
import { httpGet } from '../../../../../shared/http/requests';
import { Table, Tag, Tooltip } from 'antd';
import { DbRecordEntityTransform } from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";


interface Props {
  record: DbRecordEntityTransform,
}

interface State {
  data: any;
  isLoading: boolean;
}

class PaymentScheduleTable extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      data: [],
      isLoading: false,
    };
  }

  componentDidMount() {
    this.fetchPaymentSummary()
  }


  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if(prevProps.record !== this.props.record) {
      this.fetchPaymentSummary()
    }
  }

  private async fetchPaymentSummary() {

    const { record } = this.props

    if(record) {

      this.setState({ isLoading: true })

      await httpGet(
        `OrderModule/v1.0/orders/${record.id}/payments`,
      ).then(res => {
          this.setState({ data: res.data.data, isLoading: false })
        },
      ).catch(err => {
        console.error('Error while fetching Payment summary: ', err);
        this.setState({ isLoading: false });
      });

    }
  }

  getTableColumns() {
    return [
      {
        title: 'Billing Date',
        dataIndex: 'billing_date',
        key: 'billing_date',
      },
      {
        title: 'Order items',
        dataIndex: 'order_items',
        key: 'order_items',
      },
      {
        title: 'Billing period',
        dataIndex: 'billing_period',
        key: 'billing_period',
      },
      {
        title: 'Total price',
        dataIndex: 'total_price',
        key: 'total_price',
      },
    ];
  }

  getTableData(data: { [key: string]: any }[]) {
    if(data && data.length > 0) {
      return data.map((month) => {

        let TotalPrice: number = 0

        month.OrderItems.map((orderItem: any) => {
          return TotalPrice += Number(orderItem.totalPrice)
        })

        return {
          billing_date: month.Date,
          order_items: month.OrderItems.map((orderItem: any) => (
            <Tooltip placement="top" title={`Price: ${orderItem.totalPrice}`}>
              <Tag style={{ cursor: 'pointer' }}>{orderItem.orderItemTitle}</Tag>
            </Tooltip>)
          ),
          billing_period: month.OrderItems.map((orderItem: any) => {
            return orderItem.orderItemType === 'BASE_PRODUCT'
              ? <Tag color={orderItem.periodType === 'FREE' ? 'green' : 'blue'}>{orderItem.periodType}</Tag>
              : <></>
          }),
          total_price: TotalPrice.toFixed(2)
        }
      });
    }
  }

  render() {
    const { data, isLoading } = this.state;

    return (
      <div>
        <div style={{ marginTop: '10px' }}>
          <Table size="small" loading={isLoading} columns={this.getTableColumns()}
                 dataSource={this.getTableData(data.BillingMonths)}/>
        </div>
      </div>)
  }
}

export default PaymentScheduleTable