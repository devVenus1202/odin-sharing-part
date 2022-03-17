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


class ContactLayout extends React.Component<Props, State> {
  constructor(props: any) {
    super(props)
    this.state = {collapsed: false}
  }

  render(){
    const result = this.props.result;

    return(
      <div>

        {/* Name */}
        <p>
          <span>Name</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{
            <span>{`${getProperty(result, 'FirstName')} ${getProperty(result, 'LastName')}`}</span>
          }</span>
        </p>

        {/* E-mail */}
        <p>
          <span>E-mail</span>
          <br/>
          <span style={{fontWeight: 'bold'}}>{
              <span>{result.properties.EmailAddress}</span>
          }</span>
        </p>

      </div>
    )
  }
}

export default ContactLayout