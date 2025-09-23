import { useState, useMemo } from "react"; // Added useMemo
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
import { Plus, Receipt, Search, Filter, Eye, Printer } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";

interface Sale {
  id: number;
  customerName: string;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: SaleItem[];
  phoneNumber?: string; // Added for detail view
  companyName?: string; // Added for detail view
}

interface SaleItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

// --- Helper function to fetch data ---
const fetchData = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
};

export default function Sales() {
  const { toast } = useToast();
  const { formatCurrency, formatCurrencyWithCommas } = useCurrency();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // --- FIXED: Added queryFn and extracted isLoading for all queries ---
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: async () => {
      const res = await fetch("/api/sales", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // --- FIXED: Now these variables are defined ---
  const isLoading = isSalesLoading || isProductsLoading || isCustomersLoading;

  const [saleForm, setSaleForm] = useState({
    customerId: "",
    customerName: "",
    paymentMethod: "cash",
    items: [{ productId: "", quantity: 1, unitPrice: "0" }],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(saleData),
      });
      if (!response.ok) throw new Error("Failed to create sale");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Success", description: "Sale recorded successfully" });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!saleForm.customerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      });
      return;
    }

    if (saleForm.items.length === 0 || !saleForm.items.some(item => item.productId)) {
      toast({
        title: "Validation Error",
        description: "At least one item is required.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = saleForm.items.reduce((sum, item) => {
      if (!item.productId) return sum;
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return isNaN(itemTotal) ? sum : sum + itemTotal;
    }, 0);

    const validItems = saleForm.items
      .filter(item => item.productId && parseFloat(item.unitPrice) > 0)
      .map((item) => ({
        productId: parseInt(item.productId, 10),
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice).toString(),
        totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      }));

    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add valid items with prices.",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      customerId: saleForm.customerId ? parseInt(saleForm.customerId, 10) : null,
      customerName: saleForm.customerName.trim(),
      totalAmount: totalAmount.toString(),
      paymentMethod: saleForm.paymentMethod,
      status: "completed",
      items: validItems,
    };

    createSaleMutation.mutate(saleData);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSaleForm({
      customerId: "",
      customerName: "",
      paymentMethod: "cash",
      items: [{ productId: "", quantity: 1, unitPrice: "0" }],
    });
  };

  const addItem = () => {
    setSaleForm({
      ...saleForm,
      items: [
        ...saleForm.items,
        { productId: "", quantity: 1, unitPrice: "0" },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (saleForm.items.length <= 1) return; // Prevent removing the last item
    setSaleForm({
      ...saleForm,
      items: saleForm.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = saleForm.items.map((item, i) => {
      if (i === index) {
        if (field === "productId") {
          const product = products.find(
            (p: any) => p.id === parseInt(value, 10),
          );
          return {
            ...item,
            productId: value,
            unitPrice: product?.price || "0",
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setSaleForm({ ...saleForm, items: updatedItems });
  };

  // --- Improved filtering logic using useMemo ---
  const filteredSales = useMemo(() => {
    // Filter sales based on search term and status
    const filtered = (sales || []).filter((sale: Sale) => {
      // Ensure sale.customerName exists and is a string before calling toLowerCase
      const customerName =
        typeof sale.customerName === "string" ? sale.customerName : "";
      const matchesSearch = customerName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || sale.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered;
  }, [sales, searchTerm, statusFilter]); // Recalculate when sales, searchTerm, or statusFilter change

  // --- Apply sorting to filtered sales ---
  const {
    sortedData: sortedSales,
    sortConfig,
    requestSort,
  } = useTableSort(filteredSales, "customerName");

  // --- Use sortedSales for pagination ---
  const pagination = usePagination(sortedSales, 5); // Explicit initial page size
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedSales, // Use this for the table body
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  // --- Memoized calculations for summary cards ---
  const { totalSales, todaySales, averageSale, transactionCount } =
    useMemo(() => {
      const salesArray = sales || []; // Ensure sales is an array
      const total = salesArray.reduce(
        (sum: number, sale: Sale) => sum + (parseFloat(sale.totalAmount) || 0), // Handle potential NaN
        0,
      );

      const today = new Date().toDateString();
      const todayTotal = salesArray
        .filter(
          (sale: Sale) => new Date(sale.createdAt).toDateString() === today,
        )
        .reduce(
          (sum: number, sale: Sale) =>
            sum + (parseFloat(sale.totalAmount) || 0),
          0,
        ); // Handle potential NaN

      const count = salesArray.length;
      const avg = count > 0 ? total / count : 0;

      return {
        totalSales: total,
        todaySales: todayTotal,
        averageSale: avg,
        transactionCount: count,
      };
    }, [sales]); // Recalculate only when sales data changes

  const printInvoice = (sale: Sale) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Invoice - ${sale.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-tagline {
              font-size: 14px;
              color: #666;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .invoice-info, .customer-info {
              flex: 1;
            }
            .invoice-info h3, .customer-info h3 {
              font-size: 16px;
              margin-bottom: 10px;
              color: #2563eb;
            }
            .invoice-info p, .customer-info p {
              margin: 5px 0;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th, .items-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .items-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              color: #333;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total-section {
              text-align: right;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin: 5px 0;
            }
            .total-label {
              width: 150px;
              font-weight: bold;
            }
            .total-amount {
              width: 100px;
              text-align: right;
            }
            .grand-total {
              border-top: 2px solid #333;
              padding-top: 10px;
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Bake Sewa</div>
            <div class="company-tagline">Delicious Moments, Sweet Memories</div>
            <div class="invoice-title">SALES INVOICE</div>
          </div>
          <div class="invoice-details">
            <div class="invoice-info">
              <h3>Invoice Information</h3>
              <p><strong>Invoice #:</strong> INV-${sale.id}</p>
              <p><strong>Date:</strong> ${format(new Date(sale.createdAt), "dd/MM/yyyy")}</p>
              <p><strong>Time:</strong> ${format(new Date(sale.createdAt), "HH:mm:ss")}</p>
              <p><strong>Payment Method:</strong> ${sale.paymentMethod?.toUpperCase() || "N/A"}</p>
              <p><strong>Status:</strong> ${sale.status?.toUpperCase() || "COMPLETED"}</p>
            </div>
            <div class="customer-info">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${sale.customerName}</p>
              <p><strong>Invoice Date:</strong> ${format(new Date(sale.createdAt), "MMMM dd, yyyy")}</p>
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${
                (sale.items || []) // Ensure items is an array
                  .map(
                    (item) => `
                <tr>
                  <td>${item.productName || "N/A"}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(parseFloat(item.unitPrice) || 0)}</td>
                  <td>${formatCurrency(parseFloat(item.totalPrice) || 0)}</td>
                </tr>
              `,
                  )
                  .join("") || '<tr><td colspan="4">No items found</td></tr>'
              }
            </tbody>
          </table>
          <div class="total-section">
            <div class="total-row grand-total">
              <div class="total-label">Grand Total:</div>
              <div class="total-amount">${formatCurrency(parseFloat(sale.totalAmount) || 0)}</div>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Bake Sewa - Where every bite is a delight</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Record and track all sales transactions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex gap-2">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Sale
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/sales-returns'}
                  >
                    🔄 Sales Returns
                  </Button>
                </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record New Sale</DialogTitle>
              <DialogDescription>
                Enter the sale transaction details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <Select
                    value={saleForm.customerId}
                    onValueChange={(value) => {
                      const customer = customers.find(
                        (c: any) => c.id === parseInt(value, 10),
                      );
                      setSaleForm({
                        ...saleForm,
                        customerId: value,
                        customerName: customer?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(customers) && customers.map((customer: any) => (
                            <SelectItem
                              key={customer.id}
                              value={customer.id.toString()}
                            >
                              {customer.name}
                            </SelectItem>
                          )
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={saleForm.customerName}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, customerName: e.target.value })
                    }
                    placeholder="Enter customer name"
                    // Removed required to allow manual entry without selection
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={saleForm.paymentMethod}
                  onValueChange={(value) =>
                    setSaleForm({ ...saleForm, paymentMethod: value })
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
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    Add Item
                  </Button>
                </div>
                {saleForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          updateItem(index, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(products || []).map(
                            (
                              product: any, // Ensure products is an array
                            ) => (
                              <SelectItem
                                key={product.id}
                                value={product.id.toString()}
                              >
                                {product.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value, 10) || 1, // Default to 1 if invalid
                          )
                        }
                        min="1"
                      />
                    </div>
                    <div className="col-span-3">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={saleForm.items.length === 1}
                      >
                        Remove
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
                <Button type="submit" disabled={createSaleMutation.isPending}>
                  {createSaleMutation.isPending
                    ? "Recording..."
                    : "Record Sale"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithCommas(totalSales)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithCommas(todaySales)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithCommas(averageSale)}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        {/* Filters Section - Placed above the table */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              placeholder="Search sales..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Sales Table */}
        <div className="overflow-x-auto bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  sortKey="invoiceID"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Invoice ID
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="customerName"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Customer
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="createdAt"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Date
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="paymentMethod"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Payment Method
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="status"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Status
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="totalAmount"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                  className="text-right"
                >
                  Total
                </SortableTableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSales && paginatedSales.length > 0 ? (
                paginatedSales.map((sale: Sale) => {
                  let statusClass = "bg-gray-100 text-gray-800";
                  if (sale.status === "completed") {
                    statusClass = "bg-green-100 text-green-800";
                  } else if (sale.status === "pending") {
                    statusClass = "bg-yellow-100 text-yellow-800";
                  } else if (sale.status === "cancelled") {
                    statusClass = "bg-red-100 text-red-800";
                  }
                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          INV-{sale.id}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          {sale.customerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {sale.paymentMethod?.toUpperCase() ?? "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${statusClass}`}
                        >
                          {sale.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(parseFloat(sale.totalAmount) || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            onClick={() => setSelectedSale(sale)}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none"
                            variant="outline-none"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            className="text-green-600 hover:text-green-800 focus:outline-none"
                            variant="outline-none"
                            title="Label Print"
                            onClick={() => printInvoice(sale)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">
                        No sales found
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Start by recording your first sale"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Pagination Controls */}
          {sortedSales.length > 0 && (
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
      </div>

      {/* Sales Detail Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sales Invoice - INV-{selectedSale?.id}</DialogTitle>
            <DialogDescription>
              Detailed view of the sales transaction
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Invoice Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice #:</span>
                      <span className="font-medium">INV-{selectedSale.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {format(
                          new Date(selectedSale.createdAt),
                          "MMM dd, yyyy",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSale.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">
                        {selectedSale.paymentMethod?.toUpperCase() || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedSale.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : selectedSale.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : selectedSale.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800" // Default
                        }`}
                      >
                        {selectedSale.status?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Customer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer Name:</span>
                      <span className="font-medium">
                        {selectedSale.customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone Number:</span>
                      <span className="font-medium">
                        {selectedSale.phoneNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company Name:</span>
                      <span className="font-medium">
                        {selectedSale.companyName || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Items Sales
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.productName || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-center">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {formatCurrency(parseFloat(item.unitPrice) || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(parseFloat(item.totalPrice) || 0)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                      <span>Grand Total:</span>
                      <span>
                        {formatCurrency(
                          parseFloat(selectedSale.totalAmount) || 0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedSale(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => printInvoice(selectedSale)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}