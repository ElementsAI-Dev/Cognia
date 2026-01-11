'use client';

/**
 * A2UI Table Component
 * Maps to shadcn/ui Table
 */

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { A2UIComponentProps, A2UITableComponent, A2UITableColumn } from '@/types/artifact/a2ui';
import { useA2UIContext } from '../../a2ui-context';
import { resolveArrayOrPath } from '@/lib/a2ui/data-model';

type SortDirection = 'asc' | 'desc' | null;

export function A2UITable({ component, onAction }: A2UIComponentProps<A2UITableComponent>) {
  const { dataModel } = useA2UIContext();

  // Resolve data - can be static array or data-bound
  const data = useMemo(() => {
    if (Array.isArray(component.data)) {
      return component.data;
    }
    return resolveArrayOrPath(component.data, dataModel, []);
  }, [component.data, dataModel]);

  const columns = component.columns || [];
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = component.pageSize || 10;

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!component.pagination) return sortedData;
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, component.pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }

    if (component.sortAction) {
      onAction(component.sortAction, { column: columnKey, direction: sortDirection });
    }
  }, [sortColumn, sortDirection, component.sortAction, onAction]);

  const handleRowClick = useCallback((row: Record<string, unknown>, index: number) => {
    if (component.rowClickAction) {
      onAction(component.rowClickAction, { row, index });
    }
  }, [component.rowClickAction, onAction]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (component.pageChangeAction) {
      onAction(component.pageChangeAction, { page, pageSize });
    }
  }, [component.pageChangeAction, onAction, pageSize]);

  const renderSortIcon = (column: A2UITableColumn) => {
    if (!column.sortable) return null;

    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  const renderCell = (row: Record<string, unknown>, column: A2UITableColumn): React.ReactNode => {
    const value = row[column.key];

    // Custom renderer
    if (column.render) {
      return column.render(value, row) as React.ReactNode;
    }

    // Format based on type
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    if (column.type === 'number') {
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    }

    if (column.type === 'date') {
      try {
        return new Date(value as string).toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    if (column.type === 'boolean') {
      return value ? '✓' : '✗';
    }

    return String(value);
  };

  return (
    <div
      className={cn('w-full', component.className)}
      style={component.style as React.CSSProperties}
    >
      {component.title && (
        <h3 className="mb-2 text-sm font-medium">{component.title}</h3>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer select-none',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header || column.key}
                    {renderSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {component.emptyMessage || 'No data available'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={(row.id as string | number) ?? index}
                  className={cn(
                    component.rowClickAction && 'cursor-pointer hover:bg-muted/50'
                  )}
                  onClick={() => handleRowClick(row, index)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderCell(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {component.pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, sortedData.length)} of{' '}
            {sortedData.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
