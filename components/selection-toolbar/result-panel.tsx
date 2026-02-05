"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { 
  Copy, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Share2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Languages,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { LANGUAGES } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { SelectionAction, ACTION_LABELS } from "@/types";
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
  // Translation-specific props
  originalText?: string;
  sourceLanguage?: string | null;
  targetLanguage?: string;
  // TTS props
  onSpeak?: (text: string) => void;
  onStopSpeak?: () => void;
  isSpeaking?: boolean;
  isPaused?: boolean;
  onPauseSpeak?: () => void;
  onResumeSpeak?: () => void;
  // Follow-up action props
  onFollowUpAction?: (action: 'explain' | 'simplify' | 'formal' | 'casual') => void;
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
  // Translation-specific
  originalText,
  sourceLanguage,
  targetLanguage,
  // TTS
  onSpeak,
  onStopSpeak,
  isSpeaking = false,
  isPaused = false,
  onPauseSpeak,
  onResumeSpeak,
  // Follow-up actions
  onFollowUpAction,
}: ResultPanelProps) {
  const t = useTranslations("resultPanel");
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showCompareView, setShowCompareView] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [_contentHeight, setContentHeight] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Translation helpers
  const isTranslateAction = activeAction === "translate";
  const sourceLang = sourceLanguage ? LANGUAGES.find(l => l.value === sourceLanguage) : null;
  const targetLang = targetLanguage ? LANGUAGES.find(l => l.value === targetLanguage) : null;

  // TTS handler
  const handleSpeak = useCallback((text: string) => {
    if (isSpeaking) {
      onStopSpeak?.();
    } else {
      onSpeak?.(text);
    }
  }, [isSpeaking, onSpeak, onStopSpeak]);

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

  // Build translation header label (available for future use)
  const _getTranslationLabel = () => {
    if (!isTranslateAction) return actionLabel;
    const source = sourceLang?.label || "Auto";
    const target = targetLang?.label || "Unknown";
    return `${source} → ${target}`;
  };

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
          
          {isTranslateAction && !isLoading && !error ? (
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white/80">
                {sourceLang?.flag || "🌐"}
              </span>
              <ArrowRight className="w-3 h-3 text-white/40" />
              <span className="text-xs font-medium text-white/80">
                {targetLang?.flag} {targetLang?.label}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium text-white/80">
              {isLoading ? t("processing") : isStreaming ? t("generating") : error ? t("error") : actionLabel}
            </span>
          )}

          {/* Word count */}
          {displayContent && !isLoading && (
            <span className="text-[10px] text-white/40 px-1.5 py-0.5 bg-white/5 rounded">
              {displayContent.split(/\s+/).length} {t("words")}
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
              title={isExpanded ? t("collapse") : t("expand")}
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
              title={copied ? t("copied") : t("copyTooltip")}
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
                  title={t("moreActions")}
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
                    {t("retry")}
                  </DropdownMenuItem>
                )}
                {onSendToChat && (
                  <DropdownMenuItem onClick={onSendToChat} className="text-xs gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t("continueInChat")}
                  </DropdownMenuItem>
                )}
                {onSpeak && (
                  <DropdownMenuItem 
                    onClick={() => handleSpeak(displayContent || "")}
                    className="text-xs gap-2"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        {t("stopReading")}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        {t("readAloud")}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {isTranslateAction && originalText && (
                  <DropdownMenuItem 
                    onClick={() => setShowCompareView(!showCompareView)}
                    className="text-xs gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {showCompareView ? t("hideOriginal") : t("showOriginal")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-xs gap-2">
                  <Share2 className="w-3.5 h-3.5" />
                  {t("share")}
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
            title={isCollapsed ? t("expandPanel") : t("collapsePanel")}
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
            title={t("close")}
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
                  <LoadingSpinner size="md" className="text-cyan-400" />
                  <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
                </div>
                <span className="text-xs text-white/50">{t("processingRequest")}</span>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                  <X className="h-4 w-4" />
                  <AlertTitle className="text-red-400">{t("somethingWentWrong")}</AlertTitle>
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
                    {t("tryAgain")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Compare view for translation */}
                {isTranslateAction && showCompareView && originalText && (
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                        {t("original")} {sourceLang?.flag}
                      </span>
                      {onSpeak && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeak(originalText)}
                          className="h-5 w-5 text-white/40 hover:text-white/80"
                          title={t("readOriginal")}
                        >
                          <Volume2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
                      {originalText}
                    </p>
                  </div>
                )}

                {/* Translation label when in compare view */}
                {isTranslateAction && showCompareView && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                      {t("translation")} {targetLang?.flag}
                    </span>
                    {onSpeak && displayContent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSpeak(displayContent)}
                        className="h-5 w-5 text-white/40 hover:text-white/80"
                        title={t("readTranslation")}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}

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

                {/* TTS playback controls */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-cyan-400">{t("playing")}</span>
                    </div>
                    <div className="flex-1" />
                    {onPauseSpeak && onResumeSpeak && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={isPaused ? onResumeSpeak : onPauseSpeak}
                        className="h-6 w-6 text-white/60 hover:text-white"
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onStopSpeak}
                      className="h-6 w-6 text-white/60 hover:text-rose-400"
                    >
                      <VolumeX className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Translation follow-up actions */}
          {isTranslateAction && displayContent && !isLoading && !error && onFollowUpAction && (
            <div className={cn(
              "flex items-center gap-1 px-3 py-2",
              "border-t border-white/6",
              "bg-white/2"
            )}>
              <span className="text-[10px] text-white/40 mr-2">{t("quickActions")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFollowUpAction('explain')}
                className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
              >
                {t("explain")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFollowUpAction('simplify')}
                className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
              >
                {t("simplify")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFollowUpAction('formal')}
                className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
              >
                {t("formal")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFollowUpAction('casual')}
                className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
              >
                {t("casual")}
              </Button>
            </div>
          )}

          {/* Footer with feedback */}
          {displayContent && !isLoading && !error && onFeedback && (
            <div className={cn(
              "flex items-center justify-between px-4 py-2",
              "border-t border-white/6",
              "bg-white/1"
            )}>
              <span className="text-[10px] text-white/30">{t("wasThisHelpful")}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(true)}
                  className="h-7 w-7 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/20"
                  title={t("goodResponse")}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(false)}
                  className="h-7 w-7 text-white/40 hover:text-rose-400 hover:bg-rose-500/20"
                  title={t("badResponse")}
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
