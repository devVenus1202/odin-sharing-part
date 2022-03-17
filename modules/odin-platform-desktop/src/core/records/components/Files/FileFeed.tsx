import React, { FunctionComponent, useEffect, useLayoutEffect, useState } from 'react';
import { Col, Row, Spin} from "antd";
import { SchemaEntity } from "@d19n/models/dist/schema-manager/schema/schema.entity";
import { connect } from "react-redux";
import { SearchQueryType } from "@d19n/models/dist/search/search.query.type";
import { ISearchRecords, searchRecordsRequest, setDbRecordSearchQuery } from "../../store/actions";
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from "../../../schemas/store/actions";
import { SchemaModuleTypeEnums } from "@d19n/models/dist/schema-manager/schema/types/schema.module.types";
import { DbRecordEntityTransform } from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";
import { getProperty } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";

import PDFModalViewer from "../../../../shared/components/PDFModalViewer";
import './styles.scss'
import FileCard from "./FileCard";

interface OwnProps {
  schema: SchemaEntity | undefined,
  moduleName: string | undefined,
  entityName: string | undefined,
  recordReducer: any,
  schemaReducer: any,
  setSearchQuery: any,
  searchRecords: any,
  getSchema: any,
  displayed: 'LIST' | 'FEED',
}

type Props = OwnProps;
const { SCHEMA_MODULE } = SchemaModuleTypeEnums;


const FileFeed: FunctionComponent<Props> = (props) => {

  const { getSchema, recordReducer, searchRecords } = props
  const [ fileList, setFileList ] = useState<Array<any>>([])
  const [ fileListPageNum, setFileListPageNum ] = useState<number>(1)
  const [ schema, setSchema ] = useState<any>(null)
  const [ colHeight, setColHeight ] = useState<any>(null)
  const [ pdfFile, setPDFFile ] = useState<string>('')
  const [ pdfModalVisible, setPdfModalVisible ] = useState<boolean>(false)
  const [ loadingAdditionalFiles, setLoadingAdditionalFiles ] = useState<boolean>(false)


  const thumbnailRef = React.useRef(null);
  const thumbnailContainerRef = React.useRef(null);


  useEffect(() => {

    /* Initial view load -> Search the files and render thumbnails */
    if (props.displayed && props.displayed === 'FEED' && fileList && !fileList?.length) {
      getSchema({ moduleName: SCHEMA_MODULE, entityName: 'File' }, (result: SchemaEntity) => {
        if (result) {
          setSchema(result)
          searchRecords({
            schema: {
              id: 'FILE_FEED',
              entityName: "Files",
              moduleName: "SchemaModule"
            },
            searchQuery: {
              terms: '*',
              schemas: [ result.id ],
              sort: [ { "updatedAt": { "order": "desc" } } ],
              pageable: {
                page: fileListPageNum,
                size: 15
              }
            },
          })
        }
      })
    }
  }, [ props.displayed ]);

  const togglePDFModal = () => {
    setPdfModalVisible(!pdfModalVisible)
  }

  useEffect(() => {
    if (!recordReducer.isSearching && !recordReducer.isRequesting && schema && recordReducer.list['FILE_FEED'])

      if (fileList && !fileList?.length) {
        setFileList(recordReducer.list['FILE_FEED'])
      } else {
        setFileList(fileList.concat(recordReducer.list['FILE_FEED']))
        setLoadingAdditionalFiles(false)
      }

    setColumnHeight()

  }, [ recordReducer.list ])


  useEffect(() => {
    if (schema && schema.id && fileListPageNum)
      searchRecords({
        schema: {
          id: 'FILE_FEED',
          entityName: "Files",
          moduleName: "SchemaModule"
        },
        searchQuery: {
          terms: '*',
          schemas: [ schema.id ],
          sort: [ { "updatedAt": { "order": "desc" } } ],
          pageable: {
            page: fileListPageNum,
            size: 15
          }
        },
      })
  }, [ fileListPageNum ]);

  const setColumnHeight = () => {
    if (thumbnailRef && thumbnailRef.current) {
      let width = window.getComputedStyle(thumbnailRef.current!).width
      setColHeight(width)
    }
  }


  useLayoutEffect(() => {
    window.addEventListener('resize', setColumnHeight);
    setColumnHeight()
    return () => window.removeEventListener('resize', setColumnHeight);
  }, []);


  useLayoutEffect(() => {
    if (thumbnailRef && thumbnailRef?.current)
      setColumnHeight()
  }, [ fileList ]);


  const showPDFViewer = (record: DbRecordEntityTransform) => {
    setPDFFile(getProperty(record, 'Url'))
    setPdfModalVisible(true)
  }


  const handleScroll = (e: any) => {

    const target = e.target

    /* Scrolled to Bottom */
    if (target.scrollHeight - target.scrollTop === target.clientHeight && thumbnailRef.current && !loadingAdditionalFiles) {
      setLoadingAdditionalFiles(true)
      setFileListPageNum(fileListPageNum + 1)
    }
  }

  return (
    <Row style={{ padding: 20, height: '75vh', overflowY: 'scroll' }} ref={thumbnailContainerRef}
         onScroll={handleScroll}>

      <PDFModalViewer isModalVisible={pdfModalVisible} file={pdfFile} togglePDFModal={togglePDFModal}/>

      <Col span={24}>
        <Row gutter={[ 16, 16 ]}>
          {
            fileList && fileList.length > 0 ?
              fileList.map((file: DbRecordEntityTransform) => {
                return (
                  <FileCard record={file} thumbnailRef={thumbnailRef} colHeight={colHeight} showPDFViewer={showPDFViewer} fileCardSize={4}/>
              )
              })
              :
                <Col span={24} style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large"/></Col>
              }
              </Row>
                {
                  loadingAdditionalFiles ?
                    <Row style={{ padding: '30px 0' }}>
                      <Col span={24} style={{ padding: 10, textAlign: 'center' }}>
                        <span><Spin/></span>
                      </Col>
                    </Row>
                    :
                    <></>
                }
              </Col>
              </Row>
              )
              }

            const mapDispatch = (dispatch: any, ownProps: any) => ({
            searchRecords: (params: {schema: SchemaEntity, searchQuery: SearchQueryType}) => dispatch(searchRecordsRequest(
            params)),
            setSearchQuery: (params: ISearchRecords) => dispatch(setDbRecordSearchQuery(params)),
            getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
          })

            const mapState = (state: any) => ({
            recordReducer: state.recordReducer,
            schemaReducer: state.schemaReducer,
          })

            export default connect(mapState, mapDispatch)(FileFeed)