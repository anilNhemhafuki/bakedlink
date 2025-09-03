import { useState, useEffect, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { EnhancedStockItemForm } from "@/components/enhanced-stock-item-form";

export default function Stock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  // Unit conversion state management
  const [selectedPrimaryUnitId, setSelectedPrimaryUnitId] = useState<
    string | undefined
  >(undefined);
  const [selectedSecondaryUnitId, setSelectedSecondaryUnitId] = useState<
    string | undefined
  >(undefined);
  const [conversionRate, setConversionRate] = useState<string>("");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const { symbol } = useCurrency();

  const {
    data: inventoryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/inventory", currentPage, itemsPerPage, searchQuery],
    queryFn: () => apiRequest("GET", `/api/inventory?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`),
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const items = inventoryData?.items || [];
  const totalCount = inventoryData?.totalCount || 0;
  const totalPages = inventoryData?.totalPages || 0;

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/units");
        console.log("Units API response:", response);

        if (Array.isArray(response)) {
          return response;
        }
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        if (response?.results && Array.isArray(response.results)) {
          return response.results; // Common alternate key
        }

        console.warn("Unexpected units response format:", response);
        return [];
      } catch (error) {
        console.error("Failed to fetch units:", error);
        return []; // ✅ Fallback
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10,
  });

  // --- Fix 1: Ensure units is an array before filtering ---
  const activeUnits = Array.isArray(units)
    ? (units as any[]).filter((unit: any) => {
        return (
          unit &&
          typeof unit === "object" &&
          typeof unit.id !== "undefined" &&
          unit.id !== null &&
          unit.isActive === true &&
          unit.name &&
          typeof unit.name === "string" &&
          unit.abbreviation &&
          typeof unit.abbreviation === "string"
        );
      })
    : [];

  // Debug logging
  console.log("Units in stock.tsx:", units);
  console.log("Active units in stock.tsx:", activeUnits);

  // Add sorting functionality - items are already filtered on server
  const { sortedData, sortConfig, requestSort } = useTableSort(
    items,
    "name",
  );

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update query key to use debounced search
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
  }, [debouncedSearchQuery]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Unit selection state management
  useEffect(() => {
    if (isDialogOpen) {
      if (editingItem) {
        setSelectedPrimaryUnitId(editingItem?.unitId?.toString());
        setSelectedSecondaryUnitId(
          editingItem?.secondaryUnitId?.toString() || "none",
        );
        setConversionRate(editingItem?.conversionRate?.toString() || "1");
      } else {
        setSelectedPrimaryUnitId(undefined);
        setSelectedSecondaryUnitId(undefined);
        setConversionRate("1");
      }
    } else {
      setSelectedPrimaryUnitId(undefined);
      setSelectedSecondaryUnitId(undefined);
      setConversionRate("1");
    }
  }, [isDialogOpen, editingItem]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating stock item:", data);
      // Validate required fields before sending
      if (!data.name?.trim()) {
        throw new Error("Item name is required");
      }
      if (!data.unitId && !data.unit) {
        throw new Error("Measuring unit is required");
      }
      if (
        isNaN(parseFloat(data.defaultPrice)) ||
        parseFloat(data.defaultPrice) < 0
      ) {
        throw new Error("Valid default price is required");
      }
      if (
        isNaN(parseFloat(data.currentStock)) ||
        parseFloat(data.currentStock) < 0
      ) {
        throw new Error("Valid current stock is required");
      }
      if (
        isNaN(parseFloat(data.costPerUnit)) ||
        parseFloat(data.costPerUnit) < 0
      ) {
        throw new Error("Valid cost per unit is required");
      }
      // Calculate opening value
      const openingValue = data.currentStock * data.costPerUnit;
      // Prepare stock data for API including unit conversion
      const stockData = {
        name: data.name.trim(),
        unitId: parseInt(data.unitId),
        unit: data.unit || "pcs",
        secondaryUnitId:
          data.secondaryUnitId && data.secondaryUnitId !== "none"
            ? parseInt(data.secondaryUnitId)
            : null,
        conversionRate:
          data.secondaryUnitId && data.secondaryUnitId !== "none"
            ? parseFloat(data.conversionRate || "1")
            : null,
        defaultPrice: parseFloat(data.defaultPrice || "0"),
        group: data.group?.trim() || null,
        currentStock: parseFloat(data.currentStock),
        minLevel: parseFloat(data.minLevel || "0"),
        costPerUnit: parseFloat(data.costPerUnit),
        openingQuantity: parseFloat(data.openingQuantity || data.currentStock),
        openingRate: parseFloat(data.openingRate || data.costPerUnit),
        openingValue: openingValue,
        supplier: data.supplier?.trim() || null,
        company: data.company?.trim() || null,
        location: data.location?.trim() || null,
        notes: data.notes?.trim() || null,
        dateAdded: new Date().toISOString(),
        lastRestocked: new Date().toISOString(),
      };
      return apiRequest("POST", "/api/inventory", stockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Stock item saved successfully",
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
      
      let errorMessage = error.message || "Failed to save stock item";
      
      // Handle specific error cases
      if (error.message?.includes("Item with this name already exists")) {
        errorMessage = "❌ Item with this name already exists. Please use a different name.";
      } else if (error.message?.includes("duplicate") || error.message?.includes("unique constraint")) {
        errorMessage = "❌ An item with this name already exists. Please choose a different name.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; values: any }) => {
      console.log("Updating stock item:", data);
      const values = data.values;
      // Validate required fields before sending
      if (!values.name?.trim()) {
        throw new Error("Item name is required");
      }
      if (!values.unitId) {
        throw new Error("Measuring unit is required");
      }
      // Calculate opening value if opening fields are provided
      let openingValue = values.openingValue;
      if (values.openingQuantity && values.openingRate) {
        openingValue =
          parseFloat(values.openingQuantity) * parseFloat(values.openingRate);
      }
      const updateData = {
        name: values.name.trim(),
        unitId: parseInt(values.unitId),
        secondaryUnitId:
          values.secondaryUnitId && values.secondaryUnitId !== "none"
            ? parseInt(values.secondaryUnitId)
            : null,
        conversionRate:
          values.secondaryUnitId && values.secondaryUnitId !== "none"
            ? parseFloat(values.conversionRate || "1")
            : null,
        defaultPrice: parseFloat(values.defaultPrice || 0),
        group: values.group?.trim() || null,
        currentStock: parseFloat(
          values.currentStock || values.openingQuantity || 0,
        ),
        minLevel: parseFloat(values.minLevel || 0),
        costPerUnit: parseFloat(values.costPerUnit || values.openingRate || 0),
        openingQuantity: parseFloat(values.openingQuantity || 0),
        openingRate: parseFloat(values.openingRate || 0),
        openingValue: openingValue || 0,
        supplier: values.supplier?.trim() || null,
        company: values.company?.trim() || null,
        location: values.location?.trim() || null,
        notes: values.notes?.trim() || null,
        dateUpdated: new Date().toISOString(),
      };
      return apiRequest("PUT", `/api/inventory/${data.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Stock item updated successfully",
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
        description: error.message || "Failed to update stock item",
        variant: "destructive",
      });
    },
  });

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

  // Function to create unit conversion in database
  const createUnitConversion = async (
    fromUnitId: number,
    toUnitId: number,
    factor: number,
  ) => {
    try {
      await apiRequest("POST", "/api/unit-conversions", {
        fromUnitId: fromUnitId,
        toUnitId: toUnitId,
        conversionFactor: factor,
        isActive: true,
      });
    } catch (error) {
      console.warn("Failed to create unit conversion:", error);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    // --- Modified: Get unitId from state instead of formData ---
    const unitId = selectedPrimaryUnitId; // Use state variable
    // --- End of modification ---
    const defaultPrice = formData.get("defaultPrice") as string;
    const group = formData.get("group") as string;
    const openingQuantity = formData.get("openingQuantity") as string;
    const openingRate = formData.get("openingRate") as string;

    // Client-side validation
    if (!name?.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }
    // --- Modified: Check state variable instead of formData ---
    if (!unitId) {
      toast({
        title: "Error",
        description: "Measuring unit is required",
        variant: "destructive",
      });
      return;
    }
    // --- End of modification ---

    // Get the selected unit details (still okay to use units data here)
    const selectedUnit = (units as any[]).find(
      (u: any) => u.id.toString() === unitId, // unitId is still a string here
    );
    // --- Modified: Get secondaryUnitId from state instead of formData ---
    const secondaryUnitId = selectedSecondaryUnitId; // Use state variable
    // --- End of modification ---
    const conversionRate = formData.get("conversionRate") as string;

    // Prepare conversion data for database storage
    const hasSecondaryUnit = secondaryUnitId && secondaryUnitId !== "none";
    const finalConversionRate = hasSecondaryUnit
      ? parseFloat(conversionRate || "1")
      : null;

    const data = {
      name: name.trim(),
      unitId: parseInt(unitId), // Parse the string ID from state
      unit: selectedUnit ? selectedUnit.abbreviation : "pcs", // Fallback unit
      secondaryUnitId: hasSecondaryUnit ? parseInt(secondaryUnitId) : null,
      conversionRate: finalConversionRate,
      defaultPrice: parseFloat(defaultPrice || "0"),
      group: group,
      currentStock: parseFloat(openingQuantity || "0"),
      openingQuantity: parseFloat(openingQuantity || "0"),
      openingRate: parseFloat(openingRate || "0"),
      minLevel: parseFloat((formData.get("minLevel") as string) || "0"),
      costPerUnit: parseFloat(openingRate || "0"),
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

    // Create unit conversion relationship if secondary unit is selected
    if (hasSecondaryUnit && finalConversionRate && finalConversionRate > 0) {
      const primaryUnitIdNum = parseInt(unitId);
      const secondaryUnitIdNum = parseInt(secondaryUnitId);

      // Create bidirectional conversion
      createUnitConversion(
        secondaryUnitIdNum,
        primaryUnitIdNum,
        finalConversionRate,
      );
      createUnitConversion(
        primaryUnitIdNum,
        secondaryUnitIdNum,
        1 / finalConversionRate,
      );
    }
  };

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
    if (!unitId || !Array.isArray(activeUnits)) return "Unknown Unit";
    const unit = activeUnits.find((u: any) => u.id === unitId);
    return unit ? `${unit.name} (${unit.abbreviation})` : "Unknown Unit";
  };

  // --- Add function to generate dynamic conversion info text ---
  const getConversionInfoText = () => {
    // 🔒 Double guard: ensure activeUnits is an array
    if (!Array.isArray(activeUnits)) {
      console.warn("activeUnits is not an array:", activeUnits);
      return "Loading units...";
    }

    if (activeUnits.length === 0) {
      return "No units available";
    }

    // Safe helper to find unit by ID
    const findUnit = (id: string | undefined) => {
      if (!id || id === "none") return null;
      return (
        activeUnits.find((unit: any) => {
          // Ensure unit and unit.id exist
          return unit?.id?.toString() === id;
        }) || null
      );
    };

    // Case: No primary unit selected
    if (!selectedPrimaryUnitId) {
      return "Select a Primary Unit";
    }

    // Case: No secondary unit selected
    if (!selectedSecondaryUnitId || selectedSecondaryUnitId === "none") {
      return "No Secondary Unit Selected";
    }

    // Case: Same unit selected
    if (selectedPrimaryUnitId === selectedSecondaryUnitId) {
      return "Units must be different";
    }

    const primaryUnit = findUnit(selectedPrimaryUnitId);
    const secondaryUnit = findUnit(selectedSecondaryUnitId);

    if (!primaryUnit) {
      return "Primary unit not found";
    }
    if (!secondaryUnit) {
      return "Secondary unit not found";
    }

    // Validate conversion rate
    const rate = conversionRate?.trim();
    if (!rate) {
      return "Enter a conversion rate";
    }

    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      return "Enter a valid positive number";
    }

    // ✅ Final output
    return `1 ${primaryUnit.name} = ${numRate} ${secondaryUnit.name}`;
  };
  // --- End of getConversionInfoText ---

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
            Track your ingredients and raw materials
          </p>
        </div>
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

        <EnhancedStockItemForm
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingItem(null);
          }}
          editingItem={editingItem}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Stock Items</CardTitle>
            <div className="w-full sm:w-64">
              <SearchBar
                placeholder="Search items..."
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
                      Item
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="unitId"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Unit
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="currentStock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Stock
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
                    <SortableTableHeader
                      sortKey="previousQuantity"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Previous Qty
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="previousAmount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Previous Amt
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
                      sortKey="dateAdded"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden lg:table-cell"
                    >
                      Date Added
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="currentStock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item: any) => {
                    const stockInfo = getStockBadge(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.supplier || "No supplier"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {getUnitName(item.unitId)} (Primary)
                            </div>
                            {item.secondaryUnitId && (
                              <div className="text-xs text-muted-foreground">
                                {getUnitName(item.secondaryUnitId)} (1 ={" "}
                                {item.conversionRate || 1}{" "}
                                {getUnitName(item.unitId).split(" ")[0]})
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {parseFloat(item.currentStock || 0).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {parseFloat(item.minLevel || 0).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {symbol}
                          {parseFloat(item.costPerUnit || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.previousQuantity
                            ? parseFloat(item.previousQuantity).toLocaleString()
                            : "0"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {symbol}{" "}
                          {item.previousAmount
                            ? parseFloat(item.previousAmount).toLocaleString()
                            : "0"}
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
                            {item.dateAdded
                              ? new Date(item.dateAdded).toLocaleDateString()
                              : new Date(
                                  item.createdAt || item.lastRestocked,
                                ).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.lastRestocked
                              ? `Updated: ${new Date(
                                  item.lastRestocked,
                                ).toLocaleDateString()}`
                              : ""}
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
              {sortedData.length === 0 && (
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
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
                </p>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  className="ml-2 h-8 w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="px-2">...</span>}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
