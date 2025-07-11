
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { PermissionWrapper, ReadOnlyWrapper } from "@/components/permission-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building, 
  Eye,
  Download,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

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

interface FormErrors {
  name?: string;
  type?: string;
  email?: string;
  phone?: string;
  openingBalance?: string;
}

interface TransactionFormErrors {
  transactionType?: string;
  amount?: string;
  description?: string;
  transactionDate?: string;
}

export default function Parties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [transactionErrors, setTransactionErrors] = useState<TransactionFormErrors>({});
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const {
    data: parties = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/parties"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: ledgerTransactions = [] } = useQuery({
    queryKey: ["/api/ledger/party", selectedParty?.id],
    enabled: !!selectedParty?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/parties", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      setIsDialogOpen(false);
      setEditingParty(null);
      setFormErrors({});
      toast({ title: "Success", description: "Party saved successfully" });
    },
    onError: (error: any) => {
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
      
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to save party",
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/parties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      setIsDialogOpen(false);
      setEditingParty(null);
      setFormErrors({});
      toast({ title: "Success", description: "Party updated successfully" });
    },
    onError: (error: any) => {
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
      
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to update party",
          variant: "destructive",
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/parties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({ title: "Success", description: "Party deleted successfully" });
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
        description: "Failed to delete party",
        variant: "destructive",
      });
    },
  });

  const transactionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ledger", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger/party", selectedParty?.id] });
      setIsTransactionDialogOpen(false);
      setTransactionType("");
      setTransactionErrors({});
      toast({ title: "Success", description: "Transaction added successfully" });
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setTransactionErrors(error.response.data.errors);
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to add transaction",
          variant: "destructive",
        });
      }
    },
  });

  const validateForm = (formData: FormData): boolean => {
    const errors: FormErrors = {};
    
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const openingBalance = formData.get("openingBalance") as string;

    if (!name || name.trim().length < 2) {
      errors.name = "Party name must be at least 2 characters long";
    }

    if (!type) {
      errors.type = "Please select a party type";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    if (openingBalance && isNaN(parseFloat(openingBalance))) {
      errors.openingBalance = "Opening balance must be a valid number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTransactionForm = (formData: FormData): boolean => {
    const errors: TransactionFormErrors = {};
    
    const amount = formData.get("amount") as string;
    const description = formData.get("description") as string;
    const transactionDate = formData.get("transactionDate") as string;

    if (!transactionType) {
      errors.transactionType = "Please select a transaction type";
    }

    if (!amount || amount.trim() === "") {
      errors.amount = "Amount is required";
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errors.amount = "Amount must be a positive number";
    } else if (parseFloat(amount) > 999999999.99) {
      errors.amount = "Amount is too large";
    }

    if (!description || description.trim().length < 3) {
      errors.description = "Description must be at least 3 characters long";
    } else if (description.trim().length > 500) {
      errors.description = "Description is too long (max 500 characters)";
    }

    if (!transactionDate) {
      errors.transactionDate = "Transaction date is required";
    } else {
      const selectedDate = new Date(transactionDate);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      if (selectedDate > today) {
        errors.transactionDate = "Transaction date cannot be in the future";
      } else if (selectedDate < oneYearAgo) {
        errors.transactionDate = "Transaction date cannot be more than 1 year ago";
      }
    }

    setTransactionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    if (!validateForm(formData)) {
      return;
    }

    const data = {
      name: formData.get("name") as string,
      type: selectedType || formData.get("type") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      contactPerson: (formData.get("contactPerson") as string) || null,
      taxId: (formData.get("taxId") as string) || null,
      notes: (formData.get("notes") as string) || null,
      openingBalance: formData.get("openingBalance")
        ? parseFloat(formData.get("openingBalance") as string) || 0
        : 0,
      isActive: true,
    };

    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTransactionSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    if (!validateTransactionForm(formData)) {
      return;
    }
    
    const amount = parseFloat(formData.get("amount") as string);
    const isDebit = transactionType === "purchase" || transactionType === "adjustment_debit";
    
    const data = {
      customerOrPartyId: selectedParty.id,
      entityType: "party",
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
      ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'].join(','),
      ...ledgerTransactions.map((txn: LedgerTransaction) => [
        format(new Date(txn.transactionDate), 'dd/MM/yyyy'),
        txn.description,
        txn.referenceNumber || '',
        txn.debitAmount,
        txn.creditAmount,
        txn.runningBalance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedParty?.name}_ledger.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Ledger exported to CSV file",
    });
  };

  const partyTypes = [
    "supplier",
    "vendor",
    "distributor",
    "contractor",
    "service_provider",
  ];

  const filteredParties = (parties as any[]).filter((party: any) => {
    const matchesSearch =
      party.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || party.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      supplier: "default",
      vendor: "secondary",
      distributor: "outline",
      contractor: "destructive",
      service_provider: "default",
    };
    return variants[type] || "outline";
  };

  const getBalanceBadge = (balance: any) => {
    const amount = parseFloat(balance || 0);
    if (amount > 0) {
      return { variant: "destructive" as const, text: `Dr. ${formatCurrency(amount)}` };
    } else if (amount < 0) {
      return { variant: "default" as const, text: `Cr. ${formatCurrency(Math.abs(amount))}` };
    }
    return { variant: "secondary" as const, text: formatCurrency(0) };
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;
    
    ledgerTransactions.forEach((txn: LedgerTransaction) => {
      totalDebit += parseFloat(txn.debitAmount) || 0;
      totalCredit += parseFloat(txn.creditAmount) || 0;
    });

    return { totalDebit, totalCredit };
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
    console.error("Error loading parties:", error);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Manage suppliers, vendors, and business partners with complete transaction history
          </p>
        </div>
        <PermissionWrapper resource="parties" action="write">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingParty(null);
                setSelectedType("");
                setFormErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingParty(null);
                  setSelectedType("");
                  setFormErrors({});
                }}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Party
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingParty ? "Edit Party" : "Add New Party"}
                </DialogTitle>
                <DialogDescription>Enter party details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Party Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter party name"
                      defaultValue={editingParty?.name || ""}
                      className={formErrors.name ? "border-red-500" : ""}
                      required
                    />
                    {formErrors.name && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {formErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Party Type *</Label>
                    <Select
                      value={selectedType || editingParty?.type || ""}
                      onValueChange={setSelectedType}
                    >
                      <SelectTrigger className={formErrors.type ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select party type" />
                      </SelectTrigger>
                      <SelectContent>
                        {partyTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() +
                              type.slice(1).replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="type" value={selectedType || editingParty?.type || ""} />
                    {formErrors.type && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {formErrors.type}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter email address"
                      defaultValue={editingParty?.email || ""}
                      className={formErrors.email ? "border-red-500" : ""}
                    />
                    {formErrors.email && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {formErrors.email}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Enter phone number"
                      defaultValue={editingParty?.phone || ""}
                      className={formErrors.phone ? "border-red-500" : ""}
                    />
                    {formErrors.phone && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {formErrors.phone}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      placeholder="Enter contact person name"
                      defaultValue={editingParty?.contactPerson || ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      placeholder="Enter tax ID or VAT number"
                      defaultValue={editingParty?.taxId || ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Enter complete address"
                    defaultValue={editingParty?.address || ""}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    name="openingBalance"
                    type="number"
                    step="0.01"
                    placeholder="Enter opening balance (positive for debit, negative for credit)"
                    defaultValue={editingParty?.openingBalance || "0"}
                    className={formErrors.openingBalance ? "border-red-500" : ""}
                  />
                  <p className="text-sm text-muted-foreground">
                    Positive values represent amounts owed to you (debit), negative values represent amounts you owe (credit)
                  </p>
                  {formErrors.openingBalance && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.openingBalance}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Enter any additional notes"
                    defaultValue={editingParty?.notes || ""}
                    rows={3}
                  />
                </div>

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
                    {editingParty ? "Update Party" : "Create Party"}
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
            <CardTitle>Parties List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {partyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() +
                        type.slice(1).replace("_", " ")}
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
                    <TableHead>Party Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact Info</TableHead>
                    <TableHead>Account Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParties.map((party: any) => {
                    const balanceInfo = getBalanceBadge(party.currentBalance);
                    return (
                      <TableRow key={party.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Building className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{party.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {party.contactPerson && `Contact: ${party.contactPerson}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadge(party.type)}>
                            {party.type?.charAt(0).toUpperCase() +
                              party.type?.slice(1).replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            {party.email && <div>{party.email}</div>}
                            {party.phone && (
                              <div className="text-muted-foreground">
                                {party.phone}
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
                            <PermissionWrapper resource="parties" action="read">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedParty(party);
                                  setIsLedgerDialogOpen(true);
                                }}
                                title="View Ledger"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PermissionWrapper>
                            <PermissionWrapper resource="parties" action="write">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedParty(party);
                                  setIsTransactionDialogOpen(true);
                                }}
                                title="Add Transaction"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingParty(party);
                                  setSelectedType(party.type || "");
                                  setFormErrors({});
                                  setIsDialogOpen(true);
                                }}
                                title="Edit Party"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(party.id)}
                                disabled={deleteMutation.isPending}
                                title="Delete Party"
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
              {filteredParties.length === 0 && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No parties found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || typeFilter !== "all"
                      ? "Try adjusting your search criteria"
                      : "Start by adding your first party"}
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Party
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => {
        setIsTransactionDialogOpen(open);
        if (!open) {
          setTransactionType("");
          setTransactionErrors({});
        }
      }}>
        <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Transaction for {selectedParty?.name}
            </DialogTitle>
            <DialogDescription className="text-base">
              Record a new transaction to track debits and credits for this party
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransactionSave} className="space-y-6">
            {/* Transaction Type Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionType" className="text-sm font-medium">
                      Transaction Type *
                    </Label>
                    <Select 
                      value={transactionType} 
                      onValueChange={setTransactionType} 
                      required
                    >
                      <SelectTrigger className={transactionErrors.transactionType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">
                          <div className="flex flex-col">
                            <span className="font-medium">Purchase</span>
                            <span className="text-xs text-muted-foreground">We owe them (Debit)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="payment_sent">
                          <div className="flex flex-col">
                            <span className="font-medium">Payment Sent</span>
                            <span className="text-xs text-muted-foreground">We paid them (Credit)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="adjustment_debit">
                          <div className="flex flex-col">
                            <span className="font-medium">Adjustment (Debit)</span>
                            <span className="text-xs text-muted-foreground">Increase what they owe us</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="adjustment_credit">
                          <div className="flex flex-col">
                            <span className="font-medium">Adjustment (Credit)</span>
                            <span className="text-xs text-muted-foreground">Decrease what they owe us</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {transactionErrors.transactionType && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {transactionErrors.transactionType}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transactionDate" className="text-sm font-medium">
                      Transaction Date *
                    </Label>
                    <Input
                      id="transactionDate"
                      name="transactionDate"
                      type="date"
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      className={transactionErrors.transactionDate ? "border-red-500" : ""}
                      required
                    />
                    {transactionErrors.transactionDate && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {transactionErrors.transactionDate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description *
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Enter detailed transaction description"
                    className={transactionErrors.description ? "border-red-500" : ""}
                    required
                  />
                  {transactionErrors.description && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {transactionErrors.description}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Amount and Payment Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Amount *
                    </Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className={transactionErrors.amount ? "border-red-500" : ""}
                      required
                    />
                    {transactionErrors.amount && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {transactionErrors.amount}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm font-medium">
                      Payment Method
                    </Label>
                    <Select name="paymentMethod">
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber" className="text-sm font-medium">
                    Reference Number
                  </Label>
                  <Input
                    id="referenceNumber"
                    name="referenceNumber"
                    placeholder="Invoice number, receipt number, etc. (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter invoice number, receipt number, or any reference for this transaction
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any additional notes, terms, or conditions (optional)"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Impact Preview */}
            {transactionType && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">Account Impact</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    {transactionType === "purchase" && "This will increase the amount owed to the party (Debit their account)"}
                    {transactionType === "payment_sent" && "This will decrease the amount owed to the party (Credit their account)"}
                    {transactionType === "adjustment_debit" && "This will increase the party's account balance (Debit adjustment)"}
                    {transactionType === "adjustment_credit" && "This will decrease the party's account balance (Credit adjustment)"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTransactionDialogOpen(false);
                  setTransactionType("");
                  setTransactionErrors({});
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={transactionMutation.isPending || !transactionType}
                className="w-full sm:w-auto"
              >
                {transactionMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Transaction...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ledger View Dialog */}
      <Dialog open={isLedgerDialogOpen} onOpenChange={setIsLedgerDialogOpen}>
        <DialogContent className="max-w-6xl mx-auto max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Party Ledger - {selectedParty?.name}</DialogTitle>
                <DialogDescription>
                  Complete transaction history with debit/credit tracking
                </DialogDescription>
              </div>
              <Button variant="outline" onClick={exportLedger}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Debits</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(calculateTotals().totalDebit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Credits</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(calculateTotals().totalCredit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Net Balance</div>
                <div className={`text-lg font-semibold ${
                  parseFloat(selectedParty?.currentBalance || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {getBalanceBadge(selectedParty?.currentBalance).text}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerTransactions.map((transaction: LedgerTransaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        {transaction.notes && (
                          <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.referenceNumber || '-'}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(transaction.debitAmount) > 0 
                        ? <span className="text-red-600 font-medium">
                            {formatCurrency(parseFloat(transaction.debitAmount))}
                          </span>
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(transaction.creditAmount) > 0 
                        ? <span className="text-green-600 font-medium">
                            {formatCurrency(parseFloat(transaction.creditAmount))}
                          </span>
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={parseFloat(transaction.runningBalance) >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(parseFloat(transaction.runningBalance)))}
                        {parseFloat(transaction.runningBalance) >= 0 ? ' Dr' : ' Cr'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found. Click the "+" button to add the first transaction.
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
