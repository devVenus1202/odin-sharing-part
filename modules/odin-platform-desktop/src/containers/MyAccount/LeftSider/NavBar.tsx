import React, { useState } from "react";
import { Drawer, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { getOrganizationName } from '../../../shared/http/helpers';

interface Props {
  menu: any
}
const NavBar = (props: Props) => {
  const [visible, setVisible] = useState(false);
  return (
    <nav className="navbar">
      <Button
        className="menu"
        type="text"
        icon={<MenuOutlined />}
        onClick={() => setVisible(true)}
      />
      <Drawer
        placement="left"
        // onClick={() => setVisible(false)}
        className={`${getOrganizationName()}Colors`}
        onClose={() => setVisible(false)}
        visible={visible}
      > 
        {props.menu}
     </Drawer>
    </nav>
  );
};
export default NavBar;