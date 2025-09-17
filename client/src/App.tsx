// src/App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UnitsProvider } from "@/contexts/UnitsContext";
import { useState, useEffect } from "react";

import { ThemeProvider } from "next-themes";

// Page Components
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
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
import PublicOrderForm from "@/components/public-order-form";
import Stock from "@/pages/stock";
import Ingredients from "@/pages/ingredients";
import Units from "@/pages/units";
import LabelPrinting from "@/pages/label-printing";
import Recipes from "@/pages/recipes";

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
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="h-screen flex bg-background dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 transition-colors duration-200">
          <Switch>
            <Route
              path="/"
              component={() => (
                <ProtectedRoute resource="dashboard" action="read">
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/dashboard"
              component={() => (
                <ProtectedRoute resource="dashboard" action="read">
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/production"
              component={() => (
                <ProtectedRoute resource="production" action="read">
                  <ProductionPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/label-printing"
              component={() => (
                <ProtectedRoute resource="production" action="read">
                  <LabelPrinting />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/recipes"
              component={() => (
                <ProtectedRoute resource="products" action="read">
                  <Recipes />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/products"
              component={() => (
                <ProtectedRoute resource="products" action="read">
                  <Products />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/inventory"
              component={() => (
                <ProtectedRoute resource="inventory" action="read">
                  <Inventory />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/stock"
              component={() => (
                <ProtectedRoute resource="inventory" action="read">
                  <Stock />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/ingredients"
              component={() => (
                <ProtectedRoute resource="inventory" action="read">
                  <Ingredients />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/orders"
              component={() => (
                <ProtectedRoute resource="orders" action="read">
                  <Orders />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/customers"
              component={() => (
                <ProtectedRoute resource="customers" action="read">
                  <Customers />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/parties"
              component={() => (
                <ProtectedRoute resource="parties" action="read">
                  <Parties />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/assets"
              component={() => (
                <ProtectedRoute resource="assets" action="read">
                  <Assets />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/expenses"
              component={() => (
                <ProtectedRoute resource="expenses" action="read">
                  <Expenses />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/reports"
              component={() => (
                <ProtectedRoute resource="reports" action="read">
                  <Reports />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/day-book"
              component={() => (
                <ProtectedRoute resource="reports" action="read">
                  <DayBook />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/transactions"
              component={() => (
                <ProtectedRoute resource="reports" action="read">
                  <Transactions />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/billing"
              component={() => (
                <ProtectedRoute resource="orders" action="read">
                  <Billing />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/settings"
              component={() => (
                <ProtectedRoute resource="settings" action="read">
                  <Settings />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/notifications"
              component={() => (
                <ProtectedRoute resource="dashboard" action="read">
                  <Notifications />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/notification-settings"
              component={() => (
                <ProtectedRoute resource="settings" action="read">
                  <NotificationSettings />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/users"
              component={() => (
                <ProtectedRoute resource="users" action="read_write">
                  <AdminUsers />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/login-logs"
              component={() => (
                <ProtectedRoute resource="admin" action="read_write">
                  <LoginLogs />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/sales"
              component={() => (
                <ProtectedRoute resource="sales" action="read">
                  <Sales />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/purchases"
              component={() => (
                <ProtectedRoute resource="purchases" action="read">
                  <Purchases />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/units"
              component={() => (
                <ProtectedRoute resource="units" action="read">
                  <Units />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/staff"
              component={() => (
                <ProtectedRoute resource="staff" action="read">
                  <Staff />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/attendance"
              component={() => (
                <ProtectedRoute resource="staff" action="read">
                  <Attendance />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/salary"
              component={() => (
                <ProtectedRoute resource="staff" action="read">
                  <Salary />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/leave-requests"
              component={() => (
                <ProtectedRoute resource="staff" action="read">
                  <LeaveRequests />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/staff-schedules"
              component={() => (
                <ProtectedRoute resource="staff" action="read">
                  <LeaveRequests />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/branches"
              component={() => (
                <ProtectedRoute resource="branches" action="read">
                  <Branches />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/system-config"
              component={() => (
                <ProtectedRoute resource="system" action="read_write">
                  <SystemConfig />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/database"
              component={() => (
                <ProtectedRoute resource="database" action="read_write">
                  <DatabaseManager />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/api-docs"
              component={() => (
                <ProtectedRoute resource="api" action="read">
                  <ApiDocs />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/system-health"
              component={() => (
                <ProtectedRoute resource="monitoring" action="read">
                  <SystemHealth />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/security-logs"
              component={() => (
                <ProtectedRoute resource="security" action="read">
                  <SecurityLogs />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/monitoring"
              component={() => (
                <ProtectedRoute resource="monitoring" action="read">
                  <SystemMonitoring />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/performance"
              component={() => (
                <ProtectedRoute resource="performance" action="read">
                  <PerformanceMetrics />
                </ProtectedRoute>
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
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange={false}
        storageKey="mero-baker-theme"
      >
        <LanguageProvider>
          <UnitsProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </UnitsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
