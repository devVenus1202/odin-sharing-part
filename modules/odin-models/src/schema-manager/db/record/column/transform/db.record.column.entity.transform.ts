import { SchemaColumnEntity } from '../../../../schema/column/schema.column.entity';
import { SchemaColumnTypes } from '../../../../schema/column/types/schema.column.types';
import { DbRecordColumnEntity } from '../db.record.column.entity';
import { DbRecordColumnEntityTransformBase } from './db.record.column.entity.transform.base';
import dayjs from 'dayjs';

export class DbRecordColumnEntityTransform extends DbRecordColumnEntityTransformBase {

  public properties: { [key: string]: any };
  public formattedProperties: { [key: string]: any };

  /**
   * Sort columns alphabetically
   * @param schemaColumns
   * @private
   */
  private static sortAlphabetically(schemaColumns: SchemaColumnEntity[]): SchemaColumnEntity[] {
    return schemaColumns.sort(function (a, b) {
      const nameA = a.name.toLowerCase(); // ignore case
      const nameB = b.name.toLowerCase(); // ignore case
      if (nameA < nameB) {
        return -1; //nameA comes first
      }
      if (nameA > nameB) {
        return 1; // nameB comes first
      }
      return 0;  // names must be equal
    });
  }


  /**
   * Transform dbRecord column values
   * @param dbRecordColumns
   * @param schemaColumns
   */
  public static transform(
    dbRecordColumns: DbRecordColumnEntity[],
    schemaColumns: SchemaColumnEntity[],
  ) {

    let properties = {};
    let formattedProperties = {};

    if (!!schemaColumns) {

      const sortedColumns = DbRecordColumnEntityTransform.sortAlphabetically(schemaColumns);

      for(let i = 0; i < sortedColumns.length; i++) {

        const schemaColumn = sortedColumns[i];

        const dbRecordColumn = dbRecordColumns.find(elem => elem.column && elem.column.id === schemaColumn.id);

        let value: string | number | boolean | null = dbRecordColumn ? dbRecordColumn.value : null;

        // Transform data structures from TEXT to the property type
        if (schemaColumn?.type === SchemaColumnTypes.JSON && value) {
          value = JSON.parse(value)
        }

        if (schemaColumn?.type === SchemaColumnTypes.NUMBER && value) {
          value = Number(value)
        }

        if (schemaColumn?.type === SchemaColumnTypes.NUMBER && value) {
          value = Number(value)
        }

        if (schemaColumn?.type === SchemaColumnTypes.CURRENCY && value) {
          if (!isNaN(Number(value))) {
            value = Number(value).toFixed(2);
          } else {
            value = 0;
          }
        }

        if (schemaColumn?.type === SchemaColumnTypes.PERCENT && value) {
          if (!isNaN(Number(value))) {
            value = Number(value).toFixed(2);
          } else {
            value = 0;
          }
        }

        properties = Object.assign({}, properties, { [schemaColumn.name]: value });

        if (schemaColumn?.format && value && typeof(value) === 'string' && (schemaColumn?.type === SchemaColumnTypes.DATE || schemaColumn?.type === SchemaColumnTypes.DATE_TIME)) {
          const valueDate = dayjs(value);
          const formattedValue = valueDate.isValid() ? valueDate.format(schemaColumn.format) : undefined;
          formattedProperties = Object.assign({}, formattedProperties, { [schemaColumn.name]: formattedValue });
        }

      }
    }
    return { properties, formattedProperties };
  }
}
