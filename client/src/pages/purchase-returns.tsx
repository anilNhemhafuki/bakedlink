"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";

interface PurchaseReturn {
  id: number;
  serialNumber: number;
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: number;
  unitId: number;
  unitName: string;
  ratePerUnit: number;
  amount: number;
  returnDate: string;
  purchaseId?: number;
  partyId?: number;
  returnReason: string;
  isDayClosed: boolean;
  notes?: string;
  createdAt: string;
}

interface DailyPurchaseReturnSummary {
  summaryDate: string;
  totalItems: number;
  totalQuantity: number;
  totalLoss: number;
  isDayClosed: boolean;
  closedBy?: string;
  closedAt?: string;
}

export default function PurchaseReturns() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(
    null,
  );
  const [formData, setFormData] = useState({
    inventoryItemId: "",
    quantity: "",
    unitId: "",
    ratePerUnit: "",
    returnReason: "damaged",
    partyId: "",
    purchaseId: "",
    notes: "",
  });

  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/inventory");
        return Array.isArray(res) ? res : res.items || [];
      } catch (error) {
        console.error("Failed to fetch inventory items:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch parties (suppliers)
  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/parties");
        return Array.isArray(res) ? res : res.parties || [];
      } catch (error) {
        console.error("Failed to fetch parties:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/units");
        const allUnits = res?.data || res || [];
        return allUnits.filter(
          (unit: any) =>
            unit.type === "weight" ||
            unit.type === "count" ||
            unit.type === "volume",
        );
      } catch (error) {
        console.error("Failed to fetch units:", error);
        return [];
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Fetch purchase returns for selected date
  const { data: purchaseReturns = [], isLoading: purchaseReturnsLoading } =
    useQuery({
      queryKey: ["purchase-returns", selectedDate],
      queryFn: async () => {
        try {
          const res = await apiRequest(
            "GET",
            `/api/purchase-returns?date=${selectedDate}`,
          );
          return res?.data || [];
        } catch (error) {
          console.error("Failed to fetch purchase returns:", error);
          return [];
        }
      },
      retry: (failureCount, error) =>
        !isUnauthorizedError(error) && failureCount < 3,
    });

  // Fetch daily summary
  const { data: dailySummary } = useQuery({
    queryKey: ["purchase-returns-summary", selectedDate],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/purchase-returns/summary/${selectedDate}`,
        );
        return res?.data || null;
      } catch (error) {
        console.error("Failed to fetch daily summary:", error);
        return null;
      }
    },
    retry: (failureCount, error) =>
      !isUnauthorizedError(error) && failureCount < 3,
  });

  // Define helper functions
  const handleSuccess = (msg: string) => {
    setIsDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-returns-summary"] });
    toast({ title: "Success", description: msg });
  };

  const handleError = (error: unknown, variables: any, context: unknown) => {
    console.error("Mutation error:", error);

    let message = "Failed to process request.";

    if (error && typeof error === "object") {
      const err = error as Record<string, any>;
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
    }

    if (isUnauthorizedError(error)) {
      toast({
        title: "Session Expired",
        description: "Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/login"), 1000);
      return;
    }

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/purchase-returns", data),
    onSuccess: () => {
      handleSuccess("Purchase return entry created successfully");
    },
    onError: handleError,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/purchase-returns/${id}`, data),
    onSuccess: () => {
      handleSuccess("Purchase return entry updated successfully");
    },
    onError: handleError,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/purchase-returns/${id}`),
    onSuccess: () => {
      handleSuccess("Purchase return entry deleted successfully");
    },
    onError: handleError,
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: (date: string) =>
      apiRequest("POST", "/api/purchase-returns/close-day", { date }),
    onSuccess: () => {
      handleSuccess("Day closed successfully.");
    },
    onError: handleError,
  });

  // Reopen day mutation
  const reopenDayMutation = useMutation({
    mutationFn: (date: string) =>
      apiRequest("POST", "/api/purchase-returns/reopen-day", { date }),
    onSuccess: () => {
      handleSuccess("Day reopened successfully.");
    },
    onError: handleError,
  });

  const isDayClosed = dailySummary?.isDayClosed || false;
  const canModify = !isDayClosed;

  // Calculate amount
  const calculatedAmount = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.ratePerUnit) || 0;
    return qty * rate;
  }, [formData.quantity, formData.ratePerUnit]);

  const resetForm = () => {
    setFormData({
      inventoryItemId: "",
      quantity: "",
      unitId: "",
      ratePerUnit: "",
      returnReason: "damaged",
      partyId: "",
      purchaseId: "",
      notes: "",
    });
    setEditingReturn(null);
  };

  const handleEdit = (returnItem: PurchaseReturn) => {
    setEditingReturn(returnItem);
    setFormData({
      inventoryItemId: returnItem.inventoryItemId.toString(),
      quantity: returnItem.quantity.toString(),
      unitId: returnItem.unitId.toString(),
      ratePerUnit: returnItem.ratePerUnit.toString(),
      returnReason: returnItem.returnReason,
      partyId: returnItem.partyId?.toString() || "",
      purchaseId: returnItem.purchaseId?.toString() || "",
      notes: returnItem.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.inventoryItemId ||
      !formData.quantity ||
      !formData.unitId ||
      !formData.ratePerUnit
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = inventoryItems.find(
      (item) => item.id.toString() === formData.inventoryItemId,
    );
    const selectedUnit = units.find((u) => u.id.toString() === formData.unitId);

    if (!selectedItem || !selectedUnit) {
      toast({
        title: "Invalid Selection",
        description: "Please select valid inventory item and unit.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      inventoryItemId: parseInt(formData.inventoryItemId),
      inventoryItemName: selectedItem.name,
      quantity: parseFloat(formData.quantity),
      unitId: parseInt(formData.unitId),
      unitName: selectedUnit.name,
      ratePerUnit: parseFloat(formData.ratePerUnit),
      returnDate: selectedDate,
      returnReason: formData.returnReason,
      partyId: formData.partyId ? parseInt(formData.partyId) : null,
      purchaseId: formData.purchaseId ? parseInt(formData.purchaseId) : null,
      notes: formData.notes,
    };

    if (editingReturn) {
      updateMutation.mutate({ id: editingReturn.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600 mt-1">
            {format(new Date(selectedDate), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto border-gray-300"
          />
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm();
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  + Add Purchase Return
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingReturn ? "Edit" : "Add"} Purchase Return
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Inventory Item *</Label>
                      <Select
                        value={formData.inventoryItemId}
                        onValueChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            inventoryItemId: val,
                          }))
                        }
                        disabled={inventoryLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                            >
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Unit *</Label>
                      <Select
                        value={formData.unitId}
                        onValueChange={(val) =>
                          setFormData((prev) => ({ ...prev, unitId: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>
                              {u.name} ({u.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Rate per Unit *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.ratePerUnit}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            ratePerUnit: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Return Reason</Label>
                      <Select
                        value={formData.returnReason}
                        onValueChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            returnReason: val,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item</SelectItem>
                          <SelectItem value="quality_issue">
                            Quality Issue
                          </SelectItem>
                          <SelectItem value="overorder">Over Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Supplier (Optional)</Label>
                      <Select
                        value={formData.partyId}
                        onValueChange={(val) =>
                          setFormData((prev) => ({ ...prev, partyId: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {parties
                            .filter(
                              (p) => p.type === "supplier" || p.type === "both",
                            )
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Calculated Amount</Label>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-lg font-semibold text-orange-700">
                        {formatCurrency(calculatedAmount)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Optional details..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
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
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold">
                  {dailySummary?.totalItems || 0}
                </p>
              </div>
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0v10l-8 4-8-4V7"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quantity</p>
                <p className="text-xl font-bold">
                  {dailySummary?.totalQuantity || 0}
                </p>
              </div>
              <svg
                className="w-8 h-8 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Loss</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(dailySummary?.totalLoss || 0)}
                </p>
              </div>
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={isDayClosed ? "destructive" : "default"}>
                  {isDayClosed ? "Closed" : "Open"}
                </Badge>
              </div>
              {isDayClosed ? (
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Management */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Day Status</h3>
              <p className="text-sm text-gray-600">
                {isDayClosed
                  ? "This day is closed. No new entries allowed."
                  : "You can add or edit purchase returns."}
              </p>
            </div>
            <div className="flex gap-2">
              {!isDayClosed ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={purchaseReturns.length === 0}
                    >
                      🔒 Close Day
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Day?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to close this day? You won't be
                        able to add more entries unless reopened.
                        <br />
                        <strong>
                          Total Loss:{" "}
                          {formatCurrency(dailySummary?.totalLoss || 0)}
                        </strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => closeDayMutation.mutate(selectedDate)}
                      >
                        {closeDayMutation.isPending
                          ? "Closing..."
                          : "Yes, Close"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">🔓 Reopen Day</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reopen Day?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will allow adding or editing purchase return
                        entries again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => reopenDayMutation.mutate(selectedDate)}
                      >
                        {reopenDayMutation.isPending
                          ? "Reopening..."
                          : "Yes, Reopen"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Purchase Returns{" "}
            <Badge variant="secondary">{purchaseReturns.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseReturnsLoading ? (
            <LoadingSpinner message="Loading..." />
          ) : purchaseReturns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchase returns recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.N</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                  {canModify && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseReturns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell className="font-medium">
                      {item.inventoryItemName}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unitName}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.ratePerUnit)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.returnReason.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.notes || "—"}</TableCell>
                    {canModify && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                          >
                            ✏️
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            🗑️
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
