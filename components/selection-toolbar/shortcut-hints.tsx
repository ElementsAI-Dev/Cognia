"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShortcutHint {
  keys: string[];
  descKey: string;
  category?: "navigation" | "action" | "ai" | "edit";
}

const SHORTCUTS: ShortcutHint[] = [
  // Global shortcuts
  { keys: ["Alt", "Space"], descKey: "shortcuts.triggerToolbar", category: "navigation" },
  { keys: ["Ctrl", "Shift", "T"], descKey: "shortcuts.quickTranslate", category: "ai" },
  { keys: ["Ctrl", "Shift", "E"], descKey: "shortcuts.quickExplain", category: "ai" },
  { keys: ["Ctrl", "Shift", "Space"], descKey: "shortcuts.toggleChat", category: "navigation" },
  // Toolbar shortcuts
  { keys: ["E"], descKey: "shortcuts.explain", category: "ai" },
  { keys: ["T"], descKey: "shortcuts.translateDefault", category: "ai" },
  { keys: ["T", "1"], descKey: "shortcuts.translateChinese", category: "ai" },
  { keys: ["T", "2"], descKey: "shortcuts.translateEnglish", category: "ai" },
  { keys: ["T", "3"], descKey: "shortcuts.translateJapanese", category: "ai" },
  { keys: ["T", "4"], descKey: "shortcuts.translateKorean", category: "ai" },
  { keys: ["T", "5"], descKey: "shortcuts.translateFrench", category: "ai" },
  { keys: ["T", "6"], descKey: "shortcuts.translateGerman", category: "ai" },
  { keys: ["S"], descKey: "shortcuts.summarize", category: "ai" },
  { keys: ["D"], descKey: "shortcuts.define", category: "ai" },
  { keys: ["C"], descKey: "shortcuts.copy", category: "action" },
  { keys: ["Shift", "C"], descKey: "shortcuts.copyBoth", category: "action" },
  { keys: ["Q"], descKey: "shortcuts.quote", category: "action" },
  { keys: ["Enter"], descKey: "shortcuts.sendToChat", category: "action" },
  { keys: ["R"], descKey: "shortcuts.rewrite", category: "edit" },
  { keys: ["G"], descKey: "shortcuts.grammar", category: "edit" },
  { keys: ["M"], descKey: "shortcuts.multiSelect", category: "action" },
  { keys: ["V"], descKey: "shortcuts.readAloud", category: "action" },
  // Panel shortcuts
  { keys: ["P"], descKey: "shortcuts.openTemplates", category: "navigation" },
  { keys: ["B"], descKey: "shortcuts.openClipboard", category: "navigation" },
  { keys: ["O"], descKey: "shortcuts.openOcr", category: "navigation" },
  { keys: ["H"], descKey: "shortcuts.openHistory", category: "navigation" },
  { keys: ["L"], descKey: "shortcuts.openLanguage", category: "navigation" },
  { keys: ["?"], descKey: "shortcuts.showShortcuts", category: "navigation" },
  { keys: ["Esc"], descKey: "shortcuts.closeToolbar", category: "navigation" },
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
  const t = useTranslations("shortcutHints");
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
              {t("title")}
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
            {t("all")}
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
              {t(category)}
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
                  {t(shortcut.descKey)}
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
                      {t(shortcut.category)}
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
            {t("toggleHint")}
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
