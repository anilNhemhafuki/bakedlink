import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortConfig } from "@/hooks/useTableSort";

interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "center" | "right";
}

export function SortableTableHeader({
  children,
  sortKey,
  sortConfig,
  onSort,
  className,
  align = "left"
}: SortableTableHeaderProps) {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig?.direction : null;

  const getSortIcon = () => {
    if (!isActive) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return direction === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4 text-primary" />
      : <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
  };

  return (
    <TableHead 
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors user-select-none",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn(
        "flex items-center",
        align === "center" && "justify-center",
        align === "right" && "justify-end"
      )}>
        <span className={cn(isActive && "text-primary font-medium")}>
          {children}
        </span>
        {getSortIcon()}
      </div>
    </TableHead>
  );
}