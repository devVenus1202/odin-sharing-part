import { FilterOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { generateModuleAndEntityKeyFromProps } from '../../../../../../shared/utilities/searchHelpers';
import { toggleQueryBuilder } from '../store/actions';

interface Props {
  moduleName: string | undefined,
  entityName: string | undefined,
  toggle: () => {},
}

class QueryBuilderToggle extends React.Component<Props> {

  render() {
    const { toggle } = this.props;
    return (
      <Button onClick={() => toggle()} style={{ marginRight: 4 }} icon={<FilterOutlined/>}/>
    )
  }
}

const mapState = (state: any) => ({
  queryBuilderReducer: state.queryBuilderReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  toggle: () => dispatch(toggleQueryBuilder(generateModuleAndEntityKeyFromProps(ownProps))),
});


export default connect(mapState, mapDispatch)(QueryBuilderToggle);

