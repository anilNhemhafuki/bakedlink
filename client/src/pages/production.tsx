
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Edit, Trash2, Clock, Check, Target, Printer, AlertCircle, Calendar } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface ProductionItem {
  id: number;
  productId: number;
  productName: string;
  productCode?: string;
  batchNo?: string;
  totalQuantity: number;
  unitType: string;
  actualQuantityPackets?: number;
  priority: string;
  productionStartTime?: string;
  productionEndTime?: string;
  assignedTo?: string;
  notes?: string;
  status: string;
  scheduleDate: string;
  shift: string;
  plannedBy?: string;
  approvedBy?: string;
}

export default function Production() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<ProductionItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedShift, setSelectedShift] = useState("Morning");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [showHistory, setShowHistory] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState("");
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

  // Fetch production history
  const { data: productionHistory = [] } = useQuery({
    queryKey: ["production-schedule-history", historyDateFilter],
    queryFn: async () => {
      const url = historyDateFilter 
        ? `/api/production-schedule-history?date=${historyDateFilter}`
        : "/api/production-schedule-history";
      const res = await apiRequest("GET", url);
      return Array.isArray(res) ? res : res.history || [];
    },
    enabled: showHistory,
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
      resetFormFields();
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
      resetFormFields();
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
      queryClient.invalidateQueries({ queryKey: ["production-schedule-history"] });
      toast({
        title: "Success",
        description: "Production day closed successfully. All items moved to history.",
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

  // Print label mutation
  const printLabelMutation = useMutation({
    mutationFn: async (productionItem: ProductionItem) => {
      // Generate label data
      const labelData = {
        productName: productionItem.productName,
        productCode: productionItem.productCode,
        batchNo: productionItem.batchNo,
        totalQuantity: productionItem.totalQuantity,
        actualQuantityPackets: productionItem.actualQuantityPackets,
        unitType: productionItem.unitType,
        productionDate: productionItem.scheduleDate,
        assignedTo: productionItem.assignedTo,
      };

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Production Label - ${productionItem.productName}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .label { border: 2px solid #000; padding: 15px; max-width: 300px; }
                .label h2 { margin: 0 0 10px 0; font-size: 18px; }
                .label p { margin: 5px 0; font-size: 14px; }
                .label .batch { font-weight: bold; background: #f0f0f0; padding: 5px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="label">
                <h2>${labelData.productName}</h2>
                <p><strong>Product Code:</strong> ${labelData.productCode || 'N/A'}</p>
                <p class="batch"><strong>Batch No:</strong> ${labelData.batchNo || 'N/A'}</p>
                <p><strong>Quantity:</strong> ${labelData.totalQuantity} ${labelData.unitType}</p>
                ${labelData.actualQuantityPackets ? `<p><strong>Packets:</strong> ${labelData.actualQuantityPackets}</p>` : ''}
                <p><strong>Production Date:</strong> ${new Date(labelData.productionDate).toLocaleDateString()}</p>
                <p><strong>Assigned To:</strong> ${labelData.assignedTo || 'N/A'}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Label printed successfully",
      });
    },
  });

  const resetFormFields = () => {
    setSelectedProductId("");
    setSelectedStatus("");
    setSelectedShift("Morning");
    setSelectedPriority("medium");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const productId = parseInt(selectedProductId);
    const totalQuantity = parseFloat(formData.get("totalQuantity") as string);
    const scheduleDate = formData.get("scheduleDate") as string;
    const productionStartTime = formData.get("productionStartTime") as string;
    const productionEndTime = formData.get("productionEndTime") as string;
    const status = selectedStatus;
    const assignedTo = formData.get("assignedTo") as string;
    const notes = formData.get("notes") as string;
    const productCode = formData.get("productCode") as string;
    const batchNo = formData.get("batchNo") as string;
    const unitType = formData.get("unitType") as string;
    const actualQuantityPackets = formData.get("actualQuantityPackets") as string;
    const plannedBy = formData.get("plannedBy") as string;
    const approvedBy = formData.get("approvedBy") as string;

    if (!productId || !totalQuantity || !scheduleDate || !status) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const data = {
      productId,
      scheduleDate,
      shift: selectedShift,
      plannedBy: plannedBy || null,
      approvedBy: approvedBy || null,
      status,
      productCode: productCode || null,
      batchNo: batchNo || null,
      totalQuantity,
      unitType: unitType || "kg",
      actualQuantityPackets: actualQuantityPackets ? parseFloat(actualQuantityPackets) : null,
      priority: selectedPriority,
      productionStartTime: productionStartTime || null,
      productionEndTime: productionEndTime || null,
      assignedTo: assignedTo || null,
      notes: notes || null,
      // Legacy fields for compatibility
      quantity: totalQuantity,
      scheduledDate: scheduleDate,
      startTime: productionStartTime || null,
      endTime: productionEndTime || null,
    };

    if (editingProduction) {
      updateMutation.mutate({ id: editingProduction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseDay = () => {
    if (window.confirm("Are you sure you want to close the day? This will move all current production items to history and clear the current schedule.")) {
      closeDayMutation.mutate();
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
      case "draft":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  // Set form values when editing
  useEffect(() => {
    if (editingProduction) {
      setSelectedProductId(editingProduction.productId.toString());
      setSelectedStatus(editingProduction.status);
      setSelectedShift(editingProduction.shift || "Morning");
      setSelectedPriority(editingProduction.priority || "medium");
    } else {
      resetFormFields();
    }
  }, [editingProduction]);

  // Calculate totals
  const totalPlanned = productionSchedule.reduce(
    (sum: number, item: any) => sum + (item.totalQuantity || item.quantity || 0),
    0,
  );
  const totalActual = productionSchedule.reduce(
    (sum: number, item: any) => sum + (item.actualQuantityPackets || item.actualQuantity || 0),
    0,
  );

  // Filter and sort data
  const filteredSchedule = productionSchedule.filter((item: any) => {
    const matchesSearch =
      item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredSchedule,
    "scheduleDate",
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

  const displayData = showHistory ? productionHistory : currentItems;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header with Statistics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Production Schedule</h2>
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
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showHistory ? "Current Schedule" : "View History"}
          </Button>
          <Button
            onClick={handleCloseDay}
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
                resetFormFields();
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
            <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
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
                {/* Schedule Information Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Schedule Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Schedule Date *</label>
                      <Input
                        name="scheduleDate"
                        type="date"
                        defaultValue={
                          editingProduction?.scheduleDate ||
                          new Date().toISOString().split("T")[0]
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Shift</label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                          <SelectItem value="Night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Planned By</label>
                      <Input
                        name="plannedBy"
                        placeholder="Name of planner/supervisor"
                        defaultValue={editingProduction?.plannedBy || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Approved By</label>
                      <Input
                        name="approvedBy"
                        placeholder="Manager approval"
                        defaultValue={editingProduction?.approvedBy || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status *</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Product Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Product *</label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
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
                      <label className="block text-sm font-medium mb-1">Product Code/SKU</label>
                      <Input
                        name="productCode"
                        placeholder="Product code or SKU"
                        defaultValue={editingProduction?.productCode || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Batch No</label>
                      <Input
                        name="batchNo"
                        placeholder="Batch number"
                        defaultValue={editingProduction?.batchNo || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Priority</label>
                      <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">🔴 High</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="low">🟢 Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Quantity Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Quantity Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Total Quantity *</label>
                      <Input
                        name="totalQuantity"
                        type="number"
                        step="0.01"
                        placeholder="Total quantity"
                        defaultValue={editingProduction?.totalQuantity || ""}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unit</label>
                      <Input
                        name="unitType"
                        placeholder="kg, packets, etc."
                        defaultValue={editingProduction?.unitType || "kg"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Actual Quantity (Packets)</label>
                      <Input
                        name="actualQuantityPackets"
                        type="number"
                        step="0.01"
                        placeholder="Actual quantity in packets"
                        defaultValue={editingProduction?.actualQuantityPackets || ""}
                      />
                    </div>
                  </div>
                </div>

                {/* Production Timing */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Production Timing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Production Start Time</label>
                      <Input
                        name="productionStartTime"
                        type="datetime-local"
                        defaultValue={editingProduction?.productionStartTime || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Production End Time</label>
                      <Input
                        name="productionEndTime"
                        type="datetime-local"
                        defaultValue={editingProduction?.productionEndTime || ""}
                      />
                    </div>
                  </div>
                </div>

                {/* Assignment and Notes */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Assigned To</label>
                    <Input
                      name="assignedTo"
                      placeholder="Assign to team member"
                      defaultValue={editingProduction?.assignedTo || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <Textarea
                      name="notes"
                      placeholder="Additional notes"
                      defaultValue={editingProduction?.notes || ""}
                      rows={3}
                    />
                  </div>
                </div>

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

      {/* Search, Filter and History Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchBar
          placeholder="Search by product name, code, batch no, or notes..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div className="flex gap-2">
          {showHistory && (
            <Input
              type="date"
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              placeholder="Filter by date"
              className="w-auto"
            />
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
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
        <CardHeader>
          <CardTitle>
            {showHistory ? "Production History" : "Current Production Schedule"}
          </CardTitle>
        </CardHeader>
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
                      Product Name
                    </SortableTableHeader>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Actual Qty (Packets)</TableHead>
                    <TableHead>Priority</TableHead>
                    <SortableTableHeader
                      sortKey="scheduleDate"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Date
                    </SortableTableHeader>
                    <TableHead>Shift</TableHead>
                    <TableHead>Timing</TableHead>
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
                  {displayData.length > 0 ? (
                    displayData.map((item: ProductionItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>
                          {item.productCode || (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.batchNo || (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.totalQuantity} {item.unitType}
                        </TableCell>
                        <TableCell>
                          {item.actualQuantityPackets !== null &&
                          item.actualQuantityPackets !== undefined ? (
                            <span className="text-green-600 font-medium">
                              {item.actualQuantityPackets}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority === "high" && "🔴 "}
                            {item.priority === "medium" && "🟡 "}
                            {item.priority === "low" && "🟢 "}
                            {item.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(item.scheduleDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.shift}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.productionStartTime && item.productionEndTime ? (
                            <span className="text-sm">
                              {new Date(item.productionStartTime).toLocaleTimeString()} - {new Date(item.productionEndTime).toLocaleTimeString()}
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
                            {!showHistory && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduction(item);
                                    setIsDialogOpen(true);
                                  }}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <DeleteConfirmationDialog
                                  trigger={
                                    <Button variant="ghost" size="sm" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                  title="Delete Production Item"
                                  itemName={`production for ${item.productName}`}
                                  onConfirm={() => deleteMutation.mutate(item.id)}
                                  isLoading={deleteMutation.isPending}
                                />
                              </>
                            )}
                            {item.status === "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printLabelMutation.mutate(item)}
                                title="Print Label"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          {showHistory ? "No production history found" : "No production items found"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {showHistory 
                            ? "No production history available for the selected filters."
                            : "Schedule your first production item to get started."
                          }
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && !isError && !showHistory && currentItems.length > 0 && (
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
              <PageSizeSelector pageSize={pageSize} setPageSize={setPageSize} />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
