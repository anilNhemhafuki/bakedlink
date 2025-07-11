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
                  <TableHead>TXN Date</TableHead>
                  <TableHead>TXN No</TableHead>
                  <TableHead>Particular</TableHead>
                  <TableHead>TXN Type</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>PMT Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entry By</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn, index) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>

                    <TableCell>{txn.txnDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {txn.txnNo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {txn.particular}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          txn.txnType === "Sales"
                            ? "default"
                            : txn.txnType === "Purchase"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {txn.txnType}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.parties}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{txn.pmtMode}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          txn.category === "Income"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatCurrency(txn.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          txn.status === "Paid" ? "default" : "secondary"
                        }
                        className={
                          txn.status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs text-blue-600 font-medium">
                            {txn.entryBy.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm">{txn.entryBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
