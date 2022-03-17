export const getDataFromSpliceless = (response: any) => {

  const filteredEdges:any = []
// this gets all edges by a sourceType


  const filterGroupedEdgesByType = (sourceClosureType: string) => {
    for (const res of response) {
      const l1Edges = res.edges.filter((elem:any) => elem.sourceClosureType === sourceClosureType)
      for (const edge of l1Edges) {
        filteredEdges.push(edge)
      }
    }
  }


  filterGroupedEdgesByType('L0')

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
      const nodes = res.nodes.filter((elem:any) => nodeIds.includes(elem.id))
      if (nodes.length > 0) {
        data.push(...nodes)
      }
    }
    return data;
  }

// This function recursively goes through all node arrays up to the endingNodeType
  const filterNodesRecursively = (dependentNodes: string[], endingNodeType: string, array: any[] = []) => {
    const finalResults = array || []
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
    return finalResults;
  }

// This function gos over each of the filtered edges and returns the
// parentNode and all childNodes(n) layers deep
  const finalResults = []

  for (const res of response) {
    const l1Nodes = res.nodes.filter((elem:any) => filteredEdges.map((elem:any) => elem.target).includes(elem.id))
    for (const node of l1Nodes) {
      const data = filterNodesRecursively(node.dependentNodes, 'L2', [])
      finalResults.push({
        parentNode: node,
        childNodes: data,
      })
    }
  }

  console.log('finalResults', finalResults)
  console.log('finalResults', finalResults.length)

  return finalResults;


}

