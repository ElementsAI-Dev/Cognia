/**
 * useLiveMessages - Reactive message list from Dexie via useLiveQuery
 *
 * Automatically re-renders when messages change for the given session,
 * including cross-tab changes via BroadcastChannel.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toUIMessage } from '@/lib/db/repositories/message-repository';
import type { UIMessage } from '@/types';

export function useLiveMessages(sessionId: string | null): UIMessage[] {
  const messages = useLiveQuery(
    () =>
      sessionId
        ? db.messages.where('sessionId').equals(sessionId).sortBy('createdAt')
        : [],
    [sessionId],
    []
  );

  return (messages ?? []).map((m) =>
    typeof m === 'object' && 'sessionId' in m ? toUIMessage(m) : (m as UIMessage)
  );
}

export function useLiveMessageCount(sessionId: string | null): number {
  return (
    useLiveQuery(
      () =>
        sessionId
          ? db.messages.where('sessionId').equals(sessionId).count()
          : 0,
      [sessionId],
      0
    ) ?? 0
  );
}
