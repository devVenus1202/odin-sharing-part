import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Card, Col, Row, Tag, Tooltip } from 'antd';
import React from 'react';
import StageNameTag from '../../../../shared/components/StageNameTag';
import { Link } from 'react-router-dom'
import moment from "moment";
import './styles.scss'

interface Props {
  result: DbRecordEntityTransform,
  onClose: any,
  globalCollapsed: boolean
}

interface State {
  collapsed: boolean
}

class JobSideBarListCard extends React.Component<Props, State> {

  constructor(props: any) {
    super(props)
    this.state = { collapsed: true }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>) {
    if (!prevProps.globalCollapsed && this.props.globalCollapsed) {
      this.setState({ collapsed: true })
    }
    if (prevProps.globalCollapsed && !this.props.globalCollapsed) {
      this.setState({ collapsed: false })
    }
  }

  render() {
    const result = this.props.result;

    return (
      <Card
        style={{ marginBottom: 12 }}
        className="jobCard"
        size="small"
        title={
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Link to={`/ProjectModule/Job/${result.id}`} target="_blank">
                <span>{result.recordNumber}</span>
              </Link>
            </Col>
          </Row>
        }>

        <Row style={{ marginTop: 2 }}>
          <Col span={18}>
            <span style={{fontWeight:600}}>Job title</span>
          </Col>
          <Col span={6} style={{textAlign:'right'}}>
            <span style={{fontWeight:600}}>Stage</span>
          </Col>
        </Row>

        <Row style={{ marginTop: 2 }}>
          <Col span={18}>
            <span>{result.title}</span>
          </Col>
          <Tooltip title="Job Stage">
            <Col span={6} style={{textAlign:'right'}}>
              {
                result && result.stage ?
                  <StageNameTag record={result} text={result.stage ? result.stage.name : 'None'} size="small"/>
                  : <Tag style={{ margin: 0 }}>Unknown</Tag>
              }
            </Col>
          </Tooltip>
        </Row>

        <Row style={{ marginTop: 10 }}>
          <Col span={24}>
            <span style={{fontWeight:600}}>Updated by</span>
          </Col>
        </Row>

        <Row style={{marginTop:2}}>
          <Col span={24}>
            {
              result?.lastModifiedBy
              ? <span>{result.lastModifiedBy!.fullName}</span>
              : <span>Unknown</span>
            }
            {
              result?.lastModifiedBy
                ? <span> {moment(result.updatedAt!).format('YYYY-MM-DD HH:mm:ss')}</span>
                : <span> Unknown date & time</span>
            }
          </Col>
        </Row>

      </Card>
    )
  }
}

export default JobSideBarListCard
