import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function Units() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const { toast } = useToast();

  // Fetch units using React Query with consistent key
  const {
    data: units = [],
    isLoading,
    error,
    refetch: refetchUnits,
  } = useQuery({
    queryKey: ["/api/units"], // Ensure other components use this EXACT key
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/units");
        console.log("Raw Units API response:", response);
        console.log("Units API response:", response);
        // Handle different response types - assumes API returns array directly
        if (Array.isArray(response)) {
          return response;
        } else if (response && response.message) {
          throw new Error(response.message);
        } else {
          return [];
        }
      } catch (error) {
        console.error("Failed to fetch units:", error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // --- Example of Corrected Logic (Based on your previous error) ---
  // If you had a helper function like this elsewhere, ensure correct syntax:
  /*
  const getUnitName = (unitId: number) => {
    // CORRECT: Single 'const' declaration
    const unit = (units as any[]).find((u: any) => u.id === unitId);
    // INCORRECT (like your previous error): const const unit = ...
    return unit ? `${unit.name} (${unit.abbreviation})` : "Unknown Unit";
  };
  */
  // --- End Example ---

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/units", data),
    onSuccess: (data) => {
      console.log("Unit created successfully:", data);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      refetchUnits();
      toast({
        title: "Success",
        description: `Unit "${data.name}" created successfully`,
      });
    },
    onError: (error: any) => {
      console.error("Create unit error:", error);
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
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create unit";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; values: any }) =>
      apiRequest("PUT", `/api/units/${data.id}`, data.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsDialogOpen(false);
      setEditingUnit(null);
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
    },
    onError: (error) => {
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
        description: "Failed to update unit",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });
    },
    onError: (error) => {
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
        description: "Failed to delete unit",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: number; isActive: boolean }) =>
      apiRequest("PUT", `/api/units/${data.id}`, { isActive: data.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Success",
        description: "Unit status updated successfully",
      });
    },
    onError: (error) => {
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
        description: "Failed to update unit status",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const abbreviation = formData.get("abbreviation") as string;
    const type = formData.get("type") as string;

    if (!name?.trim() || !abbreviation?.trim() || !type?.trim()) {
      toast({
        title: "Error",
        description: "Name, abbreviation, and type are required",
        variant: "destructive",
      });
      return;
    }

    const unitData = {
      name: name.trim(),
      abbreviation: abbreviation.trim(),
      type: type.trim(),
      baseUnit: (formData.get("baseUnit") as string)?.trim() || null,
      conversionFactor: formData.get("conversionFactor")
        ? parseFloat(formData.get("conversionFactor") as string)
        : 1,
      isActive: true,
    };

    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, values: unitData });
    } else {
      createMutation.mutate(unitData);
    }
  };

  const filteredUnits = React.useMemo(() => {
    console.log("Filtering units:", units);
    const unitsArray = Array.isArray(units) ? units : [];
    if (!searchQuery.trim()) {
      return unitsArray;
    }
    return unitsArray.filter(
      (unit: any) =>
        unit.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.type?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [units, searchQuery]);

  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredUnits,
    "name",
  );

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "weight":
        return {
          variant: "default" as const,
          text: "Weight",
          color: "bg-blue-100 text-blue-800",
        };
      case "volume":
        return {
          variant: "secondary" as const,
          text: "Volume",
          color: "bg-green-100 text-green-800",
        };
      case "count":
        return {
          variant: "outline" as const,
          text: "Count",
          color: "bg-gray-100 text-gray-800",
        };
      default:
        return {
          variant: "outline" as const,
          text: type,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  React.useEffect(() => {
    console.log("Units data:", units);
    console.log("Filtered units:", filteredUnits);
    console.log("Is loading:", isLoading);
    console.log("Error:", error);
  }, [units, filteredUnits, isLoading, error]);

  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (error && !isUnauthorizedError(error)) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Units
          </h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Failed to load units"}
          </p>
          <Button onClick={() => refetchUnits()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Manage units of measurement for your inventory
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingUnit(null);
              const form = document.querySelector("form") as HTMLFormElement;
              if (form) {
                form.reset();
              }
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingUnit(null)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "Edit Unit" : "Add New Unit"}
              </DialogTitle>
              <DialogDescription>
                Enter the unit details below
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSave}
              className="space-y-4"
              key={editingUnit?.id || "new"}
            >
              <div>
                <Label htmlFor="name">Unit Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Kilogram, Liter, Pieces"
                  defaultValue={editingUnit?.name || ""}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  placeholder="e.g., kg, ltr, pcs"
                  defaultValue={editingUnit?.abbreviation || ""}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="type">Unit Type</Label>
                <Select
                  name="type"
                  defaultValue={editingUnit?.type || ""}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="length">Length</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="temperature">Temperature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingUnit
                    ? "Update Unit"
                    : "Add Unit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <SearchBar
            placeholder="Search units..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          />
        </div>
      </div>
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading units...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="name"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Name
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="abbreviation"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Abbreviation
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="type"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Type
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="isActive"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHeader>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((unit: any) => {
                    const typeBadge = getTypeBadge(unit.type);
                    return (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Ruler className="h-4 w-4 text-primary" />
                            </div>
                            <div className="font-medium">{unit.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {unit.abbreviation}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadge.variant}>
                            {typeBadge.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={unit.isActive ? "default" : "secondary"}
                          >
                            {unit.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUnit(unit);
                                setIsDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 focus:outline-none"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={
                                unit.isActive ? "destructive" : "default"
                              }
                              size="sm"
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: unit.id,
                                  isActive: !unit.isActive,
                                })
                              }
                            >
                              {unit.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <DeleteConfirmationDialog
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800 focus:outline-none"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete Unit"
                              itemName={unit.name}
                              onConfirm={() => deleteMutation.mutate(unit.id)}
                              isLoading={deleteMutation.isPending}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredUnits.length === 0 && (
                <div className="text-center py-8">
                  <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No units found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Start by adding your first measuring unit"}
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
