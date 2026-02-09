/**
 * Tests for compression history store
 */

import type { CompressionHistoryEntry } from '@/types/system/compression';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id'),
}));

// Helper to create a mock history entry
function createMockEntry(
  id: string,
  sessionId: string,
  strategy: string = 'summary'
): CompressionHistoryEntry {
  return {
    id,
    sessionId,
    timestamp: new Date(),
    strategy: strategy as CompressionHistoryEntry['strategy'],
    compressedMessages: [
      { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
      { id: 'msg-2', role: 'assistant', content: 'Hi!', createdAt: new Date() },
    ],
    summaryMessageId: `summary-${id}`,
    tokensBefore: 1000,
    tokensAfter: 500,
  };
}

// Must import after mocks
import { useCompressionHistoryStore } from './compression-history-store';

describe('useCompressionHistoryStore', () => {
  beforeEach(() => {
    useCompressionHistoryStore.getState().reset();
  });

  describe('addEntry', () => {
    it('should add a new entry', () => {
      const entry = createMockEntry('entry-1', 'session-1');
      useCompressionHistoryStore.getState().addEntry(entry);

      const entries = useCompressionHistoryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('entry-1');
    });

    it('should enforce per-session limit of 5', () => {
      const store = useCompressionHistoryStore.getState();

      // Add 6 entries for the same session
      for (let i = 1; i <= 6; i++) {
        store.addEntry(createMockEntry(`entry-${i}`, 'session-1'));
      }

      const entries = useCompressionHistoryStore.getState().entries;
      const sessionEntries = entries.filter(e => e.sessionId === 'session-1');
      expect(sessionEntries).toHaveLength(5);
      // Oldest should be removed
      expect(sessionEntries.find(e => e.id === 'entry-1')).toBeUndefined();
      expect(sessionEntries.find(e => e.id === 'entry-6')).toBeDefined();
    });

    it('should enforce total limit of 20', () => {
      const store = useCompressionHistoryStore.getState();

      // Add 22 entries across different sessions
      for (let i = 1; i <= 22; i++) {
        store.addEntry(createMockEntry(`entry-${i}`, `session-${i}`));
      }

      const entries = useCompressionHistoryStore.getState().entries;
      expect(entries.length).toBeLessThanOrEqual(20);
    });

    it('should not interfere with entries from other sessions', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-2'));

      const entries = useCompressionHistoryStore.getState().entries;
      expect(entries).toHaveLength(2);
    });
  });

  describe('getEntriesForSession', () => {
    it('should return entries for a specific session', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-2'));
      store.addEntry(createMockEntry('entry-3', 'session-1'));

      const sessionEntries = useCompressionHistoryStore.getState().getEntriesForSession('session-1');
      expect(sessionEntries).toHaveLength(2);
      expect(sessionEntries.every(e => e.sessionId === 'session-1')).toBe(true);
    });

    it('should return empty array for unknown session', () => {
      const sessionEntries = useCompressionHistoryStore.getState().getEntriesForSession('unknown');
      expect(sessionEntries).toEqual([]);
    });
  });

  describe('getLatestEntry', () => {
    it('should return the most recent entry for a session', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-1'));
      store.addEntry(createMockEntry('entry-3', 'session-1'));

      const latest = useCompressionHistoryStore.getState().getLatestEntry('session-1');
      expect(latest).toBeDefined();
      expect(latest!.id).toBe('entry-3');
    });

    it('should return undefined for unknown session', () => {
      const latest = useCompressionHistoryStore.getState().getLatestEntry('unknown');
      expect(latest).toBeUndefined();
    });
  });

  describe('removeEntry', () => {
    it('should remove a specific entry by ID', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-1'));

      useCompressionHistoryStore.getState().removeEntry('entry-1');

      const entries = useCompressionHistoryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('entry-2');
    });

    it('should not affect other entries when removing non-existent ID', () => {
      const store = useCompressionHistoryStore.getState();
      store.addEntry(createMockEntry('entry-1', 'session-1'));

      useCompressionHistoryStore.getState().removeEntry('non-existent');

      expect(useCompressionHistoryStore.getState().entries).toHaveLength(1);
    });
  });

  describe('clearSession', () => {
    it('should remove all entries for a session', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-1'));
      store.addEntry(createMockEntry('entry-3', 'session-2'));

      useCompressionHistoryStore.getState().clearSession('session-1');

      const entries = useCompressionHistoryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].sessionId).toBe('session-2');
    });
  });

  describe('canUndo', () => {
    it('should return true when session has entries', () => {
      useCompressionHistoryStore.getState().addEntry(createMockEntry('entry-1', 'session-1'));

      expect(useCompressionHistoryStore.getState().canUndo('session-1')).toBe(true);
    });

    it('should return false when session has no entries', () => {
      expect(useCompressionHistoryStore.getState().canUndo('session-1')).toBe(false);
    });

    it('should return false after clearing session', () => {
      useCompressionHistoryStore.getState().addEntry(createMockEntry('entry-1', 'session-1'));
      useCompressionHistoryStore.getState().clearSession('session-1');

      expect(useCompressionHistoryStore.getState().canUndo('session-1')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all entries', () => {
      const store = useCompressionHistoryStore.getState();

      store.addEntry(createMockEntry('entry-1', 'session-1'));
      store.addEntry(createMockEntry('entry-2', 'session-2'));

      useCompressionHistoryStore.getState().reset();

      expect(useCompressionHistoryStore.getState().entries).toEqual([]);
    });
  });

  describe('compressed message data integrity', () => {
    it('should preserve compressed message metadata', () => {
      const entry = createMockEntry('entry-1', 'session-1');
      useCompressionHistoryStore.getState().addEntry(entry);

      const stored = useCompressionHistoryStore.getState().getLatestEntry('session-1');
      expect(stored).toBeDefined();
      expect(stored!.compressedMessages).toHaveLength(2);
      expect(stored!.compressedMessages[0].id).toBe('msg-1');
      expect(stored!.compressedMessages[0].role).toBe('user');
      expect(stored!.compressedMessages[0].content).toBe('Hello');
      expect(stored!.compressedMessages[1].id).toBe('msg-2');
      expect(stored!.compressedMessages[1].role).toBe('assistant');
      expect(stored!.compressedMessages[1].content).toBe('Hi!');
    });

    it('should preserve token counts', () => {
      const entry = createMockEntry('entry-1', 'session-1');
      useCompressionHistoryStore.getState().addEntry(entry);

      const stored = useCompressionHistoryStore.getState().getLatestEntry('session-1');
      expect(stored!.tokensBefore).toBe(1000);
      expect(stored!.tokensAfter).toBe(500);
    });
  });
});
