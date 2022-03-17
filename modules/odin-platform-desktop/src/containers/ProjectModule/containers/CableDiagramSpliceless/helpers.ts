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

  return `${edge.id} - ${edge.type} - ${getCableLength(cableDiagramData, edge.id)}m`

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




export const getCableColor = (cableType: string) => {

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


const getCableLength = (cableDiagramData: any, edge_id: string) => {

  const targetedCable = cableDiagramData.features.cables.find((cable: any) => cable.cable_id === Number(edge_id))

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


export const getEdgesAndNodesForSplicelessData = (parentChildCollections:any, cableDiagramData:any) => {


  let graphEdges:Array<any> = [], graphNodes:Array<any> = []


  console.log('%cRaw data:', 'color:HotPink', cableDiagramData)
  console.log('%cFiltered data:', 'color:HotPink', parentChildCollections)

  if(parentChildCollections.length){

    parentChildCollections.forEach((parentChildCollection:any) => {

      /* Find the parent node and push to Nodes */
      const parentNode = cableDiagramData.nodes.find((node:any) => node.id === parentChildCollection.parentNode.id)

      graphNodes.push({
        id: String(parentNode.id),
        closure: parentNode.closure,
        label: parentNode.type + '\n' + String(parentNode.id),
        type: parentNode.type,
        taskUniqueRef: parentNode.taskUniqueRef,
        //nearestAddress: getNearestAddress(cableDiagramData, parentNode.id),
        buildStatus: parentNode.buildSatus,
        style: getChamberStyle(parentNode.type),
        labelCfg: {
          style: {
            fill: getChamberStyle(parentNode.type).color,
          },
        },
      })

      /* Find all child nodes and push to Nodes */
      parentChildCollection.childNodes.forEach((childNode:any) => {

        const targetedChildNode = cableDiagramData.nodes.find((node:any) => node.id === childNode.id)

        graphNodes.push({
          id: String(targetedChildNode.id),
          closure: targetedChildNode.closure,
          label: targetedChildNode.type + '\n' + String(targetedChildNode.id),
          type: targetedChildNode.type,
          taskUniqueRef: targetedChildNode.taskUniqueRef,
          //nearestAddress: getNearestAddress(cableDiagramData, targetedChildNode.id),
          buildStatus: targetedChildNode.buildSatus,
          style: getChamberStyle(targetedChildNode.type),
          labelCfg: {
            style: {
              fill: getChamberStyle(targetedChildNode.type).color,
            },
          },
        })

        /* Find all edges that fit the parent child relation */

        cableDiagramData.edges.filter((edge:any) => edge.source === childNode.id || edge.target === childNode.id).map((edge:any) => {

          graphEdges.push({
            source: String(edge.source),
            target: String(edge.target),
            label: constructCableTitle(cableDiagramData, edge),
            length: getCableLength(cableDiagramData, edge.id),
            size: 2,
            labelCfg: {
              autoRotate: true,
              refY: 15,
              refX: 0,
            },
            style: {
              stroke: getCableColor(edge.type),
              opacity: 1,
              fontSize: 7,
            },
          })

        })

      })

    })



  }


  console.log('%cFINAL EXPORT', 'color:RoyalBlue', {
    nodes: graphNodes,
    edges: graphEdges,
  })

  return ({
    nodes: graphNodes,
    edges: graphEdges,
  })

}
