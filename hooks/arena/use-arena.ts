/**
 * useArena - Main hook for arena battle management
 * Handles parallel model execution and streaming
 */

import { useCallback, useState } from 'react';
import { useArenaStore } from '@/stores/arena';
import { useSettingsStore } from '@/stores/settings';
import { getProviderModel, type ProviderName } from '@/lib/ai/core/client';
import { streamText } from 'ai';
import { classifyTaskRuleBased } from '@/lib/ai/generation/auto-router';
import { ARENA_KNOWN_MODELS } from '@/lib/arena/constants';
import { computeEstimatedCost } from '@/lib/arena/stats';
import type { ArenaBattle, ArenaContestant, ArenaWinReason, ModelSelection } from '@/types/arena';

const abortControllers = new Map<string, AbortController>();

interface UseArenaOptions {
  onBattleStart?: (battle: ArenaBattle) => void;
  onContestantStream?: (contestantId: string, chunk: string) => void;
  onContestantComplete?: (contestant: ArenaContestant) => void;
  onContestantError?: (contestantId: string, error: Error) => void;
  onBattleComplete?: (battle: ArenaBattle) => void;
}

interface StartBattleOptions {
  sessionId?: string;
  systemPrompt?: string;
  blindMode?: boolean;
  conversationMode?: 'single' | 'multi';
  maxTurns?: number;
  temperature?: number;
  maxTokens?: number;
  taskCategory?: string;
}

export function useArena(options: UseArenaOptions = {}) {
  const {
    onBattleStart,
    onContestantStream,
    onContestantComplete,
    onContestantError,
    onBattleComplete,
  } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const createBattle = useArenaStore((state) => state.createBattle);
  const updateContestantStatus = useArenaStore((state) => state.updateContestantStatus);
  const appendToContestantResponse = useArenaStore((state) => state.appendToContestantResponse);
  const updateContestant = useArenaStore((state) => state.updateContestant);
  const getBattle = useArenaStore((state) => state.getBattle);
  const selectWinner = useArenaStore((state) => state.selectWinner);
  const declareTie = useArenaStore((state) => state.declareTie);
  const declareBothBad = useArenaStore((state) => state.declareBothBad);

  /**
   * Execute a single contestant's generation
   */
  const executeContestant = useCallback(
    async (
      battleId: string,
      contestant: ArenaContestant,
      prompt: string,
      systemPrompt?: string,
      modelParams?: { temperature?: number; maxTokens?: number }
    ): Promise<void> => {
      const abortController = new AbortController();
      abortControllers.set(contestant.id, abortController);

      try {
        const settings = providerSettings[contestant.provider];
        if (!settings?.apiKey && contestant.provider !== 'ollama') {
          throw new Error(`No API key configured for ${contestant.provider}`);
        }

        updateContestantStatus(battleId, contestant.id, 'streaming');

        const model = getProviderModel(
          contestant.provider,
          contestant.model,
          settings?.apiKey || '',
          settings?.baseURL
        );

        const messages = [{ role: 'user' as const, content: prompt }];

        const streamOptions: Parameters<typeof streamText>[0] = {
          model,
          messages,
          system: systemPrompt,
          abortSignal: abortController.signal,
        };

        // Add optional model parameters if provided
        if (modelParams?.temperature !== undefined) {
          (streamOptions as Record<string, unknown>).temperature = modelParams.temperature;
        }
        if (modelParams?.maxTokens !== undefined) {
          (streamOptions as Record<string, unknown>).maxTokens = modelParams.maxTokens;
        }

        const result = await streamText(streamOptions);

        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of result.textStream) {
          if (abortController.signal.aborted) {
            throw new Error('Aborted');
          }
          fullText += chunk;
          appendToContestantResponse(battleId, contestant.id, chunk);
          onContestantStream?.(contestant.id, chunk);
        }

        // Get usage info - AI SDK may use different field names across versions
        const usage = await result.usage;
        const usageRecord = usage as Record<string, unknown> | undefined;
        inputTokens = Number(usageRecord?.promptTokens ?? usageRecord?.inputTokens ?? 0);
        outputTokens = Number(usageRecord?.completionTokens ?? usageRecord?.outputTokens ?? 0);

        // Compute estimated cost from token usage
        const estimatedCost = computeEstimatedCost(
          contestant.provider,
          contestant.model,
          inputTokens,
          outputTokens
        );

        // Update contestant with final data
        updateContestant(battleId, contestant.id, {
          response: fullText,
          status: 'completed',
          estimatedCost,
          tokenCount: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          },
        });
        updateContestantStatus(battleId, contestant.id, 'completed');

        const updatedBattle = getBattle(battleId);
        const updatedContestant = updatedBattle?.contestants.find((c) => c.id === contestant.id);
        if (updatedContestant) {
          onContestantComplete?.(updatedContestant);
        }
      } catch (err) {
        if ((err as Error).message === 'Aborted') {
          updateContestantStatus(battleId, contestant.id, 'cancelled');
        } else {
          const errorMessage = err instanceof Error ? err.message : String(err);
          updateContestant(battleId, contestant.id, {
            error: errorMessage,
            status: 'error',
          });
          updateContestantStatus(battleId, contestant.id, 'error');
          onContestantError?.(contestant.id, err as Error);
        }
      } finally {
        abortControllers.delete(contestant.id);
      }
    },
    [
      providerSettings,
      updateContestantStatus,
      appendToContestantResponse,
      updateContestant,
      getBattle,
      onContestantStream,
      onContestantComplete,
      onContestantError,
    ]
  );

  /**
   * Start a new arena battle with multiple models
   */
  const startBattle = useCallback(
    async (
      prompt: string,
      models: ModelSelection[],
      battleOptions?: StartBattleOptions
    ): Promise<ArenaBattle | null> => {
      if (models.length < 2) {
        setError('At least 2 models are required for an arena battle');
        return null;
      }

      setIsExecuting(true);
      setError(null);

      try {
        // Classify the task
        const taskClassification = classifyTaskRuleBased(prompt);

        // Create the battle
        const battle = createBattle(prompt, models, {
          sessionId: battleOptions?.sessionId,
          systemPrompt: battleOptions?.systemPrompt,
          mode: battleOptions?.blindMode ? 'blind' : 'normal',
          conversationMode: battleOptions?.conversationMode || 'single',
          maxTurns: battleOptions?.maxTurns || 5,
          taskClassification,
        });

        onBattleStart?.(battle);

        // Prepare model parameters
        const modelParams = battleOptions?.temperature !== undefined || battleOptions?.maxTokens !== undefined
          ? { temperature: battleOptions?.temperature, maxTokens: battleOptions?.maxTokens }
          : undefined;

        // Execute all contestants in parallel
        const executions = battle.contestants.map((contestant) =>
          executeContestant(
            battle.id,
            contestant,
            prompt,
            battleOptions?.systemPrompt,
            modelParams
          )
        );

        await Promise.allSettled(executions);

        // Get updated battle
        const completedBattle = getBattle(battle.id);
        if (completedBattle) {
          onBattleComplete?.(completedBattle);
        }

        return completedBattle || battle;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [createBattle, executeContestant, getBattle, onBattleStart, onBattleComplete]
  );

  /**
   * Cancel an ongoing battle
   */
  const cancelBattle = useCallback((battleId: string) => {
    const battle = getBattle(battleId);
    if (!battle) return;

    // Abort all ongoing contestants
    for (const contestant of battle.contestants) {
      const controller = abortControllers.get(contestant.id);
      if (controller) {
        controller.abort();
      }
    }
  }, [getBattle]);

  /**
   * Select a winner for a battle
   */
  const pickWinner = useCallback(
    (battleId: string, winnerId: string, reason?: ArenaWinReason, notes?: string) => {
      selectWinner(battleId, winnerId, { reason, notes });
    },
    [selectWinner]
  );

  /**
   * Declare a tie (no clear winner)
   */
  const pickTie = useCallback(
    (battleId: string, notes?: string) => {
      declareTie(battleId, notes);
    },
    [declareTie]
  );

  /**
   * Declare both responses as bad (neither satisfactory)
   */
  const pickBothBad = useCallback(
    (battleId: string, notes?: string) => {
      declareBothBad(battleId, notes);
    },
    [declareBothBad]
  );

  /**
   * Get available models from configured providers
   */
  const getAvailableModels = useCallback((): ModelSelection[] => {
    const models: ModelSelection[] = [];

    for (const preset of ARENA_KNOWN_MODELS) {
      const settings = providerSettings[preset.provider];
      if (settings?.apiKey || preset.provider === 'ollama') {
        models.push(preset);
      }
    }

    // Also discover additional models from provider settings
    for (const [providerKey, settings] of Object.entries(providerSettings)) {
      if (!settings?.apiKey && providerKey !== 'ollama') continue;
      const customModels = (settings as unknown as Record<string, unknown>).availableModels;
      if (Array.isArray(customModels)) {
        for (const m of customModels) {
          if (typeof m === 'string' && !models.some(e => e.provider === providerKey && e.model === m)) {
            models.push({
              provider: providerKey as ProviderName,
              model: m,
              displayName: m,
            });
          }
        }
      }
    }

    return models;
  }, [providerSettings]);

  /**
   * Continue a multi-turn battle with a new user message
   */
  const continueTurn = useCallback(
    async (battleId: string, userMessage: string): Promise<void> => {
      const battle = getBattle(battleId);
      if (!battle) return;
      if (battle.conversationMode !== 'multi') return;
      if (battle.currentTurn && battle.maxTurns && battle.currentTurn >= battle.maxTurns) return;

      setIsExecuting(true);
      setError(null);

      try {
        // Add user message to all contestants via store
        const store = useArenaStore.getState();
        store.continueBattle(battleId, userMessage);

        // Execute next turn for all contestants
        const updatedBattle = getBattle(battleId);
        if (!updatedBattle) return;

        const executions = updatedBattle.contestants.map((contestant) =>
          executeContestant(
            battleId,
            contestant,
            userMessage,
            battle.systemPrompt
          )
        );

        await Promise.allSettled(executions);

        const completedBattle = getBattle(battleId);
        if (completedBattle) {
          onBattleComplete?.(completedBattle);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setIsExecuting(false);
      }
    },
    [getBattle, executeContestant, onBattleComplete]
  );

  /**
   * Check if battle can continue (multi-turn)
   */
  const canContinue = useCallback((battleId: string): boolean => {
    const battle = getBattle(battleId);
    if (!battle) return false;
    if (battle.conversationMode !== 'multi') return false;
    if (battle.winnerId || battle.isTie) return false;
    if (battle.currentTurn && battle.maxTurns && battle.currentTurn >= battle.maxTurns) return false;

    // Check if all contestants are done with current turn
    return battle.contestants.every(
      (c) => c.status === 'completed' || c.status === 'error'
    );
  }, [getBattle]);

  return {
    // State
    isExecuting,
    error,

    // Actions
    startBattle,
    cancelBattle,
    pickWinner,
    pickTie,
    pickBothBad,
    getAvailableModels,

    // Multi-turn
    continueTurn,
    canContinue,
  };
}

export default useArena;
