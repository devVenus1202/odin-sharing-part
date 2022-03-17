import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import React from 'react';
import AssociationDataTable from '../components/AssociationDataTable/DataTable';


export function renderDynamicAssociations(record: DbRecordEntityTransform, relatedSchemas: SchemaEntity[]) {
  const obj = {};

  if(record && relatedSchemas) {

    for(const schema of relatedSchemas) {
      // @ts-ignore
      obj[schema.entityName] =
        <AssociationDataTable
          title={schema.entityName}
          record={record}
          moduleName={schema.moduleName}
          entityName={schema.entityName}/>;
    }
  }
  return obj;
}
