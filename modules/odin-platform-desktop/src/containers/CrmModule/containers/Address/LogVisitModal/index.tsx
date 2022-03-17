import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Button } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { IRecordReducer } from '../../../../../core/records/store/reducer';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { displayMessage } from '../../../../../shared/system/messages/store/reducers';
import {
  getSchemaFromShortListByModuleAndEntity,
} from '../../../../../shared/utilities/schemaHelpers';
import { v4 as uuidv4 } from "uuid"
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from "../../../../../core/schemas/store/actions";
import { SchemaModuleTypeEnums } from "@d19n/models/dist/schema-manager/schema/types/schema.module.types";
import { SharedFormReducer } from "../../../../../shared/components/FormModal/store/reducer";
import { initializeRecordForm } from "../../../../../core/records/components/Forms/store/actions";
import OdinFormModal from "../../../../../core/records/components/Forms/FormModal";
import { getProperty } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";

const { CRM_MODULE } = SchemaModuleTypeEnums
const uuid = uuidv4();


interface Props {
  addressRecord: DbRecordEntityTransform,
  recordReducer: IRecordReducer,
  schemaReducer: SchemaReducerState,
  alertMessage: any,
  getSchema: any,
  initializeForm: any,
  formReducer: SharedFormReducer,
  hasColumnMappings?: boolean,
}

class LogVisitForm extends React.Component<Props> {

  showModal = () => {

    const { schemaReducer, initializeForm, addressRecord } = this.props;
    const visitSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, 'Visit');

    if(visitSchema){
      initializeForm({
        formUUID: uuid,
        title: 'Log Visit',
        showFormModal: true,
        isBatchCreateReq: true,
        schema: visitSchema,
        sections: [ { name: visitSchema.name, schema: visitSchema } ],
        modified: [
          {
            associations: [{recordId: addressRecord.id}],
            schemaId: visitSchema.id,
            properties: {
              UDPRN: getProperty(addressRecord, 'UDPRN'),
              UMPRN: getProperty(addressRecord, 'UMPRN'),
            },
          },
        ],
      });
    }

  };

  handleFormSubmit(params: any) {

    /* TODO - Create Visit record with associated Address  */

  }

  loadSchema() {
    const { getSchema } = this.props
    getSchema({ moduleName: CRM_MODULE, entityName: 'Visit' })
  }

  render() {
    return (
      <div>

        <Button style={{ marginLeft: 4, marginRight: 4 }} type="primary" onClick={this.showModal}>
          Log Visit
        </Button>

        <OdinFormModal
          formUUID={uuid}
          onSubmitEvent={(params: { event: string, results: any }) => this.handleFormSubmit(params)}/>

      </div>
    );
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  schemaReducer: state.schemaReducer,
  formReducer: state.formReducer,
});

const mapDispatch = (dispatch: any) => ({
  alertMessage: (params: { body: string, type: string }) => dispatch(displayMessage(params)),
  getSchema: (params: ISchemaByModuleAndEntity) => dispatch(getSchemaByModuleAndEntityRequest(params)),
  initializeForm: (params: any) => dispatch(initializeRecordForm(params)),
});


export default connect(mapState, mapDispatch)(LogVisitForm);

