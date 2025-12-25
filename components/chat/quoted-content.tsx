'use client';

/**
 * QuotedContent - Displays quoted text above the chat input
 * Supports multiple quotes with reordering, editing, merge, export, and flexible operations
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  X, Quote, Trash2, ChevronUp, ChevronDown, 
  GripVertical, Copy, Pencil, Check, ChevronRight,
  Minimize2, Maximize2, CheckSquare, Square, Merge,
  Download, FileText, FileJson, FileCode, Keyboard
} from 'lucide-react';
import { useQuoteShortcuts } from '@/hooks/use-quote-shortcuts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuoteStore, type QuotedText, type ExportFormat } from '@/stores/quote-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuotedContentProps {
  className?: string;
}

export function QuotedContent({ className }: QuotedContentProps) {
  const t = useTranslations('quotedContent');
  const tToasts = useTranslations('toasts');
  const quotedTexts = useQuoteStore((state) => state.quotedTexts);
  const removeQuote = useQuoteStore((state) => state.removeQuote);
  const clearQuotes = useQuoteStore((state) => state.clearQuotes);
  const moveQuoteUp = useQuoteStore((state) => state.moveQuoteUp);
  const moveQuoteDown = useQuoteStore((state) => state.moveQuoteDown);
  const reorderQuotes = useQuoteStore((state) => state.reorderQuotes);
  const updateQuote = useQuoteStore((state) => state.updateQuote);
  const toggleCollapse = useQuoteStore((state) => state.toggleCollapse);
  const collapseAll = useQuoteStore((state) => state.collapseAll);
  const expandAll = useQuoteStore((state) => state.expandAll);
  const duplicateQuote = useQuoteStore((state) => state.duplicateQuote);
  const maxQuotes = useQuoteStore((state) => state.maxQuotes);
  
  // Selection mode
  const isSelectionMode = useQuoteStore((state) => state.isSelectionMode);
  const selectedIds = useQuoteStore((state) => state.selectedIds);
  const toggleSelectionMode = useQuoteStore((state) => state.toggleSelectionMode);
  const toggleSelect = useQuoteStore((state) => state.toggleSelect);
  const selectAll = useQuoteStore((state) => state.selectAll);
  const deselectAll = useQuoteStore((state) => state.deselectAll);
  const removeSelected = useQuoteStore((state) => state.removeSelected);
  const mergeSelected = useQuoteStore((state) => state.mergeSelected);
  const exportQuotes = useQuoteStore((state) => state.exportQuotes);
  const exportSelected = useQuoteStore((state) => state.exportSelected);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Enable keyboard shortcuts
  const { shortcuts } = useQuoteShortcuts({ enabled: quotedTexts.length > 0 });

  const handleDragStart = useCallback((index: number) => {
    if (!isSelectionMode) {
      setDraggedIndex(index);
    }
  }, [isSelectionMode]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderQuotes(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, reorderQuotes]);

  const handleExport = async (format: ExportFormat, selectedOnly: boolean = false) => {
    const content = selectedOnly ? exportSelected(format) : exportQuotes(format);
    if (!content) {
      toast.error(tToasts('noQuotesToExport'));
      return;
    }
    await navigator.clipboard.writeText(content);
    toast.success(tToasts('exported', { format: format.toUpperCase() }));
  };

  const handleMerge = () => {
    if (selectedIds.size < 2) {
      toast.error(tToasts('selectAtLeast2'));
      return;
    }
    mergeSelected();
    toast.success(tToasts('quotesMerged'));
  };

  const allCollapsed = quotedTexts.every(q => q.isCollapsed);
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === quotedTexts.length && quotedTexts.length > 0;

  if (quotedTexts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-t border-border/50 bg-muted/30 px-4 py-2',
        'animate-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Quote className="h-3.5 w-3.5" />
            <span>
              {t('quoted', { count: quotedTexts.length, max: maxQuotes })}
              {isSelectionMode && selectedCount > 0 && (
                <span className="ml-1 text-primary">• {t('selected', { count: selectedCount })}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Selection mode toggle */}
            {quotedTexts.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelectionMode ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleSelectionMode}
                  >
                    <CheckSquare className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSelectionMode ? t('exitSelection') : t('selectMode')}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Selection mode actions */}
            {isSelectionMode && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={allSelected ? deselectAll : selectAll}
                    >
                      {allSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {allSelected ? t('deselectAll') : t('selectAll')}
                  </TooltipContent>
                </Tooltip>

                {selectedCount >= 2 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary"
                        onClick={handleMerge}
                      >
                        <Merge className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('mergeSelected')}</TooltipContent>
                  </Tooltip>
                )}

                {selectedCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={removeSelected}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('deleteSelected')}</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            {/* Export dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                      <Download className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('export')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('markdown', isSelectionMode && selectedCount > 0)}>
                  <FileCode className="h-4 w-4 mr-2" />
                  {t('exportMarkdown')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('text', isSelectionMode && selectedCount > 0)}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('exportText')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json', isSelectionMode && selectedCount > 0)}>
                  <FileJson className="h-4 w-4 mr-2" />
                  {t('exportJson')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Keyboard shortcuts help */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                      <Keyboard className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('keyboardShortcuts')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {t('keyboardShortcuts')}
                </div>
                {shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Collapse/Expand all */}
            {quotedTexts.length > 1 && !isSelectionMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={allCollapsed ? expandAll : collapseAll}
                  >
                    {allCollapsed ? (
                      <Maximize2 className="h-3 w-3" />
                    ) : (
                      <Minimize2 className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {allCollapsed ? t('expandAll') : t('collapseAll')}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Clear all */}
            {quotedTexts.length > 1 && !isSelectionMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearQuotes}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('clearAll')}
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className={cn(quotedTexts.length > 2 && 'max-h-[180px]')}>
          <div className="space-y-2">
            {quotedTexts.map((quote, index) => (
              <QuoteItem
                key={quote.id}
                quote={quote}
                index={index}
                totalCount={quotedTexts.length}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(quote.id)}
                onSelect={() => toggleSelect(quote.id)}
                onRemove={() => removeQuote(quote.id)}
                onMoveUp={() => moveQuoteUp(quote.id)}
                onMoveDown={() => moveQuoteDown(quote.id)}
                onUpdate={(content) => updateQuote(quote.id, content)}
                onToggleCollapse={() => toggleCollapse(quote.id)}
                onDuplicate={() => duplicateQuote(quote.id)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface QuoteItemProps {
  quote: QuotedText;
  index: number;
  totalCount: number;
  isDragging: boolean;
  isDragOver: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (content: string) => void;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function QuoteItem({ 
  quote, 
  index,
  totalCount,
  isDragging,
  isDragOver,
  isSelectionMode,
  isSelected,
  onSelect,
  onRemove, 
  onMoveUp,
  onMoveDown,
  onUpdate,
  onToggleCollapse,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragEnd,
}: QuoteItemProps) {
  const tToasts = useTranslations('toasts');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(quote.content);

  const maxLength = 150;
  const truncatedContent =
    quote.content.length > maxLength
      ? quote.content.slice(0, maxLength) + '...'
      : quote.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(quote.content);
    toast.success(tToasts('copied'));
  };

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onUpdate(editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(quote.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      draggable={!isEditing && !isSelectionMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={isSelectionMode ? onSelect : undefined}
      className={cn(
        'group relative flex items-start gap-1 rounded-lg border bg-background/50 p-2 transition-all',
        isDragging && 'opacity-50 border-dashed',
        isDragOver && 'border-primary bg-primary/5',
        isSelected && 'border-primary bg-primary/10',
        isSelectionMode && 'cursor-pointer',
        !isDragging && !isDragOver && !isSelected && 'border-border/50 hover:border-border'
      )}
    >
      {/* Selection checkbox or Drag handle */}
      {isSelectionMode ? (
        <div className="shrink-0 flex items-center justify-center w-5">
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ) : (
        <div 
          className={cn(
            'shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Index badge */}
      <div className="shrink-0 w-5 text-center">
        <span className="text-[10px] text-muted-foreground font-medium">
          {index + 1}
        </span>
      </div>

      {/* Role badge */}
      <div className="shrink-0">
        <Badge
          variant={quote.messageRole === 'user' ? 'default' : 'secondary'}
          className="text-[10px] px-1.5 py-0"
        >
          {quote.messageRole === 'user' ? 'You' : 'AI'}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[60px] p-2 text-sm rounded border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSaveEdit}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : quote.isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{quote.content.slice(0, 50)}...</span>
          </button>
        ) : (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap overflow-wrap-break-word line-clamp-3">
            {truncatedContent}
          </p>
        )}
      </div>

      {/* Actions - hidden in selection mode */}
      {!isEditing && !isSelectionMode && (
        <div className={cn(
          'flex items-center gap-0.5 shrink-0',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}>
          {/* Move up/down */}
          {totalCount > 1 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={onMoveUp}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move up</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={onMoveDown}
                    disabled={index === totalCount - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move down</TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Collapse/Expand */}
          {!quote.isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={onToggleCollapse}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse</TooltipContent>
            </Tooltip>
          )}

          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          {/* Duplicate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onDuplicate}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          {/* Remove */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default QuotedContent;
