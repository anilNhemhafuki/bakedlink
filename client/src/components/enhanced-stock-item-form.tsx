import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { ChevronDown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useUnits } from "@/hooks/useUnits";

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
    currentStock: "",
    minLevel: "",
    unitId: "",
    unit: "",
    costPerUnit: "",
    previousQuantity: "",
    previousAmount: "",
    defaultPrice: "",
    categoryId: "",
    supplier: "",
    company: "",
  });

  const { data: units = [], isLoading: unitsLoading } = useUnits();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/inventory-categories"],
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || "",
        categoryId: editingItem.categoryId?.toString() || "",
        unitId: editingItem.unitId?.toString() || "",
        defaultPrice: editingItem.costPerUnit || "",
        currentStock: editingItem.currentStock || "",
        minLevel: editingItem.minLevel || "",
        costPerUnit: editingItem.costPerUnit || "",
        supplier: editingItem.supplier || "",
        company: editingItem.company || "",
        previousQuantity: editingItem.previousQuantity || "",
        previousAmount: editingItem.previousAmount || "",
      });
    } else {
      setFormData({
        name: "",
        categoryId: "",
        unitId: "",
        defaultPrice: "",
        currentStock: "",
        minLevel: "",
        costPerUnit: "",
        supplier: "",
        company: "",
        previousQuantity: "",
        previousAmount: "",
      });
    }
  }, [editingItem]);

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
      toast({
        title: "Success",
        description: `Stock item ${editingItem ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} stock item`,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateValue = () => {
    const quantity = parseFloat(formData.currentStock) || 0;
    const rate = parseFloat(formData.costPerUnit) || 0;
    return quantity * rate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!formData.unitId) {
      toast({
        title: "Error",
        description: "Measuring unit is required",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const selectedUnit = units.find(
      (u: any) => u.id.toString() === formData.unitId,
    );

    const submitData = {
      name: formData.name.trim(),
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      unitId: parseInt(formData.unitId),
      unit: selectedUnit?.abbreviation || "kg",
      currentStock: parseFloat(formData.currentStock) || 0,
      minLevel: parseFloat(formData.minLevel) || 0,
      costPerUnit: parseFloat(formData.costPerUnit) || 0,
      supplier: formData.supplier.trim() || null,
      company: formData.company.trim() || null,
      previousQuantity: parseFloat(formData.previousQuantity) || 0,
      previousAmount: parseFloat(formData.previousAmount) || 0,
    };

    saveMutation.mutate(submitData);
    setIsSubmitting(false);
  };

  const handleCategoryCreated = () => {
    // Refresh categories after creating a new one
    queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
              {editingItem ? "Edit Stock Item" : "Create Stock Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name and Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemName" className="text-sm font-medium">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="itemName"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter name of Stock"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit" className="text-sm font-medium">
                  Measuring Unit <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 mt-1">
                  <Select
                    value={formData.unitId}
                    onValueChange={(value) =>
                      handleInputChange("unitId", value)
                    }
                    required
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Measuring Unit of the item" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading units...
                        </SelectItem>
                      ) : Array.isArray(units) && units.length > 0 ? (
                        units
                          .filter(unit => unit.isActive)
                          .map(unit => (
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
                  <span className="text-sm text-muted-foreground self-center">
                    Multiple Unit
                  </span>
                </div>
              </div>
            </div>

            {/* Default Price and Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultPrice" className="text-sm font-medium">
                  Default Price
                </Label>
                <div className="flex mt-1">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {symbol}
                  </span>
                  <Input
                    id="defaultPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) =>
                      handleInputChange("costPerUnit", e.target.value)
                    }
                    placeholder="0"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="group" className="text-sm font-medium">
                  Group
                </Label>
                <div className="flex gap-2 mt-1">
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      handleInputChange("categoryId", value)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Group for Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
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

            {/* Opening Stock */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Opening Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium">
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      value={formData.currentStock}
                      onChange={(e) =>
                        handleInputChange("currentStock", e.target.value)
                      }
                      placeholder="12"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rate" className="text-sm font-medium">
                      Rate
                    </Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        value={formData.costPerUnit}
                        onChange={(e) =>
                          handleInputChange("costPerUnit", e.target.value)
                        }
                        placeholder="1200"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="value" className="text-sm font-medium">
                      Value
                    </Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {symbol}
                      </span>
                      <Input
                        id="value"
                        value={calculateValue().toFixed(2)}
                        placeholder="14400"
                        className="rounded-l-none bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
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
                <div>
                  <Label htmlFor="minLevel" className="text-sm font-medium">
                    Minimum Level
                  </Label>
                  <Input
                    id="minLevel"
                    type="number"
                    step="0.01"
                    value={formData.minLevel}
                    onChange={(e) =>
                      handleInputChange("minLevel", e.target.value)
                    }
                    placeholder="Enter minimum stock level"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="currentStock"
                      className="text-sm font-medium"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="currentStock"
                      type="number"
                      step="0.01"
                      value={formData.currentStock}
                      onChange={(e) =>
                        handleInputChange("currentStock", e.target.value)
                      }
                      placeholder="12"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minLevel" className="text-sm font-medium">
                      Minimum Level
                    </Label>
                    <Input
                      id="minLevel"
                      type="number"
                      step="0.01"
                      value={formData.minLevel}
                      onChange={(e) =>
                        handleInputChange("minLevel", e.target.value)
                      }
                      placeholder="Enter minimum stock level"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="previousQuantity"
                      className="text-sm font-medium"
                    >
                      Previous Quantity
                    </Label>
                    <Input
                      id="previousQuantity"
                      type="number"
                      step="0.01"
                      value={formData.previousQuantity || ""}
                      onChange={(e) =>
                        handleInputChange("previousQuantity", e.target.value)
                      }
                      placeholder="Previous stock quantity"
                      disabled={!!editingItem}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="previousAmount"
                      className="text-sm font-medium"
                    >
                      Previous Amount
                    </Label>
                    <Input
                      id="previousAmount"
                      type="number"
                      step="0.01"
                      value={formData.previousAmount || ""}
                      onChange={(e) =>
                        handleInputChange("previousAmount", e.target.value)
                      }
                      placeholder="Previous cost amount"
                      disabled={!!editingItem}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplier" className="text-sm font-medium">
                    Supplier
                  </Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) =>
                      handleInputChange("supplier", e.target.value)
                    }
                    placeholder="Enter supplier name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      handleInputChange("company", e.target.value)
                    }
                    placeholder="Enter company name"
                    className="mt-1"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white min-w-[120px]"
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
