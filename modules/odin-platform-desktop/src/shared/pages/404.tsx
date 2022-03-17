import React, { useEffect } from 'react';
import { connect } from "react-redux";
import { Button, Result } from "antd";
import history from "../utilities/browserHisory";
import { withRouter } from "react-router-dom";
import { storeSelectedEntity, storeSelectedModule } from "../../core/navigation/store/actions";

interface Props {
  navigationReducer: any,
  storeSelectedEntity: any,
  storeSelectedModule: any
}

const Error404 = (props: Props) => {

  const {storeSelectedEntity, storeSelectedModule, navigationReducer } = props

  useEffect(() => {
    storeSelectedModule({selectedModule:'Home'})
    storeSelectedEntity({selectedEntity:''})
  },
    [navigationReducer.selectedModule]
  );

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
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

export default withRouter(connect(mapState, mapDispatch)(Error404));
