import { RelationTypeEnum } from '@d19n/models/dist/schema-manager/db/record/association/types/db.record.association.constants';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { Col, Row, Spin, Tree } from 'antd';
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
import "./styles.scss"


interface Props {
  title?: string,
  expandable?: any,
  moduleName: string,
  entityName: string,
  record: DbRecordEntityTransform | undefined,
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
  setSelectedTask: any,
  updatingData: boolean,
}



class TaskSideBarListView extends React.Component<Props> {


  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    if (prevProps.record?.id !== this.props.record?.id && !this.props.recordAssociationReducer.isRequesting) {
      this.getRecordAssociations()
    }
  }

  private getRecordAssociations() {
    const { getAssociations, schemaReducer, getSchema, moduleName, entityName, record, filters } = this.props;
    if (record) {
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
      if (schema) {
        getAssociations({
          recordId: record?.id,
          key: entityName,
          schema,
          entities: [ entityName ],
          filters,
        });
      } else {
        getSchema({ moduleName, entityName }, (result: SchemaEntity) => {
          getAssociations({
            recordId: record?.id,
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
    const { record, entityName, recordAssociationReducer } = this.props
    const associationKey = `${record?.id}_${entityName}`
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    if (associationObj && associationObj[entityName] && associationObj[entityName].dbRecords) {
      return true
    } else {
      return false
    }
  }


  generateTree = (data: DbRecordEntityTransform[]) => {

    const { record, setSelectedTask } = this.props

    if (record) {

      let tree: {
        parent: DbRecordEntityTransform | undefined,
        root: DbRecordEntityTransform,
        children: DbRecordEntityTransform[]
      } = {
        parent: undefined,
        root: record,
        children: [],
      }

      if (data) {
        for (const item of data)
          if (item.relationType === RelationTypeEnum.PARENT)
            tree.parent = item
          else if (item.relationType === RelationTypeEnum.CHILD)
            tree.children.push(item)
      }

      /* Crazy thing about Ant Tree is that it will only return node key when selected. */
      const onSelect = (e: any) => {

        if (e.length && e[0] === '0-0')
          setSelectedTask(tree.parent)
        else if (e.length && e[0] === '0-0-0')
          setSelectedTask(tree.root)
        else if (e.length > 0 && e[0].indexOf('0-0-0-') > -1) {
          const childIndex = e[0].split('-')
          setSelectedTask(tree.children[childIndex[childIndex.length - 1]])
        } else
          setSelectedTask(null)

      }


      if (tree.parent) {

        return (

          <Tree
            defaultExpandAll
            showLine={false}
            showIcon={false}

            style={{ fontSize: '0.9em' }}
            onSelect={onSelect}
            treeData={
              [
                {
                  title: (<>
                    <span style={{ fontWeight: 600, marginRight: 10 }}>{tree.parent?.recordNumber}</span>
                    <span>{tree.parent?.title ? tree.parent.title : ''}</span>
                  </>),
                  key: "0-0",
                  children: tree?.root ?
                    [
                      {
                        title: (<><
                          span style={{ fontWeight: 600, marginRight: 10 }}>{tree.root?.recordNumber}</span>
                          <span>{tree.root?.title ? tree.root.title : ''}</span>
                        </>),
                        key: "0-0-0",
                        children: tree?.children ?
                          tree.children.map((child: any, i: number) => {
                            return (
                              {
                                title: (<><span style={{ fontWeight: 600, marginRight: 10 }}>{child.recordNumber}</span>
                                  <span>{child.title ? child.title : ''}</span>
                                </>),
                                key: `0-0-0-${i}`,
                              }
                            )
                          })
                          : []
                      }
                    ]
                    : []
                }
              ]
            }
          />
        )
      } else return <></>
    }

  }

  renderTaskList = () => {

    const { record, entityName, recordAssociationReducer, updatingData, recordReducer, schemaReducer } = this.props;
    const associationKey = `${record?.id}_${entityName}`;
    const associationObj: any = recordAssociationReducer.shortList[associationKey];
    const data = associationObj && associationObj[entityName] && associationObj[entityName].dbRecords;

    console.log('%cDATA','color:orange', data)

    if (updatingData) {
      return <Row>
          <Col span={24} style={{ padding: 10, textAlign: 'center' }}>
            <Spin/>
          </Col>
        </Row>
    }else if (data && !updatingData) {
      return this.generateTree(data)
    }else if(!data && !updatingData && !recordAssociationReducer.isSearching && !recordAssociationReducer.isRequesting){
      return <Row>
        <Col span={24} style={{ padding: 10}}>
          <span>No tasks to show.</span>
        </Col>
      </Row>
    }else{
      return  <Row>
        <Col span={24} style={{ padding: 10, textAlign: 'center' }}>
          <Spin/>
        </Col>
      </Row>
    }
  }

  render() {
    return (
      <>
        {this.renderTaskList()}
      </>
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

export default connect(mapState, mapDispatch)(TaskSideBarListView);
