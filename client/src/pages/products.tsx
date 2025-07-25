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
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";
import {
  MoreHorizontal,
  Plus,
  Printer,
  Edit,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [showLabelPrint, setShowLabelPrint] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductForLabel, setSelectedProductForLabel] =
    useState<any>(null);
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

  const { data: settingsResponse = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  const settings = settingsResponse?.settings || {};

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

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredProducts,
    "name",
  );

  // Add pagination
  const pagination = usePagination(sortedData, 10);
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
      companyName: settings.companyName || "Baked Link",
      companyLocation: settings.companyAddress || "",
      regNo: settings.companyRegNo || "",
      dtqocNo: settings.companyDtqocNo || "",
      batchNo: "",
      netWeight: "",
      ingredients: "",
      mrp: formatCurrency(Number(product.price)),
      manufactureDate: new Date().toISOString().split("T")[0],
      expireDate: "",
    });
    setShowLabelPrint(true);
  };

  const printLabel = () => {
    const printWindow = window.open("", "_blank");
    const labelSize = settings.labelSize || "small";
    const orientation = settings.labelOrientation || "portrait";
    const margin = settings.labelMargin || "2";

    // Size configurations
    const sizeConfig = {
      small: { width: "200px", height: "120px" },
      medium: { width: "280px", height: "200px" },
      large: { width: "350px", height: "260px" },
    };

    const currentSize =
      sizeConfig[labelSize as keyof typeof sizeConfig] || sizeConfig.small;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Label - ${selectedProductForLabel?.name}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: ${margin}mm; 
              font-size: 10px;
              background: white;
            }
            .label {
              border: 2px solid #000;
              padding: 8px;
              width: ${currentSize.width};
              height: ${currentSize.height};
              margin: 0 auto;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              ${orientation === "landscape" ? "transform: rotate(90deg); transform-origin: center;" : ""}
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 6px;
              margin-bottom: 6px;
              flex-shrink: 0;
            }
            .company-name {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 2px;
              line-height: 1.2;
            }
            .company-location {
              font-size: 8px;
              line-height: 1.1;
            }
            .product-name {
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              margin: 4px 0;
              border: 1px solid #000;
              padding: 3px;
              background: #f9f9f9;
              flex-shrink: 0;
            }
            .fields {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .field {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              line-height: 1.2;
            }
            .field-label {
              font-weight: bold;
              width: 35%;
              font-size: 9px;
            }
            .field-value {
              width: 60%;
              text-align: right;
              font-size: 9px;
              word-wrap: break-word;
            }
            .ingredients .field-value {
              font-size: 7px;
              line-height: 1.1;
            }
            @media print {
              body { margin: 0; }
              .label { 
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="company-name">${labelData.companyName}</div>
              ${labelData.companyLocation ? `<div class="company-location">${labelData.companyLocation}</div>` : ""}
            </div>
            
            <div class="product-name">${selectedProductForLabel?.name}</div>
            
            <div class="fields">
              ${labelData.regNo ? `<div class="field"><span class="field-label">Reg. No:</span><span class="field-value">${labelData.regNo}</span></div>` : ""}
              ${labelData.dtqocNo ? `<div class="field"><span class="field-label">DTQOC No:</span><span class="field-value">${labelData.dtqocNo}</span></div>` : ""}
              ${labelData.batchNo ? `<div class="field"><span class="field-label">Batch No:</span><span class="field-value">${labelData.batchNo}</span></div>` : ""}
              ${labelData.netWeight ? `<div class="field"><span class="field-label">Net Weight:</span><span class="field-value">${labelData.netWeight}</span></div>` : ""}
              ${labelData.ingredients ? `<div class="field ingredients"><span class="field-label">Ingredients:</span><span class="field-value">${labelData.ingredients}</span></div>` : ""}
              <div class="field"><span class="field-label">MRP:</span><span class="field-value">${labelData.mrp}</span></div>
              ${labelData.manufactureDate ? `<div class="field"><span class="field-label">Mfg. Date:</span><span class="field-value">${new Date(labelData.manufactureDate).toLocaleDateString()}</span></div>` : ""}
              ${labelData.expireDate ? `<div class="field"><span class="field-label">Exp. Date:</span><span class="field-value">${new Date(labelData.expireDate).toLocaleDateString()}</span></div>` : ""}
            </div>
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
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
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
                <SortableTableHeader
                  sortKey="name"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Name
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="sku"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Code
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="price"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Regular Price
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="salePrice"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Sales Price
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="isActive"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Status
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="unit"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Unit
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="categoryId"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                >
                  Category
                </SortableTableHeader>
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
                    <TableCell>
                      {formatCurrency(Number(product.cost))}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(product.price))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isActive ? "default" : "secondary"}
                        className={
                          product.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {product.isActive ? "In stock" : "Out of stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.unitName || "—"}</TableCell>
                    <TableCell>{product.categoryName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 focus:outline-none"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Label Print Button */}
                        <button
                          onClick={() => handleLabelPrint(product)}
                          className="text-green-600 hover:text-green-800 focus:outline-none"
                          title="Label Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <DeleteConfirmationDialog
                          trigger={
                            <button
                              className="text-red-600 hover:text-red-800 focus:outline-none"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title="Delete Product"
                          itemName={product.name}
                          onConfirm={() =>
                            deleteProductMutation.mutate(product.id)
                          }
                          isLoading={deleteProductMutation.isPending}
                        />
                      </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Product Label
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Label Data Form */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Company Name</Label>
                    <Input
                      value={labelData.companyName}
                      onChange={(e) =>
                        setLabelData({
                          ...labelData,
                          companyName: e.target.value,
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">
                      Location/Address
                    </Label>
                    <Input
                      value={labelData.companyLocation}
                      onChange={(e) =>
                        setLabelData({
                          ...labelData,
                          companyLocation: e.target.value,
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">
                        Registration No.
                      </Label>
                      <Input
                        value={labelData.regNo}
                        onChange={(e) =>
                          setLabelData({ ...labelData, regNo: e.target.value })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">DTQOC No.</Label>
                      <Input
                        value={labelData.dtqocNo}
                        onChange={(e) =>
                          setLabelData({
                            ...labelData,
                            dtqocNo: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                  Product Information
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Product Name</Label>
                    <Input
                      value={selectedProductForLabel?.name || ""}
                      readOnly
                      className="bg-gray-50 h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">Batch No.</Label>
                      <Input
                        value={labelData.batchNo}
                        onChange={(e) =>
                          setLabelData({
                            ...labelData,
                            batchNo: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Net Weight</Label>
                      <Input
                        value={labelData.netWeight}
                        onChange={(e) =>
                          setLabelData({
                            ...labelData,
                            netWeight: e.target.value,
                          })
                        }
                        placeholder="e.g., 250g"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Ingredients</Label>
                    <Input
                      value={labelData.ingredients}
                      onChange={(e) =>
                        setLabelData({
                          ...labelData,
                          ingredients: e.target.value,
                        })
                      }
                      placeholder="List of ingredients"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">MRP</Label>
                    <Input
                      value={labelData.mrp}
                      onChange={(e) =>
                        setLabelData({ ...labelData, mrp: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">
                        Manufacture Date
                      </Label>
                      <Input
                        type="date"
                        value={labelData.manufactureDate}
                        onChange={(e) =>
                          setLabelData({
                            ...labelData,
                            manufactureDate: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Expire Date</Label>
                      <Input
                        type="date"
                        value={labelData.expireDate}
                        onChange={(e) =>
                          setLabelData({
                            ...labelData,
                            expireDate: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                  Printing Options
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Printer Name</Label>
                    <Input
                      defaultValue={settings.defaultPrinter || ""}
                      placeholder="Select or enter printer name"
                      className="h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">Label Size</Label>
                      <Select defaultValue={settings.labelSize || "small"}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (50x30mm)</SelectItem>
                          <SelectItem value="medium">
                            Medium (75x50mm)
                          </SelectItem>
                          <SelectItem value="large">
                            Large (100x75mm)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Orientation</Label>
                      <Select
                        defaultValue={settings.labelOrientation || "portrait"}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Label Preview */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">
                  Label Preview
                </h3>
                <div
                  className="border-2 border-gray-300 p-4 bg-white shadow-sm max-w-sm mx-auto"
                  style={{ fontFamily: "Arial, sans-serif", fontSize: "10px" }}
                >
                  <div className="text-center border-b border-gray-300 pb-2 mb-3">
                    <div className="font-bold text-sm">
                      {labelData.companyName}
                    </div>
                    {labelData.companyLocation && (
                      <div className="text-xs">{labelData.companyLocation}</div>
                    )}
                  </div>

                  <div className="font-bold text-center text-sm border border-gray-300 p-1 mb-2">
                    {selectedProductForLabel?.name}
                  </div>

                  <div className="space-y-1 text-xs">
                    {labelData.regNo && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Reg. No:</span>
                        <span>{labelData.regNo}</span>
                      </div>
                    )}
                    {labelData.dtqocNo && (
                      <div className="flex justify-between">
                        <span className="font-semibold">DTQOC No:</span>
                        <span>{labelData.dtqocNo}</span>
                      </div>
                    )}
                    {labelData.batchNo && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Batch No:</span>
                        <span>{labelData.batchNo}</span>
                      </div>
                    )}
                    {labelData.netWeight && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Net Weight:</span>
                        <span>{labelData.netWeight}</span>
                      </div>
                    )}
                    {labelData.ingredients && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Ingredients:</span>
                        <span className="text-right">
                          {labelData.ingredients}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-semibold">MRP:</span>
                      <span>{labelData.mrp}</span>
                    </div>
                    {labelData.manufactureDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Mfg. Date:</span>
                        <span>
                          {new Date(
                            labelData.manufactureDate,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {labelData.expireDate && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Exp. Date:</span>
                        <span>
                          {new Date(labelData.expireDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowLabelPrint(false)}>
              Cancel
            </Button>
            <Button onClick={printLabel}>
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
