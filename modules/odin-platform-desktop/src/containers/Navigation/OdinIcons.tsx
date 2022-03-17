import {
  BankOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  FolderOutlined,
  HomeOutlined,
  IdcardOutlined,
  NotificationOutlined,
  PartitionOutlined,
  PoweroffOutlined,
  ProjectOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import React from 'react'
import '../../cst-theme.scss'

export default function OdinIcons(iconLabel: string, iconClass: string = '') {

  switch (iconLabel) {
    case 'SettingOutlined' :
      return <SettingOutlined className={iconClass}/>
    case 'HomeOutlined' :
      return <HomeOutlined className={iconClass}/>
    case 'UserOutlined' :
      return <UserOutlined className={iconClass}/>
    case 'SearchOutlined' :
      return <SearchOutlined className={iconClass}/>
    case 'PoweroffOutlined' :
      return <PoweroffOutlined className={iconClass}/>
    case 'IdcardOutlined' :
      return <IdcardOutlined className={iconClass}/>
    case 'ShoppingCartOutlined' :
      return <ShoppingCartOutlined className={iconClass}/>
    case 'CalendarOutlined' :
      return <CalendarOutlined className={iconClass}/>
    case 'BankOutlined' :
      return <BankOutlined className={iconClass}/>
    case 'CustomerServiceOutlined' :
      return <CustomerServiceOutlined className={iconClass}/>
    case 'BarcodeOutlined' :
      return <BarcodeOutlined className={iconClass}/>
    case 'WifiOutlined' :
      return <WifiOutlined className={iconClass}/>
    case 'EnvironmentOutlined' :
      return <EnvironmentOutlined className={iconClass}/>
    case 'ProjectOutlined' :
      return <ProjectOutlined className={iconClass}/>
    case 'FolderOutlined' :
      return <FolderOutlined className={iconClass}/>
    case 'PartitionOutlined' :
      return <PartitionOutlined className={iconClass}/>
    case 'NotificationOutlined':
      return <NotificationOutlined className={iconClass}/>
    default:
      return <HomeOutlined/>
  }

}
