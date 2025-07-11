import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  PermissionWrapper,
  ReadOnlyWrapper,
} from "@/components/permission-wrapper";
import { Input } from "@/components/ui/input";
import SearchBar from "@/components/search-bar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  FileText,
  Download,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  usePagination,
} from "@/components/ui/pagination";

interface LedgerTransaction {
  id: number;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  transactionType: string;
  paymentMethod?: string;
  notes?: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [transactionType, setTransactionType] = useState("");
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/customers"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: ledgerTransactions = [] } = useQuery({
    queryKey: ["/api/ledger/customer", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      toast({ title: "Success", description: "Customer saved successfully" });
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
        description: "Failed to save customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      toast({ title: "Success", description: "Customer updated successfully" });
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
        description: "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Success", description: "Customer deleted successfully" });
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

  const transactionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ledger", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/ledger/customer", selectedCustomer?.id],
      });
      setIsTransactionDialogOpen(false);
      setTransactionType("");
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      openingBalance: formData.get("openingBalance")
        ? parseFloat(formData.get("openingBalance") as string) || 0
        : 0,
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTransactionSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const amount = parseFloat(formData.get("amount") as string);
    const isDebit =
      transactionType === "sale" || transactionType === "adjustment_debit";

    const data = {
      customerOrPartyId: selectedCustomer.id,
      entityType: "customer",
      transactionDate: formData.get("transactionDate") as string,
      description: formData.get("description") as string,
      referenceNumber: formData.get("referenceNumber") as string,
      debitAmount: isDebit ? amount : 0,
      creditAmount: !isDebit ? amount : 0,
      transactionType,
      paymentMethod: formData.get("paymentMethod") as string,
      notes: formData.get("notes") as string,
    };

    transactionMutation.mutate(data);
  };

  const exportLedger = () => {
    const csvContent = [
      ["Date", "Description", "Reference", "Debit", "Credit", "Balance"].join(
        ",",
      ),
      ...ledgerTransactions.map((txn: LedgerTransaction) =>
        [
          format(new Date(txn.transactionDate), "dd/MM/yyyy"),
          txn.description,
          txn.referenceNumber || "",
          txn.debitAmount,
          txn.creditAmount,
          txn.runningBalance,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCustomer?.name}_ledger.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Ledger exported to CSV file",
    });
  };

  const filteredCustomers = (customers as any[]).filter(
    (customer: any) =>
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Add pagination
  const pagination = usePagination(filteredCustomers, 10);
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedCustomers,
    handlePageChange,
    handlePageSizeChange,
  } = pagination;

  const getBalanceBadge = (balance: any) => {
    const amount = parseFloat(balance || 0);
    if (amount > 0) {
      return { variant: "default" as const, text: `${formatCurrency(amount)}` };
    } else if (amount < 0) {
      return {
        variant: "destructive" as const,
        text: `${formatCurrency(Math.abs(amount))}`,
      };
    }
    return { variant: "secondary" as const, text: formatCurrency(0) };
  };

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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Manage customer accounts with complete transaction history
          </p>
        </div>
        <PermissionWrapper resource="customers" action="write">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingCustomer(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingCustomer(null)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </DialogTitle>
                <DialogDescription>
                  Enter customer details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  name="name"
                  placeholder="Customer Name"
                  defaultValue={editingCustomer?.name || ""}
                  required
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  defaultValue={editingCustomer?.email || ""}
                />
                <Input
                  name="phone"
                  placeholder="Phone Number"
                  defaultValue={editingCustomer?.phone || ""}
                />
                <Textarea
                  name="address"
                  placeholder="Address"
                  defaultValue={editingCustomer?.address || ""}
                  rows={3}
                />
                <Input
                  name="openingBalance"
                  type="number"
                  step="0.01"
                  placeholder="Opening Balance"
                  defaultValue={editingCustomer?.openingBalance || "0"}
                />
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
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
                    {editingCustomer ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </PermissionWrapper>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Customers List</CardTitle>
            <div className="w-full sm:w-64">
              <SearchBar
                placeholder="Search customers..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer: any) => {
                    const balanceInfo = getBalanceBadge(
                      customer.currentBalance,
                    );
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground md:hidden">
                                {customer.email || customer.phone}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            {customer.email && (
                              <div className="text-sm">{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div className="text-sm text-muted-foreground">
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={balanceInfo.variant}>
                            {balanceInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <PermissionWrapper
                              resource="customers"
                              action="read"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setIsLedgerDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PermissionWrapper>
                            <PermissionWrapper
                              resource="customers"
                              action="write"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setIsTransactionDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCustomer(customer);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteMutation.mutate(customer.id)
                                }
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionWrapper>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No customers found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Start by adding your first customer"}
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredCustomers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <PaginationInfo
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                  />
                  <div className="flex items-center gap-4">
                    <PageSizeSelector
                      pageSize={pageSize}
                      onPageSizeChange={handlePageSizeChange}
                    />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
      >
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              Add Transaction for {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Record a new transaction in the customer ledger
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransactionSave} className="space-y-4">
            <Select
              value={transactionType}
              onValueChange={setTransactionType}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale (Debit)</SelectItem>
                <SelectItem value="payment_received">
                  Payment Received (Credit)
                </SelectItem>
                <SelectItem value="adjustment_debit">
                  Adjustment (Debit)
                </SelectItem>
                <SelectItem value="adjustment_credit">
                  Adjustment (Credit)
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="transactionDate"
              type="date"
              defaultValue={format(new Date(), "yyyy-MM-dd")}
              required
            />
            <Input
              name="description"
              placeholder="Transaction Description"
              required
            />
            <Input
              name="referenceNumber"
              placeholder="Reference Number (Optional)"
            />
            <Input
              name="amount"
              type="number"
              step="0.01"
              placeholder="Amount"
              required
            />
            <Select name="paymentMethod">
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              name="notes"
              placeholder="Additional Notes (Optional)"
              rows={2}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransactionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={transactionMutation.isPending}>
                Add Transaction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ledger View Dialog */}
      <Dialog open={isLedgerDialogOpen} onOpenChange={setIsLedgerDialogOpen}>
        <DialogContent className="max-w-4xl mx-auto max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  Customer Ledger - {selectedCustomer?.name}
                </DialogTitle>
                <DialogDescription>
                  Complete transaction history and running balance
                </DialogDescription>
              </div>
              <Button variant="outline" onClick={exportLedger}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerTransactions.map((transaction: LedgerTransaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(
                        new Date(transaction.transactionDate),
                        "dd/MM/yyyy",
                      )}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.referenceNumber || "-"}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(transaction.debitAmount) > 0
                        ? formatCurrency(parseFloat(transaction.debitAmount))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(transaction.creditAmount) > 0
                        ? formatCurrency(parseFloat(transaction.creditAmount))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(transaction.runningBalance))}
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
