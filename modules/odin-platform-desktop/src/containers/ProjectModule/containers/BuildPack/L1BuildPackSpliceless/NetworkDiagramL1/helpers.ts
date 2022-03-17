import { getStaticColorFromArray } from "../../../CableDiagram/helpers";

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


const getCableLength = (cableDiagramData: any, edge_id: string) => {

  const targetedCable:any = cableDiagramData.find((cable: any) => cable.id === edge_id)

  if (targetedCable) {
    return String(Number(targetedCable.cable_length!).toFixed(0))
  } else {
    return 'Length unknown'
  }
}




const constructCableTitle = (cableDiagramData: any, edge: any) => {

  return `${edge.id} - ${edge.type} - ${getCableLength(cableDiagramData, edge.id)}m`

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
    case 'LM':
      return { fill: '#e51cc7', color: '#fff', stroke: '#000' }
    default:
      return { fill: '#515151', color: '#fff', stroke: '#000' }
  }
}


const getCableColor = (cableType: string) => {

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


export function filterCableDiagramData(cableDiagramData: any) {

  let graphEdges = [], graphNodes = []

  for (const edge of cableDiagramData.edges) {

    graphEdges.push({
      source: String(edge.source),
      target: String(edge.target),
      label: constructCableTitle(cableDiagramData.cables, edge),
      length: getCableLength(cableDiagramData.cables, edge.id),
      size: 2,
      labelCfg: {
        autoRotate: true,
        refY: 15,
        refX: 0
      },
      style: {
        stroke: getCableColor(edge.type),
        opacity: 1,
        fontSize: 7
      }
    })

  }

  for (const node of cableDiagramData.nodes) {

    graphNodes.push({
      id: String(node.id),
      label: node.type + '\n' + node.id,
      type: node.type,
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
    edges: graphEdges
  })

}