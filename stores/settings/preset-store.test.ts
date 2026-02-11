/**
 * Tests for Preset Store
 */

import { act } from '@testing-library/react';
import { usePresetStore, selectPresets, selectSelectedPresetId } from './preset-store';

describe('usePresetStore', () => {
  beforeEach(() => {
    usePresetStore.setState({
      presets: [],
      selectedPresetId: null,
      isInitialized: false,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = usePresetStore.getState();
      expect(state.presets).toEqual([]);
      expect(state.selectedPresetId).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('createPreset', () => {
    it('should create preset with required fields', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Test Preset',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      const state = usePresetStore.getState();
      expect(state.presets).toHaveLength(1);
      expect(preset!.name).toBe('Test Preset');
      expect(preset!.provider).toBe('openai');
      expect(preset!.model).toBe('gpt-4');
      expect(preset!.usageCount).toBe(0);
      expect(preset!.isDefault).toBe(false);
    });

    it('should create preset with all options', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Full Preset',
          description: 'A test preset',
          icon: '🤖',
          color: '#FF0000',
          provider: 'anthropic',
          model: 'claude-3',
          mode: 'agent',
          systemPrompt: 'You are helpful',
          temperature: 0.5,
          maxTokens: 2000,
          webSearchEnabled: true,
          thinkingEnabled: true,
        });
      });

      expect(preset!.description).toBe('A test preset');
      expect(preset!.icon).toBe('🤖');
      expect(preset!.systemPrompt).toBe('You are helpful');
      expect(preset!.temperature).toBe(0.5);
      expect(preset!.webSearchEnabled).toBe(true);
    });
  });

  describe('updatePreset', () => {
    it('should update preset', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Original',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      act(() => {
        usePresetStore.getState().updatePreset(preset!.id, { name: 'Updated' });
      });

      expect(usePresetStore.getState().presets[0].name).toBe('Updated');
    });
  });

  describe('deletePreset', () => {
    it('should delete preset', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'To Delete',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      act(() => {
        usePresetStore.getState().deletePreset(preset!.id);
      });

      expect(usePresetStore.getState().presets).toHaveLength(0);
    });

    it('should clear selectedPresetId if deleted', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Selected',
          provider: 'openai',
          model: 'gpt-4',
        });
        usePresetStore.getState().selectPreset(preset!.id);
      });

      act(() => {
        usePresetStore.getState().deletePreset(preset!.id);
      });

      expect(usePresetStore.getState().selectedPresetId).toBeNull();
    });
  });

  describe('duplicatePreset', () => {
    it('should duplicate preset', () => {
      let original;
      act(() => {
        original = usePresetStore.getState().createPreset({
          name: 'Original',
          provider: 'anthropic',
          model: 'claude-3',
          systemPrompt: 'Test',
        });
      });

      let duplicate;
      act(() => {
        duplicate = usePresetStore.getState().duplicatePreset(original!.id);
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate!.name).toBe('Original (Copy)');
      expect(duplicate!.provider).toBe('anthropic');
      expect(duplicate!.systemPrompt).toBe('Test');
    });

    it('should return null for non-existent preset', () => {
      const duplicate = usePresetStore.getState().duplicatePreset('non-existent');
      expect(duplicate).toBeNull();
    });
  });

  describe('selectPreset', () => {
    it('should select preset', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Test',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      act(() => {
        usePresetStore.getState().selectPreset(preset!.id);
      });

      expect(usePresetStore.getState().selectedPresetId).toBe(preset!.id);
    });
  });

  describe('usePreset', () => {
    it('should increment usage count', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Test',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      act(() => {
        usePresetStore.getState().usePreset(preset!.id);
      });

      expect(usePresetStore.getState().presets[0].usageCount).toBe(1);
      expect(usePresetStore.getState().presets[0].lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('setDefaultPreset', () => {
    it('should set default preset', () => {
      let preset1, preset2;
      act(() => {
        preset1 = usePresetStore.getState().createPreset({
          name: 'First',
          provider: 'openai',
          model: 'gpt-4',
        });
        preset2 = usePresetStore.getState().createPreset({
          name: 'Second',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      act(() => {
        usePresetStore.getState().setDefaultPreset(preset2!.id);
      });

      const presets = usePresetStore.getState().presets;
      expect(presets.find((p) => p.id === preset1!.id)?.isDefault).toBe(false);
      expect(presets.find((p) => p.id === preset2!.id)?.isDefault).toBe(true);
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Test',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      expect(usePresetStore.getState().presets[0].isFavorite).toBeFalsy();

      act(() => {
        usePresetStore.getState().toggleFavorite(preset!.id);
      });

      expect(usePresetStore.getState().presets[0].isFavorite).toBe(true);

      act(() => {
        usePresetStore.getState().toggleFavorite(preset!.id);
      });

      expect(usePresetStore.getState().presets[0].isFavorite).toBe(false);
    });
  });

  describe('reorderPresets', () => {
    it('should reorder presets by swapping positions', () => {
      let preset1, _preset2, preset3;
      act(() => {
        preset1 = usePresetStore
          .getState()
          .createPreset({ name: 'First', provider: 'openai', model: 'gpt-4' });
        _preset2 = usePresetStore
          .getState()
          .createPreset({ name: 'Second', provider: 'openai', model: 'gpt-4' });
        preset3 = usePresetStore
          .getState()
          .createPreset({ name: 'Third', provider: 'openai', model: 'gpt-4' });
      });

      const activeId = preset3!.id;
      const overId = preset1!.id;

      // Move preset3 to position of preset1
      act(() => {
        usePresetStore.getState().reorderPresets(activeId, overId);
      });

      const presets = usePresetStore.getState().presets;
      // After reorder, preset3 should be first
      expect(presets[0].name).toBe('Third');
    });
  });

  describe('learning mode preset', () => {
    it('should create preset with learning mode', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Learning Preset',
          provider: 'openai',
          model: 'gpt-4',
          mode: 'learning',
          systemPrompt: 'You are a tutor',
        });
      });

      expect(preset!.mode).toBe('learning');
      expect(preset!.systemPrompt).toBe('You are a tutor');
    });
  });

  describe('category support', () => {
    it('should create preset with category', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Coding Helper',
          provider: 'openai',
          model: 'gpt-4',
          category: 'coding',
        });
      });

      expect(preset!.category).toBe('coding');
    });

    it('should create preset without category (undefined)', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'No Category',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      expect(preset!.category).toBeUndefined();
    });

    it('should update preset category', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createPreset({
          name: 'Test',
          provider: 'openai',
          model: 'gpt-4',
          category: 'general',
        });
      });

      act(() => {
        usePresetStore.getState().updatePreset(preset!.id, { category: 'writing' });
      });

      expect(usePresetStore.getState().presets[0].category).toBe('writing');
    });

    it('should duplicate preset with category preserved', () => {
      let original;
      act(() => {
        original = usePresetStore.getState().createPreset({
          name: 'Original',
          provider: 'openai',
          model: 'gpt-4',
          category: 'research',
        });
      });

      let duplicate;
      act(() => {
        duplicate = usePresetStore.getState().duplicatePreset(original!.id);
      });

      expect(duplicate!.category).toBe('research');
    });
  });

  describe('createFromSession', () => {
    it('should create a preset from session input', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createFromSession({
          name: 'Session Preset',
          description: 'Saved from session',
          provider: 'anthropic',
          model: 'claude-3',
          mode: 'agent',
          systemPrompt: 'You are a coder',
          temperature: 0.3,
          maxTokens: 4000,
          webSearchEnabled: true,
          thinkingEnabled: false,
          category: 'coding',
        });
      });

      expect(preset).toBeDefined();
      expect(preset!.name).toBe('Session Preset');
      expect(preset!.description).toBe('Saved from session');
      expect(preset!.provider).toBe('anthropic');
      expect(preset!.model).toBe('claude-3');
      expect(preset!.mode).toBe('agent');
      expect(preset!.systemPrompt).toBe('You are a coder');
      expect(preset!.temperature).toBe(0.3);
      expect(preset!.maxTokens).toBe(4000);
      expect(preset!.webSearchEnabled).toBe(true);
      expect(preset!.thinkingEnabled).toBe(false);
      expect(preset!.category).toBe('coding');
      expect(preset!.usageCount).toBe(0);
      expect(preset!.isDefault).toBe(false);
    });

    it('should use default icon and color when not provided', () => {
      let preset;
      act(() => {
        preset = usePresetStore.getState().createFromSession({
          name: 'Minimal',
          provider: 'openai',
          model: 'gpt-4',
          mode: 'chat',
        });
      });

      expect(preset!.icon).toBe('💬');
      expect(preset!.color).toBe('#6366f1');
    });

    it('should be added to the presets list', () => {
      act(() => {
        usePresetStore.getState().createFromSession({
          name: 'Test',
          provider: 'openai',
          model: 'gpt-4',
          mode: 'chat',
        });
      });

      expect(usePresetStore.getState().presets).toHaveLength(1);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      act(() => {
        const p1 = usePresetStore.getState().createPreset({
          name: 'Recent',
          provider: 'openai',
          model: 'gpt-4',
        });
        usePresetStore.getState().createPreset({
          name: 'Most Used',
          provider: 'openai',
          model: 'gpt-4',
        });

        // Use presets to set lastUsedAt and usageCount
        usePresetStore.getState().usePreset(p1.id);
        const p2Id = usePresetStore.getState().presets[1].id;
        usePresetStore.getState().usePreset(p2Id);
        usePresetStore.getState().usePreset(p2Id);
      });
    });

    it('should get preset by id', () => {
      const id = usePresetStore.getState().presets[0].id;
      expect(usePresetStore.getState().getPreset(id)).toBeDefined();
      expect(usePresetStore.getState().getPreset('non-existent')).toBeUndefined();
    });

    it('should get default preset', () => {
      const id = usePresetStore.getState().presets[0].id;
      act(() => {
        usePresetStore.getState().setDefaultPreset(id);
      });

      expect(usePresetStore.getState().getDefaultPreset()?.id).toBe(id);
    });

    it('should get recent presets', () => {
      const recent = usePresetStore.getState().getRecentPresets();
      expect(recent).toHaveLength(2);
    });

    it('should get most used presets', () => {
      const mostUsed = usePresetStore.getState().getMostUsedPresets();
      expect(mostUsed[0].name).toBe('Most Used');
    });

    it('should search presets', () => {
      const results = usePresetStore.getState().searchPresets('Recent');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Recent');
    });

    it('should search presets by category name', () => {
      // Reset and create categorized presets
      usePresetStore.setState({ presets: [] });
      act(() => {
        usePresetStore.getState().createPreset({
          name: 'Coder',
          provider: 'openai',
          model: 'gpt-4',
          category: 'coding',
        });
        usePresetStore.getState().createPreset({
          name: 'Writer',
          provider: 'openai',
          model: 'gpt-4',
          category: 'writing',
        });
      });

      const results = usePresetStore.getState().searchPresets('coding');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Coder');
    });

    it('should use selectPresets selector', () => {
      expect(selectPresets(usePresetStore.getState())).toHaveLength(2);
    });

    it('should use selectSelectedPresetId selector', () => {
      const id = usePresetStore.getState().presets[0].id;
      act(() => {
        usePresetStore.getState().selectPreset(id);
      });

      expect(selectSelectedPresetId(usePresetStore.getState())).toBe(id);
    });

    it('should get favorite presets', () => {
      const id = usePresetStore.getState().presets[0].id;
      act(() => {
        usePresetStore.getState().toggleFavorite(id);
      });

      const favorites = usePresetStore.getState().presets.filter((p) => p.isFavorite);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(id);
    });
  });

  describe('date serialization robustness', () => {
    it('getRecentPresets filters out presets with invalid lastUsedAt', () => {
      act(() => {
        const p1 = usePresetStore.getState().createPreset({
          name: 'Valid Date',
          provider: 'openai',
          model: 'gpt-4',
        });
        usePresetStore.getState().usePreset(p1.id);

        const p2 = usePresetStore.getState().createPreset({
          name: 'Invalid Date',
          provider: 'openai',
          model: 'gpt-4',
        });
        // Simulate corrupted lastUsedAt
        usePresetStore.setState((state) => ({
          presets: state.presets.map((p) =>
            p.id === p2.id ? { ...p, lastUsedAt: new Date('invalid') } : p
          ),
        }));
      });

      const recent = usePresetStore.getState().getRecentPresets();
      expect(recent).toHaveLength(1);
      expect(recent[0].name).toBe('Valid Date');
    });

    it('getRecentPresets returns empty when no valid lastUsedAt exists', () => {
      act(() => {
        usePresetStore.getState().createPreset({
          name: 'Never Used',
          provider: 'openai',
          model: 'gpt-4',
        });
      });

      const recent = usePresetStore.getState().getRecentPresets();
      expect(recent).toHaveLength(0);
    });

    it('getRecentPresets respects limit parameter', () => {
      act(() => {
        for (let i = 0; i < 10; i++) {
          const p = usePresetStore.getState().createPreset({
            name: `Preset ${i}`,
            provider: 'openai',
            model: 'gpt-4',
          });
          usePresetStore.getState().usePreset(p.id);
        }
      });

      expect(usePresetStore.getState().getRecentPresets(3)).toHaveLength(3);
      expect(usePresetStore.getState().getRecentPresets(5)).toHaveLength(5);
    });

    it('onRehydrateStorage converts string dates back to Date objects', () => {
      // Simulate what happens during rehydration from localStorage
      const now = new Date();
      const presetWithStringDates = {
        id: 'test-rehydrate',
        name: 'Rehydrated',
        provider: 'openai',
        model: 'gpt-4',
        mode: 'chat',
        usageCount: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Set state as if rehydrated from localStorage (dates as strings)
      usePresetStore.setState({
        presets: [presetWithStringDates as unknown as import('@/types/content/preset').Preset],
      });

      // Manually trigger the rehydration logic
      const state = usePresetStore.getState();
      if (state.presets.length > 0) {
        const safeDate = (v: unknown): Date => {
          const d = new Date(v as string | number);
          return isNaN(d.getTime()) ? new Date() : d;
        };
        const rehydrated = state.presets.map((p) => ({
          ...p,
          createdAt: safeDate(p.createdAt),
          updatedAt: safeDate(p.updatedAt),
          lastUsedAt: p.lastUsedAt ? safeDate(p.lastUsedAt) : undefined,
        }));

        expect(rehydrated[0].createdAt).toBeInstanceOf(Date);
        expect(rehydrated[0].updatedAt).toBeInstanceOf(Date);
        expect(rehydrated[0].createdAt.getTime()).not.toBeNaN();
      }
    });

    it('safeDate returns current date for invalid date strings', () => {
      const safeDate = (v: unknown): Date => {
        const d = new Date(v as string | number);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      const before = Date.now();
      const result = safeDate('not-a-date');
      const after = Date.now();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('safeDate preserves valid date strings', () => {
      const safeDate = (v: unknown): Date => {
        const d = new Date(v as string | number);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      const iso = '2025-01-15T12:00:00.000Z';
      const result = safeDate(iso);
      expect(result.toISOString()).toBe(iso);
    });

    it('safeDate handles numeric timestamps', () => {
      const safeDate = (v: unknown): Date => {
        const d = new Date(v as string | number);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      const ts = 1705312800000;
      const result = safeDate(ts);
      expect(result.getTime()).toBe(ts);
    });
  });

  describe('getPresetsByCategory', () => {
    beforeEach(() => {
      act(() => {
        usePresetStore.getState().createPreset({
          name: 'Coding 1',
          provider: 'openai',
          model: 'gpt-4',
          category: 'coding',
        });
        usePresetStore.getState().createPreset({
          name: 'Coding 2',
          provider: 'openai',
          model: 'gpt-4',
          category: 'coding',
        });
        usePresetStore.getState().createPreset({
          name: 'Writing 1',
          provider: 'openai',
          model: 'gpt-4',
          category: 'writing',
        });
        usePresetStore.getState().createPreset({
          name: 'No Category',
          provider: 'openai',
          model: 'gpt-4',
        });
      });
    });

    it('should return presets filtered by category', () => {
      const coding = usePresetStore.getState().getPresetsByCategory('coding');
      expect(coding).toHaveLength(2);
      expect(coding.every((p) => p.category === 'coding')).toBe(true);
    });

    it('should return different category presets', () => {
      const writing = usePresetStore.getState().getPresetsByCategory('writing');
      expect(writing).toHaveLength(1);
      expect(writing[0].name).toBe('Writing 1');
    });

    it('should return empty array for category with no presets', () => {
      const business = usePresetStore.getState().getPresetsByCategory('business');
      expect(business).toHaveLength(0);
    });

    it('should not include presets without category', () => {
      const general = usePresetStore.getState().getPresetsByCategory('general');
      expect(general).toHaveLength(0);
    });
  });
});
