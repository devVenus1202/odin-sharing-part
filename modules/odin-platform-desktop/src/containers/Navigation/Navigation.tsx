import {
  BranchesOutlined,
  DashboardOutlined,
  FolderOutlined,
  HomeOutlined,
  MenuOutlined,
  PartitionOutlined,
  PoweroffOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Col, Divider, Menu, Row, Spin } from 'antd';
import SubMenu from 'antd/es/menu/SubMenu';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import NetomniaLogo from '../../assets/images/svg/netomnia-logo-round.svg'
import YouFibreLogo from '../../assets/images/svg/youfibre-logo-round.svg'
import { logoutRequest, updateUserRolesAndPermissionsRequest } from '../../core/identity/store/actions';
import {
  addNavigationStructure,
  addRoutingStructure,
  storeSelectedEntity,
  storeSelectedModule,
} from '../../core/navigation/store/actions';
import { toggleSearchVisibility } from '../../core/records/store/actions';
import '../../cst-theme.scss'
import { getOrganizationName } from '../../shared/http/helpers';
import { httpGet } from '../../shared/http/requests';
import { canUserAccessModule, isExternalUser } from '../../shared/permissions/rbacRules';
import history from '../../shared/utilities/browserHisory';
import OdinIcons from './OdinIcons';
import YouFibreMenuStructure from './yfMenuItems'

interface Props {
  userReducer: any,
  navigationReducer: any,
  toggleSearchVisibility: any,
  logout: any,
  updateUserRolesAndPermissions: any,
  storeSelectedModule: any,
  storeSelectedEntity: any,
  addNavigationStructure: any,
  addRoutingStructure: any,
}

interface State {
  isLoading: boolean,
}


class Navigation extends Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      isLoading: false,
    };
  }

  componentDidMount() {
    this.getAllAvailableSchemas().then(r => {
    })
  }


  /* Over here we compare full organizational menu structure with the permissions we
   got back from Schema Manager and userReducer. The idea is to go fully dependent
   on the Schema Manager in the future. It is not currently possible, hence the
   double cross check. */

  defineMenuStructure(schemaModulesAndEntities: any) {

    const { addNavigationStructure, addRoutingStructure, userReducer } = this.props
    const excludedModules = ['IdentityManagerModule']

    let fullNavigationStructure = YouFibreMenuStructure(schemaModulesAndEntities);

    /* Remove modules from Organizational navigation that are not present in the Schemas,
     but exclude modules that we manage from the userReducer. */

    // let filteredNavigationStructure = fullNavigationStructure.filter((navModule: any) => {
    //     if (!excludedModules.includes(navModule.moduleName)) {
    //       return schemaModulesAndEntities.find((schemaModule: any) => schemaModule.moduleName === navModule.moduleName)
    //     } else {
    //       return true
    //     }
    //   },
    // )


    // /* Remove entities from previously sorted Organizational navigation that are not present in the
    //  Schemas but exclude entities that we manage from the userReducer. */

    // filteredNavigationStructure.forEach((module: any, i) => {

    //   if (!excludedModules.includes(module.moduleName)) {

    //     /* Get schema Module for the navigation module  */
    //     const schemaModule = schemaModulesAndEntities.find((schemaModule: any) => {
    //       return schemaModule.moduleName === module.moduleName
    //     })

    //     filteredNavigationStructure[i].entities = module.entities.filter((navEntity: any) => {
    //         if (navEntity.entityName !== '' && navEntity.entityName !== 'Calendar') {
    //           return schemaModule.entities.includes(navEntity.entityName)
    //         } else
    //           return true
    //       },
    //     )
    //   }


    //   /* We have an excluded module here. */
    //   else {

    //     if (module.moduleName === 'IdentityManagerModule' && !canUserAccessModule(
    //       userReducer,
    //       'IdentityManagerModule',
    //     )) {
    //       filteredNavigationStructure.splice(i, 1)
    //     }

    //   }

    // })

    const routingStructure = fullNavigationStructure.map(item => {
      return {
        moduleName: item.moduleName,
        menuModuleName: item.moduleName,
        entities: item.entities.map((entity: any) => entity.entityName)
      }
    })

    addNavigationStructure({ navigationStructure: fullNavigationStructure })
    addRoutingStructure({ routingStructure: routingStructure })
  }

  /* We get all schemas and modules that are allowed for this user */
  async getAllAvailableSchemas() {

    this.setState({ isLoading: true })

    await httpGet(
      `SchemaModule/v1.0/schemas`,
    ).then(res => {
      this.setState({ isLoading: false })
      this.defineMenuStructure(res.data.data)
    },
    ).catch(err => {


      console.error('%cError while fetching Schemas!', 'color:red', err)
      this.setState({ isLoading: false })

    })
  }

  handleLogout() {
    const { logout } = this.props;
    logout()
    history.push('/login');
  }

  /* Set App menu height according to content */
  getAppMenuHeight = () => {

    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {

      const menuModules = navigationReducer.navigationStructure.filter((module: any) => module.showInApps)

      if (menuModules.length < 4) {
        return '120px'
      } else if (menuModules.length > 3 && menuModules.length < 7) {
        return '220px'
      } else if (menuModules.length > 6 && menuModules.length < 10) {
        return '320px'
      } else if (menuModules.length > 6 && menuModules.length < 10) {
        return '420px'
      }

    }
  }

  onOpen = (props: any) => {

    console.log(props)
  }

  renderModules = () => {

    const { storeSelectedModule, storeSelectedEntity, navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {

      const menuModules = navigationReducer.navigationStructure.filter((module: any) => module.showInApps)

      return menuModules.map((module: any) => (
        <Col span={8} style={{ border: '1px solid #efefef' }} key={module.moduleName}>
          <Menu.Item
            key={`appSwitcher${module.menuModuleName}icon`}
            style={{ textAlign: 'center', padding: 0, height: 'auto' }}

            onClick={() => {
              history.push(`/${module.moduleName}/${this.getFirstEntityFromModule(module.moduleName)}`)
              storeSelectedModule({ selectedModule: module.moduleName })
              storeSelectedEntity({ selectedEntity: this.getFirstEntityFromModule(module.moduleName) })
            }}
          >

            <Row style={{ paddingTop: 10 }}>
              <Col span={24} style={{ color: 'black' }}>
                {OdinIcons(module.icon, 'moduleIcon')}
              </Col>
              <Col span={24} style={{ color: 'black' }}>
                {module.menuModuleName}
              </Col>
            </Row>
            {/*<Link to={`/${module.moduleName}/${this.getFirstEntityFromModule(module.moduleName)}`}>
              <Row style={{ paddingTop: '30px' }}>


              </Row>
            </Link>*/}

            {/*   <Link
            to={`/${module.moduleName}/${this.getFirstEntityFromModule(module.moduleName)}`}
            onClick={() => {

            }
            }
            className="topMenuAppLink"
          >

          </Link>*/}
          </Menu.Item>


        </Col>
      ))
    }


  }

  renderEntitiesMenu = () => {

    const { navigationReducer, storeSelectedEntity } = this.props

    const handleRouteChange = (selectedEntity: string) => {
      storeSelectedEntity({ selectedEntity: selectedEntity })
    }

    if (navigationReducer.selectedModule !== 'Home') {

      const targetedModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === navigationReducer.selectedModule)

      if (targetedModule && targetedModule.entities.length > 0) {

        return targetedModule.entities.map((entity: any) => (
          entity.isVisible ? (<Menu.Item onClick={() => handleRouteChange(entity.entityName)}
            key={entity.entityName}
            className={navigationReducer.selectedEntity === entity.entityName ? 'activeEntity' : 'inactiveEntity'}>
            <Link to={`/${targetedModule.moduleName}/${entity.entityName}`}>
              <span>{entity.menuEntityName}</span>
            </Link>
          </Menu.Item>) : null
        ))

      } else {
        return <></>
      }

    }

  }

  checkIfSchemasEnabled = () => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      return navigationReducer.navigationStructure.find((module: any) => module.moduleName === 'SchemaModule')
    }
  }

  checkIfFilesEnabled = () => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      const schemaModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === 'SchemaModule')
      console.log("navigationReducer.navigationStructure", navigationReducer.navigationStructure);
      return !!(schemaModule && schemaModule.entities.filter((entity: any) => entity.entityName === 'File'));
    }
  }

  checkIfWorkflowsEnabled = () => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      const schemaModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === 'SchemaModule')
      return !!(schemaModule && schemaModule.entities.filter((entity: any) => entity.entityName === 'WorkFlow'));
    }
  }

  checkIfUsersEnabled = () => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      return navigationReducer.navigationStructure.find((module: any) => module.moduleName === 'IdentityManagerModule')
    }
  }

  getFirstEntityFromModule = (moduleName: string) => {


    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure && navigationReducer.routingStructure) {
      const targetedModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === moduleName)
      return targetedModule && targetedModule.entities.length > 0 ? targetedModule.entities[0].entityName : ''
    }

  }

  getModuleMenuName = (moduleName: string) => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      const targetedModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === moduleName)
      return targetedModule ? targetedModule.menuModuleName : 'Apps'
    }
  }

  getModuleIcon = (moduleName: string) => {
    const { navigationReducer } = this.props

    if (navigationReducer && navigationReducer.navigationStructure) {
      const targetedModule = navigationReducer.navigationStructure.find((module: any) => module.moduleName === moduleName)
      return targetedModule ? OdinIcons(targetedModule.icon, 'moduleIcon') : ''
    }
  }

  renderLogo = () => {

    const organizationName = getOrganizationName()

    switch (organizationName) {
      case 'YouFibre':
        return <img src={YouFibreLogo} alt="YouFibre Logo" className="submenuLogo" />
      case 'Netomnia':
        return <img src={NetomniaLogo} alt="YouFibre Logo" className="submenuLogo" />
      case 'Default':
        return <UserOutlined className="submenuLogo" style={{
          backgroundColor: '#2e598a',
          fontSize: '2em',
          padding: '8px 35px 8px 8px',
          color: '#fff',
          margin: 0,
          borderRadius: '100%',
        }} />
      default:
        return <img src={YouFibreLogo} alt="YouFibre Logo" className="submenuLogo" />
    }

  }

  render() {

    const { userReducer, navigationReducer, storeSelectedModule, storeSelectedEntity } = this.props

    return (
      <Menu triggerSubMenuAction="click" theme="light" mode="horizontal" selectable={false}
        overflowedIndicator={<MenuOutlined />}
        className={`${getOrganizationName()}Colors`}
      >
        {/* APP SWITCHER */}
        {!isExternalUser(userReducer) && <SubMenu
          key="app"
          className={`appSwitcher ${getOrganizationName()}Colors`}
          icon={navigationReducer.selectedModule === 'Home' ?
            <HomeOutlined /> : this.getModuleIcon(navigationReducer.selectedModule)}
          title={<span style={{
            color: 'white',
            fontSize: '1.2em',
            fontWeight: 500,
            display: 'inline-block',
          }}>
            {navigationReducer.selectedModule === 'Home' ? 'Home' : this.getModuleMenuName(navigationReducer.selectedModule)}
          </span>
          }
        >
          <Row style={{ textAlign: 'center', width: '360px', height: this.getAppMenuHeight() }}>
            {
              navigationReducer.navigationStructure !== null ? this.renderModules() : <Spin />
            }
          </Row>

          {/* Main Dashboard */}
          {
            canUserAccessModule(userReducer, 'fullreporting')
              ?
              <>
                <Divider style={{ margin: '0 0 10px 0' }} />
                <Menu.Item
                  key="dashboard"
                  style={{ textAlign: 'center' }}
                  onClick={() => storeSelectedModule({ selectedModule: 'Dashboard' })}
                  icon={<DashboardOutlined />}
                >
                  <span>Dashboard</span>
                  <Link to={'/Dashboard'} />
                </Menu.Item>
              </>

              : <></>
          }

        </SubMenu>}

        {/* USER MANAGEMENT */}
        <SubMenu
          className="navigationTopItem"
          style={{ float: 'right' }}
          icon={<UserOutlined style={{ fontSize: '18px' }} />}
        >

          {/* User Information */}

          <Menu.Item key="UserInfo" style={{ height: 'auto' }}>
            <Row>
              <Col span={24} style={{ textAlign: 'center', padding: '15px 0 10px 0' }}>
                {this.renderLogo()}
              </Col>
              <Col span={24} style={{ textAlign: 'center', margin: 0 }}>
                <h3>{`${userReducer?.user?.firstname} ${userReducer?.user?.lastname}`}</h3>
              </Col>
            </Row>
          </Menu.Item>

          <Divider style={{ margin: '10px' }} />

          {/* My Drive */}
          {
            this.checkIfFilesEnabled()
              ?
              <Menu.Item key="MyDrive">
                <Link to="/SchemaModule/File">
                  <FolderOutlined style={{ padding: '5px' }} />
                  <span>My Drive</span>
                </Link>
              </Menu.Item>
              :
              <></>
          }

          {/* Workflows */}
          {
            this.checkIfWorkflowsEnabled()
              ?
              <Menu.Item key="Workflow">
                <Link to="/SchemaModule/Workflow">
                  <BranchesOutlined style={{ padding: '5px' }} />
                  <span>Workflows</span>
                </Link>
              </Menu.Item>
              :
              <></>
          }

          {/* Schemas */}
          {
            this.checkIfSchemasEnabled()
              ?
              <Menu.Item key="Schemas">
                <Link to="/SchemaModule/Schema/">
                  <PartitionOutlined style={{ padding: '5px' }} />
                  <span>Schemas</span>
                </Link>
              </Menu.Item>
              :
              <></>
          }

          {/* Users & Groups */}
          {
            this.checkIfUsersEnabled()
              ?
              <Menu.Item key="UsersAndPermissions">
                <Link to="/IdentityManagerModule/">
                  <UserOutlined style={{ padding: '5px' }} />
                  <span>Users & Groups</span>
                </Link>
              </Menu.Item>
              :
              <></>
          }

          {this.checkIfUsersEnabled() && this.checkIfSchemasEnabled() ?
            <Divider style={{ margin: '0 0 10px 0' }} /> : <></>}

          {/* Logout */}
          <Menu.Item key="UserSettings" onClick={() => this.handleLogout()}>
            <PoweroffOutlined style={{ color: 'red', padding: '5px' }} />
            <span style={{ color: 'red' }}>Sign out</span>
          </Menu.Item>

        </SubMenu>

        {/* HOME */}
        {!isExternalUser(userReducer) && <Menu.Item
          key="Home"
          className="navigationTopItem"
          icon={<HomeOutlined style={{ fontSize: '18px' }} />}
          onClick={() => {
            storeSelectedModule({ selectedModule: 'Home' })
            storeSelectedEntity({ selectedEntity: '' })
            history.push('/')
          }}
          style={{ float: 'right' }}
        />}

        {/* SEARCH */}
        {!isExternalUser(userReducer) && <Menu.Item
          key="Search"
          className="navigationTopItem"
          icon={<SearchOutlined style={{ fontSize: '18px' }} />}
          onClick={() => this.props.toggleSearchVisibility()}
          style={{ float: 'right' }}
        />}

        {/* MENU ITEMS */}
        {
          navigationReducer.navigationStructure ? this.renderEntitiesMenu() : <></>
        }

      </Menu>
    )
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer,
  recordReducer: state.recordReducer,
})

const mapDispatch = (dispatch: any) => ({
  logout: () => dispatch(logoutRequest()),
  toggleSearchVisibility: () => dispatch(toggleSearchVisibility()),
  updateUserRolesAndPermissions: () => dispatch(updateUserRolesAndPermissionsRequest()),
  storeSelectedModule: (params: { selectedModule: string }) => dispatch(storeSelectedModule(params)),
  storeSelectedEntity: (params: { selectedEntity: string }) => dispatch(storeSelectedEntity(params)),
  addNavigationStructure: (params: { navigationStructure: object }) => dispatch(addNavigationStructure(params)),
  addRoutingStructure: (params: { routingStructure: object }) => dispatch(addRoutingStructure(params)),
})

export default connect(mapState, mapDispatch)(Navigation)
