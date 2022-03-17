import { Button, Card, Col, Form, Input, Row, Switch, Tooltip } from "antd";
import React from "react";
import { HazardSheetFormItems } from "./HazardSheetFormItems";
import TextArea from "antd/es/input/TextArea";
import NetomniaIcon from "../../../../../assets/icons/netomnia-icon.png";
import { FormInstance } from "antd/es";
import "./styles.scss"
import { QuestionCircleOutlined } from "@ant-design/icons";


export const HazardSheetForm = (props: any) => {

  const cautionFormRef = React.createRef<FormInstance>();
  const projectFormRef = React.createRef<FormInstance>();

  const hazardSheetFormItems = HazardSheetFormItems()

  const getColumnBackground = (id: string) => {

    switch (id) {
      case "1":
        return "#dedede"
      case "2":
        return "#e5efff"
      case "3":
        return "#fce9dc"
      case "4":
        return "#faefcf"
      case "5":
        return "#ecfde1"
      case "6":
        return "#e0f6ff"
      case "7":
        return "#e1ffe1"
      case "8":
        return "#ffeee1"
      case "9":
        return "#ffe8e3"
      case "10":
        return "#ffffe1"
    }

  }

  const generateFormFields = () =>


    hazardSheetFormItems.map((data: any, i:number) => (
      <Col span={6} style={{ padding: '20px' }} key={`${data[1]}${i}`}>
        <Card
          className="hazardSheetCard"
          title={
            <Row style={{ padding: '5px 10px' }}>
              <Col span={16} key={`${data[1]}col${i}`}>
                <Tooltip title={data[2]} overlayInnerStyle={{
                  backgroundColor: getColumnBackground(data[1].split('.')[0]),
                  color: 'black'
                }} key={data[2]}>
                  <Button
                    ghost
                    size="large"
                    type="primary"
                    style={{ marginTop: '2px', marginRight: '3px', border: 0, boxShadow: 'none' }}
                    icon={<QuestionCircleOutlined/>}
                  >
                  </Button>
                </Tooltip>
                <span>{`${data[1]} - ${data[0]}`}</span>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Form.Item style={{ margin: '4px 5px 0px 0px' }} name={`switch-${data[1]}`} valuePropName="checked">
                  <Switch
                    defaultChecked={false}
                    checkedChildren="Yes"
                    unCheckedChildren="No"
                  />
                </Form.Item>
              </Col>
            </Row>
          }
        >
          <Form.Item
            style={{ padding: '10px' }}
            name={`input-${data[1]}`}
            rules={[ { required: true, message: 'Please input your username!' } ]}
          >
            <TextArea
              placeholder="Enter additional caution"
              rows={3}
            />
          </Form.Item>
        </Card>
      </Col>
    ))


  const getFormFieldValues = () => {

    const hazardSheetFormItems = HazardSheetFormItems()

    const allFormFields = cautionFormRef.current!.getFieldsValue()
    const allProjectInformation = projectFormRef.current!.getFieldsValue()

    for (let i = 0; i < hazardSheetFormItems.length; i++) {

      const fieldId = hazardSheetFormItems[i][1]

      if (allFormFields[`switch-${fieldId}`] && allFormFields[`input-${fieldId}`]) {
        hazardSheetFormItems[i].splice(4, 0, allFormFields[`input-${fieldId}`])
        hazardSheetFormItems[i].splice(5, 0, 'Yes')
      } else {
        hazardSheetFormItems[i].splice(4, 0, '')
        hazardSheetFormItems[i].splice(5, 0, 'No')
      }

    }

    const hazardSheetProjectInformation = {
      projectId: allProjectInformation['project-id'],
      projectReference: allProjectInformation['project-reference'],
      projectSurveyorsName: allProjectInformation['project-surveyorsname']
    }

    props.renderPDF(hazardSheetFormItems, hazardSheetProjectInformation)

  }


  return (
    <Row>

      <Col span={24} style={{ marginBottom: '15px' }}>
        <Card
          title={
            <Row>
              <Col span={8} style={{ paddingTop: '8px' }}>
                <img src={NetomniaIcon} style={{ width: '24px', paddingBottom: '4px' }}
                     alt="netomnia-icon"/> Build Pack
              </Col>
              <Col span={16} style={{ textAlign: 'right', paddingTop: '4px' }}>
                <Button type="primary" size="large" onClick={() => getFormFieldValues()}>Generate PDF</Button>
              </Col>
            </Row>
          }
          style={{marginBottom:20}}>
          <Form
            ref={projectFormRef}
            name="basic"
            layout="vertical"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
            initialValues={{ remember: true }}
            autoComplete="off"
          >
            <Row>

              {/* Project ID */}
              <Col span={8} style={{ padding: '10px' }}>
                <Form.Item
                  style={{ padding: '10px' }}
                  name={`project-id`}
                  label="Project ID"
                >
                  <Input placeholder="Enter Project ID"/>
                </Form.Item>
              </Col>

              {/* Project Reference */}
              <Col span={8} style={{ padding: '10px' }}>
                <Form.Item
                  style={{ padding: '10px' }}
                  name={`project-reference`}
                  label="Project Reference"
                >
                  <Input placeholder="Enter Project Reference"/>
                </Form.Item>
              </Col>

              {/* Surveyor's Name */}
              <Col span={8} style={{ padding: '10px' }}>
                <Form.Item
                  style={{ padding: '10px' }}
                  name={`project-surveyorsname`}
                  label="Surveyor's Name"
                >
                  <Input placeholder="Enter Surveyor's Name"/>
                </Form.Item>
              </Col>

            </Row>
          </Form>
        </Card>

        <Card title="Hazard Sheet - Additional Caution">
          <Form
            ref={cautionFormRef}
            name="basic"
            layout="vertical"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
            initialValues={{ remember: true }}
            autoComplete="off"
          >
            <Row>
              {generateFormFields()}
            </Row>
          </Form>
        </Card>
      </Col>


    </Row>
  )
}