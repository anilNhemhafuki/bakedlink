
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, TrendingUp, Clock, Users } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function SystemMonitoring() {
  return (
    <ProtectedRoute resource="monitoring" action="read">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">
              Real-time system monitoring and analytics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-sm text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">145ms</div>
              <p className="text-sm text-muted-foreground">Average response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.1k</div>
              <p className="text-sm text-muted-foreground">Requests/min</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
