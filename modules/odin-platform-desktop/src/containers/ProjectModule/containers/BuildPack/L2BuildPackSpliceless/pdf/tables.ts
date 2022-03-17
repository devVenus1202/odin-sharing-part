import autoTable from "jspdf-autotable";
import { PDFColors } from "../types";
import { getUniqueListBy } from "../helpers";

export const addPageNum = (doc: any) => {
  doc.setFontSize(7)
  doc.text('Uncontrolled when printed.', 0.4, 20.9)
  doc.text(String(doc.internal.getNumberOfPages()), 29.1, 20.9)
}

export const  renderLoopChainFeaturesTable = (
  cableDiagramData: any,
  cableDiagramChain: any,
  doc: any,
  loopChainNumber: string
) => {

  const features = cableDiagramData!.features
  const headerBkgColor = '#ccdcff'
  doc.addPage()
  doc.setFontSize(12)
  doc.text(`NEW INFRASTRUCTURE LIST - CABLE CHAIN ${Number(loopChainNumber) + 1}`, 9.5, 1.2)

  /* TODO: Get all closure and cable ids for the chain, filter out cables table. */
  let tableCables: Array<any> = []
  const allClosureIds: Array<any> = []
  const allCableIds: Array<any> = []


  /* CABLES ********************************************************************************/

  allClosureIds.push(cableDiagramChain.parentNode.id)
  cableDiagramChain.childNodes.forEach((child: any) => {
    allClosureIds.push(child.id)
    cableDiagramData.edges.filter((edge: any) => edge.source === child.id || edge.target === child.id).map((edge: any) => {
      if (edge.type === 'Feed')
        allCableIds.push(edge.id)
    })
  })

  features.cables.filter((cable: any) => allCableIds.includes(cable.cable_id)).map((cable: any) => {
    tableCables.push([
      cable.cable_id,
      cable.name,
      cable.cable_type,
      Number(cable.cable_length).toFixed(0) + ' m',
      cable.fibres_count
    ])
  })

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'CABLE id', 'Ground ID', 'Type', 'Length', 'Fibres Count' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body:
      tableCables.length ?
        tableCables
        : [ [ '-', '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })


  /* CLOSURES ********************************************************************************/
  let rawClosures: Array<any> = []

  features.closures.filter((closure: any) => allClosureIds.includes(closure.id)).map((closure: any) => {
    rawClosures.push([
      closure.id,
      closure.name,
      closure.nearest_address ? closure.nearest_address.replace('("', '').replace('")', '') : '-'
    ])
  })

  rawClosures.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'CLOSURE id', 'Closure Type', 'Nearest Address' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: rawClosures.length ? rawClosures : [ [ '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })


  /* CHAMBERS ********************************************************************************/
  let tableChambers: Array<any> = []

  features.chambers.filter((chamber: any) => allClosureIds.includes(chamber.l2_closure_id)).map((chamber: any) => {

    tableChambers.push([
      chamber.id, chamber.name, chamber.l2_closure_id, chamber.nearest_address ? chamber.nearest_address.replace('("', '').replace('")', '') : '-'
    ])
  })

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'CHAMBER id', 'Name', 'L2 Closure', 'Nearest Address' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: tableChambers.length ? tableChambers : [ [ '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })


  /* DUCTS ********************************************************************************/
  let tableDucts: Array<any> = []
//  let tableSubDucts: Array<any> = []
  const allDucts = cableDiagramData!.features.ducts
  const uniqueCableIds = [ ...new Set(allCableIds) ]

  let newDucts = allDucts.filter((duct: any) => duct.type === '1-Duct' && uniqueCableIds.includes(duct.cable_id))
//  let newSubDucts = allDucts.filter((duct: any) => duct.type === '2-Sduct' && uniqueCableIds.includes(duct.cable_id))


  if(newDucts){
    newDucts = getUniqueListBy(newDucts, 'id')
    newDucts.forEach((duct:any) => {
      tableDucts.push([
        duct.id,
        duct.model,
        duct.type ? duct.type.split('-')[1] : '-',
        Number(duct.length) < 1 ? `${Number(duct.length).toFixed(2)} m` : `${Number(duct.length).toFixed(0)} m`
      ])
    })
  }

/*  if(newSubDucts){
    newSubDucts = getUniqueListBy(newSubDucts, 'id')
    newSubDucts.forEach((duct:any) => {
      tableSubDucts.push([
        duct.id,
        duct.model,
        duct.type ? duct.type.split('-')[1] : '-',
        Number(duct.length) < 1 ? `${Number(duct.length).toFixed(2)} m` : `${Number(duct.length).toFixed(0)} m`
      ])
    })
  }*/

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ `DUCT id`, `Model`, `Type`, `Length` ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: tableDucts.length ? tableDucts : [ [ '-', '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })


/*  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ `SUBDUCT id`, `Model`, `Type`, `Length` ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: tableSubDucts.length ? tableSubDucts : [ [ '-', '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })*/




}


export const renderDataSummaryTable = (cableDiagramData: any, L1FeaturesInPolygon: any, doc: any) => {

  doc.addPage()
  doc.setFontSize(12)
  doc.text(`DATA SUMMARY TABLE`, 12.2, 1.2)

  const features = cableDiagramData.features


  let L3Closures = [], L4Closures = [], accessCables = [], feedCables = []
  let accessCablesLength = 0, feedCablesLength = 0, ductsLength = 0

  if (features.closures.length) {
    L3Closures = features.closures.filter((closure: any) => closure.name === 'L3')
    L4Closures = features.closures.filter((closure: any) => closure.name === 'L4')
  }

  if (features.cables.length) {
    accessCables = features.cables.filter((cable: any) => cable.cable_type === 'Access')
    feedCables = features.cables.filter((cable: any) => cable.cable_type === 'Feed')

    accessCables.forEach((cable: any) =>
      cable.cable_length ?
        accessCablesLength = accessCablesLength + parseFloat(cable.cable_length)
        : {}
    )
    feedCables.forEach((cable: any) =>
      cable.cable_length ?
        feedCablesLength = feedCablesLength + parseFloat(cable.cable_length)
        : {}
    )
  }

  if (L1FeaturesInPolygon.ducts.length)
    L1FeaturesInPolygon.ducts.map((duct: any) => ductsLength += Number(duct.length))

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.2, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'Feature', 'Length', 'Quantity' ] ],
    headStyles: { fontSize: 8, fillColor: PDFColors.cable_openreach, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: [
      [ 'Access Cables', `${accessCablesLength.toFixed(0)} m`, accessCables.length, ],
      [ 'Feed Cables', `${feedCablesLength.toFixed(0)} m`, feedCables.length, ],
      [ 'L3 Closures', '-', L3Closures.length ],
      [ 'L4 Closures', '-', L4Closures.length ],
      [ 'Ducts', `${ductsLength.toFixed(0)} m`, features.ducts.length, ],
      [ 'Chambers', '-', features.chambers.length ],
    ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })

}

