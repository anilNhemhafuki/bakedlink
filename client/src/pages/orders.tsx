import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OrderForm from "@/components/order-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { formatCurrency } = useCurrency();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: number;
      status: string;
    }) => {
      await apiRequest("PUT", `/api/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/dashboard/recent-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default",
      in_progress: "secondary",
      pending: "outline",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      completed: "Completed",
      in_progress: "In Progress",
      pending: "Pending",
      cancelled: "Cancelled",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getStatusActions = (currentStatus: string, orderId: number) => {
    const actions = [];

    if (currentStatus === "pending") {
      actions.push(
        <Button
          key="start"
          size="sm"
          variant="outline"
          onClick={() =>
            updateStatusMutation.mutate({ orderId, status: "in_progress" })
          }
          disabled={updateStatusMutation.isPending}
        >
          Start
        </Button>,
      );
    }

    if (currentStatus === "in_progress") {
      actions.push(
        <Button
          key="complete"
          size="sm"
          onClick={() =>
            updateStatusMutation.mutate({ orderId, status: "completed" })
          }
          disabled={updateStatusMutation.isPending}
        >
          Complete
        </Button>,
      );
    }

    if (currentStatus !== "cancelled" && currentStatus !== "completed") {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() =>
            updateStatusMutation.mutate({ orderId, status: "cancelled" })
          }
          disabled={updateStatusMutation.isPending}
        >
          Cancel
        </Button>,
      );
    }

    return actions;
  };

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    // Hide completed orders from the list (but show all statuses for filtering)
    const isNotCompleted = order.status !== "completed";

    return matchesSearch && matchesStatus && isNotCompleted;
  });

  // Add pagination
  const pagination = usePagination(filteredOrders, 5);
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedOrders,
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">Track and manage customer orders</p>
        </div>
        <Button onClick={() => setShowOrderForm(true)}>
          <i className="fas fa-plus mr-2"></i>
          New Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          paginatedOrders.map((order: any) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium text-gray-700">
                          Customer:
                        </span>
                        <div>{order.customerName}</div>
                        {order.customerEmail && (
                          <div className="text-xs">{order.customerEmail}</div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Order Date:
                        </span>
                        <div>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </div>
                        {order.dueDate && (
                          <div className="text-xs">
                            Due: {new Date(order.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Total:
                        </span>
                        <div className="font-semibold text-gray-900 text-lg">
                          {formatCurrency(Number(order.totalAmount))}
                        </div>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mb-4">
                        <span className="font-medium text-gray-700 text-sm">
                          Notes:
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <i className="fas fa-eye mr-1"></i>
                      View Details
                    </Button>

                    <div className="flex space-x-1">
                      {getStatusActions(order.status, order.id)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <i className="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No orders found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search criteria"
                  : "Start by creating your first order"}
              </p>
              <Button onClick={() => setShowOrderForm(true)}>
                <i className="fas fa-plus mr-2"></i>
                Create Your First Order
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <PaginationInfo
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
            />
            <div className="flex items-center gap-4">
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                options={[5, 10, 20, 50]}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Order Form Modal */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <OrderForm onSuccess={() => setShowOrderForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Order Details - #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Customer Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Name:</strong> {selectedOrder.customerName}
                    </div>
                    {selectedOrder.customerEmail && (
                      <div>
                        <strong>Email:</strong> {selectedOrder.customerEmail}
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div>
                        <strong>Phone:</strong> {selectedOrder.customerPhone}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Order Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div>
                      <strong>Order Date:</strong>{" "}
                      {new Date(selectedOrder.orderDate).toLocaleDateString()}
                    </div>
                    {selectedOrder.dueDate && (
                      <div>
                        <strong>Due Date:</strong>{" "}
                        {new Date(selectedOrder.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <strong>Total:</strong>
                      {formatCurrency(selectedOrder.totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
