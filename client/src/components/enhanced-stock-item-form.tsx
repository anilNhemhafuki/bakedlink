import { useState, useEffect } from "react";
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
import { ChevronDown, Plus, AlertCircle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export function EnhancedStockItemForm({
  isOpen,
  onClose,
  editingItem,
}: StockItemFormProps) {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    primaryUnitId: "",
    secondaryUnitId: "",
    conversionRate: "",
    costPerUnit: "",
    group: "",
    minLevel: "",
    openingStock: "",
    purchasedQuantity: "",
    consumedQuantity: "",
    closingStock: "",
    supplier: "",
    notes: "",
    invCode: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useUnits();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
    queryFn: () => apiRequest("GET", "/api/inventory-categories"),
  });

  // Fetch ingredients from recipes and inventory
  const { data: ingredients = [] } = useQuery({
    queryKey: ["/api/ingredients/all"],
    queryFn: () => apiRequest("GET", "/api/ingredients"),
  });

  // Filter active units
  const activeUnits = Array.isArray(units)
    ? units.filter((unit: any) => unit && unit.isActive)
    : [];

  useEffect(() => {
    if (editingItem) {
      // Determine group value from editingItem
      let groupValue = "";
      if (editingItem.categoryId) {
        groupValue = editingItem.categoryId.toString();
      } else if (editingItem.isIngredient) {
        groupValue = "ingredients";
      } else if (editingItem.group && editingItem.group !== "uncategorized") {
        groupValue = editingItem.group;
      }

      setFormData({
        name: editingItem.name || "",
        primaryUnitId: editingItem.unitId?.toString() || "",
        secondaryUnitId: editingItem.secondaryUnitId?.toString() || "",
        conversionRate: editingItem.conversionRate || "",
        costPerUnit: editingItem.costPerUnit || "",
        group: groupValue,
        minLevel: editingItem.minLevel || "",
        openingStock: editingItem.openingStock || editingItem.currentStock || "",
        purchasedQuantity: editingItem.purchasedQuantity || "0",
        consumedQuantity: editingItem.consumedQuantity || "0",
        closingStock: editingItem.closingStock || editingItem.currentStock || "",
        supplier: editingItem.supplier || "",
        notes: editingItem.notes || "",
        invCode: editingItem.invCode || editingItem.id?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
        primaryUnitId: "",
        secondaryUnitId: "",
        conversionRate: "",
        costPerUnit: "",
        group: "",
        minLevel: "",
        openingStock: "",
        purchasedQuantity: "0",
        consumedQuantity: "0",
        closingStock: "",
        supplier: "",
        notes: "",
        invCode: "",
      });
    }
  }, [editingItem, isOpen]);

  // Auto-calculate closing stock
  useEffect(() => {
    const opening = parseFloat(formData.openingStock) || 0;
    const purchased = parseFloat(formData.purchasedQuantity) || 0;
    const consumed = parseFloat(formData.consumedQuantity) || 0;
    const closing = opening + purchased - consumed;

    setFormData(prev => ({
      ...prev,
      closingStock: closing.toString()
    }));
  }, [formData.openingStock, formData.purchasedQuantity, formData.consumedQuantity]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
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
  };

  const getConversionInfoText = () => {
    if (!formData.primaryUnitId) {
      return "Select a Primary Unit";
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

    const rate = formData.conversionRate?.trim();
    if (!rate) {
      return "Enter a conversion rate";
    }

    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      return "Enter a valid positive number";
    }

    return `1 ${primaryUnit.name} = ${numRate} ${secondaryUnit.name}`;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Item name is required";
    }

    if (!formData.primaryUnitId) {
      errors.primaryUnitId = "Primary unit is required";
    }

    if (!formData.costPerUnit || parseFloat(formData.costPerUnit) <= 0) {
      errors.costPerUnit = "Valid cost per unit is required";
    }

    if (!formData.minLevel || parseFloat(formData.minLevel) < 0) {
      errors.minLevel = "Minimum level must be 0 or greater";
    }

    if (!formData.openingStock || parseFloat(formData.openingStock) < 0) {
      errors.openingStock = "Valid opening stock is required";
    }

    if (formData.secondaryUnitId && (!formData.conversionRate || parseFloat(formData.conversionRate) <= 0)) {
      errors.conversionRate = "Valid conversion rate is required when secondary unit is selected";
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

    const submitData = {
      name: formData.name.trim(),
      invCode: formData.invCode.trim() || `INV-${Date.now()}`,
      currentStock: parseFloat(formData.closingStock),
      openingStock: parseFloat(formData.openingStock),
      purchasedQuantity: parseFloat(formData.purchasedQuantity) || 0,
      consumedQuantity: parseFloat(formData.consumedQuantity) || 0,
      closingStock: parseFloat(formData.closingStock),
      minLevel: parseFloat(formData.minLevel),
      unit: selectedPrimaryUnit?.abbreviation || "pcs",
      unitId: parseInt(formData.primaryUnitId),
      secondaryUnitId: formData.secondaryUnitId ? parseInt(formData.secondaryUnitId) : null,
      conversionRate: formData.secondaryUnitId ? parseFloat(formData.conversionRate) : null,
      costPerUnit: parseFloat(formData.costPerUnit),
      supplier: formData.supplier.trim() || null,
      group: formData.group || null,
      categoryId: (formData.group && !isNaN(parseInt(formData.group))) ? parseInt(formData.group) : null,
      notes: formData.notes.trim() || null,
      lastRestocked: new Date().toISOString(),
      isIngredient: formData.group === "ingredients",
    };

    saveMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const handleCategoryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
  };

  // Auto-generate inventory code if not provided
  const generateInvCode = () => {
    const code = `INV-${Date.now().toString().slice(-6)}`;
    handleInputChange("invCode", code);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingItem ? "Edit Stock Item" : "Create Stock Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inventory Code and Item Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invCode" className="text-sm font-medium">
                      Inventory Code <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="invCode"
                        value={formData.invCode}
                        onChange={(e) => handleInputChange("invCode", e.target.value)}
                        placeholder="INV-001"
                        className={validationErrors.invCode ? "border-red-500" : ""}
                      />
                      <Button type="button" variant="outline" onClick={generateInvCode}>
                        Generate
                      </Button>
                    </div>
                    {validationErrors.invCode && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.invCode}</p>
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
                      placeholder="Enter unique name (e.g., Flour)"
                      className={validationErrors.name ? "border-red-500" : ""}
                      required
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                </div>

                {/* Primary Unit and Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryUnit" className="text-sm font-medium">
                      Primary Unit <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.primaryUnitId || ""}
                      onValueChange={(value) => {
                        try {
                          if (value && value !== "none") {
                            handleInputChange("primaryUnitId", value);
                          }
                        } catch (error) {
                          console.error('Error updating primary unit:', error);
                        }
                      }}
                      required
                    >
                      <SelectTrigger className={validationErrors.primaryUnitId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select Primary Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading units...
                          </SelectItem>
                        ) : unitsError ? (
                          <SelectItem value="error" disabled>
                            Error loading units
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
                    {validationErrors.primaryUnitId && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.primaryUnitId}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="group" className="text-sm font-medium">
                      Group/Category <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.group}
                        onValueChange={(value) => handleInputChange("group", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent>
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
                </div>

                {/* Secondary Unit and Conversion */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="secondaryUnit" className="text-sm font-medium">
                      Secondary Unit
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

                  {formData.secondaryUnitId && (
                    <div>
                      <Label htmlFor="conversionRate" className="text-sm font-medium">
                        Conversion Rate <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="conversionRate"
                        type="number"
                        step="0.000001"
                        min="0.000001"
                        value={formData.conversionRate}
                        onChange={(e) => handleInputChange("conversionRate", e.target.value)}
                        placeholder="e.g., 50"
                        className={validationErrors.conversionRate ? "border-red-500" : ""}
                        required
                      />
                      {validationErrors.conversionRate && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.conversionRate}</p>
                      )}
                    </div>
                  )}

                  {formData.secondaryUnitId && (
                    <div>
                      <Label className="text-sm font-medium">Conversion Info</Label>
                      <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-700 min-h-[40px] flex items-center">
                        {getConversionInfoText()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost Per Unit and Minimum Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costPerUnit" className="text-sm font-medium">
                      Cost Per Unit <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="costPerUnit"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.costPerUnit}
                        onChange={(e) => handleInputChange("costPerUnit", e.target.value)}
                        placeholder="0.00"
                        className={`rounded-l-none ${validationErrors.costPerUnit ? "border-red-500" : ""}`}
                        required
                      />
                    </div>
                    {validationErrors.costPerUnit && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.costPerUnit}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="minLevel" className="text-sm font-medium">
                      Minimum Level <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="minLevel"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minLevel}
                      onChange={(e) => handleInputChange("minLevel", e.target.value)}
                      placeholder="0.00"
                      className={validationErrors.minLevel ? "border-red-500" : ""}
                      required
                    />
                    {validationErrors.minLevel && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.minLevel}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Management Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="openingStock" className="text-sm font-medium">
                      Opening Stock <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="openingStock"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.openingStock}
                      onChange={(e) => handleInputChange("openingStock", e.target.value)}
                      placeholder="0.00"
                      className={validationErrors.openingStock ? "border-red-500" : ""}
                      required
                    />
                    {validationErrors.openingStock && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.openingStock}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="purchasedQuantity" className="text-sm font-medium">
                      Purchased
                    </Label>
                    <Input
                      id="purchasedQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchasedQuantity}
                      onChange={(e) => handleInputChange("purchasedQuantity", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="consumedQuantity" className="text-sm font-medium">
                      Consumed/Used
                    </Label>
                    <Input
                      id="consumedQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.consumedQuantity}
                      onChange={(e) => handleInputChange("consumedQuantity", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="closingStock" className="text-sm font-medium">
                      Closing Stock
                    </Label>
                    <Input
                      id="closingStock"
                      value={parseFloat(formData.closingStock || "0").toFixed(2)}
                      placeholder="0.00"
                      className="bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>

                {/* Stock Calculation Display */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Stock Calculation</h4>
                  <div className="text-sm text-blue-800">
                    <p>Opening Stock: {parseFloat(formData.openingStock || "0").toFixed(2)}</p>
                    <p>+ Purchased: {parseFloat(formData.purchasedQuantity || "0").toFixed(2)}</p>
                    <p>- Consumed: {parseFloat(formData.consumedQuantity || "0").toFixed(2)}</p>
                    <hr className="my-2 border-blue-200" />
                    <p className="font-medium">= Closing Stock: {parseFloat(formData.closingStock || "0").toFixed(2)}</p>
                  </div>
                </div>

                {/* Warning for minimum level */}
                {parseFloat(formData.closingStock || "0") <= parseFloat(formData.minLevel || "0") &&
                 parseFloat(formData.closingStock || "0") > 0 && (
                  <Alert className="mt-4 border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Warning: Closing stock is at or below minimum level
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Collapsible
              open={showAdditionalDetails}
              onOpenChange={setShowAdditionalDetails}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-normal text-blue-600 hover:text-blue-700"
                >
                  Additional Details
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
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
                      <Label htmlFor="notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        placeholder="Additional notes"
                      />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 hover:bg-green-600 text-white min-w-[120px]"
              >
                {isSubmitting ? "Saving..." : "Save Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        isOpen={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </>
  );
}