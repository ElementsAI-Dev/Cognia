"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  Languages,
  FileText,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  PenLine,
  CheckCircle,
  BookMarked,
} from "lucide-react";
import { useEffect, useCallback } from "react";
import { ToolbarButton } from "./toolbar-button";
import { ResultPanel } from "./result-panel";
import { SelectionAction } from "./types";
import { useSelectionToolbar } from "@/hooks/use-selection-toolbar";

// Primary actions shown in the main toolbar
const PRIMARY_ACTIONS: {
  action: SelectionAction;
  icon: typeof BookOpen;
  label: string;
}[] = [
  { action: "explain", icon: BookOpen, label: "Explain" },
  { action: "translate", icon: Languages, label: "Translate" },
  { action: "summarize", icon: Sparkles, label: "Summarize" },
  { action: "copy", icon: Copy, label: "Copy" },
  { action: "send-to-chat", icon: MessageSquare, label: "Send to Chat" },
];

// Secondary actions shown in the "more" menu
const SECONDARY_ACTIONS: {
  action: SelectionAction;
  icon: typeof BookOpen;
  label: string;
}[] = [
  { action: "extract", icon: FileText, label: "Extract Key Points" },
  { action: "define", icon: BookMarked, label: "Define" },
  { action: "rewrite", icon: PenLine, label: "Rewrite" },
  { action: "grammar", icon: CheckCircle, label: "Grammar Check" },
];

export function SelectionToolbar() {
  const {
    state,
    executeAction,
    copyResult,
    clearResult,
    hideToolbar,
  } = useSelectionToolbar();

  const handleAction = useCallback(
    async (action: SelectionAction) => {
      if (action === "copy") {
        await navigator.clipboard.writeText(state.selectedText);
        hideToolbar();
        return;
      }

      if (action === "send-to-chat") {
        // Send to main window
        if (typeof window !== "undefined" && window.__TAURI__) {
          const { emit } = await import("@tauri-apps/api/event");
          await emit("selection-send-to-chat", { text: state.selectedText });
        }
        hideToolbar();
        return;
      }

      await executeAction(action);
    },
    [state.selectedText, executeAction, hideToolbar]
  );

  // Handle click outside to hide toolbar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".selection-toolbar")) {
        hideToolbar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideToolbar]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideToolbar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hideToolbar]);

  return (
    <div className="selection-toolbar relative">
      {/* Main Toolbar */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5",
          "bg-linear-to-r from-gray-800/95 to-gray-900/95",
          "backdrop-blur-xl",
          "rounded-xl",
          "shadow-2xl shadow-black/50",
          "border border-white/10",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {PRIMARY_ACTIONS.map(({ action, icon, label }) => (
          <ToolbarButton
            key={action}
            icon={icon}
            label={label}
            isActive={state.activeAction === action}
            isLoading={state.isLoading && state.activeAction === action}
            onClick={() => handleAction(action)}
            disabled={state.isLoading}
          />
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* More options */}
        <ToolbarButton
          icon={MoreHorizontal}
          label="More options"
          onClick={() => {
            // TODO: Show more options menu
          }}
        />
      </div>

      {/* Result Panel */}
      <ResultPanel
        result={state.result}
        error={state.error}
        isLoading={state.isLoading}
        onClose={clearResult}
        onCopy={copyResult}
      />
    </div>
  );
}
