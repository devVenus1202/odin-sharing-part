import {
  DbRecordAssociationRecordsTransform,
} from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Card, Checkbox, Typography } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { renderCreateUpdateDetails } from '../../../../shared/components/RecordCreateUpdateDetails';
import {
  getAllSchemaAssociationEntities,
  getModuleAndEntityNameFromRecord,
} from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import DetailPanelLeft from '../../../records/components/DetailPanelLeft';
import RecordProperties from '../../../records/components/DetailView/RecordProperties';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { addIdToSelectedItems, getRecordAssociationsRequest, IGetRecordAssociations } from '../../store/actions';
import { IRecordAssociationsReducer } from '../../store/reducer';

const { Text } = Typography;

interface Props {
  record: DbRecordEntityTransform,
  schemaReducer: SchemaReducerState,
  recordAssociationReducer: IRecordAssociationsReducer,
  getAssociations: any,
  selectRecord: any,
  hidden?: string[]
}

interface State {
  checkedItems?: string[] | undefined,
  rawData?: any
}

class AssociationTabListWithCheckBoxes extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      checkedItems: [],
      rawData: [],
    }
  }


  componentDidMount(): void {
    this.fetchAssociations();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    if (prevProps.record !== this.props.record) {
      this.fetchAssociations();
    }
  }

  private fetchAssociations() {
    const { getAssociations, record, schemaReducer, hidden } = this.props;
    if (record) {
      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
      if (schema) {
        getAssociations({
          recordId: record.id,
          schema,
          entities: getAllSchemaAssociationEntities(schema.associations, hidden),
        }, (res: { results: { [key: string]: DbRecordAssociationRecordsTransform } }) => {
          console.log('results', res.results);
          this.setState({
            rawData: res.results,
          })
        });
      }
    }
    return <div>data fetched</div>;
  }


  renderData() {
    const { record, schemaReducer, hidden } = this.props;

    if (record) {
      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
      console.log('renderData() schema', schema)
      if (schema) {
        return getAllSchemaAssociationEntities(schema.associations, hidden).map(entity => (
          this.state.rawData[entity] && this.renderList(this.state.rawData[entity].dbRecords, entity)
        ))
      }
    }
  }

  getRecordSummary(record: DbRecordEntityTransform) {

    if (record) {
      return (<div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong>{record?.type}</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {record?.recordNumber ? <Text strong>{`# ${record?.recordNumber}`}</Text> : <div/>}
          <div className="record-title-wrapper" style={{ display: 'flex', flexDirection: 'row' }}>
            <Text className="record-title" strong>{record?.title}</Text>
          </div>
        </div>
      </div>)
    }
  }

  getRecordDetail(record: DbRecordEntityTransform) {

    if (record) {
      const { entityName } = getModuleAndEntityNameFromRecord(record)
      return <DetailPanelLeft
        entityName={entityName}
        record={record}
      >
        <RecordProperties columnLayout="horizontal" record={record} columns={1}/>
        {renderCreateUpdateDetails(record)}
      </DetailPanelLeft>
    }

  }


  renderList(data: any, entity: string) {

    const { selectRecord } = this.props;

    console.log('render list', data, entity)
    if (data && entity) {
      return (
        <div style={{ marginBottom: 24 }}>
          <Typography.Text strong>{entity}</Typography.Text>
          {data.map((elem: any) => (
            <div style={{ display: 'flex', marginLeft: 24 }}>
              <Checkbox onChange={() => selectRecord(elem.id)}>{this.getRecordDetail(elem)}</Checkbox>
            </div>
          ))}
        </div>
      )
    }
  }

  render() {
    const { recordAssociationReducer } = this.props;

    return (
      <div>
        {recordAssociationReducer.isRequesting ?
          <Card style={{ height: 400 }} loading={recordAssociationReducer.isRequesting}>
            <Typography.Text>Loading related records</Typography.Text>
          </Card>
          :
          this.renderData()
        }
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getAssociations: (params: IGetRecordAssociations, db: any) => dispatch(getRecordAssociationsRequest(params, db)),
  selectRecord: (recordId: string) => dispatch(addIdToSelectedItems(recordId)),
});

export default connect(mapState, mapDispatch)(AssociationTabListWithCheckBoxes);
