
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, Activity, HardDrive } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function DatabaseManager() {
  return (
    <ProtectedRoute resource="database" action="read_write">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Database Manager</h1>
            <p className="text-muted-foreground">
              Monitor and manage database operations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-sm text-muted-foreground">Total tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-sm text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4GB</div>
              <p className="text-sm text-muted-foreground">Database size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Query Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98%</div>
              <p className="text-sm text-muted-foreground">Avg performance</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
