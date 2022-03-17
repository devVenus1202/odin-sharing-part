import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Layout, Row } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import ActivityFeed from '../../../core/records/components/ActivityFeed';
import DetailPanelLeft from '../../../core/records/components/DetailPanelLeft';
import RecordProperties from '../../../core/records/components/DetailView/RecordProperties';
import Pipeline from '../../../core/records/components/Pipeline/Pipeline';
import { IRecordReducer } from '../../../core/records/store/reducer';
import AssociationDataTable from '../../../core/recordsAssociations/components/AssociationDataTable/DataTable';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../core/recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../core/schemas/store/reducer';
import CardWithTabs from '../../../shared/components/CardWithTabs';
import { renderCreateUpdateDetails } from '../../../shared/components/RecordCreateUpdateDetails';
import { isSystemAdmin } from '../../../shared/permissions/rbacRules';
import {
  getAllSchemaAssociationSchemas,
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../../shared/utilities/recordHelpers';
import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../../shared/utilities/schemaHelpers';


type PathParams = {

  recordId: string

}

type PropsType = RouteComponentProps<PathParams> & {

  match: any
  userReducer: any
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  hasColumnMappings?: boolean
  excludeRelations?: string[]
  visibleProperties?: string[]
  relatedProduct?: boolean,
  getAssociations: any
}

interface IState {
  disableRelatedProductEdit: boolean
}

const { NOTE, PRODUCT, ORDER_ITEM } = SchemaModuleEntityTypeEnums;

const { PRODUCT_MODULE } = SchemaModuleTypeEnums;

class ProductDetailView extends React.Component<PropsType, IState> {

  constructor(props: PropsType) {
    super(props);
    this.state = {
      disableRelatedProductEdit: false,
    };
  }

  componentDidMount() {
    this.initializeProductData();
  }

  private initializeProductData() {
    const { relatedProduct, schemaReducer, getAssociations, match } = this.props
    // check if the product is related product
    if (relatedProduct) {
      const recordId = match.params.recordId
      const productSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, PRODUCT_MODULE, PRODUCT);
      // get record associations with order items and offers
      getAssociations({
        recordId: recordId,
        key: PRODUCT,
        schema: productSchema,
        entities: [ ORDER_ITEM ],
      }, (res: any) => {
        const orderItemRelation = res?.results?.[ORDER_ITEM]?.dbRecords;
        if (orderItemRelation) {
          this.setState({
            disableRelatedProductEdit: true,
          })
        } else {
          this.setState({
            disableRelatedProductEdit: false,
          })
        }
      });
    }
  }

  renderDynamicAssociations(record: DbRecordEntityTransform, relatedSchemas: SchemaEntity[]) {
    const { userReducer } = this.props;
    const obj = {};
    for(const schema of relatedSchemas) {
      // @ts-ignore
      obj[schema.entityName] =
        <AssociationDataTable
          title={schema.entityName}
          record={record}
          moduleName={schema.moduleName}
          entityName={schema.entityName}
          disableRelatedProductEdit={isSystemAdmin(userReducer) ? false : this.state.disableRelatedProductEdit}/>;
    }

    return obj;
  }


  render() {

    const { recordAssociationReducer, schemaReducer, hasColumnMappings, recordReducer, match, visibleProperties, excludeRelations, userReducer } = this.props;

    let record;

    if (hasColumnMappings) {
      record = getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        match.params.dbRecordAssociationId,
        match.params.recordId,
      );
    } else {
      record = getRecordFromShortListById(recordReducer.shortList, match.params.recordId);
    }

    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      excludeRelations ? [ NOTE, ...excludeRelations ] : [ NOTE ],
    );

    return (
      <Layout className="record-detail-view">
        <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>

          <Col xs={24} sm={24} md={24} lg={6}>
            <div className="record-detail-left-panel">
              <DetailPanelLeft
                disableRelatedProductEdit={isSystemAdmin(userReducer) ? false : this.state.disableRelatedProductEdit}
                hasColumnMappings={hasColumnMappings}
                visibleProperties={visibleProperties}
                record={record}>
                <RecordProperties columns={1} columnLayout="horizontal" record={record}/>
                {renderCreateUpdateDetails(record)}
              </DetailPanelLeft>
            </div>
          </Col>

          <Col xs={24} sm={24} md={24} lg={18}>
            <div className="record-detail-left-panel">
              {record?.stage &&
              <Pipeline className="record-pipeline" record={record}/>
              }

              <CardWithTabs
                title="Options"
                defaultTabKey="Restriction"
                tabList={[
                  ...relatedSchemas.map((elem: SchemaEntity) => ({
                    key: elem.entityName,
                    tab: elem.entityName,
                  })),
                  {
                    key: 'Activity',
                    tab: 'Activity',
                  },
                ]}
                contentList={{
                  ...this.renderDynamicAssociations(record, relatedSchemas),
                  Activity: <ActivityFeed/>,
                }}
              />
            </div>
          </Col>
        </Row>
      </Layout>)
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  getAssociations: (params: IGetRecordAssociations, db: any) => dispatch(getRecordAssociationsRequest(params, db)),
});


export default withRouter(connect(mapState, mapDispatch)(ProductDetailView));
