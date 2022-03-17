import axios from "axios";

const REACT_APP_QGIS_SERVER_URL = process.env.REACT_APP_QGIS_SERVER_URL || 'https://api.odin.prod.netomnia.com/cgi-bin/qgis_mapserv.fcgi?map=/home/qgis/projects/project.qgs';


export const getChainFromSplicelessData = (response: any, startingClosureType: string, endingClosureType: string) => {

  let filteredEdges: any = []

  /* this gets all edges by a sourceType */
  const filterGroupedEdgesByType = (startingClosureType: string) => {
    for (const res of response) {
      const l1Edges = res.edges.filter((elem: any) => elem.sourceClosureType === startingClosureType)
      for (const edge of l1Edges) {
        filteredEdges.push(edge)
      }
    }
  }

  filterGroupedEdgesByType(startingClosureType)

// This parses the dependentNodes by type and returns an array of ids
  const getDependentNodeIds = (dependentNodes: string[], endingNodeType: string): number[] => {

    const filtered = dependentNodes.filter(elem => elem.indexOf(endingNodeType) > -1)
    const nodeIds: any[] = filtered.map(elem => {
      const split = elem.split('-')
      if (split[0]) {
        return Number(split[1])
      }
    })
    return nodeIds;
  }

// this gets all nodes by nodeIds
  const getNodesByIds = (response: any[] | [], nodeIds: number[]) => {
    const data = []
    for (const res of response) {
      const nodes = res.nodes.filter((elem: any) => nodeIds.includes(elem.id))
      if (nodes.length > 0) {
        data.push(...nodes)
      }
    }
    return data;
  }

// This function recursively goes through all node arrays up to the endingNodeType
  const filterNodesRecursively = (dependentNodes: string[], endingNodeType: string, array: any[] = []) => {
    const finalResults = array || []

    if (dependentNodes) {
      const nodeIds = getDependentNodeIds(dependentNodes, endingNodeType)
      if (nodeIds.length > 0) {
        const data = getNodesByIds(response, nodeIds)
        if (data.length > 0) {
          for (const elem of data) {
            finalResults.push(elem)
            if (elem.dependentNodes) {
              filterNodesRecursively(elem.dependentNodes, endingNodeType, finalResults)
            }
          }
        }
      }
    }
    return finalResults;
  }

// This function gos over each of the filtered edges and returns the
// parentNode and all childNodes(n) layers deep
  const finalResults = []

  for (const res of response) {
    const targetNodes = res.nodes.filter((elem: any) => filteredEdges.map((elem: any) => elem.source).includes(elem.id))

    for (const node of targetNodes) {
      const data = filterNodesRecursively(node.dependentNodes, endingClosureType, [])
      finalResults.push({
        parentNode: node,
        childNodes: data,
      })
    }
  }

  return finalResults;

}


export const generateBase64ImageFromMapStatic = (map: any) => {

  let dataURL


  map?.once('postrender', function () {

    let mapCanvas = document.createElement('canvas')
    let size = map?.getSize()

    if (size) {
      mapCanvas.width = size[0]
      mapCanvas.height = size[1]
    }

    let mapContext = mapCanvas.getContext('2d')

    Array.prototype.forEach.call(
      document.querySelectorAll(
        '.ol-layer canvas, .overviewLayer_polygon canvas, .googleLayer canvas, .loopChainOverview canvas, .cableLayer canvas'),
      function (canvas) {
        if (canvas.width > 0) {

          let opacity = canvas.parentNode.style.opacity;
          // @ts-ignore
          mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity)
          let transform = canvas.style.transform

          let matrix = transform
            .match(/^matrix\(([^\(]*)\)$/)[1]
            .split(',')
            .map(Number);
          CanvasRenderingContext2D.prototype.setTransform.apply(
            mapContext,
            matrix
          )

          /* We are grayscaling google maps because we can */
          if (canvas.parentNode.className === 'googleLayer') {
            const ctx = canvas.getContext('2d');
            ctx.filter = 'grayscale(100%)'
          }

          // @ts-ignore
          mapContext.drawImage(canvas, 0, 0)

        }
      }
    )
    dataURL = mapCanvas.toDataURL()
  })
  map?.renderSync()

  return dataURL

}


export const generateBase64ImageFromMap = async (map: any) => {

  return await new Promise(async (resolve) => {

    map?.once('rendercomplete', async () => {
      let mapCanvas = document.createElement('canvas')
      let size = map?.getSize();

      if (size) {
        mapCanvas.width = size[0]
        mapCanvas.height = size[1]
      }

      let mapContext = mapCanvas.getContext('2d')
      Array.prototype.forEach.call(
        document.querySelectorAll(
          '.ol-layer canvas, .overviewLayer_polygon canvas, .googleLayer canvas, .loopChainOverview canvas, .cableLayer canvas'),
        function (canvas) {
          if (canvas.width > 0) {
            let opacity = canvas.parentNode.style.opacity;
            // @ts-ignore
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity)
            let transform = canvas.style.transform
            let matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1]
              .split(',')
              .map(Number);
            CanvasRenderingContext2D.prototype.setTransform.apply(
              mapContext,
              matrix,
            )

            /* We are grayscaling google maps because we can */
            if (canvas.parentNode.className === 'googleLayer') {
              const ctx = canvas.getContext('2d');
              ctx.filter = 'grayscale(100%)'
            }

            // @ts-ignore
            mapContext.drawImage(canvas, 0, 0)
          }
        },
      )

      map?.renderSync()

      return resolve(mapCanvas.toDataURL())
    })

  }).catch(err => {
    console.error(err)
  })

}


export const spreadFeatureIdsForWMSQuery = (featureIds: Array<string>) => {

  let query = 'IN ('

  featureIds.map((featureId: string, i: number) => {
    if (i === 0)
      query = query + ` '${featureId}'`
    else
      query = query + ` , '${featureId}'`
  })

  query = query + ' )'

  return query
}

/**
 * featureType = ['cable','closure', ...]
 * featureIds  = ['cable.123','cable.456','closure.789' ...]
 *
 * @param featureType
 * @param featureIds
 */
export const getWFSFeatureDetails = async (featureType: Array<string>, featureIds: Array<string>) => {

  let WFSURL = `${REACT_APP_QGIS_SERVER_URL}&SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&TYPENAME=${featureType.join(
    ',')}&MAXFEATURES=100&OUTPUTFORMAT=GeoJSON&FEATUREID=${featureIds.join(',')}`


  const data = await axios.get(WFSURL);

  if (data.data.features && data.data.features.length) {
    return { features: data.data.features }
  }

}


export function getUniqueListBy(arr: any[], key: any) {
  return [ ...new Map(arr.map(item => [ item[key], item ])).values() ]
}

export function getLoopChainEdges(edges: any[]) {

  let response = []

  const loopChainIds = edges.filter((edge: any) => edge.loopChainId !== null)
    .map((edge: any) => Number(edge.loopChainId))

  const uniqueLoopChainIds = [ ...new Set(loopChainIds) ]

  for (const loopChainId of uniqueLoopChainIds) {

    const targetedEdge = edges.filter((edge: any) => edge.loopChainId === loopChainId)

    response.push(getUniqueListBy(targetedEdge, 'id'))

  }

  return response

}


export function getClosuresForLoops(loopChain: any[], nodes: any[]) {

  let response = []

  /* Each loop chain*/
  for (const edge of loopChain) {

    for (const node of nodes) {

      if (node.id === edge.source)
        response.push(node)

      if (node.id === edge.target)
        response.push(node)

    }

  }

  return getUniqueListBy(response, 'id')

}


const constructCableTitle = (edge: any) => {

  return `${edge.id} [${edge.type}] ${edge.isLoop === 'true' || edge.loopChainId ? `[LOOP ${edge.loopChainId}]` : ''}`

}

const getChamberStyle = (ClosureType: string) => {
  switch (ClosureType) {
    case 'L0':
      return { fill: '#ff0000', color: '#fff', stroke: '#000' }
    case 'L1':
      return { fill: '#0000ff', color: '#fff', stroke: '#000' }
    case 'L2':
      return { fill: '#00ff00', color: '#000', stroke: '#000' }
    case 'L3':
      return { fill: '#ffff00', color: '#000', stroke: '#000' }
    case 'L4':
      return { fill: '#ffa500', color: '#000', stroke: '#000' }
    default:
      return { fill: '#515151', color: '#fff', stroke: '#000' }
  }
}


const getCableColor = (cableType: string, loopChainId: number | null) => {


  if (loopChainId) {

    switch (loopChainId) {
      case 1:
        return '#2b4cff'
      case 2:
        return '#d74796'
      case 3:
        return '#ec9e3c'
      case 4:
        return '#00c90f'
      case 5:
        return '#bfef44'
      case 6:
        return '#2ad7ab'
      case 7:
        return '#ff5446'
      default:
        return '#000'
    }


  } else {

    switch (cableType) {
      case 'Spine':
        return '#fe0000'
      case 'Distribution':
        return '#0000fe'
      case 'Access':
        return '#00ff00'
      case 'Feed':
        return '#e61ee0'
      default:
        return '#000'
    }

  }

}

/**
 *
 * @param cableDiagramData
 * @param targetLoopChain
 */
export function filterCableDiagramData(cableDiagramData: any, targetLoopChain: number) {

  let nodes = [], edges = [], graphEdges = [], graphNodes = [], targetedEdges = []


  edges = getLoopChainEdges(cableDiagramData.edges)

  targetedEdges = edges[targetLoopChain]


  for (const edge of targetedEdges) {

    graphEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: constructCableTitle(edge),
      size: edge.isLoop === 'true' || edge.loopChainId ? 8 : 2,
      labelCfg: {
        autoRotate: true,
        refY: 15,
        refX: 0
      },
      style: {
        stroke: getCableColor(edge.type, edge.loopChainId),
        opacity: 1,
        fontSize: 7
      }

    })

  }

  nodes = getClosuresForLoops(graphEdges, cableDiagramData.nodes)

  for (const node of nodes) {

    graphNodes.push({
      id: node.id,
      label: node.type + '\n' + node.id,
      type: node.type,
      style: getChamberStyle(node.type)
    })

  }

  return ({
    nodes: graphNodes,
    edges: graphEdges
  })


}


export const createWMSLayersFromFeatureIds = (layers: any, allFeatures: any) => {

  if (!allFeatures.cables.length)
    layers.filter((layer: any) =>
      layer.indexOf('cable') === -1
    )

  if (!allFeatures.closures.length)
    layers.filter((layer: any) =>
      layer.indexOf('closure') === -1
    )

  if (!allFeatures.chambers.length)
    layers = layers.filter((layer: any) =>
      layer.indexOf('chamber') === -1
    )

  if (!allFeatures.poles.length)
    layers = layers.filter((layer: any) =>
      layer.indexOf('pole') === -1
    )

  return layers
}

export const createWMSFilterFromFeatureIds = (featureName: string, allFeatures: any) => {

  let selectedFeature = []
  let response = ''

  if (featureName.indexOf('cable') > -1) {
    selectedFeature = allFeatures.cables
  } else if (featureName.indexOf('closure') > -1) {
    selectedFeature = allFeatures.closures
  } else if (featureName.indexOf('chamber') > -1) {
    selectedFeature = allFeatures.chambers
  } else if (featureName.indexOf('pole') > -1) {
    selectedFeature = allFeatures.poles
  }

  if (selectedFeature.length) {
    response = `${featureName}:`
    selectedFeature.map((feature: any, i: number) => {
      response += `"id" = ${feature.feature_id}` + `${selectedFeature.length > (i + 1) ? ' OR ' : ''}`
    })
    response += ';'
  }

  return response
}


