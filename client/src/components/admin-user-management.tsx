import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Activity,
  Shield,
  Settings,
  Eye,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAllPermissions, useRolePermissions } from "@/hooks/usePermissions";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import AuditLogs from "@/pages/LoginLogs";

export default function AdminUserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [userData, setUserData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "staff",
  });
  const { toast } = useToast();
  const { isSuperAdmin } = useRoleAccess();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = isSuperAdmin()
    ? users
    : users.filter((user) => user.role !== "super_admin");

  const groupPermissionsByResource = (permissions: any[]) => {
    const grouped = permissions.reduce((acc: any, perm: any) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});
    return grouped;
  };

  const { data: allPermissions = [] } = useAllPermissions();
  const { data: rolePermissions = [], refetch: refetchRolePermissions } =
    useRolePermissions(selectedRole);

  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({
      role,
      permissionIds,
    }: {
      role: string;
      permissionIds: number[];
    }) => {
      return apiRequest("PUT", `/api/permissions/role/${role}`, {
        permissionIds,
      });
    },
    onSuccess: () => {
      toast({ title: "Role permissions updated successfully" });
      refetchRolePermissions();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      setUserData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "staff",
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      setUserData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "staff",
      });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as string,
      ...((!editingUser || formData.get("password")) && {
        password: formData.get("password") as string,
      }),
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserData({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      super_admin: "destructive",
      admin: "destructive",
      manager: "default",
      supervisor: "secondary",
      marketer: "outline",
      staff: "outline",
    };
    return variants[role] || "outline";
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(userId);
    }
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    const currentPermissionIds = rolePermissions.map((p: any) => p.id);
    let newPermissionIds;

    if (checked) {
      newPermissionIds = [...currentPermissionIds, permissionId];
    } else {
      newPermissionIds = currentPermissionIds.filter(
        (id: number) => id !== permissionId,
      );
    }

    updateRolePermissionsMutation.mutate({
      role: selectedRole,
      permissionIds: newPermissionIds,
    });
  };

  if (error) {
    if (
      isUnauthorizedError(error) ||
      error.message.includes("403") ||
      error.message.includes("404")
    ) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p>You don't have permission to access user management.</p>
              <p className="text-sm mt-2">
                Contact your administrator for access.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading user management: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const validRoles = [
    ...(isSuperAdmin() ? [{ value: "super_admin", label: "Super Admin" }] : []),
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "supervisor", label: "Supervisor" },
    { value: "marketer", label: "Marketer" },
    { value: "staff", label: "Staff" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            System Administration
          </h1>
          <p className="text-muted-foreground">
            Manage users, permissions, and monitor system activities
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Role Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage users and their roles
                  </CardDescription>
                </div>
                <Dialog
                  open={isDialogOpen}
                  onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                      setEditingUser(null);
                      setUserData({
                        email: "",
                        password: "",
                        firstName: "",
                        lastName: "",
                        role: "staff",
                      });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button disabled={!isSuperAdmin()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? "Edit User" : "Create New User"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingUser
                          ? "Update user information"
                          : "Add a new user to the system"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            defaultValue={userData.firstName}
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            defaultValue={userData.lastName}
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={userData.email}
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">
                          {editingUser
                            ? "Password (leave blank to keep current)"
                            : "Password"}
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter password"
                          required={!editingUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" defaultValue={userData.role}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {validRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            createMutation.isPending || updateMutation.isPending
                          }
                        >
                          {editingUser ? "Update User" : "Create User"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} users
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                disabled={
                                  user.role === "super_admin" && !isSuperAdmin()
                                }
                                className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={
                                  user.role === "super_admin" && !isSuperAdmin()
                                }
                                className="text-red-600 hover:text-red-800 focus:outline-none"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                        No users found
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Start by adding your first user
                      </p>
                      <Button
                        onClick={() => setIsDialogOpen(true)}
                        disabled={!isSuperAdmin()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions Management</CardTitle>
              <CardDescription>
                Configure permissions for each role. Select a role to manage its
                permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="roleSelect">Select Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {validRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRole && (
                <div className="space-y-4">
                  {updateRolePermissionsMutation.isPending && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Updating permissions...
                      </p>
                    </div>
                  )}

                  {selectedRole === "super_admin" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="bg-green-600">
                          Super Admin
                        </Badge>
                        <span className="text-green-800 font-medium">
                          Full Access to All System Resources
                        </span>
                      </div>
                      <p className="text-green-700 text-sm mt-2">
                        Super Admin has unrestricted access to all pages,
                        features, and permissions in the system.
                      </p>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Resource</TableHead>
                          <TableHead className="w-[300px]">
                            Description
                          </TableHead>
                          <TableHead className="text-center w-[120px]">
                            Read
                          </TableHead>
                          <TableHead className="text-center w-[120px]">
                            Read-Write
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(
                          groupPermissionsByResource(allPermissions as any[]),
                        ).map(([resource, permissions]: [string, any[]]) => {
                          const hasRead = rolePermissions.some((rp: any) =>
                            (permissions as any[]).some(
                              (p: any) =>
                                p.id === rp.permissionId && p.action === "read",
                            ),
                          );

                          const hasReadWrite = rolePermissions.some((rp: any) =>
                            (permissions as any[]).some(
                              (p: any) =>
                                p.id === rp.permissionId &&
                                p.action === "read_write",
                            ),
                          );

                          const handlePermissionChange = (
                            permissionId: number,
                            isGranted: boolean,
                          ) => {
                            const currentPermissionIds = rolePermissions.map(
                              (rp: any) => rp.permissionId,
                            );

                            let newPermissionIds;
                            if (isGranted) {
                              newPermissionIds = currentPermissionIds.includes(
                                permissionId,
                              )
                                ? currentPermissionIds
                                : [...currentPermissionIds, permissionId];
                            } else {
                              newPermissionIds = currentPermissionIds.filter(
                                (id: number) => id !== permissionId,
                              );
                            }

                            updateRolePermissionsMutation.mutate({
                              role: selectedRole,
                              permissionIds: newPermissionIds,
                            });
                          };

                          const handleReadToggle = (checked: boolean) => {
                            const readPerm = (permissions as any[]).find(
                              (p: any) => p.action === "read",
                            );
                            if (readPerm) {
                              handlePermissionChange(readPerm.id, checked);
                            }
                          };

                          const handleReadWriteToggle = (checked: boolean) => {
                            const readWritePerm = (permissions as any[]).find(
                              (p: any) => p.action === "read_write",
                            );
                            if (readWritePerm) {
                              handlePermissionChange(readWritePerm.id, checked);
                            }
                          };

                          const getResourceDescription = (resource: string) => {
                            const descriptions: { [key: string]: string } = {
                              dashboard: "Overview and analytics",
                              products: "Product catalog management",
                              inventory: "Stock and materials tracking",
                              orders: "Customer order processing",
                              production: "Production scheduling",
                              customers: "Customer relationship management",
                              parties: "Supplier and vendor management",
                              assets: "Asset and equipment tracking",
                              expenses: "Business expense tracking",
                              sales: "Sales transaction management",
                              purchases: "Purchase order management",
                              reports: "Reports and analytics",
                              settings: "System configuration",
                              users: "User account management",
                              staff: "Staff management and records",
                              attendance: "Staff attendance tracking",
                              salary: "Salary and payroll management",
                              leave_requests: "Leave request management",
                            };
                            return (
                              descriptions[resource] ||
                              `Manage ${resource} access`
                            );
                          };

                          return (
                            <TableRow key={resource}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                                    <i className="fas fa-cube text-primary text-xs"></i>
                                  </div>
                                  <span className="capitalize">
                                    {resource.replace("_", " ")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {getResourceDescription(resource)}
                              </TableCell>
                              <TableCell className="text-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={
                                      hasRead || selectedRole === "super_admin"
                                    }
                                    onChange={(e) =>
                                      handleReadToggle(e.target.checked)
                                    }
                                    className="sr-only peer"
                                    disabled={selectedRole === "super_admin"}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                                </label>
                              </TableCell>
                              <TableCell className="text-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={
                                      hasReadWrite ||
                                      selectedRole === "super_admin"
                                    }
                                    onChange={(e) =>
                                      handleReadWriteToggle(e.target.checked)
                                    }
                                    className="sr-only peer"
                                    disabled={selectedRole === "super_admin"}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                                </label>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLogs />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SecurityMonitor() {
  const { data: securityMetrics } = useQuery({
    queryKey: ["/api/security/comprehensive-metrics"],
    queryFn: () => apiRequest("/api/security/comprehensive-metrics", "GET"),
  });

  const { data: securityAlerts } = useQuery({
    queryKey: ["/api/security/alerts"],
    queryFn: () => apiRequest("/api/security/alerts", "GET"),
  });

  const { data: recentFailedLogins } = useQuery({
    queryKey: ["/api/login-logs/analytics"],
    queryFn: () => apiRequest("/api/login-logs/analytics", "GET"),
  });

  const { data: suspiciousActivities } = useQuery({
    queryKey: ["/api/audit-logs/suspicious"],
    queryFn: () => apiRequest("/api/audit-logs?status=failed&limit=20", "GET"),
  });

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {recentFailedLogins?.failedLoginsLast24h || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Failed Logins (24h)
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {securityAlerts?.totalActive || 0}
                </div>
                <p className="text-sm text-muted-foreground">Active Threats</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {securityMetrics?.riskScore || 0}%
                </div>
                <p className="text-sm text-muted-foreground">Risk Score</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Failed Logins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Recent Failed Login Attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFailedLogins?.recentFailedLogins?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFailedLogins.recentFailedLogins.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.email}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell>{log.location || "Unknown"}</TableCell>
                      <TableCell>
                        {new Date(log.loginTime).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.deviceType || "Unknown"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                All Clear!
              </h3>
              <p className="text-muted-foreground">
                No failed login attempts in the last 24 hours
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Recent Failed Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suspiciousActivities?.auditLogs?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspiciousActivities.auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {log.resource.replace("_", " ")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                All Operations Successful!
              </h3>
              <p className="text-muted-foreground">
                No failed operations detected recently
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Active Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityAlerts?.activeAlerts?.length > 0 ||
          securityAlerts?.dashboardAlerts?.length > 0 ? (
            <div className="space-y-4">
              {/* Active Alerts */}
              {securityAlerts?.activeAlerts?.map((alert: any) => (
                <div
                  key={alert.id}
                  className="border border-red-200 rounded-lg p-4 bg-red-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="destructive"
                          className={`${
                            alert.severity === "HIGH"
                              ? "bg-red-600"
                              : alert.severity === "MEDIUM"
                                ? "bg-orange-600"
                                : "bg-yellow-600"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                        <span className="font-semibold text-red-800">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-red-600">
                        <span>User: {alert.userEmail}</span>
                        <span>IP: {alert.ipAddress}</span>
                        <span>
                          Time: {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dashboard Alerts */}
              {securityAlerts?.dashboardAlerts?.map((alert: any) => (
                <div
                  key={alert.id}
                  className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={`${
                            alert.severity === "HIGH"
                              ? "bg-red-600"
                              : alert.severity === "MEDIUM"
                                ? "bg-orange-600"
                                : "bg-yellow-600"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                        <span className="font-semibold text-orange-800">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-sm text-orange-700 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-orange-600">
                        <span>User: {alert.userEmail}</span>
                        <span>IP: {alert.ipAddress}</span>
                        <span>
                          Time: {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                System Secure
              </h3>
              <p className="text-muted-foreground">
                No active security threats detected
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
