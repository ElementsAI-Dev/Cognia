import { messageRepository, agentTraceRepository, db } from '@/lib/db';
import { loggers } from '@/lib/logger';
import type { SliceCreator, BulkSliceState, BulkSliceActions } from '../types';

export const bulkSliceInitialState: BulkSliceState = {
  selectedSessionIds: [],
};

export const createBulkSlice: SliceCreator<BulkSliceActions> = (set, get) => ({
  selectSession: (id) =>
    set((state) => ({
      selectedSessionIds: state.selectedSessionIds.includes(id)
        ? state.selectedSessionIds
        : [...state.selectedSessionIds, id],
    })),

  deselectSession: (id) =>
    set((state) => ({
      selectedSessionIds: state.selectedSessionIds.filter((sid) => sid !== id),
    })),

  selectAllSessions: () =>
    set((state) => ({
      selectedSessionIds: state.sessions.map((s) => s.id),
    })),

  clearSelection: () =>
    set(() => ({
      selectedSessionIds: [],
    })),

  bulkDeleteSessions: (ids) => {
    for (const id of ids) {
      messageRepository.deleteBySessionId(id).catch((err) =>
        loggers.chat.error('Failed to delete messages for session', err as Error)
      );
      db.summaries.where('sessionId').equals(id).delete().catch((err) =>
        loggers.chat.error('Failed to delete summaries for session', err as Error)
      );
      agentTraceRepository.deleteBySessionId(id).catch((err) =>
        loggers.chat.error('Failed to delete agent traces for session', err as Error)
      );
    }

    set((state) => {
      const idsToDelete = new Set(ids);
      const newActiveId =
        state.activeSessionId && idsToDelete.has(state.activeSessionId)
          ? state.sessions.find((s) => !idsToDelete.has(s.id))?.id ?? null
          : state.activeSessionId;

      return {
        sessions: state.sessions.filter((s) => !idsToDelete.has(s.id)),
        activeSessionId: newActiveId,
        selectedSessionIds: state.selectedSessionIds.filter((id) => !idsToDelete.has(id)),
      };
    });
  },

  bulkMoveSessions: (ids, folderId) =>
    set((state) => {
      const idsToMove = new Set(ids);
      const now = new Date();
      return {
        sessions: state.sessions.map((s) =>
          idsToMove.has(s.id) ? { ...s, folderId: folderId ?? undefined, updatedAt: now } : s
        ),
      };
    }),

  bulkPinSessions: (ids, pinned) =>
    set((state) => {
      const idsToPin = new Set(ids);
      const now = new Date();
      return {
        sessions: state.sessions.map((s) => (idsToPin.has(s.id) ? { ...s, pinned, updatedAt: now } : s)),
      };
    }),

  bulkArchiveSessions: (ids) =>
    set((state) => {
      const idsToArchive = new Set(ids);
      const now = new Date();
      return {
        sessions: state.sessions.map((s) =>
          idsToArchive.has(s.id) ? { ...s, isArchived: true, archivedAt: now, updatedAt: now } : s
        ),
        selectedSessionIds: state.selectedSessionIds.filter((id) => !idsToArchive.has(id)),
      };
    }),

  bulkTagSessions: (ids, tag) =>
    set((state) => {
      const idsToTag = new Set(ids);
      const now = new Date();
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) return state;
      return {
        sessions: state.sessions.map((s) => {
          if (!idsToTag.has(s.id)) return s;
          const currentTags = s.tags || [];
          if (currentTags.includes(normalizedTag)) return s;
          return { ...s, tags: [...currentTags, normalizedTag], updatedAt: now };
        }),
      };
    }),

  addTag: (sessionId, tag) =>
    set((state) => {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) return state;
      return {
        sessions: state.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          const currentTags = s.tags || [];
          if (currentTags.includes(normalizedTag)) return s;
          return { ...s, tags: [...currentTags, normalizedTag], updatedAt: new Date() };
        }),
      };
    }),

  removeTag: (sessionId, tag) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, tags: (s.tags || []).filter((t) => t !== tag), updatedAt: new Date() }
          : s
      ),
    })),

  setTags: (sessionId, tags) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
              updatedAt: new Date(),
            }
          : s
      ),
    })),

  getSessionsByTag: (tag) => {
    const { sessions } = get();
    return sessions.filter((s) => s.tags?.includes(tag));
  },

  getAllTags: () => {
    const { sessions } = get();
    const tagSet = new Set<string>();
    for (const session of sessions) {
      if (session.tags) {
        for (const tag of session.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  },

  archiveSession: (id) =>
    set((state) => {
      const now = new Date();
      return {
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, isArchived: true, archivedAt: now, updatedAt: now } : s
        ),
        activeSessionId:
          state.activeSessionId === id
            ? state.sessions.find((s) => s.id !== id && !s.isArchived)?.id ?? null
            : state.activeSessionId,
      };
    }),

  unarchiveSession: (id) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, isArchived: false, archivedAt: undefined, updatedAt: new Date() } : s
      ),
    })),

  getArchivedSessions: () => get().sessions.filter((s) => s.isArchived),

  getActiveSessions: () => get().sessions.filter((s) => !s.isArchived),
});
