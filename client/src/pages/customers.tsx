import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  FileText,
  Download,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { format } from "date-fns";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number;
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Customers() {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'id',
    direction: 'desc'
  });
  const { toast } = useToast();
  const { symbol, formatCurrency } = useCurrency();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    openingBalance: "0",
    currentBalance: "0",
    totalOrders: "0",
    totalSpent: "0",
    isActive: true,
  });

  // Fetch customers with pagination
  const { data: customersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/customers/paginated", currentPage, pageSize, sortConfig?.key, sortConfig?.direction, searchQuery],
    queryFn: () => apiRequest("GET", "/api/customers/paginated", {
      page: currentPage,
      limit: pageSize,
      sortBy: sortConfig?.key || 'id',
      sortOrder: sortConfig?.direction || 'desc',
      search: searchQuery || undefined
    }),
    keepPreviousData: true,
  });

  const customers = customersResponse?.data || [];
  const pagination = customersResponse?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  };

  // Create/Update customer mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      const transformedData = {
        ...data,
        openingBalance: parseFloat(data.openingBalance || "0"),
        currentBalance: parseFloat(data.currentBalance || "0"),
        totalOrders: parseInt(data.totalOrders || "0"),
        totalSpent: parseFloat(data.totalSpent || "0"),
      };

      if (editingCustomer) {
        await apiRequest("PUT", `/api/customers/${editingCustomer.id}`, transformedData);
      } else {
        await apiRequest("POST", "/api/customers", transformedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/paginated"] });
      toast({
        title: "Success",
        description: editingCustomer
          ? "Customer updated successfully"
          : "Customer created successfully",
      });
      handleCloseDialog();
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
        description: editingCustomer
          ? "Failed to update customer"
          : "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/paginated"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
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
        description: "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      openingBalance: customer.openingBalance?.toString() || "0",
      currentBalance: customer.currentBalance?.toString() || "0",
      totalOrders: customer.totalOrders?.toString() || "0",
      totalSpent: customer.totalSpent?.toString() || "0",
      isActive: customer.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      openingBalance: "0",
      currentBalance: "0",
      totalOrders: "0",
      totalSpent: "0",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUpdateMutation.mutate(formData);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Define table columns
  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      title: 'Customer Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.email && (
            <div className="text-sm text-muted-foreground">{row.email}</div>
          )}
          {row.phone && (
            <div className="text-sm text-muted-foreground">{row.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'currentBalance',
      title: 'Current Balance',
      sortable: true,
      render: (value) => (
        <Badge variant={value >= 0 ? "default" : "destructive"}>
          {formatCurrency(value)}
        </Badge>
      ),
    },
    {
      key: 'totalOrders',
      title: 'Total Orders',
      sortable: true,
    },
    {
      key: 'totalSpent',
      title: 'Total Spent',
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: 'isActive',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (value) => format(new Date(value), "MMM dd, yyyy"),
    },
  ];

  // Define table actions
  const actions: DataTableAction<Customer>[] = [
    {
      label: "View Details",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => {
        // Navigate to customer details page
        window.location.href = `/customers/${row.id}`;
      },
      variant: "ghost",
    },
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Customer Management
          </h1>
          <p className="text-muted-foreground">
            Manage your customer information and relationships
          </p>
        </div>
      </div>

      <DataTable
        title="Customers"
        data={customers}
        columns={columns}
        actions={actions}
        loading={isLoading}
        error={error?.message}
        searchable
        searchPlaceholder="Search customers..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        exportable
        onExportClick={() => {
          toast({
            title: "Export",
            description: "Customer export functionality will be implemented soon",
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
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer
                    ? "Update customer information"
                    : "Enter customer details to add a new customer"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <Select
                      value={formData.isActive.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, isActive: value === "true" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Opening Balance ({symbol})</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.01"
                      value={formData.openingBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingBalance: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentBalance">Current Balance ({symbol})</Label>
                    <Input
                      id="currentBalance"
                      type="number"
                      step="0.01"
                      value={formData.currentBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentBalance: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUpdateMutation.isPending}>
                    {createUpdateMutation.isPending && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {editingCustomer ? "Update" : "Create"} Customer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
    </div>
  );
}