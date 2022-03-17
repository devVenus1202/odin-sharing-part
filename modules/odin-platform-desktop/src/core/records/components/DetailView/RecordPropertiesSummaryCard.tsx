import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaColumnEntity } from '@d19n/models/dist/schema-manager/schema/column/schema.column.entity';
import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { Collapse, Descriptions, Divider, Typography } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { parseDateToLocalFormat } from '../../../../shared/utilities/dateHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { SchemaReducerState } from '../../../schemas/store/reducer';

const { Panel } = Collapse;

interface Props {
  schemaReducer: SchemaReducerState,
  record: DbRecordEntityTransform | undefined,
  columns?: number,
}

class RecordPropertiesSummaryCard extends React.Component<Props> {

  renderListItemContent() {
    const { record, columns } = this.props;
    if(record) {
      return (
        <>
          <div>
            <Collapse defaultActiveKey={[]} ghost>
              <Panel header="view more" key="1">
                <Descriptions column={columns || 1} layout="horizontal" size="small">
                  {Object.keys(record.properties).map((elem, index) => (
                    index > 3 && this.renderDescriptionItemSimple(elem, getProperty(record, elem, true))
                  ))}
                </Descriptions>
              </Panel>
            </Collapse>

            <Divider/>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text>last
                modified: {record && record.lastModifiedBy ? record.lastModifiedBy.fullName : ''}</Typography.Text>
              <Typography.Text>created: {parseDateToLocalFormat(record.createdAt)}</Typography.Text>
            </div>
          </div>
        </>
      )
    }
  }

  private renderDescriptionItemSimple(key: string, value: any) {
    let renderValue = value;

    // ODN-2224 render linked record number and title instead of id
    const { record, schemaReducer } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    if (schema) {
      const column = schema.columns.find((elem: SchemaColumnEntity) => elem.name === key);
      if (column && column.type === SchemaColumnTypes.LOOKUP) {
        const link = record?.links?.find(l => l.id === value);
        if (link) renderValue = `${link.recordNumber ? `${link.recordNumber} - ` : ''}${link.title || ''}`;
      }
    }

    if (renderValue) {
      return <Descriptions.Item key={key} label={key}>{renderValue}</Descriptions.Item>
    }
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


export default connect(mapState)(RecordPropertiesSummaryCard);
