import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Button } from 'antd';
import React, { Component } from 'react'
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../core/recordsAssociations/store/actions';
import SlateRichText from '../../shared/components/RichEditor/SlateRichText';
import { getRecordFromShortListById } from '../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../shared/utilities/schemaHelpers';

interface Props {
  schemaReducer: any,
  recordReducer: any,
  recordAssociationReducer: any,
  getAssociations: any,
  match: any,
}

class HtmlContentView extends Component<Props> {
  private getRecordAssociations() {
    const { getAssociations, schemaReducer, recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    if (record) {
      const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
      if (schema) {
        getAssociations({
          recordId: record.id,
          key: schema.entityName,
          schema,
          entities: [schema.entityName],
        });
      }
    }
  }
  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.recordReducer !== this.props.recordReducer) {
      this.getRecordAssociations();
    }
  }
  componentDidMount() {
    this.getRecordAssociations();
  }
  renderRelatedArticles() {
    const { recordReducer, match, schemaReducer, recordAssociationReducer } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    if (!record) return null;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record.schemaId);
    if (!schema) return null;
    const associationKey = record && record.id ? `${record.id}_${schema?.entityName}` : '';
    const associationObj: any = record && record.id ? recordAssociationReducer.shortList[associationKey] : [];
    const entityName = schema?.entityName;
    if (associationObj && associationObj[entityName] && associationObj[entityName].dbRecords) {
      return (<div className="related-articles">
        <h3>See Also:</h3>
        {associationObj[entityName].dbRecords.map((item: DbRecordEntityTransform) => {
          return <div><Button type="link" href={`/${schema.moduleName}/${schema.entityName}/${item.id}/preview`} target={'_blank'}>{item.title}</Button></div>
        })}
      </div>)
    }

  }
  render() {
    const { recordReducer, match } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    let jsonContent = null
    try {
      jsonContent = getProperty(record, 'JSONContent') ? JSON.parse(getProperty(record, 'JSONContent')) : null;
    } catch (e) {
      jsonContent = null
    }
    return (
      <div className="html-content-view-container">
        <div className="html-content-view-content">
          {jsonContent && <SlateRichText initialValue={jsonContent} isViewMode/>}
        </div>
        {this.renderRelatedArticles()}
      </div>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer
});

const mapDispatch = (dispatch: any) => ({
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
});

export default withRouter(connect(mapState, mapDispatch)(HtmlContentView));
