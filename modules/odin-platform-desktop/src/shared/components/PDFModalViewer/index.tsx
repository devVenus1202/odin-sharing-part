import React, { useEffect, useState } from 'react';
import { Button, Col, Modal, Row } from "antd";
import { pdfjs, Document, Page } from 'react-pdf';
import './style.scss'
import { LeftOutlined, RightOutlined } from "@ant-design/icons";



interface Props {
  isModalVisible: boolean,
  file: any,
  togglePDFModal: any
}

const PDFModalViewer = (props: Props) => {


  const [ pageNumber, setPageNumber ] = useState<number>(1)
  const [ totalPages, setTotalPages ] = useState<number>(0)

  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  const { isModalVisible, file, togglePDFModal } = props


  useEffect(() => {
    setPageNumber(1)
  }, [file]);

  const changePage = (action: 'back' | 'forward') => {

    if (action === 'forward')
      setPageNumber(pageNumber + 1)
    else
      setPageNumber(pageNumber - 1)
  }


  const onDocumentLoadSuccess = (doc: any) => {
    console.log('NumPages', doc)
    setTotalPages(doc?._transport._numPages)
  }

  return (
    <Modal
      className='PDFViewerModal'
      visible={isModalVisible}
      closable={false}
      footer={[
        <Row>
          <Col span={18} style={{ textAlign: 'left' }}>
            <Button
              disabled={pageNumber === 1}
              ghost type="primary"
              icon={<LeftOutlined />}
              onClick={() => changePage('back')}
            >Page
            </Button>
            <Button
              disabled={pageNumber === totalPages}
              ghost type="primary"
              onClick={() => changePage('forward')}
              icon={<RightOutlined />}
            >Page
            </Button>
            <span style={{marginLeft:8}}>{pageNumber} / {totalPages}</span>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button type="primary"
                    onClick={() => {
              togglePDFModal()
            }}>Close</Button>
          </Col>
        </Row>
      ]}
    >
      <Document
        file={file}
        className="PDFDocumentContainer"
        onLoadSuccess={() => console.log('PDF Successfully rendered!')}
      >
        <Page pageNumber={pageNumber} height={650} onLoadSuccess={onDocumentLoadSuccess}/>
      </Document>
    </Modal>
  )
}

export default PDFModalViewer