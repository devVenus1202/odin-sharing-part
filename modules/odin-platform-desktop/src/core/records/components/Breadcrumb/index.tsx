import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { Breadcrumb, Tooltip } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { getModuleAndEntityNameFromRecord } from '../../../../shared/utilities/recordHelpers';

interface Props {
  record: DbRecordEntityTransform;
}


class BreadcrumbComponent extends React.Component<Props> {

  renderBreadCrumbsByEntity(record: DbRecordEntityTransform) {

    if (record) {
      const { entityName } = getModuleAndEntityNameFromRecord(record)

      switch (entityName) {
        case 'Order':
          return [
            'CrmModule:Account',
            'CrmModule:Address',
            'CrmModule:Contact',
          ]
        case 'WorkOrder':
          return [
            'CrmModule:Account',
            'CrmModule:Address',
            'CrmModule:Contact',
            'OrderModule:Order',
          ]
        case 'Invoice':
          return [
            'CrmModule:Account',
            'CrmModule:Address',
            'CrmModule:Contact',
            'OrderModule:Order',
          ]
        case 'Contact':
          return [
            'CrmModule:Account',
          ];
        case 'Exchange':
          return [
            'ProjectModule:Region',
          ]
        case 'Program':
          return [
            'ProjectModule:Region',
            'ProjectModule:Exchange',
          ]
        case 'Project':
          return [
            'ProjectModule:Region',
            'ProjectModule:Exchange',
            'ProjectModule:Program',
          ]
        case 'Task':
          return [
            'ProjectModule:Region',
            'ProjectModule:Exchange',
            'ProjectModule:Program',
            'ProjectModule:Project',
          ]
        case 'Job':
          return [
            'ProjectModule:Region',
            'ProjectModule:Exchange',
            'ProjectModule:Program',
            'ProjectModule:Project',
            'ProjectModule:Task',
          ]
        default:
          return [];
      }
    } else {
      return []
    }

  }

  mapOrder(record: DbRecordEntityTransform, array: any, key: any) {
    if (!array) return []

    const links = this.renderBreadCrumbsByEntity(record)
    var order = links.reduce((r: any, k: any, i: any) => (r[k] = i + 1, r), {});

    const sortedArr = array.sort((a: any, b: any) => (order[a[key]] || Infinity) - (order[b[key]] || Infinity));
    return sortedArr;
  };

  renderBreadcrumbLinks() {
    const { record } = this.props;

    // filter record links and show only predefined entites

    const links = this.renderBreadCrumbsByEntity(record)
    const filteredArray = record?.links?.filter(item => links.includes(item?.entity));

    return (
      <>
        <Breadcrumb separator="">
          {this.mapOrder(record, filteredArray, 'entity')?.map((elem: any) => (
            <>
              <Breadcrumb.Item>
                <Tooltip placement="bottom" title={elem.title}>
                  <Link to={this.generateLink(elem)}>{this.generateEntityName(elem)}</Link>
                </Tooltip>
              </Breadcrumb.Item>
              <Breadcrumb.Separator/>
            </>
          ))}
          <Breadcrumb.Item>
            {this.generateEntityName(record)}
          </Breadcrumb.Item>
        </Breadcrumb>
      </>
    )
  }

  generateEntityName(elem: any) {
    if (elem) {
      let entityName = '';
      const tempArr = elem.entity.split(':');
      entityName = tempArr[1];

      if (elem.recordNumber) {
        return elem.recordNumber
      } else if (elem.title) {
        return elem.title
      }

      return entityName;
    }

  }

  generateLink(elem: any) {
    let entityName = '';
    let moduleName = '';
    const tempArr = elem.entity.split(':');
    entityName = tempArr[1];
    moduleName = tempArr[0];
    return '/' + moduleName + '/' + entityName + '/' + elem.id;
  }

  render() {
    return (
      <div className="breadcrumb-wrapper">
        {this.renderBreadcrumbLinks()}
      </div>
    )
  }
}


export default (BreadcrumbComponent);

