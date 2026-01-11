/**
 * SubAgent Store - Manages sub-agent state
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  DEFAULT_SUB_AGENT_CONFIG,
  type SubAgent,
  type SubAgentConfig,
  type SubAgentStatus,
  type SubAgentResult,
  type SubAgentLog,
  type SubAgentGroup,
  type CreateSubAgentInput,
  type UpdateSubAgentInput,
  type SubAgentExecutionMode,
} from '@/types/agent/sub-agent';

interface SubAgentState {
  // Sub-agents by ID
  subAgents: Record<string, SubAgent>;
  
  // Groups for organizing sub-agents
  groups: Record<string, SubAgentGroup>;
  
  // Active parent agent ID
  activeParentId: string | null;
  
  // Actions
  createSubAgent: (input: CreateSubAgentInput) => SubAgent;
  updateSubAgent: (id: string, updates: UpdateSubAgentInput) => void;
  deleteSubAgent: (id: string) => void;
  
  // Status management
  setSubAgentStatus: (id: string, status: SubAgentStatus) => void;
  setSubAgentProgress: (id: string, progress: number) => void;
  setSubAgentResult: (id: string, result: SubAgentResult) => void;
  setSubAgentError: (id: string, error: string) => void;
  
  // Logging
  addSubAgentLog: (id: string, level: SubAgentLog['level'], message: string, data?: unknown) => void;
  clearSubAgentLogs: (id: string) => void;
  
  // Group management
  createGroup: (name: string, executionMode: SubAgentExecutionMode, subAgentIds: string[]) => SubAgentGroup;
  updateGroup: (groupId: string, updates: Partial<SubAgentGroup>) => void;
  deleteGroup: (groupId: string) => void;
  addToGroup: (groupId: string, subAgentId: string) => void;
  removeFromGroup: (groupId: string, subAgentId: string) => void;
  
  // Selectors
  getSubAgent: (id: string) => SubAgent | undefined;
  getSubAgentsByParent: (parentId: string) => SubAgent[];
  getSubAgentsByStatus: (status: SubAgentStatus) => SubAgent[];
  getActiveSubAgents: () => SubAgent[];
  getCompletedSubAgents: () => SubAgent[];
  getFailedSubAgents: () => SubAgent[];
  getGroup: (groupId: string) => SubAgentGroup | undefined;
  getGroupSubAgents: (groupId: string) => SubAgent[];
  
  // Batch operations
  cancelAllSubAgents: (parentId?: string) => void;
  clearCompletedSubAgents: (parentId?: string) => void;
  reorderSubAgents: (parentId: string, orderedIds: string[]) => void;
  
  // Active parent
  setActiveParent: (parentId: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  subAgents: {} as Record<string, SubAgent>,
  groups: {} as Record<string, SubAgentGroup>,
  activeParentId: null as string | null,
};

export const useSubAgentStore = create<SubAgentState>((set, get) => ({
  ...initialState,

  createSubAgent: (input) => {
    const now = new Date();
    const config: SubAgentConfig = {
      ...DEFAULT_SUB_AGENT_CONFIG,
      ...input.config,
    };

    const subAgent: SubAgent = {
      id: nanoid(),
      parentAgentId: input.parentAgentId,
      name: input.name,
      description: input.description || '',
      task: input.task,
      status: 'pending',
      config,
      logs: [],
      progress: 0,
      createdAt: now,
      retryCount: 0,
      order: input.order ?? Object.keys(get().subAgents).filter(
        id => get().subAgents[id].parentAgentId === input.parentAgentId
      ).length,
      tags: input.tags,
    };

    set((state) => ({
      subAgents: { ...state.subAgents, [subAgent.id]: subAgent },
    }));

    return subAgent;
  },

  updateSubAgent: (id, updates) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      const updated: SubAgent = {
        ...subAgent,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.task !== undefined && { task: updates.task }),
        ...(updates.config !== undefined && { config: { ...subAgent.config, ...updates.config } }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.tags !== undefined && { tags: updates.tags }),
      };

      return {
        subAgents: { ...state.subAgents, [id]: updated },
      };
    });
  },

  deleteSubAgent: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.subAgents;
      
      // Also remove from any groups
      const updatedGroups = { ...state.groups };
      Object.keys(updatedGroups).forEach(groupId => {
        updatedGroups[groupId] = {
          ...updatedGroups[groupId],
          subAgentIds: updatedGroups[groupId].subAgentIds.filter(saId => saId !== id),
        };
      });

      return { subAgents: rest, groups: updatedGroups };
    });
  },

  setSubAgentStatus: (id, status) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      const updates: Partial<SubAgent> = { status };
      
      if (status === 'running' && !subAgent.startedAt) {
        updates.startedAt = new Date();
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'timeout') {
        updates.completedAt = new Date();
      }

      return {
        subAgents: {
          ...state.subAgents,
          [id]: { ...subAgent, ...updates },
        },
      };
    });
  },

  setSubAgentProgress: (id, progress) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: { ...subAgent, progress: Math.min(100, Math.max(0, progress)) },
        },
      };
    });
  },

  setSubAgentResult: (id, result) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            result,
            status: result.success ? 'completed' : 'failed',
            completedAt: new Date(),
            progress: 100,
            error: result.error,
          },
        },
      };
    });
  },

  setSubAgentError: (id, error) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            error,
            status: 'failed',
            completedAt: new Date(),
          },
        },
      };
    });
  },

  addSubAgentLog: (id, level, message, data) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      const log: SubAgentLog = {
        timestamp: new Date(),
        level,
        message,
        data,
      };

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            logs: [...subAgent.logs, log],
          },
        },
      };
    });
  },

  clearSubAgentLogs: (id) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: { ...subAgent, logs: [] },
        },
      };
    });
  },

  createGroup: (name, executionMode, subAgentIds) => {
    const now = new Date();
    const group: SubAgentGroup = {
      id: nanoid(),
      name,
      executionMode,
      subAgentIds,
      status: 'pending',
      progress: 0,
      createdAt: now,
    };

    set((state) => ({
      groups: { ...state.groups, [group.id]: group },
    }));

    return group;
  },

  updateGroup: (groupId, updates) => {
    set((state) => {
      const group = state.groups[groupId];
      if (!group) return state;

      return {
        groups: {
          ...state.groups,
          [groupId]: { ...group, ...updates },
        },
      };
    });
  },

  deleteGroup: (groupId) => {
    set((state) => {
      const { [groupId]: _, ...rest } = state.groups;
      return { groups: rest };
    });
  },

  addToGroup: (groupId, subAgentId) => {
    set((state) => {
      const group = state.groups[groupId];
      if (!group || group.subAgentIds.includes(subAgentId)) return state;

      return {
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            subAgentIds: [...group.subAgentIds, subAgentId],
          },
        },
      };
    });
  },

  removeFromGroup: (groupId, subAgentId) => {
    set((state) => {
      const group = state.groups[groupId];
      if (!group) return state;

      return {
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            subAgentIds: group.subAgentIds.filter(id => id !== subAgentId),
          },
        },
      };
    });
  },

  getSubAgent: (id) => {
    return get().subAgents[id];
  },

  getSubAgentsByParent: (parentId) => {
    return Object.values(get().subAgents)
      .filter(sa => sa.parentAgentId === parentId)
      .sort((a, b) => a.order - b.order);
  },

  getSubAgentsByStatus: (status) => {
    return Object.values(get().subAgents).filter(sa => sa.status === status);
  },

  getActiveSubAgents: () => {
    return Object.values(get().subAgents).filter(
      sa => sa.status === 'running' || sa.status === 'queued'
    );
  },

  getCompletedSubAgents: () => {
    return Object.values(get().subAgents).filter(sa => sa.status === 'completed');
  },

  getFailedSubAgents: () => {
    return Object.values(get().subAgents).filter(
      sa => sa.status === 'failed' || sa.status === 'timeout'
    );
  },

  getGroup: (groupId) => {
    return get().groups[groupId];
  },

  getGroupSubAgents: (groupId) => {
    const group = get().groups[groupId];
    if (!group) return [];

    return group.subAgentIds
      .map(id => get().subAgents[id])
      .filter((sa): sa is SubAgent => sa !== undefined);
  },

  cancelAllSubAgents: (parentId) => {
    set((state) => {
      const updatedSubAgents = { ...state.subAgents };
      
      Object.values(updatedSubAgents).forEach(sa => {
        if (parentId && sa.parentAgentId !== parentId) return;
        if (sa.status === 'running' || sa.status === 'pending' || sa.status === 'queued') {
          updatedSubAgents[sa.id] = {
            ...sa,
            status: 'cancelled',
            completedAt: new Date(),
          };
        }
      });

      return { subAgents: updatedSubAgents };
    });
  },

  clearCompletedSubAgents: (parentId) => {
    set((state) => {
      const updatedSubAgents = { ...state.subAgents };
      
      Object.keys(updatedSubAgents).forEach(id => {
        const sa = updatedSubAgents[id];
        if (parentId && sa.parentAgentId !== parentId) return;
        if (sa.status === 'completed' || sa.status === 'failed' || sa.status === 'cancelled') {
          delete updatedSubAgents[id];
        }
      });

      return { subAgents: updatedSubAgents };
    });
  },

  reorderSubAgents: (parentId, orderedIds) => {
    set((state) => {
      const updatedSubAgents = { ...state.subAgents };
      
      orderedIds.forEach((id, index) => {
        const sa = updatedSubAgents[id];
        if (sa && sa.parentAgentId === parentId) {
          updatedSubAgents[id] = { ...sa, order: index };
        }
      });

      return { subAgents: updatedSubAgents };
    });
  },

  setActiveParent: (parentId) => {
    set({ activeParentId: parentId });
  },

  reset: () => {
    set(initialState);
  },
}));

// Selectors
export const selectSubAgents = (state: SubAgentState) => state.subAgents;
export const selectGroups = (state: SubAgentState) => state.groups;
export const selectActiveParentId = (state: SubAgentState) => state.activeParentId;

// Derived selectors
export const selectSubAgentCount = (state: SubAgentState) => Object.keys(state.subAgents).length;
export const selectActiveSubAgentCount = (state: SubAgentState) => 
  Object.values(state.subAgents).filter(sa => sa.status === 'running' || sa.status === 'queued').length;
export const selectCompletedSubAgentCount = (state: SubAgentState) =>
  Object.values(state.subAgents).filter(sa => sa.status === 'completed').length;

export default useSubAgentStore;
