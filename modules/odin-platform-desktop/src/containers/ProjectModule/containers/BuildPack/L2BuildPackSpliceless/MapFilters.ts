import { layerSet, mapTypes, networkDiagramData, QGIS_SERVER_BUILDPACK } from "./types";
import { Image as ImageLayer } from "ol/layer";
import ImageWMS from "ol/source/ImageWMS";

export const createWMSLayerForMultipleFeaturesAndIds = (features: layerSet, mapType: mapTypes, map:any) => {


  const { cableIds, closureIds, chamberIds, poleIds, ductIds } = features
  let WMSLayerQuery: string[] = [], WMSFilterQuery: string = ""

  /* Overview map *********************************************************************************/

  if (mapType === 'overview') {

    WMSLayerQuery.push('L2_ov_pia_structure', 'L2_ov_pia_duct')

    if (cableIds.length) {
      WMSLayerQuery.push('L2_ov_cable')
      WMSFilterQuery += `L2_ov_cable:"id" IN ( ${cableIds.join(' , ')} )`
    }

    if (closureIds.length) {
      WMSLayerQuery.push('L2_ov_closure')
      WMSFilterQuery += `;L2_ov_closure:"id" IN ( ${closureIds.join(' , ')} )`
    }

    if (chamberIds.length) {
      WMSLayerQuery.push('L2_ov_chamber')
      WMSFilterQuery += `;L2_ov_chamber:"id" IN ( ${closureIds.join(' , ')} )`
    }

    if (poleIds.length) {
      WMSLayerQuery.push('L2_ov_pole')
      WMSFilterQuery += `;L2_ov_pole:"id" IN ( ${poleIds.join(' , ')} )`
    }


    map?.addLayer(
      new ImageLayer({
        zIndex: 2000,
        className: 'overviewLayer_chains',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayerQuery,
            'FILTER': WMSFilterQuery
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      })
    )

  }

  /* Construction map *********************************************************************************/
  else if (mapType === 'construction') {

    WMSLayerQuery.push('L2_co_pia_structure', 'L2_co_pia_duct')

    if (poleIds.length) {
      WMSLayerQuery.push('L2_co_pole')
      WMSFilterQuery += `L2_co_pole:"id" IN ( ${poleIds.join(' , ')} )`
    }

    if (chamberIds.length) {
      WMSLayerQuery.push('L2_co_chamber')
      WMSFilterQuery += `;L2_co_chamber:"id" IN ( ${chamberIds.join(' , ')} )`

    }

    if (ductIds.length) {
      WMSLayerQuery.push('New_duct')
      WMSFilterQuery += `;New_duct:"id" IN ( ${ductIds.join(' , ')} )`
    }


    map?.addLayer(
      new ImageLayer({
        zIndex: 2000,
        className: 'constructionLayer',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayerQuery,
            'FILTER': WMSFilterQuery
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      }),
    )

  }


  /* Cable Access map *********************************************************************************/
  else if (mapType === 'cable_access') {

    WMSLayerQuery.push('L2_ov_pia_duct', 'L2_ov_pia_structure')
    WMSFilterQuery += `L2_ov_pia_structure:"object_class" = 'JB' OR "object_class" = 'POLE'`

    if (cableIds.length) {
      WMSLayerQuery.push('L2_cable_no_scale')
      WMSFilterQuery += `;L2_cable_no_scale:"id" IN ( ${cableIds.join(' , ')} )`
    }

    if (closureIds.length) {
      WMSLayerQuery.push('L2_closure_no_scale')
      WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${closureIds.join(' , ')} )`
    }


    map?.addLayer(
      new ImageLayer({
        zIndex: 2000,
        className: 'cableAccessLayer',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayerQuery,
            'FILTER': WMSFilterQuery
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      }),
    )

  }


  /* Cable Feed map *********************************************************************************/
  else if (mapType === 'cable_feed') {

    const { L4PolygonIds } = features

    if (cableIds.length) {
      WMSLayerQuery.push('L2_cable_no_scale')
      WMSFilterQuery += `L2_cable_no_scale:"id" IN ( ${cableIds.join(' , ')} )`
    }

    if (closureIds.length) {
      WMSLayerQuery.push('L2_closure_no_scale')
      WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${closureIds.join(' , ')} )`
    }

    map?.addLayer(
      new ImageLayer({
        zIndex: 2000,
        className: 'cableFeedLayer',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayerQuery,
            'FILTER': WMSFilterQuery
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      }),
    )

  }


  /* Cable Feed Standalone map ***************************************************************************/
  else if (mapType === 'cable_feed_standalone') {

    const { L4PolygonIds } = features

    if (cableIds.length) {
      WMSLayerQuery.push('L2_cable_no_scale')
      WMSFilterQuery += `L2_cable_no_scale:"id" IN ( ${cableIds.join(' , ')} )`
    }

    if (closureIds.length) {
      WMSLayerQuery.push('L2_closure_no_scale')
      WMSFilterQuery += `;L2_closure_no_scale:"id" IN ( ${closureIds.join(' , ')} )`
    }

    if (L4PolygonIds && L4PolygonIds.length) {
      WMSLayerQuery.push('polygon')
      WMSFilterQuery += `;polygon:"id" IN ( ${L4PolygonIds.join(' , ')} )`
    }

    WMSLayerQuery.push('Addresses')

    map?.addLayer(
      new ImageLayer({
        zIndex: 2000,
        className: 'cableFeedLayer',
        source: new ImageWMS({
          url: QGIS_SERVER_BUILDPACK,
          crossOrigin: 'anonymous',
          params: {
            'LAYERS': WMSLayerQuery,
            'FILTER': WMSFilterQuery
          },
          ratio: 1,
          serverType: 'qgis',
        }),
        visible: true,
      }),
    )

  }

  map?.renderSync()

}

export const renderMapLayers = async (networkDiagram: networkDiagramData, L2features:any, mapType: mapTypes, map:any, loopChain?: number) => {

  let cableIds: string[] = [],
    closureIds: string[] = [],
    chamberIds: string[] = [],
    ductIds: string[] = [],
    poleIds: string[] = [],
    L4PolygonIds: string[] = []


  /* Cable Feed map */
  if (networkDiagram && mapType === 'cable_feed' || networkDiagram && mapType === 'cable_feed_standalone') {

    if (networkDiagram[loopChain!].features.cables.length) {
      networkDiagram[loopChain!].features.cables.forEach((cable: any) => {
        if (cable.cable_type === 'Feed')
          cableIds.push(cable.cable_id)
      })
    }

    if (networkDiagram[loopChain!].features.closures.length) {
      networkDiagram[loopChain!].features.closures.forEach((closure: any) => {
        if (closure.name === 'L3' || closure.name === 'L4')
          closureIds.push(closure.id)
      })
    }

    if (networkDiagram[loopChain!].features.L4polygons.length) {
      networkDiagram[loopChain!].features.L4polygons.forEach((L4polygon: any) =>
        L4PolygonIds.push(L4polygon.id)
      )
    }

    /* Create WMS Layers for the map type */
    createWMSLayerForMultipleFeaturesAndIds({
      cableIds: cableIds,
      closureIds: closureIds,
      chamberIds: chamberIds,
      ductIds: ductIds,
      poleIds: poleIds,
      L4PolygonIds: L4PolygonIds
    }, mapType, map)

    cableIds = []
    closureIds = []
    L4PolygonIds = []

  }


  /* Cable Access map */
  if (networkDiagram && mapType === 'cable_access') {

    if (networkDiagram[loopChain!].features.cables.length) {
      networkDiagram[loopChain!].features.cables.map((cable: any) => {
        if (cable.cable_type === 'Access')
          cableIds.push(cable.cable_id)
      })
    }

    if (networkDiagram[loopChain!].features.closures.length) {
      networkDiagram[loopChain!].features.closures.map((closure: any) => {
        if (closure.name === 'L2' || closure.name === 'L3')
          closureIds.push(closure.id)
      })
    }

    /* Create WMS Layers for the map type */
    createWMSLayerForMultipleFeaturesAndIds({
      cableIds: cableIds,
      closureIds: closureIds,
      chamberIds: chamberIds,
      ductIds: ductIds,
      poleIds: poleIds
    }, 'cable_access', map)

  }

  /* Construction map */
  else if (networkDiagram && mapType === 'construction') {

    if (networkDiagram[loopChain!].features.chambers.length)
      networkDiagram[loopChain!].features.chambers.map((chamber: any) => chamberIds.push(chamber.id))

    if (networkDiagram[loopChain!].features.poles.length)
      networkDiagram[loopChain!].features.poles.map((pole: any) => poleIds.push(pole.id))


    if (L2features) {
      L2features.chambers.map((chamber: any) => chamberIds.push(chamber.id))
      L2features.ducts.map((duct: any) => ductIds.push(duct.id))
      L2features.poles.map((pole: any) => poleIds.push(pole.id))
    }

    /* Create WMS Layers for the map type */
    createWMSLayerForMultipleFeaturesAndIds({
      cableIds: cableIds,
      closureIds: closureIds,
      chamberIds: chamberIds,
      ductIds: ductIds,
      poleIds: poleIds
    }, 'construction', map)


    cableIds = []
    closureIds = []
    L4PolygonIds = []
    chamberIds = []
    ductIds = []

  }


  /* Overview map */
  else if (networkDiagram && mapType === 'overview') {

    /* Extract all feature ids from each loop chain. */
    for (let loopChain of networkDiagram) {

      if (loopChain.features.cables.length)
        loopChain.features.cables.map((cable: any) => cableIds.push(cable.cable_id))

      if (loopChain.features.closures.length)
        loopChain.features.closures.map((closure: any) => closureIds.push(closure.id))

      if (loopChain.features.chambers.length)
        loopChain.features.chambers.map((chamber: any) => chamberIds.push(chamber.id))

      if (loopChain.features.ducts.length)
        loopChain.features.ducts.map((duct: any) => ductIds.push(duct.id))

      if (loopChain.features.poles.length)
        loopChain.features.poles.map((pole: any) => poleIds.push(pole.id))

    }

    /* Create WMS Layers for the map type */
    createWMSLayerForMultipleFeaturesAndIds({
      cableIds: cableIds,
      closureIds: closureIds,
      chamberIds: chamberIds,
      ductIds: ductIds,
      poleIds: poleIds
    }, 'overview', map)

    cableIds = []
    closureIds = []
    L4PolygonIds = []
    chamberIds = []
    ductIds = []

  }


}
