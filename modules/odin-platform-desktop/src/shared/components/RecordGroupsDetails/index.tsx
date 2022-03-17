/* Render Record Groups details for Detail View -> Left panel */

import { Col, Divider, Row, Tooltip } from "antd";
import React from "react";
import moment from "moment";

export function renderGroupsDetails(record: any) {
  if (record) {
    return (
      <>
        <Divider style={{ marginTop: '7px', marginBottom: '10px' }}/>

        <Row>

          {/* Groups: */}
          <Col span={24}>
            <span style={{ fontWeight: 'bold', marginRight: 7 }}>Groups:</span>
            { record.groups?.length > 0 ? record.groups.map((g: any) => g.name).join('; ') : 'none' }
          </Col>


        </Row>

      </>



    )
  }
}