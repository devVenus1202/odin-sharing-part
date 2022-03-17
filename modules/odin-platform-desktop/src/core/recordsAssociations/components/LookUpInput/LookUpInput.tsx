import { MetadataLinks } from '@d19n/models/dist/schema-manager/metadata.links';
import { SchemaAssociationEntity } from '@d19n/models/dist/schema-manager/schema/association/schema.association.entity';
import { Select, Spin } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { ISearchRecordAssociations, searchRecordAssociationsRequest } from '../../store/actions';
import { IRecordAssociationsReducer } from '../../store/reducer';

const { Option } = Select;

interface Props {
  placeholder?: string;
  style?: React.CSSProperties;
  initialtValue?: string;
  initialRecordMetadataLink?: MetadataLinks;
  currentSchemaId: string;
  schemaAssociation: SchemaAssociationEntity;
  onChange?: (value: string) => void;

  schemaReducer: SchemaReducerState;

  recordAssociationReducer: IRecordAssociationsReducer;
  searchAssociations: (params: ISearchRecordAssociations) => void;
}

interface State {
  value?: string;
  data: {
    id: string;
    recordNumber?: string;
    title?: string;
  }[];
}

class LookUpInput extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      value: props.initialtValue,
      data: [],
    };
  }

  componentDidMount() {
    this.resetData();
  }

  resetData = (text?: string) => {
    const { initialRecordMetadataLink } = this.props;
    let data = [];
    if (initialRecordMetadataLink && initialRecordMetadataLink.id === this.state.value) {
      data.push({
        id: initialRecordMetadataLink.id,
        recordNumber: initialRecordMetadataLink.recordNumber,
        title: initialRecordMetadataLink.title,
      });
    }
    if (text && data.length > 0) {
      data = data.filter(r =>
        r.title?.toLowerCase().indexOf(text.toLowerCase()) > -1
        || r.recordNumber && r.recordNumber.toLowerCase().indexOf(text.toLowerCase()) > -1,
      );
    }
    this.setState({ data });
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (prevProps.recordAssociationReducer.isSearching !== this.props.recordAssociationReducer.isSearching
      && !this.props.recordAssociationReducer.isSearching
    ) {
      this.setState({
        data: this.props.recordAssociationReducer.list as any[] ?? [],
      });
    }
  }

  handleSearch = (text: string) => {
    if (!text || text.length < 2) {
      this.resetData(text);
      return;
    }

    const { searchAssociations, schemaAssociation, currentSchemaId, recordAssociationReducer } = this.props;

    const schema = schemaAssociation.parentSchemaId === currentSchemaId ? schemaAssociation.childSchema : schemaAssociation.parentSchema;

    if (!schema) return;

    this.setState({ data: [] });

    searchAssociations(
      {
        schema: schema,
        schemaAssociation: schemaAssociation,
        searchQuery: {
          terms: text,
          schemas: schema.id,
          pageable: {
            page: 1,
            size: 50,
          },
          sort: recordAssociationReducer.searchQuery.sort,
        },
      },
    );
  };

  handleChange = (value: string) => {
    const { onChange } = this.props;

    this.setState({ value });

    if (onChange) onChange(value);
  };

  render() {
    return (
      <>
        <Spin spinning={this.props.recordAssociationReducer.isSearching}>
          <Select
            showSearch
            value={this.state.value}
            placeholder={this.props.placeholder}
            style={this.props.style}
            defaultActiveFirstOption={false}
            showArrow={false}
            //loading={this.props.recordAssociationReducer.isSearching}
            filterOption={false}
            allowClear={true}
            onSearch={this.handleSearch}
            onChange={this.handleChange}
            notFoundContent={null}
            getPopupContainer={(triggerNode: HTMLElement) => triggerNode.parentNode as HTMLElement}
          >
            {this.state.data.map(r =>
              <Option key={r.id} value={r.id}>
                {r.recordNumber ? `${r.recordNumber} - ` : ''}{r.title}
              </Option>,
            )}
          </Select>
        </Spin>
      </>
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  searchAssociations: (params: ISearchRecordAssociations) => dispatch(searchRecordAssociationsRequest(params)),
});

export default connect(mapState, mapDispatch)(LookUpInput);
