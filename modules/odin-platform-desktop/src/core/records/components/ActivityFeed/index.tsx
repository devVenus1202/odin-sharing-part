import { CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { LogsConstants } from '@d19n/models/dist/logs/logs.constants';
import { LogsUserActivityEntity } from '@d19n/models/dist/logs/user-activity/logs.user.activity.entity';
import { Empty, Popover, Select, Spin, Tag, Timeline } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import Title from 'antd/lib/typography/Title';
import React from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { changeToCapitalCase } from '../../../../shared/utilities/dataTransformationHelpers';
import { parseDateLocalizedHoursAndSeconds } from '../../../../shared/utilities/dateHelpers';
import {
  getRecordFromShortListById,
  getRecordRelatedFromShortListById,
  splitModuleAndEntityName,
} from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListBySchemaId } from '../../../../shared/utilities/schemaHelpers';
import { IdentityGroupsReducer } from '../../../identityGroups/store/reducer';
import { IRecordAssociationsReducer } from '../../../recordsAssociations/store/reducer';
import { SchemaReducerState } from '../../../schemas/store/reducer';
import { getRecordAuditLogs, IGetRecordAuditLogs } from '../../auditLogs/store/actions';

type PathParams = {

  url: string,
  recordId: string

}

type Props = RouteComponentProps<PathParams> & {
  match: any,
  location: any,
  recordReducer: any,
  recordAssociationReducer: IRecordAssociationsReducer,
  schemaReducer: SchemaReducerState,
  auditLogsReducer: any,
  getAuditLogs: (params: IGetRecordAuditLogs, cb?: any) => {},
  identityGroupsReducer: IdentityGroupsReducer,
  dbRecordAssociationId?: string | undefined,
  recordId?: string | undefined
}

interface State {
  filterEventType: string,
}

const ElementFooter = ({ elem }: { elem: any }) => (
  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <span style={{ fontSize: 12 }}><CalendarOutlined/> {parseDateLocalizedHoursAndSeconds(elem?.createdAt)}</span>
    <span>
      <Popover
        title={elem?.type}
        content={
          <pre>{JSON.stringify(elem?.revision, null, 2)}</pre>
        }
      >
        <a><InfoCircleOutlined/> view details</a>
      </Popover>
    </span>
  </div>
)

class RecordActivityFeed extends React.Component<Props, State> {

  state = { filterEventType: '' };

  constructor(props: Props) {
    super(props);
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (this.props.recordId) {
      if (prevProps?.recordId !== this.props?.recordId) {
        this.setState({
          filterEventType: '',
        });
      }
    } else {
      if (prevProps.match?.params?.recordId !== this.props.match?.params?.recordId) {
        this.setState({
          filterEventType: '',
        });
      }
    }
  }

  private renderFilterOptions() {
    const res: any = [];
    res.push(<Select.Option key="1" value="">All</Select.Option>);

    const eventTypes = [
      LogsConstants.DB_RECORD_CREATED,
      LogsConstants.DB_RECORD_UPDATED,
      LogsConstants.DB_RECORD_DELETED,
      LogsConstants.DB_RECORD_RESTORED,
      LogsConstants.DB_RECORD_MERGED,
      LogsConstants.DB_RECORD_STAGE_UPDATED,
      LogsConstants.DB_RECORD_ASSOCIATION_CREATED,
      LogsConstants.DB_RECORD_ASSOCIATION_UPDATED,
      LogsConstants.DB_RECORD_ASSOCIATION_DELETED,
      LogsConstants.DB_RECORD_ASSOCIATION_RESTORED,
      LogsConstants.DB_RECORD_ASSOCIATION_TRANSFERRED,
      LogsConstants.ORDER_AMENDMENT,
      LogsConstants.WORKFLOW_EXECUTED,
    ];

    for(let index = 0; index < eventTypes.length; index++) {
      res.push(<Select.Option key={`${index + 2}`} value={eventTypes[index]}>{eventTypes[index].replace(
        'DB_RECORD_',
        '',
      )}</Select.Option>);
    }

    return res;
  }

  private applyFilter(eventType: string) {
    const { match, recordReducer, recordAssociationReducer, schemaReducer, getAuditLogs, recordId, dbRecordAssociationId } = this.props;

    const record = this.getRecord()
    const schema: any = getSchemaFromShortListBySchemaId(schemaReducer.shortList, record?.schemaId);

    this.setState({
      filterEventType: eventType,
    });

    const fieldFilter: any = {
      operator: '=',
      esPropPath: 'type.keyword',
      value: eventType,
    };

    getAuditLogs({
      schema,
      recordId: record?.id,
      filterFields: eventType ? [ fieldFilter ] : [],
    });
  }

  getRecord() {
    const { recordReducer, recordId, dbRecordAssociationId, match, recordAssociationReducer } = this.props;

    let record = getRecordFromShortListById(recordReducer.shortList, recordId || match.params.recordId);
    if (!record) {
      record = getRecordRelatedFromShortListById(
        recordAssociationReducer.shortList,
        dbRecordAssociationId || match.params.dbRecordAssociationId,
        recordId || match.params.recordId,
      );
    }

    return record;
  }

  render() {
    const { auditLogsReducer, identityGroupsReducer, location } = this.props;
    let parentRecordId: string, parent, childRecordId: string, child, stageId: string, stage
    let entity: any, parentEntity: any, childEntity: any

    const record = this.getRecord()

    const activityFeedData = auditLogsReducer?.shortList[record?.id]

    const updatedProperties = (properties: object[]) => {
      const propArray: any[] = []
      for(const prop in properties) {
        const elem = <div><span>{`${prop}: ${properties[prop]}`} </span></div>
        propArray.push(elem)
      }
      return propArray
    }

    const updatedGroups = (revision: any) => {
      const elems = [];
      if (revision?.groups?.length > 0) {
        const elem = <div>Assigned groups: {groupsArray(revision.groups)}</div>
        elems.push(elem);
      }
      if (revision?.addGroups?.length > 0) {
        const elem = <div>Added groups: {groupsArray(revision.addGroups)}</div>
        elems.push(elem);
      }
      if (revision?.removeGroups?.length > 0) {
        const elem = <div>Removed groups: {groupsArray(revision.removeGroups)}</div>
        elems.push(elem);
      }
      return elems;
    }

    const groupsArray = (groups: any[]) => {
      const groupsArray = [];
      for(const groupId of groups) {
        if (groupsArray.length > 0) groupsArray.push(', ');
        const group = identityGroupsReducer.list?.find(g => g.id === groupId);
        if (group) {
          const groupElem = <span>{group.name}</span>;
          groupsArray.push(groupElem);
        }
      }
      return groupsArray;
    }

    const checkLink = (elem: any, entity: any) => {
      const link = `/${entity?.moduleName}/${entity?.entityName}/${elem?.recordId}`
      if (link === location.pathname) {
        return <span>{elem?.revision?.title} </span>
      }
      return <Link to={link}>
        {elem?.revision?.title}</Link>
    }
    const checkParentLink = (elem: any, parent: any) => {
      const link = `/${parentEntity?.moduleName}/${parentEntity?.entityName}/${elem?.revision?.parentRecordId}`
      if (link === location.pathname) {
        return <span>{parent?.title || elem?.revision?.parentRecordTitle || elem?.revision?.parentRecordId} </span>
      }
      return <Link to={link}>
        {elem?.revision?.title}</Link>
    }

    const parseActivityFeedEvents = (elem: any) => {
      switch (elem.type) {
        case LogsConstants.DB_RECORD_CREATED:
          entity = splitModuleAndEntityName(elem?.revision?.entity)
          let link
          if (entity?.moduleName !== 'Record') {
            link = checkLink(elem, entity)
          } else {
            link = <span>{elem?.revision?.title} </span>
          }
          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span> <Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>CREATED </strong></span>
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
                {link}
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_UPDATED:
          entity = splitModuleAndEntityName(elem?.revision?.entity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span><Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>UPDATED </strong></span>
                {updatedProperties(elem?.revision?.properties)}
                {updatedGroups(elem?.revision)}
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
                {checkLink(elem, entity)}
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_MERGED:
          entity = splitModuleAndEntityName(elem?.revision?.entity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span><Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>MERGED </strong></span>
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
                {checkLink(elem, entity)}
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_DELETED:
          entity = splitModuleAndEntityName(elem?.revision?.entity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span><Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>DELETED </strong></span>
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
                {checkLink(elem, entity)}
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_STAGE_UPDATED:
          stageId = elem?.revision?.stageId
          stage = stageId && elem.associations?.find((item: any) => item.id === stageId)
          entity = splitModuleAndEntityName(elem?.revision?.entity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span><Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>MOVED </strong></span>
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
              </Tag>
              <div style={{ fontSize: 12 }}>to stage</div>
              <Tag>
                <Link to={`/${entity?.moduleName}/${entity?.entityName}/${elem?.recordId}`}>
                  {stage?.name || elem?.revision?.stageId}
                </Link>
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_ASSOCIATION_CREATED:
          parentRecordId = elem?.revision?.parentRecordId
          parent = parentRecordId && elem.associations?.find((item: any) => item.id === parentRecordId)
          childRecordId = elem?.revision?.childRecordId
          child = childRecordId && elem?.associations?.find((item: any) => item.id === childRecordId)
          parentEntity = splitModuleAndEntityName(elem?.revision?.parentEntity)
          childEntity = splitModuleAndEntityName(elem?.revision?.childEntity)
          let text
          if (elem.revision?.childEntity === 'SupportModule:Note') {
            const noteAssociation = elem?.associations?.filter((association: any) => association.entity === 'SupportModule:Note')
            text = noteAssociation?.[0].columns?.[0]?.value
            text = text ? `${text?.slice(0, 9)}...` : undefined
          }

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>CREATED </strong> a relationship between
              </div>
              <Tag>
                <span>{changeToCapitalCase(parentEntity?.entityName)} </span>
                {(checkParentLink(elem, parent))}
              </Tag>
              <div style={{ fontSize: 12 }}>and</div>
              <Tag>
                <span>{changeToCapitalCase(childEntity?.entityName)} </span>
                <Link to={`/${childEntity?.moduleName}/${childEntity?.entityName}/${elem?.revision?.childRecordId}`}>
                  {child?.title || elem?.revision?.childRecordTitle || text || elem?.revision?.childRecordId}
                </Link>
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_ASSOCIATION_UPDATED:
          parentRecordId = elem?.revision?.parentRecordId
          parent = parentRecordId && elem.associations?.find((item: any) => item.id === parentRecordId)
          childRecordId = elem?.revision?.childRecordId
          child = childRecordId && elem.associations?.find((item: any) => item.id === childRecordId)
          parentEntity = splitModuleAndEntityName(elem?.revision?.parentEntity)
          childEntity = splitModuleAndEntityName(elem?.revision?.childEntity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>UPDATED </strong> a relationship between
              </div>
              <Tag>
                <span>{changeToCapitalCase(parentEntity?.entityName)} </span>
                <Link to={`/${parentEntity?.moduleName}/${parentEntity?.entityName}/${elem?.revision?.parentRecordId}`}>
                  {parent?.title || elem?.revision?.parentRecordTitle || elem?.revision?.parentRecordId}
                </Link>
              </Tag>
              <div style={{ fontSize: 12 }}>and</div>
              <Tag>
                <span>{changeToCapitalCase(childEntity?.entityName)} </span>
                <Link to={`/${childEntity?.moduleName}/${childEntity?.entityName}/${elem?.revision?.childRecordId}`}>
                  {child?.title || elem?.revision?.childRecordTitle || elem?.revision?.childRecordId}
                </Link>
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;
        case LogsConstants.DB_RECORD_ASSOCIATION_DELETED:
          parentRecordId = elem?.revision?.parentRecordId
          parent = parentRecordId && elem.associations?.find((item: any) => item.id === parentRecordId)
          childRecordId = elem?.revision?.childRecordId
          child = childRecordId && elem.associations?.find((item: any) => item.id === childRecordId)
          parentEntity = splitModuleAndEntityName(elem?.revision?.parentEntity)
          childEntity = splitModuleAndEntityName(elem?.revision?.childEntity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <strong>DELETED </strong> a relationship between
              </div>
              <Tag>
                <span>{changeToCapitalCase(parentEntity?.entityName)} </span>
                <Link to={`/${parentEntity?.moduleName}/${parentEntity?.entityName}/${elem?.revision?.parentRecordId}`}>
                  {parent?.title || elem?.revision?.parentRecordTitle || elem?.revision?.parentRecordId}
                </Link>
              </Tag>
              <div style={{ fontSize: 12 }}>and</div>
              <Tag>
                <span>{changeToCapitalCase(childEntity?.entityName)} </span>
                <Link to={`/${childEntity?.moduleName}/${childEntity?.entityName}/${elem?.revision?.childRecordId}`}>
                  {child?.title || elem?.revision?.childRecordTitle || elem?.revision?.childRecordId}
                </Link>
              </Tag>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
          break;

        case LogsConstants.ORDER_AMENDMENT:
          const cancelledOrder = elem?.associations?.find((item: any) => item.id === elem?.revision?.cancelledOrderId);
          const amendedOrder = elem?.associations?.find((item: any) => item.id === elem?.revision?.amendedOrderId);
          const keepItems = elem?.associations?.filter((item: any) => elem?.revision?.keepItemsIds?.includes(item?.id));
          if (!(keepItems?.length > 0) && elem?.revision?.keepItemsIds?.length > 0) {
            keepItems.push(...elem.revision.keepItemsIds.map((id: string) => ({ id })));
          }
          const returnOrder = elem?.associations?.find((item: any) => item.id === elem?.revision?.returnOrderId);
          const returnItems = elem?.associations?.filter((item: any) => elem?.revision?.returnItemsIds?.includes(item?.id));
          if (!(returnItems?.length > 0) && elem?.revision?.returnItemsIds?.length > 0) {
            returnItems.push(...elem.revision.returnItemsIds.map((id: string) => ({ id })));
          }
          const removeItems = elem?.associations?.filter((item: any) => elem?.revision?.removeItemsIds?.includes(item?.id));
          if (!(removeItems?.length > 0) && elem?.revision?.removeItemsIds?.length > 0) {
            removeItems.push(...elem.revision.removeItemsIds.map((id: string) => ({ id })));
          }

          const amendProducts = [];
          if (elem?.revision?.amendProducts) {
            for (const ap of elem?.revision?.amendProducts) {
              amendProducts.push({
                itemId: ap.itemId,
                item: elem?.associations?.find((item: any) => item.id === ap.itemId),
                productId: ap.product?.recordId,
                product: elem?.associations?.find((item: any) => item.id === ap.product?.recordId),
                amendmentType: ap.amendmentType,
                relatedAssociationId: ap.product?.relatedAssociationId,
              });
            }
          }

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <Link to={`/IdentityManagerModule/Users/${elem.userId}`}>
                  {elem.userName}
                </Link> <span> <strong>AMENDED</strong></span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span><strong>Cancelled Order:</strong> </span>
                <Tag>
                  <Link to={`/OrderModule/Order/${elem?.revision?.cancelledOrderId}`}>
                    {cancelledOrder?.title || elem?.revision?.cancelledOrderId}
                  </Link>
                </Tag>
              </div>
              { elem?.revision?.returnOrderId ?
              <div style={{ marginBottom: 8 }}>
                <span><strong>Return Order:</strong> </span>
                <Tag>
                  <Link to={`/OrderModule/ReturnOrder/${elem?.revision?.returnOrderId}`}>
                    {returnOrder?.title || elem?.revision?.returnOrderId}
                  </Link>
                </Tag><br/>
                <ul>
                  { renderAmendmentItemsList(returnItems, 'RETURNED') }
                </ul>
              </div>
              : '' }
              <div style={{ marginBottom: 8 }}>
                <span><strong>Amended Order:</strong> </span>
                <Tag>
                  <Link to={`/OrderModule/Order/${elem?.revision?.amendedOrderId}`}>
                    {amendedOrder?.title || elem?.revision?.amendedOrderId}
                  </Link>
                </Tag>
                <ul>
                { renderAmendmentItemsList(keepItems, 'KEEPED') }
                { renderAmendmentItemsList(removeItems, 'REMOVED') }
                { amendProducts?.length > 0 ? amendProducts.map((ap: any) =>
                  <li>
                    <span>item </span>
                    <Tag><Link to={`/OrderModule/OrderItem/${ap.itemId}`}>
                      {ap.item?.title || ap.itemId}
                    </Link></Tag> 
                    <span> {`${ap.amendmentType}D`} with product </span>
                    <Tag><Link to={`/ProductModule/related/Product/${ap.relatedAssociationId}/${ap.productId}`}>
                      {ap.product?.title || ap.productId}
                    </Link></Tag> 
                  </li>)
                : '' }
                </ul>
              </div>
              <ElementFooter elem={elem}/>
            </Paragraph>
          );

        case LogsConstants.WORKFLOW_EXECUTED:
          entity = splitModuleAndEntityName(elem?.revision?.entity)

          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}>
                <span><Link to={`/IdentityManagerModule/Users/${elem?.userId}`}>
                  {elem?.userName}
                </Link> <strong>EXECUTED </strong></span>
              </div>
              <Tag>
                <span>{changeToCapitalCase(entity?.entityName)} </span>
                {checkLink(elem, entity)}
              </Tag>
              <div style={{ marginBottom: 8 }}>
                <span><strong>Executed At:</strong> </span>{elem?.revision?.wf_exec?.execAt}<br/>
                <span><strong>Finish At:</strong> </span>{elem?.revision?.wf_exec?.finishAt}<br/>
              </div>
              <ElementFooter elem={elem}/>
            </Paragraph>
          );

        // case LogsConstants.DB_RECORD_COLUMN_CREATED:
        //   return <span>{elem.type} </span>
        // case LogsConstants.DB_RECORD_COLUMN_UPDATED:
        //   return <span>{elem.type} </span>
        // case LogsConstants.DB_RECORD_ASSOCIATION_COLUMN_CREATED:
        //   return <span>{elem.type} </span>
        // case LogsConstants.DB_RECORD_ASSOCIATION_COLUMN_UPDATED:
        //   return <span>{elem.type} </span>
        default:
          return (
            <Paragraph>
              <div style={{ marginBottom: 8 }}><a>{elem.type}</a></div>
              <ElementFooter elem={elem}/>
            </Paragraph>
          )
      }
    }

    const renderAmendmentItemsList = (items: any[], actionText: string) => {
      return items?.map((item: any) =>
        <li>
          <span>item </span>
          <Tag>
            <Link to={`/OrderModule/OrderItem/${item?.id}`}>
              {item?.title || item?.id}
            </Link>
          </Tag>
          <span> {actionText}</span>
        </li>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '24px', width: '95%' }}>
          <Title level={5}>Event type filter</Title>
          <Select
            key="activity-feed-filter"
            style={{ width: '100%', maxWidth: 300 }}
            value={this.state.filterEventType}
            onSelect={(val, option) => this.applyFilter(val)}
          >
            {this.renderFilterOptions()}
          </Select>
        </div>
        <Spin spinning={auditLogsReducer.isRequesting}>
          <Timeline>
            {
              activityFeedData && activityFeedData.length > 0 ? activityFeedData.map((
                elem: LogsUserActivityEntity,
                index: number,
              ) => (
                <Timeline.Item key={index}>
                  {parseActivityFeedEvents(elem)}
                </Timeline.Item>
              )) : (
                <Empty/>
              )
            }
          </Timeline>
        </Spin>
      </div>
    );
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
  auditLogsReducer: state.auditLogsReducer,
  identityGroupsReducer: state.identityGroupsReducer,
});

const mapDispatch = (dispatch: any) => ({
  getAuditLogs: (params: IGetRecordAuditLogs, cb?: any) => dispatch(getRecordAuditLogs(params, cb)),
});

export default withRouter(connect(mapState, mapDispatch)(RecordActivityFeed));
