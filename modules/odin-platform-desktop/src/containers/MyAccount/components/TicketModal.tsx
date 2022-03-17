import React, { useEffect } from 'react'
import { connect } from 'react-redux';
import { Button, Modal, Typography, Form, Input, InputNumber, Select, Card, Comment, List, Menu, Dropdown, message, Space, Tooltip } from 'antd'
import { 
  updateZdTicketRequest, 
  getCommentsRequest, 
  createZdTicketCommentRequest, 
  getZdTicketsRequest,
  IGetZdComments, 
  ICreateZdComment, 
  IUpdateZdTicket, 
  IGetZdTickets} from '../../../core/support/store/actions';
import { timeAgo } from "../../../shared/utilities/dateHelpers";
import { DownOutlined, UserOutlined } from '@ant-design/icons'
import RichEditor from '../../../core/support/component/RichEditor';
const { Title } = Typography;
interface Props {
  ticket: any,
  visible: boolean,
  title: string,
  onOk: any,
  onCancel: any,
  footer: any,
  getComments: any,
  createComment: any,
  supportReducer: any,
  userReducer: any,
  updateTicket: any,
  getTickets: any
}
const TicketModal = (props: Props) => {
  const { ticket, userReducer, createComment, getComments, supportReducer, updateTicket, getTickets } = props;
  const [status, setStatus] = React.useState(ticket.status);
  const [showCommentEditor, setShowCommentEditor] = React.useState(false);
  useEffect(() => {
    getComments({ ticketId: ticket.id, perspective: 'request' });
    setStatus(ticket.status);
    setShowCommentEditor(false);
    return () => {
      setShowCommentEditor(false);
    }
  }, [ticket]);
  const [form] = Form.useForm();
  const onFinish = (values:any) => {
    const { zendeskUserId } = userReducer.user;
    createComment({ ...values, authorId: zendeskUserId, ticketId: ticket.id });
    form.resetFields();
    setShowCommentEditor(false);
  };
  const closeTicket = () => {

  };
  const { comments, isRequestingComments } = supportReducer;

  const handleMenuClick = (e: any) => {
    // message.info('Click on menu item.');
    setStatus(e.key);
    updateTicket({ solved: e.key === 'solved', ticketId: ticket.id }, (res: any) => {
      const userId = userReducer.user.zendeskUserId;
      getTickets({ userId });
    });
  }

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="open">
        Open
      </Menu.Item>
      <Menu.Item key="solved">
        Solved
      </Menu.Item>
      {/* <Menu.Item key="closed">
        Closed
      </Menu.Item> */}
    </Menu>
  );

  return (
    <Modal
      {...props}
      className={`ticket-detail-modal`}
    >
      <div>
        <Dropdown overlay={menu}>
          <Button style={{ textTransform: 'capitalize' }} color="primary">
            {status} <DownOutlined />
          </Button>
        </Dropdown>
      </div>
      <br />
      {/* <div>
        <Title level={5}>{ticket.subject}</Title>
      </div> */}
      <div>
        {ticket.description}
      </div>
      <br />

      <Form layout="vertical" name="nest-messages" onFinish={onFinish} form={form}  >
        <Form.Item name={['html_body']} label="Comment" rules={[{ required: true, message: 'Please input your comment' }]}>
          {!showCommentEditor && <Input 
            className={`comment-input-${showCommentEditor ? "hide" : "show"}`}
            onFocus={() => { setShowCommentEditor(true) }} 
            placeholder="Add you comment"/>}
          {showCommentEditor && <RichEditor className="" onChange={(rawHtml: string) => {
            form.setFieldsValue({html_body: rawHtml})
          }}/>}
        </Form.Item>
        {showCommentEditor && <Form.Item style={{ textAlign: 'right' }}>
          <Button htmlType="button" onClick={() => { setShowCommentEditor(false) }}>
            Cancel
          </Button>
          &nbsp;
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </Form.Item>}
      </Form>
      <div>
        <List
          className="comment-list"
          header={`${comments.length} replies`}
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
      </div>
    </Modal>
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  supportReducer: state.supportReducer
});

const mapDispatch = (dispatch: any) => ({
  updateTicket: (payload: IUpdateZdTicket, cb: any) => dispatch(updateZdTicketRequest(payload, cb)),
  getComments: (payload: IGetZdComments, cb: any) => dispatch(getCommentsRequest(payload)),
  createComment: (payload: ICreateZdComment, cb: any) => dispatch(createZdTicketCommentRequest(payload)),
  getTickets: (payload: IGetZdTickets, cb: any) => dispatch(getZdTicketsRequest(payload))
});

export default connect(mapState, mapDispatch)(TicketModal);
