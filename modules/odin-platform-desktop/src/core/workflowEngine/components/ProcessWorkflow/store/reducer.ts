import { DbRecordEntityTransform } from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";
import { splitEntityToModuleAndEntity } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";
import { DataTypesUtils } from "@d19n/models/dist/schema-manager/helpers/DataTypesUtils";
import { WTriggerEntityEventEnum, WTriggerTypeEnum } from "@d19n/models/dist/schema-manager/workflow/types/workflow.types";
import { CLOSE_PROCESS_WORKFLOW_FORM, INIT_PROCESS_WORKFLOW_FORM, UPDATE_PROCESS_WORKFLOW_FORM_STATE } from "./constants";


export interface IProcessWorkflowFormReducer {
  isVisible: boolean;

  recordId?: string;
  initialRecord?: DbRecordEntityTransform;
  canChangeRecord: boolean;

  workflowId?: string;
  canChangeWorkflow: boolean;

  moduleName?: string;
  entityName?: string;

  isActive?: boolean;

  triggerType?: WTriggerTypeEnum;
  triggerEntityEvents: WTriggerEntityEventEnum[];
}

const initialState: IProcessWorkflowFormReducer = {
  isVisible: false,
  canChangeRecord: true,
  canChangeWorkflow: true,
  isActive: true,
  triggerType: WTriggerTypeEnum.ENTITY_EVENT,
  triggerEntityEvents: [],
}

function reducer(state = initialState, action: { type: string, params: { [key: string]: any } }): IProcessWorkflowFormReducer {
  switch (action.type) {

    case INIT_PROCESS_WORKFLOW_FORM:
      const newState: IProcessWorkflowFormReducer = {
        ...initialState,
        isVisible: true,
        initialRecord: action.params.record,
        canChangeRecord: action.params.canChangeRecord ?? state.canChangeRecord,
        workflowId: action.params.workflowId,
        canChangeWorkflow: action.params.canChangeWorkflow ?? state.canChangeWorkflow,
      };
      if (newState.initialRecord) {
        newState.recordId = newState.initialRecord.id;
        const { moduleName, entityName } = splitEntityToModuleAndEntity(newState.initialRecord.entity);
        newState.moduleName = moduleName;
        newState.entityName = entityName;
      }
      return newState;


    case UPDATE_PROCESS_WORKFLOW_FORM_STATE:
      const updatedState: IProcessWorkflowFormReducer = {
        ...state,
        recordId: action.params.recordId ?? state.recordId,
        moduleName: action.params.moduleName ?? state.moduleName,
        entityName: action.params.entityName ?? state.entityName,
        isActive: action.params.isActive ?? state.isActive,
        triggerType: action.params.triggerType ?? state.triggerType,
        triggerEntityEvents: action.params.triggerEntityEvents ?? state.triggerEntityEvents,
        workflowId: action.params.workflowId ?? state.workflowId,
      };
      return updatedState;


    case CLOSE_PROCESS_WORKFLOW_FORM:
      return {
        ...state,
        isVisible: false,
      }


    default:
      return state;
  }
}

export default reducer;