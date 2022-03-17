import { AppstoreOutlined, DownloadOutlined, FilePdfOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Button, Card, Col, Divider, Image, Row, Select, Table, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { getBrowserPath } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListByModuleAndEntity, sortOptions } from '../../../../shared/utilities/schemaHelpers';
import { IUpdateRecordById, updateRecordByIdRequest } from '../../../records/store/actions';
import PDFModalViewer from "../../../../shared/components/PDFModalViewer";
import PreviewNotAvailablePlaceholder from "../../../../assets/images/png/preview-not-available.png";
import './styles.scss'

const { Option } = Select;

interface Props {
  schemaReducer: any,
  files: any,
  dataSource: any,
  columns: any,
  thumbnailSize?: number,
  hideViewOptions?: boolean
  updateRecord: (params: IUpdateRecordById, cb?: any) => void
}

interface State {
  view: 'list' | 'thumbnails',
  pdfModalVisible: boolean,
  pdfFile:any
}

class FileManagerOverview extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = { view: 'thumbnails', pdfFile:'', pdfModalVisible:false }
  }

  public updateRecordCategoryOnChange(record: DbRecordEntityTransform, params: { category: string }) {

    const { updateRecord, schemaReducer } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      SchemaModuleTypeEnums.SCHEMA_MODULE,
      SchemaModuleEntityTypeEnums.FILE,
    );

    if (schema) {
      // update the record
      return updateRecord({
        schema: schema,
        recordId: record.id,
        createUpdate: {
          entity: record.entity,
          properties: {
            Category: params?.category,
          },
        },
      }, (res: DbRecordEntityTransform) => {
        if (res) {
        }
      });
    }

  }

  public renderFileUploadFormFields(record: DbRecordEntityTransform) {
    const { schemaReducer } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      SchemaModuleTypeEnums.SCHEMA_MODULE,
      SchemaModuleEntityTypeEnums.FILE,
    );

    if (schema && schema.columns) {
      const column = schema?.columns?.find(elem => elem.name === 'Category')
      return (
        <Select
          allowClear
          key={column?.id}
          value={getProperty(record, 'Category')}
          defaultValue={!!column?.defaultValue ? column?.defaultValue : `select ${column?.label}`}
          style={{ width: '100%', marginBottom: 16 }}
          onChange={(val, option) => this.updateRecordCategoryOnChange(record, { category: val })}
          getPopupContainer={trigger => trigger.parentNode}
        >
          {column?.options ? column?.options.sort(sortOptions).map(opt => (
            <Option value={opt.value}>{opt.label}</Option>
          )) : (
            <Option value="">no options</Option>
          )}
        </Select>
      )
    }
  }


  renderList() {
    return (
      <Col span={24}>
        <Table size="small" tableLayout="auto" columns={this.props.columns} dataSource={this.props.dataSource}/>
      </Col>
    )
  }

  showPDFViewer = (record:DbRecordEntityTransform) => {

    this.setState({pdfFile: getProperty(record, 'Url')}, () => {
        this.setState({pdfModalVisible:true})
      })

  }

  public hidePDFViewer(){
    if(this.state.pdfModalVisible)
      this.setState({pdfModalVisible: false})
  }

  renderThumbnailPreview = (record:any) => {

    const mimeType = getProperty(record, 'Mimetype')

    if(record && mimeType){

      if (mimeType.indexOf('image') > -1)
        return <Image src={getProperty(record, 'Url')}/>
      else if (mimeType.indexOf('pdf') > -1)
        return (
          <div onClick={() => this.showPDFViewer(record)} style={{cursor:'pointer'}}>
          <Row
            align="middle"
            justify="space-around"
            style={{ padding:'45px 0px', backgroundColor: '#fff3f3' }}>
            <Col span={24} style={{ textAlign: 'center', backgroundColor: 'transparent' }}>
              <FilePdfOutlined style={{ fontSize: '3em', fontWeight: 200, color: 'red' }}/>
              <br/><br/>
              <span style={{ marginTop: 10, fontSize: '0.8em' }}>{record.title}</span>
            </Col>

          </Row>
          </div>
        )
      else
        return <div style={{width:'100%'}}><img style={{width:'100%'}} src={PreviewNotAvailablePlaceholder} alt="Preview not Available"/></div>
    }

  }


  renderThumbnail(record: any, thumbnailSize: number = 12) {
    return (
      <Col span={thumbnailSize} style={{ padding: '10px' }}>
        <Card
          size="small"
          className="filePreviewCard"
          title={
            <Row>
              <Col span={18}>
                <Link target="_blank" to={getBrowserPath(record)}>#{record.recordNumber}</Link>
              </Col>
              <Col span={6} style={{textAlign:'right'}}>
                <a href={getProperty(record,'Url')} target="_blank" rel="noreferrer">
                  <Tooltip title="Download" mouseEnterDelay={0.5}>
                <Button size="small" type="default">
                  <DownloadOutlined/>
                </Button>
                  </Tooltip>
                </a>
              </Col>
            </Row>
          }
          cover={
            <div style={{ padding: '7px 7px 0px 7px' }}>
              <div>
                {
                  this.renderThumbnailPreview(record)
                }
              </div>
              <hr style={{ height: '1px', border: '0', color: '#efefef', backgroundColor: '#efefef' }}/>
              <div>
                <Typography.Text ellipsis style={{ fontSize: 12 }}>{record.title}</Typography.Text>
              </div>
              <div>
                <Typography.Text ellipsis style={{ fontSize: 12 }}>{dayjs(record.createdAt).format(
                  'YYYY-MM-DD HH:mm:ss')}</Typography.Text>
              </div>
              <div>
                {this.renderFileUploadFormFields(record)}
              </div>
            </div>
          }
        />
      </Col>
    )
  }




  render() {

    const { files, thumbnailSize, hideViewOptions } = this.props

    return (
      <div>

        <PDFModalViewer isModalVisible={this.state.pdfModalVisible} file={this.state.pdfFile} togglePDFModal={this.hidePDFViewer.bind(this)}/>

        {!hideViewOptions &&
        <Divider style={{ marginTop: '10px' }}>
            <Row style={{ marginTop: '10px', padding: '15px' }}>
                <Col span={24} style={{ textAlign: 'right' }}>
                    <Tooltip placement="left" title="Thumbnail">
                        <Button
                            type={this.state.view === 'thumbnails' ? 'primary' : 'default'}
                            size="large"
                            icon={<AppstoreOutlined/>}
                            style={{ marginRight: '8px' }}
                            onClick={() => this.setState({ view: 'thumbnails' })}
                        />
                    </Tooltip>
                    <Tooltip placement="right" title="List">
                        <Button
                            type={this.state.view === 'list' ? 'primary' : 'default'}
                            size="large"
                            icon={<UnorderedListOutlined/>}
                            onClick={() => this.setState({ view: 'list' })}
                        />
                    </Tooltip>
                </Col>
            </Row>
        </Divider>}

        <Image.PreviewGroup>
          <Row>
            {
              this.state.view === 'thumbnails'
                ?
                files.map((record: any) => (
                  this.renderThumbnail(record, thumbnailSize)
                ))
                :
                this.renderList()
            }
          </Row>
        </Image.PreviewGroup>
      </div>

    )
  }

}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  updateRecord: (params: IUpdateRecordById, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
});

export default connect(mapState, mapDispatch)(FileManagerOverview);

