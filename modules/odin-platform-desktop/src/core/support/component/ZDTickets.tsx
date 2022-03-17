import React, { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, List, Select, Card, Spin, Tabs, DatePicker, AutoComplete } from 'antd'

import CardWithTabs from '../../../shared/components/CardWithTabs';
import { connect } from 'react-redux';
import { getZdTicketsRequest, createZdTicketRequest, IGetZdTickets, ICreateZdTicket } from '../store/actions';

import TicketsTable from './TicketsTable';
import { setDbRecordState } from '../../records/store/actions';
import ZDTicketDetail from './ZDTicketDetail';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';

const { CONTACT } = SchemaModuleEntityTypeEnums;
enum IZDTicketTypes {
  PROBLEM = "problem",
  INCIDENT = "incident",
  QUESTION = "question",
  TASK = "task"
}

const { TabPane } = Tabs;
const { Option } = Select;

function callback(key: string) {
  console.log(key);
}
interface Props {
  userReducer: any,
  supportReducer: any,
  record: any
  getTickets: any,
  createTicket: any,
  recordAssociationReducer: any,
}

const createTicketFormlayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 24 },
};

function ZDTickets(props: Props) {
  const { record, getTickets, userReducer, createTicket, supportReducer, recordAssociationReducer } = props;
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(false);
  const tickets = supportReducer.list;

  useEffect(() => {
    if (record) {
      getTickets({ externalId: record.id });
    }
  }, [record])

  const handleOk = () => {
  }
  const handleCancel = () => {
    setShowModal(false);
  }
  const [form] = Form.useForm();
  const onFinish = (values: any) => {
    // form.resetFields();
    const { zendeskUserId } = userReducer.user;
    const externalId = record.id;
    const submitter_id = userReducer.user.zendeskUserId;
    createTicket({ ...values, external_id: externalId, submitter_id, perspective:'ticket', zendeskUserId });
    setShowModal(false);
  };
  const validateMessages = {
    required: '${label} is required!',
    types: {
      email: '${label} is not a valid email!',
      number: '${label} is not a valid number!',
    },
    number: {
      range: '${label} must be between ${min} and ${max}',
    },
  };

  const openCreateTicket = () => {
    form.resetFields();
    setShowModal(true);
  }
  const showTicketDetail = (ticket: any) => {
    setCurrentTicket(ticket)
    setShowDetail(true);
  }
  const hideTicketDetail = () => {
    setShowDetail(false);
  }
  
  
  const contactAssociationKey = `${record?.id}_${CONTACT}`;
  const contactAssociationObj: any = recordAssociationReducer.shortList[contactAssociationKey];
  const contactList = contactAssociationObj?contactAssociationObj[CONTACT]?.dbRecords || [] : [];
  
  return (
    <>
      <ZDTicketDetail visible={showDetail} onClose={hideTicketDetail} ticket={currentTicket} />
      <Modal
          visible={showModal}
          title="Create New Ticket"
          onOk={handleOk}
          onCancel={handleCancel}
          footer={null}
        >
          <Form {...createTicketFormlayout} layout="vertical" name="nest-messages" form={form} onFinish={onFinish} validateMessages={validateMessages}>
            <Form.Item name={['subject']} label="Subject" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={['comment', 'body']} label="Description" rules={[{ required: true }]}>
              <Input.TextArea />
            </Form.Item>
            <Form.Item label="Type"  name={['type']}>
              <Select>
                  <Select.Option value={IZDTicketTypes.PROBLEM}>{IZDTicketTypes.PROBLEM}</Select.Option>
                  <Select.Option value={IZDTicketTypes.INCIDENT}>{IZDTicketTypes.INCIDENT}</Select.Option>
                  <Select.Option value={IZDTicketTypes.QUESTION}>{IZDTicketTypes.QUESTION}</Select.Option>
                  <Select.Option value={IZDTicketTypes.TASK}>{IZDTicketTypes.TASK}</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Due Date"  name={['due_date']}>
              <DatePicker />
            </Form.Item>
            <Form.Item label="Requester" name={['custom_fields',0,'value' ]}>
              <Select>
                {contactList.map((contact:any, index:number) => <Option value={contact.id}>{contact.title}</Option> )}
              </Select>
            </Form.Item>
            <Form.Item style={{ textAlign: 'right' }}>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              &nbsp;
              <Button htmlType="button" onClick={handleCancel}>
                Close
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      <CardWithTabs
        title="Zendesk Tickets"
        defaultTabKey="Open"
        extra={[
          <Button type="primary" onClick={openCreateTicket}>Create New Ticket</Button>
        ]}
        
        tabList={[
          {
            key: 'Open',
            tab: 'Open'
          },
          {
            key: 'Solve',
            tab: 'Solve'
          }
        ]}
        key={tickets.length}
        contentList={{
          Open: <TicketsTable  dataSource={tickets} onClickRow={showTicketDetail} loading={supportReducer.isRequesting} />,
          Solve: <TicketsTable   dataSource={tickets.filter((t: any) => t.status === 'solve')} onClickRow={showTicketDetail} loading={supportReducer.isRequesting}></TicketsTable>,
        }}
      ></CardWithTabs>
    </>
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  supportReducer: state.supportReducer,
  recordAssociationReducer: state.recordAssociationReducer,
});

const mapDispatch = (dispatch: any) => ({
  getTickets: (payload: IGetZdTickets, cb: any) => dispatch(getZdTicketsRequest(payload)),
  createTicket: (payload: ICreateZdTicket, cb: any) => dispatch(createZdTicketRequest(payload)),
});

export default connect(mapState, mapDispatch)(ZDTickets);

