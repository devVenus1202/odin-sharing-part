import { Button, Card, Checkbox, Form, Input, Layout, Radio, Tabs } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import JobsListView from '../../../../../core/jobs/components/ListView';
import { getPipelinesOverviewRequest } from '../../../../../core/reporting/store/actions';
import { ReportReducerState } from '../../../../../core/reporting/store/reducer';
import { httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';

interface Props {
  reportReducer: ReportReducerState,
  getPipelinesOverview: any,
  alertMessage: any,
}

interface State {
  isLoadingData: boolean
  isLoading: boolean
  inventory: any
  data: any
  type: string
  polygons: any,
  polyId: string | undefined
  offset: number | undefined,
  optimizePostCodes: boolean
}

const { TabPane } = Tabs;

class Inventory extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isLoadingData: false,
      polyId: undefined,
      offset: 250,
      optimizePostCodes: true,
      inventory: {
        duct: {},
        structure: {},
      },
      data: {
        duct: [],
        structure: [],
      },
      polygons: {
        duct: null,
        structure: null,
      },
      type: 'duct',
    }

  }

  async importInventory() {

    this.setState({ isLoading: true });

    const { alertMessage } = this.props;

    const payload = {
      polygonId: this.state.polyId,
      offset: this.state.offset,
      optimizePostCodes: this.state.optimizePostCodes,
    }

    await httpPost(
      `ProjectModule/v1.0/openreach/inventory/${this.state.type}/postcode`, payload,
    ).then(res => {
        this.setState({ data: { ...this.state.data, [this.state.type]: res.data.data }, isLoading: false });
        alertMessage({ body: 'data import initiated', type: 'success' });
      },
    ).catch(err => {
      console.error('Error while fetching: ', err);
      const error = err.response ? err.response.data : undefined;
      console.log('ERROR_MESSAGE', error)
      alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

      this.setState({ inventory: err, isLoading: false });
    });
  }

  render() {
    const { isLoading } = this.state;

    console.log('this.state,', this.state)

    return (
      <Layout style={{ padding: '8px 8px 30px 8px', border: '1px solid #dadada', background: '#fafafa' }}>
        <Card
          style={{ marginBottom: 18 }}
          title={'Inventory Import'}
          extra={[
            <Button
              key="3"
              type="primary"
              onClick={() => this.importInventory()}
              loading={isLoading}
              disabled={!this.state.polyId}
              style={{ marginLeft: '12px' }}>Import</Button>,
          ]}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Form>
              <Form.Item
                className="form-item"
                name="type"
                label="Feature"
                initialValue={this.state.type}
                key={0}
                rules={[
                  {
                    required: true,
                    message: 'Please input value',
                  },
                ]}
              >
                <Radio.Group value={this.state.type} onChange={(e) => this.setState({ type: e.target.value })}>
                  <Radio.Button value="duct">Duct</Radio.Button>
                  <Radio.Button value="structure">Structure</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                className="form-item"
                name="polyId"
                label="Polygon"
                key={1}
                initialValue={this.state.polyId}
                rules={[
                  {
                    required: true,
                    message: 'Please input value',
                  },
                ]}
              >
                <Input
                  placeholder="Polygon ID"
                  onChange={(e) => this.setState({ polyId: e.target.value })}
                  style={{ width: 300 }}
                />
              </Form.Item>
              <Form.Item
                className="form-item"
                name="offset"
                label="Offset"
                key={2}
                initialValue={this.state.offset}
                rules={[
                  {
                    required: true,
                    message: 'Please input value between 100 and 500. This is the total canvas area in meters',
                  },
                ]}
              >
                <Input
                  placeholder="Offset (100 - 500)"
                  type="number"
                  min={100}
                  max={500}
                  onChange={(e) => this.setState({ offset: Number(e.target.value) })}
                  style={{ width: 300 }}
                />
              </Form.Item>
              <Form.Item
                className="form-item"
                name="optimizePostCodes"
                initialValue={this.state.optimizePostCodes}
                label="optimize postcodes" key={2}
                rules={[
                  {
                    required: true,
                    message: 'Please input value between 100 and 500. This is the total canvas area in meters',
                  },
                ]}
              >
                <Checkbox
                  checked={this.state.optimizePostCodes}
                  onChange={() => this.setState({ optimizePostCodes: !this.state.optimizePostCodes })}
                />
              </Form.Item>
            </Form>
          </div>
        </Card>
        <div>
          <JobsListView
            filters={this.state.polyId ? { metadata: { namespace: 'OPENREACH_INVENTORY' } } : undefined}/>
        </div>

      </Layout>
    )
  }
}

const mapState = (state: any) => ({
  reportReducer: state.reportReducer,
});

const mapDispatch = (dispatch: any) => ({
  getPipelinesOverview: (params: { moduleName?: string, entityName?: string }) => dispatch(getPipelinesOverviewRequest(
    params)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});


export default connect(mapState, mapDispatch)(Inventory);
