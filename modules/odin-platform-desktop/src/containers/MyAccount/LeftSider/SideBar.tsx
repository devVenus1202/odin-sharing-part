import React, {useState} from "react";
import { Layout } from "antd";
import { getOrganizationName } from '../../../shared/http/helpers';

interface Props {
  menu: any
}
const SideBar = (props: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const onCollapse = (collapsed:boolean) => {
    setCollapsed(collapsed);
  };
  return (
    <Layout.Sider
    collapsible collapsed={collapsed} onCollapse={onCollapse} className={`${getOrganizationName()}Colors sidebar`}
    >
      {props.menu}
   </Layout.Sider>
   );
};
export default SideBar;