
import { usePermissions } from "@/hooks/usePermissions";
import { ReactNode } from "react";

interface PermissionWrapperProps {
  resource: string;
  action: 'read' | 'write' | 'read_write';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionWrapper({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: PermissionWrapperProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>;
  }

  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ReadOnlyWrapperProps {
  resource: string;
  children: ReactNode;
  readOnlyContent?: ReactNode;
}

export function ReadOnlyWrapper({ 
  resource, 
  children, 
  readOnlyContent 
}: ReadOnlyWrapperProps) {
  const { canWrite, canReadWrite } = usePermissions();

  if (canWrite(resource) || canReadWrite(resource)) {
    return <>{children}</>;
  }

  return <>{readOnlyContent || children}</>;
}
