/**
 * Version Slice
 * Handles workflow version control with comparison capabilities
 */

import type {
  SliceCreator,
  VersionSliceActions,
  VersionSliceState,
} from '../types';

// Re-export for external use
export type { VersionComparisonResult } from '../types';
import { createWorkflowVersion } from '@/types/workflow/workflow-editor';

export const versionSliceInitialState: VersionSliceState = {
  workflowVersions: {},
  currentVersionNumber: 0,
};

/**
 * Compare two node data objects and return list of changed properties
 */
function getNodeChanges(
  data1: Record<string, unknown>,
  data2: Record<string, unknown>
): string[] {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);

  for (const key of allKeys) {
    // Skip internal/volatile properties
    if (['position', 'selected', 'dragging'].includes(key)) continue;

    const val1 = data1[key];
    const val2 = data2[key];

    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      changes.push(key);
    }
  }

  return changes;
}

export const createVersionSlice: SliceCreator<VersionSliceActions> = (set, get) => {
  return {
    saveVersion: (name, description) => {
      const { currentWorkflow, workflowVersions, currentVersionNumber } = get();
      if (!currentWorkflow) return null;

      const newVersionNumber = currentVersionNumber + 1;
      const version = createWorkflowVersion(currentWorkflow, newVersionNumber, {
        name: name || `Version ${newVersionNumber}`,
        description,
      });

      const workflowId = currentWorkflow.id;
      const existingVersions = workflowVersions[workflowId] || [];

      set({
        workflowVersions: {
          ...workflowVersions,
          [workflowId]: [...existingVersions, version],
        },
        currentVersionNumber: newVersionNumber,
      });

      return version;
    },

    getVersions: () => {
      const { currentWorkflow, workflowVersions } = get();
      if (!currentWorkflow) return [];
      return workflowVersions[currentWorkflow.id] || [];
    },

    restoreVersion: (versionId) => {
      const { currentWorkflow, workflowVersions } = get();
      if (!currentWorkflow) return;

      const versions = workflowVersions[currentWorkflow.id] || [];
      const version = versions.find((v) => v.id === versionId);
      if (!version) return;

      get().pushHistory();
      set({
        currentWorkflow: {
          ...version.snapshot,
          id: currentWorkflow.id,
          updatedAt: new Date(),
        },
        isDirty: true,
      });
    },

    deleteVersion: (versionId) => {
      const { currentWorkflow, workflowVersions } = get();
      if (!currentWorkflow) return;

      const workflowId = currentWorkflow.id;
      const versions = workflowVersions[workflowId] || [];

      set({
        workflowVersions: {
          ...workflowVersions,
          [workflowId]: versions.filter((v) => v.id !== versionId),
        },
      });
    },

    compareVersions: (versionId1, versionId2) => {
      const { currentWorkflow, workflowVersions } = get();
      if (!currentWorkflow) return null;

      const versions = workflowVersions[currentWorkflow.id] || [];
      const v1 = versions.find((v) => v.id === versionId1);
      const v2 = versions.find((v) => v.id === versionId2);

      if (!v1 || !v2) return null;

      const nodes1 = v1.snapshot.nodes || [];
      const nodes2 = v2.snapshot.nodes || [];
      const edges1 = v1.snapshot.edges || [];
      const edges2 = v2.snapshot.edges || [];

      // Create maps for quick lookup
      const nodeMap1 = new Map(nodes1.map((n) => [n.id, n]));
      const nodeMap2 = new Map(nodes2.map((n) => [n.id, n]));
      const edgeMap1 = new Map(edges1.map((e) => [e.id, e]));
      const edgeMap2 = new Map(edges2.map((e) => [e.id, e]));

      // Find added nodes (in v2 but not in v1)
      const nodesAdded = nodes2
        .filter((n) => !nodeMap1.has(n.id))
        .map((n) => ({
          id: n.id,
          type: n.type || 'unknown',
          label: (n.data as Record<string, unknown>)?.label as string | undefined,
        }));

      // Find removed nodes (in v1 but not in v2)
      const nodesRemoved = nodes1
        .filter((n) => !nodeMap2.has(n.id))
        .map((n) => ({
          id: n.id,
          type: n.type || 'unknown',
          label: (n.data as Record<string, unknown>)?.label as string | undefined,
        }));

      // Find modified nodes (in both, but with different data)
      const nodesModified = nodes2
        .filter((n2) => {
          const n1 = nodeMap1.get(n2.id);
          if (!n1) return false;
          const changes = getNodeChanges(
            (n1.data || {}) as Record<string, unknown>,
            (n2.data || {}) as Record<string, unknown>
          );
          return changes.length > 0;
        })
        .map((n2) => {
          const n1 = nodeMap1.get(n2.id)!;
          const changes = getNodeChanges(
            (n1.data || {}) as Record<string, unknown>,
            (n2.data || {}) as Record<string, unknown>
          );
          return {
            id: n2.id,
            type: n2.type || 'unknown',
            label: (n2.data as Record<string, unknown>)?.label as string | undefined,
            changes,
          };
        });

      // Find added edges
      const edgesAdded = edges2
        .filter((e) => !edgeMap1.has(e.id))
        .map((e) => ({ id: e.id, source: e.source, target: e.target }));

      // Find removed edges
      const edgesRemoved = edges1
        .filter((e) => !edgeMap2.has(e.id))
        .map((e) => ({ id: e.id, source: e.source, target: e.target }));

      // Build summary
      const parts: string[] = [];
      if (nodesAdded.length > 0) parts.push(`${nodesAdded.length} node(s) added`);
      if (nodesRemoved.length > 0) parts.push(`${nodesRemoved.length} node(s) removed`);
      if (nodesModified.length > 0) parts.push(`${nodesModified.length} node(s) modified`);
      if (edgesAdded.length > 0) parts.push(`${edgesAdded.length} edge(s) added`);
      if (edgesRemoved.length > 0) parts.push(`${edgesRemoved.length} edge(s) removed`);

      const summary =
        parts.length > 0 ? parts.join(', ') : 'No differences found';

      return {
        nodesAdded,
        nodesRemoved,
        nodesModified,
        edgesAdded,
        edgesRemoved,
        summary,
      };
    },
  };
};
