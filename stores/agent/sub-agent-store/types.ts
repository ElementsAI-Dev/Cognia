import {
  type SubAgent,
  type SubAgentStatus,
  type SubAgentResult,
  type SubAgentLog,
  type SubAgentGroup,
  type SubAgentTemplate,
  type SubAgentMetrics,
  type CreateSubAgentInput,
  type UpdateSubAgentInput,
  type SubAgentExecutionMode,
} from '@/types/agent/sub-agent';
export interface SubAgentState {
  // Sub-agents by ID
  subAgents: Record<string, SubAgent>;

  // Groups for organizing sub-agents
  groups: Record<string, SubAgentGroup>;

  // Templates for quick sub-agent creation
  templates: Record<string, SubAgentTemplate>;

  // Execution metrics for analytics
  metrics: Record<string, SubAgentMetrics>;

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
  addSubAgentLog: (
    id: string,
    level: SubAgentLog['level'],
    message: string,
    data?: unknown
  ) => void;
  clearSubAgentLogs: (id: string) => void;

  // Group management
  createGroup: (
    name: string,
    executionMode: SubAgentExecutionMode,
    subAgentIds: string[]
  ) => SubAgentGroup;
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

  // Template management
  addTemplate: (template: SubAgentTemplate) => void;
  updateTemplate: (templateId: string, updates: Partial<SubAgentTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  getTemplate: (templateId: string) => SubAgentTemplate | undefined;
  createFromTemplate: (
    templateId: string,
    parentAgentId: string,
    variables?: Record<string, string>
  ) => SubAgent | null;

  // Metrics
  updateMetrics: (subAgentId: string, result: SubAgentResult) => void;
  getMetrics: (subAgentId?: string) => SubAgentMetrics | Record<string, SubAgentMetrics>;

  // Active parent
  setActiveParent: (parentId: string | null) => void;

  // Reset
  reset: () => void;
}
