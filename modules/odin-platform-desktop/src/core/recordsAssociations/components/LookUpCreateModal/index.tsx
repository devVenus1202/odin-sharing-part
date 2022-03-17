import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Button } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import React from 'react';
import { connect } from 'react-redux';
import { canUserUpdateRecord } from '../../../../shared/permissions/rbacRules';
import { IdentityUserReducer } from '../../../identityUser/store/reducer';
import LookUpCreate from '../../../records/components/LookUpCreate';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { createOrderVisible } from '../../../workflow/store/actions';
import { updateOrCreateRecordAssociations } from '../../store/actions';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';

interface Props {
  record: DbRecordEntityTransform,
  relation: DbRecordAssociationRecordsTransform,
  schemaReducer: SchemaReducerState,
  userReducer:IdentityUserReducer,
  createOrderVisible: any,
  createAssociations: any
}

interface State {
  modalVisible: boolean, 
  selected: any,
  isLoading: boolean
}

const { ADDRESS } = SchemaModuleEntityTypeEnums;

class LookUpCreateModal extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    modalVisible: false,
    selected: [],
    isLoading: false
  })

  openModal() {
    const { createOrderVisible } = this.props;
    createOrderVisible();
    this.setState({
      modalVisible: true
    })
  }

  handleCancel = () => {
    const { createOrderVisible } = this.props;
    createOrderVisible();
    this.setState({
      modalVisible: false,
      isLoading: false
    });
  };

  handleOk = () => {
    const { record, relation, createAssociations } = this.props;
    const { schema, schemaAssociation } = relation;
    this.setState({
      isLoading: true
    })
    if(schemaAssociation && record) {
      if (schema.entityName === ADDRESS) {
        createAssociations({
          recordId: record.id,
          schema,
          schemaAssociation,
          createUpdate: [{
            recordId: this.state.selected.id
          }]
        }, () => {
          this.handleCancel();
        }); 
      } else {
        const body = this.state.selected.map((elem: any) => ({
          recordId: elem,
          quantity: 1,
        }));
        createAssociations({
          recordId: record.id,
          schema,
          schemaAssociation,
          createUpdate: body,
        }, () => {
          this.handleCancel();
        });
      }
    } else {
      this.setState({
        isLoading: false
      })
    }
  };

  render() {

    const { userReducer, record, relation } = this.props;
    const { schema } = relation;

    return (
      <div>
        <Button
          type="text"
          disabled={!canUserUpdateRecord(userReducer, schema)}
          onClick={() => this.openModal()}>
          Lookup
        </Button>
        <Modal
          title={`Add ${schema.entityName}`}
          visible={this.state.modalVisible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          width={1000}
          confirmLoading={this.state.isLoading}>
          <LookUpCreate 
            record={record}
            entityName={ schema.entityName !== undefined ? schema.entityName : '' }
            moduleName={ schema.moduleName !== undefined ? schema.moduleName : '' }
            checkboxItemSelect={(e: any) => this.setState({ selected: e })}
          />
        </Modal>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  schemaReducer: state.schemaReducer,
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  createOrderVisible: () => dispatch(createOrderVisible()),
  createAssociations: (params: any, cb: () => {}) => dispatch(updateOrCreateRecordAssociations(params, cb))
});


export default connect(mapState, mapDispatch)(LookUpCreateModal);
