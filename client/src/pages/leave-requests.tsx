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
import { Plus, Calendar, Edit, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { format } from "date-fns";

export default function LeaveRequests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    staffId: "",
    leaveType: "vacation",
    startDate: "",
    endDate: "",
    reason: "",
    notes: "",
    status: "pending",
  });

  const { toast } = useToast();

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["/api/leave-requests", selectedStaff, filterStatus],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/leave-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create leave request",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/leave-requests/${editingRequest.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setIsDialogOpen(false);
      setEditingRequest(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave request",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leave-requests/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete leave request",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: "",
      leaveType: "vacation",
      startDate: "",
      endDate: "",
      reason: "",
      notes: "",
      status: "pending",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.staffId || !formData.startDate || !formData.endDate || !formData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate date range
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before or equal to end date",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      staffId: parseInt(formData.staffId),
    };
    
    if (editingRequest) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (request: any) => {
    setEditingRequest(request);
    setFormData({
      staffId: request.staffId.toString(),
      leaveType: request.leaveType,
      startDate: request.startDate ? request.startDate.split('T')[0] : "",
      endDate: request.endDate ? request.endDate.split('T')[0] : "",
      reason: request.reason || "",
      notes: request.notes || "",
      status: request.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "outline" as const, label: "Pending", icon: Clock },
      approved: { variant: "default" as const, label: "Approved", icon: CheckCircle },
      rejected: { variant: "destructive" as const, label: "Rejected", icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const typeConfig = {
      vacation: { variant: "default" as const, label: "Vacation" },
      sick: { variant: "secondary" as const, label: "Sick Leave" },
      personal: { variant: "outline" as const, label: "Personal" },
      emergency: { variant: "destructive" as const, label: "Emergency" },
      maternity: { variant: "secondary" as const, label: "Maternity" },
      paternity: { variant: "secondary" as const, label: "Paternity" },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.vacation;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredRequests = leaveRequests.filter((request: any) => {
    const matchesSearch = `${request.staffName} ${request.leaveType} ${request.reason}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStaff = selectedStaff === "all" || request.staffId.toString() === selectedStaff;
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    
    return matchesSearch && matchesStaff && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Leave Requests
          </h1>
          <p className="text-muted-foreground">Manage employee leave requests and approvals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRequest ? "Edit Leave Request" : "New Leave Request"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staffId">Staff Member *</Label>
                  <Select value={formData.staffId || undefined} onValueChange={(value) => setFormData({ ...formData, staffId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member: any) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select value={formData.leaveType || undefined} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="maternity">Maternity</SelectItem>
                      <SelectItem value="paternity">Paternity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for the leave request"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes or comments"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status || undefined} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRequest ? "Update" : "Create"} Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="staffFilter">Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((member: any) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <SearchBar
                placeholder="Search leave requests..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading leave requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.staffName}</TableCell>
                      <TableCell>{getLeaveTypeBadge(request.leaveType)}</TableCell>
                      <TableCell>{request.startDate ? format(new Date(request.startDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                      <TableCell>{request.endDate ? format(new Date(request.endDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                      <TableCell>
                        {request.startDate && request.endDate
                          ? `${Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1)} days`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(request)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmationDialog
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title="Delete Leave Request"
                            itemName={`${request.staffName}'s ${request.leaveType} request`}
                            onConfirm={() => handleDelete(request.id)}
                            isLoading={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <p className="text-muted-foreground">No leave requests found</p>
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