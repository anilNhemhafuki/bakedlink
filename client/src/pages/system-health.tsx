
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Server, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";

export default function SystemHealth() {
  return (
    <ProtectedRoute resource="monitoring" action="read">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">
              Monitor system performance and health metrics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">Online</Badge>
                <span className="text-sm text-muted-foreground">99.9% uptime</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23%</div>
              <p className="text-sm text-muted-foreground">Average load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">512MB</div>
              <p className="text-sm text-muted-foreground">of 2GB used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Active alerts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
