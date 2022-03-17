import { ITraceTemplate } from '../interfaces/connections.interface';
import { getClosureByCableIdAndDirection, getClosureTypeByClosureId, getInCableByClosureId } from './sql';


export const getClosureTypeByCableName = (name: string) => {
    if(name === 'Spine') {
        return [ 'L0', 'L1' ]
    }
    if(name === 'Distribution') {
        return [ 'L1', 'L2' ]
    }
    if(name === 'Access') {
        return [ 'L2', 'L3' ]
    }
}

export const getClosureTypeFromId = (id: number) => {
    if(id === 1) {
        return 'L0'
    }
    if(id === 2) {
        return 'L1'
    }
    if(id === 3) {
        return 'L2'
    }
    if(id === 4) {
        return 'L3'
    }
    if(id === 5) {
        return 'L4'
    }
    if(id === 11) {
        return 'LM'
    }
}

export const getClosureTypeIdByName = (name: string) => {
    if(name === 'L0') {
        return 1
    }
    if(name === 'L1') {
        return 2
    }
    if(name === 'L2') {
        return 3
    }
    if(name === 'L3') {
        return 4
    }
    if(name === 'L4') {
        return 5
    }
    if(name === 'LM') {
        return 11
    }
}

export const getCableTypeIdByName = (name: string) => {

    if(name === 'Spine') {
        return 1
    }
    if(name === 'Distribution') {
        return 2
    }
    if(name === 'Access') {
        return 3
    }
    if(name === 'Feed') {
        return 4
    }

}

export const getCableTypeFromId = (id: number) => {
    if(id === 1) {
        return 'Spine'
    }
    if(id === 2) {
        return 'Distribution'
    }
    if(id === 3) {
        return 'Access'
    }
    if(id === 4) {
        return 'Feed'
    }
}


/**
 * Creats a string T1:F1
 *
 * @param tubeNumber
 * @param FiberNumber
 */
export function constructTubeFibreKey(tubeNumber: any, fiberNumber: any) {

    return `T${tubeNumber}:F${fiberNumber}`

}

/**
 *
 * @param cableId
 */
export async function getDownStreamClosureDetailsByCableId(cableId: any, { odinDb }) {

    const inClosure = await getClosureByCableIdAndDirection(cableId, 'IN', { odinDb })
    const closure = inClosure[0];

    // get the IN loop cable by closure id
    const inClosureInCables = await getInCableByClosureId(closure['closure_id'], { odinDb })

    const inClosureTypeColumn = await getClosureTypeByClosureId(closure['closure_id'], { odinDb })
    const inClosureType = inClosureTypeColumn[0]['label']

    return {

        inClosure: closure,
        inClosureInCables,
        inClosureType,

    };

}

/**
 *
 * @param cableId
 */
export async function getUpstreamClosureDetailsByCableId(cableId: any, { odinDb }) {


    console.log('upstream_closure_by_cable', cableId)

    const upstreamClosure = await getClosureByCableIdAndDirection(cableId, 'OUT', { odinDb })
    const closure = upstreamClosure[0];

    // get the IN loop cable by closure id
    const upstreamClosureInCables = await getInCableByClosureId(closure['closure_id'], { odinDb })

    const upstreamClosureTypeColumn = await getClosureTypeByClosureId(closure['closure_id'], { odinDb })
    const upstreamClosureType = upstreamClosureTypeColumn[0]['label']

    return {

        upstreamClosure: closure,
        upstreamClosureInCables,
        upstreamClosureType,

    };

}


/**
 * Get the fiber number from a tube fiber key
 * @param tubeFiber
 */
export const getFibreNumberFromTubeFiberKey = (tubeFiber: string) => {

    const split1 = tubeFiber.split(':')
    console.log('split1', split1)
    const tubeKey = split1[0]
    const fiberKey = split1[1]

    console.log('fiberKey', fiberKey)
    const split2 = tubeKey.split('T')
    const split2Parsed = Number(split2[1]) < 10 ? `0${split2[1]}` : split2[1]

    const split3 = fiberKey.split('F')
    const split3Parsed = Number(split3[1]) < 10 ? `0${split3[1]}` : split3[1]

    console.log('split2Parsed', split2Parsed)
    console.log('split3Parsed', split3Parsed)

    return Number(`${split2Parsed}${split3Parsed}`)

}


/**
 * This will merge the previous fiber trace template and return a new merged template
 *
 * @param previousTemplate
 * @param newTemplate
 */
export const mergePreviousTemplate = (
    previousTemplate: ITraceTemplate,
    newTemplate: ITraceTemplate,
): ITraceTemplate => {

    let mergedTemplate = newTemplate;

    console.log('previousTemplate', previousTemplate)
    console.log('newTemplate', newTemplate)

    if(previousTemplate) {

        mergedTemplate = {
            connections: [ ...previousTemplate.connections || [], ...newTemplate.connections ],
            slotsChecked: { ...previousTemplate.slotsChecked || {}, ...newTemplate.slotsChecked },
            usedSplices: { ...previousTemplate.usedSplices || {}, ...newTemplate.usedSplices },
            usedSplitterIds: [ ...previousTemplate.usedSplitterIds || [], ...newTemplate.usedSplitterIds ],
            inFibersToConnect: [ ...previousTemplate.inFibersToConnect || [], ...newTemplate.inFibersToConnect ],
            outFibersToConnect: [ ...previousTemplate.outFibersToConnect || [], ...newTemplate.outFibersToConnect ],
            fiberTraces: [ ...previousTemplate.fiberTraces || [], ...newTemplate.fiberTraces ],
        }

    }

    console.log('mergedTemplate', mergedTemplate)

    return mergedTemplate
}


