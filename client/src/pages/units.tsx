import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUnits } from "@/hooks/useUnits";
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

  // Fetch units using the custom hook
  const {
    data: units = [],
    isLoading,
    error,
    refetch: refetchUnits,
  } = useUnits();

  // Debug: Log actual data
  console.log("Units data in component:", units);
  console.log("Is units array?", Array.isArray(units));
  console.log("Loading:", isLoading, "Error:", error);

  // units is now guaranteed to be an array from useUnits hook
  const unitsArray = units;

  // Filter units by search query
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return unitsArray;

    return unitsArray.filter(
      (unit: any) =>
        unit.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.type?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [unitsArray, searchQuery]);

  // Sort the filtered units
  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredUnits,
    "name",
  );

  // Debug sorting
  console.log("Filtered units count:", filteredUnits.length);
  console.log("Sorted data count:", sortedData.length);
  console.log("Current sort config:", sortConfig);

  // Mutation hooks
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/units", data),
    onSuccess: (data) => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Success",
        description: `Unit "${data.name}" created successfully`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create unit";
      toast({
        title: "Error",
        description: message,
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
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
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
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
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
        description: "Unit status updated",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
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
      conversionFactor:
        parseFloat(formData.get("conversionFactor") as string) || 1,
      isActive: true,
    };

    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, values: unitData });
    } else {
      createMutation.mutate(unitData);
    }
  };

  // Badge type helper
  const getTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case "weight":
        return {
          variant: "default",
          text: "Weight",
          color: "bg-blue-100 text-blue-800",
        };
      case "volume":
        return {
          variant: "secondary",
          text: "Volume",
          color: "bg-green-100 text-green-800",
        };
      case "count":
        return {
          variant: "outline",
          text: "Count",
          color: "bg-gray-100 text-gray-800",
        };
      case "length":
        return {
          variant: "outline",
          text: "Length",
          color: "bg-purple-100 text-purple-800",
        };
      case "area":
        return {
          variant: "outline",
          text: "Area",
          color: "bg-yellow-100 text-yellow-800",
        };
      case "temperature":
        return {
          variant: "outline",
          text: "Temperature",
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          variant: "outline",
          text: type || "Unknown",
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  // Unauthorized redirect
  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Session Expired",
      description: "Redirecting to login...",
      variant: "destructive",
    });
    setTimeout(() => (window.location.href = "/api/login"), 500);
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Units of Measurement</h2>
          <p className="text-gray-600">
            Manage units for inventory and products
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingUnit(null);
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
              <DialogDescription>Enter unit details below</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSave}
              key={editingUnit?.id || "new"}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Unit Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Kilogram, Liter"
                  defaultValue={editingUnit?.name || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  placeholder="e.g., kg, ltr"
                  defaultValue={editingUnit?.abbreviation || ""}
                  required
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
                    <SelectValue placeholder="Select type" />
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

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <SearchBar
            placeholder="Search units by name, abbr, or type..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading units...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error Loading Units
              </h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
              <Button onClick={refetchUnits}>Retry</Button>
            </div>
          ) : (
            <>
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
                  {sortedData.length > 0 ? (
                    sortedData.map((unit: any) => {
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
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">
                          {searchQuery
                            ? "No matching units found. Try a different search."
                            : "No units available. Add your first unit."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
