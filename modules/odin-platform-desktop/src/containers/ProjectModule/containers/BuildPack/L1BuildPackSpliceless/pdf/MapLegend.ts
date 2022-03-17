import { mapSymbols } from "./QGISsymbols";

type mapTypes = 'overview' | 'cable' | 'cable_or'

/**
 * Construct legend for SLD depending on scope and loop/access chains.
 *
 * @param scope
 */
export const dynamicSLDLegend = (scope: 'overview' | 'chain') => {

  let legendContent: Array<any> = []

  if (scope === 'overview') {


    legendContent.push(
      {
        feature: 'Closure',
        features: [
          { featureTitle: 'L0', featureSymbol: mapSymbols.closure.L0 },
          { featureTitle: 'L1', featureSymbol: mapSymbols.closure.L1 },
        ],
      },
      {
        feature: 'Cable',
        features: [
          { featureTitle: 'Spine', featureSymbol: mapSymbols.cable.spine },
        ]
      }
    )

  }
  else if (scope === 'chain'){

    legendContent.push(
      {
        feature: 'Closure',
        features: [
          { featureTitle: 'L1', featureSymbol: mapSymbols.closure.L1 },
          { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
        ],
      },
      {
        feature: 'Cable',
        features: [
          { featureTitle: 'Distribution', featureSymbol: mapSymbols.cable.distribution },
        ]
      }
    )

  }

  return legendContent

}


/**
 * Construct map legend depending on map type, available features and filtering scopes.
 *
 * @param mapType
 * @param loopChain
 */
export const dynamicMapLegend = (mapType: mapTypes, loopChain?: any) => {

  let legendContent: Array<any> = []


  /*** Overview Map ********************************************************/

  if (mapType === 'overview') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L0', featureSymbol: mapSymbols.closure.L0 },
        { featureTitle: 'L1', featureSymbol: mapSymbols.closure.L1 },
        { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Spine', featureSymbol: mapSymbols.cable.spine },
        { featureTitle: 'Distribution', featureSymbol: mapSymbols.cable.distribution},
      ]
    })

  }


  /*** Openreach + Construction Map ****************************************/

  else if (mapType === 'cable') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L1', featureSymbol: mapSymbols.closure.L1 },
        { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Distribution', featureSymbol: mapSymbols.cable.distribution},
      ]
    })

  }


  /*** Cable Access Map ****************************************************/

  else if (mapType === 'cable_or') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L1', featureSymbol: mapSymbols.closure.L1 },
        { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Distribution', featureSymbol: mapSymbols.cable.distribution},
      ]
    })


    legendContent.push(getOpenreach())

  }



  return legendContent
}


const getOpenreach = () => {
  return {
    feature: 'Openreach PIA',
    features: [
      { featureTitle: 'Duct: ND', featureSymbol: mapSymbols.openreach.pia_duct_nd },
      { featureTitle: 'Duct: Other', featureSymbol: mapSymbols.openreach.pia_duct_other },
      { featureTitle: 'Duct: Other', featureSymbol: mapSymbols.openreach.pia_duct_other },
      { featureTitle: 'Cabinet', featureSymbol: mapSymbols.openreach.pia_structure_cabinet },
      { featureTitle: 'Manhole', featureSymbol: mapSymbols.openreach.pia_structure_mh },
      { featureTitle: 'Pole', featureSymbol: mapSymbols.openreach.pia_structure_pole },
      { featureTitle: 'Joint', featureSymbol: mapSymbols.openreach.pia_structure_joint },
    ]
  }
}


export const drawLegend = (legendContent: Array<any>, doc: any) => {

  const lineHeight: number = 0.3
  const contentX: number = 26
  let y: number = 0

  const addLine = (y: number) => {
    return y + lineHeight
  }

  /* Setup legend rectangle with adjusted height to the content. */
  y = 1.8

  legendContent.forEach((legendFeature: any) => {
    y = addLine(y) + 0.1
    legendFeature.features.forEach((feature: any) => {
      y = addLine(y)
    })
    y = addLine(y)
  })

  doc.setLineWidth(0.04)
  doc.setFillColor(255, 255, 255)
  doc.rect(25.8, 0.8, 3, y-1, 'FD')
  doc.setFontSize(8)
  doc.text('Legend', 26.8, 1.25)


  y = 1.8

  /* Draw out each Legend feature */
  legendContent.forEach((legendFeature: any) => {

    doc.setFontSize(7)
    doc.text(legendFeature.feature, contentX, y)
    y = addLine(y) + 0.1

    legendFeature.features.forEach((feature: any) => {
      doc.text(feature.featureTitle, contentX + 0.6, y)
      doc.addImage(feature.featureSymbol, 'PNG', contentX, y - lineHeight, 0.4, 0.4, undefined, "FAST")
      y = addLine(y)

    })

    y = addLine(y)

  })

}
