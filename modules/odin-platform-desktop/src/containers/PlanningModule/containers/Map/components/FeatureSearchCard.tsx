import { SearchOutlined } from '@ant-design/icons';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { Button, Card, Input, Select } from 'antd';
import React from 'react';
import { isMobile } from 'react-device-detect';
import { connect } from 'react-redux';
import { MapReducerUpdate, MapSearch, setMapSearchQuery, updateMapState } from '../../../../../core/gis/store/actions';
import { MapReducer } from '../../../../../core/gis/store/reducer';
import { ISearchRecords, resetRecordsList, searchRecordsRequest } from '../../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { httpGet } from '../../../../../shared/http/requests';
import { displayMessage, goCardlessErrorMessage } from '../../../../../shared/system/messages/store/reducers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';

const { PROJECT_MODULE } = SchemaModuleTypeEnums;
const { FEATURE, PROJECT } = SchemaModuleEntityTypeEnums;
const { Search } = Input;

interface Props {
  mapReducer: MapReducer,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  updateMap: (params: MapReducerUpdate) => {},
  searchMap: (params: MapSearch) => {}
  resetSearchMap: any,
  searchRecords: any,
  alertMessage: any,
  goCardlessErrorMessage: any
}


interface State {
}

class FeatureSearchCard extends React.Component<Props, State> {

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {

    if (prevProps.mapReducer.queries !== this.props.mapReducer.queries) {
      this.fetchData()
    }

    if (prevProps.recordReducer.isSearching !== this.props.recordReducer.isSearching) {
      const schema = getSchemaFromShortListByModuleAndEntity(
        this.props.schemaReducer.shortList,
        PROJECT_MODULE,
        FEATURE,
      )
      if (schema && this.props.recordReducer.isSearching) {
        if (this.props.recordReducer.list[schema.id] && this.props.recordReducer.list[schema.id].length < 1) {
          // this.handleGisSearch()
        }
      }
    }
  }


  fetchData() {

    const { schemaReducer, searchRecords, mapReducer } = this.props;

    let query: any = mapReducer.queries
    let schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, PROJECT_MODULE, FEATURE)

    if (mapReducer.queryLayer === 'polygon') {
      schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, PROJECT_MODULE, PROJECT)
      query = {
        'must': [
          {
            'query_string': {
              'fields': [ 'properties.ExternalRef' ],
              'query': mapReducer.searchTerms,
              'default_operator': 'AND',
              'lenient': true,
              'analyze_wildcard': true,
              'boost': 1,
            },
          },
        ], 'must_not': [], 'should': [], 'filter': [],
      }
    }


    if (schema) {
      searchRecords({
        schema: schema,
        searchQuery: {
          terms: null,
          fields: null,
          schemas: schema.id,
          sort: [ { schemaPosition: { order: 'desc' } } ],
          boolean: query,
        },
      })
    }
  }

  handleAddFeatureMenuClick(LayerName: string) {
    const { updateMap } = this.props;

    updateMap({
      queryLayer: LayerName,
    })

  }

  clearSearch() {

    const { updateMap, resetSearchMap, mapReducer } = this.props;

    const { map } = mapReducer;

    if (map) {

      map?.getLayers().forEach((layer: any) => {

        if (layer) {

          if (layer.className_ === 'feature_by_id_layer') {
            map.removeLayer(layer);

            console.log('CLEAR_SEARCH_1', map?.getLayers());
            console.log('CLEAR_SEARCH_2', map?.getLayers().getLength());
            console.log('CLEAR_SEARCH_3', map?.getLayers().pop());
          }

          if (layer.className_ === 'feature_by_id_vector_circle') {
            map.removeLayer(layer);
          }

        }

      });
    }

    resetSearchMap()

    updateMap({
      map,
      drawEnabled: false,
      query: undefined,
      queryLayer: undefined,
    })


  }

  handleMapSearch(searchQuery: any) {

    const { mapReducer, searchMap } = this.props;

    this.handleGisSearch(searchQuery);

    searchMap({
      featureIds: searchQuery,
    })

  }

  async handlePostcodeSearch(searchQuery: any) {
    const { updateMap, goCardlessErrorMessage } = this.props;

    // API call to get a polygon id by post code
    await httpGet(`ProjectModule/v1.0/ftth/polygon/byPostcode/${searchQuery.toUpperCase()}`).then(({ data }) => {
      if (data.data) {
        console.log('data', data.data)
        const exPolygon = data.data.find((elem: { id: number, name: string; }) => elem.name === 'EX')
        const l1Polygon = data.data.find((elem: { id: number, name: string; }) => elem.name === 'L1')
        const l2Polygon = data.data.find((elem: { id: number, name: string; }) => elem.name === 'L2')
        const l3Polygon = data.data.find((elem: { id: number, name: string; }) => elem.name === 'L3')
        const l4Polygon = data.data.find((elem: { id: number, name: string; }) => elem.name === 'L4')
        // we want to find any of the 5 polygons and search in order by smallest to largest
        updateMap({
          queryLayer: 'polygon',
          query: `type=polygon&featureId=${l4Polygon?.id || l3Polygon?.id || l2Polygon?.id || l1Polygon?.id || exPolygon?.id}`,
        })
      }
    }).catch(err => goCardlessErrorMessage(err));

  }

  async handleNoiRefSearch(searchQuery: any) {
    const { updateMap, searchMap, goCardlessErrorMessage } = this.props;
    // API call to get a polygon id by post code
    await httpGet(`ProjectModule/v1.0/ftth/cables/byNoiRef/${searchQuery.toUpperCase()}`).then(({ data }) => {
      if (data.data) {

        searchMap({
          featureIds: data.data.map((elem: { id: any; }) => elem.id).join(),
        })

        updateMap({
          queryLayer: 'cable',
          query: `type=cable&featureId=${data.data.map((elem: { id: any; }) => elem.id).join()}&noiRef=${searchQuery}`,
        })
      }
    }).catch(err => goCardlessErrorMessage(err));

  }

  // When no data is returned from the handleMapSearch in Odin
  handleGisSearch(searchQuery: string) {

    const { updateMap, mapReducer } = this.props;
    const { queryLayer, searchTerms } = mapReducer;

    updateMap({
      query: `type=${queryLayer}&featureId=${searchQuery}`,
    })

  }


  render() {

    const { mapReducer, schemaReducer, recordReducer } = this.props;
    const { queryLayer } = mapReducer;
    const { Option } = Select;
    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, PROJECT_MODULE, FEATURE);

    let SearchFeatures = schema?.types?.map((type: SchemaTypeEntity) =>
      <Option key={type.name} value={type.name.toLowerCase()}>{type.name.toLowerCase()}</Option>,
    )

    return (
      <div>
        <Card size="small"
              title={<span><SearchOutlined style={{ marginRight: '5px' }}/>Search Features</span>}
              extra={
                <Button
                  danger
                  ghost
                  onClick={() => this.clearSearch()}
                >
                  {isMobile ? 'Clear' : 'Clear Search'}
                </Button>
              }
        >
          <Search
            style={{ marginBottom: 8 }}
            placeholder="Postcode"
            onPressEnter={(e: any) => this.handlePostcodeSearch(e.target.value)}
            onSearch={(e: any) => this.handlePostcodeSearch(e)}
          />

          <Search
            style={{ marginBottom: 8 }}
            placeholder="NOI Ref"
            onPressEnter={(e: any) => this.handleNoiRefSearch(e.target.value)}
            onSearch={(e: any) => this.handleNoiRefSearch(e)}
          />

          <Search
            style={{ marginBottom: 8 }}
            disabled={!queryLayer}
            loading={recordReducer.isSearching}
            placeholder="Feature ID"
            onPressEnter={(e: any) => this.handleMapSearch(e.target.value)}
            onSearch={(value: any, event: any) => this.handleMapSearch(value)}
          />

          <Select
            placeholder="Select Feature"
            value={mapReducer.queryLayer}
            onChange={(e) => {
              this.handleAddFeatureMenuClick(e.toString())
            }}
            style={{ width: '100%', marginTop: '10px' }}>
            {SearchFeatures}
          </Select>

        </Card>
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  mapReducer: state.mapReducer,
});

const mapDispatch = (dispatch: any) => ({
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  updateMap: (params: MapReducerUpdate) => dispatch(updateMapState(params)),
  searchMap: (params: MapSearch) => dispatch(setMapSearchQuery(params)),
  resetSearchMap: () => dispatch(resetRecordsList()),
  goCardlessErrorMessage: (params: any) => dispatch(goCardlessErrorMessage(params)),
});

export default connect(mapState, mapDispatch)(FeatureSearchCard);
