import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "/api/audit-logs",
      page,
      limit,
      actionFilter,
      resourceFilter,
      statusFilter,
      dateFilter.startDate,
      dateFilter.endDate,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(resourceFilter !== "all" && { resource: resourceFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(dateFilter.startDate && { startDate: dateFilter.startDate }),
        ...(dateFilter.endDate && { endDate: dateFilter.endDate }),
      });
      return apiRequest(`/api/audit-logs?${params.toString()}`, "GET");
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/audit-logs/analytics"],
    queryFn: () => apiRequest("/api/audit-logs/analytics", "GET"),
  });

  const { data: loginAnalytics } = useQuery({
    queryKey: ["/api/login-logs/analytics"],
    queryFn: () => apiRequest("/api/login-logs/analytics", "GET"),
  });

  const auditLogs = data?.auditLogs || [];
  const pagination = data?.pagination || {};

  const getActionBadge = (action: string) => {
    const colors = {
      CREATE: "bg-green-100 text-green-800 border-green-200",
      UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
      DELETE: "bg-red-100 text-red-800 border-red-200",
      READ: "bg-gray-100 text-gray-800 border-gray-200",
      LOGIN: "bg-purple-100 text-purple-800 border-purple-200",
      LOGOUT: "bg-orange-100 text-orange-800 border-orange-200",
      EXPORT: "bg-yellow-100 text-yellow-800 border-yellow-200",
      IMPORT: "bg-indigo-100 text-indigo-800 border-indigo-200",
      VIEW: "bg-teal-100 text-teal-800 border-teal-200",
    };

    const actionClass =
      colors[action as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <Badge className={`${actionClass} font-medium border`}>{action}</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const isSuccess = status === "success";
    return (
      <Badge
        variant={isSuccess ? "default" : "destructive"}
        className={`flex items-center gap-1 ${isSuccess ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}
      >
        {isSuccess ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {isSuccess ? "Success" : "Failed"}
      </Badge>
    );
  };

  const getResourceIcon = (resource: string) => {
    const icons: { [key: string]: string } = {
      staff: "👥",
      product: "📦",
      customer: "👤",
      order: "🛒",
      inventory: "📊",
      settings: "⚙️",
      users: "🔐",
      reports: "📋",
      production: "🏭",
      expenses: "💰",
      sales: "💳",
      purchases: "🛍️",
      assets: "🏢",
      parties: "🤝",
      attendance: "📅",
      salary: "💵",
      leave_requests: "🏖️",
    };
    return icons[resource] || "📄";
  };

  const filteredLogs = auditLogs.filter(
    (log: any) =>
      searchTerm === "" ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resourceId &&
        log.resourceId.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredLogs,
    "timestamp",
  );

  const exportLogs = async () => {
    try {
      const response = await apiRequest("/api/audit-logs/export", "GET");
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export logs:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-muted-foreground">
            Complete activity trail for security monitoring and compliance
          </p>
        </div>
        <Button variant="outline" onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.totalActions}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Activities
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(analytics.actionsByUser || {}).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Active Users
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.actionsByType?.CREATE || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Items Created
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {analytics.actionsByType?.UPDATE || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Items Modified
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Login Analytics */}
      {loginAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Summary (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {loginAnalytics.successCount?.[0]?.count || 0}
                </div>
                <p className="text-sm text-green-700">Successful Logins</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {loginAnalytics.failureCount?.[0]?.count || 0}
                </div>
                <p className="text-sm text-red-700">Failed Attempts</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {loginAnalytics.topLocations?.length || 0}
                </div>
                <p className="text-sm text-blue-700">Login Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search users, actions, resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="READ">Read</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="IMPORT">Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource">Resource</Label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchases">Purchases</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="parties">Parties</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="leave_requests">Leave Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="text-xs"
                />
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({sortedData.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">
                Loading audit logs...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="timestamp"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Timestamp
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="userName"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      User
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="action"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Action
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="resource"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Resource
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="ipAddress"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      IP Address
                    </SortableTableHeader>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {format(
                          new Date(log.timestamp),
                          "MMM dd, yyyy HH:mm:ss",
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getResourceIcon(log.resource)}
                          </span>
                          <div>
                            <div className="font-medium capitalize">
                              {log.resource.replace("_", " ")}
                            </div>
                            {log.resourceId && (
                              <div className="text-sm text-muted-foreground font-mono">
                                ID: {log.resourceId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Audit Log Details
                              </DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="font-semibold">
                                      User
                                    </Label>
                                    <p className="text-sm mt-1">
                                      {selectedLog.userName} (
                                      {selectedLog.userEmail})
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">
                                      Action
                                    </Label>
                                    <div className="mt-1">
                                      {getActionBadge(selectedLog.action)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">
                                      Resource
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-lg">
                                        {getResourceIcon(selectedLog.resource)}
                                      </span>
                                      <span className="text-sm capitalize">
                                        {selectedLog.resource.replace("_", " ")}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">
                                      Status
                                    </Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedLog.status)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">
                                      IP Address
                                    </Label>
                                    <p className="text-sm mt-1 font-mono">
                                      {selectedLog.ipAddress}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">
                                      Timestamp
                                    </Label>
                                    <p className="text-sm mt-1 font-mono">
                                      {format(
                                        new Date(selectedLog.timestamp),
                                        "PPpp",
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {selectedLog.details && (
                                  <div>
                                    <Label className="font-semibold">
                                      Request Details
                                    </Label>
                                    <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto mt-2 border">
                                      {JSON.stringify(
                                        selectedLog.details,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.oldValues && (
                                  <div>
                                    <Label className="font-semibold">
                                      Previous Values
                                    </Label>
                                    <pre className="text-xs bg-red-50 p-3 rounded-lg overflow-x-auto mt-2 border border-red-200">
                                      {JSON.stringify(
                                        selectedLog.oldValues,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.newValues && (
                                  <div>
                                    <Label className="font-semibold">
                                      New Values
                                    </Label>
                                    <pre className="text-xs bg-green-50 p-3 rounded-lg overflow-x-auto mt-2 border border-green-200">
                                      {JSON.stringify(
                                        selectedLog.newValues,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.errorMessage && (
                                  <div>
                                    <Label className="font-semibold text-red-600">
                                      Error Message
                                    </Label>
                                    <div className="text-sm bg-red-50 p-3 rounded-lg mt-2 border border-red-200 text-red-800">
                                      {selectedLog.errorMessage}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {sortedData.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No audit logs found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                actionFilter !== "all" ||
                resourceFilter !== "all"
                  ? "Try adjusting your filters"
                  : "System activities will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
