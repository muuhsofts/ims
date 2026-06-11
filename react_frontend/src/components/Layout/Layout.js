// src/components/Layout.js
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import classnames from 'classnames';

import SettingsIcon from '@mui/icons-material/Settings';
import GithubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';

import { Fab, IconButton } from '@mui/material';
import useStyles from './styles';

import Header from '../Header';
import Sidebar from '../Sidebar';
import Footer from '../Footer';
import { Link } from '../Wrappers';
import ColorChangeThemePopper from './components/ColorChangeThemePopper';

// pages
import Profile from '../../pages/profile';
import TypographyPage from '../../pages/typography';
import ColorsPage from '../../pages/colors';
import GridPage from '../../pages/grid';
import StaticTablesPage from '../../pages/tables';
import DynamicTablesPage from '../../pages/tables/dynamic';
import IconsPage from '../../pages/icons';
import BadgesPage from '../../pages/badge';
import CarouselsPage from '../../pages/carousel';
import CardsPage from '../../pages/cards';
import ModalsPage from '../../pages/modal';
import NotificationsPage from '../../pages/notifications';
import NavbarsPage from '../../pages/nav';
import TooltipsPage from '../../pages/tooltips';
import TabsPage from '../../pages/tabs';
import ProgressPage from '../../pages/progress';
import WidgetsPage from '../../pages/widget';
import FormsElements from '../../pages/forms/elements';
import FormValidation from '../../pages/forms/validation';
import Charts from '../../pages/charts';
import LineCharts from '../../pages/charts/LineCharts';
import BarCharts from '../../pages/charts/BarCharts';
import PieCharts from '../../pages/charts/PieCharts';
import DraggableGrid from '../../pages/draggablegrid';
import MapsGoogle from '../../pages/maps';
import VectorMaps from '../../pages/maps/VectorMap';
import Timeline from '../../pages/timeline';
import Search from '../../pages/search';
import Gallery from '../../pages/gallery';
import Invoice from '../../pages/invoice';
import Calendar from '../../pages/calendar';
import BreadCrumbs from '../../components/BreadCrumbs';

import { useLayoutState } from "context/LayoutContext";
import { getSidebarStructure } from '../Sidebar/SidebarStructure';

// User & Permission pages
import UsersList from "../../pages/user";
import PermissionsList from "pages/permissions/PermissionList";
import RoleList from "pages/roles/RoleList";
import AuditList from "pages/audit/AuditList";
import OtpList from "pages/otp/OtpList";
import FailedLoginList from "pages/failed-logins/FailedLoginList";
import ProductCategoryList from "pages/categories/ProductCategoryList";
import CollectionCenterList from "pages/collection-centers/CollectionCenterList";
import WarehouseList from "pages/warehouses/WarehouseList";
import SupplierList from "pages/suppliers/SupplierList";
import PurchaseList from "pages/purchases/PurchaseList";
import ProductList from "pages/products/ProductList";
import InventoryList from "pages/inventory/InventoryList";
import TransferRequestList from "pages/transfer-requests/TransferRequestList";
import CcInventoryList from "pages/cc-inventory/CcInventoryList";
import DistributionList from "pages/distributions/DistributionList";
import AgentStockList from "pages/agent-stcok/AgentStockList";
import CustomersList from "pages/customers/CustomersList";
import AgentSales from "pages/sales/AgentSales";
import StockMovementList from "pages/stock/StockMovementList";
import SalesDailyReport from "pages/reports/SalesReport";
import PurchaseReport from "pages/reports/PurchaseReport";
import StockReport from "pages/reports/StockReport";
import Invoices from "pages/invoices/Invoices";
import InvoiceDetail from "pages/invoices/InvoiceDetail";
import AnalyticsDashboard from "pages/dashboard/AnalyticsDashboard";
import AgentAnalyticsDashboard from "pages/dashboard/components/AgentAnalyticsDashboard";
import BranchOwnerStockReport from "pages/reports/BranchOwnerStockReport";
import BranchOwnerAnalyticsDashboard from "pages/dashboard/components/BranchOwnerAnalyticsDashboard";

import { usePermission } from 'hooks/usePermission'; // ✅ import permission hook

function Layout() {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'add-section-popover' : undefined;
  const handleClick = (event) => {
    setAnchorEl(open ? null : event.currentTarget);
  };
  let layoutState = useLayoutState();

  // ✅ Generate dynamic sidebar structure based on user permissions
  const { hasPermission } = usePermission();
  const dynamicStructure = getSidebarStructure(hasPermission);

  return (
      <div className={classes.root}>
        <Header />
        <Sidebar structure={dynamicStructure} /> {/* ✅ use dynamic structure */}
        <div
            className={classnames(classes.content, {
              [classes.contentShift]: layoutState.isSidebarOpened,
            })}
        >
          <div className={classes.fakeToolbar} />
          <BreadCrumbs />
          <Routes>
            <Route path="profile" element={<Profile />} />

            <Route path="core" element={<Navigate to="/app/core/typography" replace />} />
            <Route path="core/typography" element={<TypographyPage />} />
            <Route path="core/colors" element={<ColorsPage />} />
            <Route path="core/grid" element={<GridPage />} />

            <Route path="tables" element={<Navigate to="/app/tables/static" replace />} />
            <Route path="tables/static" element={<StaticTablesPage />} />
            <Route path="tables/dynamic" element={<DynamicTablesPage />} />

            <Route path="ui" element={<Navigate to="/app/ui/icons" replace />} />
            <Route path="ui/icons" element={<IconsPage />} />
            <Route path="ui/badge" element={<BadgesPage />} />
            <Route path="ui/carousel" element={<CarouselsPage />} />
            <Route path="ui/modal" element={<ModalsPage />} />
            <Route path="ui/navbar" element={<NavbarsPage />} />
            <Route path="ui/tooltips" element={<TooltipsPage />} />
            <Route path="ui/tabs" element={<TabsPage />} />
            <Route path="ui/cards" element={<CardsPage />} />
            <Route path="ui/widget" element={<WidgetsPage />} />
            <Route path="ui/progress" element={<ProgressPage />} />
            <Route path="ui/notifications" element={<NotificationsPage />} />

            <Route path="forms" element={<Navigate to="/app/forms/elements" replace />} />
            <Route path="forms/elements" element={<FormsElements />} />
            <Route path="forms/validation" element={<FormValidation />} />

            <Route path="charts" element={<Navigate to="/app/charts/overview" replace />} />
            <Route path="charts/overview" element={<Charts />} />
            <Route path="charts/line" element={<LineCharts />} />
            <Route path="charts/bar" element={<BarCharts />} />
            <Route path="charts/pie" element={<PieCharts />} />

            <Route path="grid" element={<DraggableGrid />} />

            <Route path="maps" element={<Navigate to="/app/maps/google" replace />} />
            <Route path="maps/google" element={<MapsGoogle />} />
            <Route path="maps/vector" element={<VectorMaps />} />

            <Route path="extra" element={<Navigate to="/app/extra/timeline" replace />} />
            <Route path="extra/timeline" element={<Timeline />} />
            <Route path="extra/search" element={<Search />} />
            <Route path="extra/gallery" element={<Gallery />} />
            <Route path="extra/invoice" element={<Invoice />} />
            <Route path="extra/calendar" element={<Calendar />} />

            {/* User management */}
            <Route path="settings/users" element={<UsersList />} />
            <Route path="settings/permissions" element={<PermissionsList />} />
            <Route path="settings/roles" element={<RoleList />} />
            <Route path="settings/audit" element={<AuditList />} />
            <Route path="settings/otp" element={<OtpList />} />
            <Route path="settings/failed-logins" element={<FailedLoginList />} />

            {/* Business modules */}
            <Route path="product-categories" element={<ProductCategoryList />} />
            <Route path="collection-centers" element={<CollectionCenterList />} />
            <Route path="warehouses" element={<WarehouseList />} />
            <Route path="suppliers" element={<SupplierList />} />
            <Route path="purchases" element={<PurchaseList />} />
            <Route path="products" element={<ProductList />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="transfer-requests" element={<TransferRequestList />} />
            <Route path="cc-inventory" element={<CcInventoryList />} />
            <Route path="distributions" element={<DistributionList />} />
            <Route path="agent-inventory" element={<AgentStockList />} />
            <Route path="customers" element={<CustomersList />} />

            {/* Sales & Analytics */}
            <Route path="sales" element={<AgentSales />} />

            {/* Invoices */}
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />

            <Route path="agent-analytics" element={<AgentAnalyticsDashboard />} />

            {/* stock movements */}
            <Route path="stock-movements" element={<StockMovementList />} />

            {/* Branch Owner Dashboard */}
            <Route path="branch-owner-analytics" element={<BranchOwnerAnalyticsDashboard />} />

            {/* Branch Owner Stock Report */}
            <Route path="reports/branch-owner-reports" element={<BranchOwnerStockReport />} />

            {/* Reports */}
            <Route path="reports/sales/daily" element={<SalesDailyReport />} />
            <Route path="reports/purchase/daily" element={<PurchaseReport />} />
            <Route path="reports/stock/daily" element={<StockReport />} />

            <Route path="dashboard" element={<AnalyticsDashboard />} />
          </Routes>
          <Fab
              color="primary"
              aria-label="settings"
              onClick={(e) => handleClick(e)}
              className={classes.changeThemeFab}
              style={{ zIndex: 2000 }}
          >
            <SettingsIcon style={{ color: '#fff' }} />
          </Fab>
          <ColorChangeThemePopper id={id} open={open} anchorEl={anchorEl} />
          <Footer>
            <div>
              <Link color="primary" href="https://flatlogic.com/" target="_blank" className={classes.link}>
                Flatlogic
              </Link>
              <Link color="primary" href="https://flatlogic.com/about" target="_blank" className={classes.link}>
                About Us
              </Link>
              <Link color="primary" href="https://flatlogic.com/blog" target="_blank" className={classes.link}>
                Blog
              </Link>
            </div>
            <div>
              <Link href="https://www.facebook.com/flatlogic" target="_blank">
                <IconButton aria-label="facebook">
                  <FacebookIcon style={{ color: '#6E6E6E99' }} />
                </IconButton>
              </Link>
              <Link href="https://twitter.com/flatlogic" target="_blank">
                <IconButton aria-label="twitter">
                  <TwitterIcon style={{ color: '#6E6E6E99' }} />
                </IconButton>
              </Link>
              <Link href="https://github.com/flatlogic" target="_blank">
                <IconButton aria-label="github" style={{ padding: '12px 0 12px 12px' }}>
                  <GithubIcon style={{ color: '#6E6E6E99' }} />
                </IconButton>
              </Link>
            </div>
          </Footer>
        </div>
      </div>
  );
}

export default Layout;