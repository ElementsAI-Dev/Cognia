/**
 * Version Slice Tests
 * Tests version control and comparison functionality
 */

import { createVersionSlice, versionSliceInitialState } from './version-slice';

// Mock workflow type for tests
interface MockWorkflow {
  id: string;
  name: string;
  nodes: Array<{ id: string; type: string; data: { label: string } }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

interface MockState {
  workflowVersions: Record<string, unknown[]>;
  currentVersionNumber: number;
  currentWorkflow: MockWorkflow | null;
  isDirty: boolean;
  pushHistory: jest.Mock;
}

// Create a mock store for testing
const createMockStore = () => {
  let state: MockState = {
    ...versionSliceInitialState,
    currentWorkflow: {
      id: 'workflow-1',
      name: 'Test Workflow',
      nodes: [
        { id: 'node-1', type: 'ai', data: { label: 'AI Node' } },
        { id: 'node-2', type: 'transform', data: { label: 'Transform' } },
      ],
      edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
    },
    isDirty: false,
    pushHistory: jest.fn(),
  };

  const set = (updates: Partial<MockState>) => {
    state = { ...state, ...updates };
  };

  const get = () => state;

  const slice = createVersionSlice(set as never, get as never);

  return { state: () => state, set, get, ...slice };
};

describe('versionSlice', () => {
  describe('saveVersion', () => {
    it('should save a new version', () => {
      const store = createMockStore();

      const version = store.saveVersion('v1.0', 'Initial version');

      expect(version).not.toBeNull();
      expect(version?.name).toBe('v1.0');
      expect(version?.description).toBe('Initial version');
      expect(version?.version).toBe(1);
    });

    it('should increment version number', () => {
      const store = createMockStore();

      store.saveVersion('v1');
      const v2 = store.saveVersion('v2');

      expect(v2?.version).toBe(2);
    });

    it('should return null when no workflow is loaded', () => {
      const store = createMockStore();
      store.set({ currentWorkflow: null });

      const version = store.saveVersion('v1');

      expect(version).toBeNull();
    });

    it('should use default name when not provided', () => {
      const store = createMockStore();

      const version = store.saveVersion();

      expect(version?.name).toMatch(/Version \d+/);
    });
  });

  describe('getVersions', () => {
    it('should return empty array when no versions exist', () => {
      const store = createMockStore();

      const versions = store.getVersions();

      expect(versions).toEqual([]);
    });

    it('should return all versions for current workflow', () => {
      const store = createMockStore();
      store.saveVersion('v1');
      store.saveVersion('v2');

      const versions = store.getVersions();

      expect(versions).toHaveLength(2);
    });

    it('should return empty array when no workflow is loaded', () => {
      const store = createMockStore();
      store.set({ currentWorkflow: null });

      const versions = store.getVersions();

      expect(versions).toEqual([]);
    });
  });

  describe('restoreVersion', () => {
    it('should restore workflow from version', () => {
      const store = createMockStore();
      const version = store.saveVersion('v1');

      // Modify workflow
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          nodes: [],
        },
      });

      store.restoreVersion(version!.id);

      expect(store.state().currentWorkflow?.nodes).toHaveLength(2);
      expect(store.state().isDirty).toBe(true);
    });

    it('should call pushHistory before restoring', () => {
      const store = createMockStore();
      const version = store.saveVersion('v1');

      store.restoreVersion(version!.id);

      expect(store.state().pushHistory).toHaveBeenCalled();
    });

    it('should not restore if version not found', () => {
      const store = createMockStore();
      const originalWorkflow = store.state().currentWorkflow;

      store.restoreVersion('non-existent-id');

      expect(store.state().currentWorkflow).toEqual(originalWorkflow);
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');
      store.saveVersion('v2');

      store.deleteVersion(v1!.id);

      const versions = store.getVersions();
      expect(versions).toHaveLength(1);
      expect(versions[0].name).toBe('v2');
    });

    it('should do nothing when workflow not loaded', () => {
      const store = createMockStore();
      store.saveVersion('v1');
      store.set({ currentWorkflow: null });

      expect(() => store.deleteVersion('some-id')).not.toThrow();
    });
  });

  describe('compareVersions', () => {
    it('should return null when workflow not loaded', () => {
      const store = createMockStore();
      store.set({ currentWorkflow: null });

      const result = store.compareVersions('v1', 'v2');

      expect(result).toBeNull();
    });

    it('should return null when version not found', () => {
      const store = createMockStore();
      store.saveVersion('v1');

      const result = store.compareVersions('v1-id', 'non-existent');

      expect(result).toBeNull();
    });

    it('should detect added nodes', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Add a node
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          nodes: [
            ...store.state().currentWorkflow!.nodes,
            { id: 'node-3', type: 'code', data: { label: 'Code Node' } },
          ],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.nodesAdded).toHaveLength(1);
      expect(result?.nodesAdded[0].id).toBe('node-3');
    });

    it('should detect removed nodes', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Remove a node
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          nodes: [store.state().currentWorkflow!.nodes[0]],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.nodesRemoved).toHaveLength(1);
      expect(result?.nodesRemoved[0].id).toBe('node-2');
    });

    it('should detect modified nodes', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Modify a node
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          nodes: [
            { id: 'node-1', type: 'ai', data: { label: 'Modified AI Node' } },
            store.state().currentWorkflow!.nodes[1],
          ],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.nodesModified).toHaveLength(1);
      expect(result?.nodesModified[0].id).toBe('node-1');
      expect(result?.nodesModified[0].changes).toContain('label');
    });

    it('should detect added edges', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Add an edge
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          edges: [
            ...store.state().currentWorkflow!.edges,
            { id: 'edge-2', source: 'node-2', target: 'node-1' },
          ],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.edgesAdded).toHaveLength(1);
      expect(result?.edgesAdded[0].id).toBe('edge-2');
    });

    it('should detect removed edges', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Remove edge
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          edges: [],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.edgesRemoved).toHaveLength(1);
      expect(result?.edgesRemoved[0].id).toBe('edge-1');
    });

    it('should generate summary', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');

      // Make changes
      store.set({
        currentWorkflow: {
          ...store.state().currentWorkflow!,
          nodes: [
            { id: 'node-1', type: 'ai', data: { label: 'Modified' } },
            { id: 'node-3', type: 'new', data: { label: 'New Node' } },
          ],
          edges: [],
        },
      });
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.summary).toContain('added');
      expect(result?.summary).toContain('removed');
      expect(result?.summary).toContain('modified');
    });

    it('should return no differences for identical versions', () => {
      const store = createMockStore();
      const v1 = store.saveVersion('v1');
      const v2 = store.saveVersion('v2');

      const result = store.compareVersions(v1!.id, v2!.id);

      expect(result?.summary).toBe('No differences found');
    });
  });
});
