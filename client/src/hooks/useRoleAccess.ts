
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export function useRoleAccess() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isAdmin = () => user?.role === 'admin' || isSuperAdmin();
  const isManager = () => user?.role === 'manager' || isAdmin();

  const canAccessPage = (resource: string, action: 'read' | 'write' | 'read_write' = 'read') => {
    if (isSuperAdmin()) return true;
    
    // Admin cannot access superadmin-specific resources
    if (isAdmin() && resource !== 'super_admin') return true;
    
    return hasPermission(resource, action);
  };

  const canAccessSidebarItem = (resource: string, action: 'read' | 'write' | 'read_write' = 'read') => {
    if (isSuperAdmin()) return true;
    
    // Admin cannot access superadmin-specific resources
    if (isAdmin() && resource !== 'super_admin') return true;
    
    return hasPermission(resource, action);
  };

  const canManageUsers = () => {
    return isSuperAdmin() || isAdmin();
  };

  const canViewSuperAdminUsers = () => {
    return isSuperAdmin();
  };

  return {
    isSuperAdmin,
    isAdmin,
    isManager,
    canAccessPage,
    canAccessSidebarItem,
    canManageUsers,
    canViewSuperAdminUsers,
    user,
  };
}
