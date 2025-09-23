
import { useState, useEffect, Suspense, startTransition } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUnits } from "@/hooks/useUnits";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, AlertCircle, Package, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface StockItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
}

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: () => void;
}

interface UnitConversion {
  primaryUnitId: number;
  secondaryUnitId: number;
  conversionFactor: number;
  primaryQuantity: number;
  secondaryQuantity: number;
}

function CategoryDialog({
  isOpen,
  onClose,
  onCategoryCreated,
}: CategoryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiRequest("POST", "/api/inventory-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/inventory-categories"],
      });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      onCategoryCreated();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    createCategoryMutation.mutate({
      name: name.trim(),
      description: description.trim(),
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="categoryName">Category Name *</Label>
            <Input
              id="categoryName"
              name="name"
              placeholder="Enter category name"
              required
            />
          </div>
          <div>
            <Label htmlFor="categoryDescription">Description</Label>
            <Input
              id="categoryDescription"
              name="description"
              placeholder="Enter description (optional)"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockFormContent({
  isOpen,
  onClose,
  editingItem,
}: StockItemFormProps) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [unitConversion, setUnitConversion] = useState<UnitConversion>({
    primaryUnitId: 0,
    secondaryUnitId: 0,
    conversionFactor: 1,
    primaryQuantity: 0,
    secondaryQuantity: 0,
  });

  const [formData, setFormData] = useState({
    name: "",
    inventoryId: "",
    primaryUnitId: "",
    secondaryUnitId: "",
    conversionFactor: "1",
    currentStock: "",
    reorderLevel: "",
    openingStock: "",
    openingCostPerUnit: "",
    lastStock: "",
    lastCostPerUnit: "",
    averageCost: "",
    totalValue: "",
    supplier: "",
    location: "",
    category: "",
    brand: "",
    description: "",
    batchNumber: "",
    expiryDate: "",
    invoiceNumber: "",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch units with error handling
  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useUnits();

  // Fetch categories with error handling
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/inventory-categories"],
    queryFn: () => apiRequest("GET", "/api/inventory-categories"),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  // Filter active units safely
  const activeUnits = Array.isArray(units)
    ? units.filter((unit: any) => unit && unit.isActive)
    : [];

  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        if (editingItem) {
          setFormData({
            name: editingItem.itemName || "",
            inventoryId: editingItem.inventoryId || "",
            primaryUnitId: editingItem.primaryUnitId?.toString() || "",
            secondaryUnitId: editingItem.secondaryUnitId?.toString() || "",
            conversionFactor: editingItem.conversionFactor?.toString() || "1",
            currentStock: editingItem.currentStock?.toString() || "",
            reorderLevel: editingItem.reorderLevel?.toString() || "",
            openingStock: editingItem.openingStock?.toString() || "",
            openingCostPerUnit: editingItem.openingCostPerUnit?.toString() || "",
            lastStock: editingItem.lastStock?.toString() || "",
            lastCostPerUnit: editingItem.lastCostPerUnit?.toString() || "",
            averageCost: editingItem.averageCost?.toString() || "",
            totalValue: editingItem.totalValue?.toString() || "",
            supplier: editingItem.supplier || "",
            location: editingItem.location || "",
            category: editingItem.category || "",
            brand: editingItem.brand || "",
            description: editingItem.description || "",
            batchNumber: editingItem.batchNumber || "",
            expiryDate: editingItem.expiryDate || "",
            invoiceNumber: editingItem.invoiceNumber || "",
            notes: editingItem.notes || "",
          });
        } else {
          setFormData({
            name: "",
            inventoryId: generateInventoryId(),
            primaryUnitId: "",
            secondaryUnitId: "",
            conversionFactor: "1",
            currentStock: "",
            reorderLevel: "",
            openingStock: "",
            openingCostPerUnit: "",
            lastStock: "",
            lastCostPerUnit: "",
            averageCost: "",
            totalValue: "",
            supplier: "",
            location: "",
            category: "",
            brand: "",
            description: "",
            batchNumber: "",
            expiryDate: "",
            invoiceNumber: "",
            notes: "",
          });
        }
      });
    }
  }, [editingItem, isOpen]);

  const generateInventoryId = () => {
    return `INV-${Date.now().toString().slice(-6)}`;
  };

  // Unit conversion calculations
  useEffect(() => {
    const primaryId = parseInt(formData.primaryUnitId);
    const secondaryId = parseInt(formData.secondaryUnitId);
    const factor = parseFloat(formData.conversionFactor) || 1;

    if (primaryId && secondaryId && primaryId !== secondaryId) {
      setUnitConversion({
        primaryUnitId: primaryId,
        secondaryUnitId: secondaryId,
        conversionFactor: factor,
        primaryQuantity: parseFloat(formData.currentStock) || 0,
        secondaryQuantity: (parseFloat(formData.currentStock) || 0) / factor,
      });
    }
  }, [formData.primaryUnitId, formData.secondaryUnitId, formData.conversionFactor, formData.currentStock]);

  // Auto-calculate total value
  useEffect(() => {
    const stock = parseFloat(formData.currentStock) || 0;
    const cost = parseFloat(formData.averageCost) || parseFloat(formData.openingCostPerUnit) || 0;
    const totalValue = stock * cost;
    
    setFormData(prev => ({
      ...prev,
      totalValue: totalValue.toString()
    }));
  }, [formData.currentStock, formData.averageCost, formData.openingCostPerUnit]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingItem
        ? `/api/stock-management/items/${editingItem.id}`
        : "/api/stock-management/items";
      const method = editingItem ? "PUT" : "POST";
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      toast({
        title: "Success",
        description: `Stock item ${editingItem ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = `Failed to ${editingItem ? "update" : "create"} stock item`;

      if (error.message?.includes("Item with this name already exists")) {
        setValidationErrors({ name: "Item with this name already exists. Please use a different name." });
        errorMessage = "Item name already exists";
      } else if (error.message?.includes("duplicate")) {
        setValidationErrors({ name: "This item name is already in use. Please choose a different name." });
        errorMessage = "Duplicate item name";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    startTransition(() => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    });
  };

  const getConversionInfoText = () => {
    if (!formData.primaryUnitId) {
      return "Select Primary Unit";
    }

    if (!formData.secondaryUnitId) {
      return "No Secondary Unit Selected";
    }

    if (formData.primaryUnitId === formData.secondaryUnitId) {
      return "Units must be different";
    }

    const primaryUnit = activeUnits.find((u: any) => u.id.toString() === formData.primaryUnitId);
    const secondaryUnit = activeUnits.find((u: any) => u.id.toString() === formData.secondaryUnitId);

    if (!primaryUnit || !secondaryUnit) {
      return "Invalid unit selection";
    }

    const rate = formData.conversionFactor?.trim();
    if (!rate || parseFloat(rate) <= 0) {
      return "Enter valid conversion factor";
    }

    return `1 ${primaryUnit.name} = ${rate} ${secondaryUnit.name}`;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Item name is required";
    }

    if (!formData.primaryUnitId) {
      errors.primaryUnitId = "Primary unit is required";
    }

    if (!formData.currentStock || parseFloat(formData.currentStock) < 0) {
      errors.currentStock = "Valid current stock is required";
    }

    if (!formData.reorderLevel || parseFloat(formData.reorderLevel) < 0) {
      errors.reorderLevel = "Reorder level must be 0 or greater";
    }

    if (formData.secondaryUnitId && (!formData.conversionFactor || parseFloat(formData.conversionFactor) <= 0)) {
      errors.conversionFactor = "Valid conversion factor is required when secondary unit is selected";
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      return;
    }

    const selectedPrimaryUnit = activeUnits.find(
      (u: any) => u.id.toString() === formData.primaryUnitId,
    );

    const selectedSecondaryUnit = formData.secondaryUnitId ? activeUnits.find(
      (u: any) => u.id.toString() === formData.secondaryUnitId,
    ) : null;

    const submitData = {
      itemName: formData.name.trim(),
      inventoryId: formData.inventoryId.trim() || generateInventoryId(),
      description: formData.description.trim() || null,
      category: formData.category || null,
      brand: formData.brand.trim() || null,
      primaryUnit: selectedPrimaryUnit?.abbreviation || "pcs",
      primaryUnitId: parseInt(formData.primaryUnitId),
      secondaryUnit: selectedSecondaryUnit?.abbreviation || null,
      secondaryUnitId: formData.secondaryUnitId ? parseInt(formData.secondaryUnitId) : null,
      conversionFactor: formData.secondaryUnitId ? parseFloat(formData.conversionFactor) : null,
      currentStock: parseFloat(formData.currentStock),
      secondaryStock: unitConversion.secondaryQuantity || null,
      reorderLevel: parseFloat(formData.reorderLevel),
      openingStock: parseFloat(formData.openingStock) || parseFloat(formData.currentStock),
      openingCostPerUnit: parseFloat(formData.openingCostPerUnit) || 0,
      lastStock: parseFloat(formData.lastStock) || null,
      lastCostPerUnit: parseFloat(formData.lastCostPerUnit) || null,
      averageCost: parseFloat(formData.averageCost) || parseFloat(formData.openingCostPerUnit) || 0,
      totalValue: parseFloat(formData.totalValue) || 0,
      supplier: formData.supplier.trim() || null,
      location: formData.location.trim() || null,
      batchNumber: formData.batchNumber.trim() || null,
      expiryDate: formData.expiryDate || null,
      invoiceNumber: formData.invoiceNumber.trim() || null,
      notes: formData.notes.trim() || null,
      isActive: true,
      isDayClosed: false,
    };

    saveMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const handleCategoryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
  };

  if (unitsLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading form data...</span>
      </div>
    );
  }

  if (unitsError) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load units. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inventoryId" className="text-sm font-medium">
                  Inventory ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inventoryId"
                  value={formData.inventoryId}
                  onChange={(e) => handleInputChange("inventoryId", e.target.value)}
                  placeholder="INV-001"
                  className={validationErrors.inventoryId ? "border-red-500" : ""}
                />
                {validationErrors.inventoryId && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.inventoryId}</p>
                )}
              </div>

              <div>
                <Label htmlFor="itemName" className="text-sm font-medium">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="itemName"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter item name"
                  className={validationErrors.name ? "border-red-500" : ""}
                  required
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw-materials">Raw Materials</SelectItem>
                      <SelectItem value="ingredients">Ingredients</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      {Array.isArray(categories) && categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCategoryDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="brand" className="text-sm font-medium">
                  Brand
                </Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  placeholder="Enter brand name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Unit Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Unit Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryUnit" className="text-sm font-medium">
                  Primary Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.primaryUnitId}
                  onValueChange={(value) => handleInputChange("primaryUnitId", value)}
                  required
                >
                  <SelectTrigger className={validationErrors.primaryUnitId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select Primary Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUnits.length > 0 ? (
                      activeUnits.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
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
                {validationErrors.primaryUnitId && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.primaryUnitId}</p>
                )}
              </div>

              <div>
                <Label htmlFor="secondaryUnit" className="text-sm font-medium">
                  Secondary Unit (Optional)
                </Label>
                <Select
                  value={formData.secondaryUnitId || "none"}
                  onValueChange={(value) =>
                    handleInputChange("secondaryUnitId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Secondary Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Secondary Unit</SelectItem>
                    {activeUnits
                      .filter((unit: any) => unit.id.toString() !== formData.primaryUnitId)
                      .map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.secondaryUnitId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversionFactor" className="text-sm font-medium">
                    Conversion Factor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conversionFactor"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    value={formData.conversionFactor}
                    onChange={(e) => handleInputChange("conversionFactor", e.target.value)}
                    placeholder="e.g., 50 (for 1 bag = 50 kg)"
                    className={validationErrors.conversionFactor ? "border-red-500" : ""}
                    required
                  />
                  {validationErrors.conversionFactor && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.conversionFactor}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Conversion Preview</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded border text-sm text-blue-700 min-h-[40px] flex items-center">
                    {getConversionInfoText()}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentStock" className="text-sm font-medium">
                  Current Stock <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => handleInputChange("currentStock", e.target.value)}
                  placeholder="0.00"
                  className={validationErrors.currentStock ? "border-red-500" : ""}
                  required
                />
                {validationErrors.currentStock && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.currentStock}</p>
                )}
              </div>

              <div>
                <Label htmlFor="reorderLevel" className="text-sm font-medium">
                  Reorder Level <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => handleInputChange("reorderLevel", e.target.value)}
                  placeholder="0.00"
                  className={validationErrors.reorderLevel ? "border-red-500" : ""}
                  required
                />
                {validationErrors.reorderLevel && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.reorderLevel}</p>
                )}
              </div>

              {unitConversion.secondaryUnitId && (
                <div>
                  <Label className="text-sm font-medium">Secondary Stock</Label>
                  <Input
                    value={unitConversion.secondaryQuantity.toFixed(2)}
                    readOnly
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="openingCostPerUnit" className="text-sm font-medium">
                  Opening Cost per Unit
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {symbol}
                  </span>
                  <Input
                    id="openingCostPerUnit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.openingCostPerUnit}
                    onChange={(e) => handleInputChange("openingCostPerUnit", e.target.value)}
                    placeholder="0.00"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="averageCost" className="text-sm font-medium">
                  Average Cost per Unit
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {symbol}
                  </span>
                  <Input
                    id="averageCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.averageCost}
                    onChange={(e) => handleInputChange("averageCost", e.target.value)}
                    placeholder="0.00"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastCostPerUnit" className="text-sm font-medium">
                  Last Cost per Unit
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {symbol}
                  </span>
                  <Input
                    id="lastCostPerUnit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.lastCostPerUnit}
                    onChange={(e) => handleInputChange("lastCostPerUnit", e.target.value)}
                    placeholder="0.00"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="totalValue" className="text-sm font-medium">
                  Total Stock Value
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {symbol}
                  </span>
                  <Input
                    id="totalValue"
                    type="number"
                    value={formData.totalValue}
                    readOnly
                    className="rounded-l-none bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Auto-calculated: Stock × Average Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Collapsible open={showAdditionalDetails} onOpenChange={setShowAdditionalDetails}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-gray-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Additional Details
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier" className="text-sm font-medium">
                      Supplier
                    </Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => handleInputChange("supplier", e.target.value)}
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">
                      Storage Location
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="Enter storage location"
                    />
                  </div>

                  <div>
                    <Label htmlFor="batchNumber" className="text-sm font-medium">
                      Batch Number
                    </Label>
                    <Input
                      id="batchNumber"
                      value={formData.batchNumber}
                      onChange={(e) => handleInputChange("batchNumber", e.target.value)}
                      placeholder="Enter batch number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate" className="text-sm font-medium">
                      Expiry Date
                    </Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="invoiceNumber" className="text-sm font-medium">
                      Last Invoice Number
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Enter any additional notes"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saveMutation.isPending ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
          </Button>
        </div>
      </form>

      <CategoryDialog
        isOpen={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </>
  );
}

export default function EnhancedStockItemForm(props: StockItemFormProps) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading form...</span>
      </div>
    }>
      <StockFormContent {...props} />
    </Suspense>
  );
}
