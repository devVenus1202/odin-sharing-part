import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Button, Card, Col, Row, Spin, Table } from 'antd';
import Search from 'antd/es/input/Search';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ISearchRecords,
  searchRecordsRequest,
  setDbRecordSearchQuery,
} from '../../../../../core/records/store/actions';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../../core/schemas/store/actions';
import { closureTypes } from '../../../../PlanningModule/containers/Map/helpers';
import './index.scss'

type Props = {
  schemaReducer: any,
  recordReducer: any,
  setSearchQuery: any,
  searchRecords: any,
  getSchema: any,
  moduleName: string,
  entityName: string,
  featureIds: Array<number>
}

const FeatureListWithActions = (props: Props) => {

  const { moduleName, entityName, featureIds, searchRecords, getSchema, recordReducer } = props

  const [ featureList, setFeatureList ] = useState<Array<DbRecordEntityTransform>>([])
  const [ schemaId, setSchemaId ] = useState<string | undefined>(undefined)
  const [ filterQuery, setFilterQuery ] = useState<string>('')

  useEffect(() => {
    if (schemaId && recordReducer.list)
      setFeatureList(recordReducer.list[schemaId])
  }, [ recordReducer.list ]);


  useEffect(() => {

    getSchema({ moduleName: moduleName, entityName: entityName }, (result: SchemaEntity) => {

      if (result) {
        setSchemaId(result.id)
        searchRecords({
          schema: result,
          searchQuery: {
            terms: featureIds.join(' OR '),
            fields: 'properties.ExternalRef',
            schemas: result.id,
            sort: null,
          },
        })
      }
    })

  }, [ featureIds ])

  const getFeatureType = (feature: DbRecordEntityTransform) => {

    if (feature)
      switch (feature.type) {
        case 'CLOSURE':
          return closureTypes[Number(getProperty(feature, 'ClosureType'))]
        case 'POLYGON':
          return getProperty(feature, 'PolygonType')
        default:
          return '-'
      }

  }

  const getTableData = (features: Array<DbRecordEntityTransform>, filterQuery?: string) => {

    let tableData: Array<any> = []

    const allFeatures = features.map((feature: DbRecordEntityTransform) => ({
      key: feature.id,
      id: feature.id,
      recordNumber: feature.recordNumber,
      feature: feature.type,
      externalRef: getProperty(feature, 'ExternalRef'),
      featureType: getFeatureType(feature),
      exPolygonId: getProperty(feature, 'ExPolygonId'),
      L1PolygonId: getProperty(feature, 'L1PolygonId'),
      L2PolygonId: getProperty(feature, 'L2PolygonId'),
    }))


    /* If there is a search filter query, find all query occurrences in each feature */
    if (filterQuery && filterQuery.length) {

      allFeatures.forEach((feature: any) => {
        let hits = 0

        Object.values(feature).map((value: any) => {
          console.log('value', value)
          if (value && value !== 'key' && value !== 'id' && String(value).indexOf(filterQuery) > -1)
            hits++
        })

        if (hits > 0)
          tableData.push(feature)
      })


    } else
      tableData = allFeatures

    return tableData

  }

  const columns = [
    {
      title: 'Feature',
      dataIndex: 'feature',
      key: 'feature',
    },
    {
      title: 'Record Number',
      dataIndex: 'recordNumber',
      key: 'record_number',
    },
    {
      title: 'Type',
      dataIndex: 'featureType',
      key: 'featureType',
    },
    {
      title: 'External Ref',
      dataIndex: 'externalRef',
      key: 'externalRef',
      filterSearch: true,
    },
    {
      title: 'EX Polygon id',
      dataIndex: 'exPolygonId',
      key: 'exPolygonId',
    },
    {
      title: 'L1 Polygon id',
      dataIndex: 'L1PolygonId',
      key: 'L1PolygonId',
    },
    {
      title: 'L2 Polygon id',
      dataIndex: 'L2PolygonId',
      key: 'L2PolygonId',
    },
    {
      title: 'Actions',
      dataIndex: '',
      key: 'x',
      align: 'right' as 'right',
      render: (data: any) => [
        <Link target="_blank"
              to={`/ProjectModule/Map/${data.feature}/${data.externalRef}`}>
          <Button ghost size="small" type="primary" style={{ marginRight: '8px' }}>View in Map</Button>
        </Link>,
        <Link target="_blank"
              to={`/ProjectModule/Feature/${data.id}`}>
          <Button ghost size="small" type="primary">View Record</Button>
        </Link>,
      ],
    },
  ]

  return (
    <Row>
      <Col span={24} style={{ textAlign: 'center' }}>
        <Card
          className="featureListTableCard"
          title={
            <Row>
              <Col span={19} style={{ textAlign: 'left', paddingTop: '5px' }}>
                <span>Feature list</span>
              </Col>
              <Col span={5} style={{ textAlign: 'right' }}>
                <Search
                  disabled={recordReducer.isSearching || !featureList}
                  placeholder="Quick Search"
                  style={{ width: 'auto' }}
                  allowClear
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </Col>
            </Row>
          }>
          {
            featureList && !recordReducer.isSearching ?
              <Table size="small" dataSource={getTableData(featureList, filterQuery)} columns={columns}/>
              :
              <Spin size="large" style={{ padding: '100px' }}/>
          }
        </Card>
      </Col>
    </Row>
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

export default connect(mapState, mapDispatch)(FeatureListWithActions)
