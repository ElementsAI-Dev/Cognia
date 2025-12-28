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
});
