import { useState, useMemo } from "react";
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
import { Search, Filter, Download, Eye, Calendar } from "lucide-react";
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

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
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
          txn.particular,
          txn.txnType,
          txn.parties,
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
          <p className="text-gray-600">
            All financial transactions in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportTransactions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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
    </div>
  );
}