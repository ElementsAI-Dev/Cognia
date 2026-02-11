/**
 * useArenaVoting - Shared voting logic for arena battles
 * Centralizes vote validation, winner selection, tie/bothBad declarations
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useArenaStore, selectBattleById } from '@/stores/arena';
import { useArena } from './use-arena';
import { useCopy } from '@/hooks/ui';
import type { ArenaWinReason } from '@/types/arena';

interface UseArenaVotingOptions {
  /** Default win reason for votes */
  defaultReason?: ArenaWinReason;
  /** Whether to auto-mark battle as viewed on mount */
  autoMarkViewed?: boolean;
}

export function useArenaVoting(battleId: string, options: UseArenaVotingOptions = {}) {
  const { defaultReason = 'quality', autoMarkViewed = true } = options;

  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('messageCopied') });
  const { cancelBattle } = useArena();

  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ArenaWinReason>(defaultReason);

  const battle = useArenaStore(selectBattleById(battleId));
  const selectWinner = useArenaStore((state) => state.selectWinner);
  const declareTie = useArenaStore((state) => state.declareTie);
  const declareBothBad = useArenaStore((state) => state.declareBothBad);
  const canVote = useArenaStore((state) => state.canVote);
  const markBattleViewed = useArenaStore((state) => state.markBattleViewed);

  useEffect(() => {
    if (autoMarkViewed) {
      markBattleViewed(battleId);
    }
  }, [battleId, markBattleViewed, autoMarkViewed]);

  const allDone = battle?.contestants.every(
    (c) => c.status === 'completed' || c.status === 'error' || c.status === 'cancelled'
  );

  const ensureVoteAllowed = useCallback(() => {
    const result = canVote(battleId);
    if (!result.allowed) {
      const message =
        result.reason === 'min-viewing-time'
          ? tToasts('arenaMinViewingTime')
          : tToasts('arenaRateLimit');
      toast.error(message);
      return false;
    }
    return true;
  }, [battleId, canVote, tToasts]);

  const handleDeclareTie = useCallback(() => {
    if (!ensureVoteAllowed()) return;
    setIsRevealing(true);
    declareTie(battleId);
  }, [battleId, declareTie, ensureVoteAllowed]);

  const handleDeclareBothBad = useCallback(() => {
    if (!ensureVoteAllowed()) return;
    setIsRevealing(true);
    declareBothBad(battleId);
  }, [battleId, declareBothBad, ensureVoteAllowed]);

  const handleVote = useCallback(
    (contestantId: string) => {
      if (!ensureVoteAllowed()) return;
      setIsRevealing(true);
      selectWinner(battleId, contestantId, { reason: selectedReason });
    },
    [battleId, ensureVoteAllowed, selectWinner, selectedReason]
  );

  const handleCopy = useCallback(
    async (content: string) => {
      await copy(content);
    },
    [copy]
  );

  const handleCancel = useCallback(() => {
    cancelBattle(battleId);
  }, [battleId, cancelBattle]);

  return {
    battle,
    allDone,
    isRevealing,
    setIsRevealing,
    selectedReason,
    setSelectedReason,
    isCopying,
    handleVote,
    handleDeclareTie,
    handleDeclareBothBad,
    handleCopy,
    handleCancel,
    ensureVoteAllowed,
  };
}
