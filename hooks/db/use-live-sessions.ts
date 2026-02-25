/**
 * useLiveSessions - Reactive session list from Dexie via useLiveQuery
 *
 * Automatically re-renders when sessions are added, updated, or deleted,
 * including cross-tab changes via BroadcastChannel.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { dbSessionToSession } from '@/lib/db/repositories/session-repository';
import type { Session } from '@/types';

export function useLiveSessions(): Session[] {
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('updatedAt').reverse().toArray(),
    [],
    []
  );

  return (sessions ?? []).map(dbSessionToSession);
}

export function useLiveSessionCount(): number {
  return useLiveQuery(() => db.sessions.count(), [], 0) ?? 0;
}
