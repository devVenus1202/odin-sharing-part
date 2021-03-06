import { OrganizationEntity } from '@d19n/models/dist/identity/organization/organization.entity';
import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import {
  DbRecordEntityTransform,
} from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { MetadataLinks } from '@d19n/models/dist/schema-manager/metadata.links';
import { PipelineEntity } from '@d19n/models/dist/schema-manager/pipeline/pipeline.entity';
import { PipelineStageEntity } from '@d19n/models/dist/schema-manager/pipeline/stage/pipeline.stage.entity';
import { SchemaColumnEntity } from '@d19n/models/dist/schema-manager/schema/column/schema.column.entity';
import {
  SchemaColumnValidatorEnums,
} from '@d19n/models/dist/schema-manager/schema/column/validator/schema.column.validator.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { Col, Empty, Form, Input, Modal, Row, Select, Spin } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import { logPremiseVisitRequest } from '../../../../../containers/CrmModule/containers/Premise/store/actions';
import { LOG_PREMISE_VISIT_REQUEST } from '../../../../../containers/CrmModule/containers/Premise/store/constants';
import { hasAnyRoles } from '../../../../../shared/permissions/rbacRules';
import { errorNotification } from '../../../../../shared/system/notifications/store/reducers';
import { checkRecordIsLocked } from '../../../../../shared/utilities/recordHelpers';
import { PipelineReducerState } from '../../../../pipelines/store/reducer';
import {
  IUpdateRelatedRecordAssociation,
  updateRecordAssociationRequest,
} from '../../../../recordsAssociations/store/actions';
import { DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST } from '../../../../recordsAssociations/store/constants';
import { IRecordAssociationsReducer } from '../../../../recordsAssociations/store/reducer';
import {
  bulkUpdateRecordsRequest,
  createRecordsRequest,
  IBulkUpdateRecords,
  ICreateRecords,
  IUpdateRecordById,
  updateRecordByIdRequest,
} from '../../../store/actions';
import {
  BULK_UPDATE_DB_RECORDS_REQUEST,
  CREATE_DB_RECORD_REQUEST,
  UPDATE_DB_RECORD_BY_ID_REQUEST,
} from '../../../store/constants';
import { IRecordReducer } from '../../../store/reducer';
import { TableReducer } from '../../DynamicTable/store/reducer';
import renderFormField, { FormField, InputChangeParams } from '../FormFields';
import { closeRecordForm, updateFormInput, updateRecordFormState } from '../store/actions';
import { FormReducer } from '../store/reducer';

const { Option } = Select;

export class FormSectionEntity {
  public id?: string | null;
  public organization?: OrganizationEntity;
  public schema?: SchemaEntity;
  public schemaColumns?: SchemaColumnEntity[];
  public name?: string;
  public description?: string;
  public position?: number;
  public columns?: number;
  public associations?: {
    recordId: string;
    title: string;
    recordNumber: string;
    schemaAssociationId: string;
  }[];
}

export interface Props {
  userReducer: any,
  recordReducer: IRecordReducer,
  recordTableReducer: TableReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  pipelineReducer: PipelineReducerState,
  onSubmitEvent: Function,
  formUUID: string,
  updateFormProperties: any,
  createRecord: (params: ICreateRecords, cb?: any) => void,
  updateRecord: (params: IUpdateRecordById, cb?: any) => void,
  bulkUpdateRecords: (params: IBulkUpdateRecords, cb?: any) => void,
  updateRecordAssociation: any,
  logVisit: any,
  notifyError: any,
  recordFormReducer: any,
  closeForm: any,
  updateFormState: any,
  isBatchCreate?: boolean,
}

interface State {
  filterUsers: string | undefined
}

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

class OdinFormModal extends React.Component<Props, State> {

  formRef = React.createRef<FormInstance>();

  constructor(props: Props) {
    super(props);

    this.state = {
      filterUsers: undefined,
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if (prevProps.recordFormReducer.showFormModal !== this.props.recordFormReducer.showFormModal) {
      if (this.props.recordFormReducer.showFormModal && this.props.recordFormReducer.formUUID === this.props.formUUID) {
        this.initializeDefaultValues()
      }
    }
  }

  initializeDefaultValues() {
    const { recordFormReducer, updateFormState } = this.props;
    const { isCreateReq, sections, selected, recordType } = recordFormReducer;

    if (sections && sections[0]) {
      for(const section of sections) {
        if (section.schema && section.schema.columns) {

          let columns = section.schema.columns;
          if (section.schema.types.length > 0) {

            // filter the columns by the record schemaTypeId if updating
            if (selected && selected.type) {
              const schemaType = section.schema?.types?.find((type: { name: any; }) => type.name === selected.type);
              columns = columns.filter((col: SchemaColumnEntity) => col.schemaTypeId === schemaType?.id || !col.schemaTypeId);
            }

            // filter by the selected schemaTypeId
            const schemaType = section.schema?.types?.find((type: { name: any; }) => type.name === recordType);
            columns = columns.filter((col: SchemaColumnEntity) => col.schemaTypeId === schemaType?.id || !col.schemaTypeId);

          }
          // if the user is creating a new record set the default values
          if (isCreateReq) {
            let properties = {}

            for(const col of columns) {
              if (col.defaultValue) {
                properties = Object.assign({}, properties, { [col.name]: col.defaultValue })
              }
            }

            const modified = recordFormReducer.modified.find((elem: { schemaId: string; }) => elem.schemaId === section?.schema?.id)

            if (modified) {
              updateFormState({
                modified: [
                  ...recordFormReducer.modified.filter((elem: { schemaId: string; }) => elem.schemaId !== section?.schema?.id),
                  {
                    ...modified,
                    properties: {
                      ...properties,
                      ...modified.properties,
                    },
                  },
                ],
              });
            } else {
              updateFormState({
                modified: [
                  ...recordFormReducer.modified,
                  {
                    schemaId: section.schema && section.schema.id ? section.schema.id.toString() : undefined,
                    properties: {
                      ...properties,
                    },
                  },
                ],
              });
            }
          }
        }
      }
    }
  }

  handleInputChange = (params: InputChangeParams) => {
    const { recordFormReducer, updateFormProperties } = this.props;
    const { selected, additionalInputChangeHandler, isBulkUpdateReq } = recordFormReducer;
    // add contact email address to the lead
    const leadFormFields = recordFormReducer.modified.find((elem: any) => elem.entity === 'CrmModule:Lead');
    const contactFormFields = recordFormReducer.modified.find((elem: any) => elem.entity === 'CrmModule:Contact');

    // ODN-1792 change null or '' value to undefined to prevent the bulk field clearing
    if (isBulkUpdateReq) {
      if (!params.value) params.value = undefined;
    }

    console.log('params', params)

    // Add contact email address to the lead form
    if (!!leadFormFields && !!contactFormFields) {
      if (params.id === `${contactFormFields.schemaId}_EmailAddress`) {
        updateFormProperties({
          targetId: `${leadFormFields.schemaId}_EmailAddress`,
          entity: leadFormFields.entity,
          targetValue: params.value,
          record: selected,
        });
      }
    }

    // exec additional injected handler
    if (additionalInputChangeHandler) {
      additionalInputChangeHandler(this.props, params);
    }

    updateFormProperties({
      targetId: params.id,
      entity: params.entity,
      targetValue: params.value,
      record: selected,
      association: params.association,
    });
  };

  handleSubmit = async () => {

    const { createRecord, updateRecord, bulkUpdateRecords, updateRecordAssociation, logVisit, notifyError, recordFormReducer, recordReducer, recordTableReducer, closeForm, onSubmitEvent, userReducer } = this.props;
    const { selected, schema, hasColumnMappings, isUpdateReq, isCreateReq, isBulkUpdateReq } = recordFormReducer;

    // ODN-1640 prevent editing if record is locked
    if (checkRecordIsLocked(selected) && !hasAnyRoles(userReducer, 'system.admin', 'BillingModuleAdmin')) {
      notifyError({ message: 'the record is locked' });
      closeForm();
      return;
    }

    try {
      if (!!this.formRef.current) {

        await this.formRef.current.validateFields();

        if (recordFormReducer.modified.length < 1) {
          return notifyError({
            message: 'no modified form values',
            validation: null,
            data: null,
          });
        } else {
          if (schema.moduleName === SchemaModuleTypeEnums.CRM_MODULE && schema.entityName === 'Visit' && !isUpdateReq) {
            return logVisit({
              schema: recordFormReducer.schema,
              createUpdate: recordFormReducer.modified[0],
            }, (res: any) => {
              if (res) {
                onSubmitEvent({ event: LOG_PREMISE_VISIT_REQUEST, results: res });
                closeForm();
              }
            });

          } else if (isUpdateReq) {
            // update a record
            if (hasColumnMappings && selected.dbRecordAssociation) {
              return updateRecordAssociation({
                schema: schema,
                recordId: selected.id,
                dbRecordAssociationId: selected.dbRecordAssociation.id,
                createUpdate: recordFormReducer.modified[0],
              }, (res: DbRecordEntityTransform) => {
                if (res) {
                  onSubmitEvent({ event: DB_RECORD_ASSOCIATIONS_UPDATE_REQUEST, results: res });
                  closeForm();
                }
              });

            } else {
              return updateRecord({
                schema: schema,
                recordId: selected.id,
                createUpdate: recordFormReducer.modified[0],
              }, (res: DbRecordEntityTransform) => {
                if (res) {
                  onSubmitEvent({ event: UPDATE_DB_RECORD_BY_ID_REQUEST, results: res });
                  closeForm();
                }
              });
            }

          } else if (isCreateReq) {
            // create a record
            return createRecord({
              schema: recordFormReducer.schema,
              createUpdate: [ ...recordFormReducer.payload, ...recordFormReducer.modified ],
            }, (res: DbRecordEntityTransform) => {
              if (res) {
                onSubmitEvent({ event: CREATE_DB_RECORD_REQUEST, results: res });
                closeForm();
              }
            });
          } else if (isBulkUpdateReq) {
            const bulkUpdateParams: IBulkUpdateRecords = {
              schema,
              createUpdate: recordFormReducer.modified[0],
            };
            // ODN-1988 bulk update selected records
            if (recordTableReducer?.selectedItems?.length > 0) {
              bulkUpdateParams.recordIds = recordTableReducer.selectedItems;
            }
            // bulk update records in current search
            else {
              const searchQuery = recordReducer.searchQuery[schema.id];
              const isNotEmptyQuery = !!searchQuery?.terms
                || !!searchQuery?.boolean?.must?.length
                || !!searchQuery?.boolean?.must_not?.length
                || !!searchQuery?.boolean?.should?.length
                || !!searchQuery?.boolean?.filter?.length;
              if (isNotEmptyQuery) {
                bulkUpdateParams.searchQuery = {
                  schemas: schema.id,
                  fields: searchQuery?.fields,
                  terms: searchQuery?.terms,
                  boolean: searchQuery?.boolean,
                  sort: searchQuery?.sort,
                  pageable: {
                    page: 1,
                  },
                };
              }
            }
            if (bulkUpdateParams?.searchQuery || bulkUpdateParams?.recordIds) {
              bulkUpdateRecords(bulkUpdateParams, (res: any) => {
                if (res) {
                  onSubmitEvent({ event: BULK_UPDATE_DB_RECORDS_REQUEST, results: res });
                  closeForm();
                }
              });
            } else {
              notifyError({ message: 'searchQuery or selectedItems are not defined, bulk update is not allowed' });
              closeForm();
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      const formErrors = this.formRef.current ? this.formRef.current.getFieldsError() : [];
      console.log('formErrors', formErrors)
      const errors = formErrors.filter(({ errors }) => errors.length);
      console.log('errors', errors)
      const hasErrors = formErrors.filter(({ errors }) => errors.length).length > 0;

      console.log('hasErrors', hasErrors)
      if (errors && errors.length > 0) {
        console.log('error', errors[0]['errors'][0])
        notifyError({
          message: `"${errors[0]['errors'][0]}"`,
          validation: errors[0]['errors'],
          data: null,
        });
      }
    }
  };


  private setInitialValueFromModified(col: SchemaColumnEntity) {
    const { recordFormReducer } = this.props;
    if (!!recordFormReducer.selected) {
      const { properties } = recordFormReducer.selected;
      return properties[col.name];
    } else {
      return null;
    }
  }

  constructFormFields = (section: FormSectionEntity) => {
    const { recordFormReducer } = this.props;
    const { disabledFields, visibleFieldOverride, customValidations, selected, recordType, isBulkUpdateReq } = recordFormReducer;

    if (section.schema && section.schema.columns) {

      let columns = section.schema.columns;
      if (section.schema.types.length > 0) {

        // filter the columns by the record schemaTypeId if updating
        if (selected && selected.type) {
          const schemaType = section.schema?.types?.find(type => type.name === selected.type);
          columns = columns.filter(col => col.schemaTypeId === schemaType?.id || !col.schemaTypeId);
        }

        // filter by the selected schemaTypeId
        const schemaType = section.schema?.types?.find(type => type.name === recordType);
        columns = columns.filter(col => col.schemaTypeId === schemaType?.id || !col.schemaTypeId);

      }

      // ODN-2244 do not render LOOKUP column if a select for the linked association shown (when creating from the
      // relations list)
      if (section.associations && section.associations.length > 0) {
        columns = columns.filter(col => !section.associations?.some(a => a.schemaAssociationId === col.linkedSchemaAssociationId));
      }

      return columns.sort((colA, colB) => colA.position - colB.position).map((col) => {

        // ODN-1792 the bulk update is allowed if the isBulkUpdatable flag is defined and field is not unique
        if (isBulkUpdateReq) {
          if (!col.isBulkUpdatable
            || col.validators?.some(validator => validator.type === SchemaColumnValidatorEnums.UNIQUE)
          ) {
            return;
          }
        }

        const initialValue = this.setInitialValueFromModified(col);
        let isHidden = col.isHidden ? col.isHidden : false;
        //  Only show these fields if override
        // If visibleFieldOverride && visibleFieldOverride.length > 0;
        if (visibleFieldOverride && visibleFieldOverride.length > 0) {
          // the field should not be a hidden field set from the server
          // Hide all fields
          isHidden = true;
          // show only fields in this array
          isHidden = !visibleFieldOverride.includes(col.name);
        }

        const linkedSchemaAssociation = section?.schema?.associations?.find(s => s.id === col.linkedSchemaAssociationId);
        const recordMetadataLink: MetadataLinks = initialValue ? selected?.links?.find((l: MetadataLinks) => l.id === initialValue) : undefined;

        const field: FormField = {
          id: col.id ? col.id.toString() : col.name,
          schemaId: section.schema && section.schema.id ? section.schema.id.toString() : undefined,
          entity: section.schema && section.schema.moduleName ? `${section.schema.moduleName}:${section.schema.entityName}` : undefined,
          type: col.type,
          isHidden,
          name: col.name,
          label: col.label || col.name,
          description: col.description,
          defaultValue: !initialValue ? col.defaultValue : null,
          initialValue: !selected ? col.defaultValue ?? initialValue : initialValue,
          options: col.options,
          validators: col.validators,
          customValidation: customValidations ? customValidations[col.name] : undefined,
          isDisabled: disabledFields ? disabledFields.includes(col.name) : false,
          handleInputChange: this.handleInputChange,
          linkedSchemaAssociation,
          initialRecordMetadataLink: recordMetadataLink,
        };

        return renderFormField(field);
      })
    }

  };

  private setInitialStage() {
    const { recordFormReducer, pipelineReducer } = this.props;
    const { selected, nextStageId, isBulkUpdateReq } = recordFormReducer;

    if (!!nextStageId) {
      return nextStageId;
    } else if (isBulkUpdateReq) {
      // ODN-1792 do not set the initial stage on the bulk update
      return undefined;
    } else if (selected && selected.stage) {
      return selected.stage.id;
    } else if (pipelineReducer.list) {

      let defaultStage = undefined;

      pipelineReducer.list.map((elem: PipelineEntity) => {
        if (elem.stages) {
          const stage = elem.stages[0];
          defaultStage = stage?.id;
        }
      });

      return defaultStage;
    }
  }

  private renderStageFilterOptions(section: FormSectionEntity) {
    const { pipelineReducer, recordFormReducer } = this.props;
    const { isBulkUpdateReq } = recordFormReducer;

    if (pipelineReducer.list.length > 0) {
      return (
        <Form.Item
          key="stage"
          name="stage"
          label="stage"
          labelCol={{ span: 24 }}
          initialValue={this.setInitialStage()}
          rules={[ { required: !isBulkUpdateReq } ]}
        >
          <Select
            key="stage"
            defaultValue={this.setInitialStage()}
            style={{ width: '100%' }}
            disabled={false}
            allowClear={isBulkUpdateReq}
            onChange={(val) => this.handleInputChange({
              id: `${section.schema?.id}#stage`,
              entity: 'Record',
              value: val,
            })}
          >
            {pipelineReducer.list.map((elem: PipelineEntity) => (
              elem.stages ? elem.stages.map((elem: PipelineStageEntity) => (
                  // prevent Lead change to Won stage from form modal
                  elem.key === 'LeadStageWon' ? <></> :
                    <Option value={elem.id ? elem.id.toString() : ''}>{elem.name}</Option>
                )) :
                <Option value={''}>No stages</Option>))
            }
          </Select>
        </Form.Item>);
    }
  };


  renderTitleField(section: FormSectionEntity) {
    const { recordFormReducer } = this.props;
    const { selected, isCreateReq, isBulkUpdateReq } = recordFormReducer;

    if ((section.schema?.hasTitle || section.schema?.isTitleUnique)
      // ODN-1792 the bulk update is allowed when the title is not unique
      && (!isBulkUpdateReq || !section.schema?.isTitleUnique)
    ) {
      return (
        <Form.Item
          key="title"
          name="title"
          label="Record title"
          labelCol={{ span: 24 }}
          initialValue={selected ? selected.title : ''}
          rules={[ { required: isCreateReq && section.schema?.isTitleUnique } ]}
        >
          <Input
            type="text"
            defaultValue={selected ? selected.title : ''}
            placeholder="add record title"
            onChange={(e) => this.handleInputChange({
              id: `${section.schema?.id}#title`,
              entity: 'Record',
              value: e.target.value,
            })}/>
        </Form.Item>
      )
    }
  }

  renderRecordOwnerField(section: FormSectionEntity) {
    const { recordFormReducer, userReducer } = this.props;
    const { selected } = recordFormReducer;

    let selectedUser;
    if (selected && selected.ownedBy) {
      selectedUser = userReducer.list.find((usr: OrganizationUserEntity) => usr.id === selected.ownedBy.id);
    }

    // ODN-1792 the bulk update of the owner is allowed
    if (section.schema?.assignable) {
      return (
        <Form.Item
          key="ownerId"
          name="ownerId"
          label="record owner"
          labelCol={{ span: 24 }}
          initialValue={selected && selected.ownedBy ? selected.ownedBy.id : ''}
          rules={[]}
        >
          <Select
            key={'ownerId'}
            defaultValue={selected && selected.ownedBy ? selected.ownedBy.id : ''}
            style={{ width: '100%' }}
            showSearch
            onSearch={(e) => this.setState({ filterUsers: e })}
            onChange={(val) => this.handleInputChange({
              id: `${section.schema?.id}#ownerId`,
              entity: 'Record',
              value: val,
            })}
          >
            <Option
              key={selectedUser ? selectedUser.id : ''}
              value={selectedUser ? selectedUser.id : ''}>
              {selectedUser ? selectedUser.fullName : 'Select Owner'}
            </Option>
            {userReducer.list && userReducer.list.map((elem: OrganizationUserEntity) => (
              <Option key={elem?.id?.toString()} value={elem.id ? elem.id.toString() : ''}>
                {`${elem.firstname} ${elem.lastname}`}
              </Option>
            ))
            }

          </Select>
        </Form.Item>
      )
    }
  }

  renderSchemaTypeField(section: FormSectionEntity) {

    const { recordFormReducer } = this.props;
    const { schema, selected, recordType, isCloning, isBulkUpdateReq } = recordFormReducer;

    const hasTypes = schema?.types?.length > 0;

    if (schema && hasTypes
      // ODN-1792 the bulk update of the schema type is not allowed
      && !isBulkUpdateReq
    ) {

      return (
        <Form.Item
          key="recordType"
          name="recordType"
          label="Record Type"
          labelCol={{ span: 24 }}
          initialValue={selected ? selected.type : recordType}
          rules={[ { required: true } ]}
        >
          <Select
            key={'recordType'}
            disabled={selected?.type && !isCloning}
            defaultValue={selected ? selected.type : recordType}
            style={{ width: '100%' }}
            onChange={(val) => this.handleInputChange({
              id: `${section.schema?.id}#recordType`,
              entity: 'Record',
              value: val,
            })}
          >
            <Option
              key={selected ? selected.type : 1}
              value={selected ? selected.type : ''}>
              {selected ? selected.type : 'Select Type'}
            </Option>
            {schema.types && schema.types.map((elem: SchemaTypeEntity) => (
              <Option key={elem?.id?.toString()} value={elem.name}>
                {elem.name}
              </Option>
            ))
            }

          </Select>
        </Form.Item>
      )
    }
  }


  renderSelectInputForAssociations(section: any) {
    return section.associations &&
      (
        <Form.Item
          key="related"
          name="related"
          label="related"
          labelCol={{ span: 24 }}
          rules={[ { required: false } ]}
        >
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            defaultValue={section.associations.map((elem: any) => elem.title || elem.recordNumber)}
            placeholder="Please select"
          >
            {section.associations.map((elem: any) => (
              <Option key={elem.recordId} value={elem.recordId}>{elem.title || elem.recordNumber}</Option>
            ))}
          </Select>
        </Form.Item>
      )
  }

  handleAssociationAddedFromFileUpload(elem: DbRecordEntityTransform) {

    console.log('elem', elem);

  }

  render() {
    const { recordReducer, recordFormReducer, recordAssociationReducer, closeForm, formUUID } = this.props;
    const { hasColumnMappings } = recordFormReducer;

    return (
      <>
        <Modal
          className="dynamic-form-modal"
          destroyOnClose
          width={750}
          style={{ top: 20 }}
          title={recordFormReducer.title}
          visible={recordFormReducer.showInitializing && recordFormReducer.formUUID === formUUID}
          footer={false}
          onCancel={() => closeForm()}
        >
          <Spin/>
        </Modal>


        <Modal
          className="dynamic-form-modal"
          destroyOnClose
          maskClosable={false}
          width={750}
          style={{ top: 20 }}
          title={recordFormReducer.title}
          visible={recordFormReducer.showFormModal && recordFormReducer.formUUID === formUUID}
          onOk={() => this.handleSubmit()}
          confirmLoading={recordReducer.isCreating || recordReducer.isUpdating || recordAssociationReducer.isUpdating}
          onCancel={() => closeForm()}
        >
          {recordFormReducer.sections.length > 0 ?
            <div>
              {recordFormReducer.sections.map((section: FormSectionEntity) => (
                <Form
                  style={{ maxHeight: 500, overflow: 'auto' }}
                  {...layout}
                  labelCol={{ span: 22 }}
                  wrapperCol={{ span: 22 }}
                  ref={this.formRef}
                  key={section.id ? section.id.toString() : section.name}
                  name={section.schema?.id ? section.schema?.id.toString() : section.schema?.name}
                  className="dynamic-form"
                  autoComplete="off"
                  initialValues={{ remember: true }}
                >
                  {!hasColumnMappings ?
                    <Row>
                      <Col sm={24} lg={12}>
                        {this.renderTitleField(section)}
                        {this.renderSchemaTypeField(section)}
                        {this.renderRecordOwnerField(section)}
                        {this.renderStageFilterOptions(section)}
                        {this.renderSelectInputForAssociations(section)}
                      </Col>
                      <Col sm={24} lg={12}>
                        {this.constructFormFields(section)}
                      </Col>
                    </Row>
                    :
                    <Row>
                      <Col sm={24} lg={12}>
                        {this.constructFormFields(section)}
                      </Col>
                    </Row>
                  }
                </Form>
              ))}
            </div>
            : (<Empty description="no form fields to show"/>)}
        </Modal>

      </>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  pipelineReducer: state.pipelineReducer,
  recordFormReducer: state.recordFormReducer,
});

const mapDispatch = (dispatch: any) => ({
  closeForm: () => dispatch(closeRecordForm()),
  updateFormProperties: (value: any) => dispatch(updateFormInput(value)),
  createRecord: (params: ICreateRecords, cb: any) => dispatch(createRecordsRequest(params, cb)),
  updateRecord: (params: IUpdateRecordById, cb: any) => dispatch(updateRecordByIdRequest(params, cb)),
  updateRecordAssociation: (
    params: IUpdateRelatedRecordAssociation,
    cb: any,
  ) => dispatch(updateRecordAssociationRequest(params, cb)),
  bulkUpdateRecords: (params: IBulkUpdateRecords, cb?: any) => dispatch(bulkUpdateRecordsRequest(params, cb)),
  notifyError: (params: any) => dispatch(errorNotification(params)),
  logVisit: (visit: any, cb: any) => dispatch(logPremiseVisitRequest(visit, cb)),
  updateFormState: (params: FormReducer) => dispatch(updateRecordFormState(params)),
});


export default connect(mapState, mapDispatch)(OdinFormModal);

