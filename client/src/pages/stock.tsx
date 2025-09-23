
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SearchBar } from "@/components/search-bar";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useTableSort } from "@/hooks/useTableSort";
import { useUnits } from "@/hooks/useUnits";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

interface StockItem {
  id: number;
  inventoryId: string;
  itemName: string;
  description?: string;
  category?: string;
  brand?: string;
  unit?: string;
  unitName?: string;
  unitId?: number;
  currentStock: string;
  reorderLevel: string;
  costPrice: string;
  sellingPrice: string;
  supplier?: string;
  location?: string;
  expiryDate?: string;
  batchNumber?: string;
  notes?: string;
  stockValue: string;
  isActive: boolean;
}

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
  const { toast } = useToast();
  const { formatCurrency, symbol } = useCurrency();
  const queryClient = useQueryClient();

  // Fetch stock items
  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => apiRequest("GET", "/api/inventory"),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Use the useUnits hook to fetch units
  const { units = [], isLoading: unitsLoading, error: unitsError } = useUnits();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
    queryFn: () => apiRequest("GET", "/api/inventory-categories"),
  });

  // Filter active units
  const activeUnits = Array.isArray(units)
    ? units.filter((unit: any) => unit && unit.isActive)
    : [];

  // Generate inventory ID with INV-XXXX format
  const generateInventoryId = () => {
    const lastId = stockItems.length > 0 
      ? Math.max(...stockItems.map((item: any) => {
          const match = item.inventoryId?.match(/INV-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }))
      : 0;
    const nextId = lastId + 1;
    return `INV-${nextId.toString().padStart(4, '0')}`;
  };

  // Get unique categories from stock items, excluding empty/null values
  const stockCategories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        stockItems
          .map((item: StockItem) => item.category)
          .filter((category) => category && category.trim() !== "")
      )
    ).sort();
    return uniqueCategories;
  }, [stockItems]);

  // Filter stock items
  const filteredItems = useMemo(() => {
    return stockItems.filter((item: StockItem) => {
      const matchesSearch = 
        item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.inventoryId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || 
        (categoryFilter === "uncategorized" ? !item.category || item.category.trim() === "" : item.category === categoryFilter);

      const currentStock = parseFloat(item.currentStock || "0");
      const reorderLevel = parseFloat(item.reorderLevel || "0");
      
      let matchesStockStatus = true;
      if (stockStatusFilter === "low") {
        matchesStockStatus = currentStock <= reorderLevel && currentStock > 0;
      } else if (stockStatusFilter === "out") {
        matchesStockStatus = currentStock <= 0;
      } else if (stockStatusFilter === "good") {
        matchesStockStatus = currentStock > reorderLevel;
      }

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [stockItems, searchQuery, categoryFilter, stockStatusFilter]);

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredItems,
    "itemName"
  );

  // Add pagination
  const {
    currentItems: paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    goToPage,
    setPageSize,
  } = usePagination(sortedData, 10);

  const getStockBadge = (item: StockItem) => {
    const currentStock = parseFloat(item.currentStock || "0");
    const reorderLevel = parseFloat(item.reorderLevel || "0");

    if (currentStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (currentStock <= reorderLevel) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";

      const dataToSend = {
        ...itemData,
        inventoryId: editingItem ? editingItem.inventoryId : generateInventoryId(),
      };

      return apiRequest(method, url, dataToSend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: `Stock item ${editingItem ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message ||
          `Failed to ${editingItem ? "update" : "create"} stock item`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Success",
        description: "Stock item deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete stock item",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const selectedUnit = activeUnits.find(
      (u: any) => u.id.toString() === formData.get("unitId")
    );

    const data = {
      name: formData.get("itemName") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      categoryId: (formData.get("category") && !isNaN(parseInt(formData.get("category") as string))) 
        ? parseInt(formData.get("category") as string) : null,
      brand: formData.get("brand") as string,
      unitId: parseInt(formData.get("unitId") as string) || null,
      unit: selectedUnit?.abbreviation || "pcs",
      currentStock: parseFloat(formData.get("currentStock") as string) || 0,
      minLevel: parseFloat(formData.get("reorderLevel") as string) || 0,
      costPerUnit: parseFloat(formData.get("costPrice") as string) || 0,
      sellingPrice: parseFloat(formData.get("sellingPrice") as string) || 0,
      supplier: formData.get("supplier") as string,
      location: formData.get("location") as string,
      expiryDate: formData.get("expiryDate") as string || null,
      batchNumber: formData.get("batchNumber") as string,
      notes: formData.get("notes") as string,
      invCode: editingItem ? editingItem.inventoryId : generateInventoryId(),
      isActive: true,
    };

    saveMutation.mutate(data);
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (item: StockItem) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${item.itemName}"?`
      )
    ) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Stock Management
          </h1>
          <p className="text-muted-foreground">
            Monitor inventory levels, track stock movements, and manage reorder points
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Stock Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingItem ? "Edit Stock Item" : "Add New Stock Item"}
              </DialogTitle>
              <DialogDescription>
                Enter the details for the stock item below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Item Name and Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemName">
                        Item Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="itemName"
                        name="itemName"
                        placeholder="Enter item name"
                        defaultValue={editingItem?.itemName || ""}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        name="category"
                        defaultValue={editingItem?.category || ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Category</SelectItem>
                          <SelectItem value="ingredients">Ingredients</SelectItem>
                          <SelectItem value="raw-materials">Raw Materials</SelectItem>
                          <SelectItem value="packaging">Packaging</SelectItem>
                          <SelectItem value="spices">Spices</SelectItem>
                          <SelectItem value="dairy">Dairy</SelectItem>
                          <SelectItem value="flour">Flour</SelectItem>
                          <SelectItem value="sweeteners">Sweeteners</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          {categories.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Brand and Unit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand/Company</Label>
                      <Input
                        id="brand"
                        name="brand"
                        placeholder="Enter brand or company name"
                        defaultValue={editingItem?.brand || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitId">
                        Unit <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        name="unitId"
                        defaultValue={editingItem?.unitId?.toString() || ""}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              unitsLoading 
                                ? "Loading units..." 
                                : unitsError 
                                  ? "Error loading units"
                                  : "Select unit"
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {unitsLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading units...
                            </SelectItem>
                          ) : unitsError ? (
                            <SelectItem value="error" disabled>
                              Error loading units. Please refresh.
                            </SelectItem>
                          ) : activeUnits.length > 0 ? (
                            activeUnits.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.name} ({unit.abbreviation})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No units available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter item description"
                      defaultValue={editingItem?.description || ""}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stock Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentStock">
                        Current Stock <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="currentStock"
                        name="currentStock"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        defaultValue={editingItem?.currentStock || ""}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reorderLevel">
                        Reorder Level <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="reorderLevel"
                        name="reorderLevel"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        defaultValue={editingItem?.reorderLevel || ""}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">
                        Cost Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          id="costPrice"
                          name="costPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          defaultValue={editingItem?.costPrice || ""}
                          className="pl-8"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice">Selling Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          id="sellingPrice"
                          name="sellingPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          defaultValue={editingItem?.sellingPrice || ""}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        placeholder="Enter supplier name"
                        defaultValue={editingItem?.supplier || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="Enter storage location"
                        defaultValue={editingItem?.location || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        name="expiryDate"
                        type="date"
                        defaultValue={editingItem?.expiryDate || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="batchNumber">Batch Number</Label>
                      <Input
                        id="batchNumber"
                        name="batchNumber"
                        placeholder="Enter batch number"
                        defaultValue={editingItem?.batchNumber || ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Enter any additional notes"
                      defaultValue={editingItem?.notes || ""}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
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
                  disabled={saveMutation.isPending}
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white"
                >
                  {editingItem ? "Update Item" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{stockItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Low Stock Items
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stockItems.filter((item: StockItem) => {
                    const currentStock = parseFloat(item.currentStock || "0");
                    const reorderLevel = parseFloat(item.reorderLevel || "0");
                    return currentStock <= reorderLevel && currentStock > 0;
                  }).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stockItems.filter((item: StockItem) => 
                    parseFloat(item.currentStock || "0") <= 0
                  ).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    stockItems.reduce((total: number, item: StockItem) => 
                      total + parseFloat(item.stockValue || "0"), 0
                    )
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Items ({totalItems})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <SearchBar
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-full"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {stockCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="good">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No stock items found
              </h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first stock item to manage inventory
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Item Details</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item: StockItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {item.inventoryId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.itemName}</span>
                          {item.description && (
                            <span className="text-sm text-gray-500 truncate max-w-[200px]">
                              {item.description}
                            </span>
                          )}
                          {item.unitName && (
                            <span className="text-xs text-muted-foreground">
                              Unit: {item.unitName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.brand || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.category || (
                          <span className="text-muted-foreground">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {parseFloat(item.currentStock || "0").toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Reorder: {parseFloat(item.reorderLevel || "0").toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStockBadge(item)}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(parseFloat(item.stockValue || "0"))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingItem(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
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
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <PaginationInfo
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
          />
          <div className="flex items-center gap-4">
            <PageSizeSelector
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              options={[10, 25, 50, 100]}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        </div>
      )}

      {/* View Item Dialog */}
      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Stock Item Details: {viewingItem?.itemName}
            </DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Inventory ID
                  </label>
                  <p className="text-sm font-mono">{viewingItem.inventoryId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1">{getStockBadge(viewingItem)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Brand
                  </label>
                  <p className="text-sm">{viewingItem.brand || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Category
                  </label>
                  <p className="text-sm">{viewingItem.category || "Uncategorized"}</p>
                </div>
              </div>

              {viewingItem.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="text-sm mt-1">{viewingItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Current Stock
                  </label>
                  <p className="text-sm font-medium">
                    {parseFloat(viewingItem.currentStock || "0").toFixed(2)} {viewingItem.unitName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Reorder Level
                  </label>
                  <p className="text-sm">
                    {parseFloat(viewingItem.reorderLevel || "0").toFixed(2)} {viewingItem.unitName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Cost Price
                  </label>
                  <p className="text-sm">
                    {formatCurrency(parseFloat(viewingItem.costPrice || "0"))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Selling Price
                  </label>
                  <p className="text-sm">
                    {formatCurrency(parseFloat(viewingItem.sellingPrice || "0"))}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setViewingItem(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setViewingItem(null);
                    handleEdit(viewingItem);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
