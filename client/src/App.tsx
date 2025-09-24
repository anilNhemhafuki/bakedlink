import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { useState, useEffect } from "react";

// Page Components
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import { MobileInstallBanner } from "@/components/mobile-install-banner";
import Products from "@/pages/products";
import Inventory from "@/pages/inventory";
import Orders from "@/pages/orders";
import Production from "@/pages/production";
import Assets from "@/pages/assets";
import Expenses from "@/pages/expenses";
import Parties from "@/pages/parties";
import Reports from "@/pages/reports";
import DayBook from "./pages/day-book";
import Transactions from "@/pages/transactions";
import Billing from "@/pages/billing";
import Settings from "@/pages/settings";
import Notifications from "./pages/notifications";
import AdminUsers from "@/pages/admin-users";
import LoginLogs from "@/pages/LoginLogs";
import NotFound from "@/pages/not-found";
import LoginForm from "@/components/login-form";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Customers from "@/pages/customers";
import NotificationSettings from "@/components/notification-settings";

import Sales from "@/pages/sales";
import Purchases from "@/pages/purchases";
import SalesReturns from "@/pages/sales-returns";
import PurchaseReturns from "@/pages/purchase-returns";
import PublicOrderForm from "@/components/public-order-form";
import ComprehensiveStockManagement from "@/pages/stock";
import Ingredients from "@/pages/ingredients";
import Units from "@/pages/units";
import LabelPrinting from "@/pages/label-printing";
import Recipes from "@/pages/recipes";
// import ExpireProducts from "@/pages/expire-products"; // Removed as it's being replaced

import Staff from "@/pages/staff";
import Attendance from "@/pages/attendance";
import Salary from "@/pages/salary";
import LeaveRequests from "@/pages/leave-requests";
import { ProtectedRoute } from "@/components/protected-route";
import ProductionPage from "@/pages/production";
import Branches from "./pages/branches";
import SystemConfig from "./pages/system-config";
import DatabaseManager from "./pages/database";
import ApiDocs from "./pages/api-docs";
import SystemHealth from "./pages/system-health";
import SecurityLogs from "./pages/security-logs";
import SystemMonitoring from "./pages/monitoring";
import PerformanceMetrics from "./pages/performance";

function Router() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Public routes (no authentication required)
  return (
    <Switch>
      <Route path="/order" component={PublicOrderForm} />
      <Route path="*">
        {!user ? (
          <LoginForm
            onSuccess={() => {
              // Force a complete refresh of auth state
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              // Small delay to ensure the query has time to refetch
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 300);
            }}
          />
        ) : (
          <AuthenticatedApp
            user={user}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        )}
      </Route>
    </Switch>
  );
}

function AuthenticatedApp({
  user,
  sidebarOpen,
  setSidebarOpen,
}: {
  user: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Listen to localStorage changes for sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      const savedState = localStorage.getItem("sidebar-collapsed");
      if (savedState !== null) {
        setIsCollapsed(JSON.parse(savedState));
      }
    };

    // Initial load
    handleStorageChange();

    // Listen for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-page updates
    const handleSidebarToggle = () => {
      const savedState = localStorage.getItem("sidebar-collapsed");
      if (savedState !== null) {
        setIsCollapsed(JSON.parse(savedState));
      }
    };

    window.addEventListener("sidebar-toggle", handleSidebarToggle);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebar-toggle", handleSidebarToggle);
    };
  }, []);

  // Super Admin gets unrestricted access - no ProtectedRoute wrapper needed
  const isSuperAdmin = user?.role === "super_admin";

  // Component wrapper that conditionally adds protection
  const RouteWrapper = ({
    children,
    resource,
    action,
  }: {
    children: React.ReactNode;
    resource: string;
    action: "read" | "write" | "read_write";
  }) => {
    if (isSuperAdmin) {
      return <>{children}</>;
    }
    return (
      <ProtectedRoute resource={resource} action={action}>
        {children}
      </ProtectedRoute>
    );
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          <MobileInstallBanner />
          <Switch>
            <Route
              path="/"
              component={() => (
                <RouteWrapper resource="dashboard" action="read">
                  <Dashboard />
                </RouteWrapper>
              )}
            />
            <Route
              path="/dashboard"
              component={() => (
                <RouteWrapper resource="dashboard" action="read">
                  <Dashboard />
                </RouteWrapper>
              )}
            />
            <Route
              path="/production"
              component={() => (
                <RouteWrapper resource="production" action="read">
                  <ProductionPage />
                </RouteWrapper>
              )}
            />
            <Route
              path="/label-printing"
              component={() => (
                <RouteWrapper resource="production" action="read">
                  <LabelPrinting />
                </RouteWrapper>
              )}
            />
            {/* Replaced expire-products route with sales-returns and purchase-returns */}
            <Route
              path="/sales-returns"
              component={() => (
                <RouteWrapper resource="sales" action="read">
                  <SalesReturns />
                </RouteWrapper>
              )}
            />
            <Route
              path="/purchase-returns"
              component={() => (
                <RouteWrapper resource="purchases" action="read">
                  <PurchaseReturns />
                </RouteWrapper>
              )}
            />
            <Route
              path="/units"
              component={() => (
                <RouteWrapper resource="units" action="read">
                  <Units />
                </RouteWrapper>
              )}
            />
            <Route
              path="/recipes"
              component={() => (
                <RouteWrapper resource="products" action="read">
                  <Recipes />
                </RouteWrapper>
              )}
            />
            <Route
              path="/products"
              component={() => (
                <RouteWrapper resource="products" action="read">
                  <Products />
                </RouteWrapper>
              )}
            />
            <Route
              path="/inventory"
              component={() => (
                <RouteWrapper resource="inventory" action="read">
                  <Inventory />
                </RouteWrapper>
              )}
            />
            <Route
              path="/stock"
              component={() => (
                <RouteWrapper resource="inventory" action="read">
                  <ComprehensiveStockManagement />
                </RouteWrapper>
              )}
            />
            <Route
              path="/ingredients"
              component={() => (
                <RouteWrapper resource="inventory" action="read">
                  <Ingredients />
                </RouteWrapper>
              )}
            />
            <Route
              path="/orders"
              component={() => (
                <RouteWrapper resource="orders" action="read">
                  <Orders />
                </RouteWrapper>
              )}
            />
            <Route
              path="/customers"
              component={() => (
                <RouteWrapper resource="customers" action="read">
                  <Customers />
                </RouteWrapper>
              )}
            />
            <Route
              path="/parties"
              component={() => (
                <RouteWrapper resource="parties" action="read">
                  <Parties />
                </RouteWrapper>
              )}
            />
            <Route
              path="/assets"
              component={() => (
                <RouteWrapper resource="assets" action="read">
                  <Assets />
                </RouteWrapper>
              )}
            />
            <Route
              path="/expenses"
              component={() => (
                <RouteWrapper resource="expenses" action="read">
                  <Expenses />
                </RouteWrapper>
              )}
            />
            <Route
              path="/reports"
              component={() => (
                <RouteWrapper resource="reports" action="read">
                  <Reports />
                </RouteWrapper>
              )}
            />
            <Route
              path="/day-book"
              component={() => (
                <RouteWrapper resource="reports" action="read">
                  <DayBook />
                </RouteWrapper>
              )}
            />
            <Route
              path="/transactions"
              component={() => (
                <RouteWrapper resource="reports" action="read">
                  <Transactions />
                </RouteWrapper>
              )}
            />
            <Route
              path="/billing"
              component={() => (
                <RouteWrapper resource="orders" action="read">
                  <Billing />
                </RouteWrapper>
              )}
            />
            <Route
              path="/settings"
              component={() => (
                <RouteWrapper resource="settings" action="read">
                  <Settings />
                </RouteWrapper>
              )}
            />
            <Route
              path="/notifications"
              component={() => (
                <RouteWrapper resource="dashboard" action="read">
                  <Notifications />
                </RouteWrapper>
              )}
            />
            <Route
              path="/notification-settings"
              component={() => (
                <RouteWrapper resource="settings" action="read">
                  <NotificationSettings />
                </RouteWrapper>
              )}
            />
            <Route
              path="/admin/users"
              component={() => (
                <RouteWrapper resource="users" action="read_write">
                  <AdminUsers />
                </RouteWrapper>
              )}
            />
            <Route
              path="/admin/login-logs"
              component={() => (
                <RouteWrapper resource="admin" action="read_write">
                  <LoginLogs />
                </RouteWrapper>
              )}
            />
            <Route
              path="/sales"
              component={() => (
                <RouteWrapper resource="sales" action="read">
                  <Sales />
                </RouteWrapper>
              )}
            />
            <Route
              path="/purchases"
              component={() => (
                <RouteWrapper resource="purchases" action="read">
                  <Purchases />
                </RouteWrapper>
              )}
            />
            <Route
              path="/units"
              component={() => (
                <RouteWrapper resource="units" action="read">
                  <Units />
                </RouteWrapper>
              )}
            />
            <Route
              path="/staff"
              component={() => (
                <RouteWrapper resource="staff" action="read">
                  <Staff />
                </RouteWrapper>
              )}
            />
            <Route
              path="/attendance"
              component={() => (
                <RouteWrapper resource="staff" action="read">
                  <Attendance />
                </RouteWrapper>
              )}
            />
            <Route
              path="/salary"
              component={() => (
                <RouteWrapper resource="staff" action="read">
                  <Salary />
                </RouteWrapper>
              )}
            />
            <Route
              path="/leave-requests"
              component={() => (
                <RouteWrapper resource="staff" action="read">
                  <LeaveRequests />
                </RouteWrapper>
              )}
            />
            <Route
              path="/staff-schedules"
              component={() => (
                <RouteWrapper resource="staff" action="read">
                  <LeaveRequests />
                </RouteWrapper>
              )}
            />
            <Route
              path="/branches"
              component={() => (
                <RouteWrapper resource="branches" action="read">
                  <Branches />
                </RouteWrapper>
              )}
            />
            <Route
              path="/system-config"
              component={() => (
                <RouteWrapper resource="system" action="read_write">
                  <SystemConfig />
                </RouteWrapper>
              )}
            />
            <Route
              path="/database"
              component={() => (
                <RouteWrapper resource="database" action="read_write">
                  <DatabaseManager />
                </RouteWrapper>
              )}
            />
            <Route
              path="/api-docs"
              component={() => (
                <RouteWrapper resource="api" action="read">
                  <ApiDocs />
                </RouteWrapper>
              )}
            />
            <Route
              path="/system-health"
              component={() => (
                <RouteWrapper resource="monitoring" action="read">
                  <SystemHealth />
                </RouteWrapper>
              )}
            />
            <Route
              path="/security-logs"
              component={() => (
                <RouteWrapper resource="security" action="read">
                  <SecurityLogs />
                </RouteWrapper>
              )}
            />
            <Route
              path="/monitoring"
              component={() => (
                <RouteWrapper resource="monitoring" action="read">
                  <SystemMonitoring />
                </RouteWrapper>
              )}
            />
            <Route
              path="/performance"
              component={() => (
                <RouteWrapper resource="performance" action="read">
                  <PerformanceMetrics />
                </RouteWrapper>
              )}
            />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UnitsProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </UnitsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
