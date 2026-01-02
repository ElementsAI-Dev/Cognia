"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, User, AlertCircle, Loader2, Copy, Check } from "lucide-react";
import type { ChatWidgetMessage } from "@/stores/chat";

interface ChatWidgetMessagesProps {
  messages: ChatWidgetMessage[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function ChatWidgetMessages({
  messages,
  isLoading,
  error,
  className,
}: ChatWidgetMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <ScrollArea
      ref={scrollRef}
      className={cn("flex-1 px-3 py-2", className)}
    >
      <div className="flex flex-col gap-3">
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Ask me anything...
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Press Ctrl+Shift+Space to toggle
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

interface MessageBubbleProps {
  message: ChatWidgetMessage;
  showTimestamp?: boolean;
}

function MessageBubble({ message, showTimestamp }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  }, [message.content]);

  return (
    <div
      className={cn(
        "group flex items-start gap-2",
        isUser && "flex-row-reverse"
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={cn(
            "py-2 px-3 rounded-lg text-sm relative",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/80",
            message.isStreaming && "animate-pulse"
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          {message.error && (
            <p className="text-xs text-destructive mt-1">{message.error}</p>
          )}

          {/* Copy button - only for assistant messages */}
          {!isUser && message.content && !message.isStreaming && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute -right-8 top-0 h-6 w-6",
                      "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {copied ? "已复制" : "复制"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && message.timestamp && (
          <span className={cn(
            "text-[10px] text-muted-foreground/60",
            isUser ? "text-right" : "text-left"
          )}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
