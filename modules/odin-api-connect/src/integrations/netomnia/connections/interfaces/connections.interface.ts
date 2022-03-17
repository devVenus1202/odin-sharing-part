import { FiberConnection } from '../types/fibre.connection';

export interface ITraceTemplate {

    connections: FiberConnection[],
    slotsChecked: { [key: string]: any },
    usedSplices: { [key: string]: any },
    fiberTraces: any[],
    // for L1, L2
    usedSplitterIds?: string[],
    // for L1, L2
    inFibersToConnect?: any[],
    // for L1, L2
    outFibersToConnect?: any[],

}
