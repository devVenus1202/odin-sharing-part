import React, { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, List, Select, Card, Spin, Tabs } from 'antd'
import { httpPost, httpGet } from '../../shared/http/requests';
import { RouteComponentProps, withRouter, Switch, Redirect, Route, Router } from 'react-router-dom';
import { connect } from 'react-redux';
import { getZdTicketsRequest, createZdTicketRequest, IGetZdTickets, ICreateZdTicket } from '../../core/support/store/actions';
import Ticket from './components/Ticket';
import TicketModal from './components/TicketModal';
import TicketsTable from '../../core/support/component/TicketsTable';
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 24 },
};
const { TabPane } = Tabs;
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
interface PropsType {
  userReducer: any,
  supportReducer: any,
  getTickets: any,
  createTicket: any
}

const Support = (props: PropsType) => {

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const { userReducer, supportReducer, getTickets, createTicket } = props;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const tickets = supportReducer.list;
  useEffect(() => {
    const userId = userReducer.user.zendeskUserId;
    getTickets({ userId });
  }, [userReducer])
  const handleOk = () => {
  }
  const handleCancel = () => {
    setShowModal(false);
  }
  const [form] = Form.useForm();
  const onFinish = (values: any) => {
    form.resetFields();
    const { zendeskUserId } = userReducer.user;
    createTicket({ ...values, perspective:'request', zendeskUserId });
    setShowModal(false);
  };

  const closeTicket = () => {}
  return (
    <Spin spinning={supportReducer.isRequesting} >
      <Card
        title={'Support'}
        className="support-page"
        extra={<Button type="primary" onClick={() => setShowModal(true)}>Send Request</Button>} >
        {currentTicket && <TicketModal
          ticket={currentTicket}
          visible={showDetailModal}
          title={currentTicket?.subject}
          onOk={() => {
            setShowDetailModal(false);
          }}
          onCancel={() => {
            setShowDetailModal(false);
          }}
          footer={null}
        ></TicketModal>}
        <Modal
          visible={showModal}
          title="Create New Request"
          onOk={handleOk}
          onCancel={handleCancel}
          footer={null}
        >
          <Form {...layout} layout="vertical" name="nest-messages" form={form} onFinish={onFinish} validateMessages={validateMessages}>
            <Form.Item name={['subject']} label="Subject" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={['comment', 'body']} label="Description" rules={[{ required: true }]}>
              <Input.TextArea />
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

        <div className="tickets">
          <Tabs defaultActiveKey="1" style={{}}>
          <TabPane tab="New" key="1">
              <TicketsTable
                dataSource={tickets.filter((t: any) => t.status === 'new')}
                onClickRow={(ticket: any) => {
                  setShowDetailModal(true);
                  setCurrentTicket(ticket);
                }}
              />  
            </TabPane>
            <TabPane tab="Open" key="2">
              <TicketsTable
                dataSource={tickets.filter((t: any) => t.status === 'open')}
                onClickRow={(ticket: any) => {
                  setShowDetailModal(true);
                  setCurrentTicket(ticket);
                }}
              />
            </TabPane>
            <TabPane tab="Solved" key="3">
              <TicketsTable
                dataSource={tickets.filter((t: any) => t.status === 'solved')}
                onClickRow={(ticket: any) => {
                  setShowDetailModal(true);
                  setCurrentTicket(ticket);
                }}
              />
              {/* <List
                itemLayout="horizontal"
                dataSource={tickets.filter((t:any) => t.status === 'solve')}
                renderItem={(ticket: any) => (
                  <Ticket key={ticket.id} ticket={ticket} onClick={() => {
                    setShowDetailModal(true);
                    setCurrentTicket(ticket);
                  }} />)} /> */}
            </TabPane>
          </Tabs>

        </div>
      </Card>
    </Spin>
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  supportReducer: state.supportReducer
});

const mapDispatch = (dispatch: any) => ({
  getTickets: (payload: IGetZdTickets, cb: any) => dispatch(getZdTicketsRequest(payload)),
  createTicket: (payload: ICreateZdTicket, cb: any) => dispatch(createZdTicketRequest(payload)),
});


export default connect(mapState, mapDispatch)(Support);
