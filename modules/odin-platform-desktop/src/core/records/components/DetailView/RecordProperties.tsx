import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import {
  SchemaColumnOptionEntity,
} from '@d19n/models/dist/schema-manager/schema/column/option/schema.column.option.entity';
import { SchemaColumnEntity } from '@d19n/models/dist/schema-manager/schema/column/schema.column.entity';
import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { Descriptions, Empty, Tag } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { changeToCapitalCase } from '../../../../shared/utilities/dataTransformationHelpers';
import { splitModuleAndEntityName } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { SchemaReducerState } from '../../../schemas/store/reducer';

interface Props {
  schemaReducer: SchemaReducerState,
  record: DbRecordEntityTransform | undefined,
  columns?: number,
  columnLayout?: 'horizontal' | 'vertical'
}

class RecordProperties extends React.Component<Props> {

  renderListItemContent() {
    const { record, columns, columnLayout } = this.props;

    if (record && record.properties) {

      return <Descriptions column={columns || 4} layout={columnLayout || 'vertical'} size="small">
        {Object.keys(record?.properties).map(elem => (
          this.renderDescriptionItemSimple(elem, getProperty(record, elem, true))
        ))}
      </Descriptions>
    } else {
      return <Empty/>
    }
  }

  private renderDescriptionItemSimple(key: string, value: any) {

    /* We want to show coordinates for points, but exclude coordinates for lines and polygons (too long) */
    if (key !== 'Coordinates' || key === 'Coordinates' && value && value.split(',').length < 3) {
      return <Descriptions.Item key={key} label={changeToCapitalCase(key)}>{this.renderValue(
        key,
        value,
      )}</Descriptions.Item>
    }

  }

  private renderValue(key: string, value: any) {
    const { record, schemaReducer } = this.props;

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);

    if (schema) {

      const column = schema.columns.find((elem: SchemaColumnEntity) => elem.name === key);
      switch (column?.type) {

        case SchemaColumnTypes.JSON:
          return '';
          break;

        case SchemaColumnTypes.FILE_SINGLE:
          return <img style={{ height: 150, width: 150 }} src={value}/>;
          break;
        case SchemaColumnTypes.ENUM:
          // For enum values we want to show the label instead of the value
          const option = column.options.find((opt: SchemaColumnOptionEntity) => opt.value === value);

          if (option) {

            return option.label;

          } else {

            return value;

          }
        case SchemaColumnTypes.TAG:
          return (value ? <div>
            {value.split(',').map((tag: string) => <Tag>{tag}</Tag>)}
          </div> : null)

        case SchemaColumnTypes.LOOKUP:
          // ODN-2224 render linked record number and title instead of id
          const link = record?.links?.find(l => l.id === value);
          if (link) {
            const { moduleName, entityName } = splitModuleAndEntityName(link.entity)
            return <Link
              to={`/${moduleName}/${entityName}/${link?.id}`}>{`${link.recordNumber ? `${link.recordNumber} - ` : ''}${link.title || ''}`}</Link>
          } else {
            return value;
          }

        default:
          return value;

      }
    }

    return value;
  }

  render() {
    return (
      this.renderListItemContent()
    )
  }

}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
});


export default connect(mapState)(RecordProperties);
