
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, BarChart, Cpu, HardDrive } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function PerformanceMetrics() {
  return (
    <ProtectedRoute resource="performance" action="read">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">
              Detailed performance analytics and optimization insights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                CPU Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-sm text-muted-foreground">Efficiency score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Disk I/O
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23MB/s</div>
              <p className="text-sm text-muted-foreground">Average throughput</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Query Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.8ms</div>
              <p className="text-sm text-muted-foreground">Avg query time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cache Hit Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-sm text-muted-foreground">Cache efficiency</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
