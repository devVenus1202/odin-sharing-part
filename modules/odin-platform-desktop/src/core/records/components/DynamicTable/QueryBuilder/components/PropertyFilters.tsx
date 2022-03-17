import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { SchemaColumnOptionEntity } from '@d19n/models/dist/schema-manager/schema/column/option/schema.column.option.entity';
import { SchemaColumnValidatorEntity } from '@d19n/models/dist/schema-manager/schema/column/validator/schema.column.validator.entity';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { Button, Col, Form, Input, Select } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { getPipelineFromShortListBySchemaId } from '../../../../../../shared/utilities/pipelineHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../../shared/utilities/schemaHelpers';
import {
  generateModuleAndEntityKeyFromProps,
  setSearchQuery as getSearchQuery,
  setSortQuery,
} from '../../../../../../shared/utilities/searchHelpers';
import { getPipelinesByModuleAndEntity } from '../../../../../pipelines/store/actions';
import { PipelineReducerState } from '../../../../../pipelines/store/reducer';
import { SchemaReducerState } from '../../../../../schemas/store/reducer';
import { searchRecordsRequest } from '../../../../store/actions';
import renderFormField from '../../../Forms/FormFields';
import {
  addFormField,
  removeFormField,
  setFormFieldAndOr,
  setFormFieldCondition,
  setFormFieldEntity,
  setFormFieldOperator,
  setFormFieldProperty,
  setFormFieldValue,
  setSearchQuery,
} from '../store/actions';
import { getQueryBuilderReducer } from '../store/reducer';
import '../styles.scss';

interface Props {
  moduleName: string | undefined,
  entityName: string | undefined,
  recordReducer: any,
  recordTableReducer: any,
  schemaReducer: SchemaReducerState,
  pipelineReducer: PipelineReducerState,
  getPipelines: (params: { schema: SchemaEntity }) => {},
  queryBuilderReducer: any,
  addFormField: () => {},
  removeFormField: (UUID: string) => {},
  setFormFieldEntity: (UUID: string, value: string) => {},
  setFormFieldProperty: (UUID: string, propertyName: string, esPropPath: string) => {},
  setFormFieldCondition: (UUID: string, condition: string) => {},
  setFormFieldValue: (UUID: string, value: any, valueAlias: any) => {}
  configure: (params: any) => {},
  searchRecords: any,
  setFormFieldOperator: (UUID: string, operator: string) => {},
  setFormFieldAndOr: (UUID: string, andOr: string) => {},
}

interface State {
  showFilters: boolean,
  entitySelect: any,
}

interface FormField {
  id: string;
  schemaId: string | undefined,
  entity: string | undefined,
  isHidden: boolean;
  type: string;
  name: string;
  label: string;
  description: string;
  defaultValue: string | number,
  initialValue: string | null,
  options?: SchemaColumnOptionEntity[]
  validators: SchemaColumnValidatorEntity[],
  isDisabled: boolean,
  handleInputChange: any
}

class PropertyFilters extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      showFilters: false,
      entitySelect: React.createRef(),
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
    const { moduleName, entityName } = this.props;
    const prevQbr = getQueryBuilderReducer(prevProps.queryBuilderReducer, moduleName, entityName);
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    if (prevQbr.formFields.propertyFilters?.length !== queryBuilderReducer.formFields.propertyFilters?.length) {
      this.state.entitySelect.current?.focus();
    }
  }

  componentDidMount() {
    this.state.entitySelect.current?.focus();

  }

  renderConditionField(field: any) {
    const { Option } = Select;
    const { setFormFieldCondition } = this.props;

    if (field.property) {
      return (
        <Select
          key={field.property}
          defaultValue={field.condition}
          onSelect={(e) => setFormFieldCondition(
            field.UUID,
            e.toString(),
          )}>
          <Option key="1" value={'must'}>Must include</Option>
          <Option key="2" value={'must_not'}>Must not include</Option>
          <Option key="3" value={'should'}>Should include</Option>
          <Option key="4" value={'filter'}>Filter</Option>
        </Select>
      )
    } else {
      return <Select disabled>{}</Select>
    }
  }

  renderAndOrField(field: any) {
    const { Option } = Select;
    const { setFormFieldAndOr } = this.props;


    return (
      <Select
        key={field.andOr}
        defaultValue={field.andOr || 'AND'}
        onSelect={(e) => setFormFieldAndOr(
          field.UUID,
          e.toString(),
        )}
      >
        <Option key="1" value={'AND'}>AND</Option>
        <Option key="2" value={'OR'}>OR</Option>
      </Select>
    )
  }


  renderOperatorField(field: any) {
    const { Option } = Select;
    const { setFormFieldOperator } = this.props;

    return (
      <Select
        key={field.operator}
        defaultValue={field.operator || '='}
        onSelect={(e) => setFormFieldOperator(
          field.UUID,
          e.toString(),
        )}
      >
        <Option key="1" value={'='}>EQUAL(=)</Option>
        <Option key="2" value={'!='}>NOT EQUAL(!=)</Option>
        <Option key="3" value={'LIKE'}>LIKE</Option>
        <Option key="4" value={'IN'}>ANY OF(IN)</Option>
        <Option key="5" value={'NOT_EMPTY'}>NOT EMPTY</Option>
        <Option key="6" value={'EMPTY'}>EMPTY</Option>
      </Select>
    )
  }

  getFieldTypeFromColumnProperties(schema: any, entityName: string, propertyName: string) {

    let ourColumn: any = undefined;

    if (propertyName === 'title') {
      return {
        name: propertyName,
        type: 'TEXT',
        validators: [],
        options: [],
      }
    }
   
    if (propertyName === 'type') {
      const options = schema?.types?.map((type: SchemaTypeEntity) => {
        return { label: type.name, value: type.name }
      })
      return {
        name: propertyName,
        type: 'ENUM',
        validators: [],
        options: options,
      }
    }

    /* First level association */
    if (schema && schema.entityName == entityName) {
      schema.columns.filter((column: any) => {
        if (column.name == propertyName) {
          ourColumn = column
        }
      })
    }

    /* Nested associations */
    else {
      schema && schema?.associations?.map((association: any) => {
        if (association.childSchema && association.childSchema.entityName == entityName) {

          // ODN-1524 generate column config for stage property
          if (propertyName === 'stage') {
            const { pipelineReducer } = this.props;
            const pipeline = getPipelineFromShortListBySchemaId(pipelineReducer.shortList, association.childSchema.id);
            const options = pipeline?.stages?.map(stage => {
              return { label: stage.name, value: stage.name }
            })
            ourColumn = {
              name: propertyName,
              type: 'ENUM',
              validators: [],
              options: options,
            }
          } else {
            association.childSchema.columns.map((column: any) => {
              if (column.name == propertyName) {
                ourColumn = column
              }
            });
          }
        }
      })
    }

    return ourColumn;
  }

  handleInputChange(event: any, UUID: any, type: string) {
    const { setFormFieldValue } = this.props;

    if (type == 'DATE') {
      event.value = moment(event.value).format('YYYY-MM-DD')
    }

    setFormFieldValue(
      UUID,
      event.value,
      event.label,
    )
  }

  renderFieldInput(schema: any, field: any) {
    if (field.property) {
      let column = this.getFieldTypeFromColumnProperties(schema, field.entityName, field.property);

      if (column && schema) {
        const formField: FormField = {
          id: column.id,
          schemaId: schema.id,
          entity: field.entityName,
          isHidden: false,
          type: column.type,
          name: column.name,
          label: '',
          description: column.description,
          defaultValue: field.value,
          initialValue: field.value || '',
          options: column.options,
          validators: column.validators,
          isDisabled: column.isDisabled,
          handleInputChange: (e: any) => this.handleInputChange(e, field.UUID, column.type),
        };
        return renderFormField(formField);
      }
    } else {
      return (
        <Form.Item>
          <Input disabled>{}</Input>
        </Form.Item>
      )
    }
  }

  renderEntityProperties(schema: any, field: any) {
    const { Option } = Select;
    const { setFormFieldProperty, pipelineReducer } = this.props;

    /* We are rendering first level association */
    if (field.entityName == schema.entityName) {
      return (
        <Select
          key={schema.entityName.id}
          defaultValue={field.property || undefined}
          placeholder="Property"
          onChange={(e) => setFormFieldProperty(
            field.UUID,
            e.toString(),
            this.constructRecordSearchPropertyName(schema, field, e),
          )}>
          <Option key={'title'} value="title">Title</Option>
          {schema.types ? (<Option key={'type'} value="type">Type</Option>) : undefined}
          {
            schema.columns.map((column: any) => {
              return <Option key={column.id} value={column.name}>{column.name}</Option>
            })
          }
        </Select>
      )
    } else if (field.entityName && schema.entityName != field.entityName) {
      /* We are rendering nested association */
      return (
        schema?.associations?.map((association: any) => {
            if (association.childSchema && association.childSchema.entityName == field.entityName) {

              // ODN-1524 load field entity pipeline if exists
              const pipeline = getPipelineFromShortListBySchemaId(pipelineReducer.shortList, association.childSchema.id);

              return (
                <Select
                  key={association.childSchema.id}
                  defaultValue={field.property || undefined}
                  placeholder="Property"
                  onChange={(e) => setFormFieldProperty(
                    field.UUID,
                    e.toString(),
                    this.constructRelatedRecordSearchPropertyName(
                      schema,
                      field,
                      e,
                    ),
                  )}>
                  <Option key={'title'} value="title">Title</Option>
                  {association.childSchema.types ? (<Option key={'type'} value="type">Type</Option>) : undefined}
                  {
                    // ODN-1524 add stage property option if field entity has pipeline
                    pipeline ? (<Option key="stage" value="stage">Stage</Option>) : undefined
                  }
                  {
                    association.childSchema.columns.map((column: any) => {
                      return <Option key={column.id} value={column.name}>{column.name}</Option>
                    })
                  }
                </Select>
              )
            }
          },
        )
      )
    }
    /* Just return disabled select box */
    else {
      return <Select key="2" disabled>{}</Select>
    }
  }

  constructRecordSearchPropertyName(fieldSchema: SchemaEntity, field: any, value: any) {

    const { schemaReducer, moduleName, entityName } = this.props;

    let schema: SchemaEntity | undefined = fieldSchema;
    if (!schema?.columns || schema.columns.length < 1) {
      schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    }
    const column = this.getFieldTypeFromColumnProperties(schema, field.entityName, value);

    if (column && column.name === 'title') {
      return 'title';
    } else if (column && column.name === 'type') {
      return 'type.keyword';
    } else if (column && [ 'CURRENCY', 'NUMBER', 'PERCENT' ].includes(column.type)) {
      return 'properties.' + value.toString();
    } else if (column && [ 'ENUM', 'TEXT' ].includes(column.type)) {
      return 'properties.' + value.toString() + '.keyword';
    } else {
      return 'properties.' + value.toString();
    }
  }

  constructRelatedRecordSearchPropertyName(schema: SchemaEntity, field: any, value: any) {

    const column = this.getFieldTypeFromColumnProperties(schema, field.entityName, value);

    if (column && column.name === 'title') {
      return field.entityName + '.dbRecords.title';
    } else if (column && column.name === 'type') {
      return field.entityName + '.dbRecords.type.keyword';
    } else if (column && column.name === 'stage') {
      return field.entityName + '.dbRecords.stage.name.keyword';
    } else if (column && [ 'CURRENCY', 'NUMBER', 'PERCENT' ].includes(column.type)) {
      return field.entityName + '.dbRecords.properties.' + value.toString();
    } else if (column && [ 'ENUM', 'TEXT' ].includes(column.type)) {
      return field.entityName + '.dbRecords.properties.' + value.toString() + '.keyword';
    } else {
      return field.entityName + '.dbRecords.properties.' + value.toString();
    }
  }

  renderColumnFilterOptions(schema: any, field: any, index: number) {
    const { removeFormField, setFormFieldEntity } = this.props;
    const { Option } = Select;
    let andOrField
    if (index !== 0) {
      andOrField = <Form.Item>
        {this.renderAndOrField(field)}
      </Form.Item>
    }
    if (schema) {
      return (
        <div>
          <Form className={'filter-form'}>
            {andOrField}
            <Form.Item>
              <Select key={schema.id} ref={this.state.entitySelect} style={{ minWidth: '100%', marginTop: '5px' }}
                      defaultValue={field.entityName || undefined}
                      placeholder="Entity"
                      onSelect={(e) => setFormFieldEntity(
                        field.UUID,
                        e.toString(),
                      )}>
                <Option key={schema.entityName} value={schema.entityName}>{schema.entityName}</Option>
                {
                  schema?.associations?.map((association: any) => {
                    if (association.childSchema) {
                      return <Option
                        key={association.childSchema.id}
                        value={association.childSchema.entityName}>{association.childSchema.entityName}
                      </Option>
                    }
                  })
                }
              </Select>
            </Form.Item>
            {field.entityName && <Form.Item>
              {this.renderEntityProperties(schema, field)}
            </Form.Item>}
            {field.entityName && <Form.Item>
              {this.renderOperatorField(field)}
            </Form.Item>}
            {field.entityName && this.renderFieldInput(schema, field)}
            <Form.Item style={{ marginBottom: '0' }}>
              <Button icon={<DeleteOutlined/>} onClick={(e) => removeFormField(field.UUID)}
                      style={{ width: '100%', marginTop: '0px' }}
                      danger>Remove filter
              </Button>
            </Form.Item>
          </Form>
        </div>
      )
    }
  }

  renderFields = () => {
    const { moduleName, entityName, schemaReducer } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    if (moduleName && entityName) {
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
      if (schema) {
        return (
          <Col span={'24'}>
            <div className="form-list-wrapper">
              {
                queryBuilderReducer.formFields.propertyFilters.map((field: any, index: number) =>
                  <Col span="24" key={field.UUID}>
                    {this.renderColumnFilterOptions(schema, field, index)}
                  </Col>,
                )
              }
            </div>
          </Col>
        )
      }
    }
  };


  render() {
    const { addFormField } = this.props;
    return (
      <div style={{ margin: '10px', width: '95%' }}>
        {this.renderFields()}
        <Col span={24}>
          <Button key="1" icon={<PlusOutlined/>} type="dashed" style={{ width: '100%' }} onClick={() => addFormField()}>Add
            Filter</Button>
        </Col>
      </div>
    )
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  schemaReducer: state.schemaReducer,
  pipelineReducer: state.pipelineReducer,
  queryBuilderReducer: state.queryBuilderReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  configure: (params: any) => dispatch(setSearchQuery(generateModuleAndEntityKeyFromProps(ownProps), params)),
  searchRecords: (params: { schema: SchemaEntity, searchQuery: SearchQueryType }) => dispatch(searchRecordsRequest(
    params)),
  addFormField: () => dispatch(addFormField(generateModuleAndEntityKeyFromProps(ownProps))),
  removeFormField: (UUID: string) => dispatch(removeFormField(generateModuleAndEntityKeyFromProps(ownProps), UUID)),
  setFormFieldEntity: (UUID: string, value: string) => dispatch(setFormFieldEntity(generateModuleAndEntityKeyFromProps(
    ownProps), UUID, value)),
  setFormFieldCondition: (UUID: string, condition: string) => dispatch(setFormFieldCondition(
    generateModuleAndEntityKeyFromProps(ownProps),
    UUID,
    condition,
  )),
  setFormFieldOperator: (UUID: string, operator: string) => dispatch(setFormFieldOperator(
    generateModuleAndEntityKeyFromProps(ownProps),
    UUID,
    operator,
  )),
  setFormFieldAndOr: (UUID: string, andOr: string) => dispatch(setFormFieldAndOr(generateModuleAndEntityKeyFromProps(
    ownProps), UUID, andOr)),
  setFormFieldValue: (UUID: string, value: any, valueAlias: any) => dispatch(setFormFieldValue(
    generateModuleAndEntityKeyFromProps(ownProps),
    UUID,
    value,
    valueAlias,
  )),
  setFormFieldProperty: (UUID: string, propertyName: string, esPropPath: string) => dispatch(
    setFormFieldProperty(generateModuleAndEntityKeyFromProps(ownProps), UUID, propertyName, esPropPath),
  ),
  getPipelines: (params: { schema: SchemaEntity }) => dispatch(getPipelinesByModuleAndEntity(params)),
});

export default connect(mapState, mapDispatch)(PropertyFilters);
