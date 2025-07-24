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
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function Stock() {
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

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Filter only active units for the dropdown
  const activeUnits = (units as any[]).filter((unit: any) => unit.isActive);

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

      // Prepare stock data for API
      const stockData = {
        name: data.name.trim(),
        unitId: data.unitId,
        unit: data.unit || "pcs",
        defaultPrice: data.defaultPrice,
        group: data.group?.trim() || null,
        currentStock: data.currentStock,
        minLevel: data.minLevel || 0,
        costPerUnit: data.costPerUnit,
        openingQuantity: data.openingQuantity || data.currentStock,
        openingRate: data.openingRate || data.costPerUnit,
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
      toast({
        title: "Error",
        description: error.message || "Failed to save stock item",
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const name = formData.get("name") as string;
    const unitId = formData.get("unitId") as string;
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

    const secondaryUnitId = formData.get("secondaryUnitId") as string;
    const conversionRate = formData.get("conversionRate") as string;

    const data = {
      name: name.trim(),
      unitId: parseInt(unitId),
      unit: selectedUnit ? selectedUnit.abbreviation : "pcs", // Fallback unit
      secondaryUnitId: secondaryUnitId ? parseInt(secondaryUnitId) : null,
      conversionRate: parseFloat(conversionRate || "1"),
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
  };

  const filteredItems = (items as any[]).filter(
    (item: any) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.group?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    const unit = (units as any[]).find((u: any) => u.id === unitId);
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
            Track your ingredients and raw materials
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
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold">
                {editingItem ? "Edit Stock Item" : "Create Stock Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {/* First Row - Item Name and Measuring Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Item Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter name of Stock"
                    defaultValue={editingItem?.name || ""}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unitId" className="text-sm font-medium">
                    Primary Unit <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      name="unitId"
                      defaultValue={editingItem?.unitId?.toString() || ""}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Primary Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeUnits.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Secondary Unit Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="secondaryUnitId" className="text-sm font-medium">
                    Secondary Unit
                  </Label>
                  <Select
                    name="secondaryUnitId"
                    defaultValue={editingItem?.secondaryUnitId?.toString() || ""}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Secondary Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Secondary Unit</SelectItem>
                      {activeUnits.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="conversionRate" className="text-sm font-medium">
                    Conversion Rate
                  </Label>
                  <Input
                    id="conversionRate"
                    name="conversionRate"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="50 (1 secondary = 50 primary)"
                    defaultValue={editingItem?.conversionRate || "1"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Conversion Info
                  </Label>
                  <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    1 Secondary = X Primary units
                  </div>
                </div>
              </div>

              {/* Second Row - Default Price and Group */}
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
                    Group
                  </Label>
                  <Select name="group" defaultValue={editingItem?.group || ""}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Group for Item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw-materials">
                        Raw Materials
                      </SelectItem>
                      <SelectItem value="finished-goods">
                        Finished Goods
                      </SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                    placeholder="Minimum stock level"
                    defaultValue={editingItem?.minLevel || ""}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Opening Stock Section */}
              <div>
                <Label className="text-sm font-medium">Opening Stock</Label>
                <div className="grid grid-cols-3 gap-4 mt-2 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <Label
                      htmlFor="openingQuantity"
                      className="text-sm text-muted-foreground"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="openingQuantity"
                      name="openingQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="00.00"
                      defaultValue={
                        editingItem?.openingQuantity ||
                        editingItem?.currentStock ||
                        ""
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="openingRate"
                      className="text-sm text-muted-foreground"
                    >
                      Rate
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {symbol}
                      </span>
                      <Input
                        id="openingRate"
                        name="openingRate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        defaultValue={
                          editingItem?.openingRate ||
                          editingItem?.costPerUnit ||
                          ""
                        }
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Value
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {symbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        readOnly
                        className="pl-8 bg-gray-100"
                        value={(() => {
                          const qty = parseFloat(
                            (
                              document.querySelector(
                                '[name="openingQuantity"]',
                              ) as HTMLInputElement
                            )?.value || "0",
                          );
                          const rate = parseFloat(
                            (
                              document.querySelector(
                                '[name="openingRate"]',
                              ) as HTMLInputElement
                            )?.value || "0",
                          );
                          return (qty * rate).toFixed(2);
                        })()}
                      />
                    </div>
                  </div>
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
                    className={`h-4 w-4 ml-1 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}
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
                        Company
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="Company name"
                        defaultValue={editingItem?.company || ""}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location" className="text-sm font-medium">
                        Location
                      </Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="Storage location"
                        defaultValue={editingItem?.location || ""}
                        className="mt-1"
                      />
                    </div>
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
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="w-full sm:w-auto bg-red-400 hover:bg-red-500"
                >
                  Save Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Previous Qty</TableHead>
                    <TableHead>Previous Amt</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Group
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Date Added
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
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
                                {getUnitName(item.secondaryUnitId)} (1:{item.conversionRate || 1})
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {parseFloat(item.currentStock || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Min: {parseFloat(item.minLevel || 0).toFixed(2)}
                          </div>
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
                          {symbol}
                          {parseFloat(item.costPerUnit || 0).toFixed(2)}
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
                              ? `Updated: ${new Date(item.lastRestocked).toLocaleDateString()}`
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
              {filteredItems.length === 0 && (
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
        </CardContent>
      </Card>
    </div>
  );
}
