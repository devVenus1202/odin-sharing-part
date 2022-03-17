import React from 'react'
import { Row, Col, Divider, Card } from 'antd';
import { connect } from 'react-redux';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';

import { getSchemaFromShortListByModuleAndEntity } from '../../shared/utilities/schemaHelpers';
import history from '../../shared/utilities/browserHisory';
import {
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
} from '../../shared/utilities/recordHelpers';

import RecordProperties from '../../core/records/components/DetailView/RecordProperties';
import { IRecordReducer } from '../../core/records/store/reducer';
import { IRecordAssociationsReducer } from '../../core/recordsAssociations/store/reducer';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../core/recordsAssociations/store/actions';
import { SchemaReducerState } from "../../core/schemas/store/reducer";
import { getSchemaByModuleAndEntityRequest, ISchemaByModuleAndEntity } from '../../core/schemas/store/actions';

import { getRecordByIdRequest, IGetRecordById } from '../../core/records/store/actions';
import DataGrid from './DataGrid';

const { CRM_MODULE, ORDER_MODULE, BILLING_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;

const {
  PAYMENT_METHOD,
  CONTACT_IDENTITY,
  CONTACT,
  INVOICE,
  ORDER,
  WORK_ORDER,
} = SchemaModuleEntityTypeEnums;

interface Props {
  contact: any;
  userReducer: any;
}
function Dashboard(props: Props) {
  const { contact, userReducer } = props;
  const upcomingInvoicesParams = {
    entity: `${BILLING_MODULE}:${INVOICE}`,
    properties: [
      {
        columnName: "Status",
        operator: "=",
        value: "SCHEDULED"
      }
    ],
    associations: [
      {
        entity: `${CRM_MODULE}:${CONTACT}`,
        recordId: userReducer.user.contactId
      }
    ]

  };
  const failedInvoicesParams = {
    entity: `${BILLING_MODULE}:${INVOICE}`,
    properties: [
      {
        columnName: "Status",
        operator: "=",
        value: "ERROR"
      }
    ],
    associations: [
      {
        entity: `${CRM_MODULE}:${CONTACT}`,
        recordId: userReducer.user.contactId
      }
    ]
  };
  const upcomingWorkOrderParams = {
    entity: `${FIELD_SERVICE_MODULE}:${WORK_ORDER}`,
    properties: [
      {
        columnName: "Status",
        operator: "=",
        value: "SCHEDULED"
      }
    ],
    associations: [
      {
        entity: `${CRM_MODULE}:${CONTACT}`,
        recordId: userReducer.user.contactId
      }
    ]
  };
  return (
    <div>
      <Row gutter={[16, 24]}>
        <Col span={24}>
          <DataGrid
            title={"Upcoming invoices"}
            record={contact}
            moduleName={BILLING_MODULE}
            entityName={INVOICE}
            fetchFunction="lookup"
            fetchParams={upcomingInvoicesParams}
          />
        </Col>
        <Col span={24}>
          <DataGrid
            title={"Failed payments"}
            record={contact}
            moduleName={BILLING_MODULE}
            entityName={INVOICE}
            fetchFunction="lookup"
            fetchParams={failedInvoicesParams}
          />
        </Col>
        <Col span={24}>
          <DataGrid
            title={"Future scheduled work orders"}
            record={contact}
            moduleName={FIELD_SERVICE_MODULE}
            entityName={WORK_ORDER}
            fetchFunction="lookup"
            fetchParams={upcomingWorkOrderParams}
          />
        </Col>
      </Row>
    </div>
  )
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
  userReducer: state.userReducer
});

const mapDispatch = (dispatch: any) => ({
  getRecordById: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
  getAssociations: (params: IGetRecordAssociations, cb: any) => dispatch(getRecordAssociationsRequest(params, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
});

export default connect(mapState, mapDispatch)(Dashboard);
