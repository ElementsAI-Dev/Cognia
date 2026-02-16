import type { ParallelContextStore } from './types';

export const selectSessionContext = (sessionId: string) => (state: ParallelContextStore) =>
  state.contexts.get(sessionId);

export const selectContextCount = (state: ParallelContextStore) => state.contexts.size;
