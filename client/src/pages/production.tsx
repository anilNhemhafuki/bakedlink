import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import EnhancedProductionSchedule from "@/components/enhanced-production-schedule";

export default function Production() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-gray-600">
            Plan and track your production activities
          </p>
        </div>
        <Dialog open={false} onOpenChange={() => {}}>
          <DialogTrigger asChild>
            <Button onClick={() => {}} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Production
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {"" ? "Edit Production Item" : "Schedule New Production"}
              </DialogTitle>
              <DialogDescription>
                Enter production details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={() => {}} className="space-y-4">
              <div>
                <Select
                  value={""}
                  onValueChange={() => {}}
                  defaultValue={"" || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent></SelectContent>
                </Select>
                <input type="hidden" name="productId" value={""} />
              </div>
              <Input
                name="quantity"
                type="number"
                placeholder="Quantity"
                defaultValue={"" || ""}
                required
              />
              <Input
                name="scheduledDate"
                type="date"
                defaultValue={
                  "" ? new Date("").toISOString().split("T")[0] : ""
                }
                required
              />
              <Input
                name="startTime"
                type="time"
                placeholder="Start Time"
                defaultValue={"" ? new Date("").toTimeString().slice(0, 5) : ""}
              />
              <Input
                name="endTime"
                type="time"
                placeholder="End Time"
                defaultValue={"" ? new Date("").toTimeString().slice(0, 5) : ""}
              />
              <div>
                <Select
                  value={""}
                  onValueChange={() => {}}
                  defaultValue={"" || "scheduled"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="status" value={""} />
              </div>
              <Textarea
                name="notes"
                placeholder="Notes (optional)"
                defaultValue={"" || ""}
                rows={3}
              />
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {}}
                  className="text-red-600 hover:text-red-800 focus:outline-none"
                 
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={false || false}
                  className="w-full sm:w-auto"
                >
                  {"" ? "Update" : "Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <EnhancedProductionSchedule />
    </div>
  );
}
