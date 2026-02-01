'use client';

/**
 * MultiColumnChat - Multi-column chat view for arena mode
 * Displays parallel responses from multiple AI models side-by-side
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Square, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatColumn } from './chat-column';
import { QuickVoteBar } from '../ui/quick-vote-bar';
import { MultiModelSelector } from '../selectors/multi-model-selector';
import { useMultiModelChat } from '@/hooks/chat/use-multi-model-chat';
import { useArenaStore } from '@/stores/arena';
import { cn } from '@/lib/utils';
import type { ArenaModelConfig, MultiModelMessage } from '@/types/chat/multi-model';

interface MultiColumnChatProps {
  sessionId: string;
  models: ArenaModelConfig[];
  onModelsChange: (models: ArenaModelConfig[]) => void;
  systemPrompt?: string;
  className?: string;
}

export function MultiColumnChat({
  sessionId,
  models,
  onModelsChange,
  systemPrompt,
  className,
}: MultiColumnChatProps) {
  const t = useTranslations('arena');
  const [messages, setMessages] = useState<MultiModelMessage[]>([]);
  const [inputValue, setInputValue] = useState('');

  const createBattle = useArenaStore((state) => state.createBattle);
  const selectWinner = useArenaStore((state) => state.selectWinner);
  const declareTie = useArenaStore((state) => state.declareTie);

  // Maximum messages to keep in memory to prevent unbounded growth
  const MAX_MESSAGES = 50;

  const { isExecuting, columnStates, sendToAllModels, cancelAll } = useMultiModelChat({
    models,
    systemPrompt,
    onMessageComplete: (msg) => {
      setMessages((prev) => {
        const updated = [...prev, msg];
        // Keep only the most recent messages to prevent memory issues
        if (updated.length > MAX_MESSAGES) {
          return updated.slice(-MAX_MESSAGES);
        }
        return updated;
      });
    },
  });

  // Handle sending message to all models
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isExecuting || models.length < 2) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    await sendToAllModels(userMessage);
  }, [inputValue, isExecuting, models.length, sendToAllModels]);

  // Handle key press in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle voting for a winner
  const handleVote = useCallback(
    (modelId: string) => {
      if (messages.length === 0) return;

      const lastMsg = messages[messages.length - 1];
      const winner = models.find((m) => m.id === modelId);

      if (winner) {
        // Create battle record for rating calculation
        const battle = createBattle(
          lastMsg.userContent,
          models.map((m) => ({
            provider: m.provider,
            model: m.model,
            displayName: m.displayName,
          })),
          { sessionId }
        );

        // Find contestant ID for the winner
        const winnerContestant = battle.contestants.find(
          (c) => c.provider === winner.provider && c.model === winner.model
        );
        if (winnerContestant) {
          selectWinner(battle.id, winnerContestant.id);
        }
      }

      // Update message with vote
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, votedModelId: modelId } : msg
        )
      );
    },
    [messages, models, sessionId, createBattle, selectWinner]
  );

  // Handle declaring a tie
  const handleTie = useCallback(() => {
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    // Create battle record
    const battle = createBattle(
      lastMsg.userContent,
      models.map((m) => ({
        provider: m.provider,
        model: m.model,
        displayName: m.displayName,
      })),
      { sessionId }
    );

    declareTie(battle.id);

    // Update message with tie
    setMessages((prev) =>
      prev.map((msg, i) => (i === prev.length - 1 ? { ...msg, isTie: true } : msg))
    );
  }, [messages, models, sessionId, createBattle, declareTie]);

  // Check if all models have completed
  const allCompleted = useMemo(
    () =>
      models.length > 0 &&
      models.every((m) => {
        const state = columnStates[m.id];
        return state?.status === 'completed' || state?.status === 'error';
      }),
    [models, columnStates]
  );

  // Check if last message has been voted
  const lastMessageVoted =
    messages.length > 0 &&
    (messages[messages.length - 1].votedModelId !== undefined ||
      messages[messages.length - 1].isTie);

  // Show vote bar when all completed and not yet voted
  const showVoteBar = allCompleted && !lastMessageVoted && messages.length > 0;

  // Check if we can send (need at least 2 models)
  const canSend = models.length >= 2 && !isExecuting;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Model selector bar */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <MultiModelSelector
          models={models}
          onModelsChange={onModelsChange}
          disabled={isExecuting}
        />
      </div>

      {/* Warning if less than 2 models */}
      {models.length < 2 && (
        <Alert variant="default" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('selectAtLeast2Models')}</AlertDescription>
        </Alert>
      )}

      {/* Multi-column content area */}
      <div className="flex-1 min-h-0 p-4">
        {models.length >= 2 ? (
          <div
            className="grid gap-4 h-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(models.length, 4)}, 1fr)`,
            }}
          >
            {models.map((model) => (
              <ChatColumn
                key={model.id}
                model={model}
                messages={messages}
                currentState={columnStates[model.id]}
                isWinner={
                  messages.length > 0 &&
                  messages[messages.length - 1].votedModelId === model.id
                }
                showMetrics
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">
              {t('selectModelsToStart')}
              <br />
              <span className="text-sm">{t('selectModelsHint', { min: 2, max: 4 })}</span>
            </p>
          </div>
        )}
      </div>

      {/* Quick vote bar */}
      {showVoteBar && (
        <QuickVoteBar models={models} onVote={handleVote} onTie={handleTie} />
      )}

      {/* Input area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              models.length < 2
                ? t('selectAtLeast2Models')
                : t('typeMessagePlaceholder')
            }
            disabled={!canSend}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          {isExecuting ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={cancelAll}
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!canSend || !inputValue.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiColumnChat;
