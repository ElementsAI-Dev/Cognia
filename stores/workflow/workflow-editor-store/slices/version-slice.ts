/**
 * Version Slice
 * Handles workflow version control
 */

import type { SliceCreator, VersionSliceActions, VersionSliceState } from '../types';
import { createWorkflowVersion } from '@/types/workflow/workflow-editor';

export const versionSliceInitialState: VersionSliceState = {
  workflowVersions: {},
  currentVersionNumber: 0,
};

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
  };
};
