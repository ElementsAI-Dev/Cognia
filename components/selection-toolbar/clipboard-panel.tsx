"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Clipboard,
  ClipboardCopy,
  ClipboardCheck,
  Trash2,
  Pin,
  PinOff,
  Clock,
  Code2,
  Globe,
  Mail,
  FileText,
  Languages,
  Sparkles,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/layout/feedback/empty-state";
import {
  useClipboardMonitor,
  ClipboardContent,
} from "@/hooks/ui/use-clipboard-monitor";

interface ClipboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, content: ClipboardContent) => void;
  position?: { x: number; y: number };
  className?: string;
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  code: Code2,
  url: Globe,
  email: Mail,
  text: FileText,
  "short-text": FileText,
  "long-text": FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  code: "text-violet-400",
  url: "text-green-400",
  email: "text-blue-400",
  text: "text-gray-400",
  "short-text": "text-gray-400",
  "long-text": "text-amber-400",
};

export function ClipboardPanel({
  isOpen,
  onClose,
  onAction,
  position,
  className,
}: ClipboardPanelProps) {
  const t = useTranslations("clipboard");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [pinnedItems, setPinnedItems] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const {
    isMonitoring,
    currentContent,
    history,
    startMonitoring,
    stopMonitoring,
    clearHistory,
    copyToClipboard,
    checkClipboard,
  } = useClipboardMonitor({
    enabled: isOpen,
    pollInterval: 1000,
  });

  const handleCopy = useCallback(
    async (content: ClipboardContent, index: number) => {
      await copyToClipboard(content.text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    },
    [copyToClipboard]
  );

  const handleAction = useCallback(
    (action: string, content: ClipboardContent) => {
      onAction?.(action, content);
    },
    [onAction]
  );

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const togglePin = useCallback((index: number) => {
    setPinnedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return t("justNow");
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }, [t]);

  if (!isOpen) return null;

  const panelStyle = position
    ? {
        position: "fixed" as const,
        left: position.x,
        top: position.y,
        transform: "translate(-50%, 0)",
      }
    : {};

  // Sort history: pinned first, then by timestamp
  const sortedHistory = [...history].sort((a, b) => {
    const aIndex = history.indexOf(a);
    const bIndex = history.indexOf(b);
    const aPinned = pinnedItems.has(aIndex);
    const bPinned = pinnedItems.has(bIndex);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <TooltipProvider>
      <div
        style={panelStyle}
        className={cn(
          "w-96 max-h-[500px] z-50",
          "bg-gray-900/95 backdrop-blur-xl",
          "rounded-2xl border border-white/10",
          "shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
          "flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">
              {t("title")}
            </span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {history.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white"
                  onClick={checkClipboard}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("refresh")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-red-400"
                  onClick={clearHistory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("clearAll")}</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/60 hover:text-white"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Current Content */}
        {currentContent && (
          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60">
                {t("current")}
              </span>
              <div className="flex items-center gap-1">
                {currentContent.analysis && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 text-[10px] border-white/20",
                      CATEGORY_COLORS[currentContent.analysis.category]
                    )}
                  >
                    {currentContent.analysis.category}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-white/80 line-clamp-2 mb-2">
              {currentContent.preview || currentContent.text}
            </p>
            <div className="flex items-center gap-1">
              {currentContent.analysis?.suggestedActions
                .slice(0, 3)
                .map((action) => (
                  <Button
                    key={action}
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs bg-white/10 hover:bg-white/20"
                    onClick={() => handleAction(action, currentContent)}
                  >
                    {action === "translate" && (
                      <Languages className="w-3 h-3 mr-1" />
                    )}
                    {action === "explain" && (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {action === "summarize" && (
                      <FileText className="w-3 h-3 mr-1" />
                    )}
                    {action === "explain-code" && (
                      <Code2 className="w-3 h-3 mr-1" />
                    )}
                    {action === "open" && (
                      <ExternalLink className="w-3 h-3 mr-1" />
                    )}
                    {action}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* History List */}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="p-2 space-y-1">
            {sortedHistory.length === 0 ? (
              <EmptyState
                icon={Clipboard}
                title={t("empty")}
                compact
                className="text-white/40"
                iconClassName="text-white/40"
              />
            ) : (
              sortedHistory.map((content, _index) => {
                const originalIndex = history.indexOf(content);
                const isExpanded = expandedItems.has(originalIndex);
                const isPinned = pinnedItems.has(originalIndex);
                const isCopied = copiedIndex === originalIndex;
                const CategoryIcon =
                  CATEGORY_ICONS[content.analysis?.category || "text"] ||
                  FileText;

                return (
                  <div
                    key={originalIndex}
                    className={cn(
                      "group rounded-lg p-2 transition-colors",
                      "hover:bg-white/5",
                      isPinned && "bg-cyan-500/10 border border-cyan-500/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                          "bg-white/10",
                          CATEGORY_COLORS[content.analysis?.category || "text"]
                        )}
                      >
                        <CategoryIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs text-white/80",
                            isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                          )}
                        >
                          {content.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(content.timestamp)}
                          </span>
                          {content.analysis && (
                            <span className="text-[10px] text-white/40">
                              {content.analysis.wordCount} {t("words")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {content.text.length > 100 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/40 hover:text-white"
                            onClick={() => toggleExpand(originalIndex)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6",
                            isPinned
                              ? "text-cyan-400"
                              : "text-white/40 hover:text-white"
                          )}
                          onClick={() => togglePin(originalIndex)}
                        >
                          {isPinned ? (
                            <PinOff className="w-3 h-3" />
                          ) : (
                            <Pin className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/40 hover:text-white"
                          onClick={() => handleCopy(content, originalIndex)}
                        >
                          {isCopied ? (
                            <ClipboardCheck className="w-3 h-3 text-green-400" />
                          ) : (
                            <ClipboardCopy className="w-3 h-3" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/40 hover:text-white"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 bg-gray-900/95 border-white/10"
                          >
                            {content.analysis?.suggestedActions.map(
                              (action) => (
                                <DropdownMenuItem
                                  key={action}
                                  onClick={() => handleAction(action, content)}
                                  className="text-xs"
                                >
                                  {action}
                                </DropdownMenuItem>
                              )
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-red-400"
                              onClick={() => {
                                // Remove from history (would need to implement in hook)
                              }}
                            >
                              {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            {isMonitoring ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {t("monitoring")}
              </span>
            ) : (
              t("paused")
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-white/60 hover:text-white"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? t("pause") : t("resume")}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
