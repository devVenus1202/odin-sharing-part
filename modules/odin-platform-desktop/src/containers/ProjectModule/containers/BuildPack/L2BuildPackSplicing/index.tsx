import { Alert, Badge, Button, Card, Col, Descriptions, Layout, Modal, Result, Row, Spin } from 'antd'
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
import { generateBase64ImageFromMap, generateBase64ImageFromMapStatic, getWFSFeatureDetails } from "./helpers";
import ImageWMS from "ol/source/ImageWMS";
import { networkDiagramData, QGIS_SERVER_BUILDPACK } from "./types";
import NetworkDiagramL2 from "./NetworkDiagramL2";
import { ScaleLine } from "ol/control";
import moment from "moment";
import { renderMapLayers } from "./MapFilters";
// eslint-disable-next-line import/no-webpack-loader-syntax
import PDFWorkerWithSplicing from "worker-loader!./pdf/withsplicing_pdf.odinworker";
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
  overviewNetworkDiagram: Array<any>,
  buildPackRunning: boolean,
  PDFisGenerating: boolean,
  PDFisComplete: boolean,
  graph: any,
  PDFFile: any,
  PDFFileBlob: any,
  PDFFileName: string,
  PDFViewerModalIsVisible: boolean

  overviewMap: string | undefined,
  loopChainMaps: Array<string>,
  loopChainOverviewMaps: Array<string>,
  feedChainMaps: Array<any>,
  constructionMaps: Array<string>,
  cableAccessMaps: Array<string>,
  cableFeedMaps: Array<string>,
  networkDiagramMaps: Array<any>,

  networkDiagramData: networkDiagramData,
  splicingData: any,
  aggregatedSplicingData: any,
  L2FeaturesInPolygon: any,
  networkDiagramFinished: boolean,
  diagramRunning: boolean,
  splicingDataError: boolean
}


class L2BuildPackSplicing extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      polygonId: null,
      associatedRecordId: null,
      polygonType: null,
      exPolygonName: null,
      overviewNetworkDiagram: [],
      buildPackRunning: false,
      PDFisGenerating: false,
      PDFisComplete: false,
      graph: null,
      PDFFile: null,
      PDFFileBlob: null,
      PDFFileName: '',
      PDFViewerModalIsVisible: false,

      overviewMap: '',
      loopChainMaps: [],
      loopChainOverviewMaps: [],
      feedChainMaps: [],

      constructionMaps: [],
      cableAccessMaps: [],
      cableFeedMaps: [],
      networkDiagramMaps: [],
      L2FeaturesInPolygon: null,
      networkDiagramData: null,
      splicingData: [],
      aggregatedSplicingData: [],
      networkDiagramFinished: false,
      diagramRunning: false,
      splicingDataError: false
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

          /* 2. Load graph information: nodes, edges etc. */
          this.loadNetworkDiagramForPolygonId(match.params.polygonId).then((res: any) => {


            /* 3. Load splicing data for the closures */
            this.loadSplicingInformation(res).catch((error: any) => {

              this.setState({ splicingDataError: true })
              console.log('%cSPLICING DATA ERROR:', 'color:red', error)

            })


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

      res.data.data.forEach((polygon:any) => {
        if(polygon.ex_name)
          exPolygonName = polygon.ex_name
      })


      const polygonCoordinates = res.data.data[0].coordinates[0]

      res.data.data.forEach((polygon:any) => {
        if(polygon.ex_name){
          exPolygonName = polygon.ex_name
        }
      })

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

    await httpGet(
      `ProjectModule/v1.0/ftth/polygon/L2Features/${polygonId}`,
    ).then(res => {

      console.log('%cL2 Features', 'color:limegreen', res.data.data)

      this.setState({ L2FeaturesInPolygon: res.data.data })

    })

  }


  /**
   * Load node / edge data + L2 Features intersecting the polygon
   *
   * @param polygonId
   */
  async loadNetworkDiagramForPolygonId(polygonId: number) {

    const { mapReducer } = this.props
    const { map } = mapReducer

    return await httpGet(
      `ProjectModule/v1.0/cst/graph/polygon/features/${polygonId}`,
    ).then(res => {

        console.log('%cNetworkDiagramData', 'color:turquoise', res.data.data)

        this.setState({ networkDiagramData: res.data.data })
        renderMapLayers(res.data.data, this.state.L2FeaturesInPolygon, 'overview', map)
        return res.data.data

      },
    ).catch(err => {
      console.log('%cThere was an error loading Cable diagram data.', 'color:red', err)
    });

  }


  async loadSplicingInformation(loopChainData: Array<any>) {

    let allClosureIds: Array<any> = []

    loopChainData.forEach((loopChain: any) => {
      loopChain.features.closures.forEach((closure: any) => {
        allClosureIds.push(closure.id)
      })
    })

    /* Load standard splicing data for an array of closures */
    await httpGet(`ConnectModule/connections/connections/batch/${allClosureIds.join(',')}`).then(res => {
      this.setState({ splicingData: res.data.data })
      console.log('%cSplicing data', 'color:limegreen', res.data.data)
    }).catch((e: any) => this.setState({ splicingDataError: true }))

    /* Load aggregated splicing data for an array of closures */
    await httpGet(`ConnectModule/connections/connections-agg/batch/${allClosureIds.join(',')}`).then(res => {
      console.log('%cAggregated splicing data', 'color:limegreen', res.data.data)
      this.setState({ aggregatedSplicingData: res.data.data })
    }).catch((e: any) => this.setState({ splicingDataError: true }))

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
        pinchRotate: false,
        doubleClickZoom: false,
        dragPan: false,
        mouseWheelZoom: false
      })
    })

    updateMap({ map })

  }


  generateAndExportLoopChainMaps = async () => {

    const { networkDiagramData } = this.state
    const { mapReducer } = this.props
    const { map } = mapReducer

    let loopChainOverviewMaps: Array<any> = []
    let constructionMaps: Array<any> = []
    let cableAccessMaps: Array<any> = []
    let cableFeedMaps: Array<any> = []


    if (networkDiagramData) {

      /* 1. Create overview maps for all access/loop chains */
      for (let j = 0; j < networkDiagramData.length; j++) {

        this.cleanMapLayers([ 'loopChainOverview' ])

        let allCableIds = networkDiagramData[j].features.cables.map((cable: any) => cable.cable_id)
        let allClosureIds = networkDiagramData[j].features.closures.map((closure: any) => closure.id)
        let WMSFilterQuery = ''

        WMSFilterQuery += `L2_cable_no_scale:"id" IN ( ${allCableIds.join(' , ')} )`
        WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${allClosureIds.join(' , ')} )`

        map?.addLayer(
          new ImageLayer({
            zIndex: 2000,
            className: 'loopChainOverview',
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
          loopChainOverviewMaps.push(image)
        })

      }

      this.cleanMapLayers([ 'loopChainOverview', 'overviewLayer_polygon' ])

      /* 2. Get all access/loop chains, zoom into each one, export image for each map */
      for (let j = 0; j < networkDiagramData.length; j++) {

        let allFeatureIds: Array<string> = []

        /* This is the number of L3 closures where we start to cut up feed chains into mini maps. */
        const L3ClosuresThreshold = 3;

        /* Get a number of L3 closures because that's how we decide if we cut up feed cable maps. */
        const L3Closures = networkDiagramData[j].nodes.filter((node: any) => node.type === 'L3')

        /* Get loop chain geometry and fit the map view around it */
        networkDiagramData[j].nodes.map((node: any) => allFeatureIds.push(`closure.${node.id}`))
        networkDiagramData[j].edges.map((edge: any) => allFeatureIds.push(`cable.${edge.id}`))

        const res = await getWFSFeatureDetails(
          [ 'cable', 'closure' ],
          allFeatureIds
        )

        if (res && res.features.length) {

          let coordinates = [], convertedCoordinates = []

          /* Get coordinates for all closures*/
          for (let feature of res.features)
            if (feature.id.indexOf('closure') > -1)
              coordinates.push(feature.geometry.coordinates)


          /* Convert EPSG:4326 -> EPSG:3857 */
          for (let coordinate of coordinates)
            convertedCoordinates.push(ol.proj.transform(coordinate, 'EPSG:4326', 'EPSG:3857'))

          map?.getView().fit(ol.extent.boundingExtent(convertedCoordinates), {
            maxZoom: 18.8,
            padding: [ 40, 40, 40, 40 ]
          })

        }


        /* 2.1. Render Construction map ******************************************************************/
        await renderMapLayers(
          networkDiagramData,
          this.state.L2FeaturesInPolygon,
          'construction',
          map,
          j
        ).then(async () => {

          await generateBase64ImageFromMap(map).then(image => {
            constructionMaps.push(image)
          }).then(() => this.cleanMapLayers([ 'constructionLayer' ]))

        })


        /* 2.2. Render Cable Access maps ***************************************************************/
        await renderMapLayers(
          networkDiagramData,
          this.state.L2FeaturesInPolygon,
          'cable_access',
          map,
          j
        ).then(async () => {

          await generateBase64ImageFromMap(map).then(image => {
            cableAccessMaps.push(image)
          }).then(() => this.cleanMapLayers([ 'cableAccessLayer' ]))

        })


        /* 2.3. Render Cable Feed maps ***************************************************************/
        await renderMapLayers(
          networkDiagramData,
          this.state.L2FeaturesInPolygon,
          L3Closures.length > L3ClosuresThreshold ? 'cable_feed' : 'cable_feed_standalone',
          map,
          j
        ).then(async () => {

          await generateBase64ImageFromMap(map).then(image => {
            cableFeedMaps.push(image)
          }).then(() => this.cleanMapLayers([ 'cableFeedLayer' ]))

        })


        /* 2.4 If access chain has more than n L3 closures, render each L3->L4 feed chain map. */
        if (L3Closures && L3Closures.length > L3ClosuresThreshold) {

          let L3FeedChainMaps: Array<any> = []
          let L4PolygonsInFeedChain: Array<any> = []

          /* Run through each L3 Closure */
          for (const closure of L3Closures) {

            if (networkDiagramData[j].features.L4polygons.length) {
              networkDiagramData[j].features.L4polygons.forEach((L4polygon: any) =>
                L4PolygonsInFeedChain.push(L4polygon.id)
              )
            }

            const connections = networkDiagramData[j].edges.filter((edge: any) =>
              edge.inClosureType === 'L4' && edge.source === closure.id
            )
            const cableIds = connections.map((connection: any) => connection.id)
            const closureIds = connections.map((connection: any) => connection.target)
            closureIds.push(closure.id)

            const res = await getWFSFeatureDetails(
              [ 'cable', 'closure' ],
              [ ...cableIds.map((id: any) => `cable.${id}`), ...closureIds.map((id: any) => `closure.${id}`) ]
            )

            if (res && res.features.length) {

              let coordinates = [], convertedCoordinates = []

              /* Get coordinates for all closures*/
              for (let feature of res.features)
                if (feature.id.indexOf('closure') > -1)
                  coordinates.push(feature.geometry.coordinates)

              /* Convert EPSG:4326 -> EPSG:3857 */
              for (let coordinate of coordinates)
                convertedCoordinates.push(ol.proj.transform(coordinate, 'EPSG:4326', 'EPSG:3857'))

              map?.getView().fit(ol.extent.boundingExtent(convertedCoordinates), {
                maxZoom: 18.8,
                padding: [ 40, 40, 40, 40 ]
              })

              let filter = ''
              filter += `L2_cable_no_scale:"id" IN ( ${cableIds.join(' , ')} )`
              filter += `;L2_closure_no_scale:"id" IN ( ${closureIds.join(' , ')} )`
              filter += `;polygon:"id" IN ( ${L4PolygonsInFeedChain.join(' , ')} )`

              map?.addLayer(
                new ImageLayer({
                  zIndex: 2000,
                  className: 'feedChainMap',
                  source: new ImageWMS({
                    url: QGIS_SERVER_BUILDPACK,
                    crossOrigin: 'anonymous',
                    params: {
                      'LAYERS': [
                        'polygon',
                        'L2_co_pia_structure',
                        'L2_co_pia_duct',
                        'L2_cable_no_scale',
                        'L2_closure_no_scale',
                        'Addresses'
                      ],
                      'FILTER': filter
                    },
                    ratio: 1,
                    serverType: 'qgis',
                  }),
                  visible: true,
                }),
              )

              await generateBase64ImageFromMap(map).then(image => {
                L3FeedChainMaps.push(image)
              }).then(() => this.cleanMapLayers([ 'feedChainMap' ]))

            }

          }

          this.setState(prevState => ({
            feedChainMaps: [ ...prevState.feedChainMaps, L3FeedChainMaps ]
          }))


        } else {

          /* L3 closures < 3 */
          this.setState(prevState => ({
            feedChainMaps: [ ...prevState.feedChainMaps, [] ]
          }))

        }

      }

    }

    this.setState({
      constructionMaps: constructionMaps,
      cableFeedMaps: cableFeedMaps,
      cableAccessMaps: cableAccessMaps,
      loopChainOverviewMaps: loopChainOverviewMaps
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
        'overviewLayer_chains',
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

    if(this.state.PDFFileBlob && this.state.PDFFileName.length){
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

    const pdfWorker = new PDFWorkerWithSplicing()

    const userInformation = getUserNameAndEmailAddress(userReducer)

    const pdfData = {
      overviewMap: this.state.overviewMap ? this.state.overviewMap : '',
      overviewNetworkDiagram: this.state.overviewNetworkDiagram.length ? this.state.overviewNetworkDiagram[0] : [],
      networkDiagramMaps: this.state.networkDiagramMaps ? this.state.networkDiagramMaps : [],
      networkDiagramData: this.state.networkDiagramData!,
      loopChainOverviewMaps: this.state.loopChainOverviewMaps ? this.state.loopChainOverviewMaps : [],
      constructionMaps: this.state.constructionMaps ? this.state.constructionMaps : [],
      cableAccessMaps: this.state.cableAccessMaps ? this.state.cableAccessMaps : [],
      cableFeedMaps: this.state.cableFeedMaps ? this.state.cableFeedMaps : [],
      feedChainMaps: this.state.feedChainMaps ? this.state.feedChainMaps : [],
      L2FeaturesInPolygon: this.state.L2FeaturesInPolygon ? this.state.L2FeaturesInPolygon : [],
      splicingData: this.state.splicingData,
      aggregatedSplicingData: this.state.aggregatedSplicingData,
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
        pdfWorker.terminate()
      })
    })

  }

  renderPDFCompleteModal = () => {

    if (this.state.PDFisComplete) {
      return (
        <Row>
          <Col span={24} style={{ marginBottom: 10 }}>
            <Alert style={{ textAlign: 'justify' }}
                   icon={<FileDoneOutlined />}
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

              <Col xs={24} sm={24} lg={8} style={{ textAlign:'center', marginBottom: isMobile ? 10 : 0 }}>
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
      !this.state.splicingData.length ||
      !this.state.aggregatedSplicingData.length ||
      !this.state.networkDiagramData?.length);
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

                {/* Splicing Error Panel */}
                {
                  this.state.splicingDataError ?
                    <div className="splicingDataErrorInformation">
                      <Result
                        style={{ paddingTop: 100 }}
                        title="Splicing data is missing."
                        subTitle={"Please complete splicing in this area before running Build Pack"}
                      />
                    </div>
                    : <></>
                }

                {/* Map */}
                <div id="buildpack_map" style={{
                  opacity: this.state.buildPackRunning || !this.state.networkDiagramData || !this.state.splicingData.length || !this.state.aggregatedSplicingData.length ? '0.4' : '1',
                  display: this.state.diagramRunning || this.state.splicingDataError ? 'none' : 'block'
                }}/>

                {
                  this.state.diagramRunning ?
                    <NetworkDiagramL2
                      networkDiagramData={this.state.networkDiagramData!}
                      graph={this.state.graph}
                      networkDiagramMaps={this.state.networkDiagramMaps}
                      overviewNetworkDiagram={this.state.overviewNetworkDiagram}
                      handleNetworkDiagramBuild={this.handleNetworkDiagramBuild}
                    />
                    : <></>
                }
              </Col>


              {/* Sidebar */}
              <Col span={6}>
                <Card className="buildPackSidebar" title={
                  <Row>
                    <Col span={12} style={{ paddingTop: '8px', fontSize:'1.2em' }}>
                      <img src={NetomniaIcon} style={{ width: '24px',marginRight:5, paddingBottom: '4px' }}
                           alt="netomnia-icon"/>
                      <span style={{fontWeight:600}}>Build Pack</span>
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
                      With Splicing L2
                    </Descriptions.Item>

                    <Descriptions.Item label="Polygon ID">
                      {this.state.polygonId ? this.state.polygonId : '-'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Polygon Type">
                      {this.state.polygonType ?
                        this.state.polygonType :
                        <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                    </Descriptions.Item>

                    <Descriptions.Item label="EX Name" style={{ display: this.state.splicingDataError ? 'none' : '' }}>
                      {this.state.exPolygonName ? this.state.exPolygonName : '-'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Cable Diagram"
                                       style={{ display: this.state.splicingDataError ? 'none' : '' }}>
                      {this.state.networkDiagramData?.length ?
                        <Badge status="success" text="Loaded"/> :
                        <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                    </Descriptions.Item>

                    <Descriptions.Item label="Splicing Data"
                                       style={{ display: this.state.splicingDataError ? 'none' : '' }}>
                      {this.state.splicingData.length ?
                        <Badge status="success" text="Loaded"/> :
                        <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                    </Descriptions.Item>

                    <Descriptions.Item label="Aggregated Splicing Data"
                                       style={{ display: this.state.splicingDataError ? 'none' : '' }}>
                      {this.state.aggregatedSplicingData.length ?
                        <Badge status="success" text="Loaded"/> :
                        <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                    </Descriptions.Item>

                    <Descriptions.Item label="Access Chains"
                                       style={{ display: this.state.splicingDataError ? 'none' : '' }}>
                      {this.state.networkDiagramData?.length ? this.state.networkDiagramData.length :
                        <span><Spin size="small" style={{ marginRight: '5px' }}/> Loading ...</span>}
                    </Descriptions.Item>


                  </Descriptions>


                  <Descriptions
                    bordered
                    size="small"
                    column={1}
                    style={{
                      marginTop: '30px',
                      fontSize: '0.6em',
                      paddingLeft: '10px',
                      display: this.state.splicingDataError ? 'none' : ''
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

                  </Descriptions>

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


export default withRouter(connect(mapState, mapDispatch)(L2BuildPackSplicing))