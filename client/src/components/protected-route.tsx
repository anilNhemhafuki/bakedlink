import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  resource: string;
  action: "read" | "write" | "read_write";
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  resource,
  action,
  children,
  fallback,
}: ProtectedRouteProps) {
  const { hasPermission, isLoading } = usePermissions();
  const { isSuperAdmin } = useRoleAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Superadmin has access to everything
  if (isSuperAdmin()) {
    return <>{children}</>;
  }

  // Check permissions using the role access hook
  const { canAccessPage } = useRoleAccess();
  
  if (!canAccessPage(resource, action)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Access Denied
                  </h3>
                  <p className="text-gray-500 mt-2">
                    You don't have permission to access this page. Contact your
                    administrator for access.
                  </p>
                </div>
                <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Required: {action.replace("_", " & ")} access to{" "}
                  {resource.replace("_", " ")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  if (!hasPermission(resource, action)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Access Denied
                  </h3>
                  <p className="text-gray-500 mt-2">
                    You don't have permission to {action}{" "}
                    {resource.replace("_", " ")}. Contact your administrator for
                    access.
                  </p>
                </div>
                <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Required: {action.replace("_", " & ")} access to{" "}
                  {resource.replace("_", " ")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  return <>{children}</>;
}
