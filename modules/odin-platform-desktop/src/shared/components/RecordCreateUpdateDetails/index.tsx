/* Render Record management details for Detail View -> Left panel */

import { Col, Divider, Row, Tooltip } from "antd";
import React from "react";
import moment from "moment";

export function renderCreateUpdateDetails(record: any) {
  if(record) {
    return (
      <>
        <Divider style={{ marginTop: '7px', marginBottom: '10px' }}/>

        <Row>

          {/* Created by/at:*/}
          <Col span={12}>
            <Row>
              <Col style={{ paddingBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Created by:</span>
              </Col>
              <Col span={24}>
                {
                  record?.createdBy
                    ? <span>{record.createdBy!.fullName}</span>
                    : <span>Unknown</span>
                }
              </Col>
              <Col span={24}>
                {moment(record.createdAt!).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
            </Row>
          </Col>


          {/* Updated by/at:*/}
          <Col span={12}>
            <Row>
              <Col style={{ paddingBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Updated by:</span>
              </Col>
              <Col span={24}>
                {
                  record?.lastModifiedBy
                    ? <span>{record.lastModifiedBy!.fullName}</span>
                    : <span>Unknown</span>
                }
              </Col>
              <Col span={24}>
                {moment(record.updatedAt!).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
            </Row>
          </Col>


        </Row>

      </>



    )
  }
}