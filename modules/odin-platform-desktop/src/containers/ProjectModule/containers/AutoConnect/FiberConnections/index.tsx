import { CheckCircleTwoTone, ExclamationCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import {
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  Layout,
  List,
  PageHeader,
  Row,
  Select,
  Statistic,
  Table,
  Tabs,
  Typography,
} from 'antd';
import fileDownload from 'js-file-download';
import React from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import JobsListView from '../../../../../core/jobs/components/ListView';
import { httpDelete, httpGet, httpPost } from '../../../../../shared/http/requests';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import FeatureListWithActions from '../FeatureListWithActions';

const { Option } = Select
const { TabPane } = Tabs
const { FEATURE } = SchemaModuleEntityTypeEnums;
const { PROJECT_MODULE } = SchemaModuleTypeEnums;

type PathParams = {
  url: string,
  recordId: string
}

type PropsType = RouteComponentProps<PathParams> & {
  match: any
  alertMessage: any
}

interface State {
  polling: NodeJS.Timeout | undefined;
  exPolygonId: number | undefined,
  l2PolygonId: number | undefined,
  closureId: number | undefined,
  l1PolygonId: number | undefined,
  l1ClosureId: number | undefined,
  l0ClosureId: number | undefined,
  allClosureIds: Array<number>,
  files: any[],
  l1Files: any[],
  l0Files: any[],
  exFiles: any[],
  menuOptions: {
    closures: any[]
    polygons: any[]
  } | undefined,
  checks: {
    [key: string]: {
      odinClosureCount: string,
      gisClosureCount: string,
      odinCableCount: string,
      gisCableCount: string,
      gisClosuresNotInOdin: any[],
      gisCablesNotInOdinIds: any[],
      countClosuresWithCable: string,
      odinClosures: any[],
      gisClosures: any[],
      odinCables: any[],
      gisCables: any[],
      odinClosuresNoCables: any[],
      firstMissingCable: any[],
      closuresNotTraced: any[],
      cablesNotTraced: any[],
      checkAllCablesConnected: { [key: string]: any },
      odinClosureConnections: any[],
      odinMatches: { [key: string]: any },
      gisMatches: { [key: string]: any },
    }
  }
  connections: any,
  generateRes: any,
  applyRes: any
  rollBackRes: any,
  deleteRes: any,
  postRes: any,
  postErr: any,
  isLoading: boolean,
  isPolling: boolean,
  buttonLoading: boolean
}

class AutoConnectFibers extends React.Component<PropsType, State> {


  constructor(props: PropsType) {
    super(props);

    this.state = {
      polling: undefined,
      exPolygonId: undefined,
      l2PolygonId: undefined,
      closureId: undefined,
      l0ClosureId: undefined,
      l1PolygonId: undefined,
      l1ClosureId: undefined,
      allClosureIds: [],
      files: [],
      l1Files: [],
      l0Files: [],
      exFiles: [],
      menuOptions: undefined,
      checks: {},
      connections: undefined,
      generateRes: undefined,
      applyRes: undefined,
      rollBackRes: undefined,
      deleteRes: undefined,
      postRes: undefined,
      postErr: undefined,
      isLoading: false,
      isPolling: false,
      buttonLoading: false,
    }

  }


  componentDidMount() {

    const { match } = this.props
    const params = match.params

    if (params.exPolygonId && params.L1PolygonId && params.L2PolygonId)
      this.setState({
        exPolygonId: params.exPolygonId,
        l1PolygonId: params.L1PolygonId,
        l2PolygonId: params.L2PolygonId,
      })

    /* We will keep this parameter optional for now. */
    if (params.L0ClosureId)
      this.setState({ l0ClosureId: params.L0ClosureId })

  }

  componentDidUpdate(prevProps: Readonly<PropsType>, prevState: Readonly<State>, snapshot?: any) {

    if (prevState.l0ClosureId !== this.state.l0ClosureId) {
      this.listFilesByL0ClosureId()
    }

    if (prevState.l1PolygonId !== this.state.l1PolygonId) {
      if (!this.state.isPolling) {
        this.poll()
      }
    }

    if (prevState.closureId !== this.state.closureId) {
      this.getConnectionsByClosureId()
    }

    if (prevState.exPolygonId !== this.state.exPolygonId) {
      this.loadMenuOptions()
    }
  }

  componentWillUnmount() {
    if (this.state.polling) clearInterval(this.state.polling)
    this.setState({
      polling: undefined,
    })

  }

  loadButtonOnSubmit(ms?: number) {
    this.setState({
      buttonLoading: true,
    })

    setTimeout(() => {
      this.setState({
        buttonLoading: false,
      })
    }, ms || 1000)
  }

  poll() {

    // you should keep track of the timeout scheduled and
    // provide a cleanup if needed
    this.state.polling && clearInterval(this.state.polling)

    if (this.state.isPolling) {
      this.setState({ isPolling: false, isLoading: false })
      return
    }

    const polling = setInterval(() => {
      console.log('refresh data')
      this.refreshData()
    }, 5000)

    this.setState({
      polling,
      isPolling: true,
      isLoading: true,
    })
  }

  /**
   *
   * @param pathName
   * @param format
   * @private
   */
  private async exportSingleFile(pathName: string, format: 'json' | 'csv') {

    await httpPost(
      `ConnectModule/connections/export-file/${format}`,
      {
        pathName: pathName,
      },
    ).then(res => {
        console.log('exportSingleFile', res)
        fileDownload(format === 'json' ? JSON.stringify(res.data) : res.data, `${pathName}.${format}`);
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      // this.setState({ isLoading: false });
    });
  }

  /**
   *
   * @private
   */
  private async generateConnectionCsv() {

    const { alertMessage } = this.props;
    const { exPolygonId, l1PolygonId, l2PolygonId } = this.state;

    await httpGet(
      `ConnectModule/connections/generate-connection-csv/${exPolygonId}`,
    ).then(res => {
        console.log('generateConnectionCsv', res)
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });

    await httpGet(
      `ConnectModule/connections/generate-connection-csv/${l1PolygonId}`,
    ).then(res => {
        console.log('generateConnectionCsv', res)
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });

    await httpGet(
      `ConnectModule/connections/generate-connection-csv/${l2PolygonId}`,
    ).then(res => {
        console.log('generateConnectionCsv', res)
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });

  }

  refreshData() {

    this.checkPolygonData(this.state.l1PolygonId, undefined)
    this.checkPolygonData(this.state.l1PolygonId, this.state.l2PolygonId)
    this.listFilesByL2PolygonId()
    this.listFilesByL1PolygonId()
    this.listFilesByEXPolygonId()
    this.listFilesByL0ClosureId()
    this.getConnectionsByClosureId()

  }

  /**
   *
   * @private
   */
  private async checkPolygonData(l1PolygonId: number | undefined, l2PolygonId: number | undefined) {
    if (l1PolygonId || l2PolygonId) {

      const { l0ClosureId } = this.state;

      let path = `ConnectModule/connections/check/${l0ClosureId}?l1PolygonId=${l1PolygonId}`;
      if (l2PolygonId) {
        path = `ConnectModule/connections/check/${l0ClosureId}?l1PolygonId=${l1PolygonId}&l2PolygonId=${l2PolygonId}`;
      }

      if (this.isTraceComplete()) {
        await httpGet(
          path,
        ).then(res => {

            if (!l2PolygonId) {
              this.setState((prevState: State) => ({
                checks: {
                  ...prevState.checks,
                  [Number(l1PolygonId)]: {
                    odinClosureCount: res?.data?.data?.odinClosureCount,
                    gisClosureCount: res?.data?.data?.gisClosureCount,
                    odinCableCount: res?.data?.data?.odinCableCount,
                    gisCableCount: res?.data?.data?.gisCableCount,
                    gisClosuresNotInOdin: res?.data?.data?.gisClosuresNotInOdin,
                    gisCablesNotInOdinIds: res?.data?.data?.gisCablesNotInOdinIds,
                    countClosuresWithCable: res?.data?.data?.countClosuresWithCable,
                    odinClosures: res?.data?.data?.odinClosures,
                    gisClosures: res?.data?.data?.gisClosures,
                    odinCables: res?.data?.data?.odinCables,
                    gisCables: res?.data?.data?.gisCables,
                    odinClosuresNoCables: res?.data?.data?.odinClosuresNoCables,
                    firstMissingCable: res?.data?.data?.firstMissingCable,
                    closuresNotTraced: res?.data?.data?.closuresNotTraced,
                    cablesNotTraced: res?.data?.data?.cablesNotTraced,
                    checkAllCablesConnected: res?.data?.data?.checkAllCablesConnected,
                    odinClosureConnections: res?.data?.data?.odinClosureConnections,
                    odinMatches: res?.data?.data?.odinMatches,
                    gisMatches: res?.data?.data?.gisMatches,
                  },
                },
              }))
            }

            if (l2PolygonId) {
              this.setState((prevState: State) => ({
                checks: {
                  ...prevState.checks,
                  [Number(l2PolygonId)]: {
                    odinClosureCount: res?.data?.data?.odinClosureCount,
                    gisClosureCount: res?.data?.data?.gisClosureCount,
                    odinCableCount: res?.data?.data?.odinCableCount,
                    gisCableCount: res?.data?.data?.gisCableCount,
                    gisClosuresNotInOdin: res?.data?.data?.gisClosuresNotInOdin,
                    gisCablesNotInOdinIds: res?.data?.data?.gisCablesNotInOdinIds,
                    countClosuresWithCable: res?.data?.data?.countClosuresWithCable,
                    odinClosures: res?.data?.data?.odinClosures,
                    gisClosures: res?.data?.data?.gisClosures,
                    odinCables: res?.data?.data?.odinCables,
                    gisCables: res?.data?.data?.gisCables,
                    odinClosuresNoCables: res?.data?.data?.odinClosuresNoCables,
                    firstMissingCable: res?.data?.data?.firstMissingCable,
                    closuresNotTraced: res?.data?.data?.closuresNotTraced,
                    cablesNotTraced: res?.data?.data?.cablesNotTraced,
                    checkAllCablesConnected: res?.data?.data?.checkAllCablesConnected,
                    odinClosureConnections: res?.data?.data?.odinClosureConnections,
                    odinMatches: res?.data?.data?.odinMatches,
                    gisMatches: res?.data?.data?.gisMatches,
                  },
                },
              }))
            }
          },
        ).catch(err => {
          console.error('Error while fetching S3 files: ', err);
          this.setState({
            isLoading: false,
            postErr: err.message,
          })
        });
      }
    }
  }

  private async loadMenuOptions() {

    const { exPolygonId } = this.state;

    if (exPolygonId) {
      await httpGet(
        `ConnectModule/connections/menu-options/${exPolygonId}`,
      ).then(res => {
          this.setState({
            menuOptions: res.data.data,
          }, () => {

            /* Extract all closure ids to state */
            let closureIds: Array<number> = []

            if (res && res.data) {

              if (res.data?.data?.closures && res.data?.data?.closures?.length)
                res.data?.data?.closures.map((closure: any) => closureIds.push(Number(closure.id)))

              if (res.data?.data?.polygons?.length)
                for(const polygon of res.data?.data?.polygons!)
                  if (polygon.closures)
                    polygon.closures.map((closure: any) => closureIds.push(Number(closure.id)))

              if (closureIds.length)
                this.setState({ allClosureIds: closureIds })

            }

          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }


  private async listFilesByL0ClosureId() {

    const { l0ClosureId } = this.state;
    if (l0ClosureId) {
      await httpPost(
        `ConnectModule/connections/filesByPath`,
        { pathName: `auto-connect/l0-${l0ClosureId}` },
      ).then(res => {
          this.setState({
            l0Files: res.data.data['Contents'],
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }


  /**
   *
   * @private
   */
  private async listFilesByL2PolygonId() {

    const { l2PolygonId } = this.state;
    if (l2PolygonId) {
      await httpGet(
        `ConnectModule/connections/files/${l2PolygonId}`,
      ).then(res => {
          this.setState({
            files: res.data.data['Contents'],
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }

  /**
   *
   * @private
   */
  private async listFilesByL1PolygonId() {

    const { l1PolygonId } = this.state;
    if (l1PolygonId) {
      await httpGet(
        `ConnectModule/connections/files/${l1PolygonId}`,
      ).then(res => {
          this.setState({
            l1Files: res.data.data['Contents'],
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }

  /**
   *
   * @private
   */
  private async listFilesByEXPolygonId() {

    const { exPolygonId } = this.state;
    if (exPolygonId) {
      await httpGet(
        `ConnectModule/connections/files/${exPolygonId}`,
      ).then(res => {
          this.setState({
            exFiles: res.data.data['Contents'],
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }

  /**
   *
   * @private
   */
  private async getConnectionsByClosureId() {

    const { closureId } = this.state;
    if (closureId) {
      await httpGet(
        `ConnectModule/connections/connections/${closureId}`,
      ).then(res => {
          this.setState({
            connections: res.data.data,
          })
        },
      ).catch(err => {
        console.error('Error while fetching S3 files: ', err);
        this.setState({
          isLoading: false,
          postErr: err.message,
        })
      });
    }
  }

  /**
   *
   * @private
   * @param l1PolygonId
   * @param featureType
   */
  private async importFeaturesIntoOdin(l1PolygonId: number | undefined, featureType: string) {

    const { alertMessage } = this.props;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/import-features/${l1PolygonId}/${featureType}`,
      {},
    ).then(res => {
        alertMessage({ body: `importing ${featureType} features, allow 5-10 minutes to complete`, type: 'success' });
        this.setState({
          isLoading: false,
          postRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while importing features: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @private
   * @param closureId
   * @param l1PolygonId
   */
  private async traceGisClosuresAndCables(closureId: number | undefined, l1PolygonId: number | undefined) {
    const { alertMessage } = this.props;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/trace/${closureId}/${l1PolygonId}`,
      {},
    ).then(res => {
        alertMessage({
          body: `tracing ${closureId} for L1 polygon ${l1PolygonId} allow 5-10 minutes to complete`,
          type: 'success',
        });
        this.setState({
          isLoading: false,
          postRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @private
   * @param closureId
   * @param l1PolygonId
   */
  private async createClosureCableConnections(closureId: number | undefined, l1PolygonId: number | undefined) {

    const { alertMessage } = this.props;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/cable-connections/${closureId}/${l1PolygonId}`,
      {},
    ).then(res => {
        alertMessage({
          body: `connecting cables for L1 polygon ${l1PolygonId} allow 5-10 minutes to complete`,
          type: 'success',
        });

        this.setState({
          isLoading: false,
          postRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @private
   * @param closureId
   * @param l2PolygonId
   * @param l1PolygonId
   */
  private async generateLoopFiberTemplates(
    closureId: number | undefined,
    l2PolygonId: number | undefined,
    l1PolygonId: any,
  ) {

    const { alertMessage } = this.props;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/loop-cable-fiber-mappings/${closureId}/${l1PolygonId}?l2PolygonId=${l2PolygonId}`,
      {},
    ).then(res => {

        alertMessage({ body: `Loop fiber templates are being created allow 5-10 minutes to complete`, type: 'success' });

        this.setState({
          isLoading: false,
          postRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @param closureType
   * @private
   */
  private async connectLoopFibers(closureId: number | undefined, l2PolygonId: number | undefined, l1PolygonId: any) {

    const { alertMessage } = this.props;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/loop-cable-fiber-connections/${closureId}/${l1PolygonId}?l2PolygonId=${l2PolygonId}`,
      {},
    ).then(res => {

        alertMessage({
          body: `Loop fiber connections are being created allow 5-10 minutes to complete`,
          type: 'success',
        });

        this.setState({
          isLoading: false,
          postRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }


  /**
   *
   * @param closureType
   * @private
   */
  private async generateTemplates(polygonId: number | undefined, closureType: string, ms?: number) {

    const { alertMessage } = this.props;
    const { l0ClosureId, l1ClosureId, l1PolygonId } = this.state;

    let path = `ConnectModule/connections/${closureType.toLowerCase()}-fiber-connection-template/${l0ClosureId}/${l1PolygonId}/${polygonId}`;
    if (closureType === 'L1') {
      path = `ConnectModule/connections/${closureType.toLowerCase()}-fiber-connection-template/${l0ClosureId}/${l1PolygonId}?l1ClosureId=${l1ClosureId}`;
    }
    if (closureType === 'L0') {
      path = `ConnectModule/connections/${closureType.toLowerCase()}-fiber-connection-template/${l0ClosureId}/${polygonId}`;
    }

    this.loadButtonOnSubmit()

    await httpPost(
      path,
      {},
    ).then(res => {

        alertMessage({
          body: `${closureType} fiber templates are being created allow 5-10 minutes to complete`,
          type: 'success',
        });

        this.setState({
          isLoading: false,
          // generateRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @param closureType
   * @private
   */
  private async applyTemplates(polygonId: number | undefined, closureType: string, ms?: number) {

    const { alertMessage } = this.props;
    const { l0ClosureId } = this.state;

    this.loadButtonOnSubmit()

    await httpPost(
      `ConnectModule/connections/apply-template/${l0ClosureId}/${polygonId}/${closureType}`,
      {},
    ).then(res => {
        console.log('res', res)

        alertMessage({
          body: `${closureType} fiber connections are being created allow 5-10 minutes to complete`,
          type: 'success',
        });

        this.setState({
          isLoading: false,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      alertMessage({ body: `${err.message}`, type: 'error' });
      this.setState({
        isLoading: false,
        buttonLoading: false,
        postErr: err.message,
      })
    });
  }

  /**
   *
   * @param closureType
   * @private
   */
  private async rollBack(polygonId: number | undefined, closureType: string, closureId?: number) {

    const { alertMessage } = this.props;

    const path = closureId ? `ConnectModule/connections/fiber-connections/${polygonId}/${closureType}?closureId=${closureId}` : `ConnectModule/connections/fiber-connections/${polygonId}/${closureType}`

    this.loadButtonOnSubmit()

    await httpDelete(
      path,
    ).then(res => {

        alertMessage({
          body: `${closureType} fiber connections are being reset allow 5-10 minutes to complete`,
          type: 'success',
        });

        this.setState({
          isLoading: false,
          rollBackRes: res.data.data,
        })
      },
    ).catch(err => {
      console.error('Error while fetching S3 files: ', err);
      // this.setState({ isLoading: false });
      this.setState({
        isLoading: false,
        rollBackRes: err,
      })
    });
  }

  renderAlertsOverview(polygonId: number | undefined) {

    const { checks } = this.state;

    if (checks[String(polygonId)] && checks[String(polygonId)]['firstMissingCable']) {

      const firstMissingCable = checks[String(polygonId)]['firstMissingCable'];

      if (firstMissingCable && firstMissingCable.length > 0) {
        return <Card title={`Closures not connected (${checks[String(polygonId)]['odinClosuresNoCables'].length})`}
                     size="small" style={{ marginTop: 16 }}>
          <List
            size="small"
            bordered
            dataSource={firstMissingCable}
            renderItem={(item: { ext_ref: string, type: string, l2_poly: string }) =>
              <List.Item>closure_id: <Link target="_blank"
                                           to={`/ProjectModule/Map/CLOSURE/${item['ext_ref']}`}>{item['ext_ref']}</Link> type: {item['type']}
              </List.Item>}
          />
        </Card>
      }
    }
  }

  renderCablesNotInOdin(polygonId: number | undefined) {

    const { checks } = this.state;

    if (checks[String(polygonId)] && checks[String(polygonId)]['gisCablesNotInOdinIds']) {

      const gisCablesNotInOdinIds = checks[String(polygonId)]['gisCablesNotInOdinIds'];

      return <Card title={`Cable Missing L2 Id(${checks[String(polygonId)]['gisCablesNotInOdinIds'].length})`}
                   size="small" style={{ marginTop: 16 }}>
        <List
          size="small"
          bordered
          dataSource={gisCablesNotInOdinIds}
          renderItem={(item) =>
            <List.Item>cable_id: <Link target="_blank"
                                       to={`/ProjectModule/Map/CABLE/${item}`}>{item}</Link></List.Item>}
        />
      </Card>
    }
  }

  renderClosuresNotInOdin(polygonId: number | undefined) {

    const { checks } = this.state;

    if (checks[String(polygonId)] && checks[String(polygonId)]['gisClosuresNotInOdin']) {

      const gisClosuresNotInOdin = checks[String(polygonId)]['gisClosuresNotInOdin'];

      return <Card title={`Closures Missing L2 Id (${checks[String(polygonId)]['gisClosuresNotInOdin'].length})`}
                   size="small" style={{ marginTop: 16 }}>
        <List
          size="small"
          bordered
          dataSource={gisClosuresNotInOdin}
          renderItem={(item: { id: number }) =>
            <List.Item>closure_id: <Link target="_blank"
                                         to={`/ProjectModule/Map/CLOSURE/${item['id']}`}>{item['id']}</Link></List.Item>}
        />
      </Card>
    }
  }


  renderPlanningCheck(polygonId: number | undefined, polygonType: string) {

    const { checks, isLoading } = this.state;

    return (
      <Card title={`${polygonType} Quantity Check`} size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col>
            {polygonType !== 'L2' &&
                <div style={{ display: 'flex' }}>
                    <Typography.Text strong style={{ marginRight: 8 }}>Spine:</Typography.Text>
                    <Typography.Text>{checks[String(polygonId)]?.gisMatches?.spine ?
                      <CheckCircleTwoTone twoToneColor="#52c41a"/> : <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>
                    }</Typography.Text>
                </div>
            }
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Access:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.gisMatches?.access ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Distribution:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.gisMatches?.distribution ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Feed:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.gisMatches?.feed ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  renderCableConnectionCheck(polygonId: number | undefined, polygonType: string) {

    const { checks } = this.state;

    return (
      <Card title={`${polygonType} Cables Connected`} size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col>
            {polygonType !== 'L2' && <div style={{ display: 'flex' }}>
                <Typography.Text strong style={{ marginRight: 8 }}>Spine:</Typography.Text>
                <Typography.Text>{checks[String(polygonId)]?.checkAllCablesConnected?.spine ?
                  <CheckCircleTwoTone twoToneColor="#52c41a"/> : <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>
                }</Typography.Text>
            </div>}
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Distribution:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.checkAllCablesConnected?.distribution ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Access:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.checkAllCablesConnected?.access ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
            <div style={{ display: 'flex' }}>
              <Typography.Text strong style={{ marginRight: 8 }}>Feed:</Typography.Text>
              <Typography.Text>{checks[String(polygonId)]?.checkAllCablesConnected?.feed ?
                <CheckCircleTwoTone twoToneColor="#52c41a"/> :
                <ExclamationCircleTwoTone twoToneColor="#eb2f96"/>}</Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  renderCablesNotTraced(polygonId: number | undefined, polygonType: string) {

    const { checks } = this.state;

    return (
      <Card title={`${polygonType} Cables Not Traced`} size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col>
            <div>
              {checks[String(polygonId)]?.cablesNotTraced?.filter(elem => {
                if (polygonType === 'L1') {
                  if (elem['type'] === 'Spine') {
                    return true;
                  } else return false;
                }
                return true;
              }).sort((
                elemA,
                elemB,
              ) => String(elemA).localeCompare(String(elemB))).map((elem: { [x: string]: React.ReactNode; }) => (
                <div>{elem['type']}
                  <Link target="_blank" to={`/ProjectModule/Map/CABLE/${elem['id']}`}>{elem['id']}</Link>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  renderClosuresNotTraced(polygonId: number | undefined, polygonType: string) {

    const { checks } = this.state;

    return (
      <Card title={`${polygonType} Closures Not Traced`} size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col>
            <div>
              {checks[String(polygonId)]?.closuresNotTraced?.filter(elem => {
                if (polygonType === 'L1') {
                  if ([ 'L0', 'L1' ].includes(elem['type'])) {
                    return true;
                  } else return false;
                }
                return true;
              }).sort((
                elemA,
                elemB,
              ) => String(elemA).localeCompare(String(elemB))).map((elem: { [x: string]: React.ReactNode; }) => (
                <div>{elem['type']}
                  <Link target="_blank" to={`/ProjectModule/Map/CLOSURE/${elem['id']}`}>{elem['id']}</Link>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>
    )
  }

  renderOverviewCard(polygonId: number | undefined, polygonType: string) {

    const { checks, isLoading } = this.state;

    return (
      <Card title={`${polygonType} Feature Overview`} size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col>
            <div>
              <Typography.Text strong underline>GIS Closures</Typography.Text>
              {checks[String(polygonId)]?.gisClosures?.map((elem: { [x: string]: React.ReactNode; }) => (
                <div>
                  <Typography.Text strong style={{ marginRight: 8 }}>{elem['type']}:</Typography.Text>
                  <Typography.Text>{elem['count']}</Typography.Text>
                </div>
              ))}
            </div>
          </Col>
          <Col>
            <div>
              <Typography.Text strong underline>Odin Closures</Typography.Text>
              {checks[String(polygonId)]?.odinClosures?.map((elem: { [x: string]: React.ReactNode; }) => (
                <div>
                  <Typography.Text strong style={{ marginRight: 8 }}>{elem['type']}:</Typography.Text>
                  <Typography.Text>{elem['count']}</Typography.Text>
                </div>
              ))}
            </div>
          </Col>
          <Col>
            <div>
              <Typography.Text strong underline>GIS Cables </Typography.Text>
              {checks[String(polygonId)]?.gisCables?.map((elem: { [x: string]: React.ReactNode; }) => (
                <div>
                  <Typography.Text strong style={{ marginRight: 8 }}>{elem['type']}:</Typography.Text>
                  <Typography.Text>{elem['count']}</Typography.Text>
                </div>
              ))}
            </div>
          </Col>
          <Col>
            <div>
              <Typography.Text strong underline>Odin Cables </Typography.Text>
              {checks[String(polygonId)]?.odinCables?.map((elem: { [x: string]: React.ReactNode; }) => (
                <div>
                  <Typography.Text strong style={{ marginRight: 8 }}>{elem['type']}:</Typography.Text>
                  <Typography.Text>{elem['count']}</Typography.Text>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>
    )
  }


  handleInputChange(params: { key: string, value: any }) {
    //@ts-ignore
    this.setState({
      [params['key']]: params.value,
    })
  }


  render() {

    const {
      exPolygonId,
      menuOptions,
      l1PolygonId,
      l2PolygonId,
      closureId,
      l0ClosureId,
      l1ClosureId,
      files,
      l0Files,
      l1Files,
      exFiles,
      connections,
      generateRes,
      buttonLoading,
      rollBackRes,
      applyRes,
    } = this.state

    const { match } = this.props

    console.log('menuOptions', menuOptions)

    return (<Layout className="record-detail-view">
      <PageHeader
        style={{ background: '#fff' }} title={'Connections'}
        extra={[
          <InputNumber step={0} style={{ width: 130 }} placeholder={'Ex polygon id'}
                       value={exPolygonId}
                       onChange={(value) => this.setState({ exPolygonId: Number(value) })}/>,
          <Select
            style={{ width: 130 }}
            disabled={!menuOptions}
            defaultValue={match.params.L0ClosureId ? match.params.L0ClosureId : l0ClosureId}
            onChange={(val) => this.handleInputChange({
              key: `l0ClosureId`,
              value: val,
            })}
          >
            <Option value="">Select L0 Closure</Option>
            {menuOptions && menuOptions?.closures?.sort((
              a: { id: string },
              b: { id: string },
            ) => Number(a['id']) - Number(b['id'])).map((elem: { [x: string]: number; }) => (
              <Option value={elem['id']}>{elem['id']}</Option>
            ))}
          </Select>,
          <Select
            style={{ width: 130 }}
            disabled={!menuOptions}
            defaultValue={match.params.L1PolygonId ? match.params.L1PolygonId : l1PolygonId}
            allowClear
            onChange={(val) => this.handleInputChange({
              key: `l1PolygonId`,
              value: val,
            })}
          >
            <Option value="">Select L1 Polygon</Option>
            {menuOptions && menuOptions?.polygons?.sort((
              a: { id: string },
              b: { id: string },
            ) => Number(a['id']) - Number(b['id'])).map((elem: { [x: string]: number; }) => (
              <Option value={elem['id']}>{elem['id']}</Option>
            ))}
          </Select>,

          <Select
            style={{ width: 130 }}
            disabled={!menuOptions}
            defaultValue={match.params.L2PolygonId ? match.params.L2PolygonId : l2PolygonId}
            allowClear
            onChange={(val) => this.handleInputChange({
              key: `l2PolygonId`,
              value: val,
            })}
          >
            <Option value="">Select L2 Polygon</Option>
            {menuOptions && menuOptions?.polygons?.find(elem => elem['id'] === Number(l1PolygonId))?.polygons?.sort((
              a: { id: string },
              b: { id: string },
            ) => Number(a['id']) - Number(b['id'])).map((elem: { [x: string]: number; }) => (
              <Option value={elem['id']}>{elem['id']}</Option>
            ))}
          </Select>,

          <Button onClick={() => {
            this.poll()
          }}>{this.state.isPolling ?
            <Typography.Text strong style={{ color: '#52c41a' }}><LoadingOutlined color="#52c41a"/> Auto refresh
              enabled</Typography.Text> : 'Refresh Disabled'}</Button>,
        ]}/>

      <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
        <Col xs={24} sm={24} md={24} lg={6}>
          <div className="record-detail-center-panel">

            <Card title="Splicing Files" size="small" style={{ marginTop: 16 }} extra={[
              <Button disabled={!l1PolygonId && !l2PolygonId} style={{ marginRight: 12, width: 100 }}
                      onClick={() => this.generateConnectionCsv()}>Generate</Button>,
            ]}>
              <List
                size="small"
                bordered
                dataSource={[
                  ...files,
                  ...l1Files,
                  ...l0Files,
                  ...exFiles,
                ].filter(elem => elem['Key'].indexOf('/connections/') > -1)}
                renderItem={item => <List.Item
                  actions={[
                    <a key="list-loadmore-edit" onClick={() => this.exportSingleFile(item['Key'], 'csv')}>export</a>,
                  ]}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography.Text strong>
                      {getFileName(item['Key'])}
                    </Typography.Text>
                    <div>
                      {item['LastModified']}
                    </div>
                  </div>
                </List.Item>
                }
              />
            </Card>

            <Card title="Trace Files" size="small" style={{ marginTop: 16 }}>
              <List
                size="small"
                bordered
                dataSource={[
                  ...l0Files,
                ].filter(elem => elem['Key'].indexOf(`${l1PolygonId}`) > -1)}
                renderItem={item => <List.Item
                  actions={[
                    <a key="list-loadmore-edit" onClick={() => this.exportSingleFile(item['Key'], 'json')}>export</a>,
                  ]}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography.Text strong>
                      {getFileName(item['Key'])}
                    </Typography.Text>
                    <div>
                      {item['LastModified']}
                    </div>
                  </div>
                </List.Item>}
              />
            </Card>

            <Card title="Fiber Conn. Templates" size="small" style={{ marginTop: 16 }}>
              <List
                size="small"
                bordered
                dataSource={[
                  ...files,
                  ...l1Files,
                  ...l0Files,
                  ...exFiles,
                ].filter(elem => elem['Key'].indexOf('template') > -1 || elem['Key'].indexOf('loop-fiber') > -1)}
                renderItem={item => <List.Item
                  actions={[
                    <a key="list-loadmore-edit" onClick={() => this.exportSingleFile(item['Key'], 'json')}>export</a>,
                  ]}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography.Text strong>
                      {getFileName(item['Key'])}
                    </Typography.Text>
                    <div>
                      {item['LastModified']}
                    </div>
                  </div>
                </List.Item>}
              />
            </Card>
          </div>
        </Col>

        <Col xs={24} sm={24} md={24} lg={18}>

          <Tabs style={{ background: '#fff', padding: 16, margin: 16 }} defaultActiveKey="1">
            <TabPane tab="Planning" key="1">
              <Card title="Check Planning"
                    size="small"
                    style={{ marginTop: 16 }}
                    extra={[
                      <Button
                        type="primary"
                        loading={buttonLoading}
                        disabled={!l0ClosureId || !l1PolygonId}
                        style={{ marginRight: 12, width: 100 }}
                        onClick={() => this.traceGisClosuresAndCables(l0ClosureId, l1PolygonId)}>Trace</Button>,
                    ]}>

                <Row gutter={16}>
                  <Col span={12}>
                    {this.renderPlanningCheck(l1PolygonId, 'L1')}
                  </Col>
                  <Col span={12}>
                    {this.renderPlanningCheck(l2PolygonId, 'L2')}
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    {this.renderCablesNotTraced(l1PolygonId, 'L1')}
                  </Col>
                  <Col span={6}>
                    {this.renderClosuresNotTraced(l1PolygonId, 'L1')}
                  </Col>
                  <Col span={6}>
                    {this.renderCablesNotTraced(l2PolygonId, 'L2')}
                  </Col>
                  <Col span={6}>
                    {this.renderClosuresNotTraced(l2PolygonId, 'L2')}
                  </Col>
                </Row>
              </Card>

            </TabPane>


            <TabPane tab="Feature List" key="2">
              <FeatureListWithActions entityName={FEATURE} moduleName={PROJECT_MODULE}
                                      featureIds={this.state.allClosureIds!}/>
            </TabPane>


            <TabPane tab="Data Sync" key="3"
                     disabled={!l2PolygonId || this.isMissingClosures(l2PolygonId) || this.isMissingCables(l2PolygonId)}>
              <Card title="Data Sync"
                    size="small"
                    style={{ marginTop: 16 }}
                    extra={[
                      <Button type="primary"
                              loading={buttonLoading}
                              disabled={!l2PolygonId && this.isMissingClosures(l2PolygonId)}
                              style={{ marginRight: 12, width: 100 }}
                              onClick={() => this.importFeaturesIntoOdin(l1PolygonId, 'CLOSURE')}>Closures</Button>,

                      <Button type="primary"
                              loading={buttonLoading}
                              disabled={!l2PolygonId && (this.isMissingClosures(l2PolygonId) || !this.isClosureImportSuccessful())}
                              style={{ marginRight: 12, width: 100 }}
                              onClick={() => this.importFeaturesIntoOdin(l1PolygonId, 'CABLE')}>Cables</Button>,
                    ]}>
                <Row gutter={16}>

                  <Col span={12}>
                    {this.renderOverviewCard(l1PolygonId, 'L1')}
                  </Col>

                  <Col span={12}>
                    <div style={{ display: 'flex' }}>
                      <div style={{ marginRight: 32 }}>
                        {this.renderClosureImportCheck(l1PolygonId)}
                      </div>
                      <div>
                        {this.renderCableImportCheck(l1PolygonId)}
                      </div>
                    </div>

                  </Col>
                </Row>
                <Row gutter={16}>

                  <Col span={12}>
                    {this.renderOverviewCard(l2PolygonId, 'L2')}
                    <div style={{ display: 'flex' }}>
                      <div>
                        {this.renderCablesNotInOdin(l2PolygonId)}
                      </div>
                      <div>
                        {this.renderClosuresNotInOdin(l2PolygonId)}
                      </div>
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ display: 'flex' }}>
                      <div style={{ marginRight: 32 }}>
                        {this.renderClosureImportCheck(l2PolygonId)}
                      </div>
                      <div>
                        {this.renderCableImportCheck(l2PolygonId)}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </TabPane>
            <TabPane tab="Cable Connections" key="4"
                     disabled={!l2PolygonId || !this.isCableImportSuccessful() || !this.isClosureImportSuccessful() || this.isMissingClosures(
                       l2PolygonId) || this.isMissingCables(l2PolygonId)}>
              <Card title="Cable Connections"
                    size="small"
                    style={{ marginTop: 16 }}
                    extra={[
                      <Button type="primary"
                              loading={buttonLoading}
                              disabled={!this.isClosureImportSuccessful() || !this.isCableImportSuccessful() || this.isMissingClosures(
                                l2PolygonId)}
                              style={{ marginRight: 12, width: 100 }}
                              onClick={() => this.createClosureCableConnections(l0ClosureId, l1PolygonId)}>Connect
                      </Button>,
                    ]}>

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      {this.renderCableConnectionCheck(l1PolygonId, 'L1')}
                    </div>
                    <div>
                      {this.renderAlertsOverview(l1PolygonId)}
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ display: 'flex' }}>
                      <div>
                        {this.renderCableConnectionSummary(l1PolygonId)}
                      </div>
                    </div>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      {this.renderCableConnectionCheck(l2PolygonId, 'L2')}
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div>
                        {this.renderCablesNotInOdin(l2PolygonId)}
                      </div>
                      <div>
                        {this.renderClosuresNotInOdin(l2PolygonId)}
                      </div>
                      <div>
                        {this.renderAlertsOverview(l2PolygonId)}
                      </div>
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ display: 'flex' }}>
                      <div>
                        {this.renderCableConnectionSummary(l2PolygonId)}
                      </div>
                    </div>
                  </Col>
                </Row>

              </Card>
            </TabPane>
            <TabPane tab="Fiber Connections (L4 - L2)" key="5"
                     disabled={!l2PolygonId || this.isMissingClosures(l2PolygonId) || !this.isL2CableConnectionsSuccessful()}>
              <Card title="Fiber Connections"
                    size="small"
                    style={{ marginTop: 16 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {this.renderOverviewCard(l2PolygonId, 'L2')}
                    <div style={{ display: 'flex' }}>
                      <Statistic style={{ marginRight: 16 }} title="Loop Templates"
                                 value={this.getTotalLoopTemplates()}
                                 suffix={`/ ${this.getTotalLoopTemplatesApplied()}`}
                      />
                      <Statistic style={{ marginRight: 16 }} title="L2 Templates"
                                 value={this.getTotalL2Templates()}
                                 suffix={`/ ${this.getTotalL2TemplatesApplied()}`}

                      />
                      <Statistic style={{ marginRight: 16 }} title="L4 Templates"
                                 value={this.getTotalL4Templates()}
                                 suffix={`/ ${this.getTotalL4TemplatesApplied()}`}
                      />
                      <Statistic style={{ marginRight: 16 }} title="LM Templates"
                                 value={this.getTotalLMTemplates()}
                                 suffix={`/ ${this.getTotalLMTemplatesApplied()}`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 16, display: 'flex' }}>
                      <Button type="primary"
                              loading={buttonLoading}
                              disabled={this.isLoopFiberConnectionsDisabled()}
                              style={{ marginRight: 12, width: 100 }}
                              onClick={() => this.generateLoopFiberTemplates(l0ClosureId, l2PolygonId, l1PolygonId)}>Set
                        Loop
                      </Button>
                      <Button type="primary"
                              loading={buttonLoading}
                              disabled={!this.isLoopSetComplete()}
                              style={{ marginRight: 12, width: 100 }}
                              onClick={() => this.connectLoopFibers(l0ClosureId, l2PolygonId, l1PolygonId)}>Save Loop
                      </Button>
                    </div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={!this.isLoopSaveComplete() || this.isLoopFiberConnectionsDisabled()}
                                style={{ marginRight: 12, width: 100 }}
                                onClick={() => this.generateTemplates(l2PolygonId, 'L4', 60000)}>Set L4</Button>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={!this.isL4LmSetComplete() || this.isL4LmSaveComplete() || this.isLoopFiberConnectionsDisabled()}
                                style={{ marginRight: 12, width: 100 }}
                                onClick={() => this.applyTemplates(l2PolygonId, 'L4', 30000)}>Save L4</Button>
                      </div>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={this.getTotalL2Templates() > 0 || files.length < 1 || this.getTotalL4Templates() < 1 || this.isLoopFiberConnectionsDisabled()}
                                danger
                                onClick={() => this.rollBack(l2PolygonId, 'L4')}
                                style={{ marginRight: 12, width: 100 }}>Rollback L4</Button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                style={{ marginRight: 12, width: 100 }}
                                disabled={!this.isLoopSetComplete() || !this.isLoopSaveComplete() || this.isLoopFiberConnectionsDisabled()}
                                onClick={() => this.generateTemplates(l2PolygonId, 'L2', 60000)}>Set L2</Button>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={this.getTotalL2Templates() < 1 || this.isLoopFiberConnectionsDisabled()}
                                style={{ marginRight: 12, width: 100 }}
                                onClick={() => this.applyTemplates(l2PolygonId, 'L2', 30000)}>Save L2</Button>
                      </div>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={this.getTotalL2Templates() < 1 || files.length < 1 || this.isLoopFiberConnectionsDisabled()}
                                danger
                                onClick={() => this.rollBack(l2PolygonId, 'L2')}
                                style={{ marginRight: 12, width: 100 }}>
                          Rollback L2
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="Splicing Matrix" size="small" style={{ marginTop: 16 }} extra={[
                <InputNumber step={0} style={{ width: 130 }} placeholder={'Closure id'}
                             value={closureId}
                             onChange={(value) => this.setState({ closureId: Number(value) })}/>,
              ]}>
                <Table size="small" pagination={false} columns={columns} dataSource={connections}/>
              </Card>
            </TabPane>

            <TabPane tab="Fiber Connections (L1 - L0)" key="6"
                     disabled={!l1PolygonId || !this.isL1CableConnectionsSuccessful()}>
              <Card title="Fiber Connections"
                    size="small"
                    style={{ marginTop: 16 }}
                    extra={[
                      <Select
                        style={{ width: 130 }}
                        disabled={!menuOptions}
                        defaultValue={l1ClosureId}
                        allowClear
                        onChange={(val) => this.handleInputChange({
                          key: `l1ClosureId`,
                          value: val,
                        })}
                      >
                        <Option value="">Select L1 Closure</Option>
                        {menuOptions && menuOptions?.polygons?.find(elem => elem['id'] === l1PolygonId)?.closures?.sort().map(
                          (elem: { [x: string]: number; }) => (
                            <Option value={elem['id']}>{elem['id']}</Option>
                          ))}
                      </Select>,
                    ]}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    {this.renderOverviewCard(l1PolygonId, 'L1')}
                    <div style={{ display: 'flex' }}>
                      <Statistic style={{ marginRight: 16 }} title="L1 Templates"
                                 value={this.getTotalL1Templates()}
                                 suffix={`/ ${this.getTotalL1TemplatesApplied()}`}
                      />
                      <Statistic style={{ marginRight: 16 }} title="L0 Templates"
                                 value={this.getTotalL0Templates()}
                                 suffix={`/ ${this.getTotalL0TemplatesApplied()}`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                style={{ marginRight: 12, width: 100 }}
                                disabled={!l1ClosureId}
                                onClick={() => this.generateTemplates(undefined, 'L1')}>Set L1</Button>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={!this.isL1SetComplete()}
                                style={{ marginRight: 12, width: 100 }}
                                onClick={() => this.applyTemplates(l1PolygonId, 'L1')}>Save L1</Button>
                      </div>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={this.getTotalL1Templates() < 1 || l1Files.length < 1}
                                danger
                                onClick={() => this.rollBack(l1PolygonId, 'L1', l1ClosureId)}
                                style={{ marginRight: 12, width: 100 }}>
                          Rollback L1
                        </Button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                style={{ marginRight: 12, width: 100 }}
                                disabled={!this.isL1SetComplete()}
                                onClick={() => this.generateTemplates(exPolygonId, 'L0')}>Set L0</Button>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={!this.isL0SetComplete()}
                                style={{ marginRight: 12, width: 100 }}
                                onClick={() => this.applyTemplates(exPolygonId, 'L0')}>Save L0</Button>
                      </div>
                      <div>
                        <Button type="primary"
                                loading={buttonLoading}
                                disabled={this.getTotalL1Templates() < 1 || l1Files.length < 1}
                                danger
                                onClick={() => this.rollBack(exPolygonId, 'L0', l0ClosureId)}
                                style={{ marginRight: 12, width: 100 }}>
                          Rollback L0
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
              <Card title="Splicing Matrix" size="small" style={{ marginTop: 16 }} extra={[
                <InputNumber step={0} style={{ width: 130 }} placeholder={'Closure id'}
                             value={closureId}
                             onChange={(value) => this.setState({ closureId: Number(value) })}/>,
              ]}>
                <Table size="small" pagination={false} columns={columns} dataSource={connections}/>
              </Card>
            </TabPane>
          </Tabs>

          <Row gutter={16}>
            <Col span={24} style={{ padding: 24 }}>
              <JobsListView filters={l1PolygonId ? {
                metadataOr: [
                  { l1PolygonId: `${l1PolygonId}` },
                  { polygonId: `${l1ClosureId ? l1PolygonId : l2PolygonId}` },
                ],
              } : undefined}/>
            </Col>
          </Row>
        </Col>
      </Row>
    </Layout>)
  }


  private isTraceComplete() {
    const { l0Files, l1PolygonId } = this.state;

    const file = l0Files.find(elem => elem['Key'].indexOf(`closure-cable-traces-gis-l1-polygon-${l1PolygonId}`) > -1);
    if (file) {
      return true
    }
    return false
  }

  private isMissingClosures(polygonId: number | undefined) {
    const { checks } = this.state;

    if (!checks[String(polygonId)]) {
      return true;
    } else if (checks[String(polygonId)] && checks[String(polygonId)]['closuresNotTraced']) {

      return checks[String(polygonId)]['closuresNotTraced'].length > 1

    } else {
      return true
    }
  }

  private isMissingCables(polygonId: number | undefined) {
    const { checks } = this.state;

    if (!checks[String(polygonId)]) {
      return true;
    } else if (checks[String(polygonId)] && checks[String(polygonId)]['cablesNotTraced']) {

      return checks[String(polygonId)]['cablesNotTraced'].length > 1

    } else {
      return true
    }
  }

  private isLoopSetComplete() {

    const totalTemplates = this.getTotalLoopTemplates();

    return totalTemplates === 3

  }

  private isLoopSaveComplete() {

    const totalTemplates = this.getTotalLoopTemplatesApplied();

    return totalTemplates === 3

  }

  private isL4LmSetComplete() {

    const totalLmTemplates = this.getTotalLMTemplates();
    const totalL4Templates = this.getTotalL4Templates();

    const feedCount = this.getL2CableCountByCableType('Feed')

    console.log('totalLmTemplates', totalLmTemplates)
    console.log('totalL4Templates', totalL4Templates)
    console.log('feedCount', feedCount)
    if (totalL4Templates > 0 || totalLmTemplates > 0) {
      return totalLmTemplates + totalL4Templates === feedCount
    }
    return false

  }

  private isL4LmSaveComplete() {

    const totalLmTemplates = this.getTotalLMTemplatesApplied();
    const totalL4Templates = this.getTotalL4TemplatesApplied();

    const cableCount = this.getL2CableCountByCableType('Feed')
    if (totalL4Templates > 0 || totalLmTemplates > 0) {
      return totalLmTemplates + totalL4Templates === cableCount
    }
    return false
  }

  private isL2SetComplete() {

    const totalL2Templates = this.getTotalL2Templates();

    const cableCount = this.getL2CableCountByCableType('Distribution')
    if (totalL2Templates > 0) {
      return totalL2Templates <= cableCount
    }
    return false
  }

  private isL2SaveComplete() {

    const totalL2Templates = this.getTotalL2TemplatesApplied();

    const cableCount = this.getL2CableCountByCableType('Distribution')

    if (totalL2Templates > 0) {
      return totalL2Templates <= cableCount
    }

    return false

  }

  private isL1SetComplete() {

    const totalL1Templates = this.getTotalL1Templates();

    const cableCount = this.getL1CableCountByCableType('Spine')
    if (totalL1Templates > 0) {
      return totalL1Templates <= cableCount
    }
    return false
  }

  private isL1SaveComplete() {

    const totalL1Templates = this.getTotalL1TemplatesApplied();

    const cableCount = this.getL1CableCountByCableType('Spine')

    if (totalL1Templates > 0) {
      return totalL1Templates <= cableCount
    }

    return false

  }

  private isL0SetComplete() {

    const totalL1Templates = this.getTotalL1Templates();

    if (totalL1Templates > 0) {
      return true
    }
    return false
  }

  private isL0SaveComplete() {

    const totalL0Templates = this.getTotalL1TemplatesApplied();

    if (totalL0Templates > 0) {
      return true
    }

    return false

  }

  private getL2CableCountByCableType(type: string): number {
    const { l2PolygonId, checks } = this.state;
    const closureCheck = checks[String(l2PolygonId)]?.odinCables?.find((elem) => elem['type'] === type)

    if (closureCheck) {
      return Number(closureCheck['count'])
    }
    return 0

  }

  private getL1CableCountByCableType(type: string): number {
    const { l1PolygonId, checks } = this.state;
    const closureCheck = checks[String(l1PolygonId)]?.odinCables?.find((elem) => elem['type'] === type)

    if (closureCheck) {
      return Number(closureCheck['count'])
    }
    return 0

  }


  private renderClosureImportCheck(polygonId: number | undefined) {

    const { checks } = this.state;

    if (!checks[String(polygonId)]) {
      return <Empty/>;
    } else {
      return (
        <Statistic title="Imported Closures" value={checks[String(polygonId)]['odinClosureCount']}
                   suffix={`/ ${checks[String(polygonId)]['gisClosureCount']}`}/>
      )
    }
  }

  private isClosureImportSuccessful() {

    const { l1PolygonId, l2PolygonId, checks } = this.state;

    if (l2PolygonId) {

      if (!checks[String(l2PolygonId)]) {
        return false;

      } else if (checks[String(l2PolygonId)]) {

        return checks[String(l2PolygonId)]['odinClosureCount'] === checks[String(l2PolygonId)]['gisClosureCount']

      }

    } else if (l1PolygonId) {

      if (!checks[String(l1PolygonId)]) {
        return false;

      } else if (checks[String(l1PolygonId)]) {

        return checks[String(l1PolygonId)]['odinClosureCount'] === checks[String(l1PolygonId)]['gisClosureCount']

      }
    }

    return false;

  }

  private renderCableImportCheck(polygonId: number | undefined) {

    const { checks } = this.state;

    if (!checks[String(polygonId)]) {
      return <Empty/>;
    } else {
      return (
        <Statistic title="Imported Cables" value={checks[String(polygonId)]['odinCableCount']}
                   suffix={`/ ${checks[String(polygonId)]['gisCableCount']}`}/>
      )
    }

  }

  private isL2CableConnectionsSuccessful() {

    const { l2PolygonId, checks } = this.state;

    if (l2PolygonId) {
      if (!checks[String(l2PolygonId)]) {
        return false;
      } else if (checks[String(l2PolygonId)]) {

        return checks[String(l2PolygonId)]['countClosuresWithCable'] === checks[String(l2PolygonId)]['odinClosureCount']

      }
    }
    return false;
  }

  private isL1CableConnectionsSuccessful() {

    const { l1PolygonId, checks } = this.state;

    if (l1PolygonId) {
      if (!checks[String(l1PolygonId)]) {
        return false;
      } else if (checks[String(l1PolygonId)]) {

        return !checks[String(l1PolygonId)]['cablesNotTraced']?.find(elem => elem['type'] === 'Spine')

      }
    }
    return false;
  }

  private isCableImportSuccessful() {

    const { l1PolygonId, l2PolygonId, checks } = this.state;

    if (l2PolygonId) {
      if (!checks[String(l2PolygonId)]) {
        return false;
      } else if (checks[String(l2PolygonId)]) {

        return checks[String(l2PolygonId)]['odinCableCount'] === checks[String(l2PolygonId)]['gisCableCount']
      }
    } else if (l1PolygonId) {
      if (!checks[String(l1PolygonId)]) {
        return false;
      } else if (checks[String(l1PolygonId)]) {

        return checks[String(l1PolygonId)]['odinCableCount'] === checks[String(l1PolygonId)]['gisCableCount']

      }
    }
    return false;
  }

  private renderCableConnectionSummary(polygonId: number | undefined) {

    const { checks } = this.state;

    if (!checks[String(polygonId)]) {
      return <Empty/>;
    } else {
      return (
        <Statistic title="Cables Connected" value={checks[String(polygonId)]['countClosuresWithCable']}
                   suffix={`/ ${checks[String(polygonId)]['odinClosureCount']}`}/>
      )
    }
  }

  private isLoopFiberConnectionsDisabled() {
    const { l1PolygonId, l2PolygonId, l0ClosureId, checks } = this.state;

    if (!l1PolygonId) {
      return true;
    }

    if (!l0ClosureId) {
      return true;
    }

    if (!l2PolygonId) {
      return true;
    }

    if (!checks[String(l2PolygonId)]) {
      return true;
    } else if (checks[String(l2PolygonId)]['odinClosuresNoCables']) {
      return checks[String(l2PolygonId)]['odinClosuresNoCables'].length > 0
    }

  }

  private getTotalLoopTemplates(): number {
    const { l1Files } = this.state;

    const filtered = [
      ...l1Files,
    ].filter(elem => elem['Key'].indexOf(`loop-fiber-mappings`) > -1 && elem['Key'].indexOf(`-applied`) === -1);


    return filtered.length;

  }

  private getTotalLoopTemplatesApplied(): number {
    const { l1Files } = this.state;

    const filtered = [
      ...l1Files,
    ].filter(elem => elem['Key'].indexOf(`loop-fiber-mappings-applied`) > -1);


    return filtered.length;

  }

  private getTotalLMTemplates(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`lm-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) === -1);


    return filtered.length;

  }

  private getTotalLMTemplatesApplied(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`lm-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) > -1);

    return filtered.length;

  }

  private getTotalL4Templates(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`l4-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) === -1);


    return filtered.length;

  }

  private getTotalL4TemplatesApplied(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`l4-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) > -1);


    return filtered.length;

  }

  private getTotalL2Templates(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`l2-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) === -1);


    console.log('getTotalL2Templates', filtered.length)

    return filtered.length;

  }

  private getTotalL2TemplatesApplied(): number {
    const { files } = this.state;

    const filtered = [
      ...files,
    ].filter(elem => elem['Key'].indexOf(`l2-fiber-connections-template`) > -1 && elem['Key'].indexOf(`-applied`) > -1);


    return filtered.length;

  }

  private getTotalL1Templates(): number {
    const { l1ClosureId, l1Files } = this.state;

    const filtered = [
      ...l1Files,
    ].filter(elem => elem['Key'].indexOf(`l1-fiber-connections-template-${l1ClosureId}`) > -1 && elem['Key'].indexOf(`-applied`) === -1);

    return filtered.length;

  }

  private getTotalL1TemplatesApplied(): number {
    const { l1ClosureId, l1Files } = this.state;

    const filtered = [
      ...l1Files,
    ].filter(elem => elem['Key'].indexOf(`l1-fiber-connections-template-${l1ClosureId}`) > -1 && elem['Key'].indexOf(`-applied`) > -1);


    return filtered.length;

  }

  private getTotalL0Templates(): number {
    const { l0ClosureId, exFiles } = this.state;

    const filtered = [
      ...exFiles,
    ].filter(elem => elem['Key'].indexOf(`l0-fiber-connections-template-${l0ClosureId}`) > -1 && elem['Key'].indexOf(`-applied`) === -1);

    return filtered.length;

  }

  private getTotalL0TemplatesApplied(): number {
    const { l0ClosureId, exFiles } = this.state;

    const filtered = [
      ...exFiles,
    ].filter(elem => elem['Key'].indexOf(`l0-fiber-connections-template-${l0ClosureId}`) > -1 && elem['Key'].indexOf(`-applied`) > -1);


    return filtered.length;

  }


}

const getFileName = (key: string) => {
  const split = key.split('/')
  return split[split.length - 1]
}

const columns = [
  {
    title: 'type',
    dataIndex: 'type',
    key: 'type',
  },
  {
    title: 'in_cable',
    dataIndex: 'in_cable',
    key: 'in_cable',
  },
  {
    title: 'in_tube_fiber',
    dataIndex: 'in_tube_fiber',
    key: 'in_tube_fiber',
  },
  {
    title: 'slot_number',
    dataIndex: 'slot_number',
    key: 'slot_number',
  },
  {
    title: 'tray_number',
    dataIndex: 'tray_number',
    key: 'tray_number',
  },
  {
    title: 'splitter_number',
    dataIndex: 'splitter_number',
    key: 'splitter_number',
  },
  {
    title: 'splitter_type',
    dataIndex: 'splitter_type',
    key: 'splitter_type',
  },
  {
    title: 'splice_number',
    dataIndex: 'splice_number',
    key: 'splice_number',
  },
  {
    title: 'out_closure',
    dataIndex: 'out_closure',
    key: 'out_closure',
  },
  {
    title: 'out_cable',
    dataIndex: 'out_cable',
    key: 'out_cable',
  },
  {
    title: 'out_tube_fiber',
    dataIndex: 'out_tube_fiber',
    key: 'out_tube_fiber',
  },
  {
    title: 'fiber_state',
    dataIndex: 'fiber_state',
    key: 'fiber_state',
  },
]

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
});

export default withRouter(connect(mapState, mapDispatch)(AutoConnectFibers));
