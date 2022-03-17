/**
 *
 * @param colName
 * @param entityName
 */
export const getDataIndexForRelatedRecord = (colName: string, entityName: string) => {
  return colName ? `${entityName}.dbRecords.properties.${colName}` : ''
}


export const getDataIndexForRelatedRecordField = (colName: string, entityName: string) => {
  if (colName === 'stage') {
    // ODN-1524 adds special data index for related entity stage column
    return `${entityName}.dbRecords.stage.name`;  
  }
  return colName ? `${entityName}.dbRecords.${colName}` : ''
}

