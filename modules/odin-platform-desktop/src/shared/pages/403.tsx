import React, {useEffect} from 'react';
import { connect } from "react-redux";
import { Button, Result } from "antd";
import history from "../utilities/browserHisory";
import { storeSelectedEntity, storeSelectedModule } from "../../core/navigation/store/actions";
import { withRouter } from "react-router-dom";

interface Props {
  navigationReducer: any,
  storeSelectedEntity: any,
  storeSelectedModule: any
}

const Error403 = (props: Props) => {

  const {storeSelectedEntity, storeSelectedModule, navigationReducer } = props

  useEffect(() => {
      storeSelectedModule({selectedModule:'Home'})
      storeSelectedEntity({selectedEntity:''})
    },
    [navigationReducer.selectedModule]
  );

  return (
    <Result
      status="403"
      title="403"
      subTitle="Sorry, you are not authorized to access this page."
      extra={<Button type="primary" onClick={() => history.push('/')}>Back Home</Button>}
    />
  )
};

const mapDispatch = (dispatch: any) => ({
  storeSelectedModule: (params: { selectedModule: string }) => dispatch(storeSelectedModule(params)),
  storeSelectedEntity: (params: { selectedEntity: string }) => dispatch(storeSelectedEntity(params)),
});

const mapState = (state: any) => ({
  navigationReducer: state.navigationReducer,
  userReducer: state.userReducer
});

export default withRouter(connect(mapState, mapDispatch)(Error403));
