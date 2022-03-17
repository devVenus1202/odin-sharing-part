import React, { FunctionComponent } from 'react';
import { Button, Col, Image, Row, Tag, Tooltip } from "antd";
import { Link } from "react-router-dom";
import { getProperty } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";
import { DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import moment from "moment";
import { DbRecordEntityTransform } from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";
import InvisibleIcon from "../../../../assets/images/png/preview-not-available.png";

interface OwnProps {
  record: DbRecordEntityTransform,
  thumbnailRef: any,
  fileCardSize: number,
  colHeight?: any,
  showPDFViewer: any
}

type Props = OwnProps;


const renderFileTitle = (record: DbRecordEntityTransform) => {

  const mimeType = getProperty(record, 'Mimetype')

  if (record && mimeType) {
    const extractFileTypeFromMime = () => {
      if (mimeType.indexOf('image') > -1)
        return <Tag color="purple" style={{ margin: 0, backgroundColor: 'transparent' }}>Image</Tag>
      else if (mimeType.indexOf('pdf') > -1)
        return <Tag color="red" style={{ margin: 0, backgroundColor: 'transparent' }}>PDF</Tag>
      else if (mimeType.indexOf('opendocument.text') > -1)
        return <Tag color="blue" style={{ margin: 0, backgroundColor: 'transparent' }}>ODT</Tag>
      else if (mimeType.indexOf('vnd.openxmlformats-officedocument.wordprocessingml') > -1)
        return <Tag color="blue" style={{ margin: 0, backgroundColor: 'transparent' }}>DOCX</Tag>
      else
        return <Tag style={{ margin: 0 }}>Unknown</Tag>
    }

    return <Tooltip title={record.title}>{extractFileTypeFromMime()}</Tooltip>
  }
}

const FileCard: FunctionComponent<Props> = (props) => {

  const file = props.record
  const { thumbnailRef, colHeight, showPDFViewer,fileCardSize } = props


  const renderThumbnail = (record: DbRecordEntityTransform) => {

    /* IMAGE */
    if (record && getProperty(record, 'Mimetype') === 'image/jpeg') {
      return (
        <div key={`filetypediv-${record.id}`} style={{ cursor: 'pointer' }}
             className="canPreview">
          <Row
            align="middle"
            justify="space-around"
            style={{ height: colHeight ? colHeight : '', backgroundColor: '#fff' }}>
            <Col span={24} style={{ textAlign: 'center', backgroundColor: 'transparent' }}>
              <Image
                preview={{ mask: false }}
                width='100%'
                height='100%'
                style={{ objectFit: 'contain', cursor: 'pointer', maxHeight:colHeight }}
                src={getProperty(record, 'Url')}
              />
            </Col>
          </Row>
        </div>
      )
    }
    /* PDF */
    else if (record && getProperty(record, 'Mimetype') === 'application/pdf') {
      return (
        <div onClick={() => showPDFViewer(record)} key={`filetypediv-${record.id}`} style={{ cursor: 'pointer' }}
             className="canPreview">
          <Row
            align="middle"
            justify="space-around"
            style={{ height: colHeight, backgroundColor: '#fff3f3' }}>
            <Col span={24} style={{ textAlign: 'center', backgroundColor: 'transparent' }}>
              <FilePdfOutlined style={{ fontSize: '3em', fontWeight: 200, color: 'red' }}/>
              <br/><br/>
              <span style={{ marginTop: 10, fontSize: '0.8em' }}>{record.title}</span>
            </Col>

          </Row>
        </div>
      )
    }

    /* NO PREVIEW */
    else {
      return (
        <img
          width='100%'
          height='100%'
          style={{ opacity: 0.8, backgroundColor: '#f4f4f4' }}
          src={InvisibleIcon}
          alt="Invisible Icon"
        />
      )
    }

  }

  return (
    <Col xs={24} sm={24} md={8} lg={6} xl={fileCardSize} key={`col-${file.id}`} style={{ padding: 8 }}>
      <div style={{ border: '1px solid #bfbfbf', padding: '0 8px 10px 8px', borderRadius: 5 }}>
        <div>

          {/* Header */}
          <Row style={{ padding: '8px 5px 8px 5px' }}>
            <Col span={8}>
              <Link to={`/SchemaModule/File/${file.id}`} target="_blank">
                {file.recordNumber}
              </Link>
            </Col>
            <Col span={16} style={{ textAlign: 'right' }}>
              <span>{renderFileTitle(file)}</span>
              <span>
                <Tooltip title="Download file">
                  <a href={getProperty(file, 'Url')} target="_blank" rel="noreferrer">
                    <Button size="small" type="default" style={{ marginLeft: 8 }}>
                      <DownloadOutlined/>
                    </Button>
                    </a>
                  </Tooltip>
              </span>
            </Col>
          </Row>

        </div>
        <div ref={thumbnailRef}
             key={`thumb-${file.id}`} style={{
          height: colHeight ? colHeight : ''
        }}>
          {
            renderThumbnail(file)
          }
        </div>


        <Row style={{ padding: '8px 5px 2px 5px', fontSize: '0.8em' }}>
          <Col span={8}>
            <span style={{ fontWeight: 600 }}>Updated by</span>
          </Col>
          <Col span={16} style={{ textAlign: 'right' }}>
            <Row>
              <Col span={24}>
                <span>{file.lastModifiedBy ? file.lastModifiedBy?.fullName : '-'}</span>
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <span style={{ fontWeight: 600 }}>Updated at</span>
          </Col>
          <Col span={16} style={{ textAlign: 'right' }}>
            <span>{file.updatedAt ? moment(file.updatedAt).format('MM-DD-YYY HH:mm:ss') : '-'}</span>
          </Col>
        </Row>

      </div>
    </Col>
  );
};

export default FileCard;
