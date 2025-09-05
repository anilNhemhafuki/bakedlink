import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function Assets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    location: "",
    condition: "good",
    purchaseDate: "",
    purchasePrice: "",
    currentValue: "",
  });

  const { toast } = useToast();

  const {
    data: assets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/assets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Asset created successfully" });
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
        description: "Failed to create asset",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Asset updated successfully" });
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
        description: "Failed to update asset",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Success", description: "Asset deleted successfully" });
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
        description: "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      location: "",
      condition: "good",
      purchaseDate: "",
      purchasePrice: "",
      currentValue: "",
    });
    setEditingAsset(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Asset name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description.trim() || null,
      location: formData.location.trim() || null,
      condition: formData.condition || "good",
      purchaseDate: formData.purchaseDate
        ? new Date(formData.purchaseDate)
        : null,
      purchasePrice: formData.purchasePrice
        ? parseFloat(formData.purchasePrice)
        : null,
      currentValue: formData.currentValue
        ? parseFloat(formData.currentValue)
        : null,
    };

    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || "",
      category: asset.category || "",
      description: asset.description || "",
      location: asset.location || "",
      condition: asset.condition || "good",
      purchaseDate: asset.purchaseDate
        ? new Date(asset.purchaseDate).toISOString().split("T")[0]
        : "",
      purchasePrice: asset.purchasePrice ? asset.purchasePrice.toString() : "",
      currentValue: asset.currentValue ? asset.currentValue.toString() : "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const categories = [
    "equipment",
    "furniture",
    "vehicle",
    "computer",
    "tools",
    "other",
  ];
  const conditions = ["excellent", "good", "fair", "poor"];

  const filteredAssets = (assets as any[]).filter((asset: any) => {
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredAssets,
    "name",
  );

  const getConditionBadge = (condition: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      excellent: "default",
      good: "secondary",
      fair: "outline",
      poor: "destructive",
    };
    return variants[condition] || "outline";
  };

  if (error) {
    if (isUnauthorizedError(error)) {
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
    console.error("Error loading assets:", error);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">Track and manage your business assets</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingAsset ? "Edit Asset" : "Add New Asset"}
              </DialogTitle>
              <DialogDescription>
                {editingAsset ? "Update asset information" : "Create a new asset record with detailed information"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="asset-name">Asset Name *</Label>
                    <Input
                      id="asset-name"
                      placeholder="e.g. Office Laptop, Kitchen Mixer"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="asset-location">Location</Label>
                    <Input
                      id="asset-location"
                      placeholder="e.g. Main Office, Kitchen"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => handleInputChange("condition", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {condition.charAt(0).toUpperCase() + condition.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="purchase-date">Purchase Date</Label>
                    <Input
                      id="purchase-date"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) =>
                        handleInputChange("purchaseDate", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchase-price">Purchase Price ($)</Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.purchasePrice}
                      onChange={(e) =>
                        handleInputChange("purchasePrice", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-value">Current Value ($)</Label>
                    <Input
                      id="current-value"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.currentValue}
                      onChange={(e) =>
                        handleInputChange("currentValue", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-description">Description</Label>
                  <Textarea
                    id="asset-description"
                    placeholder="Additional notes about the asset..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
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
                  className="w-full sm:w-auto"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? editingAsset 
                      ? "Updating..." 
                      : "Creating..."
                    : editingAsset 
                      ? "Update Asset" 
                      : "Create Asset"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <SearchBar
                  placeholder="Search assets..."
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
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      Asset
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="category"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden sm:table-cell"
                    >
                      Category
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="location"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden md:table-cell"
                    >
                      Location
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="condition"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Condition
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="currentValue"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden lg:table-cell"
                    >
                      Value
                    </SortableTableHeader>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground sm:hidden">
                              {asset.category}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {asset.category?.charAt(0).toUpperCase() +
                            asset.category?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {asset.location || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getConditionBadge(asset.condition)}>
                          {asset.condition?.charAt(0).toUpperCase() +
                            asset.condition?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {asset.currentValue && (
                            <div className="font-medium">
                              ${parseFloat(asset.currentValue).toFixed(2)}
                            </div>
                          )}
                          {asset.purchasePrice && (
                            <div className="text-muted-foreground">
                              Purchased: $
                              {parseFloat(asset.purchasePrice).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset)}
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
                            title="Delete Asset"
                            itemName={asset.name}
                            onConfirm={() => deleteMutation.mutate(asset.id)}
                            isLoading={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAssets.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No assets found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || categoryFilter !== "all"
                      ? "Try adjusting your search criteria"
                      : "Start by adding your first asset"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
