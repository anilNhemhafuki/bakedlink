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
import { Shield, Calendar, Download, Filter, Search, Eye, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/audit-logs", page, limit, actionFilter, resourceFilter],
    queryFn: () => apiRequest(`/api/audit-logs?page=${page}&limit=${limit}&action=${actionFilter === 'all' ? '' : actionFilter}&resource=${resourceFilter === 'all' ? '' : resourceFilter}`, "GET"),
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/audit-logs/analytics"],
    queryFn: () => apiRequest("/api/audit-logs/analytics", "GET"),
  });

  const auditLogs = data?.auditLogs || [];
  const pagination = data?.pagination || {};

  const getActionBadge = (action: string) => {
    const colors = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      READ: "bg-gray-100 text-gray-800",
      LOGIN: "bg-purple-100 text-purple-800",
      LOGOUT: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge className={colors[action as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {action}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "success" ? "default" : "destructive"}>
        {status === "success" ? "Success" : "Failed"}
      </Badge>
    );
  };

  const filteredLogs = auditLogs.filter((log: any) =>
    log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Monitor all user activities and system actions</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{analytics.totalActions}</div>
              <p className="text-sm text-muted-foreground">Total Actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(analytics.actionsByUser || {}).length}
              </div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {analytics.actionsByType?.CREATE || 0}
              </div>
              <p className="text-sm text-muted-foreground">Items Created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {analytics.actionsByType?.UPDATE || 0}
              </div>
              <p className="text-sm text-muted-foreground">Items Modified</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by user, action, or resource..."
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
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading audit logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName}</div>
                          <div className="text-sm text-muted-foreground">{log.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.resource}</div>
                          {log.resourceId && (
                            <div className="text-sm text-muted-foreground">ID: {log.resourceId}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Audit Log Details</DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>User</Label>
                                    <p className="text-sm">{selectedLog.userName} ({selectedLog.userEmail})</p>
                                  </div>
                                  <div>
                                    <Label>Action</Label>
                                    <p className="text-sm">{getActionBadge(selectedLog.action)}</p>
                                  </div>
                                  <div>
                                    <Label>Resource</Label>
                                    <p className="text-sm">{selectedLog.resource}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <p className="text-sm">{getStatusBadge(selectedLog.status)}</p>
                                  </div>
                                </div>

                                {selectedLog.details && (
                                  <div>
                                    <Label>Request Details</Label>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.oldValues && (
                                  <div>
                                    <Label>Old Values</Label>
                                    <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.newValues && (
                                  <div>
                                    <Label>New Values</Label>
                                    <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(selectedLog.newValues, null, 2)}
                                    </pre>
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
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} entries
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
        </CardContent>
      </Card>
    </div>
  );
}