import React, { useEffect } from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { addPathToHistory, storeSelectedEntity, storeSelectedModule } from "./store/actions";
import { isUserAuthenticated } from "../../shared/permissions/rbacRules";
import { Helmet } from "react-helmet"
import Favicon from 'react-favicon'

type PathParams = {
  url: string,
  recordId: string
}
type PropsType = RouteComponentProps<PathParams> & {
  userReducer: any,
  navigationReducer: any,
  history: any,
  addPathToHistory: any,
  storeSelectedEntity: any,
  storeSelectedModule: any
}


const OdinHelmet = (props: PropsType) => {

  const { addPathToHistory, navigationReducer, history, userReducer, storeSelectedEntity, storeSelectedModule } = props
  const currentPath = props.history.location.pathname

  const setModuleAndEntityToNavReducer = (currentPath: string) => {

    /* Home path */
    if(currentPath.split('/')[1] === '' && currentPath.split('/')[1] !== 'login') {
      storeSelectedModule({ selectedModule: 'Home' })
      storeSelectedEntity({ selectedEntity: '' })
    } else if(currentPath.split('/')[1] !== '' && currentPath.split('/')[1] !== 'login') {
      storeSelectedModule({ selectedModule: currentPath.split('/')[1] })
      storeSelectedEntity({ selectedEntity: currentPath.split('/')[2] })
    }

  }

  const handlePathChange = () => {

    /* User not authenticated / No previousPage */
    if(!isUserAuthenticated(userReducer) &&
      !navigationReducer.previousPage &&
      !currentPath.includes('/register') &&
      !currentPath.includes('/forgot-password') &&
      !currentPath.includes('/reset-password/')) {
      setModuleAndEntityToNavReducer(currentPath)
      history.push('/login')
    }
    /* User is authenticated / No previousPage */
    else if(isUserAuthenticated(userReducer) && !navigationReducer.previousPage) {
      setModuleAndEntityToNavReducer(currentPath)
      addPathToHistory({ path: '/' })
    }
    /* User is authenticated / Previous page is different, adding new one! */
    else if(navigationReducer.previousPage && navigationReducer.previousPage !== currentPath) {
      setModuleAndEntityToNavReducer(currentPath)
      addPathToHistory({ path: currentPath })
    }
  }

  useEffect(() => {
    handlePathChange()
  }, [ currentPath ]);


  const constructTitle = () => {

    const hostName = window.location.host

    if(hostName && hostName.indexOf('youfibre') > -1) {
      return 'YouFibre'
    } else if(hostName && hostName.indexOf('netomnia') > -1) {
      return 'Netomnia'
    } else if(hostName && hostName.indexOf('sandbox') > -1) {
      return 'Sandbox'
    } else {
      return 'Develop'
    }

  }

  const constructFavicon = (organization: string) => {
    switch (organization) {
      case 'YouFibre':
        return 'youfibre-favicon.png'
      case 'Netomnia':
        return 'netomnia-favicon.png'
      default:
        return 'logo512.png'
    }
  }

  return (
    <>
      <Favicon url={
        constructFavicon(
          constructTitle()
        )
      }/>
      <Helmet>
        <meta charSet="utf-8"/>
        <title>{`ODIN | ${constructTitle()}`}</title>
      </Helmet>
    </>
  )
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
  navigationReducer: state.navigationReducer
});

const mapDispatch = (dispatch: any) => ({
  storeSelectedModule: (params: { selectedModule: string }) => dispatch(storeSelectedModule(params)),
  storeSelectedEntity: (params: { selectedEntity: string }) => dispatch(storeSelectedEntity(params)),
  addPathToHistory: (params: { path: string, title: string }) => dispatch(addPathToHistory(params)),
});


export default withRouter(connect(mapState, mapDispatch)(OdinHelmet));
