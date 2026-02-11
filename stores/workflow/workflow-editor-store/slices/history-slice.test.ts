/**
 * Tests for history-slice.ts
 * Verifies deepClone usage in pushHistory/clearHistory
 */

import { deepClone } from '../utils/deep-clone';

// Mock deepClone to track calls
jest.mock('../utils/deep-clone', () => ({
  deepClone: jest.fn((value) => JSON.parse(JSON.stringify(value))),
}));

const mockedDeepClone = deepClone as jest.Mock;

// Minimal mock state helpers
const createMockWorkflow = (id = 'wf-1') => ({
  id,
  name: 'Test Workflow',
  nodes: [{ id: 'n1', data: { label: 'Node 1' } }],
  edges: [],
  settings: {},
});

describe('history-slice (deepClone integration)', () => {
  // We test the slice creator directly to avoid importing the full store
  // which has heavy transitive dependencies (dagre, etc.)
  let sliceActions: ReturnType<typeof import('../slices/history-slice').createHistorySlice>;
  let state: Record<string, unknown>;
  let createHistorySlice: typeof import('../slices/history-slice').createHistorySlice;

  beforeEach(async () => {
    jest.clearAllMocks();
    state = {
      currentWorkflow: createMockWorkflow(),
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
    };

    const mod = await import('./history-slice');
    createHistorySlice = mod.createHistorySlice;

    const set = (partial: Record<string, unknown>) => {
      Object.assign(state, typeof partial === 'function' ? partial(state) : partial);
    };
    const get = () => state as never;

    sliceActions = createHistorySlice(set as never, get as never, {} as never);
  });

  describe('pushHistory', () => {
    it('should call deepClone when pushing history', () => {
      sliceActions.pushHistory();

      expect(mockedDeepClone).toHaveBeenCalledTimes(1);
      expect(mockedDeepClone).toHaveBeenCalledWith(state.currentWorkflow);
    });

    it('should store a deep-cloned copy in history', () => {
      const originalWorkflow = state.currentWorkflow;
      sliceActions.pushHistory();

      const history = state.history as unknown[];
      expect(history).toHaveLength(1);
      // Should be equal in value but not the same reference
      expect(history[0]).toEqual(originalWorkflow);
      expect(history[0]).not.toBe(originalWorkflow);
    });

    it('should not push if currentWorkflow is null', () => {
      state.currentWorkflow = null;
      sliceActions.pushHistory();

      expect(mockedDeepClone).not.toHaveBeenCalled();
      expect(state.history).toEqual([]);
    });

    it('should truncate history at historyIndex + 1 before pushing', () => {
      // Simulate having 3 history entries and being at index 1 (undid once)
      const wf1 = createMockWorkflow('wf-1');
      const wf2 = createMockWorkflow('wf-2');
      const wf3 = createMockWorkflow('wf-3');
      state.history = [wf1, wf2, wf3];
      state.historyIndex = 1;

      sliceActions.pushHistory();

      const history = state.history as unknown[];
      // Should have kept wf1, wf2, then the new clone (wf3 discarded)
      expect(history).toHaveLength(3);
    });

    it('should respect maxHistorySize', () => {
      state.maxHistorySize = 3;
      // Fill history to max
      for (let i = 0; i < 5; i++) {
        state.currentWorkflow = createMockWorkflow(`wf-${i}`);
        sliceActions.pushHistory();
      }

      const history = state.history as unknown[];
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('clearHistory', () => {
    it('should call deepClone when clearing with a current workflow', () => {
      sliceActions.clearHistory();

      expect(mockedDeepClone).toHaveBeenCalledTimes(1);
      expect(mockedDeepClone).toHaveBeenCalledWith(state.currentWorkflow);
    });

    it('should reset history to single deep-cloned entry', () => {
      // Push some history first
      sliceActions.pushHistory();
      sliceActions.pushHistory();
      expect((state.history as unknown[]).length).toBeGreaterThan(1);

      mockedDeepClone.mockClear();
      sliceActions.clearHistory();

      const history = state.history as unknown[];
      expect(history).toHaveLength(1);
      expect(state.historyIndex).toBe(0);
    });

    it('should set empty history when currentWorkflow is null', () => {
      state.currentWorkflow = null;
      sliceActions.clearHistory();

      expect(state.history).toEqual([]);
      expect(state.historyIndex).toBe(-1);
      // deepClone should not be called when workflow is null
      expect(mockedDeepClone).not.toHaveBeenCalled();
    });
  });

  describe('undo', () => {
    it('should restore previous workflow from history', () => {
      const wf1 = createMockWorkflow('wf-1');
      const wf2 = createMockWorkflow('wf-2');
      state.history = [wf1, wf2];
      state.historyIndex = 1;

      sliceActions.undo();

      expect(state.currentWorkflow).toBe(wf1);
      expect(state.historyIndex).toBe(0);
      expect(state.isDirty).toBe(true);
    });

    it('should not undo past the beginning', () => {
      const wf1 = createMockWorkflow('wf-1');
      state.history = [wf1];
      state.historyIndex = 0;

      sliceActions.undo();

      expect(state.historyIndex).toBe(0);
    });
  });

  describe('redo', () => {
    it('should restore next workflow from history', () => {
      const wf1 = createMockWorkflow('wf-1');
      const wf2 = createMockWorkflow('wf-2');
      state.history = [wf1, wf2];
      state.historyIndex = 0;

      sliceActions.redo();

      expect(state.currentWorkflow).toBe(wf2);
      expect(state.historyIndex).toBe(1);
      expect(state.isDirty).toBe(true);
    });

    it('should not redo past the end', () => {
      const wf1 = createMockWorkflow('wf-1');
      state.history = [wf1];
      state.historyIndex = 0;

      sliceActions.redo();

      expect(state.historyIndex).toBe(0);
    });
  });
});
