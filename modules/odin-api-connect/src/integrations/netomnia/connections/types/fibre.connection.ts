export class FiberConnection {
  type: 'LOOP' | 'SPLIT' | 'SPLICE';
  closureId: string;
  outClosureExt: string;
  inClosureExt: string;
  slotId?: string;
  trayModelId?: string;
  trayId?: string;
  trayInId?: string;
  trayOutId?: string;
  traySpliceId?: string;
  traySplitterId?: string;
  cableInId: string;
  cableInExternalRef: string;
  tubeFiberIn: string;
  tubeInId: string;
  fiberInId: string;
  cableOutExternalRef: string;
  tubeFiberOut: string;
  cableOutId: string;
  tubeOutId: string;
  fiberOutId: string;
  splitterNumber?: string;
  spliceNumber?: string;
  fiberInState?: string;
  fiberOutState?: string;
}
