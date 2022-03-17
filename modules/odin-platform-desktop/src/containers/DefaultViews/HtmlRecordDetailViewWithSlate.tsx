import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux';
import RichEditor from '../../core/support/component/RichEditor';
import { Button, Card, Layout, PageHeader, Empty, Row, Col, Space } from 'antd';
import { updateFormInput } from '../../core/records/components/Forms/store/actions';
import { createRecordsRequest, IUpdateRecordById, updateRecordByIdRequest, ICreateRecords } from '../../core/records/store/actions';
import { IUpdateRelatedRecordAssociation, updateRecordAssociationRequest } from '../../core/recordsAssociations/store/actions';
import { withRouter } from 'react-router-dom';
import { getRecordFromShortListById } from '../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../shared/utilities/schemaHelpers';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Editor } from "react-draft-wysiwyg";
import htmlToDraft from 'html-to-draftjs';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Content } from 'antd/lib/layout/layout';
import RichTextView from './RichTextView';
import BreadcrumbComponent from '../../core/records/components/Breadcrumb';
import SwapCustomerDeviceRouter from '../ServiceModule/SwapCustomerDeviceRouter';
import DetailPanelLeft from '../../core/records/components/DetailPanelLeft';
import OrderRecordProperties from '../OrderModule/containers/Order/DetailView/OrderRecordProperties';
import AssociationDescriptionList from '../../core/recordsAssociations/components/AssociationDescriptionList';
import CardWithTabs from '../../shared/components/CardWithTabs';
import NoteForm from '../../core/records/components/Note/NoteForm';
import ActivityFeed from '../../core/records/components/ActivityFeed';
import { renderCreateUpdateDetails } from '../../shared/components/RecordCreateUpdateDetails';
import RecordProperties from '../../core/records/components/DetailView/RecordProperties';
import SlateRichText from '../../shared/components/RichEditor/SlateRichText';
import AssociationDataTable from "../../core/recordsAssociations/components/AssociationDataTable/DataTable";

interface Props {
  schemaReducer: any,
  recordReducer: any,
  match: any,
  updateRecord: any
}
interface State {
  isEditing: boolean;
  editorState: EditorState | null;
  currentContent: any;
  isChanged: any;
}
class HtmlRecordDetailView extends Component<Props, State> {
  state = {
    isEditing: false,
    editorState: EditorState.createEmpty(),
    currentContent: {},
    isChanged: false
  }
  toggleEdit = () => {
    this.setState({ isEditing: !this.state.isEditing }, () => {
      if (this.state.isEditing) {
        const { recordReducer, match, } = this.props;
        const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
        const contentBlock = htmlToDraft(getProperty(record, 'HTMLContent') || "");
        if (contentBlock) {
          const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
          const editorState = EditorState.createWithContent(contentState);
          this.setState({ editorState })
        }
      } else {
        this.handleUpdateRecord();
      }
    })

  }

  handleUpdateRecord = () => {
    const { currentContent } = this.state;
    const { schemaReducer, recordReducer, match, updateRecord } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    record.properties['JSONContent'] = JSON.stringify(currentContent);
    updateRecord({
      schema,
      recordId: record.id,
      createUpdate: record
    }, () => {
      this.setState({ isChanged: false })
    })
  }
  onEditorStateChange = (state: EditorState) => {
    this.setState({ editorState: state })
  }
  handleChange = (value: any) => {
    this.setState({ currentContent: value, isChanged: true });
  }
  goToPreview = () => {
    const { match } = this.props;
    console.log("goToPreview", match);
    window.open(`${match.url}/preview`, '_blank');
  }
  render() {
    const { isEditing, isChanged, currentContent } = this.state;
    const { schemaReducer, recordReducer, match, } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    if (!schema) return null;
    let jsonContent = null
    try {
      jsonContent = getProperty(record, 'JSONContent') ? JSON.parse(getProperty(record, 'JSONContent')) : null;
    } catch (e) {
      jsonContent = null
    }
    return (
      <Layout className="record-detail-view">
        <BreadcrumbComponent record={record} />
        <SwapCustomerDeviceRouter />
        <Row gutter={{ xs: 8, sm: 14, md: 14, lg: 14 }}>
          <Col xs={24} sm={24} md={24} lg={6}>
            <div className="record-detail-left-panel">
              <DetailPanelLeft record={record} >
                <RecordProperties columns={1} columnLayout="horizontal" record={record} />
                {renderCreateUpdateDetails(record)}
              </DetailPanelLeft>
              <br />
              <AssociationDataTable
                title={schema.entityName}
                record={record}
                moduleName={schema.moduleName}
                entityName={schema.entityName} />
            </div>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12}>
            <div className="record-detail-left-panel">
              <Card
                extra={
                  <Space>
                    {!isEditing && <Button type="link" onClick={this.goToPreview}>Preview</Button>}
                    {isEditing && <Button type="default" onClick={() => this.setState({ isEditing: false })}>Cancel</Button>}
                    <Button type="primary" onClick={this.toggleEdit} disabled={!isChanged && isEditing}>{isEditing ? 'Save' : 'Edit'}</Button>
                  </Space>
                }>
                {/*isEditing { && */}
                <SlateRichText onChange={this.handleChange} initialValue={isEditing ? currentContent : jsonContent} isViewMode={!isEditing} />
                {/* <SlateRichText/> */}
                {/* } */}
                {/* {!isEditing && jsonContent && <RichTextView json={jsonContent} html={getProperty(record, 'HTMLContent')} />}
                {!isEditing && !jsonContent && <Empty />} */}
              </Card>
            </div>
          </Col>

          <Col xs={24} sm={24} md={24} lg={6}>
            <div className="record-detail-right-panel">
              <CardWithTabs
                title="Updates"
                defaultTabKey="Notes"
                tabList={[
                  {
                    key: 'Notes',
                    tab: 'Notes',
                  },
                  {
                    key: 'Activity',
                    tab: 'Activity',
                  },
                ]}
                contentList={{
                  Notes: <NoteForm record={record} />,
                  Activity: <ActivityFeed />,
                }}
              />
            </div>
          </Col>

        </Row>
      </Layout>

    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  createRecord: (params: ICreateRecords, cb: any) => dispatch(createRecordsRequest(params, cb)),
  updateRecord: (params: IUpdateRecordById, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  updateFormProperties: (value: any) => dispatch(updateFormInput(value)),
  updateRecordAssociation: (
    params: IUpdateRelatedRecordAssociation,
    cb: any,
  ) => dispatch(updateRecordAssociationRequest(params, cb)),
});


export default withRouter(connect(mapState, mapDispatch)(HtmlRecordDetailView));
