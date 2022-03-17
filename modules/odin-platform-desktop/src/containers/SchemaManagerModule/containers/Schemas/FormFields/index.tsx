import { ChangeCaseEnums, SchemaModuleTypes } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';

export const titleCaseList = [
  { value: ChangeCaseEnums.UPPER_CASE, label: 'UPPER CASE' },
  { value: ChangeCaseEnums.LOWER_CASE, label: 'lower case' },
  { value: ChangeCaseEnums.CAMEL_CASE, label: 'camelCase' },
  { value: ChangeCaseEnums.CAPITAL_CASE, label: 'Capital Case' },
  { value: ChangeCaseEnums.CONSTANT_CASE, label: 'CONSTANT_CASE' },
  { value: ChangeCaseEnums.DOT_CASE, label: 'dot.case' },
  { value: ChangeCaseEnums.HEADER_CASE, label: 'HEADER-CASE' },
  { value: ChangeCaseEnums.PARAM_CASE, label: 'param-case' },
  { value: ChangeCaseEnums.PATH_CASE, label: 'path/case' },
  { value: ChangeCaseEnums.PASCAL_CASE, label: 'Pascal Case' },
  { value: ChangeCaseEnums.SNAKE_CASE, label: 'snake_case' },
  { value: ChangeCaseEnums.SENTENCE_CASE, label: 'Sentence case' },
  { value: ChangeCaseEnums.NO_CASE, label: 'no case' },
  { value: ChangeCaseEnums.CAMEL_UPPER_CASE, label: 'Camel UPPER CASE(Apply 2 cases)' },
  { value: ChangeCaseEnums.CAMEL_LOWER_CASE, label: 'Camel lower case(Apply 2 cases)' },
]

const modules = Object.values(SchemaModuleTypes).map((module: any) => {
  return { value: module.label, label: module.name }
})
export const formFields = [
  {
    label: 'Name',
    property: 'name',
    type: 'TEXT',
    isRequired: true,
    message: 'Please input name',
    value: undefined,
  },
  {
    label: 'Description',
    property: 'description',
    type: 'TEXT',
    isRequired: true,
    message: 'Please input description',
    value: undefined,
  },
  {
    label: 'Module Name',
    property: 'moduleName',
    type: 'ENUM',
    isRequired: false,
    message: 'Please input module name',
    isHidden: false,
    value: undefined,
    isDisabled: false,
    options: modules,
  },
  {
    label: 'Entity Name',
    property: 'entityName',
    type: 'TEXT',
    isRequired: false,
    message: 'Please input entity name',
    isHidden: false,
    value: undefined,
    isDisabled: false,
  },
  {
    label: 'Title Case',
    property: 'titleCase',
    type: 'ENUM',
    isRequired: false,
    message: 'Please input title case',
    isHidden: false,
    value: undefined,
    isDisabled: false,
    options: titleCaseList,
  },
]
