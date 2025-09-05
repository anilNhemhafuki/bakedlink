
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
import { ChevronDown, Plus, AlertCircle } from "lucide-react";
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
    defaultPrice: "",
    group: "",
    minLevel: "",
    openingQuantity: "",
    openingRate: "",
    supplier: "",
    notes: "",
  });

  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: units = [], isLoading: unitsLoading } = useUnits();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
    queryFn: () => apiRequest("GET", "/api/inventory-categories"),
  });

  // Filter active units
  const activeUnits = Array.isArray(units)
    ? units.filter((unit: any) => unit && unit.isActive)
    : [];

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || "",
        primaryUnitId: editingItem.unitId?.toString() || "",
        secondaryUnitId: editingItem.secondaryUnitId?.toString() || "",
        conversionRate: editingItem.conversionRate || "",
        defaultPrice: editingItem.defaultPrice || editingItem.costPerUnit || "",
        group: editingItem.categoryId?.toString() || "",
        minLevel: editingItem.minLevel || "",
        openingQuantity: editingItem.currentStock || "",
        openingRate: editingItem.costPerUnit || "",
        supplier: editingItem.supplier || "",
        notes: editingItem.notes || "",
      });
    } else {
      setFormData({
        name: "",
        primaryUnitId: "",
        secondaryUnitId: "",
        conversionRate: "",
        defaultPrice: "",
        group: "",
        minLevel: "",
        openingQuantity: "",
        openingRate: "",
        supplier: "",
        notes: "",
      });
    }
  }, [editingItem, isOpen]);

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

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const calculateOpeningValue = () => {
    const quantity = parseFloat(formData.openingQuantity) || 0;
    const rate = parseFloat(formData.openingRate) || 0;
    return quantity * rate;
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

    if (!formData.defaultPrice || parseFloat(formData.defaultPrice) <= 0) {
      errors.defaultPrice = "Valid default price is required";
    }

    if (!formData.minLevel || parseFloat(formData.minLevel) < 0) {
      errors.minLevel = "Minimum level must be 0 or greater";
    }

    if (!formData.openingQuantity || parseFloat(formData.openingQuantity) < 0) {
      errors.openingQuantity = "Valid opening quantity is required";
    }

    if (!formData.openingRate || parseFloat(formData.openingRate) <= 0) {
      errors.openingRate = "Valid opening rate is required";
    }

    if (formData.secondaryUnitId && (!formData.conversionRate || parseFloat(formData.conversionRate) <= 0)) {
      errors.conversionRate = "Valid conversion rate is required when secondary unit is selected";
    }

    const minLevel = parseFloat(formData.minLevel);
    const currentStock = parseFloat(formData.openingQuantity);
    if (minLevel > currentStock && currentStock > 0) {
      errors.minLevel = "Warning: Minimum level exceeds current stock";
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
      currentStock: parseFloat(formData.openingQuantity),
      minLevel: parseFloat(formData.minLevel),
      unit: selectedPrimaryUnit?.abbreviation || "pcs",
      unitId: parseInt(formData.primaryUnitId),
      secondaryUnitId: formData.secondaryUnitId ? parseInt(formData.secondaryUnitId) : null,
      conversionRate: formData.secondaryUnitId ? parseFloat(formData.conversionRate) : null,
      costPerUnit: parseFloat(formData.openingRate),
      defaultPrice: parseFloat(formData.defaultPrice),
      supplier: formData.supplier.trim() || null,
      categoryId: formData.group ? parseInt(formData.group) : null,
      notes: formData.notes.trim() || null,
      lastRestocked: new Date(),
    };

    saveMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const handleCategoryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
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
                {/* Item Name and Primary Unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <Label htmlFor="primaryUnit" className="text-sm font-medium">
                      Primary Unit <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.primaryUnitId}
                      onValueChange={(value) => handleInputChange("primaryUnitId", value)}
                    >
                      <SelectTrigger className={validationErrors.primaryUnitId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select Primary Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading units...
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

                {/* Default Price, Group, Minimum Level */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="defaultPrice" className="text-sm font-medium">
                      Default Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="defaultPrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.defaultPrice}
                        onChange={(e) => handleInputChange("defaultPrice", e.target.value)}
                        placeholder="0.00"
                        className={`rounded-l-none ${validationErrors.defaultPrice ? "border-red-500" : ""}`}
                        required
                      />
                    </div>
                    {validationErrors.defaultPrice && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.defaultPrice}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="group" className="text-sm font-medium">
                      Group <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Select
                        value={formData.group}
                        onValueChange={(value) => handleInputChange("group", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent>
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

            {/* Opening Stock Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opening Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.openingQuantity}
                      onChange={(e) => handleInputChange("openingQuantity", e.target.value)}
                      placeholder="0.00"
                      className={validationErrors.openingQuantity ? "border-red-500" : ""}
                      required
                    />
                    {validationErrors.openingQuantity && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.openingQuantity}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rate" className="text-sm font-medium">
                      Rate <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.openingRate}
                        onChange={(e) => handleInputChange("openingRate", e.target.value)}
                        placeholder="0.00"
                        className={`rounded-l-none ${validationErrors.openingRate ? "border-red-500" : ""}`}
                        required
                      />
                    </div>
                    {validationErrors.openingRate && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.openingRate}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="value" className="text-sm font-medium">
                      Value
                    </Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="value"
                        value={calculateOpeningValue().toFixed(2)}
                        placeholder="0.00"
                        className="rounded-l-none bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Warning for minimum level */}
                {validationErrors.minLevel && validationErrors.minLevel.includes("Warning") && (
                  <Alert className="mt-4 border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      {validationErrors.minLevel}
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
