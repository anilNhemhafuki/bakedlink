import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPreviousNext?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPreviousNext = true,
  className,
}: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [];

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className={cn("flex items-center justify-center space-x-2", className)}
      aria-label="Pagination"
    >
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3"
        >
          &laquo;
        </Button>
      )}

      {showPreviousNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3"
        >
          &lsaquo;
        </Button>
      )}

      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === "..." ? (
            <span className="px-3 py-2 text-sm text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="px-3"
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      {showPreviousNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3"
        >
          &rsaquo;
        </Button>
      )}

      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3"
        >
          &raquo;
        </Button>
      )}
    </nav>
  );
}

// Pagination info component
interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Showing {startItem} to {endItem} of {totalItems} results
    </div>
  );
}

// Page size selector component
interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-muted-foreground">Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="border border-input bg-background px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  );
}

// Hook for pagination logic
export function usePagination<T>(data: T[], initialPageSize: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: data.length,
    paginatedData,
    handlePageChange,
    handlePageSizeChange,
  };
}
