
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
import { Plus, Clock, Edit, Trash2, CalendarDays, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "@/components/search-bar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function AttendanceManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    staffId: "",
    date: "",
    clockIn: "",
    clockOut: "",
    breakStart: "",
    breakEnd: "",
    status: "present",
    notes: "",
  });

  const { toast } = useToast();

  // Set default date range (current week)
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  }, []);

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/staff"],
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedStaff, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStaff && selectedStaff !== "all") params.append('staffId', selectedStaff);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return apiRequest(`/api/attendance?${params.toString()}`, "GET");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/attendance", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest(`/api/attendance/${editingRecord?.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/attendance/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const clockInMutation = useMutation({
    mutationFn: async (staffId: number) => {
      await apiRequest("/api/attendance/clock-in", "POST", { staffId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clocked in successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (staffId: number) => {
      await apiRequest("/api/attendance/clock-out", "POST", { staffId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clocked out successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      staffId: "",
      date: "",
      clockIn: "",
      clockOut: "",
      breakStart: "",
      breakEnd: "",
      status: "present",
      notes: "",
    });
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staffId || !formData.date) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData = { ...formData };
    if (submitData.clockIn && submitData.clockOut) {
      const clockIn = new Date(`${submitData.date}T${submitData.clockIn}`);
      const clockOut = new Date(`${submitData.date}T${submitData.clockOut}`);
      const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      submitData.totalHours = hours.toString();
    }

    if (editingRecord) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    const date = new Date(record.date);
    setFormData({
      staffId: record.staffId?.toString() || "",
      date: format(date, 'yyyy-MM-dd'),
      clockIn: record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : "",
      clockOut: record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : "",
      breakStart: record.breakStart ? format(new Date(record.breakStart), 'HH:mm') : "",
      breakEnd: record.breakEnd ? format(new Date(record.breakEnd), 'HH:mm') : "",
      status: record.status || "present",
      notes: record.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this attendance record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleClockIn = (staffId: number) => {
    clockInMutation.mutate(staffId);
  };

  const handleClockOut = (staffId: number) => {
    clockOutMutation.mutate(staffId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { variant: "default" as const, label: "Present" },
      absent: { variant: "destructive" as const, label: "Absent" },
      late: { variant: "secondary" as const, label: "Late" },
      "half-day": { variant: "outline" as const, label: "Half Day" },
      sick: { variant: "secondary" as const, label: "Sick" },
      vacation: { variant: "outline" as const, label: "Vacation" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAttendance = attendance.filter((record: any) =>
    record.staffName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todaysAttendance = attendance.filter((record: any) => {
    const recordDate = new Date(record.date);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground">Track staff attendance and working hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Attendance Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? "Edit Attendance Record" : "Add Attendance Record"}
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

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clockIn">Clock In</Label>
                  <Input
                    id="clockIn"
                    type="time"
                    value={formData.clockIn}
                    onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="clockOut">Clock Out</Label>
                  <Input
                    id="clockOut"
                    type="time"
                    value={formData.clockOut}
                    onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breakStart">Break Start</Label>
                  <Input
                    id="breakStart"
                    type="time"
                    value={formData.breakStart}
                    onChange={(e) => setFormData({ ...formData, breakStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="breakEnd">Break End</Label>
                  <Input
                    id="breakEnd"
                    type="time"
                    value={formData.breakEnd}
                    onChange={(e) => setFormData({ ...formData, breakEnd: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
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
                    : editingRecord
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Clock In/Out */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Quick Clock In/Out
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member: any) => {
              const todayRecord = todaysAttendance.find((record: any) => record.staffId === member.id);
              return (
                <div key={member.id} className="border rounded-lg p-4">
                  <div className="font-medium">{member.firstName} {member.lastName}</div>
                  <div className="text-sm text-muted-foreground">{member.position}</div>
                  <div className="mt-2 space-x-2">
                    {!todayRecord || !todayRecord.clockIn ? (
                      <Button
                        size="sm"
                        onClick={() => handleClockIn(member.id)}
                        disabled={clockInMutation.isPending}
                      >
                        Clock In
                      </Button>
                    ) : !todayRecord.clockOut ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClockOut(member.id)}
                        disabled={clockOutMutation.isPending}
                      >
                        Clock Out
                      </Button>
                    ) : (
                      <Badge variant="default">Complete</Badge>
                    )}
                  </div>
                  {todayRecord && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {todayRecord.clockIn && `In: ${format(new Date(todayRecord.clockIn), 'HH:mm')}`}
                      {todayRecord.clockOut && ` Out: ${format(new Date(todayRecord.clockOut), 'HH:mm')}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <SearchBar
                placeholder="Search attendance..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Attendance Records ({filteredAttendance.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading attendance...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.staffName}</div>
                          <div className="text-sm text-muted-foreground">{record.staffPosition}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {record.breakStart && record.breakEnd ? (
                          <div className="text-sm">
                            {format(new Date(record.breakStart), 'HH:mm')} - {format(new Date(record.breakEnd), 'HH:mm')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.totalHours ? `${parseFloat(record.totalHours).toFixed(2)}h` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
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
