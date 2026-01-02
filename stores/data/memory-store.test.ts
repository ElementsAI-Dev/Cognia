/**
 * Tests for Memory Store
 */

import { act } from '@testing-library/react';
import { useMemoryStore } from './memory-store';

describe('useMemoryStore', () => {
  beforeEach(() => {
    useMemoryStore.setState({
      memories: [],
      settings: {
        enabled: true,
        maxMemories: 100,
        autoInfer: true,
        injectInSystemPrompt: true,
        enableSemanticSearch: false,
        semanticSearchThreshold: 0.7,
        autoDecay: false,
        decayDays: 30,
        autoCleanup: false,
        cleanupDays: 60,
        defaultScope: 'global',
        conflictDetection: true,
        conflictThreshold: 0.7,
        provider: 'local',
        enablePipeline: true,
        pipelineRecentMessages: 5,
        enableRollingSummary: false,
      },
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useMemoryStore.getState();
      expect(state.memories).toEqual([]);
      expect(state.settings.enabled).toBe(true);
    });
  });

  describe('createMemory', () => {
    it('should create a memory', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'preference',
          content: 'I prefer dark mode',
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories).toHaveLength(1);
      expect(memory!.type).toBe('preference');
      expect(memory!.content).toBe('I prefer dark mode');
      expect(memory!.enabled).toBe(true);
      expect(memory!.useCount).toBe(0);
    });

    it('should create memory with all options', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'My name is John',
          source: 'explicit',
          category: 'personal',
          tags: ['name', 'identity'],
        });
      });

      expect(memory!.source).toBe('explicit');
      expect(memory!.category).toBe('personal');
      expect(memory!.tags).toEqual(['name', 'identity']);
    });

    it('should respect maxMemories limit', () => {
      useMemoryStore.setState({
        ...useMemoryStore.getState(),
        settings: { ...useMemoryStore.getState().settings, maxMemories: 3 },
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          useMemoryStore.getState().createMemory({
            type: 'fact',
            content: `Memory ${i}`,
          });
        }
      });

      expect(useMemoryStore.getState().memories).toHaveLength(3);
    });
  });

  describe('updateMemory', () => {
    it('should update memory', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'preference',
          content: 'Original',
        });
      });

      act(() => {
        useMemoryStore.getState().updateMemory(memory!.id, { content: 'Updated' });
      });

      expect(useMemoryStore.getState().memories[0].content).toBe('Updated');
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Test',
        });
      });

      act(() => {
        useMemoryStore.getState().deleteMemory(memory!.id);
      });

      expect(useMemoryStore.getState().memories).toHaveLength(0);
    });
  });

  describe('clearAllMemories', () => {
    it('should clear all memories', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'A' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'B' });
      });

      act(() => {
        useMemoryStore.getState().clearAllMemories();
      });

      expect(useMemoryStore.getState().memories).toHaveLength(0);
    });
  });

  describe('useMemory', () => {
    it('should track memory usage', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Test',
        });
      });

      expect(useMemoryStore.getState().memories[0].useCount).toBe(0);

      act(() => {
        useMemoryStore.getState().useMemory(memory!.id);
      });

      expect(useMemoryStore.getState().memories[0].useCount).toBe(1);
      expect(useMemoryStore.getState().memories[0].lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'Pref 1' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Fact 1' });
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'Pref 2' });
      });
    });

    it('should get memory by id', () => {
      const id = useMemoryStore.getState().memories[0].id;
      expect(useMemoryStore.getState().getMemory(id)).toBeDefined();
      expect(useMemoryStore.getState().getMemory('non-existent')).toBeUndefined();
    });

    it('should get memories by type', () => {
      const preferences = useMemoryStore.getState().getMemoriesByType('preference');
      expect(preferences).toHaveLength(2);
    });

    it('should get enabled memories', () => {
      const id = useMemoryStore.getState().memories[0].id;
      act(() => {
        useMemoryStore.getState().updateMemory(id, { enabled: false });
      });

      const enabled = useMemoryStore.getState().getEnabledMemories();
      expect(enabled).toHaveLength(2);
    });

    it('should search memories', () => {
      const results = useMemoryStore.getState().searchMemories('Pref');
      expect(results).toHaveLength(2);
    });
  });

  describe('getMemoriesForPrompt', () => {
    it('should return empty string when no memories', () => {
      expect(useMemoryStore.getState().getMemoriesForPrompt()).toBe('');
    });

    it('should return empty string when disabled', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Test' });
        useMemoryStore.getState().updateSettings({ enabled: false });
      });

      expect(useMemoryStore.getState().getMemoriesForPrompt()).toBe('');
    });

    it('should format memories for prompt', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'I like TypeScript' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'I am a developer' });
      });

      const prompt = useMemoryStore.getState().getMemoriesForPrompt();
      expect(prompt).toContain('Memory');
      expect(prompt).toContain('I like TypeScript');
      expect(prompt).toContain('I am a developer');
    });
  });

  describe('detectMemoryFromText', () => {
    it('should detect preference patterns', () => {
      const result = useMemoryStore.getState().detectMemoryFromText('I prefer TypeScript over JavaScript');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('preference');
    });

    it('should detect fact patterns', () => {
      const result = useMemoryStore.getState().detectMemoryFromText('My name is John');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('fact');
    });

    it('should detect explicit remember commands', () => {
      const result = useMemoryStore.getState().detectMemoryFromText('Remember that I work from home');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('instruction');
    });

    it('should return null for non-matching text', () => {
      const result = useMemoryStore.getState().detectMemoryFromText('Hello, how are you?');
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update settings', () => {
      act(() => {
        useMemoryStore.getState().updateSettings({ maxMemories: 50 });
      });

      expect(useMemoryStore.getState().settings.maxMemories).toBe(50);
    });
  });

  describe('togglePin', () => {
    it('should toggle memory pinned state', () => {
      let memory: { id: string } | undefined;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Test memory',
        });
      });

      expect(useMemoryStore.getState().memories[0].pinned).toBeFalsy();

      act(() => {
        useMemoryStore.getState().togglePin(memory!.id);
      });

      expect(useMemoryStore.getState().memories[0].pinned).toBe(true);

      act(() => {
        useMemoryStore.getState().togglePin(memory!.id);
      });

      expect(useMemoryStore.getState().memories[0].pinned).toBe(false);
    });
  });

  describe('setPriority', () => {
    it('should set memory priority', () => {
      let memory: { id: string } | undefined;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Test memory',
        });
      });

      act(() => {
        useMemoryStore.getState().setPriority(memory!.id, 8);
      });

      expect(useMemoryStore.getState().memories[0].priority).toBe(8);
    });

    it('should clamp priority between 0 and 10', () => {
      let memory: { id: string } | undefined;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Test memory',
        });
      });

      act(() => {
        useMemoryStore.getState().setPriority(memory!.id, 15);
      });
      expect(useMemoryStore.getState().memories[0].priority).toBe(10);

      act(() => {
        useMemoryStore.getState().setPriority(memory!.id, -5);
      });
      expect(useMemoryStore.getState().memories[0].priority).toBe(0);
    });
  });

  describe('getPinnedMemories', () => {
    it('should return only pinned and enabled memories', () => {
      act(() => {
        const m1 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 1' });
        const m2 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 2' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 3' });
        
        useMemoryStore.getState().togglePin(m1.id);
        useMemoryStore.getState().togglePin(m2.id);
        useMemoryStore.getState().updateMemory(m2.id, { enabled: false });
      });

      const pinned = useMemoryStore.getState().getPinnedMemories();
      expect(pinned).toHaveLength(1);
      expect(pinned[0].content).toBe('Memory 1');
    });
  });

  describe('findSimilarMemories', () => {
    it('should find memories with similar content', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'I prefer TypeScript for web development' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'I work with Python data science' });
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'TypeScript is great for large projects' });
      });

      const similar = useMemoryStore.getState().findSimilarMemories('TypeScript development projects');
      expect(similar.length).toBeGreaterThan(0);
      expect(similar.some(m => m.content.includes('TypeScript'))).toBe(true);
    });

    it('should return empty array for short content', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Some content' });
      });

      const similar = useMemoryStore.getState().findSimilarMemories('hi');
      expect(similar).toHaveLength(0);
    });
  });

  describe('getMemoryStats', () => {
    it('should return correct statistics including pinned count', () => {
      act(() => {
        const m1 = useMemoryStore.getState().createMemory({ type: 'preference', content: 'Pref 1' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Fact 1' });
        const m3 = useMemoryStore.getState().createMemory({ type: 'instruction', content: 'Instruction 1' });
        
        useMemoryStore.getState().togglePin(m1.id);
        useMemoryStore.getState().togglePin(m3.id);
        useMemoryStore.getState().updateMemory(m3.id, { enabled: false });
      });

      const stats = useMemoryStore.getState().getMemoryStats();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.pinned).toBe(2);
      expect(stats.byType.preference).toBe(1);
      expect(stats.byType.fact).toBe(1);
      expect(stats.byType.instruction).toBe(1);
    });
  });

  describe('getAllTags', () => {
    it('should return all unique tags sorted', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'A', tags: ['coding', 'typescript'] });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'B', tags: ['python', 'coding'] });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'C', tags: ['react'] });
      });

      const tags = useMemoryStore.getState().getAllTags();
      expect(tags).toEqual(['coding', 'python', 'react', 'typescript']);
    });
  });

  describe('exportMemories', () => {
    it('should export memories as JSON string', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'preference', content: 'Test preference' });
      });

      const exported = useMemoryStore.getState().exportMemories();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.settings).toBeDefined();
      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].content).toBe('Test preference');
    });
  });

  describe('importMemories', () => {
    it('should import memories from valid JSON', () => {
      const importData = JSON.stringify({
        version: '1.0',
        memories: [
          { type: 'fact', content: 'Imported fact 1' },
          { type: 'preference', content: 'Imported preference' },
        ],
      });

      let result: { success: boolean; imported: number; errors: string[] } | undefined;
      act(() => {
        result = useMemoryStore.getState().importMemories(importData);
      });

      expect(result!.success).toBe(true);
      expect(result!.imported).toBe(2);
      expect(useMemoryStore.getState().memories).toHaveLength(2);
    });

    it('should skip duplicate memories', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Existing memory' });
      });

      const importData = JSON.stringify({
        memories: [
          { type: 'fact', content: 'Existing memory' },
          { type: 'fact', content: 'New memory' },
        ],
      });

      let result: { success: boolean; imported: number; errors: string[] } | undefined;
      act(() => {
        result = useMemoryStore.getState().importMemories(importData);
      });

      expect(result!.imported).toBe(1);
      expect(result!.errors.length).toBeGreaterThan(0);
      expect(useMemoryStore.getState().memories).toHaveLength(2);
    });

    it('should handle invalid JSON', () => {
      let result: { success: boolean; imported: number; errors: string[] } | undefined;
      act(() => {
        result = useMemoryStore.getState().importMemories('invalid json');
      });

      expect(result!.success).toBe(false);
      expect(result!.errors[0]).toContain('Parse error');
    });

    it('should handle missing memories array', () => {
      let result: { success: boolean; imported: number; errors: string[] } | undefined;
      act(() => {
        result = useMemoryStore.getState().importMemories('{}');
      });

      expect(result!.success).toBe(false);
      expect(result!.errors[0]).toContain('Invalid format');
    });
  });

  describe('getMemoriesForPrompt with sorting', () => {
    it('should sort memories by pinned, then priority, then useCount', () => {
      act(() => {
        const m1 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Low priority' });
        const m2 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'High priority' });
        const m3 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Pinned memory' });
        
        useMemoryStore.getState().setPriority(m1.id, 2);
        useMemoryStore.getState().setPriority(m2.id, 8);
        useMemoryStore.getState().togglePin(m3.id);
      });

      const prompt = useMemoryStore.getState().getMemoriesForPrompt();
      
      // Pinned memory should appear first
      expect(prompt.indexOf('Pinned memory')).toBeLessThan(prompt.indexOf('High priority'));
      expect(prompt.indexOf('High priority')).toBeLessThan(prompt.indexOf('Low priority'));
    });
  });

  describe('getMemoriesBySession', () => {
    it('should return memories for specific session and global memories', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Global memory', scope: 'global' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Session A memory', sessionId: 'session-a', scope: 'session' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Session B memory', sessionId: 'session-b', scope: 'session' });
      });

      const sessionAMemories = useMemoryStore.getState().getMemoriesBySession('session-a');
      
      expect(sessionAMemories).toHaveLength(2);
      expect(sessionAMemories.some(m => m.content === 'Global memory')).toBe(true);
      expect(sessionAMemories.some(m => m.content === 'Session A memory')).toBe(true);
      expect(sessionAMemories.some(m => m.content === 'Session B memory')).toBe(false);
    });

    it('should return memories without sessionId as accessible to all sessions', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'No session memory' });
      });

      const memories = useMemoryStore.getState().getMemoriesBySession('any-session');
      expect(memories).toHaveLength(1);
    });
  });

  describe('getMemoriesByScope', () => {
    it('should filter memories by scope', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Global 1', scope: 'global' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Global 2', scope: 'global' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Session 1', scope: 'session' });
      });

      const globalMemories = useMemoryStore.getState().getMemoriesByScope('global');
      const sessionMemories = useMemoryStore.getState().getMemoriesByScope('session');

      expect(globalMemories).toHaveLength(2);
      expect(sessionMemories).toHaveLength(1);
    });

    it('should treat memories without scope as global', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'No scope memory' });
      });

      const globalMemories = useMemoryStore.getState().getMemoriesByScope('global');
      expect(globalMemories).toHaveLength(1);
    });
  });

  describe('getExpiringMemories', () => {
    it('should return memories expiring within specified days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      
      const later = new Date();
      later.setDate(later.getDate() + 30);

      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Expiring soon', expiresAt: soon });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Expiring later', expiresAt: later });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'No expiration' });
      });

      const expiring = useMemoryStore.getState().getExpiringMemories(7);
      
      expect(expiring).toHaveLength(1);
      expect(expiring[0].content).toBe('Expiring soon');
    });

    it('should not include memories without expiresAt', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'No expiration' });
      });

      const expiring = useMemoryStore.getState().getExpiringMemories(365);
      expect(expiring).toHaveLength(0);
    });
  });

  describe('batchDelete', () => {
    it('should delete multiple memories at once', () => {
      let ids: string[] = [];
      act(() => {
        ids = [
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 1' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 2' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 3' }).id,
        ];
      });

      expect(useMemoryStore.getState().memories).toHaveLength(3);

      let deleted: number = 0;
      act(() => {
        deleted = useMemoryStore.getState().batchDelete([ids[0], ids[1]]);
      });

      expect(deleted).toBe(2);
      expect(useMemoryStore.getState().memories).toHaveLength(1);
      expect(useMemoryStore.getState().memories[0].content).toBe('Memory 3');
    });

    it('should return 0 for non-existent ids', () => {
      let deleted: number = 0;
      act(() => {
        deleted = useMemoryStore.getState().batchDelete(['non-existent-1', 'non-existent-2']);
      });

      expect(deleted).toBe(0);
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple memories at once', () => {
      let ids: string[] = [];
      act(() => {
        ids = [
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 1' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 2' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 3' }).id,
        ];
      });

      let updated: number = 0;
      act(() => {
        updated = useMemoryStore.getState().batchUpdate([ids[0], ids[1]], { category: 'test-category' });
      });

      expect(updated).toBe(2);
      
      const memories = useMemoryStore.getState().memories;
      expect(memories.filter(m => m.category === 'test-category')).toHaveLength(2);
      expect(memories.find(m => m.id === ids[2])?.category).toBeUndefined();
    });
  });

  describe('batchSetEnabled', () => {
    it('should enable/disable multiple memories at once', () => {
      let ids: string[] = [];
      act(() => {
        ids = [
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 1' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 2' }).id,
          useMemoryStore.getState().createMemory({ type: 'fact', content: 'Memory 3' }).id,
        ];
      });

      // All should be enabled initially
      expect(useMemoryStore.getState().memories.every(m => m.enabled)).toBe(true);

      let updated: number = 0;
      act(() => {
        updated = useMemoryStore.getState().batchSetEnabled([ids[0], ids[1]], false);
      });

      expect(updated).toBe(2);
      
      const memories = useMemoryStore.getState().memories;
      expect(memories.filter(m => !m.enabled)).toHaveLength(2);
      expect(memories.find(m => m.id === ids[2])?.enabled).toBe(true);
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired memories', () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      
      const future = new Date();
      future.setDate(future.getDate() + 10);

      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Expired', expiresAt: past });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Not expired', expiresAt: future });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'No expiration' });
      });

      expect(useMemoryStore.getState().memories).toHaveLength(3);

      let cleaned: number = 0;
      act(() => {
        cleaned = useMemoryStore.getState().cleanupExpired();
      });

      expect(cleaned).toBe(1);
      expect(useMemoryStore.getState().memories).toHaveLength(2);
      expect(useMemoryStore.getState().memories.some(m => m.content === 'Expired')).toBe(false);
    });
  });

  describe('cleanupOldUnused', () => {
    it('should remove old unused memories', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      // Create memories with different lastUsedAt dates
      act(() => {
        const m1 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Old unused' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Recent' });
        const m3 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Old but pinned' });
        
        // Manually set lastUsedAt for testing
        useMemoryStore.setState({
          memories: useMemoryStore.getState().memories.map(m => {
            if (m.id === m1.id) return { ...m, lastUsedAt: oldDate, useCount: 0 };
            if (m.id === m3.id) {
              return { ...m, lastUsedAt: oldDate, useCount: 0, pinned: true };
            }
            return m;
          }),
        });
      });

      let cleaned: number = 0;
      act(() => {
        cleaned = useMemoryStore.getState().cleanupOldUnused(30);
      });

      expect(cleaned).toBe(1);
      expect(useMemoryStore.getState().memories).toHaveLength(2);
      expect(useMemoryStore.getState().memories.some(m => m.content === 'Old unused')).toBe(false);
      expect(useMemoryStore.getState().memories.some(m => m.content === 'Old but pinned')).toBe(true);
    });

    it('should not remove pinned memories even if old', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      act(() => {
        const m = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Old pinned' });
        useMemoryStore.getState().togglePin(m.id);
        useMemoryStore.setState({
          memories: useMemoryStore.getState().memories.map(mem => 
            mem.id === m.id ? { ...mem, lastUsedAt: oldDate, useCount: 0 } : mem
          ),
        });
      });

      let cleaned: number = 0;
      act(() => {
        cleaned = useMemoryStore.getState().cleanupOldUnused(30);
      });

      expect(cleaned).toBe(0);
      expect(useMemoryStore.getState().memories).toHaveLength(1);
    });
  });

  describe('extended getMemoryStats', () => {
    it('should include byScope statistics', () => {
      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Global 1', scope: 'global' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Global 2', scope: 'global' });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Session 1', scope: 'session' });
      });

      const stats = useMemoryStore.getState().getMemoryStats();
      
      expect(stats.byScope.global).toBe(2);
      expect(stats.byScope.session).toBe(1);
    });

    it('should count expiring soon memories', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);

      act(() => {
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Expiring', expiresAt: soon });
        useMemoryStore.getState().createMemory({ type: 'fact', content: 'Not expiring' });
      });

      const stats = useMemoryStore.getState().getMemoryStats();
      expect(stats.expiringSoon).toBe(1);
    });

    it('should count recently used memories', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);

      act(() => {
        const m1 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Recent' });
        const m2 = useMemoryStore.getState().createMemory({ type: 'fact', content: 'Old' });
        
        // Set m2 as old
        useMemoryStore.setState({
          memories: useMemoryStore.getState().memories.map(m =>
            m.id === m2.id ? { ...m, lastUsedAt: oldDate } : m
          ),
        });
        
        // m1 is already recent (just created)
        void m1;
      });

      const stats = useMemoryStore.getState().getMemoryStats();
      expect(stats.recentlyUsed).toBe(1);
    });
  });

  describe('createMemory with extended options', () => {
    it('should create memory with scope and sessionId', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Session memory',
          scope: 'session',
          sessionId: 'test-session',
        });
      });

      expect(memory!.scope).toBe('session');
      expect(memory!.sessionId).toBe('test-session');
    });

    it('should create memory with expiresAt', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Expiring memory',
          expiresAt,
        });
      });

      expect(memory!.expiresAt).toEqual(expiresAt);
    });

    it('should create memory with metadata', () => {
      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Memory with metadata',
          metadata: { source: 'test', confidence: 0.95 },
        });
      });

      expect(memory!.metadata).toEqual({ source: 'test', confidence: 0.95 });
    });

    it('should use default scope from settings', () => {
      act(() => {
        useMemoryStore.setState({
          settings: { ...useMemoryStore.getState().settings, defaultScope: 'session' },
        });
      });

      let memory;
      act(() => {
        memory = useMemoryStore.getState().createMemory({
          type: 'fact',
          content: 'Memory with default scope',
        });
      });

      expect(memory!.scope).toBe('session');
    });
  });
});
