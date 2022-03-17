import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Button, Drawer, Input, Popconfirm, Result, Spin, Table, Typography } from 'antd';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import RecordProperties from '../../../../../core/records/components/DetailView/RecordProperties';
import { getRecordByIdRequest, IGetRecordById } from '../../../../../core/records/store/actions';
import AssociationDataTable from '../../../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { httpGet, httpPost } from '../../../../../shared/http/requests';

type Props = {
  userReducer: any,
  recordReducer: any,
  schemaReducer: any,
  record: DbRecordEntityTransform;
  close: () => void;
  getSchema: (payload: ISchemaByModuleAndEntity, cb: ((schema: SchemaEntity) => any)) => any;
  getRecord: (payload: IGetRecordById, cb: ((dbRecord: DbRecordEntityTransform) => any)) => any;
  isOpen: boolean;
};

type State = {
  submitting: boolean,
  fetchingCables: boolean,
  cables: any[],
  noiRef: string | undefined,
  buildComplete: DbRecordEntityTransform | undefined
}

class BuildCompleteDrawer extends Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      submitting: false,
      fetchingCables: false,
      cables: [],
      noiRef: undefined,
      buildComplete: undefined,
    }
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (prevProps.record !== this.props.record) {
      this.fetchData()
    }

    if (prevProps.isOpen !== this.props.isOpen) {
      this.fetchData()
    }

  }

  async fetchData() {
    console.log('fetching data')
    const { record, isOpen } = this.props;

    if (record && isOpen) {

      this.setState({
        fetchingCables: true,
        cables: [],
        noiRef: undefined,
      })
      await httpGet(
        `ProjectModule/v1.0/openreach/buildcomplete/cables/${record?.id}`,
      )
        .then((res) => {
          const { data } = res.data;
          console.log('data =', data);
          this.setState({
            fetchingCables: false,
            cables: data,
            noiRef: data[0] ? data[0]['noi_ref'] : undefined,
          })
        })
        .catch((err) => {
          this.setState({
            fetchingCables: false,
            noiRef: undefined,
          })
          console.error(
            'Error while fetching Intersecting Cables data from build complete route: ',
            err,
          );
        });
    }
  }

  async submitBuildComplete() {
    const { record, getRecord, getSchema, schemaReducer } = this.props;
    const { noiRef } = this.state;

    this.setState({
      submitting: true,
    })

    await httpPost(
      `ProjectModule/v1.0/openreach/transflex/buildcomplete/${record?.id}`,
      {
        cableNoiRef: noiRef,
      },
    )
      .then((res) => {
        const { data } = res.data;
        console.log('data =', data);

        // Fetch the build complete record
        getSchema({ moduleName: 'ProjectModule', entityName: 'BuildComplete' }, ((schema: SchemaEntity) => {
          getRecord({ schema, recordId: data[0]['id'] }, (dbRecord: DbRecordEntityTransform) => {
            this.setState({
              buildComplete: dbRecord,
            })
          })
        }))

        this.setState({
          submitting: false,
        })
      })
      .catch((err) => {
        this.setState({
          submitting: false,
        })
        console.error(
          'Error while fetching Intersecting Cables data from build complete route: ',
          err,
        );
      });
  }

  renderContent() {
    const { record } = this.props;
    return <AssociationDataTable
      title="Files"
      hideViewOptions={true}
      thumbnailSize={24}
      record={record}
      moduleName="SchemaModule"
      entityName="File"
      filters={[ 'Category:BUILD_COMPLETE' ]}
    />
  }

  renderIntersectCablesTable() {
    const { cables, fetchingCables } = this.state
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
      },
      {
        title: 'noi_ref',
        dataIndex: 'noi_ref',
        key: 'noi_ref',
      },
      {
        title: 'Type',
        dataIndex: 'type_name',
        key: 'type_name',
      },
    ];

    return (
      <Table
        size="small"
        loading={fetchingCables}
        columns={columns}
        dataSource={cables}
      />
    );
  };

  render() {

    const { submitting, noiRef, buildComplete } = this.state;
    const { isOpen, close } = this.props;

    return (
      <>
        <Drawer
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Popconfirm
                title="Are you sure you want to submit this build complete?"
                onConfirm={() => this.submitBuildComplete()}
                disabled={!noiRef}
                okText="Yes"
                cancelText="No"
              >
                <Button disabled={!noiRef}>Submit</Button>
              </Popconfirm>
            </div>
          }
          title={
            <Typography.Title level={4} style={{ marginBottom: '0' }}>
              Build Complete
            </Typography.Title>
          }
          destroyOnClose
          closable
          onClose={() => close()}
          visible={isOpen}
          key={1}
          width="600"
        >
          {buildComplete ?
            <Result
              status="success"
              title="Successfully Uploaded Build Complete"
              subTitle={`Submission ID: ${getProperty(buildComplete, 'SubmissionId')}`}
            >
              <RecordProperties columns={1} columnLayout="horizontal" record={buildComplete}/>
            </Result> :
            <Spin spinning={submitting} tip="Submitting build complete">
              <Typography.Title level={5} style={{ marginBottom: '1rem' }}>
                NOI Reference
              </Typography.Title>
              <div style={{ marginBottom: 16 }}>
                <Input placeholder="PIANOIXXXXXXX" value={noiRef}
                       onChange={(e) => this.setState({ noiRef: e.target.value })}/>
              </div>

              <Typography.Title level={5} style={{ marginBottom: '1rem' }}>
                Cables
              </Typography.Title>
              {this.renderIntersectCablesTable()}

              <Typography.Title level={5} style={{ marginBottom: '1rem' }}>
                File Attachments
              </Typography.Title>
              {this.renderContent()}
            </Spin>
          }
        </Drawer>
      </>
    );
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: ((schema: SchemaEntity) => {})) => dispatch(
    getSchemaByModuleAndEntityRequest(payload, cb)),
  getRecord: (
    payload: IGetRecordById,
    cb: ((dbRecord: DbRecordEntityTransform) => {}),
  ) => dispatch(getRecordByIdRequest(payload, cb)),
});

// @ts-ignore
export default connect(mapState, mapDispatch)(BuildCompleteDrawer);
