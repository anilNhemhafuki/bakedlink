import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRoleAccess } from "@/hooks/useRoleAccess";

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
  fallback = null,
}: PermissionWrapperProps) {
  const { hasPermission } = usePermissions();
  const { isSuperAdmin, canBypassAllRestrictions } = useRoleAccess();

  // Super Admin bypasses ALL permission wrappers
  if (isSuperAdmin() || canBypassAllRestrictions()) {
    console.log(`🚀 Super Admin permission wrapper bypass for ${resource} (${action})`);
    return <>{children}</>;
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
  readOnlyContent,
}: ReadOnlyWrapperProps) {
  const { canWrite, canReadWrite } = usePermissions();

  if (canWrite(resource) || canReadWrite(resource)) {
    return <>{children}</>;
  }

  return <>{readOnlyContent || children}</>;
}