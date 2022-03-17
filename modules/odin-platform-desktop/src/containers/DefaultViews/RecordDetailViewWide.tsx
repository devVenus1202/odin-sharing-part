import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import RecordMainContentWide from '../../core/records/components/DetailViewWide/RecordMainContentWide';
import { IRecordReducer } from '../../core/records/store/reducer';
import { SchemaReducerState } from '../../core/schemas/store/reducer';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../shared/utilities/schemaHelpers';

type PathParams = {
  url: string,
  recordId: string
}

type State = {
  detailsColumnExpanded: boolean
}

type PropsType = RouteComponentProps<PathParams> & {
  match?: any,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  disableClone?: boolean,
  disableEdit?: boolean,
  disableDelete?: boolean,
  excludeRelations?: string[],
  defaultTabKey?: string,
  customTabs?: { key: string, tab: string }[],
  customContent?: { key: string, tab: string }[],
}

const { NOTE } = SchemaModuleEntityTypeEnums;

class RecordDetailViewWide extends React.Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);
    this.state = {
      detailsColumnExpanded: false,
    }
  }

  toggleColumnState = () => {
    this.setState({detailsColumnExpanded: !this.state.detailsColumnExpanded})
  }


  render() {

    const { schemaReducer, recordReducer, match, excludeRelations, disableClone, disableEdit, disableDelete, defaultTabKey, customTabs, customContent } = this.props;
    const record = getRecordFromShortListById(recordReducer.shortList, match?.params?.recordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      excludeRelations ? [ NOTE, ...excludeRelations ] : [ NOTE ],
    );

    return (<RecordMainContentWide
      disableClone={disableClone}
      disableEdit={disableEdit}
      disableDelete={disableDelete}
      defaultTabKey={defaultTabKey}
      record={record}
      schema={schema}
      relatedSchemas={relatedSchemas}
      customTabs={customTabs}
      customContent={customContent}
      toggleColumnState={this.toggleColumnState}
      detailsColumnExpanded={this.state.detailsColumnExpanded}
      />
    )
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({});

export default withRouter(connect(mapState, mapDispatch)(RecordDetailViewWide));
