'use client';

/**
 * ChatColumn - Single column in multi-model chat view
 * Displays streaming responses from a single AI model
 */

import { memo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColumnHeader } from '../ui/column-header';
import { MarkdownRenderer } from '../utils';
import { cn } from '@/lib/utils';
import type {
  ArenaModelConfig,
  ColumnMessageState,
  MultiModelMessage,
} from '@/types/chat/multi-model';

interface ChatColumnProps {
  model: ArenaModelConfig;
  messages: MultiModelMessage[];
  currentState?: ColumnMessageState;
  isWinner?: boolean;
  onSelect?: () => void;
  showMetrics?: boolean;
  className?: string;
}

export const ChatColumn = memo(function ChatColumn({
  model,
  messages,
  currentState,
  isWinner = false,
  onSelect,
  showMetrics = true,
  className,
}: ChatColumnProps) {
  const t = useTranslations('arena');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, currentState?.content]);

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-lg overflow-hidden bg-card',
        isWinner && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Column header */}
      <ColumnHeader
        model={model}
        state={currentState}
        isWinner={isWinner}
        showMetrics={showMetrics}
      />

      {/* Messages area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-4">
          {/* Historical messages */}
          {messages.map((msg) => {
            const columnData = msg.columns.find((c) => c.modelId === model.id);
            if (!columnData) return null;

            const isVoted = msg.votedModelId === model.id;
            const isTie = msg.isTie;

            return (
              <div key={msg.id} className="space-y-3">
                {/* User message */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.userContent}</p>
                </div>

                {/* Model response */}
                <div
                  className={cn(
                    'rounded-lg p-3 transition-colors',
                    columnData.status === 'error'
                      ? 'bg-destructive/10 border border-destructive/20'
                      : isVoted
                        ? 'bg-primary/5 border border-primary/20'
                        : isTie
                          ? 'bg-muted/30'
                          : 'bg-background'
                  )}
                >
                  {columnData.status === 'error' ? (
                    <p className="text-sm text-destructive">{columnData.error}</p>
                  ) : (
                    <MarkdownRenderer content={columnData.content || ''} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Current streaming response */}
          {currentState && currentState.status !== 'pending' && (
            <div className="space-y-3">
              {/* Show current response while streaming */}
              {currentState.status === 'streaming' && (
                <div className={cn('rounded-lg p-3', 'bg-background border')}>
                  <MarkdownRenderer content={currentState.content || '...'} />
                </div>
              )}
              {/* Show error state */}
              {currentState.status === 'error' && (
                <div className={cn('rounded-lg p-3', 'bg-destructive/10 border border-destructive/20')}>
                  <p className="text-sm text-destructive">{currentState.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !currentState?.content && (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              {t('waitingForMessage')}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selection button (for voting) */}
      {onSelect && (
        <button
          className="w-full py-2.5 text-sm font-medium border-t bg-muted/30 hover:bg-muted/50 transition-colors"
          onClick={onSelect}
        >
          {t('selectModel', { name: model.displayName })}
        </button>
      )}
    </div>
  );
});

export default ChatColumn;
