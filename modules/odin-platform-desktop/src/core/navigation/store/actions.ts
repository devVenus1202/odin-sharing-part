import {
  ADD_PATH_TO_HISTORY,
  ADD_SELECTED_ENTITY,
  ADD_SELECTED_MODULE,
  ADD_TAB_TO_HISTORY,
  CLOSE_TAB,
  ADD_NAVIGATION_STRUCTURE, ADD_ROUTING_STRUCTURE
} from "./constants";




export function addPathToHistory(params: { path: string }) {
  return {
    type: ADD_PATH_TO_HISTORY,
    params,
  }
}

export function addTabToHistory(params: { path: string, title: string }) {
  return {
    type: ADD_TAB_TO_HISTORY,
    params,
  }
}

export function closeTab(params: { path: string, title: string }) {
  return {
    type: CLOSE_TAB,
    params,
  }
}

export function storeSelectedModule(params: { selectedModule: string }) {
  return {
    type: ADD_SELECTED_MODULE,
    params,
  }
}

export function storeSelectedEntity(params: { selectedEntity: string }) {
  return {
    type: ADD_SELECTED_ENTITY,
    params,
  }
}

export function addNavigationStructure(params: { navigationStructure: object }) {
  return {
    type: ADD_NAVIGATION_STRUCTURE,
    params,
  }
}

export function addRoutingStructure(params: { routingStructure: object }) {
  return {
    type: ADD_ROUTING_STRUCTURE,
    params,
  }
}