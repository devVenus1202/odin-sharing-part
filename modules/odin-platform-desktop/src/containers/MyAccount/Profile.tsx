import React, { useEffect } from 'react'
import { Form, Input, Button, Radio, Avatar, Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import RecordProperties from '../../core/records/components/DetailView/RecordProperties';

interface Props {
  record: any,
  recordAssociation: any
}

const BUSINESS_CLASSIFICATION = ["C", "U", "X", "O"];
export default function Profile(props: Props) {
  const { record, recordAssociation } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        emailAddress: record.properties.EmailAddress,
        firstName: record.properties.FirstName,
        lastName: record.properties.LastName,
        phone: record.properties.Phone,
        mobile: record.properties.Mobile,
        companyName: record.properties.CompanyName,
        companyPosition: record.properties.CompanyPosition,
      })
    }
    if (recordAssociation) {
      const { Address } = recordAssociation;
      if (Address && Address.dbRecords && Address.dbRecords.length) {
        const addressProperties = Address.dbRecords[0].properties;
        form.setFieldsValue({
          address: addressProperties.FullAddress,
        })
      }
    }
  }, [record, recordAssociation])
  const { Address } = recordAssociation;

  let showCompanyInfo = false;
  if (Address && Address.dbRecords && Address.dbRecords.length) {
    const addressProperties = Address.dbRecords[0].properties;
    showCompanyInfo = BUSINESS_CLASSIFICATION.includes(addressProperties.Classification);
  }
  return (
    <div>
      <div className="logo">
        <Avatar size={128} icon={<UserOutlined />} />
      </div>
      <Form
        layout={"vertical"}
        form={form}
        size={'large'}
      >
        <Row gutter={16}>
          <Col span={24} md={12}>
            <Form.Item label="First Name" key="firstName" name="firstName">
              <Input placeholder="input placeholder"  readOnly/>
            </Form.Item>
          </Col>
          <Col span={24} md={12}>
            <Form.Item label="Last Name" key="lastName" name="lastName">
              <Input placeholder="input placeholder"  readOnly/>
            </Form.Item>
          </Col>
          <Col span={24} md={12}>
            <Form.Item label="Email" key="emailAddress" name="emailAddress">
              <Input placeholder="input placeholder"  readOnly/>
            </Form.Item>
          </Col>
          <Col span={24} md={12}>
          </Col>
          <Col span={24} md={12}>
            <Form.Item label="Phone" key="phone" name="phone">
              <Input placeholder="input placeholder"  readOnly/>
            </Form.Item>
          </Col>
          <Col span={24} md={12}>
            <Form.Item label="Mobile" key="mobile" name="mobile">
              <Input placeholder="Input mobile (+12345678901)"  readOnly/>
            </Form.Item>
          </Col>
          {showCompanyInfo && <>
            <Col span={24} md={12}>
              <Form.Item label="Company Name">
                <Input placeholder="Enter Your Company Name" readOnly />
              </Form.Item>
            </Col>
            <Col span={24} md={12}>
              <Form.Item label="Company Position">
                <Input placeholder="Enter Your Position"  readOnly/>
              </Form.Item>
            </Col></>}
          <Col span={24} md={24}>
            <Form.Item label="Address" key="address" name="address">
              <Input placeholder="Address" readOnly/>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  )
}
