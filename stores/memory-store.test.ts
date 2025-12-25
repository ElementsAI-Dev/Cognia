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
});
