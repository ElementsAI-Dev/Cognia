"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShortcutHint {
  keys: string[];
  description: string;
  category?: "navigation" | "action" | "ai" | "edit";
}

const SHORTCUTS: ShortcutHint[] = [
  // Global shortcuts
  { keys: ["Alt", "Space"], description: "Trigger selection toolbar", category: "navigation" },
  { keys: ["Ctrl", "Shift", "T"], description: "Quick translate", category: "ai" },
  { keys: ["Ctrl", "Shift", "E"], description: "Quick explain", category: "ai" },
  { keys: ["Ctrl", "Shift", "Space"], description: "Toggle chat widget", category: "navigation" },
  // Toolbar shortcuts
  { keys: ["E"], description: "Explain selected text", category: "ai" },
  { keys: ["T"], description: "Translate (default language)", category: "ai" },
  { keys: ["T", "1"], description: "Translate → Chinese 🇨🇳", category: "ai" },
  { keys: ["T", "2"], description: "Translate → English 🇺🇸", category: "ai" },
  { keys: ["T", "3"], description: "Translate → Japanese 🇯🇵", category: "ai" },
  { keys: ["T", "4"], description: "Translate → Korean 🇰🇷", category: "ai" },
  { keys: ["T", "5"], description: "Translate → French 🇫🇷", category: "ai" },
  { keys: ["T", "6"], description: "Translate → German 🇩🇪", category: "ai" },
  { keys: ["S"], description: "Summarize", category: "ai" },
  { keys: ["D"], description: "Define", category: "ai" },
  { keys: ["C"], description: "Copy to clipboard", category: "action" },
  { keys: ["Shift", "C"], description: "Copy original + translation", category: "action" },
  { keys: ["Q"], description: "Quote in chat", category: "action" },
  { keys: ["Enter"], description: "Send to chat", category: "action" },
  { keys: ["R"], description: "Rewrite", category: "edit" },
  { keys: ["G"], description: "Check grammar", category: "edit" },
  { keys: ["M"], description: "Toggle multi-select mode", category: "action" },
  { keys: ["V"], description: "Read aloud (TTS)", category: "action" },
  // Panel shortcuts
  { keys: ["P"], description: "Open templates panel", category: "navigation" },
  { keys: ["B"], description: "Open clipboard panel", category: "navigation" },
  { keys: ["O"], description: "Open OCR panel", category: "navigation" },
  { keys: ["H"], description: "Open history panel", category: "navigation" },
  { keys: ["L"], description: "Open language selector", category: "navigation" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "navigation" },
  { keys: ["Esc"], description: "Close toolbar/panels", category: "navigation" },
];

const CATEGORY_COLORS: Record<string, string> = {
  navigation: "bg-blue-500/20 text-blue-400",
  action: "bg-amber-500/20 text-amber-400",
  ai: "bg-cyan-500/20 text-cyan-400",
  edit: "bg-emerald-500/20 text-emerald-400",
};

interface ShortcutHintsProps {
  isOpen: boolean;
  onClose: () => void;
  position?: "floating" | "inline";
  className?: string;
}

export function ShortcutHints({
  isOpen,
  onClose,
  position = "floating",
  className,
}: ShortcutHintsProps) {
  const [filter, setFilter] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredShortcuts = filter
    ? SHORTCUTS.filter((s) => s.category === filter)
    : SHORTCUTS;

  const categories = ["navigation", "action", "ai", "edit"] as const;

  return (
    <div
      className={cn(
        position === "floating" &&
          "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-[480px] max-h-[600px]",
          "bg-gray-900/95 backdrop-blur-xl",
          "rounded-2xl border border-white/10",
          "shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">
              Keyboard Shortcuts
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:text-white"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs",
              !filter ? "bg-white/10 text-white" : "text-white/60"
            )}
            onClick={() => setFilter(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs capitalize",
                filter === category
                  ? CATEGORY_COLORS[category]
                  : "text-white/60 hover:text-white"
              )}
              onClick={() => setFilter(filter === category ? null : category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-sm text-white/80">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center gap-1">
                      <kbd
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded",
                          "bg-white/10 text-white/90",
                          "border border-white/20",
                          "shadow-sm"
                        )}
                      >
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="text-white/40">+</span>
                      )}
                    </span>
                  ))}
                  {shortcut.category && (
                    <span
                      className={cn(
                        "ml-2 px-1.5 py-0.5 text-[10px] rounded",
                        CATEGORY_COLORS[shortcut.category]
                      )}
                    >
                      {shortcut.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShortcutHintsBadge({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-2 text-xs text-white/50 hover:text-white gap-1",
        className
      )}
      onClick={onOpen}
    >
      <Keyboard className="w-3 h-3" />
      <span>?</span>
    </Button>
  );
}
