import React, { useState } from 'react'
import { connect } from 'react-redux'
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';

import { DbRecordAssociationRecordsTransform } from '@d19n/models/dist/schema-manager/db/record/association/transform/db.record.association.records.transform';
import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaTypeEntity } from '@d19n/models/dist/schema-manager/schema/types/schema.type.entity';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';

import { getRecordFromShortListById, getRecordListFromShortListById } from '../../shared/utilities/recordHelpers';

import {
  addRecordToShortList,
  getRecordByIdRequest,
  IAddRecordToShortList,
  IGetRecordById,
  updateRecordByIdRequest,
} from '../../core/records/store/actions';
import { IRecordReducer } from '../../core/records/store/reducer';
import {
  getSchemaByIdRequest,
  getSchemaByModuleAndEntityRequest,
  ISchemaById,
  ISchemaByModuleAndEntity,
} from '../../core/schemas/store/actions';
import {
  getRecordAssociationsRequest,
  IGetRecordAssociations,
} from '../../core/recordsAssociations/store/actions';
import { IRecordAssociationsReducer } from '../../core/recordsAssociations/store/reducer';

import {
  getSchemaFromShortListByModuleAndEntity,
  getSchemaFromShortListBySchemaId,
} from '../../shared/utilities/schemaHelpers';

import { SchemaReducerState } from '../../core/schemas/store/reducer';
import { Card, Row, Col, Typography, Tag, Spin } from 'antd';
import { useEffect } from 'react';
import {
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';


type PathParams = {
  url: string,
  recordId: string,
  moduleName: string,
  entityName: string,
}
type Props = RouteComponentProps<PathParams> & {
  userReducer: any;
  title?: string;
  expandable?: any;
  nestedEntityName?: string;
  ignoreRelatedAssociationIdForNested?: boolean;
  schemaReducer: SchemaReducerState;
  recordReducer: IRecordReducer;
  recordAssociationReducer: IRecordAssociationsReducer;
  updateRecord: any;
  hidden?: string[];
  filters?: string[];
  isCreateHidden?: boolean;
  thumbnailSize?: number; // 8, 12, 24
  hideViewOptions?: boolean;
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) => {};
  getRecord: any,
  getSchemaById: (params: ISchemaById, cb: any) => {};
  getAssociationRecords: (
    params: IGetRecordAssociations,
  ) => {};
  shortListRecord: (params: IAddRecordToShortList) => {};
  getRecordById: (payload: IGetRecordById, cb: any) => {};
  sortRecords?: (records: DbRecordEntityTransform[]) => DbRecordEntityTransform[];
}
const { CRM_MODULE, ORDER_MODULE, BILLING_MODULE, FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;

const {
  INVOICE,
  ORDER,
  WORK_ORDER,
  ORDER_ITEM,
  INVOICE_ITEM,
  TRANSACTION,
  SERVICE_APPOINTMENT,
  CUSTOMER_DEVICE_ONT,
  CUSTOMER_DEVICE_ROUTER

} = SchemaModuleEntityTypeEnums;

export const EntityDetail = (props: Props) => {
  const {
    schemaReducer,
    nestedEntityName,
    filters,
    recordAssociationReducer,
    recordReducer,
    match,
    getAssociationRecords,
    getSchema,
    getSchemaById,
    getRecord,
  } = props;
  const { moduleName, entityName, recordId } = match.params;

  useEffect(() => {
    getRecordAssociations();
  }, [])
  const getRecordAssociations = () => {
    const currentSchema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
    getRecord({ schema: currentSchema, recordId });
    if (currentSchema) {
      const entities = getNestedEntities();
      getAssociationRecords({
        recordId: recordId,
        key: filters ? `${entityName}_${filters}` : entityName,
        schema: currentSchema,
        entities: entities,
        filters,
      });
    }
  }
  const getEntity = () => {
    if (entityName === ORDER) {
      return [ORDER_ITEM];
    }
    if (entityName === INVOICE) {
      return [INVOICE_ITEM, TRANSACTION];
    }
    return ORDER_ITEM
  }
  const getNestedEntities = () => {
    if (entityName === ORDER) {
      return [ORDER_ITEM];
    }
    if (entityName === INVOICE) {
      return [INVOICE_ITEM, TRANSACTION];
    }
    if (entityName === WORK_ORDER) {
      return [CUSTOMER_DEVICE_ONT, CUSTOMER_DEVICE_ROUTER, SERVICE_APPOINTMENT, 'ChangeReason']
    }
    return []
  }
  const formatDiscount = (value: string) => {
    if (Number(value)) {
      return `-£${value}`;
    }
    return "";
  }

  const formatPrice = (value: string) => {
    if (Number(value)) {
      return Number(value) > 0 ? `£${value}` : `-£${Math.abs(Number(value))}`;
    }
    return "";
  }
  const associationRecords: any = recordAssociationReducer.shortList[`${recordId}_${entityName}`];

  const renderOrderDetail = () => {
    const entityDetail: any = getRecordFromShortListById(recordReducer.shortList, recordId);
    if (!entityDetail) return null;
    let entityItems = [];
    if (associationRecords) {
      entityItems = associationRecords[ORDER_ITEM]?.dbRecords;
    }
    return <>
      <div className={'entity-number'}>{entityName} Number: {entityDetail?.recordNumber}</div>
      <Row className="entity-item entity-summary">
        <Col xs={24} lg={24} className="entity-summary-item"><b>Contract Type:{' '}</b>{entityDetail.properties.ContractType}</Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Contract Start Date:{' '}</b>{entityDetail.properties.ContractStartDate}</Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Contract End Date:{' '}</b>{entityDetail.properties.ContractEndDate} </Col>
      </Row>
      <Row className="order-item order-item-header">
        <Col xs={24} lg={4}>Product</Col>
        <Col className="text-right" xs={4} lg={4}>Quantity</Col>
        <Col className="text-right" xs={5} lg={4}>Price</Col>
        <Col className="text-right" xs={5} lg={4}>Discounted</Col>
        <Col className="text-right" xs={5} lg={4}>Tax</Col>
        <Col className="text-right" xs={5} lg={4}>Total</Col>
      </Row>
      {entityItems && entityItems.map((orderItem: any) => {
        return <Row className="order-item">
          <Col xs={24} lg={4}>{orderItem.title}</Col>
          <Col className="text-right" xs={4} lg={4}>{orderItem.properties.Quantity}</Col>
          <Col className="text-right" xs={5} lg={4}>£{orderItem.properties.UnitPrice}</Col>
          <Col className="text-right" xs={5} lg={4}>{formatDiscount(orderItem.properties.DiscountValue)}</Col>
          <Col className="text-right" xs={5} lg={4}>£{orderItem.properties.TotalTaxAmount}</Col>
          <Col className="text-right" xs={5} lg={4}>£{orderItem.properties.TotalPrice}</Col>
        </Row>
      })}
      <Row className="order-item summary">
        <Col xs={24} lg={4}><b>Summary</b></Col>
        <Col xs={4} lg={4}></Col>
        <Col className="text-right" xs={5} lg={4}>£{entityDetail?.properties?.Subtotal}</Col>
        <Col className="text-right" xs={5} lg={4}>{formatDiscount(entityDetail?.properties?.TotalDiscounts)}</Col>
        <Col className="text-right" xs={5} lg={4}>£{entityDetail?.properties?.TotalTaxAmount}</Col>
        <Col className="text-right" xs={5} lg={4}>£{entityDetail?.properties?.TotalPrice}</Col>
      </Row>
    </>
  }

  const renderInvoiceDetail = () => {
    const entityDetail: any = getRecordFromShortListById(recordReducer.shortList, recordId);
    let entityItems = [];
    let transactionItems = [];
    if (associationRecords) {
      entityItems = associationRecords[INVOICE_ITEM]?.dbRecords;
      entityItems = entityItems?.sort((a: any, b: any) => {
        const aType = a.properties.Type;
        const bType = getProperty(b, 'Type');
        if (aType === bType) return 0;
        else if (aType === 'PRODUCT' && bType === 'ADJUSTMENT') return -1;
        else if (aType === 'ADJUSTMENT' && bType === 'PRODUCT') return 1;
        else return 0;
      });
      transactionItems = associationRecords[TRANSACTION]?.dbRecords;
    }
    if (!entityDetail) {
      return <></>
    }
    const renderStatus = (statusValue: string) => {
      let color = "default";
      let icon = <CheckCircleOutlined />
      switch (statusValue) {
        case "PAID":
          color = "success";
          icon = <CheckCircleOutlined />;
          break;
        case "ERROR":
          color = "error";
          icon = <CloseCircleOutlined />;
          break;
        case "VOID":
          color = "warning";
          icon = <ExclamationCircleOutlined />;
          break;
        case "SCHEDULED":
          color = "default";
          icon = <ClockCircleOutlined />;
          break;
        case "DRAFT":
          color = "default";
          icon = <EditOutlined />;
          break;
        default:
          color = "default";
          icon = <CheckCircleOutlined />;
      }
      if (statusValue === 'ERROR') {
        color = "error"
      }
      return (<Tag icon={icon} color={color}>
        {statusValue}
      </Tag>)
    }
    return <>
      <div className={'entity-number'}>
        <span>{entityName} Number: {entityDetail?.recordNumber}</span>
        <span>{renderStatus(getProperty(entityDetail, 'Status'))}</span>
      </div>
      <Row className="entity-item entity-summary">
        <Col xs={12} lg={12} className="entity-summary-item"><b>Billing period:{' '}</b>{entityDetail.properties.BillingPeriodStart} → {entityDetail.properties.BillingPeriodEnd}</Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Address:{' '}</b>{entityDetail.title} </Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Issued Date:{' '}</b>{entityDetail.properties.IssuedDate}</Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Bill to:{' '}</b>{props.userReducer.user.firstname}{' '}{' '}{props.userReducer.user.lastname}</Col>
        <Col xs={12} lg={12} className="entity-summary-item"><b>Due Date:{' '}</b>{entityDetail.properties.DueDate} </Col>
      </Row>
      <Card bordered={false} style={{ border: 'none', boxShadow: 'none' }}>
        <Row className="entity-item entity-item-header border-bottom">
          <Col xs={16} lg={16}>Products</Col>
          <Col className="text-right" xs={4} lg={4}>Quantity</Col>
          <Col className="text-right" xs={4} lg={4}>Amount</Col>
        </Row>
        {entityItems && entityItems.map((orderItem: any) => {
          return <Row className="entity-item" key={orderItem.id}>
            <Col xs={16} lg={16}>{orderItem.title}</Col>
            <Col className="text-right" xs={4} lg={4}>{orderItem.properties.Quantity}</Col>
            <Col className="text-right" xs={4} lg={4}>{formatPrice(`${orderItem.properties.UnitPrice * orderItem.properties.Quantity}`)}</Col>
          </Row>
        })}
        <Row className="entity-item border-top">
          <Col xs={12}>Subtotal</Col>
          <Col xs={12} className="text-right">£{entityDetail.properties.Subtotal}</Col>
        </Row>
        <Row className="entity-item ">
          <Col xs={12}>Additional Discounts</Col>
          <Col xs={12} className="text-right">-£{entityDetail.properties.DiscountValue}</Col>
        </Row>
        <Row className="entity-item ">
          <Col xs={12}>Total Net</Col>
          <Col xs={12} className="text-right">£{(entityDetail.properties.TotalDue - entityDetail.properties.TotalTaxAmount).toFixed(2)}</Col>
        </Row>
        <Row className="entity-item ">
          <Col xs={12}>Total VAT (incl.)</Col>
          <Col xs={12} className="text-right">£{entityDetail.properties.TotalTaxAmount}</Col>
        </Row>
        <Row className="entity-item border-top">
          <Col xs={12}><b>Total Due</b></Col>
          <Col xs={12} className="text-right">£{entityDetail.properties.TotalDue}</Col>
        </Row>
        <Row className="entity-item ">
          <Col xs={12}><b>Balance</b></Col>
          <Col xs={12} className="text-right">£{entityDetail.properties.Balance}</Col>
        </Row>
      </Card>
      <Card title={<Typography.Title level={4}>Transactions</Typography.Title>} bordered={false} style={{ border: 'none', boxShadow: 'none' }}>
        <Row className="order-item order-item-header">
          <Col xs={24} lg={6}>Title</Col>
          <Col className="text-right" xs={8} lg={6}>Amount</Col>
          <Col className="text-right" xs={8} lg={6}>Status</Col>
          <Col className="text-right" xs={8} lg={6}>Paid Out Date</Col>
        </Row>
        {transactionItems && transactionItems.map((item: any) => {
          return <Row className="order-item" key={item.id}>
            <Col xs={24} lg={6}>{item.title}</Col>
            <Col className="text-right" xs={8} lg={6}>£{item.properties.Amount}</Col>
            <Col className="text-right" xs={8} lg={6}>{item.properties.Status}</Col>
            <Col className="text-right" xs={8} lg={6}>{item.properties.Status === 'PAID_OUT' ? item.properties.StatusUpdatedAt : ''}</Col>
          </Row>
        })}
      </Card>
    </>
  }

  const renderWorkOrderDetail = () => {
    const entityDetail: any = getRecordFromShortListById(recordReducer.shortList, recordId);
    if (!associationRecords) {
      return <></>
    }
    const appointmentItems = associationRecords[SERVICE_APPOINTMENT]?.dbRecords;
    const changeReasonItems = associationRecords['ChangeReason']?.dbRecords;
    return <>
      <Card className="text-detail" bordered={false}>
        <Typography.Text >{entityDetail.recordNumber}</Typography.Text><br/>
        <Typography.Text >{entityDetail.title}</Typography.Text><br/>
        <Typography.Text >{entityDetail.type}</Typography.Text>
      </Card>
      <Card title={<Typography.Title level={4}>ServiceAppointment</Typography.Title>} bordered={false} style={{ border: 'none', boxShadow: 'none' }}>
        <Row className="order-item order-item-header">
          <Col xs={5} lg={5}>Record</Col>
          <Col xs={5} lg={5}>Type</Col>
          <Col xs={5} lg={5}>Date Of Service Appointment</Col>
          <Col xs={4} lg={4}>Ex Polygon Id</Col>
          <Col xs={5} lg={5}>Type Of Service Appointment</Col>
        </Row>
        {appointmentItems && appointmentItems.map((item: any) => {
          return <Row className="order-item" key={item.id}>
            <Col xs={5} lg={5}>{item.recordNumber}</Col>
            <Col xs={5} lg={5}>{getProperty(item,"Type")}</Col>
            <Col xs={5} lg={5}>{getProperty(item,"Date")}</Col>
            <Col xs={4} lg={4}>{getProperty(item,"ExPolygonId")}</Col>
            <Col xs={5} lg={5}>{getProperty(item,"TimeBlock")}</Col>
          </Row>
        })}
      </Card>
      <Card title={<Typography.Title level={4}>ChangeReason (SA_RESCHEDULE)</Typography.Title>} bordered={false} style={{ border: 'none', boxShadow: 'none' }}>
        <Row className="order-item order-item-header" gutter={8}>
          <Col xs={24} lg={4}>Type</Col>
          <Col xs={8} lg={5}>Appointment Date</Col>
          <Col xs={8} lg={5}>Reschedule Reason</Col>
          <Col xs={8} lg={5}>Time Block</Col>
          <Col xs={8} lg={5}>Description</Col>
        </Row>
        {changeReasonItems && changeReasonItems.map((item: any) => {
          return <Row className="order-item" key={item.id} gutter={8}>
            <Col xs={24} lg={4}>{item.type}</Col>
            <Col xs={8} lg={5}>{getProperty(item, 'AppointmentDate')}</Col>
            <Col xs={8} lg={5}>{getProperty(item, 'RescheduleReason')}</Col>
            <Col xs={8} lg={5}>{getProperty(item, 'TimeBlock')}</Col>
            <Col xs={8} lg={5}>{getProperty(item, 'Description')}</Col>
          </Row>
        })}
      </Card>
    </>
  }

  return (
    <div className="order-detail">
      <Spin spinning={schemaReducer.isRequesting || recordAssociationReducer.isRequesting || recordReducer.isRequesting}>
      <Card title={<Typography.Title level={3}>{entityName} Detail</Typography.Title>}>
        {entityName === ORDER && renderOrderDetail()}
        {entityName === INVOICE && renderInvoiceDetail()}
        {entityName === WORK_ORDER && renderWorkOrderDetail()}
      </Card>
      </Spin>
    </div>

  )
}

const mapStateToProps = (state: any) => ({
  schemaReducer: state.schemaReducer,
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  userReducer: state.userReducer,
})

const mapDispatchToProps = (dispatch: any) => ({
  shortListRecord: (params: IAddRecordToShortList) =>
    dispatch(addRecordToShortList(params)),
  getRecordById: (payload: IGetRecordById, cb: any) =>
    dispatch(getRecordByIdRequest(payload, cb)),
  getSchema: (payload: ISchemaByModuleAndEntity, cb: any) =>
    dispatch(getSchemaByModuleAndEntityRequest(payload, cb)),
  getSchemaById: (payload: ISchemaById, cb: any) =>
    dispatch(getSchemaByIdRequest(payload, cb)),
  updateRecord: (params: any, cb: any) =>
    dispatch(updateRecordByIdRequest(params, cb)),
  getAssociationRecords: (
    params: IGetRecordAssociations,
  ) => dispatch(getRecordAssociationsRequest(params)),
  getRecord: (payload: IGetRecordById, cb: any) => dispatch(getRecordByIdRequest(payload, cb)),
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(EntityDetail));
