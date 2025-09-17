
import { ReactNode } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

interface ProtectedPageProps {
  children: ReactNode;
  resource: string;
  action?: 'read' | 'write' | 'read_write';
  fallback?: ReactNode;
}

export function ProtectedPage({ 
  children, 
  resource, 
  action = 'read', 
  fallback 
}: ProtectedPageProps) {
  const { canAccessPage, isSuperAdmin, canBypassAllRestrictions } = useRoleAccess();

  // Super Admin bypasses ALL page restrictions
  if (isSuperAdmin() || canBypassAllRestrictions()) {
    return <>{children}</>;
  }

  if (!canAccessPage(resource, action)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
                <p className="text-gray-500 mt-2">
                  You don't have permission to access this page.
                  Contact your administrator for access.
                </p>
              </div>
              <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Required: {action.replace('_', ' & ')} access to {resource.replace('_', ' ')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
