"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Enter"], description: "发送消息" },
  { keys: ["Shift", "Enter"], description: "换行" },
  { keys: ["Esc"], description: "隐藏助手" },
  { keys: ["↑"], description: "上一条消息" },
  { keys: ["↓"], description: "下一条消息" },
  { keys: ["Ctrl", "Shift", "Space"], description: "唤起/隐藏助手" },
];

interface ChatWidgetShortcutsProps {
  className?: string;
}

export function ChatWidgetShortcuts({ className }: ChatWidgetShortcutsProps) {
  const [open, setOpen] = useState(false);

  // Listen for ? key to open shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", className)}
          title="快捷键帮助"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            快捷键
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-1.5 py-0.5 text-xs font-medium bg-muted rounded border border-border">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-0.5 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          按 <kbd className="px-1 py-0.5 text-xs bg-muted rounded border">?</kbd> 打开此面板
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default ChatWidgetShortcuts;
