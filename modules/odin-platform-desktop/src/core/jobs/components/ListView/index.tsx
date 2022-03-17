import { JobStatusConstants } from '@d19n/models/dist/schema-manager/jobs/job.constants';
import { Button, Card, Popover, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { httpPost, httpPut } from '../../../../shared/http/requests';
import { displayMessage } from '../../../../shared/system/messages/store/reducers';

const duration = require('dayjs/plugin/duration')

dayjs.extend(duration)

const { Option } = Select;

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  match: any
  alertMessage: any
  filters: any
}

interface State {
  polling: NodeJS.Timeout | undefined
  isPolling: boolean
  isLoading: boolean
  jobs: any[]
  statusFilters: string[]
}

class JobsListView extends React.Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);

    this.state = {
      polling: undefined,
      isPolling: false,
      isLoading: false,
      jobs: [],
      statusFilters: [ 'PROCESSING', 'ERROR', 'CREATED' ],
    }

  }

  componentDidMount() {
    this.poll()
  }

  componentDidUpdate(prevProps: Readonly<PropsType>, prevState: Readonly<State>, snapshot?: any) {
    if (prevState.statusFilters.length !== this.state.statusFilters.length) {
      this.fetchData()
    }
  }

  componentWillUnmount() {
    this.state.polling && clearInterval(this.state.polling)
  }

  poll() {

    // you should keep track of the timeout scheduled and
    // provide a cleanup if needed
    this.state.polling && clearInterval(this.state.polling)

    if (this.state.isPolling) {
      this.setState({ isPolling: false })
      return
    }

    const polling = setInterval(() => {
      console.log('refresh data')
      this.fetchData()
    }, 10000)

    this.setState({
      polling,
      isPolling: true,
    })
  }

  /**
   *
   * @param closureType
   * @private
   */
  private async fetchData() {

    const { alertMessage, filters } = this.props;

    if (filters) {

      console.log(
        'filters',
        { ...filters, ...this.state.statusFilters.length > 0 ? { status: this.state.statusFilters } : {} },
      )

      this.setState({
        isLoading: true,
      })
      await httpPost(
        `SchemaModule/v1.0/jobs/search`,
        { ...filters, ...this.state.statusFilters.length > 0 ? { status: this.state.statusFilters } : {} },
      ).then(res => {
          console.log('new data', res.data.data)
          this.setState({
            jobs: res.data.data || [],
            isLoading: false,
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        alertMessage({ body: `${err.message}`, type: 'error' });
      });
    }
  }

  /**
   *
   * @private
   * @param jobId
   */
  private async cancelJob(jobId: string) {

    const { alertMessage } = this.props;

    if (jobId) {
      await httpPut(
        `SchemaModule/v1.0/jobs/${jobId}/cancel`,
        null,
      ).then(res => {
          this.setState({
            jobs: this.state.jobs.filter(elem => elem.job_id !== jobId),
            isLoading: false,
          })
          alertMessage({ body: `job cancelled`, type: 'success' });
          console.log('cancel job: ', res)
        },
      ).catch(err => {
        console.error('Error cancelling job: ', err);
        alertMessage({ body: `${err.message}`, type: 'error' });
      });
    }
  }

  renderStatusFilter() {
    const children = [];
    for(const i of [ 'COMPLETED', 'PROCESSING', 'CANCELLED', 'ERROR', 'CREATED' ]) {
      children.push(<Option key={i} value={i}>{i}</Option>);
    }

    return (
      //@ts-ignore
      <Select defaultValue={this.state.statusFilters} mode="tags"
              style={{ width: 600, paddingLeft: 15, paddingRight: 15, marginBottom: 12 }}
              placeholder="Status filters"
              onChange={(value: string[]) => this.setState({ isLoading: true, jobs: [], statusFilters: value })}>
        {children}
      </Select>
    )
  }

  render() {

    console.log('this.state', this.state.jobs)

    const { jobs, statusFilters } = this.state;

    const columns = [
      {
        title: 'Name', dataIndex: 'name', key: 'name', render: ((text: any, row: any) => {
          return <Popover content={
            <Space style={{ display: 'flex', flexDirection: 'column' }}>
              <h3>Payload:</h3>
              <pre>
                {JSON.stringify(row.payload, null, 2)}
              </pre>
            </Space>
          } title="Job Data">
            <Typography.Text style={{ textDecoration: 'underline' }}>{text}</Typography.Text>
          </Popover>
        }),
      },
      { title: 'Type', dataIndex: 'type', key: 'type' },
      {
        title: 'Status', dataIndex: 'status', key: 'status', render: ((text: any, row: any) => {
          if (row.status === JobStatusConstants.ERROR) {
            return <Popover content={
              <Space style={{ display: 'flex', flexDirection: 'column' }}>
                <h3>Error:</h3>
                <pre>
                {JSON.stringify(row.error, null, 2)}
              </pre>
                <h3>Metadata:</h3>
                <pre>
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
              </Space>
            } title="Error">
              <Typography.Text type="danger" style={{ textDecoration: 'underline' }}>{text}</Typography.Text>
            </Popover>
          } else {
            return <Typography.Text>{text}</Typography.Text>
          }
        }),
      },
      {
        title: 'Queued', dataIndex: 'queued_at', key: 'queued_at', render: (text: any) => text ? dayjs(text).format(
          'DD-MM-YYYY HH:mm') : null,
      },
      {
        title: 'Completed', dataIndex: 'completed_at', key: 'completed_at', render: (text: any) => text ? dayjs(text).format(
          'DD-MM-YYYY HH:mm') : null,
      },
      {
        title: 'Elapsed', dataIndex: 'elapsed_time', key: 'elapsed_time',
      },
      { title: 'User', dataIndex: 'last_modified_by', key: 'last_modified_by' },
      {
        title: 'Action',
        key: 'operation',
        render: (text: any, record: any) => <Button danger onClick={() => this.cancelJob(record.jobId)}>Cancel</Button>,
      },
    ];

    const primaryData = jobs?.map(elem => ({
      key: elem.job_id + '-' + elem.id,
      jobId: elem.job_id,
      name: elem.name,
      status: elem.status,
      type: elem.type,
      completed_at: elem.completed_at,
      queued_at: elem.queued_at,
      elapsed_time: elem.elapsed_time,
      last_modified_by: elem.last_modified_by,
      error: elem.error,
      payload: elem.payload,
      metadata: elem.metadata,
    }));

    console.log('primaryData', primaryData)


    return (
      <div style={{ width: '100%' }}>
        <Card title={'Jobs'} size="small">
          {this.renderStatusFilter()}
          <Table
            loading={this.state.isLoading}
            bordered
            scroll={{ y: 600 }}
            size="small"
            style={{ width: '100%', paddingLeft: 5, paddingRight: 15 }}
            pagination={false}
            columns={columns}
            dataSource={primaryData}
          />
        </Card>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
})

export default withRouter(connect(mapState, mapDispatch)(JobsListView));
