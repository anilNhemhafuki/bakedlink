import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Calendar,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  Activity,
  Clock,
  RefreshCw,
  Factory,
  Eye,
  Zap,
  CheckCircle,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AdminUserManagement from "@/components/admin-user-management";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { useRoleAccess } from "@/hooks/useRoleAccess"; // Import useRoleAccess hook

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
  scheduleDate?: string; // Added for consistency with the new structure
}

// Helper component for Order Status Badges
const OrderStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "completed":
      return <Badge variant="default">{status}</Badge>;
    case "in_progress":
      return <Badge variant="secondary">{status}</Badge>;
    case "pending":
      return <Badge variant="outline">{status}</Badge>;
    case "cancelled":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper component for Production Status Badges
const ProductionStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "completed":
      return <Badge variant="default">{status}</Badge>;
    case "in_progress":
      return <Badge variant="secondary">{status}</Badge>;
    case "pending":
      return <Badge variant="outline">{status}</Badge>;
    case "cancelled":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>; // Default to secondary for any other status
  }
};

// Helper component for Quick Stat Cards
const QuickStatCard = ({ title, value, change, trend, icon: Icon, color }: any) => (
  <Card className={`border-l-4 border-${color}-500`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
            {trend === "up" && <ArrowUpRight className="inline h-3 w-3" />}
            {trend === "down" && <ArrowDownRight className="inline h-3 w-3" />}
            {change}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAccessPage, isSuperAdmin, isAdmin, isManager, isSupervisor, isMarketer, isStaff, getRoleDisplayName } = useRoleAccess(); // Use the hook
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] =
    useState<ProductionItem | null>(null);
  const [productionSchedule, setProductionSchedule] = useState<
    ProductionItem[]
  >([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch dashboard stats, only if the user has access to view them
  const { data: dashboardStats = {}, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: canAccessPage('dashboard_stats'), // Conditionally enable the query
  });

  // Fetch recent orders, only if the user has access to view them
  const { data: recentOrders = [] } = useQuery({
    queryKey: ["/api/dashboard/recent-orders"],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: canAccessPage('orders'), // Conditionally enable the query
  });

  // Check for new public orders (orders without createdBy user)
  const publicOrders = recentOrders.filter((order: any) => !order.createdBy);
  const hasNewPublicOrders = publicOrders.length > 0;

  // Fetch low stock items, only if the user has access to view them
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
    enabled: canAccessPage('inventory'), // Conditionally enable the query
  });

  // Fetch upcoming production, only if the user has access to view them
  const { data: upcomingProduction = [] } = useQuery({
    queryKey: ["/api/dashboard/production-schedule"],
    enabled: canAccessPage('production'), // Conditionally enable the query
  });

  // Fetch active products, only if the user has access to view them
  const { data: activeProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => data.filter((p: any) => p.isActive),
    enabled: canAccessPage('products'), // Conditionally enable the query
  });

  const { formatCurrencyWithCommas } = useCurrency();

  // Effect to update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer); // Cleanup interval on component unmount
  }, []);

  const statsCards = [
    {
      title: "Total Revenue",
      value: formatCurrencyWithCommas(dashboardStats.totalRevenue || 0),
      icon: TrendingUp,
      trend: "+12.5%",
      description: "vs last month",
      accessKey: 'sales'
    },
    {
      title: "Orders Today",
      value: dashboardStats.ordersToday || 0,
      icon: ShoppingCart,
      trend: "+5.2%",
      description: "vs yesterday",
      accessKey: 'orders'
    },
    {
      title: "Active Products",
      value: dashboardStats.activeProducts || 0,
      icon: Package,
      trend: "+2.1%",
      description: "vs last week",
      accessKey: 'products'
    },
    {
      title: "Customers",
      value: dashboardStats.totalCustomers || 0,
      icon: Users,
      trend: "+8.3%",
      description: "vs last month",
      accessKey: 'customers'
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Bakery Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.firstName || user?.email}! You're logged in as {getRoleDisplayName()}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="h-4 w-4 mr-1" />
            {format(currentTime, "MMM dd, yyyy - HH:mm")}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          stat.accessKey && canAccessPage(stat.accessKey) ? (
            <QuickStatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.trend}
              trend={stat.trend.startsWith('+') ? "up" : "down"}
              icon={stat.icon}
              color={
                stat.title === "Total Revenue" ? "green" :
                stat.title === "Orders Today" ? "blue" :
                stat.title === "Active Products" ? "purple" :
                stat.title === "Customers" ? "indigo" : "gray"
              }
            />
          ) : null
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders - Show for roles with order access */}
          {canAccessPage('orders') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
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
                      className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-primary" />
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
                        <p className="font-medium text-sm">
                          ${parseFloat(order.totalAmount || "0").toFixed(2)}
                        </p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                  {(!recentOrders || recentOrders.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent orders found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Schedule - Show for roles with production access */}
          {canAccessPage('production') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    Today's Production Schedule
                  </CardTitle>
                  <CardDescription>Scheduled production items</CardDescription>
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
                  {upcomingProduction?.slice(0, 4).map((item: ProductionItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Factory className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
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
                  {(!upcomingProduction || upcomingProduction.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Factory className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No production scheduled for today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role-specific content for staff/marketers */}
          {(isStaff() || isMarketer()) && !canAccessPage('production') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Tasks
                </CardTitle>
                <CardDescription>Daily assignments and tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-blue-50">
                    <p className="font-medium text-sm">Review product inventory</p>
                    <p className="text-xs text-gray-500">Check stock levels and update records</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-green-50">
                    <p className="font-medium text-sm">Process customer orders</p>
                    <p className="text-xs text-gray-500">Handle pending order confirmations</p>
                  </div>
                  {isMarketer() && (
                    <div className="p-3 rounded-lg border bg-purple-50">
                      <p className="font-medium text-sm">Update customer database</p>
                      <p className="text-xs text-gray-500">Add new customer information</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Low Stock Alert - Show for inventory access */}
          {canAccessPage('inventory') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Items running low</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockItems?.slice(0, 5).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded border border-red-100 bg-red-50"
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
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">All items in stock</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - Role-based */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks for {getRoleDisplayName()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {canAccessPage('orders') && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/orders">
                      <Plus className="h-4 w-4 mr-2" />
                      New Order
                    </Link>
                  </Button>
                )}
                {canAccessPage('production') && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/production">
                      <Factory className="h-4 w-4 mr-2" />
                      Schedule Production
                    </Link>
                  </Button>
                )}
                {canAccessPage('inventory') && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/inventory">
                      <Package className="h-4 w-4 mr-2" />
                      Add Inventory
                    </Link>
                  </Button>
                )}
                {canAccessPage('customers') && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/customers">
                      <Users className="h-4 w-4 mr-2" />
                      New Customer
                    </Link>
                  </Button>
                )}
                {canAccessPage('products') && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/products">
                      <Package className="h-4 w-4 mr-2" />
                      Manage Products
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Status - Admin/Super Admin only */}
          {(isSuperAdmin() || isAdmin()) && (
            <Card>
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
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Services</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">Healthy</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-yellow-600">75% Used</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-center">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        System Settings
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role-specific information card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Role:</span>
                  <Badge variant="outline">{getRoleDisplayName()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Access Level:</span>
                  <span className="text-sm">
                    {isSuperAdmin() || isAdmin() ? 'Full Access' :
                     isManager() ? 'Management Access' :
                     isSupervisor() ? 'Supervisor Access' :
                     'Limited Access'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Contact your administrator if you need additional permissions.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Production Scheduling Dialog (for adding new items) */}
      <Dialog
        open={isProductionDialogOpen && !editingProduction}
        onOpenChange={(open) => {
          setIsProductionDialogOpen(open);
          if (!open) setEditingProduction(null); // Clear editing state when dialog closes
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule New Production</DialogTitle>
            <DialogDescription>
              Add a new item to the production schedule. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Handle add logic here
              const newItem: ProductionItem = {
                id: Date.now(), // Simple unique ID for example
                productName: (e.target as any).productName.value,
                quantity: parseInt((e.target as any).quantity.value),
                scheduledDate: (e.target as any).scheduledDate.value,
                status: (e.target as any).status.value,
              };
              setProductionSchedule((prev) => [...prev, newItem]);
              toast({
                title: "Production scheduled",
                description: `New production for ${newItem.productName} has been scheduled.`,
                variant: "success",
              });
              setIsProductionDialogOpen(false);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="productName" className="text-right">
                  Product
                </label>
                <Select name="productName" required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.length > 0 ? (
                      activeProducts.map((product: any) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No products available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="quantity" className="text-right">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="scheduledDate" className="text-right">
                  Scheduled Date
                </label>
                <Input
                  id="scheduledDate"
                  type="date"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right">
                  Status
                </label>
                <Select name="status" defaultValue="pending">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Schedule Production</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing production schedule */}
      <Dialog
        open={isProductionDialogOpen && editingProduction !== null}
        onOpenChange={(open) => {
          setIsProductionDialogOpen(open);
          if (!open) setEditingProduction(null); // Clear editing state when dialog closes
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Production Schedule</DialogTitle>
            <DialogDescription>
              Make changes to this production item. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Find the index of the item to update
              const itemIndex = productionSchedule.findIndex(item => item.id === editingProduction?.id);
              if (itemIndex > -1 && editingProduction) {
                // Create a new array with the updated item
                const updatedSchedule = [...productionSchedule];
                updatedSchedule[itemIndex] = { ...editingProduction };
                setProductionSchedule(updatedSchedule);

                toast({
                  title: "Production updated",
                  description: `Production for ${editingProduction.productName} has been updated.`,
                  variant: "success",
                });
                setIsProductionDialogOpen(false);
                setEditingProduction(null);
              }
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="productName" className="text-right">
                  Product Name
                </label>
                <Input
                  id="productName"
                  value={editingProduction?.productName || ""}
                  onChange={(e) =>
                    setEditingProduction((prev) =>
                      prev ? { ...prev, productName: e.target.value } : null,
                    )
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="quantity" className="text-right">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  value={editingProduction?.quantity || 0}
                  onChange={(e) =>
                    setEditingProduction((prev) =>
                      prev ? { ...prev, quantity: parseInt(e.target.value) } : null,
                    )
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="scheduledDate" className="text-right">
                  Scheduled Date
                </label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={
                    editingProduction?.scheduledDate
                      ? new Date(editingProduction.scheduledDate).toISOString().substr(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    setEditingProduction((prev) =>
                      prev ? { ...prev, scheduledDate: e.target.value } : null,
                    )
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right">
                  Status
                </label>
                <Select
                  onValueChange={(value) =>
                    setEditingProduction((prev) =>
                      prev ? { ...prev, status: value } : null,
                    )
                  }
                  value={editingProduction?.status}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}