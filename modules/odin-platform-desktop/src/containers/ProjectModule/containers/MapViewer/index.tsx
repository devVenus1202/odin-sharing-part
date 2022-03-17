import React, { useEffect, useState } from 'react';
import { Card, Col, Layout, Result, Row, Spin } from 'antd';
import ol from "openlayers";
import proj4 from "proj4";
import Map from "ol/Map";
import { ScaleLine } from "ol/control";
import { Image as ImageLayer, Tile as TileLayer } from "ol/layer";
import XYZ from "ol/source/XYZ";
import View from "ol/View";
import { connect } from "react-redux";
import { MapReducerUpdate, updateMapState } from "../../../../core/gis/store/actions";
import './styles.scss'
import { MapReducer } from "../../../../core/gis/store/reducer";
import { getWFSFeatureDetails } from "../BuildPack/L2BuildPackSplicing/helpers";
import ImageWMS from "ol/source/ImageWMS";
import { httpGet } from "../../../../shared/http/requests";

type mapData = Array<{
  feature: string,
  ids: Array<number>
}> | []


type Props = {
  columnFullscreen?: any,
  mapReducer: MapReducer
  updateMap: any,
  features?: mapData,
  polygonId?: number
}

const REACT_APP_QGIS_SERVER_URL = 'https://api.odin.prod.netomnia.com/cgi-bin/qgis_mapserv.fcgi?map=/home/qgis/projects/project.qgs';

const MapViewer = (props: Props) => {

  const mapRef = React.useRef(null);
  const [ loadingData, setLoadingData ] = useState(true)
  const [ loadingError, setLoadingError ] = useState<boolean | null>(false)
  const [ mapData, setMapData ] = useState<mapData>([])
  const { mapReducer, updateMap, columnFullscreen, polygonId, features } = props

  const initializeMap = async () => {

    ol.proj.setProj4(proj4)

    proj4.defs(
      'EPSG:27700',
      '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs',
    )

    console.log('%c Map is rendering', 'color:limegreen')

    const map = new Map({
      target: 'MapViewerMap',
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
          visible: true,
          zIndex: 100
        })
      ],
      view: new View({
        resolution: 150,
        enableRotation: true,
        constrainOnlyCenter: false,
      })
    })

    await loadFeaturesAndZoom(map).then(() => {
      updateMap({ map })
      setLoadingData(false)
    })

  }


  const loadFeaturesAndZoom = async (map: any) => {

    let allFeatures: Array<string> = []
    let allFeatureIds: Array<string> = []
    let WMSLayers: Array<string> = []
    let WMSFilters: string = ''

    mapData.forEach((feature: any) => {

      WMSLayers.push(feature.feature)
      WMSFilters += `${feature.feature}:"id" IN ( ${feature.ids.join(' , ')} );`

      /* Closures are good feature for constructing bounding boxes in Maps. */
      if (feature.feature === 'closure') {
        allFeatures.push(feature.feature)
        feature.ids.forEach((id: number) => {
          allFeatureIds.push(`${feature.feature}.${id}`)
        })
      }

    })

    map.addLayer(
      new ImageLayer({
        zIndex: 1000,
        source: new ImageWMS({
          url: REACT_APP_QGIS_SERVER_URL,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayers,
            'FILTER': WMSFilters
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      }),
    )

    await getWFSFeatureDetails(
      allFeatures,
      allFeatureIds
    ).then((res: any) => {

      if (res && res.features.length) {

        let coordinates = [], convertedCoordinates = []

        /* Get coordinates for all closures */
        for (let feature of res.features)
          coordinates.push(feature.geometry.coordinates)

        /* Convert EPSG:4326 -> EPSG:3857 */
        for (let coordinate of coordinates) {

          let convertedCoordinate = ol.proj.transform(coordinate, 'EPSG:4326', 'EPSG:3857')

          if (convertedCoordinate)
            convertedCoordinates.push(convertedCoordinate)

        }

        /* Get bounding box for the map and zoom in. */
        if (convertedCoordinates) {
          map.getView().fit(ol.extent.boundingExtent(convertedCoordinates), {
            maxZoom: polygonId ? 17 : 18.8,
            padding: polygonId ? [ 80, 40, 260, 40 ] : [ 10, 10, 10, 10 ]
          })
        }

      }

    })


  }


  /* Get either features or polygonId, and construct map data form it. */
  useEffect(() => {

    if (features && features.length && mapRef.current!) {

      setMapData(features)

      console.log('%cMap:Features are provided:', 'color:limegreen', mapData)
    } else if (!features && polygonId && mapRef.current!) {

      getCablesAndClosuresOnPolygonId(polygonId)
      console.log('%cMap:Polygon id is provided:', 'color:limegreen', polygonId)
    } else {

      console.log('%cNo features or polygon provided', 'color:red', mapData)
      setLoadingError(true)
      setLoadingData(false)

    }

  }, [ features, polygonId ])


  /* Update map size on details column resize */
  useEffect(() => {
    const { map } = mapReducer
    map?.updateSize()
  }, [ columnFullscreen ])

  /* Render map when map data is available */
  useEffect(() => {

    if (mapData.length) {
      console.log('%cMap data:', 'color:HotPink', mapData)
      initializeMap()
    }

  }, [ mapData ])


  /**
   * Get back loop chains, extract closures and cables for WMS queries.
   *
   * @param polygonId
   */
  const getCablesAndClosuresOnPolygonId = (polygonId: number) => {

    httpGet(
      `ProjectModule/v1.0/cst/graph/polygon/${polygonId}`,
    ).then(res => {

        let loopChains = []

        if (res.data && res.data.data && res.data.data.length) {

          loopChains = res.data.data

          let allCables: Array<number> = []
          let allClosures: Array<number> = []

          loopChains.forEach((loopChain: any) => {
            loopChain.edges.forEach((edge: any) => {
              allCables.push(Number(edge.id))
            })
            loopChain.nodes.forEach((node: any) => {
              allClosures.push(Number(node.id))
            })
          })

          setMapData([
            { feature: 'polygon', ids: [ polygonId ] },
            { feature: 'cable', ids: allCables },
            { feature: 'closure', ids: allClosures, },
          ])

        } else {
          setLoadingError(true)
          setLoadingData(false)
        }

      },
    ).catch(err => {
      console.log('%cThere was an error loading Cable diagram data.', 'color:red', err)
      setLoadingError(true)
      setLoadingData(false)
    });

  }


  const { Content } = Layout

  return (
    <Card size="small" title={`Map Viewer ${polygonId ? polygonId : ''}`} className="mapViewerCard">
      <Layout style={{ padding: '1px' }}>
        <Content style={{ overflowY: mapData?.length || loadingError ? 'hidden' : 'initial' }}>
          <Row>
            <Col span={24}>
              <div style={{ height: '93vh', width: '100%', backgroundColor: '#fff' }}>
                {
                  loadingData ?
                    <div style={{ height: '94vh', width: '100%', textAlign: 'center' }}>
                      <Spin size="large" style={{ marginTop: '250px' }}/>
                      <h2 style={{ marginTop: '50px' }}>Loading Map data...</h2>
                    </div>
                    : <></>
                }
                {
                  loadingError ?
                    <div style={{ height: '97vh', width: '100%', textAlign: 'center' }}>
                      <Result
                        style={{ paddingTop: 100 }}
                        status="error"
                        title="Error"
                        subTitle={`Check if Map Viewer is provided with features & ids, or if polygon has splicing information.`}
                      />
                    </div>
                    : <></>
                }
                <div id="MapViewerMap" style={{ height: '94vh', width: '100%' }} ref={mapRef}/>
              </div>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Card>
  )
}

const mapDispatch = (dispatch: any) => ({ updateMap: (params: MapReducerUpdate) => dispatch(updateMapState(params)) })

const mapState = (state: any) => ({ mapReducer: state.mapReducer })

export default connect(mapState, mapDispatch)(MapViewer)

