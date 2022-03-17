import { Component } from 'react'
import { connect } from 'react-redux';
import { getConnectedAppsDataRequest } from '../../identityConnectedApps/store/actions';

const canUseDOM = (): boolean => {
  if (typeof window === 'undefined' || !window.document || !window.document.createElement) {
    return false
  }
  return true
}

interface PropsType {
  defer: boolean;
  identityConnectedAppsReducer: any;
  onLoaded?: () => void;
  getConnectedAppsList: () => void;
}

declare global {
  interface Window {
    zE: any;
    zESettings: any;
  }
}

const ZENDESK_KEY = process.env.REACT_APP_ZENDESK_API_KEY;

export const ZendeskAPI = (...args: any) => {
  if (canUseDOM() && window.zE) {
    window.zE.apply(null, args)
  }
}

class Zendesk extends Component<PropsType> {
  constructor(props: PropsType) {
    super(props)
    this.insertScript = this.insertScript.bind(this)
    this.onScriptLoaded = this.onScriptLoaded.bind(this)
  }

  onScriptLoaded() {
    if (typeof this.props.onLoaded === 'function') {
      this.props.onLoaded();
    }
  }

  insertScript(apiKey: string, defer: boolean) {
    const script = document.createElement('script')
    if (defer) {
      script.defer = true
    } else {
      script.async = true
    }
    script.id = 'ze-snippet'
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${apiKey}`
    script.addEventListener('load', this.onScriptLoaded);
    document.body.appendChild(script)
  }

  loadChatWidget() {
    const connectedApps = this.props.identityConnectedAppsReducer?.list;
    const zendeskApp = connectedApps?.find((it: any) => it.name === 'ZENDESK_CHAT');
    if (zendeskApp) {
      const apiKey = zendeskApp.apiKey;

      if (canUseDOM() && !window.zE && apiKey) {
        const { defer, ...other } = this.props
        this.insertScript(apiKey, true)
        window.zESettings = other
      }
    }
  }

  componentDidMount() {
    if (this.props.identityConnectedAppsReducer.list.length === 0) {
      this.props.getConnectedAppsList()
    } else {
      this.loadChatWidget()
    }
  }

  componentDidUpdate(prevProp: PropsType) {
    if (prevProp.identityConnectedAppsReducer.list.length === 0 && this.props.identityConnectedAppsReducer.list.length > 0) {
      this.loadChatWidget()
    }
  }

  render() {
    return null
  }
}


const mapState = (state: any) => ({
  identityConnectedAppsReducer: state.identityConnectedAppsReducer,
});

const mapDispatch = (dispatch: any) => ({
  getConnectedAppsList: () => dispatch(getConnectedAppsDataRequest()),
});

export default connect(mapState, mapDispatch)(Zendesk);
