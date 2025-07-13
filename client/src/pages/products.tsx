
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
import { MoreHorizontal, Plus, Printer, Edit, Trash2, Download, Upload } from "lucide-react";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [showLabelPrint, setShowLabelPrint] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<any>(null);
  const [labelData, setLabelData] = useState({
    companyName: "",
    companyLocation: "",
    regNo: "",
    dtqocNo: "",
    batchNo: "",
    netWeight: "",
    ingredients: "",
    mrp: "",
    manufactureDate: "",
    expireDate: "",
  });
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
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      product.categoryId?.toString() === selectedCategory;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && product.isActive) ||
      (selectedStatus === "inactive" && !product.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Add pagination
  const pagination = usePagination(filteredProducts, 10);
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedProducts,
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  const handleLabelPrint = (product: any) => {
    setSelectedProductForLabel(product);
    setLabelData({
      companyName: "Sweet Treats Bakery",
      companyLocation: "",
      regNo: "",
      dtqocNo: "",
      batchNo: "",
      netWeight: "",
      ingredients: "",
      mrp: formatCurrency(Number(product.price)),
      manufactureDate: new Date().toISOString().split('T')[0],
      expireDate: "",
    });
    setShowLabelPrint(true);
  };

  const printLabel = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Label</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
            }
            .label {
              border: 2px solid #000;
              padding: 15px;
              width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .field {
              margin: 5px 0;
              display: flex;
              justify-content: space-between;
            }
            .field-label {
              font-weight: bold;
              width: 40%;
            }
            .field-value {
              width: 55%;
            }
            .product-name {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin: 10px 0;
              border: 1px solid #000;
              padding: 5px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="company-name">${labelData.companyName}</div>
              ${labelData.companyLocation ? `<div>${labelData.companyLocation}</div>` : ''}
            </div>
            
            <div class="product-name">${selectedProductForLabel?.name}</div>
            
            ${labelData.regNo ? `<div class="field"><span class="field-label">Reg. No:</span><span class="field-value">${labelData.regNo}</span></div>` : ''}
            ${labelData.dtqocNo ? `<div class="field"><span class="field-label">DTQOC No:</span><span class="field-value">${labelData.dtqocNo}</span></div>` : ''}
            ${labelData.batchNo ? `<div class="field"><span class="field-label">Batch No:</span><span class="field-value">${labelData.batchNo}</span></div>` : ''}
            ${labelData.netWeight ? `<div class="field"><span class="field-label">Net Weight:</span><span class="field-value">${labelData.netWeight}</span></div>` : ''}
            ${labelData.ingredients ? `<div class="field"><span class="field-label">Ingredients:</span><span class="field-value">${labelData.ingredients}</span></div>` : ''}
            <div class="field"><span class="field-label">MRP:</span><span class="field-value">${labelData.mrp}</span></div>
            ${labelData.manufactureDate ? `<div class="field"><span class="field-label">Mfg. Date:</span><span class="field-value">${new Date(labelData.manufactureDate).toLocaleDateString()}</span></div>` : ''}
            ${labelData.expireDate ? `<div class="field"><span class="field-label">Exp. Date:</span><span class="field-value">${new Date(labelData.expireDate).toLocaleDateString()}</span></div>` : ''}
          </div>
        </body>
      </html>
    `;
    
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
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
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1">
              <SearchBar
                placeholder="Search products..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Regular Price</TableHead>
                <TableHead>Sales Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <i className="fas fa-cookie-bite text-orange-600 text-sm"></i>
                        </div>
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{product.sku || "—"}</TableCell>
                    <TableCell>{formatCurrency(Number(product.cost))}</TableCell>
                    <TableCell>{formatCurrency(Number(product.price))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isActive ? "default" : "secondary"}
                        className={product.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {product.isActive ? "In stock" : "Out of stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.unitName || "—"}</TableCell>
                    <TableCell>{product.categoryName || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductForm(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleLabelPrint(product)}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Label Print
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-cookie-bite text-4xl text-gray-300 mb-4"></i>
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No products found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {searchQuery || selectedCategory !== "all"
                          ? "Try adjusting your search criteria"
                          : "Start by adding your first product"}
                      </p>
                      <Button onClick={() => setShowProductForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Product
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <PaginationInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
          />
          <div className="flex items-center gap-4">
            <PageSizeSelector
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              options={[10, 25, 50, 100]}
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

      {/* Label Print Modal */}
      <Dialog open={showLabelPrint} onOpenChange={setShowLabelPrint}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Product Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={labelData.companyName}
                onChange={(e) => setLabelData({...labelData, companyName: e.target.value})}
              />
            </div>
            <div>
              <Label>Company Location</Label>
              <Input
                value={labelData.companyLocation}
                onChange={(e) => setLabelData({...labelData, companyLocation: e.target.value})}
              />
            </div>
            <div>
              <Label>Registration No.</Label>
              <Input
                value={labelData.regNo}
                onChange={(e) => setLabelData({...labelData, regNo: e.target.value})}
              />
            </div>
            <div>
              <Label>DTQOC No.</Label>
              <Input
                value={labelData.dtqocNo}
                onChange={(e) => setLabelData({...labelData, dtqocNo: e.target.value})}
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input
                value={selectedProductForLabel?.name || ""}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Batch No.</Label>
              <Input
                value={labelData.batchNo}
                onChange={(e) => setLabelData({...labelData, batchNo: e.target.value})}
              />
            </div>
            <div>
              <Label>Net Weight</Label>
              <Input
                value={labelData.netWeight}
                onChange={(e) => setLabelData({...labelData, netWeight: e.target.value})}
              />
            </div>
            <div>
              <Label>Ingredients</Label>
              <Input
                value={labelData.ingredients}
                onChange={(e) => setLabelData({...labelData, ingredients: e.target.value})}
              />
            </div>
            <div>
              <Label>MRP</Label>
              <Input
                value={labelData.mrp}
                onChange={(e) => setLabelData({...labelData, mrp: e.target.value})}
              />
            </div>
            <div>
              <Label>Manufacture Date</Label>
              <Input
                type="date"
                value={labelData.manufactureDate}
                onChange={(e) => setLabelData({...labelData, manufactureDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Expire Date</Label>
              <Input
                type="date"
                value={labelData.expireDate}
                onChange={(e) => setLabelData({...labelData, expireDate: e.target.value})}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowLabelPrint(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={printLabel} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Label
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
