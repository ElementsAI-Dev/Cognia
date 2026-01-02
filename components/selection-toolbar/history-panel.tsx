"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useSelectionStore, type SelectionHistoryItem } from "@/stores/context";
import { 
  Clock, 
  Trash2, 
  Copy, 
  RotateCcw, 
  X, 
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  MoreHorizontal,
  Download,
  Sparkles,
  Languages,
  BookOpen,
  FileText,
  PenLine,
  CheckCircle,
  BookMarked,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectionAction } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  explain: "Explained",
  translate: "Translated",
  extract: "Key Points",
  summarize: "Summarized",
  define: "Defined",
  rewrite: "Rewritten",
  grammar: "Grammar Check",
  copy: "Copied",
  search: "Searched",
  "code-explain": "Code Explained",
  "code-optimize": "Optimized",
  "tone-formal": "Formalized",
  "tone-casual": "Casualized",
  expand: "Expanded",
  shorten: "Shortened",
};

const ACTION_ICONS: Record<string, typeof BookOpen> = {
  explain: BookOpen,
  translate: Languages,
  extract: FileText,
  summarize: Sparkles,
  define: BookMarked,
  rewrite: PenLine,
  grammar: CheckCircle,
};

type FilterOption = "all" | SelectionAction;

interface HistoryItemProps {
  item: SelectionHistoryItem;
  isSelected: boolean;
  onCopy: (text: string) => void;
  onReuse: (text: string) => void;
  onSelect: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

function HistoryItem({ 
  item, 
  isSelected,
  onCopy, 
  onReuse, 
  onSelect,
  onToggleFavorite,
}: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    onCopy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  const ActionIcon = ACTION_ICONS[item.action] || Sparkles;

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        "hover:shadow-md",
        expanded 
          ? "bg-card border-primary/30 shadow-sm" 
          : "bg-card/50 border-border/30 hover:border-border/60 hover:bg-card/80",
        isSelected && "ring-2 ring-primary/50 border-primary/50"
      )}
    >
      {/* Selection checkbox (visible on hover) */}
      <div
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100"
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "p-3 cursor-pointer transition-all",
          "group-hover:pl-9",
          isSelected && "pl-9"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center",
              "bg-primary/10 text-primary"
            )}>
              <ActionIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-medium text-primary">
              {ACTION_LABELS[item.action] || item.action}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(item.timestamp)}
            </span>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90"
            )} />
          </div>
        </div>

        {/* Original Text Preview */}
        <p className={cn(
          "text-sm text-foreground/80 transition-all",
          expanded ? "" : "line-clamp-2"
        )}>
          {item.text}
        </p>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-muted/30 rounded-lg p-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Result
              </span>
              <p className="text-sm text-foreground mt-1.5 leading-relaxed">
                {item.result}
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1.5 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(item.result);
                }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Result"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onReuse(item.text);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reuse Text
              </Button>
              
              {/* More menu */}
              <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  {onToggleFavorite && (
                    <DropdownMenuItem onClick={() => onToggleFavorite(item.id)} className="text-xs gap-2">
                      <Star className="w-3.5 h-3.5" />
                      Favorite
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleCopy(item.text)} className="text-xs gap-2">
                    <Copy className="w-3.5 h-3.5" />
                    Copy Original
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SelectionHistoryPanel() {
  const t = useTranslations('selectionHistory');
  const { history, clearHistory } = useSelectionStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filter and search history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch = searchQuery === "" || 
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.result.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterAction === "all" || item.action === filterAction;
      return matchesSearch && matchesFilter;
    });
  }, [history, searchQuery, filterAction]);

  // Get unique actions for filter
  const availableActions = useMemo(() => {
    const actions = new Set(history.map((item) => item.action));
    return Array.from(actions);
  }, [history]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleReuse = (text: string) => {
    if (typeof window !== "undefined" && window.__TAURI__) {
      import("@tauri-apps/api/event").then(({ emit }) => {
        emit("selection-reuse", { text });
      });
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredHistory.map((item) => item.id)));
    }
  };

  const handleExport = () => {
    const exportData = selectedItems.size > 0
      ? history.filter((item) => selectedItems.has(item.id))
      : history;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selection-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "fixed bottom-4 right-4 gap-2",
          "shadow-lg hover:shadow-xl transition-shadow",
          "bg-background/80 backdrop-blur-sm"
        )}
        onClick={() => setIsOpen(true)}
      >
        <Clock className="w-4 h-4" />
        {t('history')}
        {history.length > 0 && (
          <Badge variant="secondary" className="h-5 text-[10px]">
            {history.length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 w-96",
        "bg-background/95 backdrop-blur-xl",
        "border rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom-4 zoom-in-95 duration-300",
        "flex flex-col max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span>{t('title')}</span>
            <p className="text-[10px] text-muted-foreground font-normal">
              {t('itemCount', { filtered: filteredHistory.length, total: history.length })}
            </p>
          </div>
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleExport}
            title={t('exportHistory')}
          >
            <Download className="w-4 h-4" />
          </Button>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={clearHistory}
              title={t('clearAllHistory')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-3 border-b space-y-2 shrink-0">
        <InputGroup className="h-9">
          <InputGroupAddon align="inline-start">
            <Search className="w-4 h-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </InputGroup>
        
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1",
              showFilters && "bg-accent"
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            {t('filter')}
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              showFilters && "rotate-180"
            )} />
          </Button>
          
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{t('selected', { count: selectedItems.size })}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedItems(new Set())}
              >
                {t('clear')}
              </Button>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleSelectAll}
          >
            {selectedItems.size === filteredHistory.length ? t('deselectAll') : t('selectAll')}
          </Button>
        </div>
        
        {/* Filter options */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <Badge
              variant={filterAction === "all" ? "default" : "secondary"}
              className="cursor-pointer hover:opacity-80"
              onClick={() => setFilterAction("all")}
            >
              {t('all')}
            </Badge>
            {availableActions.map((action) => (
              <Badge
                key={action}
                variant={filterAction === action ? "default" : "secondary"}
                className="cursor-pointer hover:opacity-80"
                onClick={() => setFilterAction(action)}
              >
                {ACTION_LABELS[action] || action}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {filteredHistory.length === 0 ? (
            history.length === 0 ? (
              <EmptyState
                icon={Clock}
                title={t('noHistoryYet')}
                description={t('noHistoryDesc')}
                compact
              />
            ) : (
              <EmptyState
                icon={Search}
                title={t('noResultsFound')}
                description={t('noResultsDesc')}
                compact
              />
            )
          ) : (
            filteredHistory.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onCopy={handleCopy}
                onReuse={handleReuse}
                onSelect={handleSelectItem}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
