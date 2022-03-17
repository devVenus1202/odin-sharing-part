import React from 'react';
import { Button, Card, Col, Layout, Row, Spin, Tag, Typography } from "antd";
import { FilePdfOutlined } from '@ant-design/icons';
import './index.scss';
import { connect } from "react-redux";
import SlackIcon from '../../assets/icons/slack-color-16.png';
import appSwitch from '../../assets/images/tips/appSwitch.png';
import Search from '../Search/Search'
import { Link } from "react-router-dom";
import { storeSelectedEntity, storeSelectedModule } from "../../core/navigation/store/actions";
import OdinIcons from "../Navigation/OdinIcons";
import { getOrganizationName } from "../../shared/http/helpers";

interface Props {
  userReducer: any,
  navigationReducer: any,
  storeSelectedModule: any,
  storeSelectedEntity: any
}

class Home extends React.Component<Props> {


  getFirstEntityFromModule = (moduleName: string) => {

    const { navigationReducer } = this.props

    if(navigationReducer && navigationReducer.navigationStructure && navigationReducer.routingStructure) {
      const targetedModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === moduleName)
      return targetedModule && targetedModule.entities.length > 0 ? targetedModule.entities[0].entityName : ''
    }

  }

  renderModules = () => {

    const { storeSelectedModule, storeSelectedEntity, navigationReducer } = this.props

    const menuModules = navigationReducer?.navigationStructure?.filter((module: any) => module.showInApps)

    return menuModules?.map((module: any) => (
      <Col xs={8} sm={8} md={3} lg={4} xl={3} key={module.moduleName}>
        <Link
          to={`/${module.moduleName}/${this.getFirstEntityFromModule(module.moduleName)}`}
          onClick={() => {
            storeSelectedModule({ selectedModule: module.moduleName })
            storeSelectedEntity({ selectedEntity: this.getFirstEntityFromModule(module.moduleName) })
          }}
          className="topMenuAppLink"
        >
          <Row style={{ paddingTop: '30px', border: '1px solid #efefef' }}>
            <Col span={24}>
              {OdinIcons(module.icon, 'moduleIcon')}
            </Col>
            <Col span={24} style={{ paddingTop: '7px', paddingBottom: '15px' }}>
              {module.menuModuleName}
            </Col>
          </Row>
        </Link>
      </Col>
    ))


  }

  render() {
    const { Title } = Typography;
    const userInformation = this.props.userReducer.user;
    const { navigationReducer } = this.props

    return (
      <Layout style={{ padding: 8, border: '1px solid #dadada', background: '#cedaea', overflow: 'auto' }}>
        <Row>
          <Col xl={{ span: 18, offset: 3 }} className="homePageContainer">

            {/* Welcome card */}
            <Card className="homePageWelcomeCard" bordered={true} style={{ textAlign: 'center' }}>
              <Row>
                <Col span={24}>
                  <Title level={3} style={{ marginTop: '5px', marginBottom: '25px' }}>
                    {`Hello, ${userInformation?.firstname}!`}
                  </Title>
                </Col>
              </Row>

              <Row style={{ textAlign: 'center' }}>
                {navigationReducer.navigationStructure !== null ? this.renderModules() : <Spin/>}
              </Row>

            </Card>


            {/* Three column information layout */}
            <Row style={{ marginTop: '30px' }} justify="space-between">

              {/* Odin Search */}
              <Col xs={{ span: 24 }} md={{ span: 12 }}>
                <Card title="Search" bordered={true} className="homePageCard">
                  <div className="homePageCardBody">
                    <Search
                      entities={[
                        'CrmModule:Account',
                        'CrmModule:Address',
                        'CrmModule:Contact',
                        'ProductModule:Product',
                        'OrderModule:Order',
                        'FieldServiceModule:WorkOrder',
                        'BillingModule:Invoice',
                        'ServiceModule:NetworkDevice',
                      ]}
                      schema={{ id: 'GLOBAL_SEARCH_CARD', moduleName: 'SchemaModule', entityName: 'ALL' }}
                      renderStyle="card"
                    />
                  </div>
                </Card>
              </Col>
              <Col xs={{ span: 24 }} md={{ span: 11 }}>

                {/* Netomnia WebGIS Guidelines */}
                {
                  getOrganizationName() === 'Netomnia'
                    ?
                    <Card title="ODIN GIS User Guide" bordered={true} className="homePageCard"
                          extra={
                            <a href="pdf/webgis-guidelines-v02.pdf" download>
                              <Button type="primary" icon={<FilePdfOutlined/>}>Download PDF</Button>
                            </a>
                          }
                    >
                      <div className="homePageCardBody" style={{ paddingBottom: '10px' }}>
                        <Row>
                          <Col span={24} style={{ textAlign: 'justify' }}>
                            This document is the overall guide for WebGIS platform and specifies Netomnia’s requirements for viewing, editing and updating the network elements within the Netomnia’s network
                          </Col>
                        </Row>
                      </div>
                    </Card>
                    :
                    <></>
                }

                {/* Tips */}
                <Card title="Tips" bordered={true} className="homePageCard">
                  <div className="homePageCardBody" style={{ paddingBottom: '10px' }}>
                    <Row>
                      <Col span={17} style={{ textAlign: 'justify' }}>
                        <span style={{ fontWeight: 'bold' }}>App Button</span> is located in the top left corner of your
                        screen. It is a starting point of your work, use it to quickly access your apps and modules.
                      </Col>
                      <Col span={6} offset={1}>
                        <img src={appSwitch} alt="Slack"
                             style={{
                               borderRadius: '5px',
                               width: '100%',
                               textAlign: 'right',
                               opacity: '0.75',
                               filter: 'grayscale(30%)'
                             }}/>
                      </Col>
                    </Row>
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card title="Quick Actions" bordered={true} className="homePageCard">
                  <div className="homePageCardBody" style={{ paddingBottom: '10px' }}>
                    <Row>
                      <Col span={8}><span>Toggle search drawer</span></Col>
                      <Col span={16} style={{ textAlign: 'right' }}><Tag>Alt</Tag><Tag>S</Tag></Col>
                    </Row>
                    <Row style={{ paddingTop: '10px' }}>
                      <Col span={8}><span>Home page</span></Col>
                      <Col span={16} style={{ textAlign: 'right' }}><Tag>Alt</Tag><Tag>H</Tag></Col>
                    </Row>
                  </div>
                </Card>


                {/* Recent updates*/}
                <Card title="Recent updates" bordered={true} className="homePageCard">
                  <div className="homePageCardBody" style={{ paddingBottom: '10px' }}>
                    <a href='https://d19nworkspace.slack.com/archives/C01FLGNA421'>
                      <img src={SlackIcon} alt="Slack" style={{ marginRight: '8px' }}/>#odin-release-notes
                    </a>
                  </div>
                </Card>

              </Col>
            </Row>
          </Col>
        </Row>
      </Layout>
    )
  }
}

const mapDispatch = (dispatch: any) => ({
  storeSelectedModule: (params: { selectedModule: string }) => dispatch(storeSelectedModule(params)),
  storeSelectedEntity: (params: { selectedEntity: string }) => dispatch(storeSelectedEntity(params)),
})

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer
});

export default connect(mapState, mapDispatch)(Home)