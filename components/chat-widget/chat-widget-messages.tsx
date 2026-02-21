'use client';

import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bot,
  User,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { Streamdown } from 'streamdown';
import { InlineCopyButton } from '@/components/chat/ui/copy-button';
import { LoadingAnimation } from '@/components/chat/renderers/loading-animation';
import { useTTS } from '@/hooks/media/use-tts';
import { useSettingsStore } from '@/stores';
import type { ChatWidgetMessage, MessageFeedback } from '@/stores/chat';

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
  const t = useTranslations('chatWidget.messages');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spokenMessageIdsRef = useRef<Set<string>>(new Set());
  const autoPlayInitializedRef = useRef(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const speechSettings = useSettingsStore((state) => state.speechSettings);
  const {
    speak,
    stop,
    isPlaying: isSpeaking,
    isLoading: isTTSLoading,
    isSupported: ttsSupported,
  } = useTTS({ source: 'chat-widget' });

  const handleSpeakMessage = useCallback(
    async (message: ChatWidgetMessage) => {
      if (!message.content.trim()) return;

      if (isSpeaking && activeSpeechMessageId === message.id) {
        stop();
        setActiveSpeechMessageId(null);
        return;
      }

      if (isSpeaking) {
        stop();
      }

      setActiveSpeechMessageId(message.id);
      try {
        await speak(message.content);
      } finally {
        setActiveSpeechMessageId((current) => (current === message.id ? null : current));
      }
    },
    [activeSpeechMessageId, isSpeaking, speak, stop]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (autoPlayInitializedRef.current) {
      return;
    }

    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      if (message.isStreaming) continue;
      if (!message.content.trim()) continue;
      spokenMessageIdsRef.current.add(message.id);
    }

    autoPlayInitializedRef.current = true;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) return;
    spokenMessageIdsRef.current.clear();
    setActiveSpeechMessageId(null);
  }, [messages.length]);

  useEffect(() => {
    if (!speechSettings.ttsEnabled || !speechSettings.ttsAutoPlay || isLoading) return;

    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && !message.isStreaming && message.content.trim().length > 0);

    if (!latestAssistant) return;
    if (spokenMessageIdsRef.current.has(latestAssistant.id)) return;

    spokenMessageIdsRef.current.add(latestAssistant.id);
    void handleSpeakMessage(latestAssistant).catch(() => {
      setActiveSpeechMessageId((current) => (current === latestAssistant.id ? null : current));
    });
  }, [handleSpeakMessage, isLoading, messages, speechSettings.ttsAutoPlay, speechSettings.ttsEnabled]);

  return (
    <ScrollArea ref={scrollRef} className={cn('flex-1 px-3 py-2', className)}>
      <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-label="Chat messages">
        {/* Messages */}
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            showTimestamp={showTimestamps}
            isLastAssistant={message.role === 'assistant' && index === messages.length - 1}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            onEdit={onEdit}
            onSpeak={handleSpeakMessage}
            isSpeaking={isSpeaking && activeSpeechMessageId === message.id}
            isTTSLoading={isTTSLoading && activeSpeechMessageId === message.id}
            ttsSupported={ttsSupported}
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
              text={t('thinking')}
              className="min-w-[180px]"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Continue generation button - show after last assistant message when not loading */}
        {!isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === 'assistant' &&
          onContinue && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onContinue}>
                <ArrowRight className="h-3 w-3" />
                {t('continueGeneration')}
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
  onSpeak: (message: ChatWidgetMessage) => Promise<void>;
  isSpeaking: boolean;
  isTTSLoading: boolean;
  ttsSupported: boolean;
}

const MessageBubble = memo(function MessageBubble({
  message,
  showTimestamp,
  isLastAssistant,
  onRegenerate,
  onFeedback,
  onEdit,
  onSpeak,
  isSpeaking,
  isTTSLoading,
  ttsSupported,
}: MessageBubbleProps) {
  const t = useTranslations('chatWidget.messages');
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleSpeak = () => {
    void onSpeak(message);
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
    <div className={cn('group flex items-start gap-2', isUser && 'flex-row-reverse')}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={cn(
            'py-2 px-3 rounded-lg text-sm relative',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted/80 rounded-bl-md',
            message.isStreaming && 'animate-pulse'
          )}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={editContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditContent(e.target.value)
                }
                className="min-h-[60px] text-sm resize-none"
                autoFocus
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
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
                <span className="text-[10px] opacity-60 ml-1">{t('edited')}</span>
              )}
            </div>
          ) : (
            <Streamdown
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
                'prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1',
                'prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted',
                'prose-pre:bg-muted prose-pre:p-3'
              )}
            >
              {message.content || ' '}
            </Streamdown>
          )}
          {message.error && <p className="text-xs text-destructive mt-1">{message.error}</p>}
        </div>

        {/* User message actions - edit */}
        {isUser && !isEditing && !message.isStreaming && onEdit && (
          <div
            className={cn(
              'flex items-center gap-1',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleStartEdit}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t('edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Assistant message actions - copy, speak, feedback, regenerate */}
        {!isUser && message.content && !message.isStreaming && (
          <div
            className={cn(
              'flex items-center gap-1',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <InlineCopyButton content={message.content} className="h-6 w-6" />

            {/* TTS button */}
            {ttsSupported && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-6 w-6', (isSpeaking || isTTSLoading) && 'text-primary')}
                      onClick={handleSpeak}
                    >
                      {isSpeaking || isTTSLoading ? (
                        <VolumeX className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isSpeaking || isTTSLoading ? t('stopReading') : t('read')}
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
                        className={cn('h-6 w-6', message.feedback === 'like' && 'text-green-500')}
                        onClick={() => handleFeedback('like')}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('helpful')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn('h-6 w-6', message.feedback === 'dislike' && 'text-red-500')}
                        onClick={() => handleFeedback('dislike')}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('notHelpful')}</TooltipContent>
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
                  <TooltipContent side="bottom">{t('regenerate')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && message.timestamp && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground/60',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
