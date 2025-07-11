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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AdminUserManagement from "@/components/admin-user-management";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";

interface ProductionItem {
  id: number;
  productName: string;
  quantity: number;
  scheduledDate: string;
  status: string;
}

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] =
    useState<ProductionItem | null>(null);
  const [productionSchedule, setProductionSchedule] = useState<
    ProductionItem[]
  >([]);

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["/api/dashboard/recent-orders"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Check for new public orders (orders without createdBy user)
  const publicOrders = recentOrders.filter((order: any) => !order.createdBy);
  const hasNewPublicOrders = publicOrders.length > 0;

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: upcomingProduction = [] } = useQuery({
    queryKey: ["/api/dashboard/production-schedule"],
  });

  const { formatCurrencyWithCommas } = useCurrency();

  const statsCards = [
    {
      title: "Total Revenue",
      value: formatCurrencyWithCommas(stats.totalRevenue || 0),
      icon: TrendingUp,
      trend: "+12.5%",
      description: "vs last month",
    },
    {
      title: "Orders Today",
      value: stats.ordersToday || 0,
      icon: ShoppingCart,
      trend: "+5.2%",
      description: "vs yesterday",
    },
    {
      title: "Active Products",
      value: stats.activeProducts || 0,
      icon: Package,
      trend: "+2.1%",
      description: "vs last week",
    },
    {
      title: "Customers",
      value: stats.totalCustomers || 0,
      icon: Users,
      trend: "+8.3%",
      description: "vs last month",
    },
  ];

  // Handle authentication errors properly without causing render issues

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <Button
          onClick={() => setIsProductionDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Production
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-green-600">
                    {stat.trend} {stat.description}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
              {hasNewPublicOrders && (
                <Badge variant="destructive" className="ml-2">
                  {publicOrders.length} New Public Order
                  {publicOrders.length > 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.orderNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        Rs. {parseFloat(order.totalAmount || 0).toFixed(2)}
                      </p>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "in_progress"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No recent orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Stock items running low</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-orange-800">{item.name}</p>
                      <p className="text-sm text-orange-600">
                        {item.currentStock} {item.unit} remaining
                      </p>
                    </div>
                    <Badge variant="destructive">Low</Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  All stock items well stocked
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Production Schedule
          </CardTitle>
          <CardDescription>Upcoming production items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingProduction.length > 0 ? (
                  upcomingProduction.slice(0, 5).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {new Date(item.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "default"
                              : item.status === "in_progress"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-4 text-muted-foreground"
                    >
                      No upcoming production scheduled
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
