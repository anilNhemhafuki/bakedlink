import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchBar from "@/components/search-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { EnhancedStockItemForm } from "@/components/enhanced-stock-item-form";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const { toast } = useToast();
  const { symbol, formatCurrency } = useCurrency();

  const {
    data: inventoryData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/inventory", searchQuery, selectedGroup],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/inventory?search=${encodeURIComponent(searchQuery)}&group=${selectedGroup}`,
      ),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Handle both array and object response formats
  const items = Array.isArray(inventoryData)
    ? inventoryData
    : inventoryData?.items || [];
  const totalCount = Array.isArray(inventoryData)
    ? inventoryData.length
    : inventoryData?.totalCount || 0;
  const totalPages = Array.isArray(inventoryData)
    ? Math.ceil(inventoryData.length / 10)
    : inventoryData?.totalPages || 0;

  // Fetch ingredients specifically
  const { data: ingredients = [] } = useQuery({
    queryKey: ["/api/ingredients"],
    queryFn: () => apiRequest("GET", "/api/ingredients"),
  });

  // Fetch categories for group filter
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
    queryFn: () => apiRequest("GET", "/api/inventory-categories"),
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(items, "name");

  // Enhanced pagination - use items instead of sortedData initially
  const {
    currentItems: paginatedItems,
    currentPage: paginationCurrentPage,
    totalPages: paginationTotalPages,
    pageSize: paginationPageSize,
    setPageSize: setPaginationPageSize,
    goToPage: paginationGoToPage,
    totalItems: paginationTotalItems,
  } = usePagination(sortedData || items, 10);

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
  }, [debouncedSearchQuery]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      toast({
        title: "Success",
        description: "Stock item deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete stock item",
        variant: "destructive",
      });
    },
  });

  // Sync stock from purchases
  const syncStockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inventory/sync-from-purchases"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Success",
        description: "Stock levels synced with purchases successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync stock levels",
        variant: "destructive",
      });
    },
  });

  const getStockBadge = (item: any) => {
    const closingStock = parseFloat(
      item.closingStock || item.currentStock || 0,
    );
    const minLevel = parseFloat(item.minLevel || 0);

    if (closingStock <= 0) {
      return {
        variant: "destructive" as const,
        text: "Out of Stock",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    } else if (closingStock <= minLevel) {
      return {
        variant: "destructive" as const,
        text: "Low Stock",
        icon: <TrendingDown className="h-3 w-3" />,
      };
    } else if (closingStock <= minLevel * 1.5) {
      return {
        variant: "secondary" as const,
        text: "Warning",
        icon: <Minus className="h-3 w-3" />,
      };
    }
    return {
      variant: "default" as const,
      text: "In Stock",
      icon: <TrendingUp className="h-3 w-3" />,
    };
  };

  const getUnitName = (unitId: number, units: any[] = []) => {
    if (!unitId || !Array.isArray(units)) return "Unknown Unit";
    const unit = units.find((u: any) => u.id === unitId);
    return unit ? unit.abbreviation || unit.name : "Unknown Unit";
  };

  const getGroupBadge = (group: string) => {
    const colors = {
      ingredients: "bg-green-100 text-green-800",
      "raw-materials": "bg-blue-100 text-blue-800",
      packaging: "bg-purple-100 text-purple-800",
      spices: "bg-orange-100 text-orange-800",
      dairy: "bg-yellow-100 text-yellow-800",
      flour: "bg-amber-100 text-amber-800",
      sweeteners: "bg-pink-100 text-pink-800",
      supplies: "bg-gray-100 text-gray-800",
    };

    const colorClass =
      colors[group as keyof typeof colors] || "bg-gray-100 text-gray-800";

    return (
      <Badge variant="outline" className={`capitalize ${colorClass} border-0`}>
        {group?.replace("-", " ") || "Uncategorized"}
      </Badge>
    );
  };

  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Track opening, purchased, consumed, and closing stock with purchase
            integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncStockMutation.mutate()}
            disabled={syncStockMutation.isPending}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncStockMutation.isPending ? "animate-spin" : ""}`}
            />
            Sync from Purchases
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setIsDialogOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <EnhancedStockItemForm
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingItem(null);
          }}
          editingItem={editingItem}
        />
      </div>

      {/* Real-time Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">
                  {items.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    items.filter((item) => {
                      const stock = parseFloat(
                        item.closingStock || item.currentStock || 0,
                      );
                      const min = parseFloat(item.minLevel || 0);
                      return stock <= min && stock > 0;
                    }).length
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-gray-600">
                  {
                    items.filter((item) => {
                      const stock = parseFloat(
                        item.closingStock || item.currentStock || 0,
                      );
                      return stock <= 0;
                    }).length
                  }
                </p>
              </div>
              <Minus className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    items.reduce((total, item) => {
                      const stock = parseFloat(
                        item.closingStock || item.currentStock || 0,
                      );
                      const cost = parseFloat(
                        item.averageCost || item.costPerUnit || 0,
                      );
                      return total + stock * cost;
                    }, 0),
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
            placeholder="Search items, suppliers, or inventory codes..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Items ({items.length} total)
            </CardTitle>
            <CardDescription>
              Opening + Purchased - Consumed = Closing Stock
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="invCode"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Inv Code
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="name"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Name
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="unit"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Unit
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="openingStock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Opening Stock
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="purchasedQuantity"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Purchased
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="consumedQuantity"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Consumed
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="closingStock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Closing Stock
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="group"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden md:table-cell"
                    >
                      Group
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="lastRestocked"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden lg:table-cell"
                    >
                      Last Updated
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item: any) => {
                    const stockInfo = getStockBadge(item);
                    const openingStock = parseFloat(
                      item.openingStock || item.currentStock || 0,
                    );
                    const purchasedQuantity = parseFloat(
                      item.purchasedQuantity || 0,
                    );
                    const consumedQuantity = parseFloat(
                      item.consumedQuantity || 0,
                    );
                    const closingStock = parseFloat(
                      item.closingStock || item.currentStock || 0,
                    );

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {item.invCode || item.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.supplier || "No supplier"}
                              </div>
                              {/* Real-time Stock Information */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-medium text-blue-600">
                                    Current: {closingStock.toFixed(2)}{" "}
                                    {item.unit || "pcs"}
                                  </span>
                                  {closingStock <= parseFloat(item.minLevel || 0) && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs px-1 py-0"
                                    >
                                      LOW
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Last Cost:{" "}
                                  {formatCurrency(
                                    parseFloat(
                                      item.lastPurchaseCost ||
                                        item.costPerUnit ||
                                        0,
                                    ),
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Avg Cost:{" "}
                                  {formatCurrency(
                                    parseFloat(
                                      item.averageCost || item.costPerUnit || 0,
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {item.unit || "pcs"}
                            </div>
                            {item.secondaryUnitId && (
                              <div className="text-xs text-muted-foreground">
                                Secondary unit available
                              </div>
                            )}
                            {/* Reorder Level Alert */}
                            <div className="mt-1">
                              <div className="text-xs text-muted-foreground">
                                Min: {parseFloat(item.minLevel || 0).toFixed(2)}
                              </div>
                              {closingStock <= parseFloat(item.minLevel || 0) && (
                                <div className="text-xs text-red-600 font-medium">
                                  ⚠️ Reorder needed
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-blue-600">
                            {openingStock.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            +{purchasedQuantity.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-red-600">
                            -{consumedQuantity.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div
                              className={`font-bold text-lg ${
                                closingStock <= 0
                                  ? "text-red-600"
                                  : closingStock <= parseFloat(item.minLevel || 0)
                                    ? "text-orange-600"
                                    : "text-green-600"
                              }`}
                            >
                              {closingStock.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {parseFloat(item.minLevel || 0).toFixed(2)}
                            </div>
                            <div className="text-xs font-medium text-gray-700">
                              Value:{" "}
                              {formatCurrency(
                                closingStock *
                                  parseFloat(
                                    item.averageCost || item.costPerUnit || 0,
                                  ),
                              )}
                            </div>
                            {closingStock <= parseFloat(item.minLevel || 0) && closingStock > 0 && (
                              <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Reorder:{" "}
                                {(parseFloat(item.minLevel || 0) * 2 - closingStock).toFixed(2)}{" "}
                                {item.unit}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getGroupBadge(
                            item.group || item.categoryName || "uncategorized",
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm space-y-1">
                            <div className="font-medium">
                              {item.lastRestocked
                                ? new Date(
                                    item.lastRestocked,
                                  ).toLocaleDateString()
                                : new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-blue-600">
                                Last:{" "}
                                {formatCurrency(
                                  parseFloat(
                                    item.lastPurchaseCost ||
                                      item.costPerUnit ||
                                      0,
                                  ),
                                )}
                              </div>
                              <div className="text-green-600">
                                Avg:{" "}
                                {formatCurrency(
                                  parseFloat(
                                    item.averageCost || item.costPerUnit || 0,
                                  ),
                                )}
                              </div>
                              <div className="text-gray-500">
                                per {item.unit || "unit"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={stockInfo.variant}
                            className="flex items-center gap-1"
                          >
                            {stockInfo.icon}
                            {stockInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setIsDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800 focus:outline-none"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete Stock Item"
                              itemName={item.name}
                              onConfirm={() => deleteMutation.mutate(item.id)}
                              isLoading={deleteMutation.isPending}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {paginatedItems.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No stock items found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Start by adding your first stock item"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Pagination Controls */}
          {paginationTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 py-4">
              <PaginationInfo
                currentPage={paginationCurrentPage}
                totalPages={paginationTotalPages}
                totalItems={paginationTotalItems}
              />
              <div className="flex items-center gap-4">
                <PageSizeSelector
                  pageSize={paginationPageSize}
                  onPageSizeChange={setPaginationPageSize}
                  options={[10, 25, 50, 100]}
                />
                <Pagination
                  currentPage={paginationCurrentPage}
                  totalPages={paginationTotalPages}
                  onPageChange={paginationGoToPage}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
