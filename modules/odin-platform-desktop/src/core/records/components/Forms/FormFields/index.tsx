import { DbRecordAssociationCreateUpdateDto } from '@d19n/models/dist/schema-manager/db/record/association/dto/db.record.association.create.update.dto';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { MetadataLinks } from '@d19n/models/dist/schema-manager/metadata.links';
import { SchemaAssociationEntity } from '@d19n/models/dist/schema-manager/schema/association/schema.association.entity';
import { SchemaColumnOptionEntity } from '@d19n/models/dist/schema-manager/schema/column/option/schema.column.option.entity';
import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { SchemaColumnValidatorEntity } from '@d19n/models/dist/schema-manager/schema/column/validator/schema.column.validator.entity';
import { SchemaColumnValidatorEnums } from '@d19n/models/dist/schema-manager/schema/column/validator/schema.column.validator.types';
import Editor from '@monaco-editor/react';
import { Checkbox, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { Rule } from 'antd/lib/form';
import moment from 'moment';
import { sortByPosition } from '../../../../../shared/utilities/schemaHelpers';
import { setIsChecked } from '../../../../../shared/utilities/validateDataTypes';
import LookUpInput from '../../../../recordsAssociations/components/LookUpInput/LookUpInput';
import FileUploaderClickToUpload from '../../Files/FileUploaderClickToUpload';
import TagInput from '../../TagInput';

const { TextArea } = Input;
const { Option } = Select;

export interface InputChangeParams {

  id: string;
  entity: string;
  value: any;
  association?: DbRecordAssociationCreateUpdateDto;

}

export interface FormField {

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
  customValidation?: any
  isDisabled: boolean,
  handleInputChange: any,
  linkedSchemaAssociation?: SchemaAssociationEntity,
  initialRecordMetadataLink?: MetadataLinks,

}

const dateFormat = 'YYYY-MM-DD';

export default function renderFormField(field: FormField) {

  if (!field.isHidden) {
    switch (field.type) {
      case SchemaColumnTypes.TEXT:
        return (<Form.Item
          key={field.id}
          name={field.name}
          label={field.label}
          labelCol={{ span: 24 }}
          initialValue={field.initialValue}
          rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
        >
          <Input
            type="text"
            disabled={field.isDisabled}
            defaultValue={field.defaultValue}
            placeholder={field.description}
            onChange={(e) => field.handleInputChange({
              id: `${field.schemaId}#${field.name}`,
              entity: field.entity,
              value: !!e.target.value ? e.target.value : null,
            })} />
        </Form.Item>);
      case SchemaColumnTypes.TEXT_LONG:
        return (<Form.Item
          key={field.id}
          name={field.name}
          label={field.label}
          labelCol={{ span: 24 }}
          initialValue={field.initialValue}
          rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
        >
          <TextArea
            rows={4}
            disabled={field.isDisabled}
            defaultValue={field.defaultValue}
            placeholder={field.description}
            onChange={(e) => field.handleInputChange({
              id: `${field.schemaId}#${field.name}`,
              entity: field.entity,
              value: e.target.value ?? null,
            })} />
        </Form.Item>);

      case SchemaColumnTypes.NUMBER:
      case SchemaColumnTypes.CURRENCY:
      case SchemaColumnTypes.PERCENT:
        const validationRules: Rule[] = [
          {
            required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED),
          },
        ];
        if (field.customValidation?.numberRange?.min || field.customValidation?.numberRange?.max) {
          validationRules.push({
            validator(rule, value, callback) {
              if (!value) {
                return callback();
              } else {
                let valid = !field.customValidation?.numberRange?.min || value >= field.customValidation?.numberRange?.min;
                valid = valid && (!field.customValidation?.numberRange?.max || value <= field.customValidation?.numberRange?.max);
                if (!valid) {
                  return callback(field.customValidation?.numberRange?.message);
                } else {
                  return callback(undefined);
                }
              }
            },
          });
        }

        return (<Form.Item
          key={field.id ? field.id.toString() : field.name}
          name={field.name}
          label={field.label}
          labelCol={{ span: 24 }}
          initialValue={field.initialValue}
          rules={validationRules}
        >
          <InputNumber
            style={{ width: '100%' }}
            disabled={field.isDisabled}
            defaultValue={Number(field.defaultValue)}
            min={0}
            placeholder={field.description}
            onChange={(value) => field.handleInputChange({
              id: `${field.schemaId}#${field.name}`,
              entity: field.entity,
              value: value ?? null,
            })} />
        </Form.Item>);
      case SchemaColumnTypes.DATE:
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            labelCol={{ span: 24 }}
            initialValue={!!field.initialValue ? moment(field.initialValue, dateFormat) : undefined}
            rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
          >
            <DatePicker
              key={field.id}
              style={{ width: '100%' }}
              disabled={field.isDisabled}
              defaultValue={!!field.initialValue ? moment(field.initialValue, dateFormat) : undefined}
              format={dateFormat}
              onChange={(val) => field.handleInputChange({
                id: `${field.schemaId}#${field.name}`,
                entity: field.entity,
                value: val ? moment(val).format(dateFormat) : null,
              })}
            />
          </Form.Item>);

      case SchemaColumnTypes.ENUM:
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            labelCol={{ span: 24 }}
            initialValue={!!field.initialValue ? field.initialValue : `select ${field.label}`}
            rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
          >
            <Select
              allowClear
              key={field.id}
              virtual={false}
              defaultValue={!!field.defaultValue ? field.defaultValue : `select ${field.label}`}
              style={{ width: '100%' }}
              disabled={field.isDisabled}
              onChange={(val, option) => field.handleInputChange({
                id: `${field.schemaId}#${field.name}`,
                entity: field.entity,
                value: val ?? null,
                label: (option as any)?.title,
              })}
              getPopupContainer={trigger => trigger.parentNode}
            >
              {field.options ? field.options.sort(sortByPosition).map((opt, key) => (
                <Option value={opt.value} title={opt.label}>
                  <span className="select-option-value"><b>{opt.label}</b></span>
                  <span className="select-option-description"><i>{opt.description}</i></span>
                </Option>
              )) : (
                <Option value="">no options</Option>
              )}
            </Select>
          </Form.Item>);

      case SchemaColumnTypes.FILE_SINGLE:
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            labelCol={{ span: 24 }}
            initialValue={!!field.initialValue ? field.initialValue : `select ${field.label}`}
            rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
          >
            <FileUploaderClickToUpload onSuccess={(elem: DbRecordEntityTransform) => {
              field.handleInputChange({
                id: `${field.schemaId}#${field.name}`,
                entity: field.entity,
                value: getProperty(elem, 'Url'),
                association: {
                  recordId: elem.id,
                },
              });


            }} />
          </Form.Item>
        )

      case SchemaColumnTypes.BOOLEAN:

        return (<Form.Item
          key={field.id ? field.id.toString() : field.name}
          name={field.name}
          label={field.label}
          labelCol={{ span: 24 }}
          initialValue={setIsChecked(field)}
          rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
        >
          <Checkbox
            disabled={field.isDisabled}
            defaultChecked={setIsChecked(field)}
            onChange={(e) => field.handleInputChange({
              id: `${field.schemaId}#${field.name}`,
              entity: field.entity,
              value: e.target.checked,
            })}
          />
        </Form.Item>);

      case SchemaColumnTypes.JSON:
        return (
          <Form.Item>
            <Editor
              height="90vh"
              defaultLanguage="json"
              defaultValue={JSON.stringify(field.initialValue || field.defaultValue, null, '\t')}
              onChange={(val) => field.handleInputChange({
                id: `${field.schemaId}#${field.name}`,
                entity: field.entity,
                value: val ? JSON.parse(val) : null,
              })}
            />
          </Form.Item>
        )

      case SchemaColumnTypes.TAG:
        console.log("field.initialValue",field.initialValue);
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            labelCol={{ span: 24 }}>
            <TagInput 
              defaultValue={field.initialValue?field.initialValue.split(','): []}
              onChange={(val: Array<string>) => field.handleInputChange({
                id: `${field.schemaId}#${field.name}`,
                entity: field.entity,
                value: val ? val : null,
              })} />
          </Form.Item>
        )

      // ODN-2224 
      case SchemaColumnTypes.LOOKUP:
        if (field.schemaId && field.linkedSchemaAssociation) {
          return (
            <Form.Item
              key={field.id}
              name={field.name}
              label={field.label}
              labelCol={{ span: 24 }}>
                <LookUpInput
                  placeholder='type min 2 symbols for search'
                  initialtValue={field.initialValue ?? undefined}
                  initialRecordMetadataLink={field.initialRecordMetadataLink}
                  currentSchemaId={field.schemaId}
                  schemaAssociation={field.linkedSchemaAssociation}
                  onChange={(val: any) => field.handleInputChange({
                    id: `${field.schemaId}#${field.name}`,
                    entity: field.entity,
                    value: val ?? null,
                  })}
                />
            </Form.Item>
          )
        }
        break;

      default:
        return (<Form.Item
          key={field.id ? field.id.toString() : field.name}
          name={field.name}
          label={field.label}
          labelCol={{ span: 24 }}
          initialValue={field.initialValue}
          rules={[{ required: field.validators.map(elem => elem.type).includes(SchemaColumnValidatorEnums.REQUIRED) }]}
        >
          <Input
            type="text"
            disabled={field.isDisabled}
            defaultValue={field.defaultValue}
            placeholder={field.description}
            onChange={(e) => field.handleInputChange({
              id: `${field.schemaId}#${field.name}`,
              entity: field.entity,
              value: !!e.target.value ? e.target.value : null,
            })} />
        </Form.Item>);
    }
  }
}
