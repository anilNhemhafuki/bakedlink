import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Eye,
  FileText,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";

interface Purchase {
  id: number;
  supplierName: string;
  partyId?: number;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  purchaseDate?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  items?: PurchaseItem[];
}

interface PurchaseItem {
  id: number;
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  unitId?: string;
}

interface Party {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
}

export default function Purchases() {
  const { toast } = useToast();
  const { formatCurrency, formatCurrencyWithCommas } = useCurrency();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/purchases"],
  });

  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/parties"],
  });

  const [purchaseForm, setPurchaseForm] = useState({
    partyId: "",
    supplierName: "",
    paymentMethod: "cash",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    status: "completed",
    notes: "",
    items: [{ inventoryItemId: "", quantity: 1, unitPrice: "0", unitId: "" }],
  });

  // Create Purchase Mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: any) => {
      return apiRequest("POST", "/api/purchases", purchaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description:
          "Purchase recorded and stock quantities updated successfully",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record purchase",
        variant: "destructive",
      });
    },
  });

  // Update Purchase Mutation
  const updatePurchaseMutation = useMutation({
    mutationFn: async (data: { id: number; purchaseData: any }) => {
      return apiRequest("PUT", `/api/purchases/${data.id}`, data.purchaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Success",
        description: "Purchase updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingPurchase(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase",
        variant: "destructive",
      });
    },
  });

  // Delete Purchase Mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({
        title: "Success",
        description: "Purchase deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = purchaseForm.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const purchaseData = {
      partyId: purchaseForm.partyId ? parseInt(purchaseForm.partyId) : null,
      supplierName: purchaseForm.supplierName,
      totalAmount: totalAmount.toString(),
      paymentMethod: purchaseForm.paymentMethod,
      status: purchaseForm.status,
      invoiceNumber: purchaseForm.invoiceNumber || null,
      purchaseDate: purchaseForm.purchaseDate,
      notes: purchaseForm.notes || null,
      items: purchaseForm.items.map((item) => ({
        inventoryItemId: parseInt(item.inventoryItemId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitId: item.unitId,
        totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      })),
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurchaseForm({
      partyId: purchase.partyId?.toString() || "",
      supplierName: purchase.supplierName,
      paymentMethod: purchase.paymentMethod,
      invoiceNumber: purchase.invoiceNumber || "",
      purchaseDate: purchase.purchaseDate
        ? new Date(purchase.purchaseDate).toISOString().split("T")[0]
        : new Date(purchase.createdAt).toISOString().split("T")[0],
      status: purchase.status,
      notes: purchase.notes || "",
      items:
        purchase.items && purchase.items.length > 0
          ? purchase.items.map((item) => ({
              inventoryItemId: item.inventoryItemId.toString(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitId: item.unitId || "",
            }))
          : [{ inventoryItemId: "", quantity: 1, unitPrice: "0", unitId: "" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    const totalAmount = purchaseForm.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const purchaseData = {
      partyId: purchaseForm.partyId ? parseInt(purchaseForm.partyId) : null,
      supplierName: purchaseForm.supplierName,
      totalAmount: totalAmount.toString(),
      paymentMethod: purchaseForm.paymentMethod,
      status: purchaseForm.status,
      invoiceNumber: purchaseForm.invoiceNumber || null,
      purchaseDate: purchaseForm.purchaseDate,
      notes: purchaseForm.notes || null,
    };

    updatePurchaseMutation.mutate({
      id: editingPurchase.id,
      purchaseData,
    });
  };

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this purchase? This action cannot be undone.",
      )
    ) {
      deletePurchaseMutation.mutate(id);
    }
  };

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setPurchaseForm({
      partyId: "",
      supplierName: "",
      paymentMethod: "cash",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      status: "completed",
      notes: "",
      items: [{ inventoryItemId: "", quantity: 1, unitPrice: "0", unitId: "" }],
    });
  };

  const addItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [
        ...purchaseForm.items,
        { inventoryItemId: "", quantity: 1, unitPrice: "0", unitId: "" },
      ],
    });
  };

  const removeItem = (index: number) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = purchaseForm.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setPurchaseForm({ ...purchaseForm, items: updatedItems });
  };

  // Filter and search logic
  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase: Purchase) => {
      const supplierName = purchase.supplierName?.toLowerCase() || "";
      const invoiceNumber = purchase.invoiceNumber?.toLowerCase() || "";
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        supplierName.includes(searchLower) ||
        invoiceNumber.includes(searchLower) ||
        purchase.totalAmount.includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || purchase.status === statusFilter;

      const matchesSupplier =
        supplierFilter === "all" || purchase.supplierName === supplierFilter;

      const purchaseDate = new Date(
        purchase.purchaseDate || purchase.createdAt,
      );
      const matchesDateFrom = !dateFrom || purchaseDate >= new Date(dateFrom);
      const matchesDateTo =
        !dateTo || purchaseDate <= new Date(dateTo + "T23:59:59");

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSupplier &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [purchases, searchTerm, statusFilter, supplierFilter, dateFrom, dateTo]);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredPurchases,
    "purchaseDate",
  );

  // Pagination
  const {
    currentItems,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    totalItems,
  } = usePagination(sortedData, 10);

  // Get unique suppliers for filter
  const uniqueSuppliers = useMemo(() => {
    const suppliers = [
      ...new Set(purchases.map((p: Purchase) => p.supplierName)),
    ];
    return suppliers.filter(Boolean);
  }, [purchases]);

  // Summary calculations
  const totalPurchases = filteredPurchases.reduce(
    (sum: number, purchase: Purchase) => sum + parseFloat(purchase.totalAmount),
    0,
  );

  const statusCounts = useMemo(() => {
    return filteredPurchases.reduce((acc: any, purchase: Purchase) => {
      acc[purchase.status] = (acc[purchase.status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredPurchases]);

  const getStatusBadge = (status: string) => {
    const variants: {
      [key: string]: "default" | "secondary" | "destructive" | "outline";
    } = {
      completed: "default",
      pending: "secondary",
      cancelled: "destructive",
      partial: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const viewSupplierLedger = (partyId: number) => {
    if (partyId) {
      window.open(`/parties?viewLedger=${partyId}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Record and track all purchase transactions with detailed history
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCloseDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Record Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
              <DialogDescription>
                Enter the purchase transaction details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={purchaseForm.partyId || undefined}
                    onValueChange={(value) => {
                      const party = parties.find(
                        (p: any) => p.id === parseInt(value),
                      );
                      setPurchaseForm({
                        ...purchaseForm,
                        partyId: value,
                        supplierName: party?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(parties) &&
                        parties.map((party: any) => (
                          <SelectItem
                            key={party.id}
                            value={party.id.toString()}
                          >
                            {party.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    value={purchaseForm.supplierName}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        supplierName: e.target.value,
                      })
                    }
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        invoiceNumber: e.target.value,
                      })
                    }
                    placeholder="Enter invoice number"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        purchaseDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={purchaseForm.paymentMethod || undefined}
                    onValueChange={(value) =>
                      setPurchaseForm({ ...purchaseForm, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={purchaseForm.status || undefined}
                    onValueChange={(value) =>
                      setPurchaseForm({ ...purchaseForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={purchaseForm.notes}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Purchase Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    Add Item
                  </Button>
                </div>
                {purchaseForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                      <Label>Particular *</Label>

                      <Select
                        value={item.inventoryItemId || undefined}
                        onValueChange={(value) =>
                          updateItem(index, "inventoryItemId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems && Array.isArray(inventoryItems) ? (
                            inventoryItems.map((inventoryItem: any) => (
                              <SelectItem
                                key={inventoryItem.id}
                                value={inventoryItem.id.toString()}
                              >
                                {inventoryItem.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-items" disabled>
                              No inventory items available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity *</Label>

                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value),
                          )
                        }
                        min="1"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit *</Label>

                      <Select
                        value={item.unitId || undefined}
                        onValueChange={(value) =>
                          updateItem(index, "unitId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pcs</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="ltr">Ltr</SelectItem>
                          <SelectItem value="mtr">Mtr</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>Rate *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", e.target.value)
                        }
                        placeholder="Price"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Action</Label>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={purchaseForm.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPurchaseMutation.isPending}
                >
                  {createPurchaseMutation.isPending
                    ? "Recording..."
                    : "Record Purchase"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithCommas(totalPurchases)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredPurchases.length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statusCounts.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Active vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6 pb-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by supplier, invoice number, or amount..."
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={supplierFilter}
                  onValueChange={setSupplierFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {uniqueSuppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          {(searchTerm ||
            statusFilter !== "all" ||
            supplierFilter !== "all" ||
            dateFrom ||
            dateTo) && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSupplierFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Showing {filteredPurchases.length} of {purchases.length}{" "}
                purchases
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History Table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    label="Date"
                    sortKey="purchaseDate"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Date
                  </SortableTableHeader>
                  <SortableTableHeader
                    label="Supplier Name"
                    sortKey="supplierName"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Supplier Name
                  </SortableTableHeader>
                  <SortableTableHeader
                    label="Invoice Number"
                    sortKey="invoiceNumber"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Invoice Number
                  </SortableTableHeader>
                  <SortableTableHeader>Items</SortableTableHeader>
                  <SortableTableHeader
                    label="Total Amount"
                    sortKey="totalAmount"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Total Amount
                  </SortableTableHeader>
                  <SortableTableHeader>Payment Method</SortableTableHeader>
                  <SortableTableHeader
                    label="Status"
                    sortKey="status"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Status
                  </SortableTableHeader>
                  <SortableTableHeader>Actions</SortableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {format(
                          new Date(purchase.purchaseDate || purchase.createdAt),
                          "MMM dd, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {purchase.supplierName}
                        {purchase.partyId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2"
                            onClick={() =>
                              viewSupplierLedger(purchase.partyId!)
                            }
                            title="View Supplier Ledger"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {purchase.invoiceNumber ? (
                          purchase.invoiceNumber
                        ) : (
                          <span className="text-muted-foreground">
                            No invoice
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(purchase)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          View Items
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrencyWithCommas(
                          parseFloat(purchase.totalAmount || "0"),
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {purchase.paymentMethod?.replace("_", " ") || "N/A"}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(purchase)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(purchase)}
                            title="Edit Purchase"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(purchase.id)}
                            title="Delete Purchase"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Purchase Record Found
                        </h3>
                        <p className="text-sm mb-4">
                          {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your search or filter criteria."
                            : "Start by adding a new purchase entry."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <PaginationInfo
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
            />
            <div className="flex items-center gap-4">
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
              Complete information for purchase #{selectedPurchase?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-6">
              {/* Purchase Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p className="text-sm">{selectedPurchase.supplierName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Purchase Date</Label>
                  <p className="text-sm">
                    {format(
                      new Date(
                        selectedPurchase.purchaseDate ||
                          selectedPurchase.createdAt,
                      ),
                      "PPP",
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p className="text-sm">
                    {selectedPurchase.invoiceNumber || "Not provided"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm capitalize">
                    {selectedPurchase.paymentMethod?.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPurchase.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrencyWithCommas(
                      parseFloat(selectedPurchase.totalAmount),
                    )}
                  </p>
                </div>
              </div>

              {/* Purchase Items */}
              {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Items Purchased</Label>
                  <div className="mt-2 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchase.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.inventoryItemName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unitId || "N/A"}</TableCell>
                            <TableCell>
                              {formatCurrency(parseFloat(item.unitPrice))}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(parseFloat(item.totalPrice))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPurchase.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPurchase.notes}
                  </p>
                </div>
              )}

              {/* Supplier Ledger Link */}
              {selectedPurchase.partyId && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() =>
                      viewSupplierLedger(selectedPurchase.partyId!)
                    }
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Supplier Ledger & Transaction History
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase</DialogTitle>
            <DialogDescription>Update purchase information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Select
                  value={purchaseForm.partyId || undefined}
                  onValueChange={(value) => {
                    const party = parties.find(
                      (p: any) => p.id === parseInt(value),
                    );
                    setPurchaseForm({
                      ...purchaseForm,
                      partyId: value,
                      supplierName: party?.name || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(parties) &&
                      parties.map((party: any) => (
                        <SelectItem key={party.id} value={party.id.toString()}>
                          {party.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-supplierName">Supplier Name</Label>
                <Input
                  id="edit-supplierName"
                  value={purchaseForm.supplierName}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      supplierName: e.target.value,
                    })
                  }
                  placeholder="Enter supplier name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-invoiceNumber">Invoice Number</Label>
                <Input
                  id="edit-invoiceNumber"
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                  placeholder="Enter invoice number"
                />
              </div>
              <div>
                <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
                <Input
                  id="edit-purchaseDate"
                  type="date"
                  value={purchaseForm.purchaseDate}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      purchaseDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select
                  value={purchaseForm.paymentMethod || undefined}
                  onValueChange={(value) =>
                    setPurchaseForm({ ...purchaseForm, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={purchaseForm.status || undefined}
                  onValueChange={(value) =>
                    setPurchaseForm({ ...purchaseForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={purchaseForm.notes}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingPurchase(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePurchaseMutation.isPending}>
                {updatePurchaseMutation.isPending
                  ? "Updating..."
                  : "Update Purchase"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
