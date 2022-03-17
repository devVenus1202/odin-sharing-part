export function getLoopChainEdges(edges: any[]) {

  let response = []

  const loopChainIds = edges.filter((edge: any) => edge.loopChainId !== null)
    .map((edge: any) => Number(edge.loopChainId))

  // @ts-ignore
  const uniqueLoopChainIds = [ ...new Set(loopChainIds) ]

  for (const loopChainId of uniqueLoopChainIds) {
    response.push(edges.filter((edge: any) => edge.loopChainId === loopChainId))
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

  return response

}


const constructCableTitle = (cableDiagramData: Array<any>, edge: any) => {

  return `${edge.id} - ${edge.type} - ${getCableLength(cableDiagramData, edge.id)}m ${edge.isLoop === 'true' ||
   edge.loopChainId ? ` - LOOP ${edge.loopChainId}` : ''}`
  //return `${edge.id} - ${edge.type} - ${edge.isLoop === 'true' || edge.loopChainId ? ` - LOOP ${edge.loopChainId}` : ''}`

}

export const getChamberStyle = (ClosureType: string) => {

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
    case 'LM':
      return { fill: '#e51cc7', color: '#fff', stroke: '#000' }
    default:
      return { fill: '#515151', color: '#fff', stroke: '#000' }
  }
}


export const getStaticColorFromArray = (pos: number | null) => {

  const colors = [
    '#F44336',
    '#9C27B0',
    '#3D5AFE',
    '#00BCD4',
    '#1DE9B6',
    '#43A047',
    '#9E9D24',
    '#607D8B',
    '#FF4081',
    '#651FFF',
    '#2196F3',
    '#F57F17',
    '#8D6E63',
    '#1DE9B6',
    '#43A047',
    '#9E9D24',
    '#F44336',
    '#9C27B0',
    '#3D5AFE',
    '#00BCD4',
    '#1DE9B6',
    '#43A047',
    '#9E9D24',
    '#607D8B',
    '#FF4081',
    '#651FFF',
    '#2196F3',
    '#F57F17',
    '#8D6E63',
    '#1DE9B6',
    '#43A047',
    '#9E9D24',
  ]

  return colors[pos || 0]

}

export const getCableColor = (cableType: string, loopChainId: number | null) => {

  if (loopChainId) {

    return getStaticColorFromArray(loopChainId)

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


const getCableLength = (cableDiagramData: Array<any>, edge_id: string) => {

  let allCables = []

  for (const loopChain of cableDiagramData) {
    allCables.push(...loopChain.features.cables)
  }

  const targetedCable = allCables.find((cable: any) => cable.cable_id === Number(edge_id))

  if (targetedCable) {
    return String(Number(targetedCable.cable_length).toFixed(0))
  } else {
    return 'Length unknown'
  }
}


const getNearestAddress = (cableDiagramData: Array<any>, node_id: string) => {

  let allClosures = []

  for (const loopChain of cableDiagramData) {
    allClosures.push(...loopChain.features.closures)
  }

  const targetedClosure = allClosures.find((closure: any) => closure.id === Number(node_id))

  if (targetedClosure) {
    return String(targetedClosure.nearest_address)
  } else {
    return '-'
  }
}


export function filterCableDiagramData(cableDiagramData: any, targetLoopChain: 'ALL' | number) {

  let nodes = [], graphEdges = [], graphNodes = [], targetedEdges = []

  if (targetLoopChain === 'ALL') {

    for (const loopChain of cableDiagramData) {
      targetedEdges.push(...loopChain.edges)
      nodes.push(...loopChain.nodes)
    }

  } else {

    targetedEdges = cableDiagramData[targetLoopChain - 1].edges
    nodes = cableDiagramData[targetLoopChain - 1].nodes

  }

  for (const edge of targetedEdges) {

    graphEdges.push({
      source: String(edge.source),
      target: String(edge.target),
      label: constructCableTitle(cableDiagramData, edge),
      length: getCableLength(cableDiagramData, edge.id),
      size: edge.isLoop === 'true' || edge.loopChainId ? 8 : 2,
      labelCfg: {
        autoRotate: true,
        refY: 15,
        refX: 0,
      },
      style: {
        stroke: getCableColor(edge.type, edge.loopChainId),
        opacity: 1,
        fontSize: 7,
      },
    })

  }


  for (const node of nodes) {

    graphNodes.push({
      id: String(node.id),
      closure: node.closure,
      label: node.type + '\n' + String(node.id),
      type: node.type,
      taskUniqueRef: node.taskUniqueRef,
      nearestAddress: getNearestAddress(cableDiagramData, node.id),
      buildStatus: node.buildSatus,
      style: getChamberStyle(node.type),
      labelCfg: {
        style: {
          fill: getChamberStyle(node.type).color,
        },
      },
    })

  }

  return ({
    nodes: graphNodes,
    edges: graphEdges,
  })

}
