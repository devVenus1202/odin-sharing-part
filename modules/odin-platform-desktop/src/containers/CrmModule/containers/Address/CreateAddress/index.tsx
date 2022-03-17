import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import Modal from 'antd/lib/modal/Modal';
import React from 'react';
import { connect } from 'react-redux';
import LookUpCreate from '../../../../../core/records/components/LookUpCreate';
import { createRecordsRequest } from '../../../../../core/records/store/actions';
import { SchemaReducerState } from '../../../../../core/schemas/store/reducer';
import { WorkflowReducer } from '../../../../../core/workflow/store/reducer';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../shared/utilities/schemaHelpers';
import { getPremiseByUdprnAndUmprnRequest } from '../../Premise/store/actions';
import history from '../../../../../shared/utilities/browserHisory';
import { createAddressVisible } from '../../../../../core/workflow/store/actions';


interface Props {
  workflowReducer: WorkflowReducer,
  createAddressVisible: any,
  schemaReducer: SchemaReducerState,
  getPremiseByUdprnAndUmprn: any,
  createRecord: any,
}

const { CRM_MODULE } = SchemaModuleTypeEnums;
const { ADDRESS } = SchemaModuleEntityTypeEnums;

interface State {
  selectedPremiseItem: any,
  createdAddressId: string | undefined,
  isLoading: boolean
}

class CreateAddressModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    selectedPremiseItem: undefined,
    createdAddressId: undefined,
    isLoading: false
  })

  finishAddressCreate() {
    const { schemaReducer, getPremiseByUdprnAndUmprn, createRecord } = this.props;
    const addressSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, CRM_MODULE, ADDRESS);
    this.setState({
      isLoading: true
    });
    getPremiseByUdprnAndUmprn(
      { udprn: this.state.selectedPremiseItem.properties.UDPRN, umprn: this.state.selectedPremiseItem.properties.UMPRN },
      (res: any) => {
        if(addressSchema) {
          const newAddress = {
            entity: `${addressSchema.moduleName}:${addressSchema.entityName}`,
            schemaId: addressSchema.id,
            title: res.title,
            properties: {
              'Type': 'BILLING',
              'AddressLine1': res.properties.AddressLine1,
              'AddressLine2': res.properties.AddressLine2,
              'AddressLine3': res.properties.AddressLine3,
              'City': 'NA',
              'PostalCode': res.properties.PostalCode,
              'CountryCode': 'GB',
              'SalesStatus': res.status ? res.status : 'REGISTER_INTEREST',
              'UDPRN': res.properties.UDPRN,
              'UMPRN': res.properties.UMPRN,
              'AvailableSeason': null,
              'AvailableYear': null,
              'FullAddress': res.properties.FullAddress,
              'Premise': res.properties.Premise,
              'PostTown': res.properties.PostTown,
              'Classification': res.ab_plus_class_1
            },
          }
          createRecord({
            schema: addressSchema,
            upsert: false,
            createUpdate: [ newAddress ],
          }, (res: DbRecordEntityTransform) => {
            history.push(`/CrmModule/Address/${res.id}`);
            this.resetModalData()
            this.setState({
              isLoading: false
            });
          });
        }
      },
    )
  }

  resetModalData() {
    const { createAddressVisible } = this.props;
    createAddressVisible();
  }

 

  render() {
    const { workflowReducer } = this.props;

    return (
      <>
        <Modal className="cancel-appointment-modal"
               title="Create Address"
               visible={workflowReducer.Address?.isCreateAddressVisible}
               width={1000}
               style={{ top: 20 }}
               onCancel={(e) => {
                 this.resetModalData()
               }}
               onOk={(e) => {
                   this.finishAddressCreate()
               }}
               okText="Save"
               maskClosable={false}
               confirmLoading={this.state.isLoading}
        >
          <LookUpCreate
            entityName={'Premise'}
            moduleName={CRM_MODULE}
            checkboxItemSelect={(e: any) => this.setState({ selectedPremiseItem: e })}/>
        </Modal>
      </>
    )
  }
}

const mapState = (state: any) => ({
  workflowReducer: state.workflowReducer,
  schemaReducer: state.schemaReducer,
});

const mapDispatch = (dispatch: any) => ({
  createAddressVisible: () => dispatch(createAddressVisible()),
  getPremiseByUdprnAndUmprn: (params: any, cb: () => {}) => dispatch(getPremiseByUdprnAndUmprnRequest(params, cb)),
  createRecord: (params: any, cb: any) => dispatch(createRecordsRequest(params, cb)),
});

// @ts-ignore
export default connect(mapState, mapDispatch)(CreateAddressModal);