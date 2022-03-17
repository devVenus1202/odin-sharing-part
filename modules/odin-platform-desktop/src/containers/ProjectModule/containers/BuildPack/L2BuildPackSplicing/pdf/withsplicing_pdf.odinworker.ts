import jsPDF from 'jspdf'
import netomniaLogo from '../../../../../../assets/images/png/netomnia-logo.png'
import {
  addPageNum,
  renderDataSummaryTable,
  renderListOfPremisesByL4Polygon,
  renderLoopChainFeaturesTable, splicingTable,
} from "./tables";
import { drawLegend, dynamicMapLegend, dynamicSLDLegend } from "./MapLegend";
import { infoBox } from "./InfoBox";

/* Set to 1 to generate PDF with only one access chain */
const PDF_TESTING = 0

/* eslint-disable-next-line no-restricted-globals */
const ctx: Worker = self as any;


ctx.addEventListener("message", (arg: any) => {

  const addNetomniaLogo = (doc: any) => {
    doc.addImage(netomniaLogo, 'PNG', 0.8, 19.7, 3.75, 0.6, "logo", "FAST")
  }

  const {
    overviewMap,
    overviewNetworkDiagram,
    constructionMaps,
    cableAccessMaps,
    cableFeedMaps,
    feedChainMaps,
    networkDiagramMaps,
    networkDiagramData,
    L2FeaturesInPolygon,
    documentInformation,
    loopChainOverviewMaps,
    splicingData,
    aggregatedSplicingData,
    hazardSheetFormItems,
    hazardSheetProjectInformation
  } = arg.data


  let doc = new jsPDF({
    orientation: "landscape",
    unit: "cm",
    compress: true
  })

  const polygonType: string = arg.data.documentInformation.PolygonType
  const polygonId: string = arg.data.documentInformation.PolygonId

  const L4polygons = networkDiagramData?.map((loopChain: any) => loopChain.features.L4polygons)


  const getSLDImageSize = (image: any, doc: any) => {

    let response = { width: 0, height: 0 }
    const imageProps = doc.getImageProperties(image)

    /* Landscape */
    if (imageProps.width > imageProps.height) {
      response.width = 23
      response.height = 23 / (imageProps.width / imageProps.height)
    }
    /* Portrait */
    else {
      response.height = 20
      response.width = 20 / (imageProps.height / imageProps.width)
    }

    return response

  }

  const getNoiRefNum = () => {
    let noi_ref = ''
    L2FeaturesInPolygon.cables.forEach((cable: any) => {
      if (cable.cable_type === 'Access' && cable.noi_ref && cable.noi_ref !== '')
        noi_ref = cable.noi_ref
    })

    if (noi_ref !== '')
      return noi_ref
    else
      return 'Unknown'

  }

  /*** 1. Cover page  ****************************************************************************************************************************************/
  doc.setFontSize(60)
  doc.setDrawColor(0, 0, 0)
  doc.text(`BUILD PACK`, 2.8, 6)
  doc.setFontSize(20)
  doc.text(`${polygonType} Polygon ID: ${polygonId}`, 2.8, 11.3)
  doc.text(`Exchange Name: ${documentInformation.exPolygonName}`, 2.8, 12.6)
  doc.text(`Date: ${arg.data.documentInformation.Date}`, 2.8, 13.9)
  doc.text(`Printed by: ${arg.data.documentInformation.Author}`, 2.8, 15.2)
  doc.text('NOI REF: ' + getNoiRefNum(), 2.8, 16.5)

  /* Legal notice */
  doc.setFontSize(6)
  doc.text('The Supplier is responsible for providing services in accordance with Netomnia’s most up-to-date set of build requirements which are available on the ODIN system. Given the frequency at which such requirements may change, the Supplier should always access and', 2.8, 18)
  doc.text('rely upon the most up-to-date set of requirements using ODIN rather than relying upon printed versions of this build pack. Netomnia is only responsible for paying for works which comply with its most up-to-date set of build requirements. Therefore, any reliance ', 2.8, 18.3)
  doc.text('on printed hard copy build requirements by the Supplier shall be at the Supplier’s own risk. Uncontrolled when printed.', 2.8, 18.6)

  addNetomniaLogo(doc)

  /*** 2. Overview Title Page ********************************************************************************************************************************/
  doc.addPage()
  doc.setDrawColor(0, 0, 0)
  doc.setFontSize(25)
  doc.text(`OVERVIEW MAP & DIAGRAM`, 8.8, 10.5)
  addPageNum(doc)

  /*** 3. Overview Map ***************************************************************************************************************************************/
  doc.addPage()
  doc.setLineWidth(0.04)
  doc.addImage(overviewMap, 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
  doc.rect(0.4, 0.4, 28.8, 20.2);
  drawLegend(dynamicMapLegend('overview'), doc)

  infoBox({
    MapType: 'Overview',
    AccessChainNo: '-',
    Author: documentInformation.Author,
    Contact: documentInformation.Contact,
    Date: documentInformation.Date,
    Timestamp: documentInformation.Timestamp,
    PolygonId: polygonId,
    PolygonType: polygonType
  }, doc)

  addNetomniaLogo(doc)
  addPageNum(doc)

  /*** 4. Overview SLD ***************************************************************************************************************************************/
  const overviewDiagramSize = getSLDImageSize(overviewNetworkDiagram, doc)
  doc.addPage()
  doc.setFontSize(12)
  doc.setLineWidth(0.04)
  doc.text(`ACCESS CHAIN STRAIGHT LINE DIAGRAM`, 10.5, 1)
  doc.addImage(
    overviewNetworkDiagram,
    'PNG',
    1,
    4,
    overviewDiagramSize.width,
    overviewDiagramSize.height,
    undefined,
    "FAST"
  )
  drawLegend(dynamicSLDLegend(networkDiagramData!, 'all'), doc)
  addNetomniaLogo(doc)
  addPageNum(doc)


  /****************/
  /** Maps        */
  /****************/

  const pageLimit = PDF_TESTING ? 1 : networkDiagramMaps.length

  for (let i = 0; i < pageLimit; i++) {

    /* a) Map title page */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setFontSize(25)
    doc.text(`ACCESS CHAIN ${(i + 1)}`, 11.3, 10.5)
    addPageNum(doc)

    /* b) Access Chain Overview Map */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(loopChainOverviewMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    addPageNum(doc)

    infoBox({
      MapType: 'Access Chain Overview',
      AccessChainNo: `${i + 1} of ${networkDiagramData.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    /* c) Construction + Openreach map */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(constructionMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    drawLegend(dynamicMapLegend('construction', networkDiagramData![i]), doc)
    addPageNum(doc)

    infoBox({
      MapType: 'Construction + OR',
      AccessChainNo: `${i + 1} of ${networkDiagramData.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    addNetomniaLogo(doc)

    /* d) Cable Access Map */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(cableAccessMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    drawLegend(dynamicMapLegend('cable_access', networkDiagramData![i]), doc)
    addPageNum(doc)

    infoBox({
      MapType: 'Access Cable',
      AccessChainNo: `${i + 1} of ${networkDiagramData.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    addNetomniaLogo(doc)

    /* e) Cable Feed Map */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(cableFeedMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    drawLegend(dynamicMapLegend('cable_feed', networkDiagramData![i]), doc)
    addPageNum(doc)

    infoBox({
      MapType: 'Feed Cable Overview',
      AccessChainNo: `${i + 1} of ${networkDiagramData.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    addNetomniaLogo(doc)


    /* e) If we have additional feed chain maps, render here after the feed overview map. */
    if (feedChainMaps[i].length) {

      const feedChainMap = feedChainMaps[i]

      for (let j = 0; j < feedChainMap.length; j++) {

        doc.addPage()
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.04)
        doc.addImage(feedChainMap[j], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
        doc.rect(0.4, 0.4, 28.8, 20.2)
        drawLegend(dynamicMapLegend('cable_feed_chain', feedChainMap[j]), doc)
        addPageNum(doc)

        infoBox({
          MapType: `Feed chain ${j + 1} of ${feedChainMap.length}`,
          AccessChainNo: `${i + 1} of ${networkDiagramData.length}`,
          Author: documentInformation.Author,
          Contact: documentInformation.Contact,
          Date: documentInformation.Date,
          Timestamp: documentInformation.Timestamp,
          PolygonId: polygonId,
          PolygonType: polygonType
        }, doc)

        addNetomniaLogo(doc)

      }

    }


    /* f) SND Diagram */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    const diagramSize = getSLDImageSize(networkDiagramMaps![i], doc)
    doc.setLineWidth(0.04)
    doc.addImage(networkDiagramMaps![i], 'PNG', 0.4, 0.4, diagramSize.width, diagramSize.height, undefined, "FAST")
    drawLegend(dynamicSLDLegend(networkDiagramData![i], 'single'), doc)
    addNetomniaLogo(doc)
    addPageNum(doc)

    /* g) Splicing information */
    splicingTable(
      splicingData,
      aggregatedSplicingData,
      networkDiagramData![i],
      i,
      doc
    )

    /* h) Feature List Table */
    renderLoopChainFeaturesTable(networkDiagramData![i].features, doc, String(i))

  }

  /*** 5. Data Summary Table ********************************************************************************************************************************/
  renderDataSummaryTable(L2FeaturesInPolygon, networkDiagramData!, doc)

  /*** 6. List of premises **********************************************************************************************************************************/
  renderListOfPremisesByL4Polygon(L4polygons, doc)

  /*** 7. Generate PDF File Blob and return *****************************************************************************************************************/
  const blob = doc.output('blob');
  postMessage(blob);

})