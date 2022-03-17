import { UploadOutlined } from '@ant-design/icons';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { message, Select, Upload } from 'antd';
import React from 'react';
import { isMobile } from 'react-device-detect';
import Resizer from 'react-image-file-resizer';
import { connect } from 'react-redux';
import { getHostName } from '../../../../shared/http/helpers';
import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
  sortOptions,
} from '../../../../shared/utilities/schemaHelpers';
import { getRecordAssociationsRequest, IGetRecordAssociations } from '../../../recordsAssociations/store/actions';
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../../schemas/store/actions';
import { SchemaReducerState } from '../../../schemas/store/reducer';

const { Dragger } = Upload;
const { Option } = Select;

interface Props {
  schemaReducer: SchemaReducerState,
  record: DbRecordEntityTransform,
  getAssociations: any,
  getSchema: any,
}

interface State {
  coordinates: number[][],
  category: string | null,
}


class FileUploaderDragAndDrop extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      coordinates: [],
      category: null,
    }
    this.fileUploadProps = this.fileUploadProps.bind(this);
  }

  componentDidMount() {
    this.getGeolocation()
    this.loadSchema()
  }

  loadSchema() {
    const { getSchema } = this.props;
    // get schema by module and entity and save it to the local state
    getSchema({ moduleName: SchemaModuleTypeEnums.SCHEMA_MODULE, entityName: SchemaModuleEntityTypeEnums.FILE });

  }

  /* We need location against each file uploaded / photo taken. */
  getGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((res) => {
        this.setState({
          coordinates: [ [ res.coords.longitude, res.coords.latitude ] ],
        })
      }, (err) => {
        console.error(err)
      })
    }
  }


  resizeFile = (file: any) => new Promise((resolve: any) => {
    Resizer.imageFileResizer(file, 1200, 1200, 'JPEG', 70, 0,
      (uri: any) => resolve(uri),
      'blob',
    );
  });

  beforeUpload = async (file: any) => {
    const isLt25M = file.size / 1024 / 1024 < 25;
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isLt25M) {
      message.error('File must be smaller than 25MB!');
    }

    try {
      if (isJpgOrPng) {
        const blobFile = await this.resizeFile(file);
        const files = new File([ blobFile as BlobPart ], Date.now().toString() + '.jpeg', { type: 'image/jpeg' });
        return isLt25M && files;
      } else {
        const newFile = file ? new File([ file ], Date.now().toString() + '.' + file.name.split('.').pop(), {
          type: file.type,
          lastModified: file.lastModified,
        }) : false;
        return isLt25M && newFile;
      }
    } catch (err) {
      return isLt25M && file;
    }
  }

  public renderFileUploadFormFields() {
    const { schemaReducer } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      SchemaModuleTypeEnums.SCHEMA_MODULE,
      SchemaModuleEntityTypeEnums.FILE,
    );

    if (schema && schema.columns) {

      console.log('schema', schema)
      const column = schema?.columns?.find(elem => elem.name === 'Category')

      return (
        <Select
          allowClear
          key={column?.id}
          defaultValue={!!column?.defaultValue ? column?.defaultValue : `select ${column?.label}`}
          style={{ width: '100%', marginBottom: 16 }}
          onChange={(val, option) => this.setState({ category: val })}
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

  public fileUploadProps() {
    const { schemaReducer, getAssociations, record } = this.props;
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);

    return {
      name: 'file',
      multiple: false,
      data: {
        coordinates: this.state.coordinates,
        device: isMobile ? 'MOBILE' : 'DESKTOP',
        category: this.state.category,
      },
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem(`token`),
      },
      action: `${getHostName()}/SchemaModule/v1.0/s3/files/${record?.id}/upload`,
      onChange(info: any) {
        const { status } = info.file;
        if (status !== 'uploading') {
          console.log(info.file, info.fileList);
        }
        if (status === 'done') {
          message.success(`${info.file.name} file uploaded successfully.`);
          getAssociations({
            recordId: record.id,
            key: 'File',
            schema: schema,
            entities: [ 'File' ],
          });
        } else if (status === 'error') {
          message.error(`${info.file.name} file upload failed.`);
        }
      },
      progress: {
        strokeColor: {
          '0%': '#108ee9',
          '100%': '#87d068',
        },
        strokeWidth: 3,
        format: (percent: any) => `${parseFloat(percent.toFixed(2))}%`,
      },
    }
  }


  render() {
    return (
      <>
        {this.renderFileUploadFormFields()}
        <Dragger {...this.fileUploadProps()} beforeUpload={this.beforeUpload}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined/>
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">Support for a single single file upload.</p>
        </Dragger>
      </>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations) => dispatch(getRecordAssociationsRequest(params)),
});

export default connect(mapState, mapDispatch)(FileUploaderDragAndDrop);
