import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
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
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
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

// Chart configurations
const chartConfig = {
  sales: {
    label: "Sales",
    color: "#3b82f6",
  },
  orders: {
    label: "Orders",
    color: "#10b981",
  },
  production: {
    label: "Production",
    color: "#f59e0b",
  },
  profit: {
    label: "Profit",
    color: "#8b5cf6",
  },
};

// Sample data for charts
const salesData = [
  { name: "Mon", sales: 12000, orders: 45, profit: 3000 },
  { name: "Tue", sales: 19000, orders: 67, profit: 4500 },
  { name: "Wed", sales: 15000, orders: 52, profit: 3700 },
  { name: "Thu", sales: 22000, orders: 78, profit: 5200 },
  { name: "Fri", sales: 28000, orders: 89, profit: 6800 },
  { name: "Sat", sales: 35000, orders: 102, profit: 8500 },
  { name: "Sun", sales: 18000, orders: 61, profit: 4200 },
];

const productionData = [
  { name: "Bread", value: 450, color: "#3b82f6" },
  { name: "Pastries", value: 230, color: "#10b981" },
  { name: "Cakes", value: 120, color: "#f59e0b" },
  { name: "Cookies", value: 340, color: "#8b5cf6" },
  { name: "Others", value: 180, color: "#ef4444" },
];

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

// Helper component for Production Status Badges
const ProductionStatusBadge = ({ status }: { status: string }) => {
  return <OrderStatusBadge status={status} />;
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
}: any) => (
  <Card
    className={`group border-l-4 border-${color}-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500"} flex items-center`}
            >
              {trend === "up" && (
                <ArrowUpRight className="inline h-4 w-4 mr-1" />
              )}
              {trend === "down" && (
                <ArrowDownRight className="inline h-4 w-4 mr-1" />
              )}
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
    </CardContent>
  </Card>
);

// Performance Metric Card
const PerformanceCard = ({
  title,
  current,
  target,
  icon: Icon,
  color,
}: any) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isOnTrack = percentage >= 80;

  return (
    <Card className="group hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 text-${color}-600`} />
            <span className="font-medium text-sm">{title}</span>
          </div>
          <Badge variant={isOnTrack ? "default" : "secondary"}>
            {percentage.toFixed(0)}%
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Current</span>
            <span className="font-medium">{current.toLocaleString()}</span>
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Target</span>
            <span className="font-medium">{target.toLocaleString()}</span>
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard stats
  const { data: dashboardStats = {}, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: canAccessPage("dashboard_stats"),
  });

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["/api/dashboard/recent-orders"],
    refetchInterval: 30000,
    enabled: canAccessPage("orders"),
  });

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
    enabled: canAccessPage("inventory"),
  });

  // Fetch upcoming production
  const { data: upcomingProduction = [] } = useQuery({
    queryKey: ["/api/dashboard/production-schedule"],
    enabled: canAccessPage("production"),
  });

  // Fetch active products
  const { data: activeProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => data.filter((p: any) => p.isActive),
    enabled: canAccessPage("products"),
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
    enabled: canAccessPage("notifications"),
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
    },
  ];

  const performanceMetrics = [
    {
      title: "Monthly Sales Target",
      current: 125000,
      target: 150000,
      icon: Target,
      color: "green",
    },
    {
      title: "Production Efficiency",
      current: 87,
      target: 95,
      icon: Factory,
      color: "blue",
    },
    {
      title: "Customer Satisfaction",
      current: 4.7,
      target: 5.0,
      icon: Star,
      color: "yellow",
    },
    {
      title: "Order Fulfillment",
      current: 94,
      target: 98,
      icon: Truck,
      color: "purple",
    },
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
          stat.accessKey && canAccessPage(stat.accessKey) ? (
            <QuickStatCard key={stat.title} {...stat} />
          ) : null,
        )}
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 bg-white shadow-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sales Overview
                  </CardTitle>
                  <CardDescription>Weekly sales performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient
                            id="salesGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="url(#salesGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications?.slice(0, 6).map((notification: any) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          notification.priority === "high"
                            ? "bg-red-500"
                            : notification.priority === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(
                            new Date(notification.timestamp),
                            "MMM dd, HH:mm",
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!notifications || notifications.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders and Production Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            {canAccessPage("orders") && (
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
                    {recentOrders?.slice(0, 4).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-blue-600" />
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Production */}
            {canAccessPage("production") && (
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
                      ?.slice(0, 4)
                      .map((item: ProductionItem) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                item.priority === "high"
                                  ? "bg-red-100"
                                  : item.priority === "medium"
                                    ? "bg-yellow-100"
                                    : "bg-green-100"
                              }`}
                            >
                              <Factory
                                className={`h-6 w-6 ${
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
                            <ProductionStatusBadge status={item.status} />
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(item.scheduledDate), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Sales & Orders Trend</CardTitle>
                <CardDescription>Weekly performance comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Production Distribution */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Production Distribution</CardTitle>
                <CardDescription>Product category breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={productionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {productionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Status */}
            {canAccessPage("inventory") && (
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

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {canAccessPage("orders") && (
                    <Button
                      variant="outline"
                      className="justify-start h-12"
                      asChild
                    >
                      <Link href="/orders">
                        <Plus className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <p className="font-medium">New Order</p>
                          <p className="text-xs text-gray-500">
                            Create customer order
                          </p>
                        </div>
                      </Link>
                    </Button>
                  )}
                  {canAccessPage("production") && (
                    <Button
                      variant="outline"
                      className="justify-start h-12"
                      asChild
                    >
                      <Link href="/production">
                        <Factory className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <p className="font-medium">Schedule Production</p>
                          <p className="text-xs text-gray-500">
                            Plan production run
                          </p>
                        </div>
                      </Link>
                    </Button>
                  )}
                  {canAccessPage("inventory") && (
                    <Button
                      variant="outline"
                      className="justify-start h-12"
                      asChild
                    >
                      <Link href="/inventory">
                        <Package className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <p className="font-medium">Update Inventory</p>
                          <p className="text-xs text-gray-500">
                            Manage stock levels
                          </p>
                        </div>
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            {(isSuperAdmin() || isAdmin()) && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                  <CardDescription>System health overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">
                          Online
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Services</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">
                          Healthy
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-yellow-600 font-medium">
                          75% Used
                        </span>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        System Settings
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {performanceMetrics.map((metric, index) => (
              <PerformanceCard key={index} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Analysis */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Profit Analysis</CardTitle>
                <CardDescription>Weekly profit margins</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="profit"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Role Information */}
            <Card className="shadow-sm">
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
                      {isSuperAdmin() || isAdmin()
                        ? "Full Access"
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
                      {[
                        "Dashboard",
                        "Orders",
                        "Products",
                        "Inventory",
                        "Production",
                      ].map((module) => (
                        <Badge
                          key={module}
                          variant="secondary"
                          className="text-xs"
                        >
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                    💡 Contact your administrator if you need additional
                    permissions.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}