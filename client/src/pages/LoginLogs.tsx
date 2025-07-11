import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Shield,
  Clock,
  MapPin,
  Monitor,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/theme-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { LoginLog } from "@shared/schema";

interface LoginLogsResponse {
  logs: LoginLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface LoginAnalytics {
  successCount: number;
  failureCount: number;
  topLocations: Array<{ location: string; count: number }>;
  deviceTypes: Array<{ deviceType: string; count: number }>;
}

export default function LoginLogs() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 20;

  // Fetch login logs with pagination
  const { data: logsData, isLoading: logsLoading } =
    useQuery<LoginLogsResponse>({
      queryKey: ["/api/login-logs", currentPage, searchTerm],
      queryFn: async () => {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          ...(searchTerm && { search: searchTerm }),
        });
        const response = await fetch(`/api/login-logs?${params}`);
        if (!response.ok) throw new Error("Failed to fetch login logs");
        return response.json();
      },
    });

  // Fetch analytics data
  const { data: analytics } = useQuery<LoginAnalytics>({
    queryKey: ["/api/login-logs/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/login-logs/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    return status === "success" ? (
      <StatusBadge status="success" />
    ) : (
      <StatusBadge status="failed" />
    );
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType?.toLowerCase().includes("mobile")) return "📱";
    if (deviceType?.toLowerCase().includes("tablet")) return "📱";
    if (deviceType?.toLowerCase().includes("desktop")) return "🖥️";
    return "🖥️";
  };

  if (logsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            Monitor user authentication and security events
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Successful Logins
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {analytics.successCount}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Attempts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {analytics.failureCount}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Device</CardTitle>
              <Monitor className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {analytics.deviceTypes[0]?.deviceType || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.deviceTypes[0]?.count || 0} logins
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <Shield className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {analytics.successCount + analytics.failureCount > 0
                  ? Math.round(
                      (analytics.successCount /
                        (analytics.successCount + analytics.failureCount)) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Authentication success
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by email or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          onClick={() => setSearchTerm("")}
          variant="outline"
          disabled={!searchTerm}
        >
          Clear
        </Button>
      </div>

      {/* Login Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Login Activity</CardTitle>
          <CardDescription>
            Showing {logsData?.logs?.length || 0} of{" "}
            {logsData?.pagination?.total || 0} login attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    IP Address
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Device
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {logsData?.logs?.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                            {log.email?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {log.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {log.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {log.ipAddress}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getDeviceIcon(log.deviceType || "")}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {log.deviceType || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-900 dark:text-white">
                        {log.location || "Unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-gray-900 dark:text-white">
                            {format(new Date(log.loginTime), "MMM dd, yyyy")}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(log.loginTime), "HH:mm:ss")}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logsData?.pagination && (
            <div className="mt-6">
              <Pagination
                currentPage={logsData.pagination.page}
                totalPages={logsData.pagination.totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={logsData.pagination.limit}
                totalItems={logsData.pagination.total}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
