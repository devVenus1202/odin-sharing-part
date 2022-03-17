import { SchemaColumnEntity } from '../../../../schema/column/schema.column.entity';
import { DbRecordAssociationColumnEntity } from '../db.record.association.column.entity';
import { DbRecordAssociationColumnEntityTransformBase } from './db.record.association.column.entity.transform.base';

export class DbRecordAssociationColumnEntityTransform extends DbRecordAssociationColumnEntityTransformBase {

  public properties: { [key: string]: any };

  /**
   * Transform dbRecord column values
   * @param dbRecordColumns
   * @param schemaColumns
   */
  public static transform(
    dbRecordColumns: DbRecordAssociationColumnEntity[],
    schemaColumns: SchemaColumnEntity[],
  ): DbRecordAssociationColumnEntityTransform {

    let properties = {};
    if (!!schemaColumns) {
      for(let i = 0; i < schemaColumns.length; i++) {
        const schemaColumn = schemaColumns[i];
        const dbRecordColumn = dbRecordColumns.find(elem => elem.column.id === schemaColumn.id);
        // with the association columns we only want to return properties that have a value
        // this is because it overrides the default records properties and all values will be null

        if (dbRecordColumn) {
          properties = Object.assign({}, properties, { [schemaColumn.name]: dbRecordColumn.value });
        }
      }
    }
    return <DbRecordAssociationColumnEntityTransform>properties;
  }
}
