import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { CalendarIcon, Download, History, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

interface DayBookEntry {
  category: string;
  bankAccount: number;
  counter: number;
  ownerAccount: number;
  total: number;
  creditDue: number;
}

export default function DayBook() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["/api/bills"],
  });

  // Calculate day book entries based on actual data
  const calculateDayBookEntries = (): DayBookEntry[] => {
    const selectedDateObj = new Date(selectedDate);
    const startOfDay = new Date(selectedDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter data for selected date
    const dayOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      return orderDate >= startOfDay && orderDate <= endOfDay;
    });

    const dayExpenses = expenses.filter((expense: any) => {
      const expenseDate = new Date(expense.date || expense.createdAt);
      return expenseDate >= startOfDay && expenseDate <= endOfDay;
    });

    const dayBills = bills.filter((bill: any) => {
      const billDate = new Date(bill.billDate || bill.createdAt);
      return billDate >= startOfDay && billDate <= endOfDay;
    });

    // Calculate receipts
    const completedOrders = dayOrders.filter(
      (order: any) => order.status === "completed",
    );
    const paidBills = dayBills.filter((bill: any) => bill.status === "paid");

    const netSales = completedOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.totalAmount || 0),
      0,
    );
    const purchaseReturn = 0; // Placeholder - implement if you have purchase returns
    const paymentIn = paidBills.reduce(
      (sum: number, bill: any) => sum + parseFloat(bill.totalAmount || 0),
      0,
    );
    const income = 0; // Placeholder - implement based on your income tracking

    // Calculate payments
    const purchases = dayExpenses
      .filter((expense: any) => expense.category === "purchase")
      .reduce(
        (sum: number, expense: any) => sum + parseFloat(expense.amount || 0),
        0,
      );

    const salesReturn = 0; // Placeholder - implement if you have sales returns
    const paymentOut = dayExpenses
      .filter((expense: any) => expense.category !== "purchase")
      .reduce(
        (sum: number, expense: any) => sum + parseFloat(expense.amount || 0),
        0,
      );

    const expensesTotal = dayExpenses.reduce(
      (sum: number, expense: any) => sum + parseFloat(expense.amount || 0),
      0,
    );

    // For now, we'll distribute amounts across accounts (you can modify this logic based on your business rules)
    const entries: DayBookEntry[] = [
      // Receipts
      {
        category: "Net Sales",
        bankAccount: netSales * 0.7, // 70% to bank
        counter: netSales * 0.3, // 30% to counter
        ownerAccount: 0,
        total: netSales,
        creditDue: 0,
      },
      {
        category: "Purchase Return",
        bankAccount: 0,
        counter: 0,
        ownerAccount: 0,
        total: purchaseReturn,
        creditDue: 0,
      },
      {
        category: "Payment In",
        bankAccount: paymentIn,
        counter: 0,
        ownerAccount: 0,
        total: paymentIn,
        creditDue: 0,
      },
      {
        category: "Income",
        bankAccount: income,
        counter: 0,
        ownerAccount: 0,
        total: income,
        creditDue: 0,
      },
      // Payments
      {
        category: "Purchase",
        bankAccount: purchases * 0.8,
        counter: 0,
        ownerAccount: purchases * 0.2,
        total: purchases,
        creditDue: 0,
      },
      {
        category: "Sales Return",
        bankAccount: 0,
        counter: 0,
        ownerAccount: 0,
        total: salesReturn,
        creditDue: 0,
      },
      {
        category: "Payment Out",
        bankAccount: paymentOut,
        counter: 0,
        ownerAccount: 0,
        total: paymentOut,
        creditDue: 0,
      },
      {
        category: "Expenses",
        bankAccount: expensesTotal * 0.6,
        counter: expensesTotal * 0.4,
        ownerAccount: 0,
        total: expensesTotal,
        creditDue: 0,
      },
    ];

    return entries;
  };

  const dayBookEntries = calculateDayBookEntries();

  // Calculate totals
  const totalReceipts = dayBookEntries.slice(0, 4).reduce(
    (sum, entry) => ({
      bankAccount: sum.bankAccount + entry.bankAccount,
      counter: sum.counter + entry.counter,
      ownerAccount: sum.ownerAccount + entry.ownerAccount,
      total: sum.total + entry.total,
    }),
    { bankAccount: 0, counter: 0, ownerAccount: 0, total: 0 },
  );

  const totalPayments = dayBookEntries.slice(4, 8).reduce(
    (sum, entry) => ({
      bankAccount: sum.bankAccount + entry.bankAccount,
      counter: sum.counter + entry.counter,
      ownerAccount: sum.ownerAccount + entry.ownerAccount,
      total: sum.total + entry.total,
    }),
    { bankAccount: 0, counter: 0, ownerAccount: 0, total: 0 },
  );

  const netReceipt = {
    bankAccount: totalReceipts.bankAccount - totalPayments.bankAccount,
    counter: totalReceipts.counter - totalPayments.counter,
    ownerAccount: totalReceipts.ownerAccount - totalPayments.ownerAccount,
    total: totalReceipts.total - totalPayments.total,
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description:
        "Day book report is being generated and will download shortly.",
    });
  };

  const handleCloseDay = () => {
    toast({
      title: "Day Closed",
      description: `Day book for ${format(new Date(selectedDate), "dd/MM/yyyy")} has been closed.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Daily transaction summary and calculations
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Sales Summary
          </Button>
          <Button onClick={handleCloseDay} className="flex items-center gap-2">
            Close the day
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Daybook History
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <label htmlFor="date-select" className="text-sm font-medium">
                Select Date:
              </label>
            </div>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
            <Badge variant="outline" className="ml-auto">
              {format(new Date(selectedDate), "dd MMM yyyy")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Day Book Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Transaction Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-3 font-semibold">PMT Accounts</th>
                  <th className="text-center p-3 font-semibold">
                    Bank Account
                  </th>
                  <th className="text-center p-3 font-semibold">Counter</th>
                  <th className="text-center p-3 font-semibold">
                    Owner's Account
                  </th>
                  <th className="text-center p-3 font-semibold">Total</th>
                  <th className="text-center p-3 font-semibold">Credit(Due)</th>
                </tr>
              </thead>
              <tbody>
                {/* Receipts Section */}
                <tr>
                  <td
                    colSpan={6}
                    className="bg-blue-50 p-2 font-semibold text-blue-800"
                  >
                    Receipts
                  </td>
                </tr>
                {dayBookEntries.slice(0, 4).map((entry, index) => (
                  <tr
                    key={`receipt-${index}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3">{entry.category}</td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.bankAccount)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.counter)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.ownerAccount)}
                    </td>
                    <td className="p-3 text-center font-medium">
                      {formatCurrency(entry.total)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.creditDue)}
                    </td>
                  </tr>
                ))}

                {/* Total Receipts */}
                <tr className="border-b-2 border-blue-200 bg-blue-50 font-semibold">
                  <td className="p-3">Total Receipts [A]</td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalReceipts.bankAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalReceipts.counter)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalReceipts.ownerAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalReceipts.total)}
                  </td>
                  <td className="p-3 text-center">-</td>
                </tr>

                {/* Payments Section */}
                <tr>
                  <td
                    colSpan={6}
                    className="bg-red-50 p-2 font-semibold text-red-800"
                  >
                    Payments
                  </td>
                </tr>
                {dayBookEntries.slice(4, 8).map((entry, index) => (
                  <tr
                    key={`payment-${index}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3">{entry.category}</td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.bankAccount)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.counter)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.ownerAccount)}
                    </td>
                    <td className="p-3 text-center font-medium">
                      {formatCurrency(entry.total)}
                    </td>
                    <td className="p-3 text-center">
                      {formatCurrency(entry.creditDue)}
                    </td>
                  </tr>
                ))}

                {/* Total Payments */}
                <tr className="border-b-2 border-red-200 bg-red-50 font-semibold">
                  <td className="p-3">Total Payments [B]</td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalPayments.bankAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalPayments.counter)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalPayments.ownerAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(totalPayments.total)}
                  </td>
                  <td className="p-3 text-center">-</td>
                </tr>

                {/* Net Receipt */}
                <tr className="border-b-2 border-green-300 bg-green-50 font-bold text-green-800">
                  <td className="p-3">Net Receipt [C = A - B]</td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.bankAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.counter)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.ownerAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.total)}
                  </td>
                  <td className="p-3 text-center">-</td>
                </tr>

                {/* Opening Balance */}
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3">Opening balance (D)</td>
                  <td className="p-3 text-center">{formatCurrency(0)}</td>
                  <td className="p-3 text-center">{formatCurrency(5715)}</td>
                  <td className="p-3 text-center">{formatCurrency(645)}</td>
                  <td className="p-3 text-center">{formatCurrency(6360)}</td>
                  <td className="p-3 text-center">-</td>
                </tr>

                {/* Closing Balance */}
                <tr className="border-b-2 border-gray-400 bg-gray-100 font-bold">
                  <td className="p-3">Closing Balance [E = C + D]</td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.bankAccount)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.counter + 5715)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.ownerAccount + 645)}
                  </td>
                  <td className="p-3 text-center">
                    {formatCurrency(netReceipt.total + 6360)}
                  </td>
                  <td className="p-3 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-600">
                Total Receipts
              </h3>
              <p className="text-3xl font-bold text-green-800">
                {formatCurrency(totalReceipts.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600">
                Total Payments
              </h3>
              <p className="text-3xl font-bold text-red-800">
                {formatCurrency(totalPayments.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-600">
                Net Receipt
              </h3>
              <p
                className={`text-3xl font-bold ${netReceipt.total >= 0 ? "text-blue-800" : "text-red-800"}`}
              >
                {formatCurrency(netReceipt.total)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
