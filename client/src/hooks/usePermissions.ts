
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description?: string;
  granted?: boolean;
}

export function usePermissions() {
  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ["/api/auth/permissions"],
  });

  const hasPermission = (resource: string, action: 'read' | 'write' | 'read_write') => {
    return (permissions as Permission[]).some((perm: Permission) => 
      perm.resource === resource && 
      (perm.action === action || perm.action === 'read_write')
    );
  };

  const canRead = (resource: string) => hasPermission(resource, 'read');
  const canWrite = (resource: string) => hasPermission(resource, 'write');
  const canReadWrite = (resource: string) => hasPermission(resource, 'read_write');

  return {
    permissions,
    isLoading,
    hasPermission,
    canRead,
    canWrite,
    canReadWrite,
  };
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ["/api/permissions"],
  });
}

export function useRolePermissions(role: string) {
  return useQuery<Permission[]>({
    queryKey: [`/api/permissions/role/${role}`],
    enabled: !!role,
  });
}

export function useUserPermissions(userId: string) {
  return useQuery<Permission[]>({
    queryKey: [`/api/permissions/user/${userId}`],
    enabled: !!userId,
  });
}
