// src/components/Sidebar/SidebarStructure.js
import {
  Home as HomeIcon,
  Category as CategoryIcon,
  Store as CollectionCenterIcon,
  Warehouse as WarehouseIcon,
  Receipt as PurchaseIcon,
  ShoppingCart as ProductsIcon,
  Inventory as InventoryIcon,
  Storefront as CcInventoryIcon,
  Person as AgentIcon,
  PointOfSale as SalesIcon,
  LocalShipping as DistributionIcon,
  TransferWithinAStation as TransferIcon,
  SwapHoriz as StockMovementIcon,
  LocalShipping as SupplierIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  People as UsersIcon,
  Security as RolesIcon,
  VpnKey as PermissionsIcon,
  History as AuditIcon,
  VpnKey as OTPIcon,
  LockOpen as FailedLoginIcon,
  PeopleAlt as CustomersIcon,
  Receipt as InvoiceIcon,
  Analytics as AnalyticsIcon,
  Storefront as StorefrontIcon,
  ReceiptLong as ReturnsIcon, // 👈 Add returns icon
} from '@mui/icons-material';

const addIf = (condition, item) => (condition ? [item] : []);

export function getSidebarStructure(hasPermission) {
  const structure = [];

  // ----- Dashboard / Agent Analytics / Branch Owner Analytics -----
  if (hasPermission('dashboard.view')) {
    structure.push({
      id: 0,
      label: 'Dashboard',
      link: '/app/dashboard',
      icon: <HomeIcon />,
    });
  } else if (hasPermission('agent-dashboard.view')) {
    structure.push({
      id: 'agent-dashboard',
      label: 'Dashboard',
      link: '/app/agent-analytics',
      icon: <AnalyticsIcon />,
    });
  } else if (hasPermission('cc_center_dashboard.view')) {
    structure.push({
      id: 'branch-owner-dashboard',
      label: 'Dashboard',
      link: '/app/branch-owner-analytics',
      icon: <StorefrontIcon />,
    });
  }

  // ----- Collection Centers -----
  const hasCCPerm = hasPermission('collection_centers.view') || hasPermission('collection_centers.create') ||
      hasPermission('collection_centers.edit') || hasPermission('collection_centers.delete') ||
      hasPermission('collection_centers.restore');
  if (hasCCPerm) {
    structure.push({
      id: 2,
      label: 'Collection Centers',
      link: '/app/collection-centers',
      icon: <CollectionCenterIcon />,
      children: [{ label: 'Manage Centers', link: '/app/collection-centers' }],
    });
  }

  // ----- Warehouses -----
  const hasWarehousePerm = hasPermission('warehouses.view') || hasPermission('warehouses.create') ||
      hasPermission('warehouses.edit') || hasPermission('warehouses.delete') ||
      hasPermission('warehouses.restore') || hasPermission('warehouses.force_delete') ||
      hasPermission('warehouses.change_status');
  if (hasWarehousePerm) {
    structure.push({
      id: 3,
      label: 'Warehouses',
      link: '/app/warehouses',
      icon: <WarehouseIcon />,
      children: [{ label: 'Manage Warehouses', link: '/app/warehouses' }],
    });
  }

  // ----- Suppliers -----
  const hasSupplierPerm = hasPermission('suppliers.view') || hasPermission('suppliers.create') ||
      hasPermission('suppliers.edit') || hasPermission('suppliers.delete') ||
      hasPermission('suppliers.restore') || hasPermission('suppliers.force_delete') ||
      hasPermission('suppliers.change_status');
  if (hasSupplierPerm) {
    structure.push({
      id: 13,
      label: 'Suppliers',
      link: '/app/suppliers',
      icon: <SupplierIcon />,
      children: [{ label: 'Manage Suppliers', link: '/app/suppliers' }],
    });
  }

  // ----- Product Categories -----
  const hasCategoryPerm = hasPermission('categories.view') || hasPermission('categories.create') ||
      hasPermission('categories.edit') || hasPermission('categories.delete');
  if (hasCategoryPerm) {
    structure.push({
      id: 1,
      label: 'Product Categories',
      link: '/app/product-categories',
      icon: <CategoryIcon />,
      children: [{ label: 'Manage Categories', link: '/app/product-categories' }],
    });
  }

  // ----- Purchases -----
  const hasPurchasePerm = hasPermission('purchases.view') || hasPermission('purchases.create') ||
      hasPermission('purchases.edit') || hasPermission('purchases.delete') ||
      hasPermission('purchases.update_status');
  if (hasPurchasePerm) {
    structure.push({
      id: 4,
      label: 'Purchases',
      link: '/app/purchases',
      icon: <PurchaseIcon />,
      children: [{ label: 'Manage Purchases', link: '/app/purchases' }],
    });
  }

  // ----- Products -----
  const hasProductPerm = hasPermission('products.view') || hasPermission('products.create') ||
      hasPermission('products.edit') || hasPermission('products.delete') ||
      hasPermission('products.restore') || hasPermission('products.force_delete') ||
      hasPermission('products.change_status') || hasPermission('products.scan') ||
      hasPermission('products.assign_imei');
  if (hasProductPerm) {
    structure.push({
      id: 5,
      label: 'Products',
      link: '/app/products',
      icon: <ProductsIcon />,
      children: [{ label: 'Manage Products', link: '/app/products' }],
    });
  }

  // ----- Inventory (Warehouse) -----
  const hasInventoryPerm = hasPermission('inventory.view') || hasPermission('inventory.create') ||
      hasPermission('inventory.edit') || hasPermission('inventory.delete');
  if (hasInventoryPerm) {
    structure.push({
      id: 6,
      label: 'Inventory',
      link: '/app/inventory',
      icon: <InventoryIcon />,
      children: [{ label: 'Manage Inventory', link: '/app/inventory' }],
    });
  }

  // ----- Transfer Requests -----
  const hasTransferPerm = hasPermission('transfer_requests.view') || hasPermission('transfer_requests.create') ||
      hasPermission('transfer_requests.approve') || hasPermission('transfer_requests.reject') ||
      hasPermission('transfer_requests.process') || hasPermission('transfer_requests.scan_receipt') ||
      hasPermission('transfer_requests.confirm_receipt') || hasPermission('transfer_requests.delete');
  if (hasTransferPerm) {
    structure.push({
      id: 11,
      label: 'Transfer Requests',
      link: '/app/transfer-requests',
      icon: <TransferIcon />,
      children: [{ label: 'Manage Requests', link: '/app/transfer-requests' }],
    });
  }

  // ----- Collection Center Inventory -----
  const hasCcInvPerm = hasPermission('cc_inventory.view') || hasPermission('cc_inventory.create') ||
      hasPermission('cc_inventory.edit') || hasPermission('cc_inventory.delete');
  if (hasCcInvPerm) {
    structure.push({
      id: 7,
      label: 'CC Inventory',
      link: '/app/cc-inventory',
      icon: <CcInventoryIcon />,
      children: [{ label: 'Manage CC Inventory', link: '/app/cc-inventory' }],
    });
  }

  // ----- Stock Movements -----
  const hasStockMovPerm = hasPermission('stock_movements.view') || hasPermission('stock_movements.create') ||
      hasPermission('stock_movements.edit') || hasPermission('stock_movements.delete');
  if (hasStockMovPerm) {
    structure.push({
      id: 12,
      label: 'Stock Movements',
      link: '/app/stock-movements',
      icon: <StockMovementIcon />,
      children: [{ label: 'View Movements', link: '/app/stock-movements' }],
    });
  }

  // ----- Distributions -----
  const hasDistPerm = hasPermission('distributions.view') || hasPermission('distributions.create') ||
      hasPermission('distributions.confirm_receipt') || hasPermission('distributions.scan_imei') ||
      hasPermission('distributions.view_available_stock');
  if (hasDistPerm) {
    structure.push({
      id: 10,
      label: 'Distributions',
      link: '/app/distributions',
      icon: <DistributionIcon />,
      children: [{ label: 'Manage Distributions', link: '/app/distributions' }],
    });
  }

  // ----- Agent Inventory -----
  const hasAgentInvPerm = hasPermission('distributions.view_available_stock') ||
      hasPermission('distributions.confirm_receipt') ||
      hasPermission('distributions.scan_imei') ||
      hasPermission('distributions.view') ||
      hasPermission('transfer_requests.create') ||
      hasPermission('transfer_requests.view') ||
      hasPermission('receipts.view_own') ||
      hasPermission('dashboard.agent.view');
  if (hasAgentInvPerm) {
    structure.push({
      id: 8,
      label: 'Agent Inventory',
      link: '/app/agent-inventory',
      icon: <AgentIcon />,
      children: [{ label: 'Me Stock', link: '/app/agent-inventory' }],
    });
  }

  // ----- Customers -----
  const hasCustomerPerm = hasPermission('customers.view') || hasPermission('customers.create') ||
      hasPermission('customers.edit') || hasPermission('customers.delete') ||
      hasPermission('customers.restore');
  if (hasCustomerPerm) {
    structure.push({
      id: 16,
      label: 'Customers',
      link: '/app/customers',
      icon: <CustomersIcon />,
      children: [{ label: 'Manage Customers', link: '/app/customers' }],
    });
  }

  // ----- Sales (Sales Dashboard only) -----
  const hasSalesPerm = hasPermission('agent.sale.create') || hasPermission('agent.sales.view') ||
      hasPermission('agent.sale.view') || hasPermission('reports.sales.view');
  if (hasSalesPerm) {
    structure.push({
      id: 9,
      label: 'Sales',
      link: '/app/sales',
      icon: <SalesIcon />,
      children: [{ label: 'Sales Dashboard', link: '/app/sales' }],
    });
  }

  // 👇 ----- Returns -----
  const hasReturnsPerm = hasPermission('returns.view') || hasPermission('returns.create') ||
      hasPermission('returns.submit') || hasPermission('returns.cancel');
  if (hasReturnsPerm) {
    structure.push({
      id: 18,
      label: 'Returns',
      link: '/app/returns',
      icon: <ReturnsIcon />,
      children: [
        { label: 'All Returns', link: '/app/returns' },
        ...addIf(hasPermission('returns.create'), { label: 'New Return', link: '/app/returns' }),
      ],
    });
  }

  // ----- Invoices -----
  const hasInvoicePerm = hasPermission('invoices.view') || hasPermission('invoices.download');
  if (hasInvoicePerm) {
    structure.push({
      id: 17,
      label: 'Invoices',
      link: '/app/invoices',
      icon: <InvoiceIcon />,
      children: [{ label: 'Manage Invoices', link: '/app/invoices' }],
    });
  }

  // ----- Reports -----
  const hasAnyReportPerm = hasPermission('reports.stock.view') || hasPermission('reports.inventory.view') ||
      hasPermission('reports.sales.view') || hasPermission('reports.receipts.view') ||
      hasPermission('reports.customers.view') || hasPermission('reports.suppliers.view')  ||
      hasPermission('branch-owner-reports.stock.view');

  if (hasAnyReportPerm) {
    const reportChildren = [];

    if (hasPermission('reports.purchases.view')) {
      reportChildren.push({
        label: 'Purchase Reports',
        children: [
          { label: 'Daily', link: '/app/reports/Purchase/daily' },
        ],
      });
    }

    if (hasPermission('reports.sales.view')) {
      reportChildren.push({
        label: 'Sales Reports',
        children: [
          { label: 'Daily', link: '/app/reports/sales/daily' },
        ],
      });
    }

    if (hasPermission('reports.stock.view')) {
      reportChildren.push({
        label: 'Stock Reports',
        children: [
          { label: 'Daily', link: '/app/reports/stock/daily' },
        ],
      });
    }

    if (hasPermission('branch-owner-reports.stock.view')) {
      reportChildren.push({
        label: 'Branch Stock Report',
        children: [
          { label: 'Print Stock Report', link: '/app/reports/branch-owner-reports' },
        ],
      });
    }

    structure.push({
      id: 14,
      label: 'Reports',
      link: '#',
      icon: <ReportIcon />,
      children: reportChildren,
    });
  }

  // ----- Settings -----
  const settingsChildren = [
    ...addIf(hasPermission('users.view') || hasPermission('users.create') || hasPermission('users.edit') || hasPermission('users.delete'),
        { label: 'Users', link: '/app/settings/users' }),
    ...addIf(hasPermission('sales_agent.view') || hasPermission('sales_agent.create') || hasPermission('sales_agent.edit') || hasPermission('sales_agent.delete'),
        { label: 'Agents', link: '/app/settings/agents' }),
    ...addIf(hasPermission('roles.view') || hasPermission('roles.create') || hasPermission('roles.edit') || hasPermission('roles.delete'),
        { label: 'Roles', link: '/app/settings/roles' }),
    ...addIf(hasPermission('roles.assign_permissions'),
        { label: 'Permissions', link: '/app/settings/permissions' }),
    ...addIf(hasPermission('audit.view'), { label: 'Audit Trails', link: '/app/settings/audit' }),
    ...addIf(hasPermission('otp.view') || hasPermission('otp.cleanup'), { label: 'OTP Management', link: '/app/settings/otp' }),
    ...addIf(hasPermission('failed_logins.view') || hasPermission('failed_logins.clear') || hasPermission('failed_logins.block'),
        { label: 'Failed Logins', link: '/app/settings/failed-logins' }),
  ];
  if (settingsChildren.length > 0) {
    structure.push({
      id: 15,
      label: 'Settings',
      link: '#',
      icon: <SettingsIcon />,
      children: settingsChildren,
    });
  }

  return structure;
}

// Static structure for breadcrumbs (unchanged)
const staticStructure = [
  { id: 0, label: 'Dashboard', link: '/app/dashboard', icon: <HomeIcon /> },
  { id: 'agent-dashboard-static', label: 'Agent Analytics', link: '/app/agent-analytics', icon: <AnalyticsIcon /> },
  { id: 1, label: 'Product Categories', link: '/app/product-categories', icon: <CategoryIcon />, children: [{ label: 'Manage Categories', link: '/app/product-categories' }] },
  { id: 2, label: 'Collection Centers', link: '/app/collection-centers', icon: <CollectionCenterIcon />, children: [{ label: 'Manage Centers', link: '/app/collection-centers' }] },
  { id: 3, label: 'Warehouses', link: '/app/warehouses', icon: <WarehouseIcon />, children: [{ label: 'Manage Warehouses', link: '/app/warehouses' }] },
  { id: 4, label: 'Purchases', link: '/app/purchases', icon: <PurchaseIcon />, children: [{ label: 'Manage Purchases', link: '/app/purchases' }] },
  { id: 5, label: 'Products', link: '/app/products', icon: <ProductsIcon />, children: [{ label: 'Manage Products', link: '/app/products' }] },
  { id: 6, label: 'Inventory', link: '/app/inventory', icon: <InventoryIcon />, children: [{ label: 'Manage Inventory', link: '/app/inventory' }] },
  { id: 7, label: 'CC Inventory', link: '/app/cc-inventory', icon: <CcInventoryIcon />, children: [{ label: 'Manage CC Inventory', link: '/app/cc-inventory' }] },
  { id: 8, label: 'Agent Inventory', link: '/app/agent-inventory', icon: <AgentIcon />, children: [{ label: 'My Stock', link: '/app/agent-inventory' }] },
  {
    id: 9,
    label: 'Sales',
    link: '/app/sales',
    icon: <SalesIcon />,
    children: [{ label: 'Sales Dashboard', link: '/app/sales' }],
  },
  // 👇 Returns static structure
  {
    id: 18,
    label: 'Returns',
    link: '/app/returns',
    icon: <ReturnsIcon />,
    children: [
      { label: 'All Returns', link: '/app/returns' },
      { label: 'New Return', link: '/app/returns' },
    ],
  },
  { id: 17, label: 'Invoices', link: '/app/invoices', icon: <InvoiceIcon />, children: [{ label: 'Manage Invoices', link: '/app/invoices' }] },
  { id: 10, label: 'Distributions', link: '/app/distributions', icon: <DistributionIcon />, children: [{ label: 'Manage Distributions', link: '/app/distributions' }] },
  { id: 11, label: 'Transfer Requests', link: '/app/transfer-requests', icon: <TransferIcon />, children: [{ label: 'Manage Requests', link: '/app/transfer-requests' }] },
  { id: 12, label: 'Stock Movements', link: '/app/stock-movements', icon: <StockMovementIcon />, children: [{ label: 'View Movements', link: '/app/stock-movements' }] },
  { id: 13, label: 'Suppliers', link: '/app/suppliers', icon: <SupplierIcon />, children: [{ label: 'Manage Suppliers', link: '/app/suppliers' }] },
  { id: 16, label: 'Customers', link: '/app/customers', icon: <CustomersIcon />, children: [{ label: 'Manage Customers', link: '/app/customers' }] },
  {
    id: 14,
    label: 'Reports',
    link: '#',
    icon: <ReportIcon />,
    children: [
      {
        label: 'Purchase Reports',
        children: [{ label: 'Daily', link: '/app/reports/Purchase/daily' }],
      },
      {
        label: 'Sales Reports',
        children: [{ label: 'Daily', link: '/app/reports/sales/daily' }],
      },
      {
        label: 'Stock Reports',
        children: [{ label: 'Daily', link: '/app/reports/stock/daily' }],
      },
    ],
  },
  {
    id: 15,
    label: 'Settings',
    link: '#',
    icon: <SettingsIcon />,
    children: [
      { label: 'Users', link: '/app/settings/users', icon: <UsersIcon /> },
      { label: 'Agents', link: '/app/settings/agents', icon: <AgentIcon /> },
      { label: 'Roles', link: '/app/settings/roles', icon: <RolesIcon /> },
      { label: 'Permissions', link: '/app/settings/permissions', icon: <PermissionsIcon /> },
      { label: 'Audit Trails', link: '/app/settings/audit', icon: <AuditIcon /> },
      { label: 'OTP Management', link: '/app/settings/otp', icon: <OTPIcon /> },
      { label: 'Failed Logins', link: '/app/settings/failed-logins', icon: <FailedLoginIcon /> },
    ],
  },
];

export default staticStructure;