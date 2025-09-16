
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export function useRoleAccess() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isAdmin = () => user?.role === 'admin';
  const isManager = () => user?.role === 'manager';
  const isSupervisor = () => user?.role === 'supervisor';
  const isMarketer = () => user?.role === 'marketer';
  const isStaff = () => user?.role === 'staff';

  const canAccessPage = (resource: string, action: 'read' | 'write' | 'read_write' = 'read') => {
    if (!user) return false;
    
    // Super admin has access to everything
    if (isSuperAdmin()) return true;
    
    // Admin has access to most things except super admin specific resources
    if (isAdmin()) {
      const restrictedResources = ['super_admin'];
      if (restrictedResources.includes(resource)) return false;
      return true;
    }
    
    // Manager has access to operational resources
    if (isManager()) {
      const managerResources = [
        'dashboard', 'products', 'inventory', 'orders', 'production', 
        'customers', 'parties', 'assets', 'expenses', 'sales', 'purchases', 
        'reports', 'staff', 'attendance', 'salary', 'leave_requests'
      ];
      return managerResources.includes(resource);
    }
    
    // Supervisor has limited access
    if (isSupervisor()) {
      const supervisorResources = [
        'dashboard', 'products', 'inventory', 'orders', 'production',
        'customers', 'staff', 'attendance'
      ];
      return supervisorResources.includes(resource);
    }
    
    // Marketer has specific access
    if (isMarketer()) {
      const marketerResources = [
        'dashboard', 'products', 'customers', 'orders', 'sales', 'reports'
      ];
      return marketerResources.includes(resource);
    }
    
    // Staff has basic access
    if (isStaff()) {
      const staffResources = [
        'dashboard', 'products', 'inventory', 'orders', 'production'
      ];
      return staffResources.includes(resource);
    }
    
    // Fallback to permission-based check
    return hasPermission(resource, action);
  };

  const canAccessSidebarItem = (resource: string, action: 'read' | 'write' | 'read_write' = 'read') => {
    return canAccessPage(resource, action);
  };

  const canManageUsers = () => {
    return isSuperAdmin() || isAdmin();
  };

  const canViewSuperAdminUsers = () => {
    return isSuperAdmin();
  };

  const canManageStaff = () => {
    return isSuperAdmin() || isAdmin() || isManager();
  };

  const canViewFinance = () => {
    return isSuperAdmin() || isAdmin() || isManager();
  };

  const canManageSettings = () => {
    return isSuperAdmin() || isAdmin();
  };

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'supervisor': return 'Supervisor';
      case 'marketer': return 'Marketer';
      case 'staff': return 'Staff';
      default: return 'Unknown';
    }
  };

  const canAccessAllBranches = () => {
    return isSuperAdmin() || user?.canAccessAllBranches === true;
  };

  const canManageBranches = () => {
    return isSuperAdmin() || isAdmin();
  };

  const getUserBranchId = () => {
    return user?.branchId;
  };

  const canAccessBranchData = (branchId?: number) => {
    if (canAccessAllBranches()) return true;
    if (!branchId) return true; // Global data
    return getUserBranchId() === branchId;
  };

  const getBranchDisplayName = () => {
    if (canAccessAllBranches()) {
      return 'All Branches';
    }
    return user?.branchName || 'Unknown Branch';
  };

  const getBranchFilterForUser = () => {
    return {
      userBranchId: getUserBranchId(),
      canAccessAllBranches: canAccessAllBranches()
    };
  };

  return {
    isSuperAdmin,
    isAdmin,
    isManager,
    isSupervisor,
    isMarketer,
    isStaff,
    canAccessPage,
    canAccessSidebarItem,
    canManageUsers,
    canViewSuperAdminUsers,
    canManageStaff,
    canViewFinance,
    canManageSettings,
    canAccessAllBranches,
    canManageBranches,
    getUserBranchId,
    canAccessBranchData,
    getBranchDisplayName,
    getBranchFilterForUser,
    getRoleDisplayName,
    user,
  };
}
