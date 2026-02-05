'use client';

/**
 * ChatColumn - Single column in multi-model chat view
 * Displays streaming responses from a single AI model
 *
 * Uses virtualization for efficient rendering of large message lists
 */

import { memo, useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { ColumnHeader } from '../ui/column-header';
import { MarkdownRenderer } from '../utils';
import { Button } from '@/components/ui/button';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
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

/**
 * Message item component for virtualized list
 */
interface MessageItemProps {
  msg: MultiModelMessage;
  modelId: string;
}

const MessageItem = memo(function MessageItem({ msg, modelId }: MessageItemProps) {
  const columnData = msg.columns.find((c) => c.modelId === modelId);
  if (!columnData) return null;

  const isVoted = msg.votedModelId === modelId;
  const isTie = msg.isTie;

  return (
    <div className="space-y-3 px-3 py-2">
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
});

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
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Filter messages that have data for this model
  const filteredMessages = useMemo(
    () => messages.filter((msg) => msg.columns.some((c) => c.modelId === model.id)),
    [messages, model.id]
  );

  // Render individual message item
  const renderItem = useCallback(
    (index: number) => {
      const msg = filteredMessages[index];
      if (!msg) return null;
      return <MessageItem msg={msg} modelId={model.id} />;
    },
    [filteredMessages, model.id]
  );

  // Determine if we should follow output (auto-scroll)
  const isStreaming = currentState?.status === 'streaming';

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

      {/* Virtualized messages area */}
      <div className="flex-1 min-h-0">
        {filteredMessages.length > 0 || currentState?.content ? (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredMessages}
            totalCount={filteredMessages.length}
            itemContent={(index) => renderItem(index)}
            followOutput={isStreaming ? 'smooth' : false}
            initialTopMostItemIndex={Math.max(0, filteredMessages.length - 1)}
            className="h-full"
            components={{
              Footer: () =>
                currentState && currentState.status !== 'pending' ? (
                  <div className="px-3 py-2 space-y-3">
                    {/* Show current response while streaming */}
                    {currentState.status === 'streaming' && (
                      <div className={cn('rounded-lg p-3', 'bg-background border')}>
                        <MarkdownRenderer content={currentState.content || '...'} />
                      </div>
                    )}
                    {/* Show error state */}
                    {currentState.status === 'error' && (
                      <div
                        className={cn(
                          'rounded-lg p-3',
                          'bg-destructive/10 border border-destructive/20'
                        )}
                      >
                        <p className="text-sm text-destructive">{currentState.error}</p>
                      </div>
                    )}
                  </div>
                ) : null,
            }}
          />
        ) : (
          <Empty className="h-full border-0">
            <EmptyMedia variant="icon">
              <MessageSquare className="h-5 w-5" />
            </EmptyMedia>
            <EmptyDescription>
              {t('waitingForMessage')}
            </EmptyDescription>
          </Empty>
        )}
      </div>

      {/* Selection button (for voting) */}
      {onSelect && (
        <Button
          variant="ghost"
          className="w-full py-2.5 text-sm font-medium border-t rounded-none bg-muted/30 hover:bg-muted/50"
          onClick={onSelect}
        >
          {t('selectModel', { name: model.displayName })}
        </Button>
      )}
    </div>
  );
});

export default ChatColumn;
