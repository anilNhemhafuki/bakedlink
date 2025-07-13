
import { useState } from "react";
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
import { Plus, DollarSign, Edit, Trash2, CreditCard, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function SalaryManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [formData, setFormData] = useState({
    staffId: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    basicSalary: "",
    overtimePay: "0",
    bonus: "0",
    allowances: "0",
    deductions: "0",
    tax: "0",
    paymentMethod: "bank_transfer",
    notes: "",
  });

  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });

  const { data: salaryPayments = [], isLoading } = useQuery({
    queryKey: ["/api/salary-payments", selectedStaff],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStaff) params.append('staffId', selectedStaff);
      
      return apiRequest(`/api/salary-payments?${params.toString()}`, "GET");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/salary-payments", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary payment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest(`/api/salary-payments/${editingPayment?.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary payment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/salary-payments/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary payment deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-payments"] });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      basicSalary: "",
      overtimePay: "0",
      bonus: "0",
      allowances: "0",
      deductions: "0",
      tax: "0",
      paymentMethod: "bank_transfer",
      notes: "",
    });
    setEditingPayment(null);
  };

  const calculateNetPay = () => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const overtime = parseFloat(formData.overtimePay) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const tax = parseFloat(formData.tax) || 0;
    
    return basic + overtime + bonus + allowances - deductions - tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staffId || !formData.payPeriodStart || !formData.payPeriodEnd || !formData.basicSalary) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    const netPay = calculateNetPay();
    const submitData = {
      ...formData,
      netPay: netPay.toString(),
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
      payPeriodStart: format(new Date(payment.payPeriodStart), 'yyyy-MM-dd'),
      payPeriodEnd: format(new Date(payment.payPeriodEnd), 'yyyy-MM-dd'),
      basicSalary: payment.basicSalary || "",
      overtimePay: payment.overtimePay || "0",
      bonus: payment.bonus || "0",
      allowances: payment.allowances || "0",
      deductions: payment.deductions || "0",
      tax: payment.tax || "0",
      paymentMethod: payment.paymentMethod || "bank_transfer",
      notes: payment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this salary payment?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      paid: { variant: "default" as const, label: "Paid" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPayments = salaryPayments.filter((payment: any) =>
    payment.staffName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Salary Management
          </h1>
          <p className="text-muted-foreground">Manage staff salary payments and payroll</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Salary Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? "Edit Salary Payment" : "Add Salary Payment"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="staffId">Staff Member *</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member: any) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName} - {member.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payPeriodStart">Pay Period Start *</Label>
                  <Input
                    id="payPeriodStart"
                    type="date"
                    value={formData.payPeriodStart}
                    onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payPeriodEnd">Pay Period End *</Label>
                  <Input
                    id="payPeriodEnd"
                    type="date"
                    value={formData.payPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, overtimePay: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="allowances">Allowances</Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tax">Tax</Label>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Pay:</span>
                  <span className="text-lg font-bold">${calculateNetPay().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingPayment
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">
                  ${salaryPayments.reduce((sum: number, payment: any) => sum + parseFloat(payment.netPay || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">
                  {salaryPayments.filter((payment: any) => payment.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">
                  {salaryPayments.filter((payment: any) => {
                    const paymentDate = new Date(payment.payPeriodEnd);
                    const now = new Date();
                    return paymentDate.getMonth() === now.getMonth() && 
                           paymentDate.getFullYear() === now.getFullYear() &&
                           payment.status === 'paid';
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Average Salary</p>
                <p className="text-2xl font-bold">
                  ${salaryPayments.length > 0 ? 
                    (salaryPayments.reduce((sum: number, payment: any) => sum + parseFloat(payment.basicSalary || 0), 0) / salaryPayments.length).toFixed(2) :
                    '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="staffFilter">Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All staff</SelectItem>
                  {staff.map((member: any) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <SearchBar
                placeholder="Search salary payments..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Payments ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading salary payments...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.staffName}</div>
                          <div className="text-sm text-muted-foreground">{payment.staffPosition}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(payment.payPeriodStart), 'MMM dd')} - {format(new Date(payment.payPeriodEnd), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>${parseFloat(payment.basicSalary || 0).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(payment.overtimePay || 0).toFixed(2)}</TableCell>
                      <TableCell>${parseFloat(payment.bonus || 0).toFixed(2)}</TableCell>
                      <TableCell>${(parseFloat(payment.deductions || 0) + parseFloat(payment.tax || 0)).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${parseFloat(payment.netPay || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
