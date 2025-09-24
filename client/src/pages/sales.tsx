
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
  Printer,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";

interface Sale {
  id: number;
  customerName: string;
  customerId?: number;
  totalAmount: string;
  paymentMethod: string;
  status: string;
  saleDate?: string;
  notes?: string;
  createdAt: string;
  items?: SaleItem[];
}

interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  unitId?: string;
}

interface Customer {
  id: number;
  name: string;
  type: string;
  currentBalance: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  unit: string;
}

export default function Sales() {
  const { toast } = useToast();
  const { formatCurrency, formatCurrencyWithCommas } = useCurrency();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  const [saleForm, setSaleForm] = useState({
    customerId: "",
    customerName: "",
    paymentMethod: "cash",
    saleDate: new Date().toISOString().split("T")[0],
    status: "completed",
    notes: "",
    tax: 0,
    items: [{ productId: "", quantity: 1, unitPrice: "0", unitId: "" }],
  });

  // Create Sale Mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      return apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

  // Update Sale Mutation
  const updateSaleMutation = useMutation({
    mutationFn: async (data: { id: number; saleData: any }) => {
      return apiRequest("PUT", `/api/sales/${data.id}`, data.saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Sale updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingSale(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  // Delete Sale Mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sale",
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

    const validItems = saleForm.items.filter(item => 
      item.productId && 
      parseFloat(item.unitPrice) > 0 && 
      item.quantity > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add valid items with prices and quantities.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = validItems.reduce((sum, item) => {
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const saleData = {
      customerId: saleForm.customerId ? parseInt(saleForm.customerId) : null,
      customerName: saleForm.customerName.trim(),
      totalAmount: totalAmount.toString(),
      paymentMethod: saleForm.paymentMethod,
      status: saleForm.status,
      saleDate: saleForm.saleDate,
      notes: saleForm.notes || null,
      items: validItems.map((item) => ({
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity.toString()),
        unitPrice: parseFloat(item.unitPrice),
        unitId: item.unitId ? parseInt(item.unitId) : null,
        totalPrice: (parseFloat(item.unitPrice) * parseFloat(item.quantity.toString())).toString(),
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setSaleForm({
      customerId: sale.customerId?.toString() || "",
      customerName: sale.customerName,
      paymentMethod: sale.paymentMethod,
      saleDate: sale.saleDate
        ? new Date(sale.saleDate).toISOString().split("T")[0]
        : new Date(sale.createdAt).toISOString().split("T")[0],
      status: sale.status,
      notes: sale.notes || "",
      tax: 0,
      items:
        sale.items && sale.items.length > 0
          ? sale.items.map((item) => ({
              productId: item.productId.toString(),
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              unitId: item.unitId ? item.unitId.toString() : "",
            }))
          : [{ productId: "", quantity: 1, unitPrice: "0", unitId: "" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    const totalAmount = saleForm.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const saleData = {
      customerId: saleForm.customerId ? parseInt(saleForm.customerId) : null,
      customerName: saleForm.customerName,
      totalAmount: totalAmount.toString(),
      paymentMethod: saleForm.paymentMethod,
      status: saleForm.status,
      saleDate: saleForm.saleDate,
      notes: saleForm.notes || null,
    };

    updateSaleMutation.mutate({
      id: editingSale.id,
      saleData,
    });
  };

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this sale? This action cannot be undone.",
      )
    ) {
      deleteSaleMutation.mutate(id);
    }
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSaleForm({
      customerId: "",
      customerName: "",
      paymentMethod: "cash",
      saleDate: new Date().toISOString().split("T")[0],
      status: "completed",
      notes: "",
      tax: 0,
      items: [{ productId: "", quantity: 1, unitPrice: "0", unitId: "" }],
    });
  };

  const addItem = () => {
    setSaleForm({
      ...saleForm,
      items: [
        ...saleForm.items,
        { productId: "", quantity: 1, unitPrice: "0", unitId: "" },
      ],
    });
  };

  const removeItem = (index: number) => {
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
            (p: any) => p.id === parseInt(value),
          );
          return {
            ...item,
            productId: value,
            unitPrice: product?.price || "0",
          };
        } else if (field === "quantity") {
          return { ...item, [field]: parseInt(value) || 1 };
        } else if (field === "unitPrice") {
          return { ...item, [field]: parseFloat(value) || 0 };
        } else {
          return { ...item, [field]: value };
        }
      }
      return item;
    });
    setSaleForm({ ...saleForm, items: updatedItems });
  };

  // Calculate Sub Total
  const calculateSubTotal = () => {
    return saleForm.items.reduce(
      (sum, item) =>
        sum + parseFloat(item.quantity) * parseFloat(item.unitPrice),
      0,
    );
  };

  // Calculate Total (Sub Total + Tax)
  const calculateTotal = () => {
    return calculateSubTotal() + (saleForm.tax || 0);
  };

  // Filter and search logic
  const filteredSales = useMemo(() => {
    return sales.filter((sale: Sale) => {
      const customerName = sale.customerName?.toLowerCase() || "";
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        customerName.includes(searchLower) ||
        sale.totalAmount.includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || sale.status === statusFilter;

      const matchesCustomer =
        customerFilter === "all" || sale.customerName === customerFilter;

      const saleDate = new Date(
        sale.saleDate || sale.createdAt,
      );
      const matchesDateFrom = !dateFrom || saleDate >= new Date(dateFrom);
      const matchesDateTo =
        !dateTo || saleDate <= new Date(dateTo + "T23:59:59");

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCustomer &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [sales, searchTerm, statusFilter, customerFilter, dateFrom, dateTo]);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredSales,
    "saleDate",
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

  // Get unique customers for filter
  const uniqueCustomers = useMemo(() => {
    const customers = [
      ...new Set(sales.map((s: Sale) => s.customerName)),
    ];
    return customers.filter(Boolean);
  }, [sales]);

  // Summary calculations
  const totalSales = filteredSales.reduce(
    (sum: number, sale: Sale) => sum + parseFloat(sale.totalAmount),
    0,
  );

  const statusCounts = useMemo(() => {
    return filteredSales.reduce((acc: any, sale: Sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredSales]);

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

  const viewCustomerLedger = (customerId: number) => {
    if (customerId) {
      window.open(`/customers?viewLedger=${customerId}`, "_blank");
    }
  };

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
                (sale.items || [])
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading sales...</p>
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
            Record and track all sales transactions with detailed history
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <div className="flex gap-2">
            <DialogTrigger asChild>
              <Button onClick={handleCloseDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Record Sale
              </Button>
            </DialogTrigger>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/sales-returns")}
            >
              🔄 Sales Returns
            </Button>
          </div>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    value={saleForm.customerId || undefined}
                    onValueChange={(value) => {
                      const customer = customers.find(
                        (c: any) => c.id === parseInt(value),
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
                      {Array.isArray(customers) &&
                        customers.map((customer: any) => (
                          <SelectItem
                            key={customer.id}
                            value={customer.id.toString()}
                          >
                            {customer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={saleForm.customerName}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        customerName: e.target.value,
                      })
                    }
                    placeholder="Enter customer name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={saleForm.saleDate}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        saleDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={saleForm.paymentMethod || undefined}
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
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={saleForm.status || undefined}
                    onValueChange={(value) =>
                      setSaleForm({ ...saleForm, status: value })
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
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={saleForm.notes}
                  onChange={(e) =>
                    setSaleForm({
                      ...saleForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Additional notes"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Sale Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                    onClick={addItem}
                  >
                    + Add Item
                  </Button>
                </div>

                {/* Table Header Row */}
                <div className="grid grid-cols-12 gap-2 pb-2 border-b font-medium text-sm">
                  <div className="col-span-1 text-center">S.No.</div>
                  <div className="col-span-3">Particular *</div>
                  <div className="col-span-1">Qty *</div>
                  <div className="col-span-2">Unit *</div>
                  <div className="col-span-2">Rate *</div>
                  <div className="col-span-2">Amount *</div>
                  <div className="col-span-1">Action</div>
                </div>

                {/* Data Rows */}
                {saleForm.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 bg-white hover:bg-gray-50"
                  >
                    {/* S.No. */}
                    <div className="col-span-1 flex items-center justify-center">
                      {index + 1}
                    </div>

                    {/* Particular */}
                    <div className="col-span-3">
                      <Select
                        value={item.productId || undefined}
                        onValueChange={(value) =>
                          updateItem(index, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products && Array.isArray(products) ? (
                            products.map((product: any) => (
                              <SelectItem
                                key={product.id}
                                value={product.id.toString()}
                              >
                                {product.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-products" disabled>
                              No products available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        min="1"
                        placeholder="Qty"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-2">
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
                          {unitsLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading units...
                            </SelectItem>
                          ) : units && Array.isArray(units) ? (
                            units
                              .filter((unit: any) => unit.isActive)
                              .map((unit: any) => (
                                <SelectItem
                                  key={unit.id}
                                  value={unit.id.toString()}
                                >
                                  {unit.name} ({unit.abbreviation})
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="no-units" disabled>
                              No units available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rate */}
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        min="0"
                        placeholder="Rate per unit"
                      />
                    </div>

                    {/* Amount (Calculated as Quantity × Rate) */}
                    <div className="col-span-2">
                      <Input
                        value={(
                          parseFloat(item.quantity) * parseFloat(item.unitPrice)
                        ).toFixed(2)}
                        readOnly
                        className="bg-gray-100"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Action */}
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={saleForm.items.length === 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Summary Section */}
                <div className="mt-6 p-4 border-t border-gray-200 bg-white rounded-lg">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8"></div>
                    <div className="col-span-2 text-right font-medium">
                      Sub Total:
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={calculateSubTotal().toFixed(2)}
                        readOnly
                        className="bg-gray-100 font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 mt-2">
                    <div className="col-span-8"></div>
                    <div className="col-span-2 text-right font-medium">
                      Tax:
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={saleForm.tax || 0}
                        onChange={(e) =>
                          setSaleForm({
                            ...saleForm,
                            tax: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 mt-2">
                    <div className="col-span-8"></div>
                    <div className="col-span-2 text-right font-bold">
                      Total:
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={calculateTotal().toFixed(2)}
                        readOnly
                        className="bg-gray-100 font-bold"
                      />
                    </div>
                  </div>
                </div>
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
                  disabled={createSaleMutation.isPending}
                >
                  {createSaleMutation.isPending
                    ? "Recording..."
                    : "Record Sale"}
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
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyWithCommas(totalSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSales.length} transactions
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
              Unique Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
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
                placeholder="Search by customer, or amount..."
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
                  value={customerFilter}
                  onValueChange={setCustomerFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {uniqueCustomers.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
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
            customerFilter !== "all" ||
            dateFrom ||
            dateTo) && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCustomerFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Showing {filteredSales.length} of {sales.length}{" "}
                sales
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales History Table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader
                    label="Date"
                    sortKey="saleDate"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Date
                  </SortableTableHeader>
                  <SortableTableHeader
                    label="Customer Name"
                    sortKey="customerName"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Customer Name
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
                  currentItems.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(
                          new Date(sale.saleDate || sale.createdAt),
                          "MMM dd, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.customerName}
                        {sale.customerId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 px-2"
                            onClick={() =>
                              viewCustomerLedger(sale.customerId!)
                            }
                            title="View Customer Ledger"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sale)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          View Items
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrencyWithCommas(
                          parseFloat(sale.totalAmount || "0"),
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {sale.paymentMethod?.replace("_", " ") || "N/A"}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sale)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => printInvoice(sale)}
                            title="Print Invoice"
                            className="text-green-600 hover:text-green-800"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sale)}
                            title="Edit Sale"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sale.id)}
                            title="Delete Sale"
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
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Sales Record Found
                        </h3>
                        <p className="text-sm mb-4">
                          {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your search or filter criteria."
                            : "Start by adding a new sale entry."}
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

      {/* Sale Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Complete information for sale #{selectedSale?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm">{selectedSale.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sale Date</Label>
                  <p className="text-sm">
                    {format(
                      new Date(
                        selectedSale.saleDate ||
                          selectedSale.createdAt,
                      ),
                      "PPP",
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm capitalize">
                    {selectedSale.paymentMethod?.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedSale.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrencyWithCommas(
                      parseFloat(selectedSale.totalAmount),
                    )}
                  </p>
                </div>
              </div>

              {/* Sale Items */}
              {selectedSale.items && selectedSale.items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Items Sold</Label>
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
                        {selectedSale.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
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
              {selectedSale.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSale.notes}
                  </p>
                </div>
              )}

              {/* Customer Ledger Link */}
              {selectedSale.customerId && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() =>
                      viewCustomerLedger(selectedSale.customerId!)
                    }
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Customer Ledger & Transaction History
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>Update sale information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-customer">Customer</Label>
                <Select
                  value={saleForm.customerId || undefined}
                  onValueChange={(value) => {
                    const customer = customers.find(
                      (c: any) => c.id === parseInt(value),
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
                    {Array.isArray(customers) &&
                      customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-customerName">Customer Name</Label>
                <Input
                  id="edit-customerName"
                  value={saleForm.customerName}
                  onChange={(e) =>
                    setSaleForm({
                      ...saleForm,
                      customerName: e.target.value,
                    })
                  }
                  placeholder="Enter customer name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-saleDate">Sale Date</Label>
                <Input
                  id="edit-saleDate"
                  type="date"
                  value={saleForm.saleDate}
                  onChange={(e) =>
                    setSaleForm({
                      ...saleForm,
                      saleDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select
                  value={saleForm.paymentMethod || undefined}
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
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={saleForm.status || undefined}
                  onValueChange={(value) =>
                    setSaleForm({ ...saleForm, status: value })
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
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={saleForm.notes}
                onChange={(e) =>
                  setSaleForm({
                    ...saleForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Additional notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSale(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateSaleMutation.isPending}>
                {updateSaleMutation.isPending
                  ? "Updating..."
                  : "Update Sale"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
