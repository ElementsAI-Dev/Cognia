"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Zap,
  Languages,
  Sparkles,
  FileText,
  BookOpen,
  PenLine,
  CheckCircle,
  Code2,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Copy,
  Globe,
  History,
  Star,
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
import { SelectionAction } from "@/types";

interface QuickAction {
  id: string;
  action: SelectionAction | string;
  icon: typeof Zap;
  labelKey: string;
  descKey?: string;
  shortcut?: string;
  color?: string;
  isPinned?: boolean;
  usageCount?: number;
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "translate",
    action: "translate",
    icon: Languages,
    labelKey: "actions.translate",
    descKey: "actions.translateDesc",
    shortcut: "T",
    color: "text-blue-400",
  },
  {
    id: "explain",
    action: "explain",
    icon: Sparkles,
    labelKey: "actions.explain",
    descKey: "actions.explainDesc",
    shortcut: "E",
    color: "text-cyan-400",
  },
  {
    id: "summarize",
    action: "summarize",
    icon: FileText,
    labelKey: "actions.summarize",
    descKey: "actions.summarizeDesc",
    shortcut: "S",
    color: "text-amber-400",
  },
  {
    id: "define",
    action: "define",
    icon: BookOpen,
    labelKey: "actions.define",
    descKey: "actions.defineDesc",
    shortcut: "D",
    color: "text-purple-400",
  },
  {
    id: "rewrite",
    action: "rewrite",
    icon: PenLine,
    labelKey: "actions.rewrite",
    descKey: "actions.rewriteDesc",
    shortcut: "R",
    color: "text-emerald-400",
  },
  {
    id: "grammar",
    action: "grammar",
    icon: CheckCircle,
    labelKey: "actions.grammar",
    descKey: "actions.grammarDesc",
    shortcut: "G",
    color: "text-green-400",
  },
  {
    id: "code-explain",
    action: "code-explain",
    icon: Code2,
    labelKey: "actions.codeExplain",
    descKey: "actions.codeExplainDesc",
    shortcut: "X",
    color: "text-violet-400",
  },
  {
    id: "expand",
    action: "expand",
    icon: ArrowUpRight,
    labelKey: "actions.expand",
    descKey: "actions.expandDesc",
    color: "text-orange-400",
  },
  {
    id: "shorten",
    action: "shorten",
    icon: ArrowDownRight,
    labelKey: "actions.shorten",
    descKey: "actions.shortenDesc",
    color: "text-rose-400",
  },
  {
    id: "search",
    action: "search",
    icon: Globe,
    labelKey: "actions.search",
    descKey: "actions.searchDesc",
    shortcut: "F",
    color: "text-green-400",
  },
  {
    id: "send-to-chat",
    action: "send-to-chat",
    icon: MessageSquare,
    labelKey: "actions.sendToChat",
    descKey: "actions.sendToChatDesc",
    shortcut: "Enter",
    color: "text-indigo-400",
  },
  {
    id: "copy",
    action: "copy",
    icon: Copy,
    labelKey: "actions.copy",
    descKey: "actions.copyDesc",
    shortcut: "C",
    color: "text-gray-400",
  },
];

interface QuickActionsProps {
  onAction: (action: SelectionAction | string) => void;
  selectedText?: string;
  isLoading?: boolean;
  activeAction?: string | null;
  layout?: "grid" | "list" | "compact";
  showFrequent?: boolean;
  maxItems?: number;
  className?: string;
}

export function QuickActions({
  onAction,
  selectedText,
  isLoading,
  activeAction,
  layout = "grid",
  showFrequent = true,
  maxItems = 12,
  className,
}: QuickActionsProps) {
  const t = useTranslations("quickActions");
  const [pinnedActions, setPinnedActions] = useState<Set<string>>(
    new Set(["translate", "explain", "summarize", "copy"])
  );
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  const handleAction = useCallback(
    (action: QuickAction) => {
      // Update usage count
      setUsageCounts((prev) => ({
        ...prev,
        [action.id]: (prev[action.id] || 0) + 1,
      }));
      onAction(action.action as SelectionAction);
    },
    [onAction]
  );

  const togglePin = useCallback((actionId: string) => {
    setPinnedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  }, []);

  // Sort actions: pinned first, then by usage count
  const sortedActions = [...DEFAULT_QUICK_ACTIONS]
    .map((action) => ({
      ...action,
      isPinned: pinnedActions.has(action.id),
      usageCount: usageCounts[action.id] || 0,
    }))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    })
    .slice(0, maxItems);

  // Frequent actions (top 4 by usage)
  const frequentActions = showFrequent
    ? [...DEFAULT_QUICK_ACTIONS]
        .map((action) => ({
          ...action,
          usageCount: usageCounts[action.id] || 0,
        }))
        .filter((a) => a.usageCount > 0)
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 4)
    : [];

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Frequent Actions */}
        {showFrequent && frequentActions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <History className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                {t("frequent")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {frequentActions.map((action) => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleAction(action)}
                      className={cn(
                        "h-8 px-3 gap-1.5",
                        "bg-white/5 hover:bg-white/10",
                        action.color,
                        activeAction === action.action &&
                          "bg-white/15 ring-1 ring-white/20"
                      )}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      <span className="text-xs">{t(action.labelKey)}</span>
                      {action.usageCount && action.usageCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[9px] bg-white/10"
                        >
                          {action.usageCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{action.descKey ? t(action.descKey) : t(action.labelKey)}</p>
                    {action.shortcut && (
                      <kbd className="ml-1 text-[10px] opacity-60">
                        {action.shortcut}
                      </kbd>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* All Actions */}
        <div className="space-y-1.5">
          {showFrequent && frequentActions.length > 0 && (
            <div className="flex items-center gap-1.5 px-1">
              <Zap className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                {t("allActions")}
              </span>
            </div>
          )}

          {layout === "grid" && (
            <div className="grid grid-cols-4 gap-1">
              {sortedActions.map((action) => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => handleAction(action)}
                      className={cn(
                        "h-auto flex flex-col items-center gap-1 p-2",
                        "hover:bg-white/10 relative group",
                        action.color,
                        activeAction === action.action &&
                          "bg-white/15 ring-1 ring-white/20"
                      )}
                    >
                      {action.isPinned && (
                        <Star className="absolute top-1 right-1 w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      )}
                      <action.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {t(action.labelKey)}
                      </span>
                      {action.shortcut && (
                        <kbd className="text-[9px] text-white/30">
                          {action.shortcut}
                        </kbd>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{action.descKey ? t(action.descKey) : t(action.labelKey)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {action.shortcut && (
                        <kbd className="text-[10px] opacity-60">
                          {action.shortcut}
                        </kbd>
                      )}
                      <button
                        className="text-[10px] text-white/40 hover:text-amber-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(action.id);
                        }}
                      >
                        {action.isPinned ? t("unpin") : t("pin")}
                      </button>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {layout === "list" && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-0.5">
                {sortedActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleAction(action)}
                    className={cn(
                      "w-full h-9 justify-start gap-2 px-2",
                      "hover:bg-white/10",
                      activeAction === action.action &&
                        "bg-white/15 ring-1 ring-white/20"
                    )}
                  >
                    <action.icon className={cn("w-4 h-4", action.color)} />
                    <span className="text-sm flex-1 text-left">
                      {t(action.labelKey)}
                    </span>
                    {action.isPinned && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    )}
                    {action.shortcut && (
                      <kbd className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">
                        {action.shortcut}
                      </kbd>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}

          {layout === "compact" && (
            <div className="flex flex-wrap gap-1">
              {sortedActions.slice(0, 6).map((action) => (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading}
                      onClick={() => handleAction(action)}
                      className={cn(
                        "h-8 w-8",
                        "hover:bg-white/10",
                        action.color,
                        activeAction === action.action &&
                          "bg-white/15 ring-1 ring-white/20"
                      )}
                    >
                      <action.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {t(action.labelKey)}
                      {action.shortcut && (
                        <kbd className="ml-1 text-[10px] opacity-60">
                          {action.shortcut}
                        </kbd>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        {/* Text Preview */}
        {selectedText && selectedText.length > 0 && (
          <div className="px-2 py-1.5 rounded-lg bg-white/5">
            <p className="text-xs text-white/60 line-clamp-2">{selectedText}</p>
            <span className="text-[10px] text-white/30">
              {selectedText.length} {t("chars")} •{" "}
              {selectedText.split(/\s+/).filter(Boolean).length} {t("words")}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
