import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  totalPages,
  totalItems,
  className,
}: PaginationInfoProps) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Page {currentPage} of {totalPages} ({totalItems} total items)
    </div>
  );
}

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-muted-foreground">Show</span>
      <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">items</span>
    </div>
  );
}

export function usePagination<T>(
  data: T[],
  initialPageSize = 10
) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Reset to last page if current page exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = data.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const previousPage = () => {
    goToPage(currentPage - 1);
  };

  const onPageSizeChange = (newSize: number) => {
    const currentStartIndex = (currentPage - 1) * pageSize;
    const newPage = Math.floor(currentStartIndex / newSize) + 1;
    setPageSize(newSize);
    setCurrentPage(newPage);
  };

  return {
    currentItems,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    setPageSize: onPageSizeChange,
    goToPage,
    nextPage,
    previousPage,
  };
}