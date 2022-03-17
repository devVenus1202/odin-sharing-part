import { Alert, Badge, Button, Card, Col, Descriptions, Layout, Modal, Row, Spin } from 'antd'
import { defaults as DefaultInteractions } from 'ol/interaction'
import Map from 'ol/Map'
import View from 'ol/View'
import ol from 'openlayers'
import proj4 from 'proj4'
import React from 'react'
import { connect } from 'react-redux'
import { Link, withRouter } from 'react-router-dom'
import NetomniaIcon from '../../../../../assets/icons/netomnia-icon.png'
import { MapReducerUpdate, MapSearch, setMapSearchQuery, updateMapState } from '../../../../../core/gis/store/actions'
import { MapReducer } from '../../../../../core/gis/store/reducer'
import { updateUserRolesAndPermissionsRequest } from '../../../../../core/identity/store/actions'
import {
  getRecordByIdRequest,
  IGetRecordById,
  ISearchRecords,
  searchRecordsRequest,
} from '../../../../../core/records/store/actions'
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions'
import { httpGet } from '../../../../../shared/http/requests'
import { displayMessage } from '../../../../../shared/system/messages/store/reducers'
import './styles.scss'
import { Image as ImageLayer, Tile as TileLayer } from "ol/layer";
import XYZ from "ol/source/XYZ";
import {
  generateBase64ImageFromMap,
  generateBase64ImageFromMapStatic,
  getChainFromSplicelessData,
  getWFSFeatureDetails
} from "./helpers";
import ImageWMS from "ol/source/ImageWMS";
import { QGIS_SERVER_BUILDPACK } from "./types";
import { ScaleLine } from "ol/control";
import moment from "moment";
// eslint-disable-next-line import/no-webpack-loader-syntax
import PDFWorkerWithoutSplicing from "worker-loader!./pdf/withoutsplicing_pdf.odinworker";
import axios from "axios";
import { getHostName } from "../../../../../shared/http/helpers";
import {
  LoadingOutlined,
  FilePdfOutlined,
  RollbackOutlined, DownloadOutlined, FileDoneOutlined
} from '@ant-design/icons'
import PDFModalViewer from "../../../../../shared/components/PDFModalViewer";
import { isMobile } from "react-device-detect";
import { getUserNameAndEmailAddress } from "../../../../../shared/utilities/identityHelpers";
import NetworkDiagramL1 from "./NetworkDiagramL1";
import cableDiagram from "../../CableDiagram";


const FormData = require('form-data');

interface Props {
  mapReducer: MapReducer,
  recordReducer: any,
  schemaReducer: any,
  userReducer: any,
  navigationReducer: any,
  alertMessage: any,
  getSchema: any,
  updateMap: (params: MapReducerUpdate) => {},
  match: any,
  updateUserRolesAndPermissions: any,
  searchRecords: any,
  searchMap: (params: MapSearch) => {}
}

interface State {
  polygonId: number | null,
  associatedRecordId: string | null,
  polygonType: string | null,
  exPolygonName: string | null,
  buildPackRunning: boolean,
  PDFisGenerating: boolean,
  PDFisComplete: boolean,
  graph: any,
  PDFFile: any,
  PDFFileBlob: any,
  PDFFileName: string,
  PDFViewerModalIsVisible: boolean,
  overviewMap: string | undefined,
  cableOverviewMaps: Array<any>,
  cableMaps: Array<any>,
  cablePiaMaps: Array<any>,
  piaMaps: Array<any>,
  SLDImages: Array<any>,
  overviewSLDImage: Array<any>,
  cableDiagramData: any,
  cableDiagramChains: any,

  L2FeaturesInPolygon: any,
  networkDiagramFinished: boolean,
  diagramRunning: boolean,
}


class L2BuildPackSpliceless extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      polygonId: null,
      associatedRecordId: null,
      polygonType: null,
      exPolygonName: null,
      overviewSLDImage: [],
      buildPackRunning: false,
      PDFisGenerating: false,
      PDFisComplete: false,
      graph: null,
      PDFFile: null,
      PDFFileBlob: null,
      PDFFileName: '',
      PDFViewerModalIsVisible: false,
      overviewMap: '',
      cableOverviewMaps: [],
      cableMaps: [],
      cablePiaMaps: [],
      piaMaps: [],
      SLDImages: [],
      cableDiagramData: null,
      cableDiagramChains: null,
      L2FeaturesInPolygon: null,
      networkDiagramFinished: false,
      diagramRunning: false,
    }

  }

  componentDidMount() {
    const { updateMap, match } = this.props

    this.initializeMap()

    /* Catch URL parameter for Polygon ID that is passed to Map */
    if (match.params.polygonId && match.params.recordId) {

      updateMap({
        query: `type=polygon&featureId=${match.params.polygonId}`,
        queryLayer: 'polygon'
      })

      this.setState({
        polygonId: match.params.polygonId,
        associatedRecordId: match.params.recordId
      }, () => {

        /* 1. Load basic polygon information: type, coordinates, ex polygon name etc. */
        this.loadPolygonAndFeatures(match.params.polygonId).then(() => {

          this.loadPolygonCableConnections(match.params.polygonId).then(() => {

            this.loadL2OverviewMap(match.params.polygonId)

          })


        })

      })

    }

  }


  componentWillUnmount() {
    const { mapReducer } = this.props
    const { map } = mapReducer
    map?.disposeInternal()
  }


  /**
   * @param polygonId
   */
  async loadPolygonAndFeatures(polygonId: number) {

    const { mapReducer } = this.props
    const { map } = mapReducer

    map?.addLayer(
      new ImageLayer({
        zIndex: 1000,
        className: 'overviewLayer_polygon',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': [ 'polygon' ],
            'FILTER': `polygon:"id" = '${polygonId}'`
          },
          ratio: 1,
          serverType: 'qgis'
        }),
        visible: true,
        opacity: 0.8
      }),
    )

    await httpGet(`ProjectModule/v1.0/ftth/polygon/${polygonId}`).then(res => {


      let exPolygonName = '-'

      res.data.data.forEach((polygon: any) => {
        if (polygon.ex_name) {
          exPolygonName = polygon.ex_name
        }
      })

      const polygonCoordinates = res.data.data[0].coordinates[0]

      /* Projection EPSG:4326 - convert -> EPSG:3857 */
      const convertedCoordinates = polygonCoordinates.map((coordinate: any) => {
        return ol.proj.transform(coordinate, 'EPSG:27700', 'EPSG:3857')
      })

      this.setState({
        polygonType: res.data.data[0].type,
        exPolygonName: exPolygonName
      })

      map?.getView().fit(ol.extent.boundingExtent(convertedCoordinates), {
        maxZoom: 18.8,
        padding: [ 40, 40, 40, 40 ]
      })

    })

  }


  async loadPolygonCableConnections(polygonId: number) {

    return await httpGet(
      `ProjectModule/v1.0/cst/graph/polygon/${polygonId}?withSplicing=false`,
    ).then(res => {

      this.setState({
        cableDiagramData: res.data.data[0],
        cableDiagramChains: getChainFromSplicelessData(res.data.data, 'L3', 'L4')
      })

      console.log('%cEdge/Node','color:orange', res.data.data[0])
      console.log('%cChains','color:orange', getChainFromSplicelessData(res.data.data, 'L3', 'L4'))

    }).catch(err => {
      console.log('%cThere was an error loading Cable diagram data.', 'color:red', err)
    });

  }


  /**
   * Load node / edge data + L2 Features intersecting the polygon
   *
   * @param polygonId
   */
  async loadL2OverviewMap(polygonId: number) {

    const { mapReducer } = this.props
    const { map } = mapReducer


    return await httpGet(
      `ProjectModule/v1.0/ftth/polygon/L2Features/${polygonId}`,
    ).then(res => {

        if (res.data.data && this.state.cableDiagramData) {

          this.setState({ L2FeaturesInPolygon: res.data.data })

          const filteredClosures = this.state.cableDiagramData?.nodes.filter((node: any) => [ 'L2', 'L3', 'L4' ].includes(
            node.type)).map((node: any) => node.id)

          const filteredCables = this.state.cableDiagramData?.edges.filter((edge: any) => filteredClosures.includes(edge.target) || filteredClosures.includes(
            edge.source)).map(
            (edge: any) => edge.id)

          let WMSFilterQuery = `L2_cable_no_scale:"id" IN ( ${filteredCables.join(' , ')} )`
          WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${filteredClosures.join(' , ')} )`

          map?.addLayer(
            new ImageLayer({
              zIndex: 2000,
              className: 'loopChainOverview',
              source: new ImageWMS({
                url: QGIS_SERVER_BUILDPACK,
                crossOrigin: 'anonymous',
                params: {
                  'LAYERS': [ 'L2_ov_pia_structure', 'L2_ov_pia_duct', 'L2_cable_no_scale', 'L2_closure_no_scale' ],
                  'FILTER': WMSFilterQuery
                },
                ratio: 1,
                serverType: 'qgis',
              }),
              visible: true,
            }),
          )
        }
      },
    ).catch(err => {
      console.log('%cThere was an error loading L2 features.', 'color:red', err)
    });

  }


  initializeMap() {

    const { getSchema, updateMap } = this.props

    getSchema({ moduleName: 'ProjectModule', entityName: 'Feature' })
    ol.proj.setProj4(proj4)

    proj4.defs(
      'EPSG:27700',
      '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs',
    )

    const map = new Map({
      target: 'buildpack_map',
      controls: [
        new ScaleLine({
          units: 'metric',
          bar: true,
          steps: 3,
          minWidth: 100,
          text: true
        })
      ],
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
            crossOrigin: 'Anonymous',
          }),
          className: 'googleLayer',
          visible: true,
          zIndex: 100
        })
      ],
      view: new View({
        zoom: 10,
        resolution: 150,
        enableRotation: true,
        constrainOnlyCenter: false,
      }),
      interactions: DefaultInteractions({
        /*        pinchRotate: false,
         doubleClickZoom: false,
         dragPan: false,
         mouseWheelZoom: false*/
      })
    })

    updateMap({ map })

  }


  generateAndExportLoopChainMaps = async () => {

    const { cableDiagramData, cableDiagramChains, L2FeaturesInPolygon } = this.state
    const { mapReducer } = this.props
    const { map } = mapReducer

    let cableOverviewMaps:any = [], cableMaps:any = [], cablePiaMaps:any = [], piaMaps:any = []

    if (cableDiagramData && cableDiagramChains && L2FeaturesInPolygon) {

      const edges = cableDiagramData?.edges

      this.cleanMapLayers([ 'loopChainOverview' ])


      /* TODO: Create overview maps for each chain */
      for (let j = 0; j < cableDiagramChains.length; j++) {

        let allCableIds: Array<number> = []
        let allClosureIds: Array<number> = []

        const parentNode = cableDiagramChains[j].parentNode
        const childNodes = cableDiagramChains[j].childNodes

        allClosureIds.push(parentNode.id)
        childNodes.forEach((child: any) => {
          allClosureIds.push(child.id)
          edges.filter((edge: any) => edge.source === child.id || edge.target === child.id).map((edge: any) => {
            allCableIds.push(edge.id)
          })
        })

        let WMSFilterQuery = `L2_cable_no_scale:"id" IN ( ${allCableIds.join(' , ')} )`
        WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${allClosureIds.join(' , ')} )`

        map?.addLayer(
          new ImageLayer({
            zIndex: 2000,
            className: 'cableOverviewLayer',
            source: new ImageWMS({
              url: QGIS_SERVER_BUILDPACK,
              crossOrigin: 'anonymous',
              params: {
                'LAYERS': [ 'L2_cable_no_scale', 'L2_closure_no_scale' ],
                'FILTER': WMSFilterQuery
              },
              ratio: 1,
              serverType: 'qgis',
            }),
            visible: true,
          }),
        )

        await generateBase64ImageFromMap(map).then(image => {
          cableOverviewMaps.push(image)
          this.cleanMapLayers([ 'cableOverviewLayer' ])
        })

      }


      this.cleanMapLayers([ 'overviewLayer_polygon', 'cableOverviewLayer' ])

      /* TODO: Create CablePia maps for each cable chain and zoom in */
      for (let j = 0; j < cableDiagramChains.length; j++) {

        this.cleanMapLayers([ 'cableLayer' ])

        let allCableIds: Array<number> = []
        let allClosureIds: Array<number> = []

        const parentNode = cableDiagramChains[j].parentNode
        const childNodes = cableDiagramChains[j].childNodes

        allClosureIds.push(parentNode.id)
        childNodes.forEach((child: any) => {
          allClosureIds.push(child.id)
          edges.filter((edge: any) => edge.source === child.id || edge.target === child.id).map((edge: any) => {
            allCableIds.push(edge.id)
          })
        })

        let allFeatureIds: Array<string> = []

        allCableIds.map((cable: any) => allFeatureIds.push(`cable.${cable}`))
        allClosureIds.map((closure: any) => allFeatureIds.push(`closure.${closure}`))

        const res = await getWFSFeatureDetails(
          [ 'cable', 'closure' ],
          allFeatureIds
        )

        /* Get Bounding box and zoom to it*/
        if (res && res.features.length) {
          let coordinates = [], convertedCoordinates = []
          for (let feature of res.features)
            if (feature.id.indexOf('closure') > -1)
              coordinates.push(feature.geometry.coordinates)
          for (let coordinate of coordinates)
            convertedCoordinates.push(ol.proj.transform(coordinate, 'EPSG:4326', 'EPSG:3857'))
          map?.getView().fit(ol.extent.boundingExtent(convertedCoordinates), {
            maxZoom: 18.8,
            padding: [ 50, 50, 50, 50 ]
          })
        }

        const allL4PolygonIds = L2FeaturesInPolygon.L4polygons.map((polygon: any) => polygon.id)
        let WMSFilterQuery = `L2_cable_no_scale:"id" IN ( ${allCableIds.join(' , ')} )`
        WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${allClosureIds.join(' , ')} )`

        /* PIA MAP */
        map?.addLayer(
          new ImageLayer({
            zIndex: 2000,
            className: 'cableLayer',
            source: new ImageWMS({
              url: QGIS_SERVER_BUILDPACK,
              crossOrigin: 'anonymous',
              params: { 'LAYERS': [ 'L2_ov_pia_structure', 'L2_ov_pia_duct'] },
              ratio: 1,
              serverType: 'qgis',
            }),
            visible: true,
          }),
        )

        await generateBase64ImageFromMap(map).then(image => {

          piaMaps.push(image)

        }).then(async () => {

           /* CABLE + PIA */
            map?.addLayer(
              new ImageLayer({
                zIndex: 3000,
                className: 'cableLayer',
                source: new ImageWMS({
                  url: QGIS_SERVER_BUILDPACK,
                  crossOrigin: 'anonymous',
                  params: {
                    'LAYERS': [ 'L2_cable_no_scale', 'L2_closure_no_scale',  ],
                    'FILTER': WMSFilterQuery
                  },
                  ratio: 1,
                  serverType: 'qgis',
                }),
                visible: true,
              }),
            )

            await generateBase64ImageFromMap(map).then(image => {

              cablePiaMaps.push(image)

            }).then(async () => {

              this.cleanMapLayers([ 'cableLayer' ])

              let filter = ''
              filter += `L2_cable_no_scale:"id" IN ( ${allCableIds.join(' , ')} )`
              filter += `;L2_closure_no_scale:"id" IN ( ${allClosureIds.join(' , ')} )`
              filter += `;polygon:"id" IN ( ${allL4PolygonIds.join(' , ')} )`

              /* CABLE MAPS: CABLE + L4 POLYGON + ADDRESSES */
              map?.addLayer(
                new ImageLayer({
                  zIndex: 4000,
                  className: 'cableLayer',
                  source: new ImageWMS({
                    url: QGIS_SERVER_BUILDPACK,
                    crossOrigin: 'anonymous',
                    params: {
                      'LAYERS': [ 'L2_cable_no_scale', 'L2_closure_no_scale', 'Addresses', 'polygon' ],
                      'FILTER': filter
                    },
                    ratio: 1,
                    serverType: 'qgis',
                  }),
                  visible: true,
                }),
              )

              await generateBase64ImageFromMap(map).then(image => {

                cableMaps.push(image)
                this.cleanMapLayers([ 'cableLayer' ])

              })


            })

          }
        )

      } // for loop end


    }


    this.setState({
      cablePiaMaps: cablePiaMaps,
      cableMaps: cableMaps,
      cableOverviewMaps: cableOverviewMaps,
      piaMaps: piaMaps
    })

  }

  /**
   * Pass an array with WMS layer class names to remove them
   *
   * @param layersToRemove
   */
  cleanMapLayers(layersToRemove: Array<string>) {

    const { mapReducer } = this.props
    const { map } = mapReducer

    for (const layerName of layersToRemove) {

      map?.getLayers().forEach((layer: any) => {
        if (layer) {
          const isVisible = layer.getVisible();
          if (isVisible) {
            if (layer.className_ === layerName) {
              map?.removeLayer(layer);
            }
          }
        }
      })
    }

  }


  startBuildPack() {

    const { mapReducer } = this.props
    const { map } = mapReducer

    /* 1. Set the build pack running and export the overview map */
    this.setState({
      buildPackRunning: true,
      overviewMap: generateBase64ImageFromMapStatic(map)
    }, () => {

      this.cleanMapLayers([
        'loopChainOverview'
      ])

      /* 2. Export construction, cable access and cable feed maps */
      this.generateAndExportLoopChainMaps().then(() => {

        /* 3. Export Cable diagram overview and individual diagrams */
        this.generateAndExportCableDiagrams().then(() => {


        })

      })

    })

  }


  handleNetworkDiagramBuild = () => {
    this.setState({
      networkDiagramFinished: true,
      buildPackRunning: false
    }, () => {
      this.renderPDF()
    })
  }

  generateAndExportCableDiagrams = async () => {
    this.setState({ diagramRunning: true }, () => {
      console.log('%cDiagram running...', 'color:limegreen')
    })
  }

  /* Very dirty method to force browser into downloading PDF blob. */
  downloadPDFFile = () => {

    if (this.state.PDFFileBlob && this.state.PDFFileName.length) {
      //let file = new Blob([ this.state.PDFFileBlob ], { type: 'application/pdf' });
      let fileURL = URL.createObjectURL(this.state.PDFFileBlob);
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = this.state.PDFFileName;
      link.click();
    }

  }

  renderPDF = async () => {

    const { userReducer } = this.props

    const pdfWorker = new PDFWorkerWithoutSplicing()

    const userInformation = getUserNameAndEmailAddress(userReducer)


    const pdfData = {
      overviewMap: this.state.overviewMap ? this.state.overviewMap : '',
      overviewSLDImage: this.state.overviewSLDImage ? this.state.overviewSLDImage : '',
      cableOverviewMaps: this.state.cableOverviewMaps,
      cablePiaMaps: this.state.cablePiaMaps,
      cableMaps: this.state.cableMaps,
      piaMaps: this.state.piaMaps,
      SLDImages: this.state.SLDImages ? this.state.SLDImages : [],
      L1FeaturesInPolygon: this.state.L2FeaturesInPolygon ? this.state.L2FeaturesInPolygon : [],
      cableDiagramData: this.state.cableDiagramData ? this.state.cableDiagramData : [],
      cableDiagramChains: this.state.cableDiagramChains ? this.state.cableDiagramChains : [],
      documentInformation: {
        Author: `${userInformation.firstName} ${userInformation.lastName}`,
        Contact: userInformation.emailAddress,
        Date: moment().format('DD/MM/YYYY'),
        Timestamp: moment().format('DD/MM/YYYY HH:mm:ss'),
        PolygonId: this.state.polygonId! ? String(this.state.polygonId) : '-',
        PolygonType: this.state.polygonType ? this.state.polygonType : '-',
        exPolygonName: this.state.exPolygonName ? this.state.exPolygonName : '-'
      }
    }

    this.setState({ PDFisGenerating: true }, () => {
      console.log('%cParent: Posting data to Worker...', 'color:orange')
      pdfWorker.postMessage(pdfData)
    })

    pdfWorker.addEventListener("message", async (e: any) => {

      const filename = `BUILDPACK_${this.state.polygonType}_${this.state.polygonId}_${moment().format(
        'YYYY-MM-DD_HH-mm-ss')}.pdf`

      const file = new File([ e.data ], filename, { type: 'application/pdf', })
      const formData = new FormData()
      formData.append('file', file)

      this.setState({
        PDFFile: file,
        PDFFileBlob: e.data,
        PDFFileName: filename
      })

      const token = localStorage.getItem(`token`)
      pdfWorker.terminate()

      await axios({
        method: 'POST',
        url: `${getHostName()}/SchemaModule/v1.0/s3/files/${this.state.associatedRecordId!}/upload`,
        data: formData,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'multipart/form-data'
        },
      }).then(async (res) => {
        console.log('%cFile uploaded!', 'color:limegreen', res.data.data)
        this.setState({
          PDFisComplete: true
        })
      })
    })

  }

  renderPDFCompleteModal = () => {

    if (this.state.PDFisComplete) {
      return (
        <Row>
          <Col span={24} style={{ marginBottom: 10 }}>
            <Alert style={{ textAlign: 'justify' }}
                   icon={<FileDoneOutlined/>}
                   message="Your PDF file is created!"
                   description={
                     <span>You can manage your PDF file by heading back to the Project and looking up in the Files section. If you want to view your PDF file immediately, you can do that from here. Take note that if you access your PDF straight away, it will still be available in the Project record.</span>
                   }
                   type="success"
                   showIcon
            />
          </Col>

          <Col span={24} style={{ marginTop: 10 }}>
            <Row>
              <Col xs={24} sm={24} lg={8} style={{ marginBottom: isMobile ? 10 : 0 }}>
                <Link to={`/ProjectModule/Project/${this.state.associatedRecordId}`}>
                  <Button
                    ghost type="primary"
                    style={{ width: isMobile ? '100%' : '97%' }}
                    icon={<RollbackOutlined/>}
                  >
                    Back to Project
                  </Button>
                </Link>
              </Col>

              <Col xs={24} sm={24} lg={8} style={{ textAlign: 'center', marginBottom: isMobile ? 10 : 0 }}>
                <Button
                  ghost
                  type="primary"
                  style={{ width: isMobile ? '100%' : '98%' }}
                  icon={<FilePdfOutlined/>}
                  onClick={() => this.setState({
                    PDFViewerModalIsVisible: true
                  })}
                >
                  View PDF
                </Button>
              </Col>


              <Col xs={24} sm={24} lg={8} style={{ textAlign: 'right' }}>
                <Button ghost type="primary"
                        disabled={!this.state.PDFFileBlob}
                        icon={<DownloadOutlined/>}
                        onClick={() => this.downloadPDFFile()}
                        style={{ width: isMobile ? '100%' : '97%' }}
                >
                  Download PDF
                </Button>
              </Col>

            </Row>
          </Col>

        </Row>
      )
    } else if (!this.state.PDFisComplete) {
      return (
        <Row>
          <Col span={24}>
            <div style={{ textAlign: 'center' }}>
              <span>Please wait while the PDF is being generated...</span>
              <br/>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin/>}
                    style={{ marginTop: 30, marginBottom: 30 }}/>
            </div>
          </Col>
        </Row>
      )
    }
  }

  togglePDFModal = () => {
    this.setState({ PDFViewerModalIsVisible: !this.state.PDFViewerModalIsVisible })
  }


  checkIfCanRun = () => {
    return !(!this.state.L2FeaturesInPolygon ||
      !this.state.cableDiagramData);
  }

  render() {

    const { Content } = Layout;

    return (
      <Layout style={{ padding: '20px' }}>
        <Content>

          {/* PDF Viewer Modal */}
          <PDFModalViewer togglePDFModal={this.togglePDFModal} isModalVisible={this.state.PDFViewerModalIsVisible}
                          file={this.state.PDFFile}/>


          {/* PDF Generator Modal */}
          <Modal
            title="Build Pack"
            className="BuildPackModal"
            //visible={true}
            visible={(this.state.PDFisGenerating || this.state.PDFisComplete) && !this.state.PDFViewerModalIsVisible}
            centered
            closable={false}
          >
            {this.renderPDFCompleteModal()}
          </Modal>


          {/* Map Export Modal */}
          <Modal
            title="Build Pack"
            className="BuildPackModal"
            centered
            okText="Close"
            closable={false}
            cancelButtonProps={{ style: { display: 'none' } }}
            okButtonProps={{ disabled: !this.state.PDFisComplete }}
            visible={this.state.buildPackRunning}
            footer={[
              <Button key="dismiss"
                      type="primary"
                      size="large"
                      disabled={!this.state.PDFisComplete}
                      onClick={e => this.setState({ buildPackRunning: false })}
                      ghost>
                Close
              </Button>,
            ]}
          >
            <Row>
              <Col span={24} style={{ textAlign: 'center' }}>
                <span>Please wait while Maps and Diagrams are being exported...</span>
                <br/>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin/>}
                      style={{ marginTop: 30, marginBottom: 30 }}/>
              </Col>
            </Row>
          </Modal>

          <Row>

            <Col span={18}>

              {/* Map */}
              <div id="buildpack_map" style={{
                opacity: this.state.buildPackRunning || !this.state.cableDiagramData ? '0.4' : '1',
                display: this.state.diagramRunning ? 'none' : 'block'
              }}/>

              {
                this.state.diagramRunning ?
                  <NetworkDiagramL1
                    L1FeaturesInPolygon={this.state.L2FeaturesInPolygon!}
                    cableDiagramData={this.state.cableDiagramData!}
                    cableDiagramChains={this.state.cableDiagramChains}
                    graph={this.state.graph}
                    SLDImages={this.state.SLDImages}
                    overviewSLDImage={this.state.overviewSLDImage}
                    handleNetworkDiagramBuild={this.handleNetworkDiagramBuild}
                  />
                  : <></>
              }
            </Col>


            {/* Sidebar */}
            <Col span={6}>
              <Card className="buildPackSidebar" title={
                <Row>
                  <Col span={12} style={{ paddingTop: '8px', fontSize: '1.2em' }}>
                    <img src={NetomniaIcon} style={{ width: '24px', marginRight: 5, paddingBottom: '4px' }}
                         alt="netomnia-icon"/>
                    <span style={{ fontWeight: 600 }}>Build Pack</span>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right', paddingTop: '4px' }}>

                    <Button
                      type="primary"
                      size="large"
                      loading={!this.checkIfCanRun()}
                      disabled={!this.checkIfCanRun()}
                      onClick={e => this.startBuildPack()}>
                      {
                        this.checkIfCanRun() ? 'Start' : 'Loading ...'
                      }
                    </Button>
                  </Col>
                </Row>
              }>

                <Descriptions
                  column={1}
                  bordered size="small"
                  style={{ marginTop: '10px', paddingLeft: '10px', fontSize: '0.6em' }}
                >

                  <Descriptions.Item label="Build Pack Type">
                    No Splicing L2
                  </Descriptions.Item>

                  <Descriptions.Item label="Polygon ID">
                    {this.state.polygonId ? this.state.polygonId : '-'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Polygon Type">
                    {this.state.polygonType ?
                      this.state.polygonType :
                      <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                  </Descriptions.Item>

                  <Descriptions.Item label="EX Name">
                    {this.state.exPolygonName ? this.state.exPolygonName : '-'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Cable Diagram">
                    {this.state.cableDiagramData ?
                      <Badge status="success" text="Loaded"/> :
                      <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                  </Descriptions.Item>


                  <Descriptions.Item label="L2 &rarr; L3 Chains">
                    {this.state.cableDiagramChains ? this.state.cableDiagramChains.length :
                      <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                  </Descriptions.Item>


                </Descriptions>


                {/*<Descriptions
                 bordered
                 size="small"
                 column={1}
                 style={{
                 marginTop: '30px',
                 fontSize: '0.6em',
                 paddingLeft: '10px',
                 }}>

                 <Descriptions.Item label="Cables">
                 {this.state.L2FeaturesInPolygon ?
                 this.state.L2FeaturesInPolygon.cables.length : <Spin/>}
                 </Descriptions.Item>

                 <Descriptions.Item label="Closures">
                 {this.state.L2FeaturesInPolygon ?
                 this.state.L2FeaturesInPolygon.closures.length : <Spin/>}
                 </Descriptions.Item>

                 <Descriptions.Item label="Chambers">
                 {this.state.L2FeaturesInPolygon ?
                 this.state.L2FeaturesInPolygon.chambers.length : <Spin/>}
                 </Descriptions.Item>

                 <Descriptions.Item label="Ducts">
                 {this.state.L2FeaturesInPolygon ?
                 this.state.L2FeaturesInPolygon.ducts.length : <Spin/>}
                 </Descriptions.Item>

                 <Descriptions.Item label="Poles">
                 {this.state.L2FeaturesInPolygon ?
                 this.state.L2FeaturesInPolygon.poles.length : <Spin/>}
                 </Descriptions.Item>

                 </Descriptions>*/}

              </Card>
            </Col>

          </Row>


        </Content>
      </Layout>
    )
  }

}

const
  mapState = (state: any) => ({
    mapReducer: state.mapReducer,
    recordReducer: state.recordReducer,
    schemaReducer: state.schemaReducer,
    navigationReducer: state.navigationReducer,
    userReducer: state.userReducer
  })

const mapDispatch = (dispatch: any) => ({
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  getSchema: (params: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(params, cb)),
  updateMap: (params: MapReducerUpdate) => dispatch(updateMapState(params)),
  updateUserRolesAndPermissions: () => dispatch(updateUserRolesAndPermissionsRequest()),
  searchMap: (params: MapSearch) => dispatch(setMapSearchQuery(params)),
})


export default withRouter(connect(mapState, mapDispatch)(L2BuildPackSpliceless))

