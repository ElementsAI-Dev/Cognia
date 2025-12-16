'use client';

/**
 * ChatInputSimple - Modern chat input with context usage indicator
 * Design inspired by Claude/Cursor style
 */

import { useRef, useCallback, useState } from 'react';
import { Send, Square, Loader2, Settings2, Paperclip, Globe, Brain, ChevronDown } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';

interface ChatInputSimpleProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  contextUsagePercent?: number;
  onOpenContextSettings?: () => void;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  onThinkingChange?: (enabled: boolean) => void;
  modelName?: string;
  modeName?: string;
}

export function ChatInputSimple({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  isStreaming = false,
  onStop,
  disabled = false,
  contextUsagePercent = 0,
  onOpenContextSettings,
  webSearchEnabled = false,
  thinkingEnabled = false,
  onWebSearchChange,
  onThinkingChange,
  modelName = 'GPT-4o',
  modeName = 'Chat',
}: ChatInputSimpleProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);

  const isProcessing = isLoading || isStreaming;
  const canSend = value.trim().length > 0 && !isProcessing && !disabled;

  const handleSubmit = useCallback(() => {
    if (canSend) {
      onSubmit();
    }
  }, [canSend, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnter && canSend) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-4xl px-4 py-3">
        {/* Main input container */}
        <div className="rounded-xl border border-border bg-muted/30 shadow-sm">
          {/* Textarea row */}
          <div className="px-3 py-2">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to do?"
              className={cn(
                'w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                'min-h-[24px] max-h-[200px]'
              )}
              maxRows={8}
              disabled={isProcessing || disabled}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between border-t border-border/50 px-2 py-1.5">
            {/* Left side - Mode and Model selector */}
            <div className="flex items-center gap-1">
              {/* Mode selector */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                <span className="text-base">💬</span>
                <span>{modeName}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {/* Model selector */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                <span className="font-medium">A\</span>
                <span>{modelName}</span>
              </Button>

              {/* Divider */}
              <div className="mx-1 h-4 w-px bg-border" />

              {/* Tool buttons */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  webSearchEnabled && 'bg-primary/10 text-primary'
                )}
                onClick={() => onWebSearchChange?.(!webSearchEnabled)}
                title="Web Search"
              >
                <Globe className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  thinkingEnabled && 'bg-purple-500/10 text-purple-500'
                )}
                onClick={() => onThinkingChange?.(!thinkingEnabled)}
                title="Extended Thinking"
              >
                <Brain className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isProcessing || disabled}
                title="Attach file"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onOpenContextSettings}
                title="Context Settings"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>

              {/* More options dropdown */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right side - Context usage and Send */}
            <div className="flex items-center gap-2">
              {/* Context usage indicator */}
              <button
                onClick={onOpenContextSettings}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Context window usage"
              >
                {contextUsagePercent}%
              </button>

              {/* Send button */}
              {isProcessing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleStop}
                >
                  {isStreaming ? (
                    <>
                      <Square className="mr-1.5 h-3 w-3" />
                      Stop
                    </>
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs font-normal"
                  disabled={!canSend}
                  onClick={handleSubmit}
                >
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInputSimple;
