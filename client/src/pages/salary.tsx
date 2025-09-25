import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SalaryPayments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [formData, setFormData] = useState({
    staffId: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    basicSalary: "",
    overtimePay: "",
    bonus: "",
    allowances: "",
    deductions: "",
    taxPercentage: "0",
    taxAmount: "0",
    netPay: "0",
    paymentDate: new Date().toISOString().split("T")[0], // default today
    paymentMethod: "bank_transfer",
    status: "pending",
    notes: "",
  });

  const { toast } = useToast();

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiRequest("GET", "/api/staff"),
  });

  const { data: salaryPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["salary-payments", selectedStaff],
    queryFn: async () => {
      const params = selectedStaff ? `?staffId=${selectedStaff}` : "";
      const result = await apiRequest("GET", `/api/salary-payments${params}`);
      // Ensure we always return an array
      if (Array.isArray(result)) {
        return result;
      } else if (result && Array.isArray(result.items)) {
        return result.items;
      } else if (result && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/salary-payments", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary payment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary payment",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        "PUT",
        `/api/salary-payments/${editingPayment?.id}`,
        data,
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary payment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary payment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      basicSalary: "",
      overtimePay: "",
      bonus: "",
      allowances: "",
      deductions: "",
      taxPercentage: "0",
      taxAmount: "0",
      netPay: "0",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "bank_transfer",
      status: "pending",
      notes: "",
    });
    setEditingPayment(null);
  };

  // Auto-calculate tax and net pay whenever financial fields change
  useEffect(() => {
    const basicSalary = parseFloat(formData.basicSalary) || 0;
    const overtimePay = parseFloat(formData.overtimePay) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const taxPercentage = parseFloat(formData.taxPercentage) || 0;

    const grossPay = basicSalary + overtimePay + bonus + allowances;
    const taxAmount = (grossPay * taxPercentage) / 100;
    const netPay = grossPay - deductions - taxAmount;

    setFormData((prev) => ({
      ...prev,
      taxAmount: taxAmount.toFixed(2),
      netPay: netPay.toFixed(2),
    }));
  }, [
    formData.basicSalary,
    formData.overtimePay,
    formData.bonus,
    formData.allowances,
    formData.deductions,
    formData.taxPercentage,
  ]);

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { staffId, payPeriodStart, payPeriodEnd, basicSalary } = formData;

    if (!staffId || !payPeriodStart || !payPeriodEnd || !basicSalary) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (new Date(payPeriodStart) > new Date(payPeriodEnd)) {
      toast({
        title: "Error",
        description: "Pay period start must be before end date",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      staffId: parseInt(staffId),
      basicSalary: parseFloat(formData.basicSalary) || 0,
      overtimePay: parseFloat(formData.overtimePay) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      allowances: parseFloat(formData.allowances) || 0,
      deductions: parseFloat(formData.deductions) || 0,
      taxPercentage: parseFloat(formData.taxPercentage) || 0,
      taxAmount: parseFloat(formData.taxAmount) || 0,
      netPay: parseFloat(formData.netPay) || 0,
    };

    if (editingPayment) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
    setFormData({
      staffId: payment.staffId?.toString() || "",
      payPeriodStart: payment.payPeriodStart
        ? new Date(payment.payPeriodStart).toISOString().split("T")[0]
        : "",
      payPeriodEnd: payment.payPeriodEnd
        ? new Date(payment.payPeriodEnd).toISOString().split("T")[0]
        : "",
      basicSalary: payment.basicSalary?.toString() || "0",
      overtimePay: payment.overtimePay?.toString() || "0",
      bonus: payment.bonus?.toString() || "0",
      allowances: payment.allowances?.toString() || "0",
      deductions: payment.deductions?.toString() || "0",
      taxPercentage: payment.taxPercentage?.toString() || "0",
      taxAmount: payment.taxAmount?.toString() || "0",
      netPay: payment.netPay?.toString() || "0",
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      paymentMethod: payment.paymentMethod || "bank_transfer",
      status: payment.status || "pending",
      notes: payment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      paid: { variant: "default" as const, label: "Paid" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPayments = (
    Array.isArray(salaryPayments) ? salaryPayments : []
  ).filter(
    (payment: any) =>
      payment.staffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.staffPosition?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const { sortedData, sortConfig, requestSort } = useTableSort(
    filteredPayments,
    "paymentDate",
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-muted-foreground">
            Manage staff salary payments and payroll
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Salary Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPayment
                  ? "Edit Salary Payment"
                  : "Add New Salary Payment"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staffId">Staff Member *</Label>
                  <Select
                    value={formData.staffId || undefined}
                    onValueChange={(value) =>
                      handleFormChange("staffId", value)
                    }
                    disabled={!!editingPayment} // prevent changing staff when editing
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member: any) => (
                        <SelectItem
                          key={member.id}
                          value={member.id.toString()}
                        >
                          {member.firstName} {member.lastName} -{" "}
                          {member.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod || undefined}
                    onValueChange={(value) =>
                      handleFormChange("paymentMethod", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payPeriodStart">Pay Period Start *</Label>
                  <Input
                    id="payPeriodStart"
                    type="date"
                    value={formData.payPeriodStart}
                    onChange={(e) =>
                      handleFormChange("payPeriodStart", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payPeriodEnd">Pay Period End *</Label>
                  <Input
                    id="payPeriodEnd"
                    type="date"
                    value={formData.payPeriodEnd}
                    onChange={(e) =>
                      handleFormChange("payPeriodEnd", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basicSalary">Basic Salary *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    value={formData.basicSalary}
                    onChange={(e) =>
                      handleFormChange("basicSalary", e.target.value)
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="overtimePay">Overtime Pay</Label>
                  <Input
                    id="overtimePay"
                    type="number"
                    step="0.01"
                    value={formData.overtimePay}
                    onChange={(e) =>
                      handleFormChange("overtimePay", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bonus">Bonus</Label>
                  <Input
                    id="bonus"
                    type="number"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => handleFormChange("bonus", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="allowances">Allowances</Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    value={formData.allowances}
                    onChange={(e) =>
                      handleFormChange("allowances", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deductions">Deductions</Label>
                  <Input
                    id="deductions"
                    type="number"
                    step="0.01"
                    value={formData.deductions}
                    onChange={(e) =>
                      handleFormChange("deductions", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                  <Input
                    id="taxPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxPercentage}
                    onChange={(e) =>
                      handleFormChange("taxPercentage", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tax Amount (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.taxAmount}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Net Pay (Auto-calculated)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.netPay}
                    readOnly
                    className="bg-gray-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      handleFormChange("paymentDate", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || undefined}
                    onValueChange={(value) => handleFormChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
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
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingPayment ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Search salary payments..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full"
          />
        </div>
        <Select
          value={selectedStaff || undefined}
          onValueChange={setSelectedStaff}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map((member: any) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {member.firstName} {member.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Payments ({sortedData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading || staffLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">
                Loading salary payments...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      sortKey="staffName"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Staff Member
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="payPeriodStart"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Pay Period
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="basicSalary"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Basic Salary
                    </SortableTableHeader>
                    <TableHead>Tax (%)</TableHead>
                    <TableHead>Tax Amount</TableHead>
                    <SortableTableHeader
                      sortKey="netPay"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                    >
                      Net Pay
                    </SortableTableHeader>
                    <SortableTableHeader
                      sortKey="status"
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
                    sortedData.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{payment.staffName}</div>
                            <div className="text-sm text-muted-foreground">
                              {payment.staffPosition}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              {new Date(
                                payment.payPeriodStart,
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-muted-foreground">
                              to{" "}
                              {new Date(
                                payment.payPeriodEnd,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          Rs. {parseFloat(payment.basicSalary || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{payment.taxPercentage || 0}%</TableCell>
                        <TableCell>
                          Rs. {parseFloat(payment.taxAmount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-bold">
                          Rs. {parseFloat(payment.netPay || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status || "pending")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No salary payments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
