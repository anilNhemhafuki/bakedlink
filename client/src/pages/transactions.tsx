import { useState, useMemo, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Search, Filter, Download, Eye, Calendar, FileText, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

// Assume useTableSort and usePagination are custom hooks providing sorting and pagination logic
// Example stubs:
const useTableSort = (data: any[], defaultSortColumn: string) => {
  const [sortConfig, setSortConfig] = useState({
    key: defaultSortColumn,
    direction: "ascending",
  });

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  return { sortedData, sortConfig, requestSort };
};

const usePagination = (data: any[], initialPageSize: number) => {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentItems,
    currentPage,
    totalPages,
    pageSize,
    setPageSize,
    goToPage,
    totalItems,
  };
};

// Assume SortableTableHeader, PaginationInfo, PageSizeSelector, Pagination are UI components
const SortableTableHeader = ({
  children,
  sortKey,
  sortConfig,
  onSort,
  className,
}: any) => {
  const isSorted = sortConfig.key === sortKey;
  const icon =
    sortConfig.key === sortKey
      ? sortConfig.direction === "ascending"
        ? " ▲"
        : " ▼"
      : "";
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        className="p-0 h-auto"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {isSorted && <span className="ml-1">{icon}</span>}
      </Button>
    </TableHead>
  );
};

const PaginationInfo = ({ currentPage, totalPages, totalItems }: any) => (
  <div className="text-sm text-muted-foreground">
    Page {currentPage} of {totalPages} ({totalItems} items)
  </div>
);

const PageSizeSelector = ({ pageSize, onPageSizeChange, options }: any) => (
  <Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(parseInt(val))}>
    <SelectTrigger className="w-[100px]">
      <SelectValue placeholder="Page Size" />
    </SelectTrigger>
    <SelectContent>
      {options.map((size: number) => (
        <SelectItem key={size} value={size.toString()}>
          Show {size}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Pagination = ({ currentPage, totalPages, onPageChange }: any) => (
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
    >
      Previous
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next
    </Button>
  </div>
);

interface Transaction {
  id: string;
  entryDate: string;
  txnDate: string;
  txnNo: string;
  particular: string;
  txnType: string;
  parties: string;
  pmtMode: string;
  amount: number;
  status: string;
  entryBy: string;
  category: string;
}

interface SupplierTransaction {
  id: number;
  supplierId: number;
  supplierName: string;
  purchaseId: number;
  date: string;
  invoiceNumber?: string;
  items: string;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  runningBalance: number;
  paymentStatus: "Paid" | "Partial" | "Due";
  paymentMethod: string;
  transactionType: "Purchase" | "Payment";
}

interface SupplierLedger {
  supplierId: number;
  supplierName: string;
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
  currentBalance: number;
  transactions: SupplierTransaction[];
}

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("all");
  const [supplierLedgerOpen, setSupplierLedgerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierLedger | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [supplierDateRange, setSupplierDateRange] = useState("all");
  const [supplierPaymentStatus, setSupplierPaymentStatus] = useState("all");
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  // Fetch all data sources
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["/api/sales"],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/purchases"],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Fetch parties (suppliers)
  const { data: suppliers = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/parties");
        const partiesData = Array.isArray(res) ? res : res.parties || res.data || [];
        return Array.isArray(partiesData) ? partiesData : [];
      } catch (error) {
        console.error("Failed to fetch parties:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  const { data: supplierLedgers = [] } = useQuery({
    queryKey: ["/api/supplier-ledgers"],
  });

  // Combine all transactions
  const allTransactions = useMemo(() => {
    const transactions: Transaction[] = [];
    let counter = 1;

    // Add sales transactions
    sales.forEach((sale: any) => {
      transactions.push({
        id: `S-${sale.id}`,
        entryDate: format(new Date(sale.createdAt), "yyyy-MM-dd"),
        txnDate: format(
          new Date(sale.saleDate || sale.createdAt),
          "yyyy-MM-dd",
        ),
        txnNo: `INV-${sale.id}`,
        particular: sale.customerName || "Walk-in Customer",
        txnType: "Sales",
        parties: sale.customerName || "-",
        pmtMode: sale.paymentMethod || "Cash",
        amount: parseFloat(sale.totalAmount),
        status: "Paid",
        entryBy: sale.createdBy || "System",
        category: "Income",
      });
    });

    // Add purchase transactions
    purchases.forEach((purchase: any) => {
      transactions.push({
        id: `P-${purchase.id}`,
        entryDate: format(new Date(purchase.createdAt), "yyyy-MM-dd"),
        txnDate: format(
          new Date(purchase.purchaseDate || purchase.createdAt),
          "yyyy-MM-dd",
        ),
        txnNo: `PUR-${purchase.id}`,
        particular: purchase.supplierName || "Supplier",
        txnType: "Purchase",
        parties: purchase.supplierName || "-",
        pmtMode: purchase.paymentMethod || "Cash",
        amount: parseFloat(purchase.totalAmount),
        status: purchase.status === "completed" ? "Paid" : "Pending",
        entryBy: purchase.createdBy || "System",
        category: "Expense",
      });
    });

    // Add order transactions (as income when completed)
    orders.forEach((order: any) => {
      if (order.status === "completed") {
        transactions.push({
          id: `O-${order.id}`,
          entryDate: format(new Date(order.createdAt), "yyyy-MM-dd"),
          txnDate: format(
            new Date(order.orderDate || order.createdAt),
            "yyyy-MM-dd",
          ),
          txnNo: `ORD-${order.id}`,
          particular: order.customerName,
          txnType: "Sales",
          parties: order.customerName || "-",
          pmtMode: "Cash",
          amount: parseFloat(order.totalAmount),
          status: "Paid",
          entryBy: order.createdBy || "System",
          category: "Income",
        });
      }
    });

    // Add expense transactions
    expenses.forEach((expense: any) => {
      transactions.push({
        id: `E-${expense.id}`,
        entryDate: format(new Date(expense.createdAt), "yyyy-MM-dd"),
        txnDate: format(
          new Date(expense.date || expense.createdAt),
          "yyyy-MM-dd",
        ),
        txnNo: `EXP-${expense.id}`,
        particular: expense.description || expense.category,
        txnType: "Expense",
        parties: expense.vendor || "-",
        pmtMode: expense.paymentMethod || "Cash",
        amount: parseFloat(expense.amount),
        status: "Paid",
        entryBy: expense.createdBy || "System",
        category: "Expense",
      });
    });

    // Sort by date (newest first)
    return transactions.sort(
      (a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime(),
    );
  }, [orders, sales, purchases, expenses]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Date range filter
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter((txn) => new Date(txn.txnDate) >= cutoffDate);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (txn) =>
          txn.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.txnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.parties.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (txn) => txn.txnType.toLowerCase() === typeFilter.toLowerCase(),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (txn) => txn.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    return filtered;
  }, [allTransactions, searchTerm, typeFilter, statusFilter, dateRange]);

  // Add sorting functionality
  const { sortedData, sortConfig, requestSort } = useTableSort(
    allTransactions,
    "txnDate",
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
  } = usePagination(sortedData, 15);

  // Calculate summary stats
  const stats = useMemo(() => {
    const sales = filteredTransactions
      .filter((t) => t.category === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    const purchases = filteredTransactions
      .filter((t) => t.txnType === "Purchase")
      .reduce((sum, t) => sum + t.amount, 0);
    const income = filteredTransactions
      .filter((t) => t.category === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.category === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const paymentIn = filteredTransactions
      .filter((t) => t.category === "Income")
      .reduce((sum, t) => sum + t.amount, 0);
    const paymentOut = filteredTransactions
      .filter((t) => t.category === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { sales, purchases, income, expenses, paymentIn, paymentOut };
  }, [filteredTransactions]);

  // Process supplier ledger data
  const processedSupplierLedgers = useMemo(() => {
    const ledgerMap = new Map<number, SupplierLedger>();

    // Initialize ledgers for all suppliers
    suppliers.forEach((supplier: any) => {
      ledgerMap.set(supplier.id, {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalPurchases: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        currentBalance: 0,
        transactions: [],
      });
    });

    // Process purchases
    purchases.forEach((purchase: any) => {
      if (!purchase.partyId) return;

      const ledger = ledgerMap.get(purchase.partyId);
      if (!ledger) return;

      const totalAmount = parseFloat(purchase.totalAmount || "0");
      const amountPaid = purchase.status === "completed" ? totalAmount : 0;
      const outstanding = totalAmount - amountPaid;

      const transaction: SupplierTransaction = {
        id: purchase.id,
        supplierId: purchase.partyId,
        supplierName: purchase.supplierName,
        purchaseId: purchase.id,
        date: purchase.purchaseDate || purchase.createdAt,
        invoiceNumber: purchase.invoiceNumber,
        items: purchase.items?.map((item: any) => item.inventoryItemName).join(", ") || "N/A",
        totalAmount,
        amountPaid,
        outstanding,
        runningBalance: 0, // Will be calculated
        paymentStatus: purchase.status === "completed" ? "Paid" : outstanding > 0 ? (amountPaid > 0 ? "Partial" : "Due") : "Paid",
        paymentMethod: purchase.paymentMethod || "Cash",
        transactionType: "Purchase",
      };

      ledger.transactions.push(transaction);
      ledger.totalPurchases += totalAmount;
      ledger.totalPaid += amountPaid;
      ledger.totalOutstanding += outstanding;
    });

    // Calculate running balances and current balance for each supplier
    ledgerMap.forEach((ledger) => {
      let runningBalance = 0;

      // Sort transactions by date
      ledger.transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      ledger.transactions.forEach((transaction) => {
        if (transaction.transactionType === "Purchase") {
          runningBalance += transaction.outstanding; // Debit (increases payable)
        }
        transaction.runningBalance = runningBalance;
      });

      ledger.currentBalance = runningBalance;
    });

    return Array.from(ledgerMap.values()).filter(ledger => ledger.transactions.length > 0);
  }, [purchases, suppliers]);

  // Filter supplier ledgers
  const filteredSupplierLedgers = useMemo(() => {
    let filtered = processedSupplierLedgers;

    if (searchTerm) {
      filtered = filtered.filter(ledger =>
        ledger.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (supplierFilter !== "all") {
      filtered = filtered.filter(ledger => ledger.supplierId.toString() === supplierFilter);
    }

    if (supplierPaymentStatus !== "all") {
      filtered = filtered.filter(ledger => {
        return ledger.transactions.some(t => t.paymentStatus.toLowerCase() === supplierPaymentStatus.toLowerCase());
      });
    }

    if (supplierDateRange !== "all") {
      const days = parseInt(supplierDateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      filtered = filtered.map(ledger => ({
        ...ledger,
        transactions: ledger.transactions.filter(t => new Date(t.date) >= cutoffDate)
      })).filter(ledger => ledger.transactions.length > 0);
    }

    return filtered;
  }, [processedSupplierLedgers, searchTerm, supplierFilter, supplierPaymentStatus, supplierDateRange]);

  const handleSupplierLedgerView = (ledger: SupplierLedger) => {
    setSelectedSupplier(ledger);
    setSupplierLedgerOpen(true);
  };

  const getPaymentStatusBadge = (status: string, balance: number) => {
    if (balance > 0) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">🔴 Due</Badge>;
    } else if (balance < 0) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">🔵 Advance</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800">🟢 Paid</Badge>;
    }
  };

  const exportSupplierLedger = (ledger?: SupplierLedger) => {
    const dataToExport = ledger ? [ledger] : filteredSupplierLedgers;

    const csvContent = [
      ["Supplier", "Date", "Invoice", "Items", "Total Amount", "Amount Paid", "Outstanding", "Running Balance", "Payment Status"].join(","),
      ...dataToExport.flatMap(ledger => 
        ledger.transactions.map(txn => [
          ledger.supplierName,
          format(new Date(txn.date), "yyyy-MM-dd"),
          txn.invoiceNumber || "N/A",
          `"${txn.items.replace(/"/g, '""')}"`, // Properly escape quotes in items
          txn.totalAmount,
          txn.amountPaid,
          txn.outstanding,
          txn.runningBalance,
          txn.paymentStatus,
        ].join(","))
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Supplier ledger exported to CSV file",
    });
  };

  const exportTransactions = () => {
    const csvContent = [
      [
        "SN",
        "Entry Date",
        "TXN Date",
        "TXN No",
        "Particular",
        "TXN Type",
        "Parties",
        "PMT Mode",
        "Amount",
        "Status",
        "Entry By",
      ].join(","),
      ...filteredTransactions.map((txn, index) =>
        [
          index + 1,
          txn.entryDate,
          txn.txnDate,
          txn.txnNo,
          `"${txn.particular.replace(/"/g, '""')}"`, // Properly escape quotes
          txn.txnType,
          `"${txn.parties.replace(/"/g, '""')}"`, // Properly escape quotes
          txn.pmtMode,
          txn.amount,
          txn.status,
          txn.entryBy,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Transactions exported to CSV file",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction Management</h1>
          <p className="text-gray-600">
            All financial transactions and supplier ledgers in one place
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "supplier" && (
            <Button onClick={() => exportSupplierLedger()} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Ledger
            </Button>
          )}
          <Button onClick={exportTransactions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Transactions
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Sales
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(stats.sales)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Purchase
            </div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(stats.purchases)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Income
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(stats.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Expense
            </div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(stats.expenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Payment In
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(stats.paymentIn)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Payment Out
            </div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(stats.paymentOut)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="w-full"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            <Badge variant="secondary">
              {filteredTransactions.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">SN</TableHead>
                  <SortableTableHeader
                    sortKey="txnDate"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    TXN Date
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="txnNo"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    TXN No
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="particular"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Particular
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="txnType"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    TXN Type
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="parties"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Parties
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="pmtMode"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    PMT Mode
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="amount"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                    className="text-right"
                  >
                    Amount
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="status"
                    sortConfig={sortConfig}
                    onSort={requestSort}
                  >
                    Status
                  </SortableTableHeader>
                  <TableHead>Entry By</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((transaction, index) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>

                      <TableCell>{transaction.txnDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {transaction.txnNo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.particular}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.txnType === "Sales"
                              ? "default"
                              : transaction.txnType === "Purchase"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {transaction.txnType}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.parties}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.pmtMode}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={
                            transaction.category === "Income"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === "Paid" ? "default" : "secondary"
                          }
                          className={
                            transaction.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs text-blue-600 font-medium">
                              {transaction.entryBy.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm">{transaction.entryBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions found matching your criteria</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {allTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <PaginationInfo
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />
              <div className="flex items-center gap-4">
                <PageSizeSelector
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  options={[10, 15, 25, 50]}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="supplier" className="space-y-6">
          {/* Supplier Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Total Suppliers
                </div>
                <div className="text-lg font-bold">
                  {filteredSupplierLedgers.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Total Purchases
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(filteredSupplierLedgers.reduce((sum, ledger) => sum + ledger.totalPurchases, 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Total Outstanding
                </div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(filteredSupplierLedgers.reduce((sum, ledger) => sum + Math.max(0, ledger.currentBalance), 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Advance Paid
                </div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(Math.abs(filteredSupplierLedgers.reduce((sum, ledger) => sum + Math.min(0, ledger.currentBalance), 0)))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <SearchBar
                    placeholder="Search supplier ledgers..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="w-full"
                  />
                </div>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={supplierPaymentStatus} onValueChange={setSupplierPaymentStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supplierDateRange} onValueChange={setSupplierDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Ledger Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Supplier Ledgers</span>
                <Badge variant="secondary">
                  {filteredSupplierLedgers.length} suppliers
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead className="text-right">Total Purchases</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupplierLedgers.length > 0 ? (
                      filteredSupplierLedgers.map((ledger) => (
                        <TableRow key={ledger.supplierId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              {ledger.supplierName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(ledger.totalPurchases)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(ledger.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(ledger.totalOutstanding)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={ledger.currentBalance > 0 ? "text-red-600" : ledger.currentBalance < 0 ? "text-blue-600" : "text-green-600"}>
                              {formatCurrency(Math.abs(ledger.currentBalance))}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge("", ledger.currentBalance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSupplierLedgerView(ledger)}
                                title="View Ledger Details"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportSupplierLedger(ledger)}
                                title="Export Ledger"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                            <p>No supplier ledgers found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Ledger Detail Dialog */}
      <Dialog open={supplierLedgerOpen} onOpenChange={setSupplierLedgerOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedSupplier?.supplierName} - Transaction Ledger
            </DialogTitle>
            <DialogDescription>
              Complete transaction history and balance details
            </DialogDescription>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-6">
              {/* Supplier Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Total Purchases</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(selectedSupplier.totalPurchases)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Amount Paid</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedSupplier.totalPaid)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Outstanding</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(selectedSupplier.totalOutstanding)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground">Current Balance</div>
                    <div className={`text-lg font-bold ${selectedSupplier.currentBalance > 0 ? "text-red-600" : selectedSupplier.currentBalance < 0 ? "text-blue-600" : "text-green-600"}`}>
                      {formatCurrency(Math.abs(selectedSupplier.currentBalance))}
                      {selectedSupplier.currentBalance > 0 && " (Due)"}
                      {selectedSupplier.currentBalance < 0 && " (Advance)"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Amount Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right">Running Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSupplier.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(new Date(transaction.date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {transaction.invoiceNumber || `PUR-${transaction.purchaseId}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={transaction.items}>
                              {transaction.items}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(transaction.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(transaction.amountPaid)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(transaction.outstanding)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={transaction.runningBalance > 0 ? "text-red-600" : transaction.runningBalance < 0 ? "text-blue-600" : "text-green-600"}>
                                {formatCurrency(Math.abs(transaction.runningBalance))}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(transaction.paymentStatus, transaction.runningBalance)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.paymentMethod}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}