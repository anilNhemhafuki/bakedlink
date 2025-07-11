import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCurrency } from "@/hooks/useCurrency";
import {
  FileText,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Settings,
  Download,
  HelpCircle,
  BookOpen,
} from "lucide-react";

export default function Reports() {
  const [timeRange, setTimeRange] = useState("30");
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(timeRange));

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "/api/analytics/sales",
      { startDate: startDate.toISOString(), endDate: new Date().toISOString() },
    ],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

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

  const exportReport = (reportType: string) => {
    toast({
      title: "Export Started",
      description: `${reportType} report is being generated and will download shortly.`,
    });
    // In a real implementation, this would trigger a download
  };

  const generateReport = (reportType: string) => {
    toast({
      title: "Report Generated",
      description: `${reportType} has been generated successfully.`,
    });
    // In a real implementation, this would generate the specific report
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Comprehensive business reports and analytics
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Need Help?
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learn more
          </Button>
        </div>
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounting Reports */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
              Accounting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Transaction List")}
            >
              Transaction List
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Day Book")}
            >
              Day Book
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Account Summary")}
            >
              Account Summary
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Trial Balance")}
            >
              Trial Balance
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Income Statement")}
            >
              Income Statement
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Balance Sheet")}
            >
              Balance Sheet
            </Button>
          </CardContent>
        </Card>

        {/* Tax Report (For Nepal) */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
              Tax Report (For Nepal)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Sales Register")}
            >
              Sales Register
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Sales Return Register")}
            >
              Sales Return Register
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Purchase Register")}
            >
              Purchase Register
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Purchase Return Register")}
            >
              Purchase Return Register
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("VAT Summary Report")}
            >
              VAT Summary Report
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Annex 13 Report")}
            >
              Annex 13 Report
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Annex 5 Materialized View Report")}
            >
              Annex 5 Materialized View Report
            </Button>
          </CardContent>
        </Card>

        {/* Purchase Report */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-red-600" />
              </div>
              Purchase Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Purchase VAT Reconciliation")}
            >
              Purchase VAT Reconciliation
            </Button>
          </CardContent>
        </Card>

        {/* Sales Report */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
              Sales Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Sales Master Report")}
            >
              Sales Master Report
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Sales Ledger")}
            >
              Sales Ledger
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Customer Monthly Sales")}
            >
              Customer Monthly Sales
            </Button>
          </CardContent>
        </Card>

        {/* Setting */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4 text-red-600" />
              </div>
              Setting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-red-100"
              onClick={() => generateReport("Account Heads")}
            >
              Account Heads
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(
                    analytics?.salesData?.reduce(
                      (sum: number, day: any) => sum + day.sales,
                      0,
                    ) || 0,
                  )}
                </p>
                <p className="text-sm text-green-600">Last {timeRange} days</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.salesData?.reduce(
                    (sum: number, day: any) => sum + day.orders,
                    0,
                  ) || 0}
                </p>
                <p className="text-sm text-blue-600">Last {timeRange} days</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Average Order
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(
                    analytics?.salesData?.length > 0
                      ? analytics.salesData.reduce(
                          (sum: number, day: any) => sum + day.sales,
                          0,
                        ) /
                          analytics.salesData.reduce(
                            (sum: number, day: any) => sum + day.orders,
                            0,
                          )
                      : 0,
                  )}
                </p>
                <p className="text-sm text-purple-600">Per order value</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Products in Stock
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.productsInStock || 0}
                </p>
                <p className="text-sm text-orange-600">
                  {stats?.lowStockItems || 0} low stock
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => exportReport("All Accounting Reports")}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Accounting Reports
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport("Tax Reports")}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Tax Reports
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport("Sales Reports")}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Sales Reports
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport("Purchase Reports")}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Purchase Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
