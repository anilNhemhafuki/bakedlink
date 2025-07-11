import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import ProductForm from "@/components/product-form";
import CostCalculator from "@/components/cost-calculator";
import SearchBar from "@/components/search-bar";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
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
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      product.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add pagination
  const pagination = usePagination(filteredProducts, 12);
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedProducts,
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  const getCategoryBadge = (categoryName: string) => {
    const colors: Record<string, string> = {
      Breads: "bg-blue-100 text-blue-800",
      Pastries: "bg-purple-100 text-purple-800",
      Cakes: "bg-pink-100 text-pink-800",
      Cookies: "bg-orange-100 text-orange-800",
    };
    return colors[categoryName] || "bg-gray-100 text-gray-800";
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { label: "Out of Stock", class: "bg-red-100 text-red-800" };
    if (stock < 10)
      return { label: "Low Stock", class: "bg-yellow-100 text-yellow-800" };
    return { label: "In Stock", class: "bg-green-100 text-green-800" };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Manage your bakery products and recipes
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCostCalculator(true)} variant="outline">
            <i className="fas fa-calculator mr-2"></i>
            Cost Calculator
          </Button>
          <Button onClick={() => setShowProductForm(true)}>
            <i className="fas fa-plus mr-2"></i>
            Add Product
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="shadow-lg border-0 bg-white ">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search products by name, category, or SKU..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-48 border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center">
                    <i className="fas fa-layer-group mr-2 text-gray-500"></i>
                    All Categories
                  </div>
                </SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center">
                      <i className="fas fa-tag mr-2 text-orange-500"></i>
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          paginatedProducts.map((product: any) => {
            const stockStatus = getStockStatus(0); // Mock stock for now
            const margin = Number(product.margin);

            return (
              <Card
                key={product.id}
                className="bg-white border border-gray-200 shadow-sm rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 "
              >
                <CardHeader className="pb-3 rounded-t-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-orange-500 shadow-sm">
                        <i className="fas fa-cookie-bite text-white text-xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          {product.name}
                        </CardTitle>
                        {product.categoryName && (
                          <Badge
                            className={`text-xs px-2 py-1 ${getCategoryBadge(product.categoryName)} shadow-none`}
                          >
                            <i className="fas fa-tag mr-1"></i>
                            {product.categoryName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 p-3">
                  {/* Cost, Price, and Margin Info - Line by Line */}
                  <div className="text-sm">
                    {/* Cost */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50  rounded-md">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-500 ">
                          <i className="fas fa-coins"></i>
                        </span>
                        <span className="text-gray-600 ">Cost</span>
                      </div>
                      <span className="font-semibold text-blue-700 ">
                        {formatCurrency(Number(product.cost))}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50  rounded-md">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500 ">
                          <i className="fas fa-dollar-sign"></i>
                        </span>
                        <span className="text-gray-600">Price</span>
                      </div>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(Number(product.price))}
                      </span>
                    </div>

                    {/* Margin */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50  rounded-md">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-500">
                          <i className="fas fa-percentage"></i>
                        </span>
                        <span className="text-gray-600">Margin</span>
                      </div>
                      <span className="font-semibold text-yellow-700">
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 hover:bg-blue-50  transition-colors text-gray-700 border-gray-300"
                      onClick={() => {
                        setEditingProduct(product);
                        setShowProductForm(true);
                      }}
                    >
                      <i className="fas fa-edit"></i>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2 hover:bg-red-600 transition-colors text-white"
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      disabled={deleteProductMutation.isPending}
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <i className="fas fa-cookie-bite text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search criteria"
                : "Start by adding your first product"}
            </p>
            <Button onClick={() => setShowProductForm(true)}>
              <i className="fas fa-plus mr-2"></i>
              Add Your First Product
            </Button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <PaginationInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
          />
          <div className="flex items-center gap-4">
            <PageSizeSelector
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              options={[8, 12, 24, 48]}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <Dialog
        open={showProductForm}
        onOpenChange={(open) => {
          setShowProductForm(open);
          if (!open) setEditingProduct(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSuccess={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cost Calculator Modal */}
      <Dialog open={showCostCalculator} onOpenChange={setShowCostCalculator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Cost Calculator</DialogTitle>
          </DialogHeader>
          <CostCalculator
            onSave={(productData) => {
              setShowCostCalculator(false);
              setEditingProduct(productData);
              setShowProductForm(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
