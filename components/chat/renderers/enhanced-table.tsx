'use client';

/**
 * EnhancedTable - Interactive table renderer with sorting, filtering, and export
 * Features:
 * - Column sorting
 * - Search/filter
 * - Pagination
 * - Copy to clipboard
 * - Export to Excel/CSV/Google Sheets
 * - Fullscreen view
 * - Responsive design
 */

import { useState, useMemo, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Copy,
  Check,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Table2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/use-copy';
import type { TableData } from '@/lib/export/excel-export';

interface EnhancedTableProps {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  title?: string;
  className?: string;
  showToolbar?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: number | null;
  direction: SortDirection;
}

export const EnhancedTable = memo(function EnhancedTable({
  headers,
  rows,
  title,
  className,
  showToolbar = true,
  showPagination = true,
  pageSize = 10,
  sortable = true,
  searchable = true,
  exportable = true,
}: EnhancedTableProps) {
  const t = useTranslations('table');
  const tToasts = useTranslations('toasts');
  
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('tableCopied') });

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(query))
    );
  }, [rows, searchQuery]);

  // Sort filtered rows
  const sortedRows = useMemo(() => {
    if (sortState.column === null || sortState.direction === null) {
      return filteredRows;
    }

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Try numeric comparison first
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortState.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortState.direction === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [filteredRows, sortState]);

  // Paginate sorted rows
  const paginatedRows = useMemo(() => {
    if (!showPagination) return sortedRows;
    
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  // Handle column sort
  const handleSort = useCallback((columnIndex: number) => {
    if (!sortable) return;

    setSortState((prev) => {
      if (prev.column !== columnIndex) {
        return { column: columnIndex, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnIndex, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, [sortable]);

  // Copy table to clipboard
  const handleCopy = useCallback(async () => {
    const headerLine = headers.join('\t');
    const dataLines = rows.map((row) => row.map((c) => String(c ?? '')).join('\t'));
    const content = [headerLine, ...dataLines].join('\n');
    await copy(content);
  }, [headers, rows, copy]);

  // Get table data for export
  const getTableData = useCallback((): TableData => ({
    headers,
    rows,
    title,
  }), [headers, rows, title]);

  // Export handlers
  const handleExportExcel = useCallback(async () => {
    const { exportAndDownloadExcel } = await import('@/lib/export/excel-export');
    await exportAndDownloadExcel(getTableData(), title || 'table-data');
  }, [getTableData, title]);

  const handleExportCSV = useCallback(async () => {
    const { exportAndDownloadCSV } = await import('@/lib/export/google-sheets-export');
    exportAndDownloadCSV(getTableData(), title || 'table-data');
  }, [getTableData, title]);

  const handleOpenGoogleSheets = useCallback(async () => {
    const { openInGoogleSheets } = await import('@/lib/export/google-sheets-export');
    openInGoogleSheets(getTableData());
  }, [getTableData]);

  const handleCopyForSheets = useCallback(async () => {
    const { copyTableAsHTML } = await import('@/lib/export/google-sheets-export');
    await copyTableAsHTML(getTableData());
  }, [getTableData]);

  // Render sort icon
  const renderSortIcon = (columnIndex: number) => {
    if (!sortable) return null;
    
    if (sortState.column !== columnIndex) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortState.direction === 'asc') {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  // Table content renderer
  const renderTable = (inFullscreen = false) => (
    <div className={cn('overflow-x-auto', inFullscreen && 'max-h-[70vh]')}>
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                onClick={() => handleSort(index)}
                className={cn(
                  'border border-border px-4 py-2 text-left font-semibold text-sm',
                  sortable && 'cursor-pointer hover:bg-accent transition-colors select-none'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{header}</span>
                  {renderSortIcon(index)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedRows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="border border-border px-4 py-8 text-center text-muted-foreground"
              >
                {searchQuery ? t('noResults') : t('noData')}
              </td>
            </tr>
          ) : (
            paginatedRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-muted/50 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-border px-4 py-2 text-sm"
                  >
                    {formatCellValue(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className={cn('group rounded-lg border overflow-hidden my-4', className)}>
        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b flex-wrap">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              {title && <span className="text-sm font-medium">{title}</span>}
              <span className="text-xs text-muted-foreground">
                {sortedRows.length} {t('rows')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Search */}
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="h-7 w-32 pl-7 text-xs"
                  />
                </div>
              )}

              {/* Copy button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopy}
                    disabled={isCopying}
                  >
                    {isCopying ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('copy')}</TooltipContent>
              </Tooltip>

              {/* Export dropdown */}
              {exportable && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t('export')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {t('exportExcel')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <Table2 className="h-4 w-4 mr-2" />
                      {t('exportCSV')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopyForSheets}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('copyForSheets')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenGoogleSheets}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('openGoogleSheets')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Fullscreen button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('fullscreen')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Table */}
        {renderTable(false)}

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t text-xs">
            <span className="text-muted-foreground">
              {t('showing')} {currentPage * pageSize + 1}-
              {Math.min((currentPage + 1) * pageSize, sortedRows.length)} {t('of')}{' '}
              {sortedRows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              <span>{title || t('tableView')}</span>
              <span className="text-muted-foreground font-normal text-sm ml-2">
                {sortedRows.length} {t('rows')} × {headers.length} {t('columns')}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Fullscreen toolbar */}
          <div className="flex items-center justify-between gap-2 py-2 border-b">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="h-8 w-48 pl-8"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
                {isCopying ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {t('copy')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Table2 className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {/* Fullscreen table */}
          <div className="flex-1 overflow-auto">
            {renderTable(true)}
          </div>

          {/* Fullscreen pagination */}
          {showPagination && totalPages > 1 && (
            <div className="flex items-center justify-between py-2 border-t text-sm">
              <span className="text-muted-foreground">
                {t('showing')} {currentPage * pageSize + 1}-
                {Math.min((currentPage + 1) * pageSize, sortedRows.length)} {t('of')}{' '}
                {sortedRows.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous')}
                </Button>
                <span className="px-2">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  {t('next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

/**
 * Format cell value for display
 */
function formatCellValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number') {
    // Format large numbers with commas
    if (Number.isInteger(value) && Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    // Format decimals to 2 places
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
  }
  return String(value);
}

export default EnhancedTable;
