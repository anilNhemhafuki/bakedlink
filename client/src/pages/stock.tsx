
import { useState, useMemo, useEffect } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Calendar,
  Factory,
  History,
  ShoppingCart,
  Calculator,
  Clock,
  Archive,
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface StockItem {
  id: number;
  inventoryId: string;
  itemName: string;
  description?: string;
  category?: string;
  brand?: string;
  primaryUnit: string;
  primaryUnitId: number;
  secondaryUnit?: string;
  secondaryUnitId?: number;
  conversionFactor?: number;
  currentStock: number;
  secondaryStock?: number;
  reorderLevel: number;
  openingStock: number;
  openingCostPerUnit: number;
  lastStock?: number;
  lastCostPerUnit?: number;
  averageCost: number;
  totalValue: number;
  supplier?: string;
  location?: string;
  expiryDate?: string;
  batchNumber?: string;
  invoiceNumber?: string;
  lastPurchaseDate?: string;
  notes?: string;
  isActive: boolean;
  isDayClosed: boolean;
}

interface PurchaseEntry {
  itemId: number;
  quantity: number;
  unitId: number;
  costPerUnit: number;
  totalCost: number;
  supplier: string;
  invoiceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
}

interface ProductionEntry {
  productId: number;
  productName: string;
  quantity: number;
  batchId?: string;
  operator?: string;
  ingredients: Array<{
    itemId: number;
    quantityUsed: number;
    costAllocated: number;
  }>;
}

interface DailySnapshot {
  date: string;
  itemId: number;
  itemName: string;
  primaryQuantity: number;
  secondaryQuantity?: number;
  averageCost: number;
  totalValue: number;
  isClosed: boolean;
}

export default function StockManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("inventory");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"purchase" | "production" | "item">("item");
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  // Purchase Entry Form State
  const [purchaseForm, setPurchaseForm] = useState<PurchaseEntry>({
    itemId: 0,
    quantity: 0,
    unitId: 0,
    costPerUnit: 0,
    totalCost: 0,
    supplier: "",
    invoiceNumber: "",
    batchNumber: "",
    expiryDate: "",
    notes: "",
  });

  // Production Entry Form State
  const [productionForm, setProductionForm] = useState<ProductionEntry>({
    productId: 0,
    productName: "",
    quantity: 0,
    batchId: "",
    operator: "",
    ingredients: [],
  });

  // Fetch stock items
  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ["/api/stock-management"],
    queryFn: () => apiRequest("GET", "/api/stock-management"),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Fetch units
  const { data: units = [] } = useUnits();

  // Fetch products with recipes
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products-with-recipes"],
    queryFn: () => apiRequest("GET", "/api/products-with-recipes"),
  });

  // Fetch daily snapshots
  const { data: dailySnapshots = [] } = useQuery({
    queryKey: ["/api/stock-snapshots", selectedDate],
    queryFn: () => apiRequest("GET", `/api/stock-snapshots?date=${selectedDate}`),
  });

  // Fetch stock history
  const { data: stockHistory = [] } = useQuery({
    queryKey: ["/api/stock-history"],
    queryFn: () => apiRequest("GET", "/api/stock-history"),
  });

  // Unit conversion helper
  const convertUnits = (quantity: number, fromUnitId: number, toUnitId: number, conversionFactor: number = 1) => {
    if (fromUnitId === toUnitId) return quantity;
    
    const fromUnit = units.find((u: any) => u.id === fromUnitId);
    const toUnit = units.find((u: any) => u.id === toUnitId);
    
    if (!fromUnit || !toUnit) return quantity;
    
    // Use conversion factor if available
    if (conversionFactor && conversionFactor !== 1) {
      return quantity * conversionFactor;
    }
    
    return quantity;
  };

  // Calculate secondary unit quantity
  const calculateSecondaryQuantity = (primaryQuantity: number, conversionFactor: number) => {
    return conversionFactor ? primaryQuantity / conversionFactor : primaryQuantity;
  };

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

      const currentStock = item.currentStock || 0;
      const reorderLevel = item.reorderLevel || 0;
      
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

  // Purchase Entry Mutation
  const purchaseEntryMutation = useMutation({
    mutationFn: async (data: PurchaseEntry) => {
      return apiRequest("POST", "/api/stock-management/purchase", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-snapshots"] });
      setIsDialogOpen(false);
      setPurchaseForm({
        itemId: 0,
        quantity: 0,
        unitId: 0,
        costPerUnit: 0,
        totalCost: 0,
        supplier: "",
        invoiceNumber: "",
        batchNumber: "",
        expiryDate: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Purchase entry recorded and stock updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record purchase entry",
        variant: "destructive",
      });
    },
  });

  // Production Entry Mutation
  const productionEntryMutation = useMutation({
    mutationFn: async (data: ProductionEntry) => {
      return apiRequest("POST", "/api/stock-management/production", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-snapshots"] });
      setIsDialogOpen(false);
      setProductionForm({
        productId: 0,
        productName: "",
        quantity: 0,
        batchId: "",
        operator: "",
        ingredients: [],
      });
      toast({
        title: "Success",
        description: "Production entry recorded and stock deducted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record production entry",
        variant: "destructive",
      });
    },
  });

  // Close Day Mutation
  const closeDayMutation = useMutation({
    mutationFn: async (date: string) => {
      return apiRequest("POST", "/api/stock-management/close-day", { date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-snapshots"] });
      toast({
        title: "Success",
        description: "Day closed successfully. Daily snapshot created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close day",
        variant: "destructive",
      });
    },
  });

  const getStockBadge = (item: StockItem) => {
    const currentStock = item.currentStock || 0;
    const reorderLevel = item.reorderLevel || 0;

    if (currentStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (currentStock <= reorderLevel) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseForm.itemId && purchaseForm.quantity > 0 && purchaseForm.costPerUnit > 0) {
      purchaseEntryMutation.mutate(purchaseForm);
    } else {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
    }
  };

  const handleProductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productionForm.productId && productionForm.quantity > 0) {
      productionEntryMutation.mutate(productionForm);
    } else {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
    }
  };

  const openDialog = (type: "purchase" | "production" | "item") => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  // Update total cost when quantity or cost per unit changes
  useEffect(() => {
    setPurchaseForm(prev => ({
      ...prev,
      totalCost: prev.quantity * prev.costPerUnit
    }));
  }, [purchaseForm.quantity, purchaseForm.costPerUnit]);

  // Load product recipe when product is selected
  useEffect(() => {
    if (productionForm.productId) {
      const selectedProduct = products.find((p: any) => p.id === productionForm.productId);
      if (selectedProduct && selectedProduct.ingredients) {
        setProductionForm(prev => ({
          ...prev,
          productName: selectedProduct.name,
          ingredients: selectedProduct.ingredients.map((ing: any) => ({
            itemId: ing.inventoryItemId,
            quantityUsed: ing.quantity * prev.quantity,
            costAllocated: 0,
          })),
        }));
      }
    }
  }, [productionForm.productId, productionForm.quantity, products]);

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
            Comprehensive inventory tracking with purchase entry, production deduction, and daily snapshots
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => openDialog("purchase")}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchase Entry
          </Button>
          <Button
            onClick={() => openDialog("production")}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Factory className="h-4 w-4 mr-2" />
            Production Entry
          </Button>
          <Button
            onClick={() => closeDayMutation.mutate(format(new Date(), "yyyy-MM-dd"))}
            variant="outline"
            disabled={closeDayMutation.isPending}
          >
            <Archive className="h-4 w-4 mr-2" />
            {closeDayMutation.isPending ? "Closing..." : "Close Day"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="snapshots">Daily Snapshots</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
          <TabsTrigger value="analysis">Stock Analysis</TabsTrigger>
        </TabsList>

        {/* Current Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Stock Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stockItems.filter((item: StockItem) => {
                        const currentStock = item.currentStock || 0;
                        const reorderLevel = item.reorderLevel || 0;
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
                    <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stockItems.filter((item: StockItem) => 
                        (item.currentStock || 0) <= 0
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
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        stockItems.reduce((sum: number, item: StockItem) => 
                          sum + (item.totalValue || 0), 0
                        )
                      )}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search items by name, ID, brand, or description..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
            </div>
            <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="good">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Card>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading inventory...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Details</TableHead>
                        <TableHead>Stock Levels</TableHead>
                        <TableHead>Unit Information</TableHead>
                        <TableHead>Cost Information</TableHead>
                        <TableHead>Last Purchase</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item: StockItem) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-sm text-gray-500">{item.inventoryId}</div>
                              {item.brand && (
                                <div className="text-xs text-gray-400">{item.brand}</div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {item.currentStock} {item.primaryUnit}
                              </div>
                              {item.secondaryStock && item.secondaryUnit && (
                                <div className="text-sm text-gray-500">
                                  ({item.secondaryStock} {item.secondaryUnit})
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                Reorder: {item.reorderLevel} {item.primaryUnit}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                Primary: {item.primaryUnit}
                              </div>
                              {item.secondaryUnit && (
                                <div className="text-sm text-gray-500">
                                  Secondary: {item.secondaryUnit}
                                </div>
                              )}
                              {item.conversionFactor && (
                                <div className="text-xs text-gray-400">
                                  1:{item.conversionFactor}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                Avg: {formatCurrency(item.averageCost)}
                              </div>
                              {item.lastCostPerUnit && (
                                <div className="text-sm text-gray-500">
                                  Last: {formatCurrency(item.lastCostPerUnit)}
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                Value: {formatCurrency(item.totalValue)}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              {item.lastPurchaseDate ? (
                                <div className="text-sm">
                                  {format(new Date(item.lastPurchaseDate), "MMM dd, yyyy")}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">No purchases</div>
                              )}
                              {item.supplier && (
                                <div className="text-xs text-gray-500">{item.supplier}</div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>{getStockBadge(item)}</TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Edit">
                                <Edit className="h-4 w-4" />
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

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <PaginationInfo
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />
              <div className="flex items-center gap-4">
                <PageSizeSelector
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  options={[10, 20, 50, 100]}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Daily Snapshots Tab */}
        <TabsContent value="snapshots" className="space-y-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="snapshot-date">Select Date:</Label>
            <Input
              id="snapshot-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Stock Snapshot - {format(new Date(selectedDate), "MMMM dd, yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {dailySnapshots.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Primary Quantity</TableHead>
                        <TableHead>Secondary Quantity</TableHead>
                        <TableHead>Average Cost</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySnapshots.map((snapshot: DailySnapshot) => (
                        <TableRow key={`${snapshot.itemId}-${snapshot.date}`}>
                          <TableCell className="font-medium">{snapshot.itemName}</TableCell>
                          <TableCell>{snapshot.primaryQuantity}</TableCell>
                          <TableCell>{snapshot.secondaryQuantity || "-"}</TableCell>
                          <TableCell>{formatCurrency(snapshot.averageCost)}</TableCell>
                          <TableCell>{formatCurrency(snapshot.totalValue)}</TableCell>
                          <TableCell>
                            {snapshot.isClosed ? (
                              <Badge variant="default">Closed</Badge>
                            ) : (
                              <Badge variant="outline">Open</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No snapshot available for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {stockHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockHistory.map((history: any) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.date), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">{history.itemName}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={history.type === "purchase" ? "default" : 
                                      history.type === "production" ? "secondary" : "outline"}
                            >
                              {history.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {history.type === "production" ? "-" : "+"}{history.quantity} {history.unit}
                          </TableCell>
                          <TableCell>{formatCurrency(history.unitCost)}</TableCell>
                          <TableCell>{history.reference || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No stock history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Items by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stockItems
                    .sort((a: StockItem, b: StockItem) => (b.totalValue || 0) - (a.totalValue || 0))
                    .slice(0, 5)
                    .map((item: StockItem) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-gray-500">
                            {item.currentStock} {item.primaryUnit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.totalValue)}</div>
                          <div className="text-sm text-gray-500">
                            @ {formatCurrency(item.averageCost)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stockItems
                    .filter((item: StockItem) => (item.currentStock || 0) <= (item.reorderLevel || 0))
                    .slice(0, 5)
                    .map((item: StockItem) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-gray-500">
                            Current: {item.currentStock} {item.primaryUnit}
                          </div>
                        </div>
                        <div className="text-right">
                          {getStockBadge(item)}
                          <div className="text-sm text-gray-500">
                            Min: {item.reorderLevel} {item.primaryUnit}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "purchase" && "Purchase Entry"}
              {dialogType === "production" && "Production Entry"}
              {dialogType === "item" && "Stock Item Details"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "purchase" && "Record a new purchase and update stock levels"}
              {dialogType === "production" && "Record production and deduct raw materials"}
              {dialogType === "item" && "View and manage stock item details"}
            </DialogDescription>
          </DialogHeader>

          {/* Purchase Entry Form */}
          {dialogType === "purchase" && (
            <form onSubmit={handlePurchaseSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-item">Item *</Label>
                  <Select
                    value={purchaseForm.itemId.toString()}
                    onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, itemId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item: StockItem) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.itemName} - {item.inventoryId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-supplier">Supplier *</Label>
                  <Input
                    id="purchase-supplier"
                    value={purchaseForm.supplier}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-quantity">Quantity *</Label>
                  <Input
                    id="purchase-quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-unit">Unit *</Label>
                  <Select
                    value={purchaseForm.unitId.toString()}
                    onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, unitId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.filter((unit: any) => unit.isActive).map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-cost">Cost per Unit *</Label>
                  <Input
                    id="purchase-cost"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchaseForm.costPerUnit}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, costPerUnit: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-total">Total Cost</Label>
                  <Input
                    id="purchase-total"
                    type="number"
                    value={purchaseForm.totalCost.toFixed(2)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-invoice">Invoice Number</Label>
                  <Input
                    id="purchase-invoice"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-batch">Batch Number</Label>
                  <Input
                    id="purchase-batch"
                    value={purchaseForm.batchNumber}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                    placeholder="BATCH-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-expiry">Expiry Date</Label>
                  <Input
                    id="purchase-expiry"
                    type="date"
                    value={purchaseForm.expiryDate}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-notes">Notes</Label>
                <Textarea
                  id="purchase-notes"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={purchaseEntryMutation.isPending}>
                  {purchaseEntryMutation.isPending ? "Recording..." : "Record Purchase"}
                </Button>
              </div>
            </form>
          )}

          {/* Production Entry Form */}
          {dialogType === "production" && (
            <form onSubmit={handleProductionSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="production-product">Product *</Label>
                  <Select
                    value={productionForm.productId.toString()}
                    onValueChange={(value) => setProductionForm(prev => ({ ...prev, productId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production-quantity">Production Quantity *</Label>
                  <Input
                    id="production-quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={productionForm.quantity}
                    onChange={(e) => setProductionForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production-batch">Batch ID</Label>
                  <Input
                    id="production-batch"
                    value={productionForm.batchId}
                    onChange={(e) => setProductionForm(prev => ({ ...prev, batchId: e.target.value }))}
                    placeholder="BATCH-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production-operator">Operator</Label>
                  <Input
                    id="production-operator"
                    value={productionForm.operator}
                    onChange={(e) => setProductionForm(prev => ({ ...prev, operator: e.target.value }))}
                    placeholder="Operator name"
                  />
                </div>
              </div>

              {/* Ingredients Deduction Preview */}
              {productionForm.ingredients.length > 0 && (
                <div className="space-y-4">
                  <Label>Raw Materials to be Deducted:</Label>
                  <div className="border rounded-lg p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Quantity to Deduct</TableHead>
                          <TableHead>Available Stock</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productionForm.ingredients.map((ingredient, index) => {
                          const stockItem = stockItems.find((item: StockItem) => item.id === ingredient.itemId);
                          const available = stockItem?.currentStock || 0;
                          const sufficient = available >= ingredient.quantityUsed;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>{stockItem?.itemName || "Unknown"}</TableCell>
                              <TableCell>
                                {ingredient.quantityUsed} {stockItem?.primaryUnit}
                              </TableCell>
                              <TableCell>
                                {available} {stockItem?.primaryUnit}
                              </TableCell>
                              <TableCell>
                                {sufficient ? (
                                  <Badge variant="default">Sufficient</Badge>
                                ) : (
                                  <Badge variant="destructive">Insufficient</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={productionEntryMutation.isPending}>
                  {productionEntryMutation.isPending ? "Recording..." : "Record Production"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
