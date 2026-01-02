/**
 * Tests for Designer History Store
 */

import { act } from '@testing-library/react';
import { useDesignerHistoryStore } from './designer-history-store';

describe('useDesignerHistoryStore', () => {
  beforeEach(() => {
    useDesignerHistoryStore.setState({
      histories: {},
      activeDesignId: 'default',
      maxHistoryEntries: 50,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useDesignerHistoryStore.getState();
      expect(state.histories).toEqual({});
      expect(state.activeDesignId).toBe('default');
      expect(state.maxHistoryEntries).toBe(50);
    });
  });

  describe('addHistoryEntry', () => {
    it('should add history entry to default design', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Test</div>', 'Initial');
      });

      const history = useDesignerHistoryStore.getState().getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].code).toBe('<div>Test</div>');
      expect(history[0].label).toBe('Initial');
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add history entry to specific design', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<p>Custom</p>', 'Label', 'custom-design');
      });

      const history = useDesignerHistoryStore.getState().getHistory('custom-design');
      expect(history).toHaveLength(1);
      expect(history[0].code).toBe('<p>Custom</p>');
    });

    it('should add new entries at the beginning', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>First</div>');
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Second</div>');
      });

      const history = useDesignerHistoryStore.getState().getHistory();
      expect(history[0].code).toBe('<div>Second</div>');
      expect(history[1].code).toBe('<div>First</div>');
    });

    it('should not add duplicate consecutive entries', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Same</div>');
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Same</div>');
      });

      const history = useDesignerHistoryStore.getState().getHistory();
      expect(history).toHaveLength(1);
    });

    it('should limit history entries', () => {
      useDesignerHistoryStore.setState({
        ...useDesignerHistoryStore.getState(),
        maxHistoryEntries: 3,
      });

      act(() => {
        for (let i = 0; i < 5; i++) {
          useDesignerHistoryStore.getState().addHistoryEntry(`<div>Entry ${i}</div>`);
        }
      });

      const history = useDesignerHistoryStore.getState().getHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe('restoreFromHistory', () => {
    it('should restore entry from history', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>To Restore</div>');
      });

      const entryId = useDesignerHistoryStore.getState().getHistory()[0].id;
      const restored = useDesignerHistoryStore.getState().restoreFromHistory(entryId);

      expect(restored).not.toBeNull();
      expect(restored?.code).toBe('<div>To Restore</div>');
    });

    it('should return null for non-existent entry', () => {
      const restored = useDesignerHistoryStore.getState().restoreFromHistory('non-existent');
      expect(restored).toBeNull();
    });
  });

  describe('deleteHistoryEntry', () => {
    it('should delete history entry', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Entry 1</div>');
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Entry 2</div>');
      });

      const entryId = useDesignerHistoryStore.getState().getHistory()[0].id;

      act(() => {
        useDesignerHistoryStore.getState().deleteHistoryEntry(entryId);
      });

      expect(useDesignerHistoryStore.getState().getHistory()).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for default design', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Entry</div>');
      });

      act(() => {
        useDesignerHistoryStore.getState().clearHistory();
      });

      expect(useDesignerHistoryStore.getState().getHistory()).toHaveLength(0);
    });

    it('should clear history for specific design', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Default</div>');
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Custom</div>', undefined, 'custom');
      });

      act(() => {
        useDesignerHistoryStore.getState().clearHistory('custom');
      });

      expect(useDesignerHistoryStore.getState().getHistory()).toHaveLength(1);
      expect(useDesignerHistoryStore.getState().getHistory('custom')).toHaveLength(0);
    });
  });

  describe('setActiveDesignId', () => {
    it('should set active design id', () => {
      act(() => {
        useDesignerHistoryStore.getState().setActiveDesignId('new-design');
      });

      expect(useDesignerHistoryStore.getState().activeDesignId).toBe('new-design');
    });
  });

  describe('getHistoryEntry', () => {
    it('should get history entry by id', () => {
      act(() => {
        useDesignerHistoryStore.getState().addHistoryEntry('<div>Test</div>');
      });

      const entryId = useDesignerHistoryStore.getState().getHistory()[0].id;
      const entry = useDesignerHistoryStore.getState().getHistoryEntry(entryId);

      expect(entry).toBeDefined();
      expect(entry?.code).toBe('<div>Test</div>');
    });

    it('should return undefined for non-existent entry', () => {
      const entry = useDesignerHistoryStore.getState().getHistoryEntry('non-existent');
      expect(entry).toBeUndefined();
    });
  });
});
