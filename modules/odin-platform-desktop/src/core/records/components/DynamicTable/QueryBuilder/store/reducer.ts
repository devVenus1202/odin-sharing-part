import { BooleanQuery } from '@d19n/models/dist/search/search.query.boolean.interfaces';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { generateModuleAndEntityKey } from '../../../../../../shared/utilities/searchHelpers';
import {
  ADD_FORM_FIELD,
  REMOVE_FORM_FIELD,
  RESET_QUERY_BUILDER_STATE,
  SET_DATE_RANGE_QUERY,
  SET_FORM_FIELD_AND_OR,
  SET_FORM_FIELD_CONDITION,
  SET_FORM_FIELD_ENTITY,
  SET_FORM_FIELD_OPERATOR,
  SET_FORM_FIELD_PROPERTY,
  SET_FORM_FIELD_VALUE,
  SET_QUERY_BUILDER_FORM_FIELDS,
  SET_QUERY_BUILDER_SEARCH_QUERY,
  SET_QUERY_BUILDER_STATE,
  SET_QUERY_BUILDER_TAB,
  SHOW_QUERY_BUILDER,
  TOGGLE_QUERY_BUILDER,
} from './constants';

export interface FieldData {
  property: string;
  condition: string;
  value: any;
  valueAlias: any;
  UUID: string;
  entityName: string;
  query: any;
  esPropPath: string;
  andOr: string;
  operator: string;
}

export interface IQueryBuilderByModuleAndEntityReducer {
  isVisible: boolean,
  activeKey?: string
  formFields: {
    propertyFilters: FieldData[],
    pipelineFilters: FieldData[],
    groupsFilters: FieldData[],
  },
  dateRangeFilters: { property: string, gte: string, lte: string, rangeKey?: string } | null,
  queries: {
    must: [],
    must_not: [],
    should: [],
    filter: [],
  },
}

export interface QueryBuilderReducer extends IQueryBuilderByModuleAndEntityReducer {
  byModuleAndEntity: { [key: string]: IQueryBuilderByModuleAndEntityReducer },
}

export const initialStateByModuleAndEntity: IQueryBuilderByModuleAndEntityReducer = {
  isVisible: false,
  activeKey: '1',
  formFields: {
    propertyFilters: [],
    pipelineFilters: [],
    groupsFilters: [],
  },
  dateRangeFilters: null,
  queries: {
    must: [],
    must_not: [],
    should: [],
    filter: [],
  },
};

const initialState: QueryBuilderReducer = {
  ...initialStateByModuleAndEntity,
  byModuleAndEntity: {},
}

/**
 * Returns QueryBuilderReducer state by module and entity.
 * Provides initial state if the given key doesn't exist.
 * @param reducer
 * @param moduleName
 * @param entityName
 * @returns
 */
export function getQueryBuilderReducer(
  reducer: QueryBuilderReducer,
  moduleName: string | undefined,
  entityName: string | undefined,
): IQueryBuilderByModuleAndEntityReducer {
  if(!reducer || !reducer.byModuleAndEntity) {
    return initialStateByModuleAndEntity;
  }
  if(!moduleName || !entityName) {
    return initialStateByModuleAndEntity;
  }
  const moduleAndEntity = generateModuleAndEntityKey(moduleName, entityName);
  const res = reducer.byModuleAndEntity[moduleAndEntity] ?? initialStateByModuleAndEntity;
  return res;
}

function reducer(state = initialState, action: any) {

  if(!action.moduleAndEntity) {
    return state;
  }

  const currentState = state.byModuleAndEntity ? state.byModuleAndEntity[action.moduleAndEntity] : undefined;
  const newStateByModuleAndEntity = reduceByModuleAndEntity(currentState, action);
  const newState = {
    ...state,
    byModuleAndEntity: {
      ...state.byModuleAndEntity,
      [action.moduleAndEntity]: newStateByModuleAndEntity,
    },
  };
  return newState;
}

function reduceByModuleAndEntity(state = initialStateByModuleAndEntity, action: any) {

  let _newPropertyFilters;

  switch (action.type) {

    case SET_QUERY_BUILDER_STATE:
      return {
        ...state,
        ...action.params,
      };

    case TOGGLE_QUERY_BUILDER:
      return {
        ...state,
        isVisible: !state.isVisible,
      };

    case SHOW_QUERY_BUILDER:
      return {
        ...state,
        isVisible: true,
      };

    case SET_QUERY_BUILDER_TAB:
      return {
        ...state,
        activeKey: action.params.activeKey,
      };

    case SET_QUERY_BUILDER_FORM_FIELDS:
      return {
        ...state,
        formFields: action.params.formFields,
      };

    case SET_QUERY_BUILDER_SEARCH_QUERY:
      const newQueries = {
        must: <any[]>[],
        must_not: <any[]>[],
        should: <any[]>[],
        filter: <any[]>[],
      };

      newQueries.filter.push(...getDateRangeQuery(state.dateRangeFilters));

      for(let i = 0; i < action.params?.query?.length; i++) {

        const item = action.params?.query[i];
        const nextItem = action.params?.query[i + 1];

        if (nextItem?.andOr === 'OR' || item.operator) {
          if (nextItem?.andOr === 'OR') {
            const baseORQuery: any = {
              'bool': {
                'should': [],
              },
            };

            const itemBlock = getQueryBlock(item);
            const nextItemBlock = getQueryBlock(nextItem);

            baseORQuery.bool.should.push(itemBlock);
            baseORQuery.bool.should.push(nextItemBlock);

            newQueries['must'].push(baseORQuery);

            i = i + 1;
          } else {
            const itemBlock = getQueryBlock(item);

            if (itemBlock?.bool?.must_not) {
              newQueries['must_not'].push(itemBlock.bool.must_not);
            } else if (itemBlock?.terms) {
              newQueries['filter'].push(itemBlock);
            } else {
              newQueries['must'].push(itemBlock);
            }
          }

        } else if (item && action.params.queryType === 'query_string') {
          newQueries['filter'].push({
              query_string : getQueryStringCondition(item)
          });
        }
      }

      return {
        ...state,
        queries: newQueries,
      };
      break;

    case RESET_QUERY_BUILDER_STATE:
      return initialStateByModuleAndEntity;

    case SET_FORM_FIELD_CONDITION:
      let newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.condition = action.condition
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: newPropertyFilters,
        }),
      }
      break;
    case SET_FORM_FIELD_AND_OR:
      _newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.andOr = action.andOr
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: _newPropertyFilters,
        }),
      }
      break;
    case SET_FORM_FIELD_OPERATOR:
      _newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.operator = action.operator
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: _newPropertyFilters,
        }),
      }
      break;

    case SET_FORM_FIELD_ENTITY:
      _newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.entityName = action.value
          field.property = ''
          field.condition = ''
          field.andOr = field.andOr || 'AND'
          field.operator = action.operator || '='
          field.value = ''
          field.valueAlias = undefined
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: _newPropertyFilters,
        }),
      }
      break;

    case SET_FORM_FIELD_PROPERTY:
      _newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.property = action.propertyName
          field.esPropPath = action.esPropPath
          field.condition = ''
          field.value = ''
          field.valueAlias = undefined
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: _newPropertyFilters,
        }),
      }
      break;

    case SET_FORM_FIELD_VALUE:
      _newPropertyFilters = state.formFields.propertyFilters.map((field => {
        if(field.UUID == action.UUID) {
          field.value = action.value ?? '';
          field.valueAlias = action.valueAlias;
        }
        return field;
      }))
      return {
        ...state,
        formFields: Object.assign({}, state.formFields, {
          propertyFilters: _newPropertyFilters,
        }),
      }
      break;

    case REMOVE_FORM_FIELD:
      const propertyFilters = state.formFields.propertyFilters.filter((field => field.UUID !== action.UUID))
      const remainingPropertyFields = Object.assign({}, state.formFields, {
        propertyFilters: propertyFilters,
      })
      return {
        ...state,
        formFields: remainingPropertyFields,
      }
      break;

    case ADD_FORM_FIELD:
      const newField = {
        UUID: uuidv4(),
        entityName: '',
        property: '',
        condition: '',
        value: '',
        valueAlias: undefined,
        esPropPath: '',
      };

      const newFormFields = Object.assign({}, state.formFields, {
        propertyFilters: [ ...state.formFields.propertyFilters, ...[ newField ] ],
      })

      return {
        ...state,
        formFields: newFormFields,
      };
      break;

    case SET_DATE_RANGE_QUERY:
      return {
        ...state,
        dateRangeFilters: Object.assign({}, state.dateRangeFilters, action.query),
      };
      break;

    default:
      return state;
  }
}


export function getDateRangeQuery(
  dateRangeFilters: {
    property: string,
    gte: string,
    lte: string,
    rangeKey?: string
  } | null
): { range: { [key: string]: { gte: any; lte: any; } } }[] {
  const res = [];
  if (dateRangeFilters) {
    const lteDate = dayjs(dateRangeFilters.lte).add(1, 'day');
    res.push({
      range: {
        [dateRangeFilters.property]: {
          gte: dateRangeFilters.gte,
          lte: lteDate.isValid() ? lteDate.format('YYYY-MM-DD') : dateRangeFilters.lte,
        },
      }
    });
  }
  return res;
}


export function getQueryBlock(item: FieldData) {

  switch (item.operator) {
    case '=':
      const baseQueryEqualEl: any = {};
      if (isPathToKeyword(item)) {
        baseQueryEqualEl.terms = {
          [item.esPropPath] : [ item.value ]
        };
      } else {
        baseQueryEqualEl.query_string = getQueryStringCondition(item);
      }
      
      return baseQueryEqualEl

    case '!=':
      const baseQueryNotEqualEl: any = {
        'bool': {
          'must_not': {},
        },
      }
      if (isPathToKeyword(item)) {
        baseQueryNotEqualEl.bool.must_not.terms = {
          [item.esPropPath] : [ item.value ]
        };
      } else {
        baseQueryNotEqualEl.bool.must_not.query_string = getQueryStringCondition(item);
      }

      return baseQueryNotEqualEl

    case 'LIKE':
      const baseQueryLikeEl: any = {};
      baseQueryLikeEl.query_string = getQueryStringCondition(item, true);
      return baseQueryLikeEl

    case 'IN':
      const baseQueryInEl: any = {
        'match': {},
      };
      baseQueryInEl.match[item.esPropPath] = {
        query: item.value,
        operator: 'or',
      }
      return baseQueryInEl

    case 'NOT_EMPTY':
      const baseQueryAnyEl: any = {};
      baseQueryAnyEl.exists = {
        field: item.esPropPath
      };
      return baseQueryAnyEl;

    case 'EMPTY':
      const baseQueryEmptyEl: any = {
        'bool': {
          'must_not': {},
        },
      };
      baseQueryEmptyEl.bool.must_not.exists = {
        field: item.esPropPath
      };
      return baseQueryEmptyEl;
  }
}

function getQueryStringCondition(item : FieldData, addWildcards?: boolean) {
  let query = item.value;
  if (addWildcards) {
    if (typeof query === 'string') {
      const terms = query.split(' ');
      query = terms.map(term => `*${term}*`).join(' ');
    }
  }
  return {
    fields: [ item?.esPropPath ],
    query,
    default_operator: 'AND',
    lenient: true,
    analyze_wildcard: true,
    boost: 1.0,
  };
}

function isPathToKeyword(item: FieldData) {
  return item?.esPropPath?.endsWith(".keyword");
}

export default reducer;
