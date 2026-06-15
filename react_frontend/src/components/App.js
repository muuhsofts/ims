import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setNavigator } from "router/navigation";
import { AuthProvider, useAuth } from "context/AuthContext";
import Documentation from "components/Documentation";
import Layout from "components/Layout";
import Login from "pages/login";
import VerifyOTP from "pages/verify_otp/VerifyOTP";
import ResetPassword from "pages/reset_password/ResetPassword";
import ForgotPassword from "pages/forgot_password/ForgotPassword";


// Data contexts
import { ProductCategoryProvider } from "context/ProductCategoryContext";
import { ProductProvider } from "context/ProductContext";
import { SupplierProvider } from "context/SupplierContext";
import { WarehouseProvider } from "context/WarehouseContext";
import { PurchaseProvider } from "context/PurchaseContext";
import { InventoryProvider } from "context/InventoryContext";
import { TransferRequestProvider } from "context/TransferRequestContext";
import { StockMovementProvider } from "context/StockMovementContext";
import { DistributionProvider } from "context/DistributionContext";
import { AgentSalesProvider } from "context/AgentSalesContext";
import { CustomerProvider } from "context/CustomerContext";
import { ReceiptProvider } from "context/ReceiptContext";
import { UserProvider } from "context/UserContext";
import { RoleProvider } from "context/RoleContext";
import { PermissionProvider } from "context/PermissionContext";
import { AuditProvider } from "context/AuditContext";
import { OtpProvider } from "context/OtpContext";
import { FailedLoginProvider } from "context/FailedLoginContext";
import { ReportProvider } from "context/ReportContext";
import { DashboardProvider } from "context/DashboardContext";
import { CcInventoryProvider } from "context/CollectionCenterContext";
import { CollectionCenterProvider } from "context/CCInventoryContext";
import { InvoiceProvider } from "context/InvoiceContext";

function RouterNavigatorSync() {
    const navigate = useNavigate();
    React.useEffect(() => {
        setNavigator(navigate);
        return () => setNavigator(null);
    }, [navigate]);
    return null;
}

function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const routerBase = import.meta.env.BASE_URL || '/';

    if (isLoading) return <div>Loading...</div>;

    return (
        <BrowserRouter basename={routerBase}>
            <RouterNavigatorSync />
            <Routes>
                {/* Redirect to Sales Analytics instead of old dashboard */}
                <Route path="/" element={<Navigate to="/app/sales-analytics" replace />} />
                <Route path="/app" element={<Navigate to="/app/sales-analytics" replace />} />
                <Route path="/403" element={<Error code={403} />} />
                <Route path="/500" element={<Error code={500} />} />
                <Route path="/documentation/*" element={<Documentation />} />

                <Route path="/app/*" element={<PrivateRoute><Layout /></PrivateRoute>} />

                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/verify-otp" element={<PublicRoute><VerifyOTP /></PublicRoute>} />
                <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

                <Route path="*" element={<Error />} />
            </Routes>
        </BrowserRouter>
    );

    function PrivateRoute({ children }) {
        if (!isAuthenticated) return <Navigate to="/login" replace />;
        return children;
    }
    function PublicRoute({ children }) {
        // Redirect authenticated users to Sales Analytics
        if (isAuthenticated) return <Navigate to="/app/sales-analytics" replace />;
        return children;
    }
}

export default function App() {
    return (
        <AuthProvider>
            <ProductCategoryProvider>
                <ProductProvider>
                    <SupplierProvider>
                        <WarehouseProvider>
                            <PurchaseProvider>
                                <InventoryProvider>
                                    <TransferRequestProvider>
                                        <CollectionCenterProvider>
                                            <CcInventoryProvider>
                                                <StockMovementProvider>
                                                    <DistributionProvider>
                                                        <AgentSalesProvider>
                                                            <CustomerProvider>
                                                                <ReceiptProvider>
                                                                    <UserProvider>
                                                                        <RoleProvider>
                                                                            <PermissionProvider>
                                                                                <AuditProvider>
                                                                                    <OtpProvider>
                                                                                        <FailedLoginProvider>
                                                                                            <ReportProvider>
                                                                                                <DashboardProvider>
                                                                                                    <InvoiceProvider>
                                                                                                        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                                                                                                        <AppContent />
                                                                                                    </InvoiceProvider>
                                                                                                </DashboardProvider>
                                                                                            </ReportProvider>
                                                                                        </FailedLoginProvider>
                                                                                    </OtpProvider>
                                                                                </AuditProvider>
                                                                            </PermissionProvider>
                                                                        </RoleProvider>
                                                                    </UserProvider>
                                                                </ReceiptProvider>
                                                            </CustomerProvider>
                                                        </AgentSalesProvider>
                                                    </DistributionProvider>
                                                </StockMovementProvider>
                                            </CcInventoryProvider>
                                        </CollectionCenterProvider>
                                    </TransferRequestProvider>
                                </InventoryProvider>
                            </PurchaseProvider>
                        </WarehouseProvider>
                    </SupplierProvider>
                </ProductProvider>
            </ProductCategoryProvider>
        </AuthProvider>
    );
}
