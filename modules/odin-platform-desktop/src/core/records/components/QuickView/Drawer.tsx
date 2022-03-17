import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { Drawer } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import RecordPreview from '../../../../containers/DefaultViews/RecordPreview';
import ServiceAppointmentCancelModal
  from '../../../../containers/FieldServiceModule/containers/ServiceAppointmentCancelModal';
import { getAllSchemaAssociationSchemas, getRecordFromShortListById } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { setDbRecordState } from '../../store/actions';
import { IRecordReducer } from '../../store/reducer';

interface Props {
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  excludeRelations?: string[],
  modifyState: any,
}

const { NOTE } = SchemaModuleEntityTypeEnums;

class RecordQuickView extends React.Component<Props> {
  state = { visible: false };

  onClose = () => {
    const { modifyState } = this.props;
    modifyState({ showPreview: false, currentRecordId: '' });
  };

  render() {
    const { schemaReducer, recordReducer, excludeRelations } = this.props;

    const record = getRecordFromShortListById(recordReducer.shortList, recordReducer.currentRecordId);
    const schema = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);
    const relatedSchemas = getAllSchemaAssociationSchemas(
      schema?.associations,
      excludeRelations ? [ NOTE, ...excludeRelations ] : [ NOTE ],
    );

    return (
      <>
        <Drawer
          width={900}
          onClose={this.onClose}
          visible={recordReducer.showPreview}
          bodyStyle={{ paddingBottom: 80, paddingLeft: 0, paddingRight: 0, paddingTop: 8, background: '#f1f3f7' }}
          className="drawer-wrapper"
        >
          {schema?.entityName === SchemaModuleEntityTypeEnums.WORK_ORDER &&
          <ServiceAppointmentCancelModal record={record}/>}
          <RecordPreview
            relatedSchemas={relatedSchemas}
            schema={schema}
            record={record}
            schemaReducer={schemaReducer}
            disableDelete={recordReducer.previewDisableDelete}
            disableClone={recordReducer.previewDisableClone}
            disableEdit={recordReducer.previewDisableEdit}
          />
        </Drawer>
      </>
    );
  }
}


const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  modifyState: (params: any) => dispatch(setDbRecordState(params)),
});

export default connect(mapState, mapDispatch)(RecordQuickView);
