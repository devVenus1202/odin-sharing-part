import { CloseOutlined, DownloadOutlined } from '@ant-design/icons'
import G6 from '@antv/g6';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Badge, Button, Card, Col, Divider, Layout, Result, Row, Spin, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link, withRouter } from 'react-router-dom'
import StageNameTag from '../../../../shared/components/StageNameTag';
import { httpGet } from '../../../../shared/http/requests';
import JobSideBarListView from '../Job/JobSideBarListView';
import TaskDataLoader from '../Task/TaskDataLoader';
import { getChamberStyle, getEdgesAndNodesForSplicelessData } from './helpers';
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./cablediagrampdf.odinworker";
import './styles.scss'
import moment from "moment";
import { getDataFromSpliceless } from "./helper";


type cableDiagramData = {
  nodes: any[],
  edges: any[]
}

type Props = {
  columnFullscreen?: any,
  match: any,
}

let graph: any = null


const CableDiagramSpliceless = (props: Props) => {

  const diagramRef = React.useRef(null);
  const minimapRef = React.useRef(null);
  const { columnFullscreen } = props

  const [ loadingData, setLoadingData ] = useState<boolean>(true)
  const [ generatingPDF, setGeneratingPDF ] = useState<boolean>(false)
  const [ cableDiagramData, setCableDiagramData ] = useState<Array<any>>([])
  const [ parentChildCollection, setParentChildCollection ] = useState<any>(null)
  const [ loadingError, setLoadingError ] = useState<boolean | null>(false)
  const [ selectedNode, setSelectedNode ] = useState<any>(null)
  const [ selectedTask, setSelectedTask ] = useState<any>(null)

  async function drawGraph(diagramData: cableDiagramData): Promise<any> {

    const graphConfig = {
      container: diagramRef?.current!,
      fitView: true,
      zoom: 20,
      modes: {
        default: [ 'drag-canvas', 'zoom-canvas' ],
      },
      layout: {
        type: 'dagre',
        rankdir: 'TB',
        ranksep: 140,
        //ranker: 'longest-path',
      },
      defaultNode: {
        type: 'node',
        size: 90,
        labelCfg: {
          style: {
            fontSize: 18,
            fontWeight: 600,
            padding: 15,
            cursor: 'pointer',
          },
        },
        style: {
          stroke: '#72CC4A',
          width: 150,
          cursor: 'pointer',
        },
      },
      defaultEdge: {
        /*type: 'polyline'*/
      },
      plugins: [
        new G6.Minimap({
          container: minimapRef?.current!,
          size: [ 160, 100 ],
        }),
      ],
    }

    if (graph !== null) {
      graph.destroy()
      graph = new G6.Graph(graphConfig)
      graph.data(diagramData)
      graph.render()
      //graph.on('node:click', (e: any) => nodeClickEvent(e));
    } else {
      graph = new G6.Graph(graphConfig)
      graph.data(diagramData)
      graph.render()
      //graph.on('node:click', (e: any) => nodeClickEvent(e));
    }

  }



  const exportDiagramToPDF = async () => {

    if (graph) {
      setGeneratingPDF(true)
      graph.fitCenter()

      await new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
        graph.toFullDataURL(
          (baseImage: any) => {

            const pdfWorker = new Worker()
            pdfWorker.postMessage(baseImage)
            pdfWorker.addEventListener("message", async (e: any) => {

              const filename = `CABLEDIAGRAM_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`
              setGeneratingPDF(false)

              /* Very dirty method to force browser into downloading PDF blob. */
              let file = new Blob([ e.data ], { type: 'application/pdf' });
              let fileURL = URL.createObjectURL(file);
              const link = document.createElement("a");
              link.href = fileURL;
              link.download = filename;
              link.click();

            })
          }
        )
      })
    }
  }


  async function fetchCableDiagramData(
    polygonId: number,
  ): Promise<any> {

    return await httpGet(
      `ProjectModule/v1.0/cst/graph/polygon/${polygonId}?withSplicing=false`,
    ).then(res => {

        if (res.data && res.data.data && res.data.data.length) {
          const splicelessData = getDataFromSpliceless(res.data.data)
          setCableDiagramData(res.data.data[0])
          setParentChildCollection(splicelessData)
          return (res.data.data)
        }

      },
    ).catch(err => {
      setLoadingError(true)
      setLoadingData(false)
      console.log('%cThere was an error loading Cable diagram data.', 'color:red', err)
    });

  }

  /* Fetch all nodes and edges for polygon */
  useEffect(() => {

    const polygonId = props.match.params.polygonId

    fetchCableDiagramData(polygonId).then((res: any) => {
      if (res) {
        setLoadingError(false)
        setLoadingData(false)
      } else {
        setLoadingError(true)
        setLoadingData(false)
      }
    })

  }, [])




  /* Display Initial Cable diagram  */
  useEffect(() => {

    if (cableDiagramData && parentChildCollection)
      drawGraph(getEdgesAndNodesForSplicelessData(parentChildCollection, cableDiagramData))
        .then(() => setLoadingData(false))

  }, [ cableDiagramData, parentChildCollection ])


  const { Content } = Layout

  console.log('selectedNode', selectedNode)

  return (
    <Card
      size="small"
      title={
        <Row>
          <Col span={8}>
            <span>Cable Diagram {props.match.params.polygonId}</span>
          </Col>
          <Col span={16} style={{ textAlign: 'right' }}>
            <Button loading={generatingPDF} disabled={generatingPDF || loadingData || !cableDiagramData}
                    type="default"
                    onClick={() => exportDiagramToPDF()}>
              {!generatingPDF ? <DownloadOutlined/> : <></>}
              {!generatingPDF ? <span>Download PDF</span> : <span>Generating PDF ...</span>}
            </Button>
          </Col>

        </Row>

      }
      className="cableDiagramCard"
    >

      <Layout>

        <Content style={{ overflowY: !cableDiagramData?.length || loadingError ? 'hidden' : 'initial' }}>

          <Row>
            <Col span={selectedNode ? 16 : 24}>
              <div
                style={{ height: '93vh', width: '100%', backgroundColor: '#fff' }}
              >
                {
                  loadingData ?
                    <div style={{ height: '78vh', width: '100%', textAlign: 'center' }}>
                      <Spin size="large" style={{ marginTop: '250px' }}/>
                      <h2 style={{ marginTop: '50px' }}>Loading cable diagram data...</h2>
                    </div>
                    : <></>
                }
                {
                  loadingError ?
                    <div style={{ height: '78vh', width: '100%', textAlign: 'center' }}>
                      <Result
                        style={{ paddingTop: 100 }}
                        status="error"
                        title="Error"
                        subTitle={`Check if Polygon with id ${props.match.params.polygonId} has splicing information.`}
                      />
                    </div>
                    : <></>
                }
                {
                  !loadingError ?
                    <div className="diagramMinimap" ref={minimapRef} style={{ opacity: loadingData ? 0 : 1 }}/>
                    : <></>
                }

                <div style={{
                  height: '93vh',
                  width: '100%',
                  opacity: generatingPDF ? 0.2 : 1,
                }}
                     ref={diagramRef}
                />

              </div>

            </Col>

            {
              selectedNode ?
                <Col span={8} style={{ height: '93vh' }}>
                  <Card
                    title="Details"
                    size="small"
                    className="CableDiagramSidebarCard"
                    style={{ height: '93vh', overflowY: 'auto', padding: 0 }}
                    extra={<CloseOutlined onClick={() => setSelectedNode(null)}/>}
                  >

                    <Row style={{ padding: 8, marginTop: 5, border: '1px solid #d6d6d6', borderRadius: 8 }}>
                      <Col span={24}>
                        <Row style={{
                          backgroundColor: '#edf4ff',
                          paddingTop: 8,
                          paddingLeft: 10,
                          marginBottom: 10,
                          fontWeight: 600,
                          borderRadius: 4,
                        }}>
                          <Col span={24}>
                            <Typography.Title level={5}>Selected Closure</Typography.Title>
                          </Col>
                        </Row>
                        <Row style={{
                          paddingTop: 3,
                          paddingLeft: 10,
                          paddingRight: 8,
                          marginBottom: 10,
                          fontWeight: 600,
                          borderRadius: 4,
                          fontSize: '1.1em',
                        }}>
                          <Col span={18}>
                            {
                              <>
                                <Badge className="closureTypeCircle" color={getChamberStyle(selectedNode.type).fill}/>
                                <span style={{ fontWeight: 600 }}>{selectedNode.type} Closure</span>
                              </>
                            }
                          </Col>
                          <Col span={6} style={{ textAlign: 'right' }}>
                            <Link to={`/ProjectModule/Feature/${selectedNode.closure.id}`}
                                  target="_blank">{selectedNode.id}</Link>
                          </Col>
                        </Row>

                        <Divider style={{ margin: '10px 0' }}/>

                        <Row style={{
                          paddingTop: 3,
                          paddingLeft: 10,
                          paddingRight: 8,
                          marginBottom: 10,
                          borderRadius: 4,
                          fontSize: '0.9em',
                        }}>
                          <Col span={24}>
                            <span style={{ fontWeight: 600 }}>Nearest Address</span>
                          </Col>
                          <Col span={24} style={{ marginTop: 4 }}>
                            <span>{selectedNode.nearestAddress.replace('("', '').replace('")', '')}</span>
                          </Col>
                        </Row>

                      </Col>
                    </Row>

                    <Row style={{ padding: 8, marginTop: 18, border: '1px solid #d6d6d6', borderRadius: 8 }}>
                      <Col span={24}>
                        <Row style={{
                          backgroundColor: '#edf4ff',
                          paddingTop: 6,
                          paddingLeft: 10,
                          marginBottom: 10,
                          fontWeight: 600,
                          borderRadius: 4,
                        }}>
                          <Col span={24}>
                            <Typography.Title level={5}>Tasks</Typography.Title>
                          </Col>
                        </Row>
                        <TaskDataLoader
                          setSelectedTask={setSelectedTask}
                          moduleName={'ProjectModule'}
                          entityName={'Task'}
                          taskUniqueRef={selectedNode.taskUniqueRef}/>
                      </Col>
                    </Row>


                    {
                      selectedTask ?
                        <Row style={{ padding: 8, marginTop: 18, border: '1px solid #d6d6d6', borderRadius: 8 }}>
                          <Col span={24}>
                            <Row style={{
                              backgroundColor: '#edf4ff',
                              padding: '6px 10px 0px 10px',
                              marginBottom: 4,
                              fontWeight: 600,
                              borderRadius: 4,
                            }}>
                              <Col span={16}>
                                <Typography.Title level={5}>Selected Task</Typography.Title>
                              </Col>
                              <Col span={8} style={{ textAlign: 'right' }}>
                                {selectedTask
                                  ? <Link to={`/ProjectModule/Task/${selectedTask.id}`}
                                          target="_blank">{selectedTask.recordNumber}</Link> : ''}
                              </Col>
                            </Row>

                            <Row style={{ padding: '8px 4px 3px 4px' }}>
                              <Col span={12}>
                                <span style={{ fontWeight: 600 }}>Task title</span>
                              </Col>
                              <Col span={12} style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 600 }}>Stage</span>
                              </Col>
                            </Row>

                            <Row style={{ padding: '0px 4px 8px 4px' }}>
                              <Col span={12}>
                                {selectedTask.title}
                              </Col>
                              <Col span={12} style={{ textAlign: 'right' }}>
                                <StageNameTag
                                  record={selectedTask}
                                  text={selectedTask.stage ? selectedTask.stage.name : ''}
                                  size="small"/>
                              </Col>
                            </Row>

                            <Divider style={{ margin: '8px 0 10px 0' }}/>

                            <Row style={{ padding: '0px 4px 8px 4px' }}>
                              <Col span={8}>
                                <span style={{ fontWeight: 600 }}>Out Closure</span>
                              </Col>
                              <Col span={8} style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 600 }}>Cable Connection</span>
                              </Col>
                              <Col span={8} style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 600 }}>In Closure</span>
                              </Col>
                            </Row>
                            <Row style={{ padding: '0px 4px 8px 4px' }}>
                              <Col span={8}>
                                {getProperty(selectedTask, 'OutClosure') ? getProperty(
                                  selectedTask,
                                  'OutClosure',
                                ) : 'None'}
                              </Col>
                              <Col span={8} style={{ textAlign: 'center' }}>
                                {getProperty(selectedTask, 'ConnectionCable') ? getProperty(
                                  selectedTask,
                                  'ConnectionCable',
                                ) : 'None'}
                              </Col>
                              <Col span={8} style={{ textAlign: 'right' }}>
                                {getProperty(selectedTask, 'InClosure') ? getProperty(
                                  selectedTask,
                                  'InClosure',
                                ) : 'None'}
                              </Col>
                            </Row>

                          </Col>
                        </Row>
                        : <></>
                    }
                    {
                      selectedTask ?
                        <Row style={{ padding: 8, marginTop: 18, border: '1px solid #d6d6d6', borderRadius: 8 }}>
                          <Col span={24}>
                            <Row style={{
                              backgroundColor: '#edf4ff',
                              padding: '6px 10px 0px 10px',
                              marginBottom: 4,
                              fontWeight: 600,
                              borderRadius: 4,
                            }}>
                              <Col span={24}>
                                <Typography.Title level={5}>Jobs for Selected Task</Typography.Title>
                              </Col>
                            </Row>
                            <Row style={{ marginTop: 11 }}>
                              <Col span={24}>
                                <JobSideBarListView
                                  moduleName={'ProjectModule'}
                                  entityName={'Job'}
                                  recordId={selectedTask.id}
                                />
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                        : <></>
                    }
                  </Card>
                </Col>
                : <></>
            }
          </Row>
        </Content>
      </Layout>
    </Card>

  )
}


export default withRouter(CableDiagramSpliceless);