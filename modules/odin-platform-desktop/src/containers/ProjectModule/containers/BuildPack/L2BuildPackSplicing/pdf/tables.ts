import autoTable from "jspdf-autotable";
import { loopChainFeatures, PDFColors } from "../types";
import { getUniqueListBy } from "../helpers";

export const addPageNum = (doc: any) => {
  doc.setFontSize(7)
  doc.text('Uncontrolled when printed.', 0.4, 20.9)
  doc.text(String(doc.internal.getNumberOfPages()), 29.1, 20.9)
}

export const renderLoopChainFeaturesTable = (features: loopChainFeatures, doc: any, loopChainNumber: string) => {

  const headerBkgColor = '#ccdcff'
  doc.addPage()
  doc.setFontSize(12)
  doc.text(`NEW INFRASTRUCTURE LIST - ACCESS CHAIN ${Number(loopChainNumber) + 1}`, 9.5, 1.2)

  let tableCables: Array<any> = []
  let accessCables = features.cables.filter((cable: any) => cable.cable_type === 'Access')
  let feedCables = features.cables.filter((cable: any) => cable.cable_type === 'Feed')

  accessCables.sort((a: any, b: any) => (a.cable_id > b.cable_id) ? 1 : ((b.cable_id > a.cable_id) ? -1 : 0))
  feedCables.sort((a: any, b: any) => (a.cable_id > b.cable_id) ? 1 : ((b.cable_id > a.cable_id) ? -1 : 0))

  if (accessCables.length)
    accessCables.map((cable: any) => tableCables.push([
        cable.cable_id,
        cable.name,
        cable.cable_type,
        Number(cable.cable_length).toFixed(0) + ' m',
        cable.fibres_count
      ])
    )

  if (feedCables.length)
    feedCables.map((cable: any) => tableCables.push([
        cable.cable_id,
        cable.name,
        cable.cable_type,
        Number(cable.cable_length).toFixed(0) + ' m',
        cable.fibres_count
      ])
    )

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


  let rawClosures: Array<any> = []
  let sortedClosures: Array<any> = []

  rawClosures = features.closures;
  rawClosures.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

  rawClosures.map((closure: any) =>
    sortedClosures.push([ closure.id, closure.name, closure.nearest_address.replace('("', '').replace('")', '') ])
  )

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'CLOSURE id', 'Closure Type', 'Nearest Address' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: features.closures.length ? sortedClosures : [ [ '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })


  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'CHAMBER id', 'name' ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body:
      features.chambers.length ?
        features.chambers.map((chamber: any) => [
          chamber.id,
          chamber.name
        ])
        :
        [ [ '-', '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })

  const sortedPoles = getUniqueListBy(features.poles, 'id')

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ `POLE id`, `Model`, `Nearest Address` ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body:
      features.poles.length ?
        sortedPoles.map((pole: any) => [
          pole.id,
          pole.name,
          JSON.parse(pole.premises)[0].address
        ])
        : [ [ '-', '-', '-' ] ],
    didDrawPage: function () {
      addPageNum(doc)
    }
  })

  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ `DUCT id`, `Name`, `Length` ] ],
    headStyles: { fontSize: 8, fillColor: headerBkgColor, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body:
      features.ducts.length ?
        features.ducts.map((duct: any) => [
          duct.id,
          duct.name,
          Number(duct.length) < 1 ? `${Number(duct.length).toFixed(2)} m` : `${Number(duct.length).toFixed(0)} m`
        ])
        :
        [ [ '-', '-', '-' ] ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })

}


export const renderListOfPremisesByL4Polygon = (loopChains: any, doc: any) => {

  doc.addPage()
  doc.setFontSize(12)
  doc.text('LIST OF PREMISES BY L4 POLYGONS', 10, 1.2)


  loopChains.forEach((L4polygonsinChain: any) => {

    L4polygonsinChain.forEach((L4polygon: any, i: number) => {

      let tablePremises: Array<any> = []
      let parsedPremises = L4polygon.premises
      parsedPremises = JSON.parse(parsedPremises)

      parsedPremises = parsedPremises.map((premise: any) => premise.address)

      parsedPremises.sort((a: any, b: any) => (a > b) ? 1 : ((b > a) ? -1 : 0))


      while (parsedPremises.length)
        tablePremises.push(parsedPremises.splice(0, 3));

      autoTable(doc, {
        styles: { fontSize: 8, cellPadding: 0.1, cellWidth: 9, lineColor: '#000', lineWidth: 0.02 },
        head: [ [ `L4 POLYGON ID: ${L4polygon.id}`, ``, `` ] ],
        headStyles: { fontSize: 8, textColor: '#000', fillColor: '#c2ffb0', cellPadding: 0.2 },
        margin: { top: 2, bottom: 1.6 },
        body: tablePremises,
        didDrawPage: function (data) {
          addPageNum(doc)
        }
      })

    })

  })

}

export const renderDataSummaryTable = (features: any, networkDiagramData: any, doc: any) => {

  doc.addPage()
  doc.setFontSize(12)
  doc.text(`DATA SUMMARY TABLE`, 12.2, 1.2)

  let L4PolygonsNum: number = 0
  let PremisesNum: number = 0

  let L3Closures = [], L4Closures = [], feedCables = [], accessCables = []
  let feedCablesLength = 0, accessCablesLength = 0, ductsLength = 0

  if (features.closures.length) {
    L3Closures = features.closures.filter((closure: any) => closure.name === 'L3')
    L4Closures = features.closures.filter((closure: any) => closure.name === 'L4')
  }

  if (features.cables.length) {
    feedCables = features.cables.filter((cable: any) => cable.cable_type === 'Feed')
    accessCables = features.cables.filter((cable: any) => cable.cable_type === 'Access')

    feedCables.forEach((cable: any) => {
        feedCablesLength = feedCablesLength + parseFloat(cable.cable_length)
      }
    )
    accessCables.forEach((cable: any) => {
        accessCablesLength = accessCablesLength + parseFloat(cable.cable_length)
      }
    )
  }

  if (features.ducts.length)
    features.ducts.map((duct: any) => ductsLength += Number(duct.length))


  networkDiagramData.forEach((loopChain: any) => {

    L4PolygonsNum = L4PolygonsNum + loopChain.features.L4polygons.length

    loopChain.features.L4polygons.forEach((L4polygon: any, i: number) => {
      let parsedPremises = L4polygon.premises
      parsedPremises = JSON.parse(parsedPremises)
      parsedPremises = parsedPremises.map((premise: any) => premise.address)
      PremisesNum = PremisesNum + parsedPremises.length
    })
  })


  autoTable(doc, {
    styles: { fontSize: 8, cellPadding: 0.2, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
    head: [ [ 'Feature', 'Length', 'Quantity' ] ],
    headStyles: { fontSize: 8, fillColor: PDFColors.cable_openreach, cellPadding: 0.2, textColor: '#000' },
    margin: { top: 2, bottom: 1.6 },
    body: [
      [ 'Access Cables', `${accessCablesLength.toFixed(0)} m`, accessCables.length, ],
      [ 'Feed Cables', `${feedCablesLength.toFixed(0)} m`, feedCables.length, ],
      [ 'Ducts', `${ductsLength.toFixed(0)} m`, features.ducts.length, ],
      [ 'L3 Closures', '-', L3Closures.length ],
      [ 'L4 Closures', '-', L4Closures.length ],
      [ 'Poles', '-', features.poles.length ],
      [ 'Chambers', '-', features.chambers.length ],
      [ 'Premises', '-', PremisesNum ],
      [ 'L4 Polygons', '-', L4PolygonsNum, ]
    ],
    didDrawPage: function (data) {
      addPageNum(doc)
    }
  })

}


export const splicingTable = (splicingData: Array<any>, aggregatedSplicingData:Array<any>, networkDiagramData: any, accessChainNo: number, doc: any) => {

  const closureIds = networkDiagramData.nodes.map((node: any) => node.id)

  for (const closureId of closureIds) {

    const targetedAggregatedSplicing = aggregatedSplicingData.find((splicing: any) => splicing.closure_id === String(closureId))
    const targetedSplicing = splicingData.find((splicing: any) => splicing.closure_id === String(closureId))
    let aggregatedSplicingDataBody: any = []
    let splicingDataBody: any = []

    /* We found an Aggregated splicing for the Closure */
    if(targetedAggregatedSplicing){

      doc.addPage()
      doc.setFontSize(12)
      doc.text(`SPLICING INFORMATION - ACCESS CHAIN ${accessChainNo + 1} - CLOSURE ID ${String(closureId)}`, 8, 1.2)
      addPageNum(doc)

      targetedAggregatedSplicing.connections.forEach((connection: any) => {
        const {in_cable, in_tube_fibre_first, in_tube_fibre_last, out_cable, out_tube_fibre_first, out_tube_fibre_last } = connection

        aggregatedSplicingDataBody.push([
          `${in_cable} (${in_tube_fibre_first} - ${in_tube_fibre_last}) - ${out_cable} (${out_tube_fibre_first} - ${out_tube_fibre_last})`
        ])
      })


      autoTable(doc, {
        styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
        head: [
          [ `Aggregated Splicing Data for Closure ${String(closureId)}`]
        ],
        headStyles: { fontSize: 8, fillColor: '#dcd4ff', cellPadding: 0.2, textColor: '#000' },
        margin: { top: 2, bottom: 1.6 },
        body: aggregatedSplicingDataBody,
        didDrawPage: function (data) {
          addPageNum(doc)
        }
      })


    }


    /* We found a splicing for the Closure */
    if (targetedSplicing) {

      targetedSplicing.connections.forEach((connection: any) => {

        splicingDataBody.push([
          String(closureId),
          connection.type,
          connection.in_closure,
          connection.in_cable,
          connection.in_tube_fiber,
          connection.slot_number ? connection.slot_number : '-',
          connection.tray_number ? connection.tray_number : '-',
          connection.splitter_number ? connection.splitter_number : '-',
          connection.splitter_type ? connection.splitter_type : '-',
          connection.splice_number ? connection.splice_number : '-',
          connection.out_closure,
          connection.out_cable,
          connection.out_tube_fiber,
          connection.fiber_state
        ])

      })


      autoTable(doc, {
        styles: { fontSize: 8, cellPadding: 0.1, lineColor: '#000', lineWidth: 0.02, textColor: '#000' },
        head: [
          [
            'Closure id',
            'Type',
            'In Closure',
            'In Cable',
            'In Tube Fiber',
            'Slot #',
            'Tray #',
            'Splitter #',
            'Splitter',
            'Splice #',
            'Out Closure',
            'Out Cable',
            'Out Tube Fiber',
            'Fiber State'
          ]
        ],
        headStyles: { fontSize: 8, fillColor: '#dcd4ff', cellPadding: 0.2, textColor: '#000' },
        margin: { top: 2, bottom: 1.6 },
        body: splicingDataBody,
        didDrawPage: function (data) {
          addPageNum(doc)
        },
      })


    } else
      console.log('Missing splicing for closure id ', closureId)

  }


}