import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { Col, Form, Row } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import renderFormField, { FormField } from '../../../../../../core/records/components/Forms/FormFields';
import {
  getSchemaByModuleAndEntityRequest,
  ISchemaByModuleAndEntity,
} from '../../../../../../core/schemas/store/actions';
import { IAppointmentReducer } from '../../../../../../core/appointments/store/reducer';

interface Props {
  getSchema: any,
  saveData?: any,
  passDataToParent: any,
  appointmentReducer: IAppointmentReducer,
}

interface State {
  schemaData: any
}

const { FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;

const NETOMNIA = [
  'Blockage Clearance Required',
  'BT Infrastructure Issues',
  'CBT Issues',
  'Costs Unviable',
  'Dry Installation',
  'MDU',
  'No Clear Installation Route',
  'Overlay Required',
  'Specialist Installation Required',
  'Wayleave Issue'
];
const CUSTOMER = [
  'Cancellation for Personal Reasons',
  'Change of Mind',
  'Installation Bought Forward',
  'Moving Premises',
  'Not Happy with External Installation Route',
  'Request to Delay Install',
  'Still in Contract',
  'Uncontactable/Nobody Home',
  'Unhappy with Installation Method'
];
const YOUFIBRE = [
  'Claiming Misselling',
  'Duplicate Order',
  'Incorrect Install Date Booked',
  'No Backhaul',
  'Not Yet RFS',
  'Service Call No Longer Needed'
];


class ChangeReasonForm extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);
    this.state = {
      schemaData: {},
    }
    this.getFormFields();
  }

  getFormFields() {
    const { getSchema } = this.props;
    getSchema({ moduleName: FIELD_SERVICE_MODULE, entityName: 'ChangeReason' }, (result: SchemaEntity) => {
      this.setState({
        schemaData: result,
      })
    })
  }


  constructFormFields = (col: any) => {
    const { appointmentReducer } = this.props;
    if (col?.schemaType && col?.schemaType?.name !== appointmentReducer.schemaType) {
      return;
    }
    let options = col.options;
    if (col.name === 'CancelReason' || col.name === 'RescheduleReason') {
      let filter: any;
      if (this.formRef.current?.getFieldsValue().RequestedBy === 'NETOMNIA') {
        filter = NETOMNIA
      } else if (this.formRef.current?.getFieldsValue().RequestedBy === 'CUSTOMER') {
        filter = CUSTOMER
      } else if (this.formRef.current?.getFieldsValue().RequestedBy === 'YOUFIBRE') {
        filter = YOUFIBRE
      }
      options = options?.filter((array: any) => filter?.some((el: any) => el === array.label));
    }
    const initialValue = null;
    const field: FormField = {
      id: col.id ? col.id.toString() : col.name,
      schemaId: undefined,
      entity: 'ChangeReason',
      type: col.type,
      isHidden: col.isHidden ? col.isHidden : false,
      name: col.name,
      label: col.label || col.name,
      description: col.description,
      options: options,
      validators: col.validators,
      defaultValue: !initialValue ? col.defaultValue : null,
      initialValue,
      isDisabled: false,
      handleInputChange: this.handleInputChange,
    };
    return renderFormField(field);
  }

  handleInputChange = async (params: any) => {
    const { saveData, passDataToParent } = this.props;
    try {
      await this.formRef.current?.validateFields()
      const formErrors = this.formRef.current ? this.formRef.current.getFieldsError() : [];
      const hasErrors = formErrors.filter(({ errors }) => errors.length).length > 0;
      if(!hasErrors && this.formRef.current?.getFieldsValue()?.Reason !== 'select cancellation reason') {
        passDataToParent(false);
        saveData(this.formRef.current?.getFieldsValue());
      } else {
        passDataToParent(true);
      }
    } catch (e) {
      passDataToParent(true);
      console.error(e);
    }

  };


  renderForm() {

    return (

      <Form
        style={{ maxHeight: 500, overflow: 'auto' }}
        ref={this.formRef}
        autoComplete="off"
        key={this.state.schemaData?.id}
        name={this.state.schemaData?.id}
      >
        <Row>
          {this.state.schemaData?.columns?.map((data: any) => (
              <Col>
                {this.constructFormFields(data)}
              </Col>
            ),
          )}
        </Row>
      </Form>
    )
  }

  render() {
    return (
      <>
        {this.renderForm()}
      </>
    )
  }
}

const mapState = (state: any) => ({
  appointmentReducer: state.appointmentReducer
});

const mapDispatch = (dispatch: any) => ({
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),

});

// @ts-ignore
export default connect(mapState, mapDispatch)(ChangeReasonForm);
