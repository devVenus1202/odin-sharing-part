import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import {
  ADD_FORM_FIELD,
  SET_QUERY_BUILDER_SEARCH_QUERY,
  REMOVE_FORM_FIELD,
  RESET_QUERY_BUILDER_STATE,
  SET_DATE_RANGE_QUERY,
  SET_FORM_FIELD_CONDITION,
  SET_FORM_FIELD_ENTITY,
  SET_FORM_FIELD_PROPERTY,
  SET_FORM_FIELD_VALUE,
  SET_QUERY_BUILDER_FORM_FIELDS,
  SET_QUERY_BUILDER_STATE,
  TOGGLE_QUERY_BUILDER,
  SET_FORM_FIELD_OPERATOR,
  SET_FORM_FIELD_AND_OR,
  SHOW_QUERY_BUILDER,
  SET_QUERY_BUILDER_TAB,
} from './constants';

import { FieldData, IQueryBuilderByModuleAndEntityReducer } from './reducer';

export interface IDateRangeQuery {
  property: string,
  gte: string,
  lte: string
}

export function toggleQueryBuilder(moduleAndEntity: string) {
  return {
    type: TOGGLE_QUERY_BUILDER,
    moduleAndEntity,
  }
}

export function showQueryBuilder(moduleAndEntity: string) {
  return {
    type: SHOW_QUERY_BUILDER,
    moduleAndEntity,
  }
}

export function setQueryBuilderDefaultTab(moduleAndEntity: string, params: { activeKey: string }) {
  return {
    type: SET_QUERY_BUILDER_TAB,
    moduleAndEntity,
    params,
  }
}


export function setQueryBuilderState(moduleAndEntity: string, params: IQueryBuilderByModuleAndEntityReducer) {
  return {
    type: SET_QUERY_BUILDER_STATE,
    moduleAndEntity,
    params,
  }
}

export function setQueryBuilderFormFields(moduleAndEntity: string, params: { formFields: {} }) {
  return {
    type: SET_QUERY_BUILDER_FORM_FIELDS,
    moduleAndEntity,
    params,
  }
}

export function resetQueryBuilderState(moduleAndEntity: string) {
  return {
    type: RESET_QUERY_BUILDER_STATE,
    moduleAndEntity,
  }
}


export function setSearchQuery(moduleAndEntity: string, params: { schema: SchemaEntity, query: FieldData[], queryType: 'query_string | range' }) {
  return {
    type: SET_QUERY_BUILDER_SEARCH_QUERY,
    moduleAndEntity,
    params,
  }
}

export function addFormField(moduleAndEntity: string) {
  return {
    type: ADD_FORM_FIELD,
    moduleAndEntity,
  }
}

export function removeFormField(moduleAndEntity: string, UUID: string) {
  return {
    type: REMOVE_FORM_FIELD,
    moduleAndEntity,
    UUID,
  }
}

export function setFormFieldEntity(moduleAndEntity: string, UUID: string, value: string) {
  return {
    type: SET_FORM_FIELD_ENTITY,
    moduleAndEntity,
    UUID,
    value,
  }
}

export function setFormFieldProperty(moduleAndEntity: string, UUID: string, propertyName: string, esPropPath: string) {
  return {
    type: SET_FORM_FIELD_PROPERTY,
    moduleAndEntity,
    UUID,
    propertyName,
    esPropPath,
  }
}

export function setFormFieldCondition(moduleAndEntity: string, UUID: string, condition: string) {
  return {
    type: SET_FORM_FIELD_CONDITION,
    moduleAndEntity,
    UUID,
    condition,
  }
}

export function setFormFieldOperator(moduleAndEntity: string, UUID: string, operator: string) {
  return {
    type: SET_FORM_FIELD_OPERATOR,
    moduleAndEntity,
    UUID,
    operator,
  }
}

export function setFormFieldAndOr(moduleAndEntity: string, UUID: string, andOr: string) {
  return {
    type: SET_FORM_FIELD_AND_OR,
    moduleAndEntity,
    UUID,
    andOr,
  }
}

export function setFormFieldValue(moduleAndEntity: string, UUID: string, value: string, valueAlias: string) {
  return {
    type: SET_FORM_FIELD_VALUE,
    moduleAndEntity,
    UUID,
    value,
    valueAlias,
  }
}


export function setDateRangeQuery(moduleAndEntity: string, query: IDateRangeQuery) {
  return {
    type: SET_DATE_RANGE_QUERY,
    moduleAndEntity,
    query,
  }
}
