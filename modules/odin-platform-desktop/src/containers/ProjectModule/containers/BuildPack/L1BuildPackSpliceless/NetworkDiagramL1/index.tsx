import React, { useEffect } from "react";
import G6 from "@antv/g6";
import { filterCableDiagramData } from "./helpers";
import { getChainFromSplicelessData } from "../helpers";

let graph: any = null

interface Props {
  graph: any,
  cableDiagramData: any,
  cableDiagramChains: any,
  SLDImages: Array<any>,
  overviewSLDImage: Array<any>,
  handleNetworkDiagramBuild: any,
  L1FeaturesInPolygon: any,
}

const NetworkDiagramL1 = (props: Props) => {

  const ref = React.useRef(null);

  const drawGraph = async (diagramData: any, direction: 'TB' | 'LR') => {

    return await new Promise((resolve) => {
      const graphConfig = {
        container: ref?.current!,
        modes: {
          default: [ 'drag-canvas', 'zoom-canvas' ]
        },
        layout: {
          type: 'dagre',
          rankdir: direction,
          ranksep: 140,
          //ranker: 'longest-path',
        },
        defaultNode: {
          type: 'node',
          size: 90,
          labelCfg: {
            style: {
              fontSize: 22,
              fontWeight: 600,
              padding: 15
            }
          },
          style: {
            stroke: '#72CC4A',
            width: 150,
          }
        },
        defaultEdge: {
          labelCfg: {
            style: {
              fontSize: 20
            }
          },
          // type: 'quadratic' /* This will put a small curve on the edge */
        },
      }

      if (graph !== null) {
        graph.destroy()
        graph = new G6.Graph(graphConfig)
        graph.data(diagramData)
        graph.render()
      } else {
        graph = new G6.Graph(graphConfig)
        graph.data(diagramData)
        graph.render()
      }

      return resolve(graph.on('afterrender', () => {
        return true
      }))

    }).catch(err => {
      console.error(err)
    })

  }


  const generateGraphImages = async (scope: 'ALL_CHAINS' | 'SINGLE_CHAIN') => {

    let { cableDiagramData, L1FeaturesInPolygon, cableDiagramChains, overviewSLDImage, SLDImages } = props


    /* RENDER OVERVIEW SLD */
    if (scope === 'ALL_CHAINS' && cableDiagramData) {

      let allEdges: any[] = [], allNodes: any[] = [],  allClosureIds: any[] = []

      const L0toL1Chains = getChainFromSplicelessData([ cableDiagramData ], 'L0', 'L1')

      allClosureIds.push(L0toL1Chains[0].parentNode.id)
      L0toL1Chains[0].childNodes.forEach((child: any) => {
        allClosureIds.push(child.id)
        cableDiagramData.edges.filter((edge: any) => edge.source === child.id || edge.target === child.id).map((edge: any) => {
          allEdges.push(edge)
        })
      })
      allNodes = cableDiagramData.nodes.filter((node: any) => allClosureIds.includes(node.id))
      await drawGraph(
        filterCableDiagramData(
          {
            nodes: allNodes,
            edges: allEdges,
            cables: L1FeaturesInPolygon.cables
          },
        ), 'LR').then(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
          graph.toFullDataURL(
            (res: any) => {
              overviewSLDImage.push(res)
            }
          )
        })
      })

    }

    /* Render single loop chain */
    else if (scope === 'SINGLE_CHAIN' && cableDiagramData && cableDiagramChains) {

      for (const cableChain of cableDiagramChains) {

        let allEdges: any[] = [], allNodes: any[] = [], allClosureIds: any[] = []

        allClosureIds.push(cableChain.parentNode.id)
        cableChain.childNodes.forEach((child: any) => {
          allClosureIds.push(child.id)
          cableDiagramData.edges.filter((edge: any) => edge.source === child.id || edge.target === child.id).map((edge: any) => {
            allEdges.push(edge)
          })
        })

        allNodes = cableDiagramData.nodes.filter((node: any) => allClosureIds.includes(node.id))

        await drawGraph(
          filterCableDiagramData(
            {
              nodes: allNodes,
              edges: allEdges,
              cables: L1FeaturesInPolygon.cables
            },
          ), 'LR').then(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            graph.toFullDataURL(
              (res: any) => {
                SLDImages.push(res)

                if(SLDImages.length === cableDiagramChains.length)
                  props.handleNetworkDiagramBuild()

              }
            )
          })
        })

      }

    }
  }


  useEffect(() => {

    const { cableDiagramChains, cableDiagramData, handleNetworkDiagramBuild } = props

    if (cableDiagramData && cableDiagramChains.length) {

      generateGraphImages('ALL_CHAINS').then(() => {

        generateGraphImages('SINGLE_CHAIN').then(() => {

        })

      })

    }

  }, [ props.cableDiagramData ])


  return <div id="networkdiagram_map" ref={ref}/>


}

export default NetworkDiagramL1