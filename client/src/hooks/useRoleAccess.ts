// src/hooks/useRoleAccess.ts
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export function useRoleAccess() {
  const { user } = useAuth(); // ✅ Safe: called unconditionally inside hook
  const { hasPermission } = usePermissions();

  const isSuperAdmin = () => user?.role === "super_admin";
  const isAdmin = () => user?.role === "admin";
  const isManager = () => user?.role === "manager";
  const isSupervisor = () => user?.role === "supervisor";
  const isMarketer = () => user?.role === "marketer";
  const isStaff = () => user?.role === "staff";

  const canAccessPage = (
    resource: string,
    action: "read" | "write" | "read_write" = "read",
  ) => {
    if (!user) return false;

    if (isSuperAdmin()) return true;

    if (isAdmin()) {
      const restrictedResources = ["super_admin"];
      if (restrictedResources.includes(resource)) return false;
      return true;
    }

    if (isManager()) {
      const managerResources = [
        "dashboard",
        "products",
        "inventory",
        "orders",
        "production",
        "customers",
        "parties",
        "assets",
        "expenses",
        "sales",
        "purchases",
        "reports",
        "staff",
        "attendance",
        "salary",
        "leave_requests",
      ];
      return managerResources.includes(resource);
    }

    if (isSupervisor()) {
      const supervisorResources = [
        "dashboard",
        "products",
        "inventory",
        "orders",
        "production",
        "customers",
        "staff",
        "attendance",
      ];
      return supervisorResources.includes(resource);
    }

    if (isMarketer()) {
      const marketerResources = [
        "dashboard",
        "products",
        "customers",
        "orders",
        "sales",
        "reports",
      ];
      return marketerResources.includes(resource);
    }

    if (isStaff()) {
      const staffResources = [
        "dashboard",
        "products",
        "inventory",
        "orders",
        "production",
      ];
      return staffResources.includes(resource);
    }

    return hasPermission(resource, action);
  };

  const canAccessSidebarItem = canAccessPage;

  const canManageUsers = () => isSuperAdmin() || isAdmin();
  const canViewSuperAdminUsers = () => isSuperAdmin();
  const canManageStaff = () => isSuperAdmin() || isAdmin() || isManager();
  const canViewFinance = () => isSuperAdmin() || isAdmin() || isManager();
  const canManageSettings = () => isSuperAdmin() || isAdmin();
  const canAccessAllBranches = () =>
    isSuperAdmin() || user?.canAccessAllBranches === true;
  const canManageBranches = () => isSuperAdmin() || isAdmin();

  const getUserBranchId = () => user?.branchId;
  const canAccessBranchData = (branchId?: number) => {
    if (canAccessAllBranches()) return true;
    if (!branchId) return true;
    return getUserBranchId() === branchId;
  };

  const getBranchDisplayName = () => {
    if (canAccessAllBranches()) return "All Branches";
    return user?.branchName || "Unknown Branch";
  };

  const getBranchFilterForUser = () => ({
    userBranchId: getUserBranchId(),
    canAccessAllBranches: canAccessAllBranches(),
  });

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Administrator";
      case "manager":
        return "Manager";
      case "supervisor":
        return "Supervisor";
      case "marketer":
        return "Marketer";
      case "staff":
        return "Staff";
      default:
        return "Unknown";
    }
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
