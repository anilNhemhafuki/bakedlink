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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import OrderForm from "@/components/order-form"; // Ensure OrderForm correctly saves data
import SearchBar from "@/components/search-bar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
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
  const [selectedOrder, setSelectedOrder] = useState<any>(null); // Ensure 'any' is replaced with a proper Order type
  const { toast } = useToast();

  // --- Data Fetching ---
  // Ensure your API endpoint /api/orders returns all necessary fields:
  // id, orderNumber, customerName, customerEmail, customerPhone, orderDate,
  // dueDate, totalAmount, status, notes, etc.
  const {
    data: orders = [], // Type this properly, e.g., data: orders: Order[] = []
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/orders"],
    // Consider adding a staleTime if data doesn't change rapidly
    // staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // --- Mutation for Updating Status ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: number;
      status: string;
    }) => {
      // Ensure your PUT /api/orders/:id endpoint correctly updates the status
      await apiRequest("PUT", `/api/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch updated data
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
        // Consider using a more robust navigation method if available
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

  // --- Helper Function for Status Badges ---
  const getStatusBadge = (status: string) => {
    // Maps status strings to Badge variants for color coding
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default", // Typically green
      in_progress: "secondary", // Typically blue/gray
      pending: "outline", // Typically gray border
      cancelled: "destructive", // Typically red
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

  // --- Helper Function for Status Actions ---
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
    // Allow cancellation for pending or in_progress orders
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

  // --- Filtering Logic ---
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false); // Safer check

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    // As per original logic: Hide completed orders from the main list view
    const isNotCompleted = order.status !== "completed";

    return matchesSearch && matchesStatus && isNotCompleted;
  });

  // --- Sorting Logic ---
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredOrders,
    "orderNumber", // Default sort by order number
  );

  // --- Pagination Logic ---
  const pagination = usePagination(sortedData, 5); // Default page size 5
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedOrders,
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  // --- Loading State ---
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

  // --- Error Handling ---
  if (error) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return null; // Prevent further rendering
    } else {
      // Handle other errors if needed, or let React Query's default error handling show
      console.error("Error fetching orders:", error);
      // Optionally, show a user-friendly error message here
    }
  }

  // --- Main Render ---
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">Track and manage customer orders</p>
        </div>
        <Button onClick={() => setShowOrderForm(true)}>
          <i className="fas fa-plus mr-2"></i> {/* Consider Lucide Icons */}
          New Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search orders, customers..."
                value={searchQuery}
                onChange={setSearchQuery}
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

      {/* Orders List Table */}
      <div className="overflow-x-auto bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order: any) => {
                // ✅ Move the logic here
                let statusClass = "bg-gray-100 text-gray-800";
                if (order.status === "completed") {
                  statusClass = "bg-green-100 text-green-800";
                } else if (order.status === "pending") {
                  statusClass = "bg-yellow-100 text-yellow-800";
                } else if (order.status === "cancelled") {
                  statusClass = "bg-red-100 text-red-800";
                }

                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    {/* Order ID */}
                    <TableCell className="font-medium">{order.id}</TableCell>
                    {/* Customer Info */}
                    <TableCell>
                      <div>{order.customerName}</div>
                      {order.customerEmail && (
                        <div className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </div>
                      )}
                    </TableCell>
                    {/* Order Date */}
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    {/* Due Date */}
                    <TableCell>
                      {order.dueDate
                        ? new Date(order.dueDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    {/* Phone */}
                    <TableCell>{order.customerPhone || "-"}</TableCell>
                    {/* Total Amount */}
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(order.totalAmount))}
                    </TableCell>
                    {/* Status with Color */}
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusClass}`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <i className="fas fa-eye mr-1"></i> View
                        </Button>
                        {getStatusActions(order.status, order.id)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <i className="fas fa-shopping-cart text-4xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No orders found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search criteria"
                        : "Start by creating your first order"}
                    </p>
                    <Button onClick={() => setShowOrderForm(true)}>
                      <i className="fas fa-plus mr-2"></i> Create Your First
                      Order
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
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

      {/* Create Order Modal */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          {/* Ensure OrderForm calls onSuccess correctly after saving */}
          <OrderForm onSuccess={() => setShowOrderForm(false)} />
        </DialogContent>
      </Dialog>

      {/* View Order Details Modal */}
      <Dialog
        open={!!selectedOrder} // Opens if selectedOrder is not null
        onOpenChange={() => setSelectedOrder(null)} // Clears selection on close
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {/* Display details only if selectedOrder exists */}
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information Section */}
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
                    {/* Add other customer fields if needed */}
                  </div>
                </div>

                {/* Order Information Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Order Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedOrder.status)}{" "}
                      {/* Uses the badge helper */}
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
                      <strong>Total:</strong>{" "}
                      {formatCurrency(selectedOrder.totalAmount)}
                    </div>
                    {/* Add other order fields if needed (e.g., items if stored) */}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Order Items
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {item.productName}
                          </span>
                          <span className="text-gray-600 ml-2">
                            (Qty: {item.quantity}{" "}
                            {item.unitAbbreviation || item.unit || ""})
                          </span>
                        </div>
                        <div className="text-right">
                          <div>
                            {formatCurrency(item.unitPrice)} per{" "}
                            {item.unitAbbreviation || item.unit || "unit"}
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
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
