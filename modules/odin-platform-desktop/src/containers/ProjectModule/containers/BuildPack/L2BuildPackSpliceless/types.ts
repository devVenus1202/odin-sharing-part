/* Build Pack Map */
export const QGIS_SERVER_BUILDPACK = 'https://api.odin.dev.netomnia.com/cgi-bin/qgis_mapserv.fcgi?map=/home/qgis/projects/project.qgs'
export const REACT_APP_QGIS_SERVER_URL = process.env.REACT_APP_QGIS_SERVER_URL || 'https://api.odin.prod.netomnia.com/cgi-bin/qgis_mapserv.fcgi?map=/home/qgis/projects/project.qgs';


export type mapTypes = 'overview' | 'construction' | 'cable_access' | 'cable_feed' | 'cable_feed_standalone'

export interface layerSet {
  cableIds: string[],
  closureIds: string[],
  chamberIds: string[],
  ductIds: string[],
  poleIds: string[],
  L4PolygonIds?: string[]
}

export type networkDiagramData = [
  {
    nodes: any[],
    edges: any[],
    features: {
      cables: any[],
      chambers: any[],
      closures: any[],
      ducts: any[],
      poles: any[],
      L4polygons: any[]
    }
  }
] | null

export type cableDiagramData = {
  nodes: any[],
  edges: any[]
}

export type cableDiagramFeatures = {
  cables: any,
  chambers: any,
  poles: any,
  closures: any,
  ducts: any
}

export interface InputParams {
  overviewMap: string,
  overviewNetworkDiagram: string,
  networkDiagramMaps: Array<string>,
  constructionMaps: Array<string>,
  cableAccessMaps: Array<string>,
  cableFeedMaps: Array<string>,
  mapInformation: infoBox,
  networkDiagramData: networkDiagramData,
  L2FeaturesInPolygon: any
}

export interface infoBox {
  MapType?: string,
  SheetNo?: string,
  Scale?: string,
  Area?: string,
  Author: string,
  Contact: string,
  Projection?: string,
  PolygonId: string,
  PolygonType: string
}

export const mapDimensions = {
  legend_x: 24.9,
  legend_y: 0.8,
  legend_content_x: 25,
  legend_content_y: 1.8,
  legend_lineHeight: 0.3,

  overviewL1_legend_height: 8.1,
  openreachL1_legend_height: 2.9,
  constructionL1_legend_height: 5.2,
  cableopenreachL1_legend_height: 8.1,
  cableL1_legend_height: 8.1,

  overviewL2_legend_height: 9.6,
  openreachL2_legend_height: 3.2,
  constructionL2_legend_height: 7.7,
  cableopenreachL2_legend_height: 11.2,
  cableL2_legend_height: 8.7,

  infobox_x: 25.2,
  infobox_y: 16.2,
  infobox_cell1_w: 1.5,
  infobox_cell2_w: 2.2
}

export const PDFColors = {
  openreach: '#CCFFFF',
  construction: '#CCFFCC',
  cable_openreach: '#FFE6CC',
  cable: '#FFE6CC'
}