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
import { Plus, Edit, Trash2, Package, Calendar, Receipt, Filter, Search, Eye, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

interface Purchase {
  id: number;
  supplierName: string;
  partyId?: number;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  purchaseDate: string;
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
}

interface Party {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
}

export default function PurchaseHistory() {
  const { toast } = useToast();
  const { formatCurrency, formatCurrencyWithCommas } = useCurrency();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch data
  const { data: purchases = [], isLoading: isPurchasesLoading } = useQuery({
    queryKey: ["/api/purchases"],
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/parties"],
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["/api/inventory"],
  });

  // Delete mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete purchase");
      return response.json();
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase",
        variant: "destructive",
      });
    },
  });

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

      const purchaseDate = new Date(purchase.purchaseDate || purchase.createdAt);
      const matchesDateFrom = 
        !dateFrom || purchaseDate >= new Date(dateFrom);
      const matchesDateTo = 
        !dateTo || purchaseDate <= new Date(dateTo + "T23:59:59");

      return matchesSearch && matchesStatus && matchesSupplier && matchesDateFrom && matchesDateTo;
    });
  }, [purchases, searchTerm, statusFilter, supplierFilter, dateFrom, dateTo]);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredPurchases, 'purchaseDate');

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
    const suppliers = [...new Set(purchases.map((p: Purchase) => p.supplierName))];
    return suppliers.filter(Boolean);
  }, [purchases]);

  // Summary calculations
  const totalPurchases = filteredPurchases.reduce(
    (sum: number, purchase: Purchase) => sum + parseFloat(purchase.totalAmount),
    0
  );

  const statusCounts = useMemo(() => {
    return filteredPurchases.reduce((acc: any, purchase: Purchase) => {
      acc[purchase.status] = (acc[purchase.status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredPurchases]);

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsDetailDialogOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this purchase? This action cannot be undone.")) {
      deletePurchaseMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
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
      window.open(`/parties?viewLedger=${partyId}`, '_blank');
    }
  };

  if (isPurchasesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading purchase history...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase History</h1>
          <p className="text-gray-600">
            Complete record of all purchase transactions with supplier ledger integration
          </p>
        </div>
        <Button asChild>
          <a href="/purchases">
            <Plus className="h-4 w-4 mr-2" />
            Record New Purchase
          </a>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyWithCommas(totalPurchases)}</div>
            <p className="text-xs text-muted-foreground">{filteredPurchases.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Active vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <Label htmlFor="status-filter">Status</Label>
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
                <Label htmlFor="supplier-filter">Supplier</Label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
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
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          {(searchTerm || statusFilter !== "all" || supplierFilter !== "all" || dateFrom || dateTo) && (
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
                Showing {filteredPurchases.length} of {purchases.length} purchases
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableTableHeader
                      label="Date"
                      sortKey="purchaseDate"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHeader
                      label="Supplier Name"
                      sortKey="supplierName"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHeader
                      label="Invoice Number"
                      sortKey="invoiceNumber"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  </TableHead>
                  <TableHead>Items Purchased</TableHead>
                  <TableHead>
                    <SortableTableHeader
                      label="Total Amount"
                      sortKey="totalAmount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableTableHeader
                      label="Payment Status"
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    />
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((purchase: Purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.purchaseDate || purchase.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.supplierName}
                      {purchase.partyId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-2"
                          onClick={() => viewSupplierLedger(purchase.partyId!)}
                          title="View Supplier Ledger"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.invoiceNumber || (
                        <span className="text-muted-foreground">No invoice</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(purchase)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        View Items
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrencyWithCommas(parseFloat(purchase.totalAmount))}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.status)}
                    </TableCell>
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
                ))}
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
                    {format(new Date(selectedPurchase.purchaseDate || selectedPurchase.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Invoice Number</Label>
                  <p className="text-sm">{selectedPurchase.invoiceNumber || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm capitalize">{selectedPurchase.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPurchase.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrencyWithCommas(parseFloat(selectedPurchase.totalAmount))}
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
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchase.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.inventoryItemName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(item.unitPrice))}</TableCell>
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
                  <p className="text-sm text-muted-foreground">{selectedPurchase.notes}</p>
                </div>
              )}

              {/* Supplier Ledger Link */}
              {selectedPurchase.partyId && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => viewSupplierLedger(selectedPurchase.partyId!)}
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
    </div>
  );
}