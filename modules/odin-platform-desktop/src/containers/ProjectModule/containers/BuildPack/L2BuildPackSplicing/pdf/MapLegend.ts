import { mapSymbols } from "./QGISsymbols";

type mapTypes = 'overview' | 'construction' | 'cable_access' | 'cable_feed' | 'cable_feed_chain'

/**
 * Construct legend for SLD depending on scope and loop/access chains.
 *
 * @param loopChains
 * @param scope
 * @param scopeTarget
 */
export const dynamicSLDLegend = (loopChains: Array<any>, scope: 'all' | 'single', scopeTarget?: number) => {

  let legendContent: Array<any> = []
  let loopChainLegendItems: Array<any> = []

  if (scope === 'all') {


    legendContent.push(
      {
        feature: 'Closure',
        features: [
          { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
          { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 },
          { featureTitle: 'L4', featureSymbol: mapSymbols.closure.L4 }
        ],
      },
      {
        feature: 'Cable',
        features: [
          { featureTitle: 'Feed', featureSymbol: mapSymbols.cable.feedUG },
        ]
      }
    )

    /* MR: This has to be built dynamic. */

   /* loopChains.forEach((loopChain: any, i: number) => {
      loopChainLegendItems.push({
        featureTitle: `Access chain ${i + 1}`,
        featureSymbol: i < 7 ? mapSymbols.accessChain[i].img : mapSymbols.accessChain[7].img
      })
    })*/

    /*legendContent.push({
      feature: 'Access Chains',
      features: loopChainLegendItems
    })*/

  }
  else if (scope === 'single'){

    legendContent.push(
      {
        feature: 'Closure',
        features: [
          { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
          { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 },
          { featureTitle: 'L4', featureSymbol: mapSymbols.closure.L4 }
        ],
      },
      {
        feature: 'Cable',
        features: [
          { featureTitle: 'Feed', featureSymbol: mapSymbols.cable.feedUG },
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
        { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
        { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 },
        { featureTitle: 'L4', featureSymbol: mapSymbols.closure.L4 }
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Access UG', featureSymbol: mapSymbols.cable.accessUG },
        { featureTitle: 'Access OH', featureSymbol: mapSymbols.cable.accessOH },
        { featureTitle: 'Feed UG', featureSymbol: mapSymbols.cable.feedUG },
        { featureTitle: 'Feed OH', featureSymbol: mapSymbols.cable.feedOH }
      ]
    })

    legendContent.push(getOpenreach())

  }


  /*** Openreach + Construction Map ****************************************/

  else if (mapType === 'construction') {

    if (loopChain.poles && loopChain.poles.length)
      legendContent.push({
        feature: 'Pole',
        features: [
          { featureTitle: 'Medium', featureSymbol: mapSymbols.pole.medium },
          { featureTitle: 'Light', featureSymbol: mapSymbols.pole.light },
          { featureTitle: 'Stout', featureSymbol: mapSymbols.pole.stout }
        ]
      })

    if (loopChain.chambers && loopChain.chambers.length)
      legendContent.push({
        feature: 'Chamber',
        features: [
          { featureTitle: 'FW4', featureSymbol: mapSymbols.chamber.fw4 },
          { featureTitle: 'FW2', featureSymbol: mapSymbols.chamber.fw2 },
          { featureTitle: 'Toby', featureSymbol: mapSymbols.chamber.toby }
        ]
      })

    if (loopChain.ducts && loopChain.ducts.length)
      legendContent.push({
        feature: 'Duct',
        features: [
          { featureTitle: 'Duct', featureSymbol: mapSymbols.duct.duct }
        ]
      })

    legendContent.push(getOpenreach())

  }


  /*** Cable Access Map ****************************************************/

  else if (mapType === 'cable_access') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L2', featureSymbol: mapSymbols.closure.L2 },
        { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 }
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Access UG', featureSymbol: mapSymbols.cable.accessUG },
        { featureTitle: 'Access OH', featureSymbol: mapSymbols.cable.accessOH }
      ]
    })

    legendContent.push(getOpenreach())

  }


  /*** Cable Feed Map ******************************************************/

  else if (mapType === 'cable_feed') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 },
        { featureTitle: 'L4', featureSymbol: mapSymbols.closure.L4 }
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Feed UG', featureSymbol: mapSymbols.cable.feedUG },
        { featureTitle: 'Feed OH', featureSymbol: mapSymbols.cable.feedOH }
      ]
    })

    legendContent.push({
      feature: 'Addresses',
      features: [
        { featureTitle: 'Residential', featureSymbol: mapSymbols.addresses.residential },
        { featureTitle: 'Business', featureSymbol: mapSymbols.addresses.business }
      ]
    })

  }

  else if (mapType === 'cable_feed_chain') {

    legendContent.push({
      feature: 'Closure',
      features: [
        { featureTitle: 'L3', featureSymbol: mapSymbols.closure.L3 },
        { featureTitle: 'L4', featureSymbol: mapSymbols.closure.L4 }
      ]
    })

    legendContent.push({
      feature: 'Cable',
      features: [
        { featureTitle: 'Feed UG', featureSymbol: mapSymbols.cable.feedUG },
        { featureTitle: 'Feed OH', featureSymbol: mapSymbols.cable.feedOH }
      ]
    })

    legendContent.push({
      feature: 'Addresses',
      features: [
        { featureTitle: 'Residential', featureSymbol: mapSymbols.addresses.residential },
        { featureTitle: 'Business', featureSymbol: mapSymbols.addresses.business }
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
