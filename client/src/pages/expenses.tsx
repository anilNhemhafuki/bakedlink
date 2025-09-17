import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  // ✅ Fixed: Add queryFn and correct queryKey
  const {
    data: expenses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expenses"], // ✅ Meaningful key
    queryFn: () => apiRequest("GET", "/api/expenses"), // ✅ Fetch data
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to load expenses.",
          variant: "destructive",
        });
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense added successfully" });
    },
    onError: (error) => {
      handleError(error, "Failed to save expense");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense updated successfully" });
    },
    onError: (error) => {
      handleError(error, "Failed to update expense");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: (error) => {
      handleError(error, "Failed to delete expense");
    },
  });

  // Reuse error handling
  function handleError(error: any, message: string) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "Session expired. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/api/login"), 500);
      return;
    }
    toast({ title: "Error", description: message, variant: "destructive" });
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = parseFloat(formData.get("amount") as string);
    const title = (formData.get("title") as string)?.trim();
    const category = selectedCategory?.trim();
    const dateValue = formData.get("date") as string;

    if (!title || !category || isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      title,
      category,
      amount: amount.toString(),
      date: dateValue ? new Date(dateValue) : new Date(),
      description: (formData.get("description") as string)?.trim() || null,
    };

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const categories = [
    "utilities",
    "rent",
    "supplies",
    "marketing",
    "maintenance",
    "equipment",
    "travel",
    "office",
    "other",
  ];

  // ✅ Safely filter
  const filteredExpenses = Array.isArray(expenses)
    ? expenses.filter((expense: any) => {
        const matchesSearch =
          expense.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
          categoryFilter === "all" || expense.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
    : [];

  // Add sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredExpenses,
    "title",
  );

  // Pagination
  const {
    currentItems,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    totalItems,
  } = usePagination(sortedData, 10);

  const getCategoryBadge = (category: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      utilities: "default",
      rent: "secondary",
      supplies: "outline",
      marketing: "default",
      maintenance: "destructive",
      equipment: "secondary",
      travel: "outline",
      office: "default",
      other: "outline",
    };
    return variants[category] || "outline";
  };

  // Sync selectedCategory when editing
  useEffect(() => {
    if (editingExpense) {
      setSelectedCategory(editingExpense.category);
    } else {
      setSelectedCategory("");
    }
  }, [editingExpense]);

  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "Session expired. Redirecting to login...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Track and manage your business expenses
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingExpense(null);
              setSelectedCategory("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingExpense(null)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? "Update expense information"
                  : "Record a new business expense with detailed information"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Expense Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-title">Expense Title *</Label>
                    <Input
                      id="expense-title"
                      name="title"
                      placeholder="e.g. Office Supplies, Electricity Bill"
                      defaultValue={editingExpense?.title || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-category">Category *</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="category"
                      value={selectedCategory}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-amount">Amount ($) *</Label>
                    <Input
                      id="expense-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={editingExpense?.amount || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-date">Date *</Label>
                    <Input
                      id="expense-date"
                      name="date"
                      type="date"
                      defaultValue={
                        editingExpense?.date
                          ? new Date(editingExpense.date)
                              .toISOString()
                              .split("T")[0]
                          : new Date().toISOString().split("T")[0]
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="expense-description">Description</Label>
                  <Textarea
                    id="expense-description"
                    name="description"
                    placeholder="Additional notes about this expense..."
                    defaultValue={editingExpense?.description || ""}
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
                    ? editingExpense
                      ? "Updating..."
                      : "Saving..."
                    : editingExpense
                      ? "Update Expense"
                      : "Save Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Expenses List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <SearchBar
                  placeholder="Search expenses..."
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
                      sortKey="title"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Expense
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
                      sortKey="amount"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Amount
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="date"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="hidden md:table-cell"
                    >
                      Date
                    </SortableTableHeader>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length > 0 ? (
                    sortedData.map((expense: any) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Receipt className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{expense.title}</div>
                              <div className="text-sm text-muted-foreground sm:hidden">
                                {expense.category}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={getCategoryBadge(expense.category)}>
                            {expense.category?.charAt(0).toUpperCase() +
                              expense.category?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(parseFloat(expense.amount || 0))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(expense.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingExpense(expense);
                                setSelectedCategory(expense.category || "");
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete Expense"
                              itemName={expense.title || "this expense"}
                              onConfirm={() =>
                                deleteMutation.mutate(expense.id)
                              }
                              isLoading={deleteMutation.isPending}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                          No expenses found
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {searchQuery || categoryFilter !== "all"
                            ? "Try adjusting your search criteria"
                            : "Start by adding your first expense"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <PaginationInfo
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
            />
            <div className="flex items-center gap-4">
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
