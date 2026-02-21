'use client';

import { forwardRef, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Square, Mic, MicOff } from 'lucide-react';
import { useSpeech } from '@/hooks/media/use-speech';
import { useInputCompletionUnified } from '@/hooks/chat/use-input-completion-unified';
import { useCompletionSettingsStore } from '@/stores/settings/completion-settings-store';
import { GhostTextOverlay } from '@/components/chat/ghost-text-overlay';
import type { CompletionProviderConfig } from '@/types/chat/input-completion';

interface ChatWidgetInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showVoiceInput?: boolean;
}

export const ChatWidgetInput = forwardRef<HTMLTextAreaElement, ChatWidgetInputProps>(
  function ChatWidgetInput(
    {
      value,
      onChange,
      onSubmit,
      onKeyDown,
      onStop,
      isLoading,
      disabled,
      placeholder: placeholderProp,
      className,
      showVoiceInput = true,
    },
    ref
  ) {
    const t = useTranslations('chatWidget.input');
    const formRef = useRef<HTMLFormElement>(null);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref && 'current' in ref ? ref : internalRef) as React.RefObject<HTMLTextAreaElement>;
    const [textareaMounted, setTextareaMounted] = useState(false);

    // Track when textarea is mounted for ghost text rendering
    useEffect(() => {
      setTextareaMounted(!!textareaRef.current);
    }, [textareaRef]);

    // AI ghost text completion
    const ghostTextOpacity = useCompletionSettingsStore((s) => s.ghostTextOpacity);
    const aiOnlyProviders = useMemo<CompletionProviderConfig[]>(
      () => [{ type: 'ai-text', trigger: 'contextual', priority: 50, enabled: true }],
      []
    );
    const {
      state: completionState,
      handleInputChange: handleCompletionChange,
      handleKeyDown: handleCompletionKeyDown,
      acceptGhostText,
      dismissGhostText,
    } = useInputCompletionUnified({
      providers: aiOnlyProviders,
      onTextCommit: onChange,
      mode: 'chat',
      surface: 'chat_widget',
    });

    const ghostText = completionState.ghostText;

    // Voice input using existing useSpeech hook
    const { isListening, startListening, stopListening, sttSupported, interimTranscript } =
      useSpeech({
        onResult: (text, isFinal) => {
          if (isFinal && text.trim()) {
            onChange(value + (value ? ' ' : '') + text);
          }
        },
      });

    const toggleVoice = useCallback(() => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }, [isListening, startListening, stopListening]);

    // Auto-resize textarea with completion integration
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        onChange(textarea.value);

        // Notify unified completion system
        const pos = textarea.selectionStart || 0;
        handleCompletionChange(textarea.value, pos);

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set the height to scrollHeight, with a max of 120px
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      },
      [onChange, handleCompletionChange]
    );

    // Enhanced key handler with completion support
    const handleKeyDownWithCompletion = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Delegate to unified completion keyboard handler first
        const handled = handleCompletionKeyDown(e.nativeEvent);
        if (handled) {
          return;
        }
        // Fall through to parent handler
        onKeyDown(e);
      },
      [handleCompletionKeyDown, onKeyDown]
    );

    // Reset height when value is cleared
    useEffect(() => {
      if (!value && ref && 'current' in ref && ref.current) {
        ref.current.style.height = 'auto';
      }
    }, [value, ref]);

    return (
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={cn('flex items-end gap-2 px-3 pb-3 pt-1', className)}
      >
        <div className="flex-1 relative">
          <Textarea
            ref={ref}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDownWithCompletion}
            placeholder={placeholderProp || t('placeholder')}
            disabled={disabled}
            aria-label={placeholderProp || t('placeholder')}
            className={cn(
              'min-h-[40px] max-h-[120px] py-2.5 px-3 pr-12',
              'resize-none overflow-y-auto rounded-xl',
              'bg-muted/40 border-border/30',
              'focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/30',
              'text-sm placeholder:text-muted-foreground/50',
              'transition-all duration-200'
            )}
            rows={1}
          />
          {/* AI Ghost text overlay */}
          {ghostText && textareaMounted && (
            <GhostTextOverlay
              text={ghostText}
              textareaRef={textareaRef}
              onAccept={acceptGhostText}
              onDismiss={dismissGhostText}
              opacity={ghostTextOpacity}
            />
          )}
          {/* Character counter */}
          {value.length > 0 && (
            <span
              className={cn(
                'absolute right-2 bottom-1.5 text-[10px] text-muted-foreground/60',
                value.length > 4000 && 'text-destructive'
              )}
            >
              {value.length}
            </span>
          )}
        </div>

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1">
            {/* Voice input button */}
            {showVoiceInput && sttSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-9 w-9 shrink-0 transition-colors',
                      isListening && 'bg-red-500/20 text-red-500 animate-pulse'
                    )}
                    onClick={toggleVoice}
                    disabled={disabled || isLoading}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isListening ? t('stopRecording') : t('voiceInput')}
                  {interimTranscript && (
                    <span className="block text-xs opacity-70 mt-1">{interimTranscript}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Stop button (when loading) */}
            {isLoading && onStop ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={onStop}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('stopGeneration')}</TooltipContent>
              </Tooltip>
            ) : (
              /* Send button */
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    size="icon"
                    className={cn(
                      'h-9 w-9 shrink-0 rounded-xl',
                      'bg-primary hover:bg-primary/90',
                      'shadow-sm hover:shadow-md',
                      'transition-all duration-200',
                      (!value.trim() || isLoading) && 'opacity-50 shadow-none'
                    )}
                    disabled={!value.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('sendMessage')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </form>
    );
  }
);
