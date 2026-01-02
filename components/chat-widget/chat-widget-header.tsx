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
} from "lucide-react";
import type { ChatWidgetConfig } from "@/stores/chat";

interface ChatWidgetHeaderProps {
  config: ChatWidgetConfig;
  onClose: () => void;
  onNewSession: () => void;
  onClearMessages: () => void;
  onTogglePin: () => void;
  onSettings?: () => void;
  className?: string;
}

export function ChatWidgetHeader({
  config,
  onClose,
  onNewSession,
  onClearMessages,
  onTogglePin,
  onSettings,
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
              {config.pinned ? "Unpin window" : "Pin window on top"}
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
                New Session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClearMessages}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Messages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
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
              Close (Esc)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
