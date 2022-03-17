import northSymbol from '../../../../../../assets/images/png/north.png'

/**
 * Map infobox is that general information table you see in the lower right corner of the map.
 *
 * @param args
 * @param doc
 */
export const infoBox = (args: any, doc: any) => {

  const { MapType, AccessChainNo, Author, Contact, Date, Timestamp, PolygonId, PolygonType } = args

  const drawInfoBoxItem = (title: string, content: string, y: number) => {

    let x = dimensions.infobox_x

    doc.setFillColor(255, 255, 255)
    doc.rect(x, y, dimensions.infobox_cell1_w, 0.3, 'FD')
    doc.rect(x + dimensions.infobox_cell1_w, y, dimensions.infobox_cell2_w, 0.3, 'FD')
    doc.text(title, x + 0.1, y + 0.23)
    doc.text(content, x + dimensions.infobox_cell1_w + 0.1, y + 0.23)

  }

  const dimensions = {
    infobox_x: 25.2,
    infobox_y: 16.8,
    infobox_cell1_w: 1.5,
    infobox_cell2_w: 2.2
  }

  /* Setup Infobox Fontsize and vertical location */
  doc.setFontSize(5)
  let y = dimensions.infobox_y
  let x = dimensions.infobox_x

  drawInfoBoxItem('Map Type', MapType, y);
  y = y + 0.3;
  drawInfoBoxItem('Access Chain', AccessChainNo, y);
  y = y + 0.3;
  drawInfoBoxItem('Author', Author, y);
  y = y + 0.3;
  drawInfoBoxItem('Contact', Contact, y);
  y = y + 0.3;
  drawInfoBoxItem('Projection', 'EPSG2770', y);
  y = y + 0.3;
  drawInfoBoxItem('Issued date', Date, y);
  y = y + 0.3;
  drawInfoBoxItem('Timestamp', Timestamp, y);
  y = y + 0.3;

  /* North icon + Map focus */
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, dimensions.infobox_cell1_w, 0.8, 'FD')
  doc.rect(x + dimensions.infobox_cell1_w, y, dimensions.infobox_cell2_w, 0.8, 'FD')
  doc.addImage(northSymbol, 'PNG', x + 0.55, y + 0.1, 0.4, 0.65, "north", "FAST")
  doc.text(`ANF Cable pack ${PolygonType}\n${PolygonId}`, x + dimensions.infobox_cell1_w + 0.1, y + 0.35)

  y = y + 0.8

  /* Legal Notice */
  doc.setFontSize(5)
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, dimensions.infobox_cell1_w + dimensions.infobox_cell2_w, 0.6, 'FD')
  doc.text('This drawing must not be copied or\nreproduced without the written permission', x + 0.2, y + 0.25)

}