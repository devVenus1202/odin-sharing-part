import React from 'react';
import {DbRecordEntityTransform} from "@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform";
import { getProperty } from "@d19n/models/dist/schema-manager/helpers/dbRecordHelpers";

interface Props {
  result: DbRecordEntityTransform,
  onClose: any,
  globalCollapsed: boolean
}

interface State {
  collapsed: boolean
}


class NetworkDeviceLayout extends React.Component<Props, State> {
  constructor(props: any) {
    super(props)
    this.state = {collapsed: false}
  }

  render(){
    const result = this.props.result;

    return(
      <div>

        {/* Record number */}
        <p>
          <span>Network Device #</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{result.recordNumber}</span>
        </p>

        {/* Title */}
        <p>
          <span>Title</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{result.title}</span>
        </p>

        {/* Type */}
        <p>
          <span>Type</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{result.type}</span>
        </p>

        {/* IP Address */}
        <p>
          <span>IP Address</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{getProperty(result, 'IpAddress')}</span>
        </p>


      </div>
    )
  }
}

export default NetworkDeviceLayout