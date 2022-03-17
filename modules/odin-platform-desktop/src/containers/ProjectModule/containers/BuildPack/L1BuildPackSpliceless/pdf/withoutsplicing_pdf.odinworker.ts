import jsPDF from 'jspdf'
import netomniaLogo from '../../../../../../assets/images/png/netomnia-logo.png'
import {
  addPageNum, renderDataSummaryTable,
  renderLoopChainFeaturesTable,
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
    overviewSLDImage,
    cableMaps,
    piaMaps,
    SLDImages,
    cableDiagramData,
    cableDiagramChains,
    L1FeaturesInPolygon,
    documentInformation,

  } = arg.data


  let doc = new jsPDF({
    orientation: "landscape",
    unit: "cm",
    compress: true
  })

  const polygonType: string = arg.data.documentInformation.PolygonType
  const polygonId: string = arg.data.documentInformation.PolygonId


  const getSLDImageSize = (image: any, doc: any) => {

    let response = { width: 0, height: 0 }
    const imageProps = doc.getImageProperties(image)

    /* Landscape */
    if (imageProps.width > imageProps.height) {
      /*console.log('Image is landscape')*/
      response.width = 22
      response.height = 22 / (imageProps.width / imageProps.height)

      /*console.log(`width:${response.width}, height:${response.height}`)*/
    }
    /* Portrait */
    else {
      /*console.log('Image is portrait')*/
      response.height = 17
      response.width = 17 / (imageProps.height / imageProps.width)

      /*console.log(`width:${response.width}, height:${response.height}`)*/
    }

    return response

  }

  const getNoiRefNum = () => {
    let noi_ref = ''

    console.log('CableDiagramData', cableDiagramData)

    cableDiagramData?.features.cables.forEach((cable: any) => {
      if (cable.cable_type === 'Spine' && cable.noi_ref && cable.noi_ref !== '')
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
  doc.text(
    'The Supplier is responsible for providing services in accordance with Netomnia’s most up-to-date set of build requirements which are available on the ODIN system. Given the frequency at which such requirements may change, the Supplier should always access and',
    2.8,
    18
  )
  doc.text(
    'rely upon the most up-to-date set of requirements using ODIN rather than relying upon printed versions of this build pack. Netomnia is only responsible for paying for works which comply with its most up-to-date set of build requirements. Therefore, any reliance ',
    2.8,
    18.3
  )
  doc.text(
    'on printed hard copy build requirements by the Supplier shall be at the Supplier’s own risk. Uncontrolled when printed.',
    2.8,
    18.6
  )

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
  const overviewDiagramSize = getSLDImageSize(overviewSLDImage[0], doc)
  doc.addPage()
  doc.setFontSize(12)
  doc.setLineWidth(0.04)
  doc.text(`CABLE CHAIN STRAIGHT LINE DIAGRAM`, 10.5, 1)
  doc.addImage(
    overviewSLDImage[0],
    'PNG',
    1,
    2,
    overviewDiagramSize.width,
    overviewDiagramSize.height,
    undefined,
    "FAST"
  )
  drawLegend(dynamicSLDLegend('overview'), doc)
  addNetomniaLogo(doc)
  addPageNum(doc)


  /****************/
  /** Maps        */
  /****************/

  const pageLimit = PDF_TESTING ? 1 : cableMaps.length

  for (let i = 0; i < pageLimit; i++) {

    /* a) Map title page */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setFontSize(25)
    doc.text(`L1 -> L2 CHAIN ${(i + 1)}`, 11.3, 10.5)
    addPageNum(doc)

    /* b) L1->L2 Cable Map */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(cableMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    drawLegend(dynamicMapLegend('cable', cableMaps![i]), doc)
    addPageNum(doc)

    infoBox({
      MapType: 'L1 > L2 Cable',
      AccessChainNo: `${i + 1} of ${cableMaps.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    /* c) L1 -> L2 Cable Map + Openreach */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.04)
    doc.addImage(piaMaps[i], 'PNG', 0.4, 0.4, 28.8, 20.2, undefined, "FAST")
    doc.rect(0.4, 0.4, 28.8, 20.2)
    drawLegend(dynamicMapLegend('cable_or', cableMaps![i]), doc)
    addPageNum(doc)

    infoBox({
      MapType: 'L1 > L2 Openreach',
      AccessChainNo: `${i + 1} of ${cableMaps.length}`,
      Author: documentInformation.Author,
      Contact: documentInformation.Contact,
      Date: documentInformation.Date,
      Timestamp: documentInformation.Timestamp,
      PolygonId: polygonId,
      PolygonType: polygonType
    }, doc)

    addNetomniaLogo(doc)


    /* f) SLD Diagram */
    doc.addPage()
    doc.setDrawColor(0, 0, 0)
    const diagramSize = getSLDImageSize(SLDImages[i], doc)
    doc.setLineWidth(0.04)
    doc.addImage(SLDImages[i], 'PNG', 0.4, 0.4, diagramSize.width, diagramSize.height, undefined, "FAST")
    drawLegend(dynamicSLDLegend('chain'), doc)
    addNetomniaLogo(doc)
    addPageNum(doc)


    /* h) Feature List Table */
    renderLoopChainFeaturesTable(cableDiagramData!, cableDiagramChains[i], doc, String(i))

  }

  /*** 5. Data Summary Table ********************************************************************************************************************************/
  renderDataSummaryTable(cableDiagramData, L1FeaturesInPolygon, doc)

  /*** 7. Generate PDF File Blob and return *****************************************************************************************************************/
  const blob = doc.output('blob');
  postMessage(blob);

})