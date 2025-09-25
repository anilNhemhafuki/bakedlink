import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ProductForm from "@/components/product-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  DataTable,
  DataTableColumn,
  DataTableAction,
} from "@/components/ui/data-table";

interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  cost: number;
  margin: number;
  imageUrl?: string;
  categoryId?: number;
  unitId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Products() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({
    key: "id",
    direction: "desc",
  });
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  // Fetch products with pagination
  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/products/paginated",
      currentPage,
      pageSize,
      sortConfig?.key,
      sortConfig?.direction,
      searchQuery,
    ],
    queryFn: () =>
      apiRequest("GET", "/api/products/paginated", {
        page: currentPage,
        limit: pageSize,
        sortBy: sortConfig?.key || "id",
        sortOrder: sortConfig?.direction || "desc",
        search: searchQuery || undefined,
      }),
    keepPreviousData: true,
  });

  const products = productsResponse?.data || [];
  const pagination = productsResponse?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/paginated"] });
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Define table columns
  const columns: DataTableColumn<Product>[] = [
    {
      key: "name",
      title: "Product",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {row.imageUrl && (
            <img
              src={row.imageUrl}
              alt={row.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          )}
          <div>
            <div className="font-medium">{value}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "sku",
      title: "SKU",
      sortable: true,
      className: "hidden md:table-cell",
      render: (value) =>
        value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "price",
      title: "Price",
      sortable: true,
      render: (value) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "cost",
      title: "Cost",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "margin",
      title: "Margin",
      sortable: true,
      render: (value) => (
        <Badge variant={value > 0 ? "default" : "destructive"}>
          {formatCurrency(value)}
        </Badge>
      ),
    },
  ];

  // Define table actions
  const actions: DataTableAction<Product>[] = [
    {
      label: "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      variant: "ghost",
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => handleDelete(row.id),
      variant: "ghost",
      className: "text-red-600 hover:text-red-700",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage your product catalog and pricing
          </p>
        </div>
      </div>

      <DataTable
        title="Products List"
        data={products}
        columns={columns}
        actions={actions}
        loading={isLoading}
        error={error?.message}
        searchable
        searchPlaceholder="Search products..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        exportable
        onExportClick={() => {
          toast({
            title: "Export",
            description:
              "Product export functionality will be implemented soon",
          });
        }}
        refreshable
        onRefreshClick={() => refetch()}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        sortConfig={sortConfig}
        onSort={handleSort}
        headerActions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Update product information"
                    : "Enter product details to add a new product"}
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                product={editingProduct}
                onSuccess={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        }
      />
    </div>
  );
}
