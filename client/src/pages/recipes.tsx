import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search-bar";
import Recipe from "@/components/recipe";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
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
  Calculator,
  ChefHat,
  Eye,
} from "lucide-react";

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  // Fetch recipes (products with recipe data)
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Filter recipes based on search
  const filteredProducts = recipes.filter((recipe: any) => {
    const matchesSearch = recipe.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredProducts,
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
  } = usePagination(sortedData, 6);

  const handleSaveProduct = (productData: any) => {
    saveMutation.mutate(productData);
  };

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe);
    setIsDialogOpen(true);
  };

  const handleDelete = (recipe: any) => {
    if (
      window.confirm(
        `Are you sure you want to delete the recipe "${recipe.name}"?`,
      )
    ) {
      deleteMutation.mutate(recipe.id);
    }
  };

  const handleAddNew = () => {
    setEditingRecipe(null);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (recipe: any) => {
    if (recipe.cost && recipe.price) {
      const margin = ((recipe.price - recipe.cost) / recipe.price) * 100;
      if (margin > 30) {
        return (
          <Badge className="bg-green-100 text-green-800">Profitable</Badge>
        );
      } else if (margin > 10) {
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>
        );
      } else {
        return <Badge className="bg-red-100 text-red-800">Low Margin</Badge>;
      }
    }
    return <Badge variant="outline">No Costing</Badge>;
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (productData: any) => {
      const url = editingRecipe
        ? `/api/products/${editingRecipe.id}`
        : "/api/products";

      const response = await fetch(url, {
        method: editingRecipe ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${editingRecipe ? "update" : "create"} recipe`,
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingRecipe(null);
      toast({
        title: "Success",
        description: `Recipe ${editingRecipe ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message ||
          `Failed to ${editingRecipe ? "update" : "create"} recipe`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            Recipe Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage product recipes with automatic cost calculations
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingRecipe(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingRecipe ? "Edit Recipe" : "Create New Recipe"}
              </DialogTitle>
            </DialogHeader>
            <Recipe product={editingRecipe} onSave={handleSaveProduct} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Recipes List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recipes ({totalItems})
            </CardTitle>
            <div className="w-full sm:w-64">
              <SearchBar
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No recipes found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Start by creating your first recipe"}
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortConfig={sortConfig}
                      requestSort={() => requestSort("name")}
                    >
                      Recipe Name
                    </SortableTableHeader>
                    <TableHead>Cost per Unit</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ingredients</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((recipe: any) => {
                    const margin =
                      recipe.cost && recipe.price
                        ? ((recipe.price - recipe.cost) / recipe.price) * 100
                        : 0;

                    return (
                      <TableRow key={recipe.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{recipe.name}</span>
                            {recipe.description && (
                              <span className="text-sm text-gray-500 truncate max-w-[200px]">
                                {recipe.description}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {recipe.cost ? formatCurrency(recipe.cost) : "-"}
                        </TableCell>
                        <TableCell>
                          {recipe.price ? formatCurrency(recipe.price) : "-"}
                        </TableCell>
                        <TableCell>
                          {margin > 0 ? (
                            <span
                              className={`font-medium ${
                                margin > 30
                                  ? "text-green-600"
                                  : margin > 10
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(recipe)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calculator className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {recipe.ingredients?.length || 0} items
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRecipe(recipe)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(recipe)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(recipe)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <PaginationInfo
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
          />
          <div className="flex items-center gap-4">
            <PageSizeSelector
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              options={[6, 12, 18, 24]}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        </div>
      )}

      {/* Recipe View Dialog */}
      <Dialog
        open={!!viewingRecipe}
        onOpenChange={(open) => !open && setViewingRecipe(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recipe Details: {viewingRecipe?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingRecipe && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Status
                  </label>
                  <div className="mt-1">{getStatusBadge(viewingRecipe)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Cost per Unit
                  </label>
                  <p className="text-sm font-medium">
                    {viewingRecipe.cost
                      ? formatCurrency(viewingRecipe.cost)
                      : "Not calculated"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Selling Price
                  </label>
                  <p className="text-sm font-medium">
                    {viewingRecipe.price
                      ? formatCurrency(viewingRecipe.price)
                      : "Not set"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {viewingRecipe.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="text-sm mt-1">{viewingRecipe.description}</p>
                </div>
              )}

              {/* Ingredients */}
              {viewingRecipe.ingredients &&
                viewingRecipe.ingredients.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-3 block">
                      Ingredients ({viewingRecipe.ingredients.length})
                    </label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingRecipe.ingredients.map(
                            (ingredient: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {ingredient.name || "Unknown"}
                                </TableCell>
                                <TableCell>{ingredient.quantity}</TableCell>
                                <TableCell>
                                  {ingredient.unit || "unit"}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setViewingRecipe(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setViewingRecipe(null);
                    handleEdit(viewingRecipe);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Recipe
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
