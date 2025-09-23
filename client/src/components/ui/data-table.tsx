
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
} from "@/components/ui/pagination";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  className?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortKey?: string; // Custom sort key if different from column key
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  disabled?: (row: T) => boolean;
}

export interface DataTableProps<T> {
  title?: string;
  description?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  loading?: boolean;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterable?: boolean;
  onFilterClick?: () => void;
  exportable?: boolean;
  onExportClick?: () => void;
  refreshable?: boolean;
  onRefreshClick?: () => void;
  // Pagination props
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // Sorting props
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  // Additional props
  emptyMessage?: string;
  className?: string;
  headerActions?: React.ReactNode;
  showPaginationInfo?: boolean;
  pageSizeOptions?: number[];
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  actions,
  loading = false,
  error,
  searchable = false,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filterable = false,
  onFilterClick,
  exportable = false,
  onExportClick,
  refreshable = false,
  onRefreshClick,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  sortConfig,
  onSort,
  emptyMessage = "No records found",
  className,
  headerActions,
  showPaginationInfo = true,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTableProps<T>) {
  const hasHeader = title || description || searchable || filterable || exportable || refreshable || headerActions;

  const renderCellContent = (column: DataTableColumn<T>, row: T, index: number) => {
    if (column.render) {
      return column.render(row[column.key], row, index);
    }
    
    const value = row[column.key];
    
    // Handle common data types
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }
    
    if (typeof value === 'number' && column.key.toLowerCase().includes('amount')) {
      return <span className="font-medium">${value.toFixed(2)}</span>;
    }
    
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  return (
    <Card className={cn("w-full", className)}>
      {hasHeader && (
        <CardHeader>
          <div className="flex flex-col space-y-4">
            {(title || description) && (
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                {searchable && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  {filterable && (
                    <Button variant="outline" size="sm" onClick={onFilterClick}>
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  )}
                  
                  {exportable && (
                    <Button variant="outline" size="sm" onClick={onExportClick}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  )}
                  
                  {refreshable && (
                    <Button variant="outline" size="sm" onClick={onRefreshClick}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
              
              {headerActions && (
                <div className="flex gap-2">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {error && (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={cn(column.className)}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {column.sortable && onSort ? (
                          <SortableTableHeader
                            sortKey={column.sortKey || column.key}
                            sortConfig={sortConfig}
                            onSort={onSort}
                          >
                            {column.title}
                          </SortableTableHeader>
                        ) : (
                          column.title
                        )}
                      </TableHead>
                    ))}
                    {actions && actions.length > 0 && (
                      <TableHead className="w-32">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + (actions?.length ? 1 : 0)}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, index) => (
                      <TableRow key={row.id || index} className="hover:bg-muted/50">
                        {columns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn(column.className)}
                          >
                            {renderCellContent(column, row, index)}
                          </TableCell>
                        ))}
                        {actions && actions.length > 0 && (
                          <TableCell>
                            <div className="flex gap-1">
                              {actions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant={action.variant || "ghost"}
                                  size="sm"
                                  onClick={() => action.onClick(row)}
                                  disabled={action.disabled?.(row)}
                                  className={cn("h-8 w-8 p-0", action.className)}
                                  title={action.label}
                                >
                                  {action.icon}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {totalItems > 0 && (
              <div className="px-6 py-4 border-t flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <PageSizeSelector
                    pageSize={pageSize}
                    onPageSizeChange={onPageSizeChange}
                    options={pageSizeOptions}
                  />
                  {showPaginationInfo && (
                    <PaginationInfo
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                    />
                  )}
                </div>
                
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
