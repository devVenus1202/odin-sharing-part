import React from 'react'
import { List, Avatar } from 'antd';
import { timeAgo } from "../../../shared/utilities/dateHelpers";
interface Props {
  ticket: any;
  onClick: any;
}
export default function Ticket(props: Props) {
  const { ticket, onClick } = props;
  return (
    // <div className="ticket" onClick={onClick}>
    //   <div className="subject">{ticket.subject}</div>
    //   <div className="description">{ticket.description}</div>
    // </div>
    <List.Item onClick={onClick} className="ticket">
      <List.Item.Meta
        title={ticket.subject}
        description={ticket.description}
      />
      <div><i>{ticket.priority}</i></div>
      <div><i>{ticket.type}</i></div>
      <div><i>Updated {timeAgo(ticket.updated_at)}</i></div>
    </List.Item>
  )
}
