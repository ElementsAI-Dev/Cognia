"use client";

import { cn } from "@/lib/utils";
import { 
  Copy, 
  Check, 
  X, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  Share2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { SelectionAction, ACTION_LABELS } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ResultPanelProps {
  result: string | null;
  streamingResult?: string | null;
  error: string | null;
  isLoading: boolean;
  isStreaming?: boolean;
  activeAction?: SelectionAction | null;
  onClose: () => void;
  onCopy: () => void;
  onRetry?: () => void;
  onSendToChat?: () => void;
  onFeedback?: (positive: boolean) => void;
}

export function ResultPanel({
  result,
  streamingResult,
  error,
  isLoading,
  isStreaming,
  activeAction,
  onClose,
  onCopy,
  onRetry,
  onSendToChat,
  onFeedback,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [_contentHeight, setContentHeight] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // The displayed content
  const displayContent = streamingResult || result;

  // Check if content is overflowing
  useEffect(() => {
    if (contentRef.current) {
      const isOver = contentRef.current.scrollHeight > 200;
      setIsOverflowing(isOver);
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [displayContent]);

  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingResult, isStreaming]);

  const handleCopy = useCallback(() => {
    if (displayContent) {
      navigator.clipboard.writeText(displayContent);
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayContent, onCopy]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "c" && (e.ctrlKey || e.metaKey) && displayContent) {
        handleCopy();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [displayContent, handleCopy]);

  if (!displayContent && !error && !isLoading) {
    return null;
  }

  const actionLabel = activeAction ? ACTION_LABELS[activeAction] : "Result";

  return (
    <div
      className={cn(
        "absolute top-full left-0 mt-2",
        "w-[380px] max-w-[90vw]",
        "bg-linear-to-br from-gray-900/98 via-gray-800/98 to-gray-900/98",
        "backdrop-blur-xl",
        "rounded-2xl shadow-2xl shadow-black/50",
        "border border-white/10",
        "overflow-hidden",
        "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
        "transition-all ease-out",
        isExpanded && "w-[500px]",
        isCollapsed && "w-auto"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-2",
          "border-b border-white/6",
          "bg-white/2"
        )}
      >
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLoading || isStreaming 
              ? "bg-cyan-400 animate-pulse" 
              : error 
                ? "bg-red-400" 
                : "bg-emerald-400"
          )} />
          
          <span className="text-xs font-medium text-white/80">
            {isLoading ? "Processing..." : isStreaming ? "Generating..." : error ? "Error" : actionLabel}
          </span>

          {/* Word count */}
          {displayContent && !isLoading && (
            <span className="text-[10px] text-white/40 px-1.5 py-0.5 bg-white/5 rounded">
              {displayContent.split(/\s+/).length} words
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Expand/Collapse toggle */}
          {isOverflowing && !isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          )}

          {/* Copy button */}
          {displayContent && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10",
                copied && "text-emerald-400 hover:text-emerald-300"
              )}
              title={copied ? "Copied!" : "Copy (Ctrl+C)"}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          )}

          {/* More actions */}
          {displayContent && !isLoading && (
            <DropdownMenu open={showActions} onOpenChange={setShowActions}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10",
                    showActions && "bg-white/10"
                  )}
                  title="More actions"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[140px] bg-gray-900/98 backdrop-blur-xl border-white/10"
              >
                {onRetry && (
                  <DropdownMenuItem onClick={onRetry} className="text-xs gap-2">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </DropdownMenuItem>
                )}
                {onSendToChat && (
                  <DropdownMenuItem onClick={onSendToChat} className="text-xs gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Continue in chat
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-xs gap-2">
                  <Volume2 className="w-3.5 h-3.5" />
                  Read aloud
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Collapse/Expand panel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/10"
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-white/50 hover:text-rose-400 hover:bg-rose-500/20"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          <div 
            ref={contentRef}
            className={cn(
              "p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
              "transition-all duration-200",
              isExpanded ? "max-h-[400px]" : "max-h-[200px]"
            )}
          >
            {isLoading && !isStreaming ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="relative">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
                </div>
                <span className="text-xs text-white/50">Processing your request...</span>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <X className="h-4 w-4" />
                  <AlertTitle className="text-red-400">Something went wrong</AlertTitle>
                  <AlertDescription className="text-red-300/70">
                    {error}
                  </AlertDescription>
                </Alert>
                {onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    className="w-full gap-2 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Result content with typing effect indicator for streaming */}
                <div className="relative">
                  <p className={cn(
                    "text-sm text-white/90 whitespace-pre-wrap leading-relaxed",
                    "selection:bg-cyan-500/30"
                  )}>
                    {displayContent}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 ml-0.5 bg-cyan-400 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with feedback */}
          {displayContent && !isLoading && !error && onFeedback && (
            <div className={cn(
              "flex items-center justify-between px-4 py-2",
              "border-t border-white/6",
              "bg-white/1"
            )}>
              <span className="text-[10px] text-white/30">Was this helpful?</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(true)}
                  className="h-7 w-7 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/20"
                  title="Good response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(false)}
                  className="h-7 w-7 text-white/40 hover:text-rose-400 hover:bg-rose-500/20"
                  title="Bad response"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
