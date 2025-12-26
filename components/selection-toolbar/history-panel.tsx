"use client";

import { cn } from "@/lib/utils";
import { useSelectionStore, type SelectionHistoryItem } from "@/stores/selection-store";
import { Clock, Trash2, Copy, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const ACTION_LABELS: Record<string, string> = {
  explain: "Explained",
  translate: "Translated",
  extract: "Extracted",
  summarize: "Summarized",
  define: "Defined",
  rewrite: "Rewritten",
  grammar: "Grammar Check",
  copy: "Copied",
};

interface HistoryItemProps {
  item: SelectionHistoryItem;
  onCopy: (text: string) => void;
  onReuse: (text: string) => void;
}

function HistoryItem({ item, onCopy, onReuse }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50",
        "bg-card/50 hover:bg-card transition-colors",
        "cursor-pointer"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-primary">
          {ACTION_LABELS[item.action] || item.action}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(item.timestamp)}
        </span>
      </div>

      {/* Original Text Preview */}
      <p className="text-sm text-foreground/80 line-clamp-2 mb-2">
        {item.text}
      </p>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Result:</span>
            <p className="text-sm text-foreground mt-1">{item.result}</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(item.result);
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Result
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onReuse(item.text);
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reuse Text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SelectionHistoryPanel() {
  const { history, clearHistory } = useSelectionStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleReuse = (text: string) => {
    // Emit event to trigger selection with this text
    if (typeof window !== "undefined" && window.__TAURI__) {
      import("@tauri-apps/api/event").then(({ emit }) => {
        emit("selection-reuse", { text });
      });
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Clock className="w-4 h-4" />
        History ({history.length})
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 w-80",
        "bg-background border rounded-xl shadow-xl",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Selection History
        </h3>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive"
              onClick={clearHistory}
              title="Clear history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No selection history yet
            </div>
          ) : (
            history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onCopy={handleCopy}
                onReuse={handleReuse}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
