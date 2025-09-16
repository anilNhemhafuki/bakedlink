import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Calendar,
  Plus,
  Eye,
  Zap,
  CheckCircle,
  Target,
  Settings,
  Activity,
  Clock,
  RefreshCw,
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
  PieChart,
  TrendingDown,
  Star,
  Award,
  Truck,
  ShoppingBag,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Link } from "wouter";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface ProductionItem {
  id: number;
  productName: string;
  quantity: number;
  scheduledDate: string;
  status: string;
  productCode?: string;
  batchNo?: string;
  totalQuantity?: number;
  unitType?: string;
  actualQuantityPackets?: number;
  priority?: "low" | "medium" | "high";
  shift?: string;
  assignedTo?: string;
  productionStartTime?: string;
  productionEndTime?: string;
  scheduleDate?: string;
}

// Helper component for Order Status Badges
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    completed: { variant: "default", color: "text-green-600" },
    in_progress: { variant: "secondary", color: "text-blue-600" },
    pending: { variant: "outline", color: "text-yellow-600" },
    cancelled: { variant: "destructive", color: "text-red-600" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Badge variant={config.variant as any} className={config.color}>
      {status.replace("_", " ").toUpperCase()}
    </Badge>
  );
};

// Enhanced Quick Stat Card
const QuickStatCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color,
  percentage,
  subtitle,
  href,
}: any) => {
  const content = (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
        <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-medium ${
              trend === "up"
                ? "text-green-500"
                : trend === "down"
                  ? "text-red-500"
                  : "text-gray-500"
            } flex items-center`}
          >
            {trend === "up" && <ArrowUpRight className="inline h-4 w-4 mr-1" />}
            {trend === "down" && <ArrowDownRight className="inline h-4 w-4 mr-1" />}
            {change}
          </p>
          {percentage && <Progress value={percentage} className="w-20 h-2" />}
        </div>
      </div>
      <div
        className={`w-16 h-16 bg-${color}-100 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className={`h-8 w-8 text-${color}-600`} />
      </div>
    </div>
  );

  return (
    <Card
      className={`group border-l-4 border-${color}-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
    >
      <CardContent className="p-6">
        {href ? (
          <Link href={href} className="block">
            {content}
          </Link>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
};

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    canAccessPage,
    isSuperAdmin,
    isAdmin,
    isManager,
    isSupervisor,
    isMarketer,
    isStaff,
    getRoleDisplayName,
  } = useRoleAccess();
  const [currentTime, setCurrentTime] = useState(new Date());

  // For Super Admin, grant access to everything
  const hasAccess = (resource: string) => {
    if (isSuperAdmin()) return true;
    return canAccessPage(resource);
  };

  // Fetch dashboard stats
  const { data: dashboardStats = {}, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: hasAccess("dashboard"),
  });

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["/api/dashboard/recent-orders"],
    refetchInterval: 30000,
    enabled: hasAccess("orders"),
  });

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
    enabled: hasAccess("inventory"),
  });

  // Fetch upcoming production
  const { data: upcomingProduction = [] } = useQuery({
    queryKey: ["/api/dashboard/production-schedule"],
    enabled: hasAccess("production"),
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
    enabled: hasAccess("notifications"),
  });

  const { formatCurrencyWithCommas } = useCurrency();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statsCards = [
    {
      title: "Total Revenue",
      value: formatCurrencyWithCommas(dashboardStats.totalRevenue || 125000),
      icon: DollarSign,
      trend: "up",
      change: "+12.5%",
      color: "green",
      percentage: 85,
      subtitle: "This month",
      accessKey: "sales",
      href: "/sales",
    },
    {
      title: "Orders Today",
      value: dashboardStats.ordersToday || 47,
      icon: ShoppingCart,
      trend: "up",
      change: "+5.2%",
      color: "blue",
      percentage: 78,
      subtitle: "vs yesterday",
      accessKey: "orders",
      href: "/orders",
    },
    {
      title: "Active Products",
      value: dashboardStats.activeProducts || 156,
      icon: Package,
      trend: "up",
      change: "+2.1%",
      color: "purple",
      percentage: 92,
      subtitle: "in catalog",
      accessKey: "products",
      href: "/products",
    },
    {
      title: "Total Customers",
      value: dashboardStats.totalCustomers || 1243,
      icon: Users,
      trend: "up",
      change: "+8.3%",
      color: "indigo",
      percentage: 65,
      subtitle: "active customers",
      accessKey: "customers",
      href: "/customers",
    },
  ];

  const quickActions = [
    {
      title: "New Order",
      description: "Create customer order",
      icon: Plus,
      href: "/orders",
      color: "blue",
      accessKey: "orders",
    },
    {
      title: "Schedule Production",
      description: "Plan production run",
      icon: Factory,
      href: "/production",
      color: "green",
      accessKey: "production",
    },
    {
      title: "Update Inventory",
      description: "Manage stock levels",
      icon: Package,
      href: "/inventory",
      color: "orange",
      accessKey: "inventory",
    },
    {
      title: "View Reports",
      description: "Business analytics",
      icon: BarChart3,
      href: "/reports",
      color: "purple",
      accessKey: "reports",
    },
    {
      title: "Manage Users",
      description: "User administration",
      icon: Shield,
      href: "/admin/users",
      color: "red",
      accessKey: "admin",
    },
    {
      title: "System Settings",
      description: "Configure system",
      icon: Settings,
      href: "/settings",
      color: "gray",
      accessKey: "settings",
    },
  ];

  const systemModules = [
    { name: "Dashboard", status: "active", users: 12, icon: Activity, href: "/dashboard" },
    { name: "Orders", status: "active", users: 8, icon: ShoppingCart, href: "/orders" },
    { name: "Products", status: "active", users: 5, icon: Package, href: "/products" },
    { name: "Inventory", status: "active", users: 7, icon: Package, href: "/inventory" },
    { name: "Production", status: "active", users: 4, icon: Factory, href: "/production" },
    { name: "Customers", status: "active", users: 6, icon: Users, href: "/customers" },
    { name: "Reports", status: "active", users: 3, icon: BarChart3, href: "/reports" },
    { name: "Settings", status: "active", users: 2, icon: Settings, href: "/settings" },
  ];

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="h-7 w-7 text-white" />
            </div>
            Mero BakeSoft Dashboard
          </h1>
          <div className="text-gray-600 mt-2 text-lg">
            Welcome back,{" "}
            <span className="font-semibold">
              {user?.firstName || user?.email}
            </span>
            ! You're logged in as{" "}
            <Badge variant="outline" className="ml-1">
              {getRoleDisplayName()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-4 py-2 text-sm">
            <Clock className="h-4 w-4 mr-2" />
            {format(currentTime, "MMM dd, yyyy - HH:mm:ss")}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["/api/dashboard/stats"],
              })
            }
            className="shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) =>
          stat.accessKey && hasAccess(stat.accessKey) ? (
            <QuickStatCard key={stat.title} {...stat} />
          ) : null,
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3 bg-white shadow-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            {hasAccess("orders") && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription>Latest customer orders</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/orders">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders?.slice(0, 5).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Order #{order.id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-green-600">
                            ₹{parseFloat(order.totalAmount || "0").toFixed(2)}
                          </p>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                    {(!recentOrders || recentOrders.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm">No recent orders</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Production */}
            {hasAccess("production") && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Today's Production
                    </CardTitle>
                    <CardDescription>
                      Scheduled production items
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/production">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingProduction
                      ?.slice(0, 5)
                      .map((item: ProductionItem) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                item.priority === "high"
                                  ? "bg-red-100"
                                  : item.priority === "medium"
                                    ? "bg-yellow-100"
                                    : "bg-green-100"
                              }`}
                            >
                              <Factory
                                className={`h-5 w-5 ${
                                  item.priority === "high"
                                    ? "text-red-600"
                                    : item.priority === "medium"
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <OrderStatusBadge status={item.status} />
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(item.scheduledDate), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    {(!upcomingProduction || upcomingProduction.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm">No scheduled production</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alert */}
            {hasAccess("inventory") && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription>Items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lowStockItems?.slice(0, 5).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            Current: {item.currentStock} {item.unit}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Low
                        </Badge>
                      </div>
                    ))}
                    {(!lowStockItems || lowStockItems.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p className="text-sm">All items in stock</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) =>
              hasAccess(action.accessKey) ? (
                <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <Link href={action.href} className="block">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-${action.color}-100 rounded-lg flex items-center justify-center`}>
                          <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{action.title}</h3>
                          <p className="text-sm text-gray-500">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ) : null,
            )}
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Modules
                </CardTitle>
                <CardDescription>Available system modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemModules.map((module) => (
                    <div key={module.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <module.icon className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{module.name}</p>
                          <p className="text-xs text-gray-500">{module.users} active users</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          {module.status}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={module.href}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Role Information
                </CardTitle>
                <CardDescription>Your current permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Role:</span>
                    <Badge variant="outline" className="font-semibold">
                      {getRoleDisplayName()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Access Level:</span>
                    <span className="text-sm font-medium">
                      {isSuperAdmin()
                        ? "Full System Access"
                        : isAdmin()
                          ? "Administrative Access"
                          : isManager()
                            ? "Management Access"
                            : isSupervisor()
                              ? "Supervisor Access"
                              : "Limited Access"}
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">
                      Available Modules:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {systemModules
                        .filter((module) => hasAccess(module.name.toLowerCase()))
                        .map((module) => (
                          <Badge key={module.name} variant="secondary" className="text-xs">
                            {module.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  {!isSuperAdmin() && (
                    <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                      💡 Contact your administrator if you need additional permissions.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}