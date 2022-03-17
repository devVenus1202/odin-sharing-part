import { SearchOutlined, DeleteOutlined, ArrowsAltOutlined, ShrinkOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Drawer, Input, Row, Spin, Typography } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { QueryBuilderReducer } from '../../core/records/components/DynamicTable/QueryBuilder/store/reducer';
import { TableReducer } from '../../core/records/components/DynamicTable/store/reducer';
import {
  ISearchRecords,
  resetRecordsList,
  searchRecordsRequest,
  setDbRecordSearchQuery,
  toggleSearchVisibility,
} from '../../core/records/store/actions';
import { IRecordReducer } from '../../core/records/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../core/schemas/store/actions';
import { SchemaReducerState } from '../../core/schemas/store/reducer';
import { getRecordListFromShortListById, splitModuleAndEntityName } from '../../shared/utilities/recordHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../shared/utilities/schemaHelpers';
import { getDefaultFields } from '../../shared/utilities/searchHelpers';
import './index.scss'
import SearchResult from './SearchResult'

const { Search } = Input;

interface Props {
  entities: string[],
  schema: any,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  queryBuilderReducer: QueryBuilderReducer,
  navigationReducer: any,
  searchRecords: any,
  toggleSearchVisibility: any,
  resetRecordState: any,
  setSearchQuery: any,
  getSchema: any,
  renderStyle: string
}

interface State {
  collapsed: boolean
}

class PowerSearch extends React.Component<Props, State> {
  private inputRef: React.RefObject<Input>

  constructor(props: Props) {
    super(props)
    this.inputRef = React.createRef()
    this.state = {
      collapsed: false
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {

    if (prevProps.recordReducer.isSearchVisible !== this.props.recordReducer.isSearchVisible) {
      this.loadSchemas();
    }

    if (prevProps.navigationReducer.routingStructure !== this.props.navigationReducer.routingStructure) {
      this.loadSchemas();
    }
  }

  loadSchemas() {
    const { getSchema, entities, navigationReducer } = this.props;

    /* Get all schemas and modules from routingStructure, filter what can be accessed. */
    if (navigationReducer.routingStructure) {

      for (const entity of entities) {
        const { moduleName, entityName } = splitModuleAndEntityName(entity)
        const routingModule = navigationReducer.routingStructure.find((module: any) => module.moduleName === moduleName)

        if (routingModule)
          routingModule.entities.map((entity: any) =>
            entity === entityName ? getSchema({ moduleName, entityName, withAssociations: true }) : {}
          )
      }
    }

  }

  searchRecordOnChange(e: any) {
    const { schema, schemaReducer, searchRecords, entities } = this.props;

    let schemaIds
    for (const entity of entities) {
      const { moduleName, entityName } = splitModuleAndEntityName(entity)
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName)

      if (schema && schema.id && schemaIds) {
        schemaIds = schemaIds.concat(`,${schema.id}`)
      } else if (schema) {
        schemaIds = schema.id
      }
    }

    if (schemaIds) {

      searchRecords({
        schema: schema,
        searchQuery: {
          terms: e,
          fields: getDefaultFields(schema, schema.moduleName, schema.entityName),
          schemas: schemaIds,
          sort: [ { schemaPosition: { order: 'desc' } } ],
        },
      })
    }
  }

  renderResults() {
    const { recordReducer, schema } = this.props
    let searchResults: any[] = []

    if (recordReducer.list && schema && schema.id) {
      const list = getRecordListFromShortListById(recordReducer.list, schema.id)

      if (list) {
        console.log('%cSearch results:', 'color:limegreen', list)
        searchResults.push(...list)
      }
    }

    if (recordReducer.isSearching) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '20px',
          }}
        >
          <Spin tip="Searching..." size="large"/>
        </div>
      )
    }

    if (searchResults && searchResults.length > 0) {
      searchResults = searchResults.map((result: any) => (
        <SearchResult
          key={result.id}
          entityName={result.entity.split(':')[1]}
          searchResult={result}
          onClose={this.onClose}
          globalCollapsed={this.state.collapsed}
        />
      ))
    }

    return searchResults
  }

  setFocus = (isOpen: any) => {
    isOpen && this.inputRef.current!.focus()
  }

  onClose = () => {
    if (this.props.renderStyle === 'drawer') this.props.toggleSearchVisibility()
    this.setState({ collapsed: false })
  }

  clearSearchResults = () => {
    this.props.resetRecordState()
    this.inputRef.current!.setValue('')
    this.inputRef.current!.focus()
  }

  toggleGlobalCollapse = () => {
    this.setState({ collapsed: !this.state.collapsed })
  }


  renderSearchBody(searchContainer: string) {

    const { recordReducer, navigationReducer } = this.props;

    const checkIfSearchResultsPresent = () => {
      if (searchContainer === 'card')
        return !!recordReducer.list.GLOBAL_SEARCH_CARD
      else if (searchContainer === 'drawer')
        return !!recordReducer.list.GLOBAL_SEARCH_DRAWER
      else
        return false
    }

    return <Row>
      <Col span={24}>
        <Search
          size="large"
          placeholder="Search Email / Phone / Address"
          disabled={!navigationReducer.routingStructure}
          autoFocus
          allowClear
          loading={recordReducer.isSearching}
          onChange={(e: any) => this.searchRecordOnChange(e.target.value)}
          onSearch={(e) => this.searchRecordOnChange(e)}
          ref={this.inputRef}
        />
      </Col>

      <Col span={12} style={{ marginTop: '12px', textAlign: 'left' }}>
        <Button
          type="primary"
          style={{ width: '98%' }}
          disabled={!checkIfSearchResultsPresent()}
          size="small"
          icon={<DeleteOutlined/>}
          onClick={() => {
            this.clearSearchResults()
          }}
          ghost>
          Clear Results
        </Button>
      </Col>

      <Col span={12} style={{ marginTop: '12px', textAlign: 'right' }}>
        <Button
          type="primary"
          style={{ width: '98%' }}
          disabled={!checkIfSearchResultsPresent()}
          icon={this.state.collapsed ? <ShrinkOutlined/> : <ArrowsAltOutlined/>}
          size="small"
          onClick={() => {
            this.toggleGlobalCollapse()
          }}
          ghost>
          {this.state.collapsed ? 'Collapse Results' : 'Expand Results'}
        </Button>
      </Col>

      <Col span={24}>
        <div style={{ marginTop: '16px' }}>
          {
            checkIfSearchResultsPresent() || recordReducer.isSearching ? this.renderResults()
              :
              <Row style={{ color: '#afafaf', padding: '25px', textAlign: 'center' }}>
                <Col span={24}>
                  <SearchOutlined style={{ fontSize: '2em', marginBottom: '25px' }}/>
                </Col>
                <Col span={24}>
                  <span style={{ fontSize: '1.12em' }}>Search can work on any page no matter where you are. Search for an Order, Customer, Address, Support Ticket, Product, Invoice, and much more.</span>
                </Col>
              </Row>
          }
        </div>
      </Col>

    </Row>
  }

  render() {

    const { recordReducer, renderStyle } = this.props;

    /* Use in antd Drawer */
    if (renderStyle === 'drawer') {
      return (
        <Drawer
          title={<Typography.Title level={4} style={{ marginBottom: '0' }}>Search</Typography.Title>}
          placement='right'
          closable
          onClose={() => this.onClose()}
          visible={recordReducer.isSearchVisible}
          key={1}
          width="400"
          afterVisibleChange={this.setFocus}
        >
          {this.renderSearchBody('drawer')}
        </Drawer>
      )
    }
    /* Use in antd Card */
    else {
      return this.renderSearchBody('card')
    }
  }
}

const mapState = (state: any) => ({
  recordTableReducer: state.recordTableReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
  navigationReducer: state.navigationReducer
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (params: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(params)),
  setSearchQuery: (params: ISearchRecords) => dispatch(setDbRecordSearchQuery(params)),
  searchRecords: (params: ISearchRecords) => dispatch(searchRecordsRequest(params)),
  resetRecordState: () => dispatch(resetRecordsList()),
  toggleSearchVisibility: () => dispatch(toggleSearchVisibility()),
});

export default connect(mapState, mapDispatch)(PowerSearch)
