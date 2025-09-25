
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Book, Server, Zap } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function ApiDocs() {
  return (
    <ProtectedRoute resource="api" action="read">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-muted-foreground">
              Complete API reference and developer documentation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                API Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Complete API endpoints documentation
              </p>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Base URL:</span> /api/v1
                </div>
                <div className="text-sm">
                  <span className="font-medium">Authentication:</span> Bearer Token
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Auth</span>
                  <span className="text-muted-foreground">5 endpoints</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Products</span>
                  <span className="text-muted-foreground">8 endpoints</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Orders</span>
                  <span className="text-muted-foreground">12 endpoints</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Rate Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Rate Limit:</span> 1000/hour
                </div>
                <div className="text-sm">
                  <span className="font-medium">Burst:</span> 100/minute
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span> 
                  <span className="text-green-600 ml-1">Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
