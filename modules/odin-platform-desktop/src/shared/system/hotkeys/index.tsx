import React from 'react'
import {
  toggleSearchVisibility
} from "../../../core/records/store/actions";
import {connect} from "react-redux";
import {IRecordReducer} from "../../../core/records/store/reducer";
import history from "../../utilities/browserHisory";

interface Props {
  recordReducer: IRecordReducer,
  toggleSearchVisibility: any,
}

class HotKeyWrapper extends React.Component<Props>{

  constructor(props: any) {
    super(props)
    this.catchHotKeys = this.catchHotKeys.bind(this)
  }

  componentDidMount() {
    document.addEventListener('keydown', this.catchHotKeys, false)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.catchHotKeys, false)
  }

  catchHotKeys = (event: any) => {


    /* Toggle Search Drawer [Ctrl + Alt + s] */
    if(event.keyCode === 83 && event.altKey) {
      this.props.toggleSearchVisibility()
    }

    /* Route user to Home page [Ctrl + Alt + h] */
    if(event.keyCode === 72 && event.altKey) {
      history.push('/')
    }

  }

  render() {
    return(<></>)
  }

}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
});

const mapDispatch = (dispatch: any) => ({
  toggleSearchVisibility : () => dispatch(toggleSearchVisibility())
});

export default connect(mapState, mapDispatch)(HotKeyWrapper)
