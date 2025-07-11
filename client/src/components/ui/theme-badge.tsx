
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      completed: "default",
      in_progress: "secondary",
      pending: "outline",
      cancelled: "destructive",
      paid: "default",
      overdue: "destructive",
      active: "default",
      inactive: "outline",
    };
    return variants[status.toLowerCase()] || "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: "Completed",
      in_progress: "In Progress",
      pending: "Pending",
      cancelled: "Cancelled",
      paid: "Paid",
      overdue: "Overdue",
      active: "Active",
      inactive: "Inactive",
    };
    return labels[status.toLowerCase()] || status;
  };

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      className={cn(className)}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
