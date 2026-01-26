/**
 * Statistics Slice
 * Handles execution statistics recording and retrieval
 */

import { nanoid } from 'nanoid';
import type { SliceCreator, StatisticsSliceActions, StatisticsSliceState } from '../types';
import { calculateWorkflowStatistics } from '@/types/workflow/workflow-editor';

export const statisticsSliceInitialState: StatisticsSliceState = {
  WorkflowExecutionRecords: [],
};

export const createStatisticsSlice: SliceCreator<StatisticsSliceActions> = (set, get) => {
  return {
    recordExecution: (record) => {
      const { WorkflowExecutionRecords } = get();
      const newRecord = {
        ...record,
        id: `exec-${nanoid()}`,
      };
      set({
        WorkflowExecutionRecords: [newRecord, ...WorkflowExecutionRecords].slice(0, 500),
      });
    },

    getWorkflowStatistics: (workflowId) => {
      const { currentWorkflow, WorkflowExecutionRecords } = get();
      const targetId = workflowId || currentWorkflow?.id;
      if (!targetId) return null;
      return calculateWorkflowStatistics(targetId, WorkflowExecutionRecords);
    },

    clearWorkflowExecutionRecords: (workflowId) => {
      const { WorkflowExecutionRecords } = get();
      if (workflowId) {
        set({
          WorkflowExecutionRecords: WorkflowExecutionRecords.filter(
            (r) => r.workflowId !== workflowId
          ),
        });
      } else {
        set({ WorkflowExecutionRecords: [] });
      }
    },
  };
};
