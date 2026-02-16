import type { SessionStore } from './types';

export const selectSessions = (state: SessionStore) => state.sessions;
export const selectActiveSessionId = (state: SessionStore) => state.activeSessionId;
export const selectModeHistory = (state: SessionStore) => state.modeHistory;
