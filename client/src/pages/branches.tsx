
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ProtectedPage } from "@/components/protected-page";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  Crown,
} from "lucide-react";
import type { Branch, InsertBranch } from "@shared/schema";

export default function Branches() {
  return (
    <ProtectedPage resource="branches" action="read">
      <BranchManagement />
    </ProtectedPage>
  );
}

function BranchManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchData, setBranchData] = useState<InsertBranch>({
    branchCode: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    managerName: "",
    isHeadOffice: false,
    isActive: true,
  });

  const { toast } = useToast();
  const { canManageBranches } = useRoleAccess();

  const {
    data: branches = [],
    isLoading,
    error,
  } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: InsertBranch) => apiRequest("POST", "/api/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Branch created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create branch",
        variant: "destructive",
      });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertBranch> }) =>
      apiRequest("PUT", `/api/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Branch updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branch",
        variant: "destructive",
      });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({
        title: "Success",
        description: "Branch deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete branch",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setBranchData({
      branchCode: "",
      name: "",
      address: "",
      phone: "",
      email: "",
      managerName: "",
      isHeadOffice: false,
      isActive: true,
    });
    setEditingBranch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingBranch) {
      updateBranchMutation.mutate({
        id: editingBranch.id,
        data: branchData,
      });
    } else {
      createBranchMutation.mutate(branchData);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchData({
      branchCode: branch.branchCode,
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      managerName: branch.managerName || "",
      isHeadOffice: branch.isHeadOffice,
      isActive: branch.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      deleteBranchMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading branches: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Branch Management
          </h1>
          <p className="text-muted-foreground">
            Manage company branches and locations
          </p>
        </div>

        {canManageBranches() && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingBranch ? "Edit Branch" : "Add New Branch"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBranch
                      ? "Update branch information"
                      : "Create a new branch location"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branchCode">Branch Code *</Label>
                      <Input
                        id="branchCode"
                        value={branchData.branchCode}
                        onChange={(e) =>
                          setBranchData({ ...branchData, branchCode: e.target.value })
                        }
                        placeholder="BR001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Branch Name *</Label>
                      <Input
                        id="name"
                        value={branchData.name}
                        onChange={(e) =>
                          setBranchData({ ...branchData, name: e.target.value })
                        }
                        placeholder="Main Branch"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={branchData.address}
                      onChange={(e) =>
                        setBranchData({ ...branchData, address: e.target.value })
                      }
                      placeholder="Enter branch address"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={branchData.phone}
                        onChange={(e) =>
                          setBranchData({ ...branchData, phone: e.target.value })
                        }
                        placeholder="+977-1-4567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={branchData.email}
                        onChange={(e) =>
                          setBranchData({ ...branchData, email: e.target.value })
                        }
                        placeholder="branch@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="managerName">Manager Name</Label>
                    <Input
                      id="managerName"
                      value={branchData.managerName}
                      onChange={(e) =>
                        setBranchData({ ...branchData, managerName: e.target.value })
                      }
                      placeholder="Branch Manager"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isHeadOffice"
                      checked={branchData.isHeadOffice}
                      onCheckedChange={(checked) =>
                        setBranchData({ ...branchData, isHeadOffice: checked })
                      }
                    />
                    <Label htmlFor="isHeadOffice">Head Office</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={branchData.isActive}
                      onCheckedChange={(checked) =>
                        setBranchData({ ...branchData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>

                <DialogFooter>
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
                      createBranchMutation.isPending || updateBranchMutation.isPending
                    }
                  >
                    {createBranchMutation.isPending || updateBranchMutation.isPending
                      ? "Saving..."
                      : editingBranch
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <CardDescription>
            List of all company branches and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                {canManageBranches() && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-mono">{branch.branchCode}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {branch.isHeadOffice && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{branch.name}</span>
                    </div>
                    {branch.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {branch.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {branch.managerName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {branch.managerName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {branch.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {branch.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {branch.isHeadOffice ? (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Head Office
                      </Badge>
                    ) : (
                      <Badge variant="outline">Branch</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={branch.isActive ? "default" : "secondary"}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManageBranches() && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(branch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!branch.isHeadOffice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(branch.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
