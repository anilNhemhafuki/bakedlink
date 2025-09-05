import { useState, useEffect } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SearchBar from "@/components/search-bar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";
import { Plus, Search, Edit, Trash2, Clock, Check, Target } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface ProductionItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  actualQuantity?: number;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  assignedTo?: string;
  notes?: string;
}

export default function Production() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] =
    useState<ProductionItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const { toast } = useToast();

  // For search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/products");
        return Array.isArray(res) ? res : res.products || [];
      } catch (error) {
        console.error("Failed to fetch products:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch production schedule
  const {
    data: productionSchedule = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["production-schedule"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/production-schedule");
      return Array.isArray(res) ? res : res.schedule || [];
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Create production mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/production-schedule", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      setIsDialogOpen(false);
      setEditingProduction(null);
      setSelectedProductId("");
      setSelectedStatus("");
      toast({
        title: "Success",
        description: "Production item scheduled successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to schedule production",
        variant: "destructive",
      });
    },
  });

  // Update production mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PUT", `/api/production-schedule/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      setIsDialogOpen(false);
      setEditingProduction(null);
      setSelectedProductId("");
      setSelectedStatus("");
      toast({
        title: "Success",
        description: "Production item updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update production",
        variant: "destructive",
      });
    },
  });

  // Delete production mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/production-schedule/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      toast({
        title: "Success",
        description: "Production item deleted successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete production item",
        variant: "destructive",
      });
    },
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      await apiRequest("POST", "/api/production-schedule/close-day", {
        date: today,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-schedule"] });
      toast({
        title: "Success",
        description: "Production day closed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to close production day",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const productId = parseInt(selectedProductId);
    const quantity = parseFloat(formData.get("quantity") as string);
    const scheduledDate = formData.get("scheduledDate") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const status = selectedStatus;
    const assignedTo = formData.get("assignedTo") as string;
    const notes = formData.get("notes") as string;
    const actualQuantity = formData.get("actualQuantity") as string;

    if (!productId || !quantity || !scheduledDate || !status) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const data = {
      productId,
      quantity,
      actualQuantity: actualQuantity ? parseFloat(actualQuantity) : null,
      scheduledDate,
      startTime: startTime || null,
      endTime: endTime || null,
      status,
      assignedTo: assignedTo || null,
      notes: notes || null,
    };

    if (editingProduction) {
      updateMutation.mutate({ id: editingProduction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Set form values when editing
  useEffect(() => {
    if (editingProduction) {
      setSelectedProductId(editingProduction.productId.toString());
      setSelectedStatus(editingProduction.status);
    } else {
      setSelectedProductId("");
      setSelectedStatus("");
    }
  }, [editingProduction]);

  // Calculate totals
  const totalPlanned = productionSchedule.reduce(
    (sum: number, item: any) => sum + (item.quantity || 0),
    0,
  );
  const totalActual = productionSchedule.reduce(
    (sum: number, item: any) => sum + (item.actualQuantity || 0),
    0,
  );

  // Filter and sort data
  const filteredSchedule = productionSchedule.filter((item: any) => {
    const matchesSearch =
      item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredSchedule,
    "scheduledDate",
  );

  // Add pagination functionality
  const {
    currentItems,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    totalItems,
  } = usePagination(sortedData, 10);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header with Statistics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Plan and track your production activities
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <strong>Planned Quantity:</strong> {totalPlanned}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              <strong>Actual Production:</strong> {totalActual}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => closeDayMutation.mutate()}
            variant="outline"
            disabled={closeDayMutation.isPending}
          >
            <Clock className="h-4 w-4 mr-2" />
            {closeDayMutation.isPending ? "Closing..." : "Close Day"}
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingProduction(null);
                setSelectedProductId("");
                setSelectedStatus("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingProduction(null)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Production
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduction
                    ? "Edit Production Item"
                    : "Schedule New Production"}
                </DialogTitle>
                <DialogDescription>
                  Enter production details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Select
                    value={selectedProductId}
                    onValueChange={setSelectedProductId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem
                          key={product.id}
                          value={product.id.toString()}
                        >
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    name="quantity"
                    type="number"
                    step="0.01"
                    placeholder={`Planned Quantity${
                      selectedProductId
                        ? (() => {
                            const product = products.find(
                              (p: any) => p.id.toString() === selectedProductId,
                            );
                            return product?.unitAbbreviation || product?.unit
                              ? ` (${product.unitAbbreviation || product.unit})`
                              : "";
                          })()
                        : ""
                    }`}
                    defaultValue={editingProduction?.quantity || ""}
                    required
                  />
                </div>
                {editingProduction && (
                  <div>
                    <Input
                      name="actualQuantity"
                      type="number"
                      step="0.01"
                      placeholder={`Actual Quantity Produced${
                        selectedProductId
                          ? (() => {
                              const product = products.find(
                                (p: any) =>
                                  p.id.toString() === selectedProductId,
                              );
                              return product?.unitAbbreviation || product?.unit
                                ? ` (${product.unitAbbreviation || product.unit})`
                                : "";
                            })()
                          : ""
                      }`}
                      defaultValue={editingProduction?.actualQuantity || ""}
                    />
                  </div>
                )}
                <Input
                  name="scheduledDate"
                  type="date"
                  defaultValue={
                    editingProduction?.scheduledDate
                      ? new Date(editingProduction.scheduledDate)
                          .toISOString()
                          .split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="startTime"
                    type="time"
                    placeholder="Start Time"
                    defaultValue={editingProduction?.startTime || ""}
                  />
                  <Input
                    name="endTime"
                    type="time"
                    placeholder="End Time"
                    defaultValue={editingProduction?.endTime || ""}
                  />
                </div>
                <div>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  name="assignedTo"
                  placeholder="Assigned To (optional)"
                  defaultValue={editingProduction?.assignedTo || ""}
                />
                <Textarea
                  name="notes"
                  placeholder="Notes (optional)"
                  defaultValue={editingProduction?.notes || ""}
                  rows={3}
                />
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="w-full sm:w-auto"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingProduction
                        ? "Update"
                        : "Schedule"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search, Filter and Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchBar
          placeholder="Search by product name or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Production Schedule List */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">
              Error loading production schedule: {error.message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="productName"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Product
                    </SortableTableHeader>
                    <TableCell>Planned Qty</TableCell>
                    <TableCell>Actual Qty</TableCell>
                    <SortableTableHeader
                      sortKey="scheduledDate"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Date
                    </SortableTableHeader>
                    <TableHead>Time</TableHead>
                    <SortableTableHeader
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item: ProductionItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>
                          {item.quantity}
                          {(() => {
                            const product = products.find(
                              (p: any) => p.id === item.productId,
                            );
                            return (
                              product?.unitAbbreviation || product?.unit || ""
                            );
                          })() &&
                            ` ${(() => {
                              const product = products.find(
                                (p: any) => p.id === item.productId,
                              );
                              return (
                                product?.unitAbbreviation || product?.unit || ""
                              );
                            })()}`}
                        </TableCell>
                        <TableCell>
                          {item.actualQuantity !== null &&
                          item.actualQuantity !== undefined ? (
                            <span className="text-green-600 font-medium">
                              {item.actualQuantity}
                              {(() => {
                                const product = products.find(
                                  (p: any) => p.id === item.productId,
                                );
                                return (
                                  product?.unitAbbreviation ||
                                  product?.unit ||
                                  ""
                                );
                              })() &&
                                ` ${(() => {
                                  const product = products.find(
                                    (p: any) => p.id === item.productId,
                                  );
                                  return (
                                    product?.unitAbbreviation ||
                                    product?.unit ||
                                    ""
                                  );
                                })()}`}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(item.scheduledDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {item.startTime && item.endTime ? (
                            <span className="text-sm">
                              {item.startTime} - {item.endTime}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.assignedTo || (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProduction(item);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete Production Item"
                              itemName={`production for ${item.productName}`}
                              onConfirm={() => deleteMutation.mutate(item.id)}
                              isLoading={deleteMutation.isPending}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          No production items found
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Adjust your search or filters to find production items.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && !isError && currentItems.length > 0 && (
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <PaginationInfo
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
              <PageSizeSelector
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}