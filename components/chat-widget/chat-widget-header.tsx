"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
  RotateCcw,
  Settings,
  Sparkles,
  GripHorizontal,
  Download,
} from "lucide-react";
import type { ChatWidgetConfig, ChatWidgetMessage } from "@/stores/chat";
import { ChatWidgetShortcuts } from "./chat-widget-shortcuts";

interface ChatWidgetHeaderProps {
  config: ChatWidgetConfig;
  messages?: ChatWidgetMessage[];
  onClose: () => void;
  onNewSession: () => void;
  onClearMessages: () => void;
  onTogglePin: () => void;
  onSettings?: () => void;
  onExport?: () => void;
  className?: string;
}

export function ChatWidgetHeader({
  config,
  messages,
  onClose,
  onNewSession,
  onClearMessages,
  onTogglePin,
  onSettings,
  onExport,
  className,
}: ChatWidgetHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "px-3 py-2 h-12",
        "bg-muted/50 border-b border-border/50",
        "select-none",
        className
      )}
    >
      {/* Left side - drag region and title */}
      <div
        className="flex items-center gap-2 flex-1 cursor-move"
        data-tauri-drag-region
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Cognia</span>
          {messages && messages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {messages.length}
            </span>
          )}
        </div>
        {config.pinned && (
          <Pin className="h-3 w-3 text-muted-foreground ml-1" />
        )}
      </div>

      {/* Right side - actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          {/* Pin toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onTogglePin}
              >
                {config.pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {config.pinned ? "取消置顶" : "窗口置顶"}
            </TooltipContent>
          </Tooltip>

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onNewSession}>
                <RotateCcw className="h-4 w-4 mr-2" />
                新会话
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClearMessages}>
                <Trash2 className="h-4 w-4 mr-2" />
                清空消息
              </DropdownMenuItem>
              {onExport && messages && messages.length > 0 && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  导出对话
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <ChatWidgetShortcuts />
              </DropdownMenuItem>
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              关闭 (Esc)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
