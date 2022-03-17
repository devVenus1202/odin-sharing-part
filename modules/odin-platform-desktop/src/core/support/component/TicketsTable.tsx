import React from 'react'
import { Table, Tag, Space } from 'antd';
import { timeAgo } from "../../../shared/utilities/dateHelpers";

interface Props {
  dataSource: any, 
  onClickRow: any,
  loading?: boolean
} 
function TicketsTable(props: Props) {
  const {dataSource, onClickRow, loading} = props;
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number | undefined>(10);
  const columns = [
    {
      title: 'Ticket ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (value:any) => value || 'Untitled'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (value:any) => value || '-'
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'type',
      render: (value:any) => value || '-'
    },
    {
      title: 'Updated Date',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (value: any) => {
        return timeAgo(value)
      }
    },
  ];
  return (
    <Table 
      dataSource={dataSource} 
      columns={columns} 
      size='small'
      onRow={(record, rowIndex) => {
        return {
          onClick: event => {
            onClickRow(record)
          }, // click row
          onDoubleClick: event => {}, // double click row
          onContextMenu: event => {}, // right button click row
          onMouseEnter: event => {}, // mouse enter row
          onMouseLeave: event => {}, // mouse leave row
        };
      }}
      loading={loading}
      pagination={{
        onChange(page:number, pageSize: number | undefined) {
          setPage(page);
          setPageSize(pageSize);
        },
        position: ['bottomCenter']
      }} />
  )
}

export default TicketsTable
