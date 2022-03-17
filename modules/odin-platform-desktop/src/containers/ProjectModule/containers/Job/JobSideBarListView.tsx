import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Col, Row, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import {
  addRecordToShortList,
  IAddRecordToShortList,
  updateRecordByIdRequest,
} from '../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../core/schemas/store/reducer';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import JobSideBarListCard from './JobSideBarListCard';


interface Props {
  title?: string,
  expandable?: any,
  moduleName: string,
  entityName: string,
  recordId: string,
  record?: DbRecordEntityTransform,
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  getSchema: any,
  updateRecord: any,
  getAssociations: any,
  shortListRecord: any,
  hidden?: string[],
  filters?: string[],
  isCreateHidden?: boolean,
}


class JobSideBarListView extends React.Component<Props> {

  componentDidMount() {
    this.getRecordAssociations();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    console.log(this.props.recordId)
    console.log(this.props.record)
    if (prevProps.recordId !== this.props.recordId && !this.props.recordAssociationReducer.isRequesting) {
      this.getRecordAssociations();
    }
  }

  private getRecordAssociations() {
    const { getAssociations, schemaReducer, getSchema, moduleName, entityName, recordId, filters } = this.props;
    if (recordId) {

      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);

      if (schema) {
        getAssociations({
          recordId: recordId,
          key: entityName,
          schema,
          entities: [ entityName ],
          filters,
        });

      } else {
        getSchema({ moduleName, entityName }, (result: SchemaEntity) => {
          getAssociations({
            recordId: recordId,
            key: entityName,
            schema: result,
            entities: [ entityName ],
            filters,
          });
        });
      }
    }
  }

  hasData() {
    const { recordId, entityName, recordAssociationReducer } = this.props;
    const associationKey = `${recordId}_${entityName}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];

    if (associationObj && associationObj[entityName] && associationObj[entityName].dbRecords)
      return true
    else
      return false

  }

  render() {
    const { recordId, entityName, recordAssociationReducer } = this.props;
    const associationKey = `${recordId}_${entityName}`
    const associationObj: any = recordAssociationReducer.shortList[associationKey]
    const data = associationObj && associationObj[entityName] && associationObj[entityName].dbRecords

    return (
      <div>
        {!this.hasData() &&
        <Row>
            <Col span={24} style={{textAlign:'center', padding:10}}>
              <Spin tip="Loading jobs..."/>
            </Col>
        </Row>
        }
        {data?.sort(
          (recA: DbRecordEntityTransform, recB: DbRecordEntityTransform) =>
            Number(getProperty(recA, 'Order')) -
            Number(getProperty(recB, 'Order')),
        )?.map((elem: DbRecordEntityTransform) => (
          <JobSideBarListCard result={elem} onClose={() => {
          }} globalCollapsed={true}/>
        ))}
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  shortListRecord: (params: IAddRecordToShortList) => dispatch(addRecordToShortList(params)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  updateRecord: (params: any, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
});

export default connect(mapState, mapDispatch)(JobSideBarListView);
