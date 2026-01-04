"use client";

import { useEffect, useRef, memo, useState } from "react";
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
import { Bot, User, AlertCircle, RefreshCw, Sparkles, Volume2, VolumeX, ThumbsUp, ThumbsDown, Pencil, Check, X, ArrowRight } from "lucide-react";
import { Streamdown } from "streamdown";
import { InlineCopyButton } from "@/components/chat/copy-button";
import { LoadingAnimation } from "@/components/chat/renderers/loading-animation";
import { EmptyState } from "@/components/layout/empty-state";
import { useSpeech } from "@/hooks/media/use-speech";
import type { ChatWidgetMessage, MessageFeedback } from "@/stores/chat";

interface ChatWidgetMessagesProps {
  messages: ChatWidgetMessage[];
  isLoading?: boolean;
  error?: string | null;
  showTimestamps?: boolean;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: MessageFeedback) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onContinue?: () => void;
  className?: string;
}

export function ChatWidgetMessages({
  messages,
  isLoading,
  error,
  showTimestamps = false,
  onRegenerate,
  onFeedback,
  onEdit,
  onContinue,
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
          <EmptyState
            icon={<Sparkles className="h-10 w-10 text-primary/50" />}
            title="有什么可以帮您的？"
            description="按 Ctrl+Shift+Space 唤起/隐藏助手"
            compact
            className="h-40"
          />
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            showTimestamp={showTimestamps}
            isLastAssistant={
              message.role === "assistant" &&
              index === messages.length - 1
            }
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            onEdit={onEdit}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <LoadingAnimation
              variant="dots"
              size="sm"
              text="思考中..."
              className="min-w-[180px]"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Continue generation button - show after last assistant message when not loading */}
        {!isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && onContinue && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={onContinue}
            >
              <ArrowRight className="h-3 w-3" />
              继续生成
            </Button>
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
  isLastAssistant?: boolean;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: MessageFeedback) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  showTimestamp,
  isLastAssistant,
  onRegenerate,
  onFeedback,
  onEdit,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // TTS functionality
  const { isSpeaking, speak, stopSpeaking, ttsSupported } = useSpeech({});

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(message.content);
    }
  };

  const handleFeedback = (feedback: MessageFeedback) => {
    onFeedback?.(message.id, message.feedback === feedback ? null : feedback);
  };

  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent);
    }
    setIsEditing(false);
  };

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
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/80 rounded-bl-md",
            message.isStreaming && "animate-pulse"
          )}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] p-2 rounded border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCancelEdit}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary"
                  onClick={handleSaveEdit}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {message.isEdited && (
                <span className="text-[10px] opacity-60 ml-1">(已编辑)</span>
              )}
            </div>
          ) : (
            <Streamdown
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                "prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1",
                "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted",
                "prose-pre:bg-muted prose-pre:p-3"
              )}
            >
              {message.content || " "}
            </Streamdown>
          )}
          {message.error && (
            <p className="text-xs text-destructive mt-1">{message.error}</p>
          )}
        </div>

        {/* User message actions - edit */}
        {isUser && !isEditing && !message.isStreaming && onEdit && (
          <div className={cn(
            "flex items-center gap-1",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Assistant message actions - copy, speak, feedback, regenerate */}
        {!isUser && message.content && !message.isStreaming && (
          <div className={cn(
            "flex items-center gap-1",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}>
            <InlineCopyButton content={message.content} className="h-6 w-6" />

            {/* TTS button */}
            {ttsSupported && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-6 w-6", isSpeaking && "text-primary")}
                      onClick={handleSpeak}
                    >
                      {isSpeaking ? (
                        <VolumeX className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isSpeaking ? "停止朗读" : "朗读"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Feedback buttons */}
            {onFeedback && (
              <>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", message.feedback === "like" && "text-green-500")}
                        onClick={() => handleFeedback("like")}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">有帮助</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", message.feedback === "dislike" && "text-red-500")}
                        onClick={() => handleFeedback("dislike")}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">无帮助</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {/* Regenerate button - only for last assistant message */}
            {isLastAssistant && onRegenerate && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRegenerate(message.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">重新生成</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

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
});

MessageBubble.displayName = "MessageBubble";
