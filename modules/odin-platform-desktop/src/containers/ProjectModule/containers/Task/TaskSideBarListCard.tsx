import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { Button, Card } from 'antd';
import React from 'react';
import StageNameTag from '../../../../shared/components/StageNameTag';
import JobSideBarListView from '../Job/JobSideBarListView';

interface Props {
  result: DbRecordEntityTransform,
  cardType?: 'inner'
  onClose: any,
  globalCollapsed: boolean
}

interface State {
  collapsed: boolean
}

class TaskSideBarListCard extends React.Component<Props, State> {

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
    const { result, cardType } = this.props;

    return (
      <Card
        style={{ marginBottom: 8 }}
        type={cardType}
        size="small"
        title={<span> {result.recordNumber} {result.title}</span>}>
        <p>
          {/* Stage */}
          <p>
            <span>Stage</span>
            <br/>
            <span style={{ fontWeight: 'bold' }}>
              <StageNameTag record={result} text={result.stage ? result.stage.name : ''}/>
            </span>
          </p>
          <p>
            <span>Chain</span>
            <br/>
            <span>
              {getProperty(result, 'UniqueRef')}
            </span>
          </p>
          <p>
            <span>Jobs</span>
            <br/>
            <Button size="small" onClick={() => this.setState({ collapsed: !this.state.collapsed })}>show jobs
              +</Button>
            <br/>
            {!this.state.collapsed && <JobSideBarListView
                moduleName={'ProjectModule'}
                entityName={'Job'}
                recordId={result.id}
            />}
          </p>
        </p>
        {this.props.children}
      </Card>
    )
  }
}

export default TaskSideBarListCard
