/**
 * useDbStats - Reactive database statistics via useLiveQuery
 *
 * Provides live counts for key tables, automatically updated
 * when data changes across tabs.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export interface DbStats {
  sessions: number;
  messages: number;
  projects: number;
  documents: number;
  workflows: number;
  agentTraces: number;
}

const DEFAULT_STATS: DbStats = {
  sessions: 0,
  messages: 0,
  projects: 0,
  documents: 0,
  workflows: 0,
  agentTraces: 0,
};

export function useDbStats(): DbStats {
  return (
    useLiveQuery(
      async () => ({
        sessions: await db.sessions.count(),
        messages: await db.messages.count(),
        projects: await db.projects.count(),
        documents: await db.documents.count(),
        workflows: await db.workflows.count(),
        agentTraces: await db.agentTraces.count(),
      }),
      [],
      DEFAULT_STATS
    ) ?? DEFAULT_STATS
  );
}
