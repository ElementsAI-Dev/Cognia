import { createValidationSlice } from './validation-slice';
import type { ValidationSliceActions, ValidationSliceState } from '../types';

type SliceState = ValidationSliceState &
  ValidationSliceActions & {
  currentWorkflow: {
    nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
  } | null;
  syncLifecycleState: jest.Mock;
  selectNodes: jest.Mock;
  selectEdges: jest.Mock;
};

function createStore(initial?: Partial<SliceState>): { getState: () => SliceState } {
  let state: SliceState = {
    currentWorkflow: {
      nodes: [],
      edges: [],
    },
    validationErrors: [],
    clientValidationErrors: [],
    serverValidationErrors: [],
    validationFocusTarget: null,
    validate: () => [],
    clearValidationErrors: () => undefined,
    setServerValidationErrors: () => undefined,
    clearServerValidationErrors: () => undefined,
    focusValidationIssue: () => undefined,
    clearValidationFocus: () => undefined,
    getBlockingValidationErrors: () => [],
    syncLifecycleState: jest.fn(),
    selectNodes: jest.fn(),
    selectEdges: jest.fn(),
    ...initial,
  };

  const set = (partial: Partial<SliceState> | ((prev: SliceState) => Partial<SliceState>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    state = {
      ...state,
      ...update,
    };
  };

  const get = () => state;
  const actions = createValidationSlice(set as never, get as never);
  state = {
    ...state,
    ...actions,
  } as SliceState;

  return {
    getState: () => state,
  };
}

describe('validation-slice', () => {
  it('sets server validation errors and keeps blocking metadata', () => {
    const store = createStore();
    store.getState().setServerValidationErrors([
      {
        message: 'Server validation failed',
        severity: 'error',
        nodeId: 'node-1',
      },
    ]);

    expect(store.getState().serverValidationErrors).toHaveLength(1);
    expect(store.getState().validationErrors[0]).toMatchObject({
      source: 'server',
      nodeId: 'node-1',
      blocking: true,
    });
    expect(store.getState().syncLifecycleState).toHaveBeenCalled();
  });

  it('focuses node validation issue and updates selection', () => {
    const store = createStore({
      validationErrors: [
        {
          id: 'issue-node-1',
          nodeId: 'node-1',
          message: 'Node issue',
          severity: 'error',
        },
      ],
    });

    store.getState().focusValidationIssue('issue-node-1');

    expect(store.getState().validationFocusTarget).toMatchObject({
      issueId: 'issue-node-1',
      nodeId: 'node-1',
    });
    expect(store.getState().selectNodes).toHaveBeenCalledWith(['node-1']);
    expect(store.getState().selectEdges).toHaveBeenCalledWith([]);
  });

  it('focuses edge validation issue and updates selection', () => {
    const store = createStore({
      validationErrors: [
        {
          id: 'issue-edge-1',
          edgeId: 'edge-1',
          message: 'Edge issue',
          severity: 'error',
        },
      ],
    });

    store.getState().focusValidationIssue('issue-edge-1');

    expect(store.getState().validationFocusTarget).toMatchObject({
      issueId: 'issue-edge-1',
      edgeId: 'edge-1',
    });
    expect(store.getState().selectEdges).toHaveBeenCalledWith(['edge-1']);
    expect(store.getState().selectNodes).toHaveBeenCalledWith([]);
  });

  it('returns blocking validation issues', () => {
    const store = createStore({
      validationErrors: [
        { id: 'a', message: 'Error A', severity: 'error' },
        { id: 'b', message: 'Warn B', severity: 'warning' },
      ],
    });

    const blocking = store.getState().getBlockingValidationErrors();
    expect(blocking).toHaveLength(1);
    expect(blocking[0]?.id).toBe('a');
  });
});
