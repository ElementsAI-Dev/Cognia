'use client';

import { forwardRef, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Square, Mic, MicOff } from 'lucide-react';
import { useSpeech } from '@/hooks/media/use-speech';

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

    // Auto-resize textarea
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        onChange(textarea.value);

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set the height to scrollHeight, with a max of 120px
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      },
      [onChange]
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
        className={cn('flex items-end gap-2 p-3 border-t border-border/50 bg-muted/30', className)}
      >
        <div className="flex-1 relative">
          <Textarea
            ref={ref}
            value={value}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder={placeholderProp || t('placeholder')}
            disabled={disabled}
            className={cn(
              'min-h-[40px] max-h-[120px] py-2.5 px-3 pr-12',
              'resize-none overflow-y-auto',
              'bg-background border-border/50',
              'focus-visible:ring-1 focus-visible:ring-primary/50',
              'text-sm placeholder:text-muted-foreground/60'
            )}
            rows={1}
          />
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
                    className="h-9 w-9 shrink-0"
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
                    className="h-9 w-9 shrink-0"
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
