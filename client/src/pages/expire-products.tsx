import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import {
  Plus,
  Calendar,
  TrendingDown,
  AlertTriangle,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Package,
  DollarSign,
  Calculator,
  Clock,
} from "lucide-react";

interface ExpiredProduct {
  id: number;
  serialNumber: number;
  productId: number;
  productName: string;
  quantity: number;
  unitId: number;
  unitName: string;
  ratePerUnit: number;
  amount: number;
  expiryDate: string;
  isDayClosed: boolean;
  notes?: string;
  createdAt: string;
}

interface DailyExpirySummary {
  summaryDate: string;
  totalItems: number;
  totalQuantity: number;
  totalLoss: number;
  isDayClosed: boolean;
  closedBy?: string;
  closedAt?: string;
}

export default function ExpireProducts() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExpiredProduct | null>(
    null,
  );
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    unitId: "",
    ratePerUnit: "",
    notes: "",
  });

  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/products");
        return Array.isArray(res) ? res : res.products || [];
      } catch (error) {
        console.error("Failed to fetch products:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch units (only packet and kg)
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/units");
        const allUnits = res?.data || res || [];
        // Filter to only show packet and kg units
        return allUnits.filter(
          (unit: any) =>
            unit.name?.toLowerCase().includes("packet") ||
            unit.name?.toLowerCase().includes("kilogram") ||
            unit.abbreviation?.toLowerCase() === "kg" ||
            unit.abbreviation?.toLowerCase() === "pkt",
        );
      } catch (error) {
        console.error("Failed to fetch units:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch expired products for selected date
  const {
    data: expiredProducts = [],
    isLoading: expiredProductsLoading,
    refetch: refetchExpiredProducts,
  } = useQuery({
    queryKey: ["expire-products", selectedDate],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/expire-products?date=${selectedDate}`,
        );
        return res?.data || [];
      } catch (error) {
        console.error("Failed to fetch expired products:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch daily summary
  const { data: dailySummary, refetch: refetchSummary } = useQuery({
    queryKey: ["expire-products-summary", selectedDate],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/expire-products/summary/${selectedDate}`,
        );
        return res?.data || null;
      } catch (error) {
        console.error("Failed to fetch daily summary:", error);
        return null;
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Create expired product mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/expire-products", data);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["expire-products"] });
      queryClient.invalidateQueries({ queryKey: ["expire-products-summary"] });
      toast({
        title: "Success",
        description: "Expired product entry created successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to create expired product entry",
        variant: "destructive",
      });
    },
  });

  // Update expired product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/expire-products/${id}`, data);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["expire-products"] });
      queryClient.invalidateQueries({ queryKey: ["expire-products-summary"] });
      toast({
        title: "Success",
        description: "Expired product entry updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to update expired product entry",
        variant: "destructive",
      });
    },
  });

  // Delete expired product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/expire-products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expire-products"] });
      queryClient.invalidateQueries({ queryKey: ["expire-products-summary"] });
      toast({
        title: "Success",
        description: "Expired product entry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete expired product entry",
        variant: "destructive",
      });
    },
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: async (date: string) => {
      return await apiRequest("POST", "/api/expire-products/close-day", {
        date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expire-products"] });
      queryClient.invalidateQueries({ queryKey: ["expire-products-summary"] });
      toast({
        title: "Success",
        description: "Day closed successfully. No more entries can be added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to close day",
        variant: "destructive",
      });
    },
  });

  // Reopen day mutation
  const reopenDayMutation = useMutation({
    mutationFn: async (date: string) => {
      return await apiRequest("POST", "/api/expire-products/reopen-day", {
        date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expire-products"] });
      queryClient.invalidateQueries({ queryKey: ["expire-products-summary"] });
      toast({
        title: "Success",
        description: "Day reopened successfully. New entries can be added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reopen day",
        variant: "destructive",
      });
    },
  });

  // Calculate amount when quantity or rate changes
  const calculatedAmount = useMemo(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.ratePerUnit) || 0;
    return quantity * rate;
  }, [formData.quantity, formData.ratePerUnit]);

  // Reset form
  const resetForm = () => {
    setFormData({
      productId: "",
      quantity: "",
      unitId: "",
      ratePerUnit: "",
      notes: "",
    });
  };

  // Handle edit
  const handleEdit = (product: ExpiredProduct) => {
    setEditingProduct(product);
    setFormData({
      productId: product.productId.toString(),
      quantity: product.quantity.toString(),
      unitId: product.unitId.toString(),
      ratePerUnit: product.ratePerUnit.toString(),
      notes: product.notes || "",
    });
    setIsDialogOpen(true);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.productId ||
      !formData.quantity ||
      !formData.unitId ||
      !formData.ratePerUnit
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedProduct = products.find(
      (p) => p.id.toString() === formData.productId,
    );
    const selectedUnit = units.find((u) => u.id.toString() === formData.unitId);

    if (!selectedProduct || !selectedUnit) {
      toast({
        title: "Validation Error",
        description: "Please select valid product and unit",
        variant: "destructive",
      });
      return;
    }

    const data = {
      productId: formData.productId,
      productName: selectedProduct.name,
      quantity: formData.quantity,
      unitId: formData.unitId,
      unitName: selectedUnit.name,
      ratePerUnit: formData.ratePerUnit,
      expiryDate: selectedDate,
      notes: formData.notes,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isDayClosed = dailySummary?.isDayClosed || false;
  const canModify = !isDayClosed;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-red-500" />
            Expire Products
          </h1>
          <p className="text-gray-600 flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(selectedDate), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    resetForm();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expired Product
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">
                  {dailySummary?.totalItems || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Quantity
                </p>
                <p className="text-2xl font-bold">
                  {dailySummary?.totalQuantity || 0}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loss</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(dailySummary?.totalLoss || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Day Status</p>
                <Badge
                  variant={isDayClosed ? "destructive" : "default"}
                  className="mt-1"
                >
                  {isDayClosed ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Closed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Open
                    </>
                  )}
                </Badge>
              </div>
              {isDayClosed ? (
                <Lock className="h-8 w-8 text-red-500" />
              ) : (
                <Clock className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Day Management</h3>
              <p className="text-sm text-gray-600">
                {isDayClosed
                  ? "Day is closed. No new entries can be added unless reopened by admin."
                  : "Day is open. Click 'Close Day' when finished entering expired products."}
              </p>
            </div>
            <div className="flex gap-2">
              {!isDayClosed ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={expiredProducts.length === 0}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Close Day
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Expiry Day</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to close the day for{" "}
                        {format(new Date(selectedDate), "MMMM do, yyyy")}? This
                        will calculate the final loss summary and prevent
                        further entries unless reopened by an admin.
                        <br />
                        <br />
                        <strong>
                          Total Loss:{" "}
                          {formatCurrency(dailySummary?.totalLoss || 0)}
                        </strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => closeDayMutation.mutate(selectedDate)}
                        disabled={closeDayMutation.isPending}
                      >
                        {closeDayMutation.isPending
                          ? "Closing..."
                          : "Close Day"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <Unlock className="h-4 w-4 mr-2" />
                      Reopen Day
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reopen Expiry Day</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reopen the day for{" "}
                        {format(new Date(selectedDate), "MMMM do, yyyy")}? This
                        will allow new entries to be added and modify the loss
                        calculations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => reopenDayMutation.mutate(selectedDate)}
                        disabled={reopenDayMutation.isPending}
                      >
                        {reopenDayMutation.isPending
                          ? "Reopening..."
                          : "Reopen Day"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expired Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Expired Products -{" "}
              {format(new Date(selectedDate), "MMM dd, yyyy")}
            </span>
            <Badge variant="secondary">
              {expiredProducts.length}{" "}
              {expiredProducts.length === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiredProductsLoading ? (
            <LoadingSpinner message="Loading expired products..." />
          ) : expiredProducts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No expired products recorded
              </h3>
              <p className="text-gray-500 mb-4">
                {canModify
                  ? "Start by adding your first expired product for today"
                  : "No products were expired on this day"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.N</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rate per Unit</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    {canModify && (
                      <TableHead className="w-24">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.serialNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.quantity}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.unitName}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.ratePerUnit)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(product.amount)}
                      </TableCell>
                      <TableCell>{product.notes || "—"}</TableCell>
                      {canModify && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete Expired Product Entry"
                              itemName={product.productName}
                              onConfirm={() =>
                                deleteMutation.mutate(product.id)
                              }
                              isLoading={deleteMutation.isPending}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Expired Product" : "Add Expired Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productId">Product Name *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, productId: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unitId">Unit *</Label>
              <Select
                value={formData.unitId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, unitId: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                }
                placeholder="Enter quantity"
                required
              />
            </div>

            <div>
              <Label htmlFor="ratePerUnit">Rate per Unit *</Label>
              <Input
                id="ratePerUnit"
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerUnit}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ratePerUnit: e.target.value,
                  }))
                }
                placeholder="Enter rate per unit"
                required
              />
            </div>
          </div>

          <div>
            <Label>Amount (Auto-calculated)</Label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(calculatedAmount)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Optional notes about the expired product"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingProduct
                  ? "Update"
                  : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </div>
  );
}
