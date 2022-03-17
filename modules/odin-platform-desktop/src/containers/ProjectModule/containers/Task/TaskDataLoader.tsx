import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { ISearchRecords, searchRecordsRequest, setDbRecordSearchQuery } from '../../../../core/records/store/actions';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../core/schemas/store/actions';
import TaskSideBarListView from './TaskSideBarListView';

type Props = {
  moduleName: string,
  entityName: string,
  taskUniqueRef: string,
  schemaReducer: any,
  recordReducer: any,
  setSearchQuery: any,
  searchRecords: any,
  getSchema: any,
  setSelectedTask:any
}


const TaskDataLoader = (props: Props) => {

  const { moduleName, entityName, taskUniqueRef, searchRecords, getSchema, recordReducer, setSelectedTask } = props
  const [ featureList, setFeatureList ] = useState<Array<DbRecordEntityTransform>>([])
  const [ schemaId, setSchemaId ] = useState<string | undefined>(undefined)
  const [updatingData, setUpdatingData] = useState<boolean>(false)

  useEffect(() => {
    if (schemaId && recordReducer.list)
      setFeatureList(recordReducer.list[schemaId])
      setUpdatingData(false)
  }, [ recordReducer.list ]);


  useEffect(() => {


    getSchema({ moduleName: moduleName, entityName: entityName }, (result: SchemaEntity) => {

      if (result) {
        setUpdatingData(true)
        setSchemaId(result.id)
        searchRecords({
          schema: result,
          searchQuery: {
            terms: taskUniqueRef,
            fields: 'properties.UniqueRef',
            schemas: result.id,
            sort: null,
          },
        })
      }
    })

  }, [ taskUniqueRef ])

  return (
    <div>
      <TaskSideBarListView
        setSelectedTask={setSelectedTask}
        title={'Tasks'}
        moduleName={'ProjectModule'}
        entityName={'Task'}
        record={featureList[0]}
        updatingData={updatingData}
      />
    </div>
  )

}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
})

const mapDispatch = (dispatch: any) => ({
  setSearchQuery: (params: ISearchRecords) => dispatch(setDbRecordSearchQuery(params)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
})

export default connect(mapState, mapDispatch)(TaskDataLoader)
