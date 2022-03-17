const appIcons: any = {
  OrderModule: 'ShoppingCartOutlined',
  ProductModule: 'BarcodeOutlined',
  BillingModule: 'BankOutlined',
  FieldServiceModule: 'CalendarOutlined',
  CrmModule: 'IdcardOutlined',
  ProjectModule: 'ProjectOutlined',
  ServiceModule: 'WifiOutlined',
  SupportModule: 'CustomerServiceOutlined',
  SchemaModule: 'PartitionOutlined',
  IdentityManagerModule: 'UserOutlined',
  NoteModule: 'BorderOutlined',
}
export default function yfMenuItems(schemas: Array<any>): Array<any> {
  const schemasMap: any = {}
  const excludedModuleNames = ['SchemaModule', 'IdentityModule'];
  if (schemas) {

    schemas.forEach((schema: any) => {
      if (!schemasMap[schema.moduleName]) {
        schemasMap[schema.moduleName] = {
          moduleName: schema.moduleName,
          menuModuleName: schema.moduleName.replace('Module', ''),
          showInApps: !excludedModuleNames.includes(schema.moduleName),
          icon: appIcons[schema.moduleName] || 'BorderOutlined',
          entities: [],
        }
      }
      schemasMap[schema.moduleName].entities.push({
        entityName: schema.entityName,
        menuEntityName: schema.menuLabel || schema.entityName,
        position: schema.position,
        isVisible: schema.isVisibleInGlobalNav !== false
      })
    })

    const schemaList = Object.values(schemasMap);
    schemaList.sort((a: any, b: any) => a.moduleName > b.moduleName ? 1 : -1);
    schemaList.forEach((schema: any) => {
      schema.entities.sort((a: any, b: any) => {
        if (a.position && b.position) {
          return a.position > b.position ? 1 : -1
        } else if (a.position) {
          return -1;
        } else if (b.position) {
          return 1;
        } else {
          return a.entityName > b.entityName ? 1 : -1
        }
      })
    })

    // Add IdentitModule since this is not supported by Schema
    schemaList.push({
      'moduleName': 'IdentityManagerModule',
      'menuModuleName': 'Users & Groups',
      'showInApps': false,
      'icon': 'UserOutlined',
      'entities': [
        {
          'entityName': '',
          'menuEntityName': 'Identity Manager',
        },
      ],
    })
    return schemaList;
  }
  return [
    {
      'moduleName': 'OrderModule',
      'menuModuleName': 'Orders',
      'showInApps': true,
      'icon': 'ShoppingCartOutlined',
      'entities': [
        {
          'entityName': 'Dashboard',
          'menuEntityName': 'Dashboard',
        },
        {
          'entityName': 'Order',
          'menuEntityName': 'Orders',
        },
        {
          'entityName': 'SplitOrder',
          'menuEntityName': 'Split Orders',
        },
        {
          'entityName': 'ReturnOrder',
          'menuEntityName': 'Return Orders',
        },
        {
          'entityName': 'BillingAdjustment',
          'menuEntityName': 'Billing Adjustments',
        },
      ],
    },


    {
      'moduleName': 'ProductModule',
      'menuModuleName': 'Products',
      'showInApps': true,
      'icon': 'BarcodeOutlined',
      'entities': [
        {
          'entityName': 'Discount',
          'menuEntityName': 'Discounts',
        },
        {
          'entityName': 'Product',
          'menuEntityName': 'Products',
        },
        {
          'entityName': 'Vendor',
          'menuEntityName': 'Vendors',
        },
        {
          'entityName': 'PriceBook',
          'menuEntityName': 'Price Books',
        },
        {
          'entityName': 'Offer',
          'menuEntityName': 'Offers',
        },
        {
          'entityName': 'ProductComponent',
          'menuEntityName': 'Product Components',
        },
      ],
    },


    {
      'moduleName': 'BillingModule',
      'menuModuleName': 'Billing',
      'showInApps': true,
      'icon': 'BankOutlined',
      'entities': [
        {
          'entityName': 'Dashboard',
          'menuEntityName': 'Dashboard',
        },
        {
          'entityName': 'Invoice',
          'menuEntityName': 'Invoices',
        },
        {
          'entityName': 'CreditNote',
          'menuEntityName': 'Credit Notes',
        },
        {
          'entityName': 'Transaction',
          'menuEntityName': 'Transactions',
        },
        {
          'entityName': 'PaymentMethod',
          'menuEntityName': 'Payment Methods',
        },
        {
          'entityName': 'BillingRequest',
          'menuEntityName': 'Billing Requests',
        },
      ],
    },


    {
      'moduleName': 'FieldServiceModule',
      'menuModuleName': 'Field Service',
      'showInApps': true,
      'icon': 'CalendarOutlined',
      'entities': [
        {
          'entityName': 'Dashboard',
          'menuEntityName': 'Dashboard',
        },
        {
          'entityName': 'Calendar',
          'menuEntityName': 'Calendar',
        },
        {
          'entityName': 'WorkOrder',
          'menuEntityName': 'Work Orders',
        },
        {
          'entityName': 'ServiceAppointmentConfig',
          'menuEntityName': 'Appointment Config',
        },
      ],
    },


    {
      'moduleName': 'CrmModule',
      'menuModuleName': 'CRM',
      'showInApps': true,
      'icon': 'IdcardOutlined',
      'entities': [
        {
          'entityName': 'Dashboard',
          'menuEntityName': 'Dashboard',
        },
        {
          'entityName': 'Address',
          'menuEntityName': 'Addresses',
        },
        {
          'entityName': 'Contact',
          'menuEntityName': 'Contacts',
        },
        {
          'entityName': 'Account',
          'menuEntityName': 'Accounts',
        },
        {
          'entityName': 'Lead',
          'menuEntityName': 'Leads',
        },
        {
          'entityName': 'Organization',
          'menuEntityName': 'Organizations',
        },
        {
          'entityName': 'Premise',
          'menuEntityName': 'Premises',
        },
        {
          'entityName': 'Visit',
          'menuEntityName': 'Visits',
        },
        {
          'entityName': 'AccountContactRole',
          'menuEntityName': 'AccountContactRoles',
        },
      ],
    },


    {
      'moduleName': 'ProjectModule',
      'menuModuleName': 'Projects',
      'showInApps': true,
      'icon': 'ProjectOutlined',
      'entities': [
        {
          'entityName': 'Dashboard',
          'menuEntityName': 'Dashboard',
        },
        {
          'entityName': 'Map',
          'menuEntityName': 'Map',
        },
        {
          'entityName': 'Connection',
          'menuEntityName': 'Connections',
        },
        {
          'entityName': 'Feature',
          'menuEntityName': 'Features',
        },
        {
          'entityName': 'FeatureComponent',
          'menuEntityName': 'Feature Components',
        },
        // {
        //   'entityName': 'ChangeRequest',
        //   'menuEntityName': 'Change Requests',
        // },
        {
          'entityName': 'Region',
          'menuEntityName': 'Regions',
        },
        {
          'entityName': 'Exchange',
          'menuEntityName': 'Exchanges',
        },
        {
          'entityName': 'Program',
          'menuEntityName': 'Programs',
        },
        {
          'entityName': 'Project',
          'menuEntityName': 'Projects',
        },
        {
          'entityName': 'Task',
          'menuEntityName': 'Tasks',
        },
        {
          'entityName': 'Job',
          'menuEntityName': 'Jobs',
        },
        {
          'entityName': 'TaskTemplate',
          'menuEntityName': 'Task Templates',
        },
        {
          'entityName': 'JobTemplate',
          'menuEntityName': 'Job Templates',
        },
        {
          'entityName': 'FeatureModel',
          'menuEntityName': 'Feature Models',
        },
        {
          'entityName': 'OpenreachNoi',
          'menuEntityName': 'Openreach NOI',
        },
        {
          'entityName': 'OpenreachInventory',
          'menuEntityName': 'Openreach Inventory',
        },
        {
          'entityName': 'BuildComplete',
          'menuEntityName': 'Build Complete',
        },
      ],
    },


    {
      'moduleName': 'ServiceModule',
      'menuModuleName': 'Services',
      'showInApps': true,
      'icon': 'WifiOutlined',
      'entities': [
        {
          'entityName': 'Service',
          'menuEntityName': 'Services',
        },
        {
          'entityName': 'NetworkDevice',
          'menuEntityName': 'Network Devices',
        },
        {
          'entityName': 'CustomerDeviceOnt',
          'menuEntityName': 'Customer Devices (ONT)',
        },
        {
          'entityName': 'CustomerDeviceRouter',
          'menuEntityName': 'Customer Devices (Router)',
        },
        {
          'entityName': 'CustomerPhonePorting',
          'menuEntityName': 'Customer Phone Porting',
        },
      ],
    },


    {
      'moduleName': 'SupportModule',
      'menuModuleName': 'Support',
      'showInApps': true,
      'icon': 'CustomerServiceOutlined',
      'entities': [
        {
          'entityName': 'Note',
          'menuEntityName': 'Notes',
        },
      ],
    },


    {
      'moduleName': 'SchemaModule',
      'menuModuleName': 'Schemas',
      'showInApps': false,
      'icon': 'PartitionOutlined',
      'entities': [
        {
          'entityName': 'Schema',
          'menuEntityName': 'Schemas',
        },
        {
          'entityName': 'File',
          'menuEntityName': 'My Drive',
        },

        {
          'entityName': 'Workflow',
          'menuEntityName': 'Workflow',
        },

      ],
    },

    {
      'moduleName': 'IdentityManagerModule',
      'menuModuleName': 'Users & Groups',
      'showInApps': false,
      'icon': 'UserOutlined',
      'entities': [
        {
          'entityName': '',
          'menuEntityName': 'Identity Manager',
        },
      ],
    },


  ]
}
