import { Card, Space, Tabs } from 'antd';
import React, { ReactNode } from 'react';

const { TabPane } = Tabs;

interface Props {
  title: string | JSX.Element;
  tabList: { key: string; tab: ReactNode }[];
  contentList: { [key: string]: ReactNode };
  defaultTabKey?: string;
  extra?: any;
}

interface State {
}

class CardWithTabs extends React.Component<Props, State> {
  state = {
    key: undefined,
  };

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    if ((!this.state.key && this.props.defaultTabKey) || (prevProps.defaultTabKey !== this.props.defaultTabKey)) {
      this.setState({
        key: this.props.defaultTabKey,
      })
    }
  }

  onTabChange = (key: string, type: string) => {
    this.setState({ [type]: key });
  };

  render() {
    const { title, defaultTabKey, tabList, contentList, extra } = this.props;

    return (
      <div style={{ width: '100%', marginBottom: '1rem' }}>
        <Card
          size="small"
          title={title}
          defaultActiveTabKey={defaultTabKey}
          extra={<Space>{extra}</Space>}
        >
          {
            // check if tabList contains defaultTabKey as key prop
            tabList.some((el: { key: string, tab: ReactNode }) => el.key === defaultTabKey || defaultTabKey === '') ?
              <Tabs size="small" defaultActiveKey={defaultTabKey} activeKey={this.state.key} onTabClick={key => {
                this.onTabChange(key, 'key');
              }} destroyInactiveTabPane>
                {tabList && tabList.map(elem => (
                  <TabPane destroyInactiveTabPane tab={elem.tab} key={elem.key}>
                    {contentList[elem.key]}
                  </TabPane>
                ))}
              </Tabs>
              : <Tabs size="small" defaultActiveKey={defaultTabKey} activeKey={this.state.key} onTabClick={key => {
                this.onTabChange(key, 'key');
              }} destroyInactiveTabPane>
                {tabList && tabList.map(elem => (
                  <TabPane destroyInactiveTabPane tab={elem.tab} key={elem.key}>
                    {contentList[elem.key]}
                  </TabPane>
                ))}
              </Tabs>
          }
        </Card>

        <div style={{ marginTop: 16 }}>
          {this.props.children}
        </div>

      </div>
    );
  }
}

export default CardWithTabs;
