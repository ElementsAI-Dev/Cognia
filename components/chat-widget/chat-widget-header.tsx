"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  Maximize2,
} from "lucide-react";
import type { ChatWidgetConfig, ChatWidgetMessage } from "@/stores/chat";
import type { ProviderName } from "@/types";
import { ChatWidgetShortcuts } from "./chat-widget-shortcuts";
import { ChatWidgetModelSelector } from "./chat-widget-model-selector";

interface ChatWidgetHeaderProps {
  config: ChatWidgetConfig;
  messages?: ChatWidgetMessage[];
  onClose: () => void;
  onNewSession: () => void;
  onClearMessages: () => void;
  onTogglePin: () => void;
  onSettings?: () => void;
  onExport?: () => void;
  onExpandToFull?: () => void;
  onProviderChange?: (provider: ProviderName) => void;
  onModelChange?: (model: string) => void;
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
  onExpandToFull,
  onProviderChange,
  onModelChange,
  className,
}: ChatWidgetHeaderProps) {
  const t = useTranslations("chatWidget.header");

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
        onMouseDown={(e) => {
          // Prevent drag from interfering with button clicks
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' || target.closest('button')) {
            e.stopPropagation();
          }
        }}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Cognia</span>
          {messages && messages.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {messages.length}
            </Badge>
          )}
        </div>
        {config.pinned && (
          <Pin className="h-3 w-3 text-muted-foreground ml-1" />
        )}
      </div>

      {/* Model selector */}
      {onProviderChange && onModelChange && (
        <ChatWidgetModelSelector
          provider={config.provider as ProviderName}
          model={config.model}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
        />
      )}

      {/* Right side - actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          {/* Expand to full chat */}
          {onExpandToFull && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onExpandToFull}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("expandToFull")}
              </TooltipContent>
            </Tooltip>
          )}

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
              {config.pinned ? t("unpin") : t("pin")}
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
                {t("newSession")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClearMessages}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("clearMessages")}
              </DropdownMenuItem>
              {onExport && messages && messages.length > 0 && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("exportChat")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <ChatWidgetShortcuts />
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t("settings")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close button - outside tooltip to ensure click works */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            title={t("close")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </TooltipProvider>
      </div>
    </div>
  );
}
