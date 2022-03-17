import { Button, Card, Col, Input, Layout, Popconfirm, Row, Table, Tabs } from 'antd';
import Title from 'antd/lib/typography/Title';
import React from 'react';
import { connect } from 'react-redux';
import { getPipelinesOverviewRequest } from '../../../../../core/reporting/store/actions';
import { ReportReducerState } from '../../../../../core/reporting/store/reducer';
import { httpDelete, httpGet, httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import CableForm from './CableForm';
import NoiDetailsCard from './NoiDetailsCard';
import PianoiForm from './PianoiForm';
import PolygonForm from './PolygonForm';

interface Props {
  reportReducer: ReportReducerState,
  getPipelinesOverview: any,
  alertMessage: any,
}

interface State {
  formType: string | null,
  isLoadingNoi: boolean,
  isLoadingData: boolean,
  isLoading: boolean,
  polyId: number | null,
  cableId: number | null,
  noiRef: string,
  polyData: any,
  noiData: any,
  noiRefData: any
  noiDeletedData: any
}

const { TabPane } = Tabs;
const { TextArea } = Input;

const cableIdsColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
]
const cablesColumns = [
  {
    title: 'ID',
    dataIndex: 'o_id',
    key: 'o_id',
  },
  {
    title: 'Noi ref',
    dataIndex: 'noi_ref',
    key: 'noi_ref',
  },
  {
    title: 'Inside',
    dataIndex: 'inside',
    key: 'inside',
    render: (item: boolean) => item ? 'True' : 'False',
  },
  {
    title: 'ID Type',
    dataIndex: 'id_type',
    key: 'id_type',
  },
  {
    title: 'Type Name',
    dataIndex: 'typename',
    key: 'typename',
  },
]

const resourceRelationshipsColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: 'Resource Type',
    dataIndex: 'resourceType',
    key: 'resourceType',
  },
]

class Dashboard extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      formType: null,
      isLoading: false,
      isLoadingData: false,
      isLoadingNoi: false,
      cableId: null,
      polyId: null,
      noiRef: '',
      polyData: null,
      noiData: null,
      noiRefData: null,
      noiDeletedData: null,
    }
  }


  fetchPianoi = async (noiRef: string) => {
    const { alertMessage } = this.props;
    this.setState({ isLoading: true, noiRef });

    await httpGet(
      `ProjectModule/v1.0/openreach/noi/${noiRef}`,
    ).then(res => {
        console.log()
        if (res.data.data && res.data.data.error) {
          alertMessage({
            body: res.data.data.message, type: 'error',
          });
          this.setState({ isLoading: false })
        } else {
          this.setState({ noiRefData: res.data.data, isLoading: false })
        }
      },
    ).catch(err => {
      const error = err.response ? err.response.data : undefined;
      console.log('ERROR_MESSAGE', error)
      alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

      console.error('Error while fetching: ', err);
      this.setState({ isLoading: false });
    });
  }

  fetchDataForPolygon = async (polyId: number) => {
    const { alertMessage } = this.props;
    this.setState({ isLoading: true, polyId });

    await httpGet(
      `ProjectModule/v1.0/openreach/noi/polygon/${polyId}`,
    ).then(res => {
        this.setState({ polyData: res.data.data, isLoading: false })
      },
    ).catch(err => {
      const error = err.response ? err.response.data : undefined;
      console.log('ERROR_MESSAGE', error)
      alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

      this.setState({ isLoading: false });
    });
  }

  handleSubmitNoiForPolygon = async () => {
    const { polyId } = this.state;
    const { alertMessage } = this.props;

    this.setState({ isLoadingNoi: true });

    if (polyId) {
      await httpPost(
        `ProjectModule/v1.0/openreach/noi/polygon/${polyId}`, null,
      ).then(res => {
          this.setState({ noiData: res.data.data, isLoadingNoi: false })
        },
      ).catch(err => {
        const error = err.response ? err.response.data : undefined;
        console.log('ERROR_MESSAGE', error)
        alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

        this.setState({ isLoadingNoi: false });
      });
    }
  }

  fetchDataForCable = async (cableId: number) => {
    const { alertMessage } = this.props;
    this.setState({ isLoading: true, cableId });

    console.log('FETCH DATA FOR CABLE')

    await httpGet(
      `ProjectModule/v1.0/openreach/noi/cable/${cableId}`,
    ).then(res => {
        this.setState({ polyData: res.data.data, isLoading: false })
      },
    ).catch(err => {
      const error = err.response ? err.response.data : undefined;
      console.log('ERROR_MESSAGE', error)
      alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

      this.setState({ isLoading: false });
    });

  }

  handleSubmitNoiForCable = async () => {
    const { cableId } = this.state;
    const { alertMessage } = this.props;

    this.setState({ isLoadingNoi: true });

    if (cableId) {
      await httpPost(
        `ProjectModule/v1.0/openreach/noi/cable/${cableId}`, null,
      ).then(res => {
          this.setState({ noiData: res.data.data, isLoadingNoi: false })
        },
      ).catch(err => {
        const error = err.response ? err.response.data : undefined;
        console.log('ERROR_MESSAGE', error)
        alertMessage({ body: error && error.message || 'error processing request', type: 'error' });


        console.error('Error while fetching: ', err);
        this.setState({ isLoadingNoi: false });
      });
    }
  }

  handleDeleteNoi = async () => {
    const { alertMessage } = this.props;
    const { noiRef } = this.state;

    this.setState({ isLoadingData: true });

    if (noiRef) {
      await httpDelete(
        `ProjectModule/v1.0/openreach/noi/${noiRef}`,
      ).then(res => {
          alertMessage({
            body: 'NOI deleted', type: 'success',
          });
          this.setState({ isLoadingData: false })
        },
      ).catch(err => {
        const error = err.response ? err.response.data : undefined;
        console.log('ERROR_MESSAGE', error)
        alertMessage({ body: error && error.message || 'error processing request', type: 'error' });

        console.error('Error while fetching: ', err);
        this.setState({ isLoadingData: false });
      });
    }
  }

  isOrderValid() {
    const { polyData } = this.state;

    return polyData && polyData.cables && polyData.cables.length > 0 &&
      polyData.resourceRelationships && polyData.resourceRelationships.length > 0
  }

  render() {
    const { isLoading, isLoadingData, isLoadingNoi, polyData, noiData, noiRefData } = this.state;

    return (
      <Layout style={{ padding: 8, border: '1px solid #dadada', background: '#fafafa', overflow: 'auto' }}>
        <Title level={2}>NOI</Title>

        <Tabs
          defaultActiveKey="polygon"
          className="scroll-tabs"
          type="card"
        >
          <TabPane tab="Polygon" key="polygon">
            <div style={{ display: 'flex' }}>
              <PolygonForm isLoading={isLoading} onSubmit={this.fetchDataForPolygon}/>
              <Popconfirm
                title="Are you sure you want to submit this NOI to openreach?"
                onConfirm={this.handleSubmitNoiForPolygon}
                onCancel={() => console.log('submit cancelled')}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  key="3"
                  type="primary"
                  loading={isLoadingNoi}
                  disabled={!this.isOrderValid()}
                  style={{ marginLeft: 16 }}
                >Submit</Button>
              </Popconfirm>
            </div>
            <Row gutter={16}>
              {polyData && polyData.cables && <Col span={16}>
                  <Title level={5}>Cables: {polyData.cables.length}</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <Table
                          size="small"
                          loading={isLoadingData}
                          scroll={{ y: 200 }}
                          columns={cablesColumns}
                          dataSource={polyData.cables}
                      />
                  </Card>
              </Col>}
              {polyData && polyData.resourceRelationships && polyData.resourceRelationships.length > 0 && <Col span={8}>
                  <Title level={5}>Resource Relationships: {polyData.resourceRelationships.length}</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <Table
                          size="small"
                          loading={isLoadingData}
                          scroll={{ y: 200 }}
                          columns={resourceRelationshipsColumns}
                          dataSource={polyData.resourceRelationships}
                      />
                  </Card>
              </Col>}
            </Row>

            {noiData && <Title level={4}>NOI Data</Title>}
            {noiData && <Card>
                <NoiDetailsCard data={noiData}/>
            </Card>}
          </TabPane>

          <TabPane tab="Cable" key="cable">
            <div style={{ display: 'flex' }}>
              <CableForm isLoading={isLoading} onSubmit={this.fetchDataForCable}/>
              <Popconfirm
                title="Are you sure you want to submit this NOI to openreach?"
                onConfirm={this.handleSubmitNoiForCable}
                onCancel={() => console.log('submit cancelled')}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  key="3"
                  type="primary"
                  loading={isLoadingNoi}
                  disabled={!this.isOrderValid()}
                  style={{ marginLeft: 16 }}
                >Submit</Button>
              </Popconfirm>
            </div>
            <Row gutter={16}>
              {polyData && polyData.cables && <Col span={16}>
                  <Title level={5}>Cables: {polyData.cables.length}</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <Table
                          size="small"
                          loading={isLoadingData}
                          scroll={{ y: 200 }}
                          columns={cablesColumns}
                          dataSource={polyData.cables}
                      />
                  </Card>
              </Col>}
              {polyData && polyData.resourceRelationships && polyData.resourceRelationships.length > 0 && <Col span={8}>
                  <Title level={5}>Resource Relationships: {polyData.resourceRelationships.length}</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <Table
                          size="small"
                          loading={isLoadingData}
                          scroll={{ y: 200 }}
                          columns={resourceRelationshipsColumns}
                          dataSource={polyData.resourceRelationships}
                      />
                  </Card>
              </Col>}
            </Row>

            {noiData && <Title level={4}>NOI Data</Title>}
            {noiData && <Card>
                <NoiDetailsCard data={noiData}/>
            </Card>}
          </TabPane>


          <TabPane tab="Manage" key="manage">

            <div style={{ display: 'flex' }}>
              <PianoiForm isLoading={isLoading} onSubmit={this.fetchPianoi}/>
              <Popconfirm
                title="Are you sure you want to delete this NOI?"
                onConfirm={this.handleDeleteNoi}
                onCancel={() => console.log('submit cancelled')}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  key="3"
                  danger
                  loading={isLoadingData}
                  disabled={!noiRefData}
                  style={{ marginLeft: '16px' }}>Delete</Button>
              </Popconfirm>
            </div>
            <Row gutter={16}>
              {noiRefData && noiRefData.cables && <Col span={4}>
                  <Title level={4}>Cables: {noiRefData.cables.length}</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <Table
                          size="small"
                          loading={isLoadingData}
                          scroll={{ y: 200 }}
                          columns={cableIdsColumns}
                          dataSource={noiRefData.cables.map((id: any) => ({ id }))}
                      />
                  </Card>
              </Col>}
              {noiRefData && noiRefData.noi && <Col span={20}>
                  <Title level={4}>NOI</Title>
                  <Card style={{ height: 'calc(100% - 32px)' }}>
                      <NoiDetailsCard data={noiRefData.noi}/>
                  </Card>
              </Col>}
            </Row>
          </TabPane>
        </Tabs>
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


export default connect(mapState, mapDispatch)(Dashboard);
