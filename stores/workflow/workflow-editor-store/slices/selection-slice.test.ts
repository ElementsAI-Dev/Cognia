import { createSelectionSlice, selectionSliceInitialState } from './selection-slice';
import type { SelectionSliceActions, SelectionSliceState } from '../types';

type MockWorkflow = {
  nodes: Array<{ id: string }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

type SliceState = SelectionSliceState &
  SelectionSliceActions & {
    currentWorkflow: MockWorkflow | null;
    deleteNodes: jest.Mock;
    deleteEdges: jest.Mock;
  };

function createStore(initial?: Partial<SliceState>): { getState: () => SliceState } {
  let state: SliceState = {
    ...selectionSliceInitialState,
    currentWorkflow: null,
    selectNodes: () => undefined,
    selectEdges: () => undefined,
    selectAll: () => undefined,
    clearSelection: () => undefined,
    copySelection: () => undefined,
    pasteSelection: () => undefined,
    cutSelection: () => undefined,
    deleteNodes: jest.fn(),
    deleteEdges: jest.fn(),
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
  const actions = createSelectionSlice(set as never, get as never);
  state = {
    ...state,
    ...actions,
  } as SliceState;

  return {
    getState: () => state,
  };
}

describe('selection-slice cutSelection', () => {
  it('deletes selected nodes and unrelated selected edges in mixed selection', () => {
    const store = createStore({
      currentWorkflow: {
        nodes: [{ id: 'node-1' }, { id: 'node-2' }],
        edges: [
          { id: 'edge-connected', source: 'node-1', target: 'node-2' },
          { id: 'edge-unrelated', source: 'node-x', target: 'node-y' },
        ],
      },
      selectedNodes: ['node-1'],
      selectedEdges: ['edge-connected', 'edge-unrelated'],
    });

    store.getState().cutSelection();

    expect(store.getState().deleteNodes).toHaveBeenCalledWith(['node-1']);
    expect(store.getState().deleteEdges).toHaveBeenCalledWith(['edge-unrelated']);
  });

  it('deletes selected edges when no nodes are selected', () => {
    const store = createStore({
      currentWorkflow: {
        nodes: [{ id: 'node-1' }, { id: 'node-2' }],
        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
      },
      selectedNodes: [],
      selectedEdges: ['edge-1'],
    });

    store.getState().cutSelection();

    expect(store.getState().deleteNodes).not.toHaveBeenCalled();
    expect(store.getState().deleteEdges).toHaveBeenCalledWith(['edge-1']);
  });
});
