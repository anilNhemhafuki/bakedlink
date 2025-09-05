import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchBar from "@/components/search-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { useUnits } from "@/hooks/useUnits"; // Import useUnits
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

export default function Ingredients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { toast } = useToast();
  const { symbol } = useCurrency();

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/inventory"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Use the useUnits hook to fetch units
  const { units = [] } = useUnits();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
  });

  // Filter only active units for the dropdown
  // The useUnits hook now ensures units is always an array, so Array.isArray check is implicitly handled.
  const activeUnits = Array.isArray(units)
    ? units.filter((unit: any) => unit.isActive !== false) // show unless explicitly inactive
    : [];

  // Filter ingredients (items that can be used as ingredients)
  // Ensure items is an array before filtering to prevent runtime errors
  const ingredients = Array.isArray(items)
    ? items.filter(
        (item: any) =>
          item.name &&
          (item.group === "raw-materials" ||
            item.group === "ingredients" ||
            !item.group ||
            item.name.toLowerCase().includes("flour") ||
            item.name.toLowerCase().includes("sugar") ||
            item.name.toLowerCase().includes("butter") ||
            item.name.toLowerCase().includes("milk") ||
            item.name.toLowerCase().includes("egg") ||
            item.name.toLowerCase().includes("chocolate") ||
            item.name.toLowerCase().includes("vanilla") ||
            item.name.toLowerCase().includes("salt") ||
            item.name.toLowerCase().includes("baking")),
      )
    : [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating ingredient:", data);

      if (!data.name?.trim()) {
        throw new Error("Ingredient name is required");
      }
      if (!data.unitId && !data.unit) {
        throw new Error("Measuring unit is required");
      }
      if (
        isNaN(parseFloat(data.costPerUnit)) ||
        parseFloat(data.costPerUnit) < 0
      ) {
        throw new Error("Valid cost per unit is required");
      }
      if (
        isNaN(parseFloat(data.currentStock)) ||
        parseFloat(data.currentStock) < 0
      ) {
        throw new Error("Valid current stock is required");
      }

      // Set group to 'ingredients' for better categorization
      const ingredientData = {
        ...data,
        group: data.group || "ingredients",
        name: data.name.trim(),
        unit: data.unit || "pcs",
        defaultPrice: data.defaultPrice || data.costPerUnit,
        openingQuantity: data.openingQuantity || data.currentStock,
        openingRate: data.openingRate || data.costPerUnit,
        openingValue:
          parseFloat(data.currentStock || "0") *
          parseFloat(data.costPerUnit || "0"),
        supplier: data.supplier?.trim() || null,
        company: data.company?.trim() || null,
        location: data.location?.trim() || null,
        notes: data.notes?.trim() || null,
        dateAdded: new Date().toISOString(),
        lastRestocked: new Date().toISOString(),
      };

      return apiRequest("POST", "/api/inventory", ingredientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Ingredient added successfully",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to add ingredient",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; values: any }) => {
      console.log("Updating ingredient:", data);
      return apiRequest("PUT", `/api/inventory/${data.id}`, data.values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Ingredient updated successfully",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to update ingredient",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Success",
        description: "Ingredient deleted successfully",
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
        description: "Failed to delete ingredient",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const name = formData.get("name") as string;
    const unitId = formData.get("unitId") as string;
    const costPerUnit = formData.get("costPerUnit") as string;
    const currentStock = formData.get("currentStock") as string;

    // Client-side validation
    if (!name?.trim()) {
      toast({
        title: "Error",
        description: "Ingredient name is required",
        variant: "destructive",
      });
      return;
    }

    if (!unitId) {
      toast({
        title: "Error",
        description: "Measuring unit is required",
        variant: "destructive",
      });
      return;
    }

    // Get the selected unit details
    const selectedUnit = (units as any[]).find(
      (u: any) => u.id.toString() === unitId,
    );

    const data = {
      name: name.trim(),
      unitId: parseInt(unitId),
      unit: selectedUnit ? selectedUnit.abbreviation : "pcs",
      costPerUnit: parseFloat(costPerUnit || "0"),
      currentStock: parseFloat(currentStock || "0"),
      minLevel: parseFloat((formData.get("minLevel") as string) || "0"),
      defaultPrice: parseFloat(
        (formData.get("defaultPrice") as string) || costPerUnit || "0",
      ),
      group: (formData.get("group") as string) || "ingredients",
      supplier: (formData.get("supplier") as string)?.trim() || null,
      company: (formData.get("company") as string)?.trim() || null,
      location: (formData.get("location") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, values: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredIngredients = ingredients.filter((ingredient: any) => {
    return (
      ingredient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ingredient.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ingredient.group?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredIngredients,
    "name",
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


  const getStockBadge = (item: any) => {
    const currentStock = parseFloat(item.currentStock || 0);
    const minLevel = parseFloat(item.minLevel || 0);

    if (currentStock <= minLevel) {
      return { variant: "destructive" as const, text: "Low Stock" };
    } else if (currentStock <= minLevel * 1.5) {
      return { variant: "secondary" as const, text: "Warning" };
    }
    return { variant: "default" as const, text: "In Stock" };
  };

  // Get unit name by ID
  const getUnitName = (unitId: number) => {
    // Ensure units is an array before calling find
    if (!Array.isArray(units) || !unitId) return "Unknown Unit";
    const unit = units.find((u: any) => u.id === unitId);
    return unit ? `${unit.name} (${unit.abbreviation})` : "Unknown Unit";
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
            Manage your baking ingredients and raw materials
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setShowAdditionalDetails(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingItem(null)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold">
                {editingItem ? "Edit Ingredient" : "Add New Ingredient"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the ingredient details below"
                  : "Add a new ingredient to your inventory for use in recipes"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {/* First Row - Ingredient Name and Measuring Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Ingredient Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., All Purpose Flour"
                    defaultValue={editingItem?.name || ""}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unitId" className="text-sm font-medium">
                    Measuring Unit <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    name="unitId"
                    defaultValue={editingItem?.unitId?.toString() || ""}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select unit of measurement" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUnits.length > 0 ? (
                        activeUnits.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name} (
                            {unit.abbreviation || unit.unit || "unit"})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No units available. Please add one in settings.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second Row - Current Stock and Cost */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currentStock" className="text-sm font-medium">
                    Current Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="currentStock"
                    name="currentStock"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    defaultValue={editingItem?.currentStock || ""}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="costPerUnit" className="text-sm font-medium">
                    Cost per Unit <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      id="costPerUnit"
                      name="costPerUnit"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      defaultValue={editingItem?.costPerUnit || ""}
                      required
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="minLevel" className="text-sm font-medium">
                    Minimum Level
                  </Label>
                  <Input
                    id="minLevel"
                    name="minLevel"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    defaultValue={editingItem?.minLevel || ""}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Third Row - Default Price and Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultPrice" className="text-sm font-medium">
                    Default Price
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      id="defaultPrice"
                      name="defaultPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      defaultValue={editingItem?.defaultPrice || ""}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="group" className="text-sm font-medium">
                    Category
                  </Label>
                  <Select
                    name="group"
                    defaultValue={editingItem?.group || "ingredients"}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select ingredient category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingredients">Ingredients</SelectItem>
                      <SelectItem value="raw-materials">
                        Raw Materials
                      </SelectItem>
                      <SelectItem value="flour">Flour & Grains</SelectItem>
                      <SelectItem value="dairy">Dairy Products</SelectItem>
                      <SelectItem value="sweeteners">Sweeteners</SelectItem>
                      <SelectItem value="spices">
                        Spices & Seasonings
                      </SelectItem>
                      <SelectItem value="leavening">
                        Leavening Agents
                      </SelectItem>
                      <SelectItem value="extracts">
                        Extracts & Flavoring
                      </SelectItem>
                      <SelectItem value="chocolate">
                        Chocolate & Cocoa
                      </SelectItem>
                      <SelectItem value="nuts">Nuts & Seeds</SelectItem>
                      <SelectItem value="fruits">
                        Fruits & Dried Fruits
                      </SelectItem>
                      <SelectItem value="packaging">
                        Packaging Materials
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Details Toggle */}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setShowAdditionalDetails(!showAdditionalDetails)
                  }
                  className="text-blue-600 p-0 h-auto font-normal"
                >
                  Additional Details{" "}
                  <ChevronDown
                    className={`h-4 w-4 ml-1 transition-transform ${
                      showAdditionalDetails ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>

              {/* Additional Details Section */}
              {showAdditionalDetails && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier" className="text-sm font-medium">
                        Supplier
                      </Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        placeholder="Supplier name"
                        defaultValue={editingItem?.supplier || ""}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-sm font-medium">
                        Brand/Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="Brand or company name"
                        defaultValue={editingItem?.company || ""}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location" className="text-sm font-medium">
                        Storage Location
                      </Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="Storage location"
                        defaultValue={editingItem?.location || ""}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Input
                        id="notes"
                        name="notes"
                        placeholder="Additional notes"
                        defaultValue={editingItem?.notes || ""}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
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
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingItem
                      ? "Update Ingredient"
                      : "Add Ingredient"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Ingredients Inventory</CardTitle>
            <div className="w-full sm:w-64">
              <SearchBar
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
            </div>
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
                      sortKey="name"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Ingredient
                    </SortableTableHeader>
                    <TableHead>Unit</TableHead>
                    <SortableTableHeader
                      sortKey="currentStock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Current Stock
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="minLevel"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Min Level
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="costPerUnit"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Cost/Unit
                    </SortableTableHeader>
                    <TableHead className="hidden md:table-cell">
                      Category
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Supplier
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item: any) => {
                      const stockInfo = getStockBadge(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.company || "No brand"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {getUnitName(item.unitId)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {parseFloat(item.currentStock || 0).toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {parseFloat(item.minLevel || 0).toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {symbol}
                              {parseFloat(item.costPerUnit || 0).toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {item.group ? (
                              <Badge variant="outline" className="capitalize">
                                {item.group.replace("-", " ")}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-sm">
                              {item.supplier || "No supplier"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockInfo.variant}>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(item.id)}
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:text-red-800 focus:outline-none"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Package className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            No ingredients found
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {searchQuery
                              ? "Try adjusting your search criteria"
                              : "Start by adding your first ingredient"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredIngredients.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
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
        </CardContent>
      </Card>
    </div>
  );
}