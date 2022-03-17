import React from 'react'
import { connect } from 'react-redux';
import { Drawer, Button, Typography, Form, Input, InputNumber, Select, Card, Comment, List, Menu, Dropdown, message, Space, Tooltip } from 'antd'
import { updateZdTicketRequest, getCommentsRequest, createZdTicketCommentRequest, IGetZdComments, ICreateZdComment, IUpdateZdTicket, IZDTicketPerspectives } from '../../../core/support/store/actions';
import { timeAgo } from "../../../shared/utilities/dateHelpers";
import { } from 'antd';
import { DownOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect } from 'react';

interface Props {
  ticket: any,
  visible: boolean,
  onClose: any,
  getComments: any,
  createComment: any,
  supportReducer: any,
  userReducer: any,
  identityConnectedAppsReducer: any
}
function ZDTicketDetail(props: Props) {
  const {visible, ticket, onClose, getComments, supportReducer, userReducer, createComment, identityConnectedAppsReducer} = props;
  useEffect(() => {
    if (ticket) {
      getComments({ ticketId: ticket.id, perspective: IZDTicketPerspectives.TICKET });
    }
  }, [ticket])
  
  const [form] = Form.useForm();
  const onFinish = (values: any) => {
    const { zendeskUserId } = userReducer.user;
    createComment({ ...values, authorId: zendeskUserId, ticketId: ticket.id });
    form.resetFields();
  };

  const { comments, isRequestingComments } = supportReducer;
  const zendeskAppLink = identityConnectedAppsReducer.list.find((item:any) => item.name === 'ZENDESK_SUPPORT');
  return (
    <Drawer title="Ticket Detail" placement="right" visible={visible} onClose={onClose} width={500}>
      <a href={`${zendeskAppLink.baseUrl}/tickets/${ticket.id}`} target="_blank">{`${zendeskAppLink.baseUrl}/tickets/${ticket.id}`}</a>
      <br/>
      <Typography.Title level={5}>
        Subject
      </Typography.Title>
      <Typography.Text>
        {ticket.subject}
      </Typography.Text>
      <Typography.Title level={5}>
        Description
      </Typography.Title>
      <Typography.Text>
        {ticket.description}
      </Typography.Text>
      <Typography.Title level={5}>
        Due Date
      </Typography.Title>
      <Typography.Text>
        {ticket.due_date}
      </Typography.Text>
      <Form layout="vertical" name="nest-messages" onFinish={onFinish} form={form}  >
        <Form.Item name={['body']} label="Comment" 
          rules={[{ 
            required: true,
            message: 'Please input your name',
          }]}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item style={{ textAlign: 'right' }}>
          <Button htmlType="button">
            Clear
          </Button>
          &nbsp;
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </Form.Item>
      </Form>
      <List
          className="comment-list"
          header={`${comments.length} comments`}
          itemLayout="horizontal"
          loading={isRequestingComments}
          dataSource={comments}
          renderItem={(item: any) => (
            <li>
              <Comment
                actions={item.actions}
                author={item.author_id == userReducer.user.zendeskUserId ? userReducer.user.firstname : 'Agent'}
                avatar={item.avatar}
                content={<div dangerouslySetInnerHTML={{ __html: item.html_body }}></div>}
                datetime={timeAgo(item.created_at)}
              />
            </li>
          )}
        />
    </Drawer>)
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  supportReducer: state.supportReducer,
  identityConnectedAppsReducer: state.identityConnectedAppsReducer
});

const mapDispatch = (dispatch: any) => ({
  updateTicket: (payload: IUpdateZdTicket, cb: any) => dispatch(updateZdTicketRequest(payload)),
  getComments: (payload: IGetZdComments, cb: any) => dispatch(getCommentsRequest(payload)),
  createComment: (payload: ICreateZdComment, cb: any) => dispatch(createZdTicketCommentRequest(payload))
});

export default connect(mapState, mapDispatch)(ZDTicketDetail);