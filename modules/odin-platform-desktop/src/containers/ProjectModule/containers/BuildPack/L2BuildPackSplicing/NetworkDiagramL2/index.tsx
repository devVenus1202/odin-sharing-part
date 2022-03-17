import React, { useEffect } from "react";
import G6 from "@antv/g6";
import { filterCableDiagramData } from "./helpers";
import { cableDiagramData, networkDiagramData } from "../types";

let graph: any = null

interface Props {
  graph: any,
  networkDiagramData: networkDiagramData,
  networkDiagramMaps: Array<any>,
  overviewNetworkDiagram: Array<any>,
  handleNetworkDiagramBuild: any,
}

const NetworkDiagramL2 = (props: Props) => {

  const ref = React.useRef(null);

  const drawGraph = async (diagramData: cableDiagramData, direction: 'TB' | 'LR') => {

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

    let { networkDiagramData, networkDiagramMaps, overviewNetworkDiagram } = props

    let allEdges: any[] = [], allNodes: any[] = [], allCables: any[] = []

    /* Render all loop chains */
    if (scope === 'ALL_CHAINS' && networkDiagramData) {

      for (let loopChain of networkDiagramData) {

        loopChain.edges.map((edge:any) => allEdges.push(edge))
        loopChain.nodes.map((node:any) => allNodes.push(node))
        loopChain.features.cables.map((cable:any) => allCables.push(cable))

      }

      await drawGraph(
        filterCableDiagramData(
          {
            nodes: allNodes,
            edges: allEdges,
            cables: allCables
          },
        ), 'TB').then(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
          graph.toFullDataURL(
            (res: any) => {
              overviewNetworkDiagram.push(res)
            }
          )
        })
      })

    }

    /* Render single loop chain */
    else if (scope === 'SINGLE_CHAIN' && networkDiagramData) {

      for (const index of networkDiagramData!.keys()) {
        await drawGraph(
          filterCableDiagramData(
            {
              nodes: networkDiagramData![index].nodes,
              edges: networkDiagramData![index].edges,
              cables: networkDiagramData![index].features.cables,
              closures: networkDiagramData![index].features.closures
            },
          ), 'LR').then(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            graph.toFullDataURL(
              (res: any) => {
                networkDiagramMaps.push(res)
              }
            )
          })
        })
      }

    }


  }


  useEffect(() => {

    const { networkDiagramData, networkDiagramMaps, handleNetworkDiagramBuild } = props

    if (networkDiagramData!.length && networkDiagramMaps.length === 0) {

      generateGraphImages('ALL_CHAINS').then(() => {

        generateGraphImages('SINGLE_CHAIN').then(() => {

          handleNetworkDiagramBuild()

        })

      })


    }

  }, [ props.networkDiagramData ])


  return <div id="networkdiagram_map" ref={ref}/>


}

export default NetworkDiagramL2