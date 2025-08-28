
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, ShoppingCart, Receipt, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

export default function PurchaseHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplierId: "",
    invoiceNumber: "",
    purchaseDate: "",
    totalAmount: "",
    paidAmount: "",
    paymentStatus: "pending",
    paymentMethod: "cash",
    notes: "",
    items: [] as any[],
  });

  const { toast } = useToast();
  const { symbol } = useCurrency();

  // Set default date range (current month)
  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(startOfMonth.toISOString().split('T')[0]);
    setEndDate(endOfMonth.toISOString().split('T')[0]);
  }, []);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/parties"],
    queryFn: () => apiRequest("GET", "/api/parties?type=supplier"),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/purchases", selectedSupplier, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSupplier && selectedSupplier !== "all") params.append('supplierId', selectedSupplier);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return apiRequest("GET", `/api/purchases?${params.toString()}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/purchases", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase record",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/purchases/${editingPurchase?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase record updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase record",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/purchases/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase record",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: "",
      invoiceNumber: "",
      purchaseDate: "",
      totalAmount: "",
      paidAmount: "",
      paymentStatus: "pending",
      paymentMethod: "cash",
      notes: "",
      items: [],
    });
    setEditingPurchase(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId || !formData.purchaseDate || !formData.totalAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      supplierId: parseInt(formData.supplierId),
      totalAmount: parseFloat(formData.totalAmount),
      paidAmount: parseFloat(formData.paidAmount) || 0,
      items: formData.items.map(item => ({
        ...item,
        inventoryItemId: parseInt(item.inventoryItemId),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
      })),
    };

    if (editingPurchase) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (purchase: any) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierId: purchase.supplierId?.toString() || "",
      invoiceNumber: purchase.invoiceNumber || "",
      purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : "",
      totalAmount: purchase.totalAmount?.toString() || "",
      paidAmount: purchase.paidAmount?.toString() || "",
      paymentStatus: purchase.paymentStatus || "pending",
      paymentMethod: purchase.paymentMethod || "cash",
      notes: purchase.notes || "",
      items: purchase.items || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        inventoryItemId: "",
        quantity: "",
        unitPrice: "",
        totalPrice: "0",
      }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(items[index].quantity) || 0;
      const unitPrice = parseFloat(items[index].unitPrice) || 0;
      items[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }
    
    setFormData(prev => ({ ...prev, items }));
    
    // Update total amount
    const total = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      partial: { variant: "outline" as const, label: "Partially Paid" },
      paid: { variant: "default" as const, label: "Paid" },
      overdue: { variant: "destructive" as const, label: "Overdue" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPurchases = purchases.filter((purchase: any) =>
    `${purchase.supplierName} ${purchase.invoiceNumber} ${purchase.notes}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredPurchases,
    "purchaseDate",
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Purchase History
          </h1>
          <p className="text-muted-foreground">
            Track all purchase transactions and supplier payments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Purchase Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? "Edit Purchase Record" : "Add Purchase Record"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={formData.supplierId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Invoice/Bill number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod || undefined}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Purchase Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Purchase Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 items-end p-4 border rounded">
                    <div>
                      <Label>Item</Label>
                      <Select
                        value={item.inventoryItemId || undefined}
                        onValueChange={(value) => updateItem(index, 'inventoryItemId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((inventoryItem: any) => (
                            <SelectItem key={inventoryItem.id} value={inventoryItem.id.toString()}>
                              {inventoryItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        placeholder="Price"
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input
                        value={item.totalPrice}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      {symbol}
                    </span>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                      className="rounded-l-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="paidAmount">Paid Amount</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      {symbol}
                    </span>
                    <Input
                      id="paidAmount"
                      type="number"
                      step="0.01"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={formData.paymentStatus || undefined}
                  onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingPurchase
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="supplierFilter">Supplier</Label>
              <Select value={selectedSupplier || undefined} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <SearchBar
                placeholder="Search purchases..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase Records ({sortedData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading purchases...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="purchaseDate"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Date
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="supplierName"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Supplier
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="invoiceNumber"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Invoice #
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="totalAmount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Total Amount
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="paidAmount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Paid Amount
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="paymentStatus"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((purchase: any) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {format(new Date(purchase.purchaseDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {purchase.supplierName}
                      </TableCell>
                      <TableCell>{purchase.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {symbol}{parseFloat(purchase.totalAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {symbol}{parseFloat(purchase.paidAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(purchase.paymentStatus)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {purchase.paymentMethod?.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(purchase)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmationDialog
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title="Delete Purchase Record"
                            itemName={`Purchase from ${purchase.supplierName}`}
                            onConfirm={() => handleDelete(purchase.id)}
                            isLoading={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <p className="text-muted-foreground">No purchase records found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
