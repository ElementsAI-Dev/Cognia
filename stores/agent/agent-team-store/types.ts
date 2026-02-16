import {
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type AgentTeamMessage,
  type AgentTeamConfig,
  type AgentTeamTemplate,
  type AgentTeamEvent,
  type TeamStatus,
  type TeammateStatus,
  type TeamTaskStatus,
  type TeamDisplayMode,
  type CreateTeamInput,
  type AddTeammateInput,
  type CreateTaskInput,
  type SendMessageInput,
} from '@/types/agent/agent-team';

export interface AgentTeamState {
  // Data
  teams: Record<string, AgentTeam>;
  teammates: Record<string, AgentTeammate>;
  tasks: Record<string, AgentTeamTask>;
  messages: Record<string, AgentTeamMessage>;
  templates: Record<string, AgentTeamTemplate>;
  events: AgentTeamEvent[];

  // UI State
  activeTeamId: string | null;
  selectedTeammateId: string | null;
  displayMode: TeamDisplayMode;
  isPanelOpen: boolean;

  // Settings
  defaultConfig: AgentTeamConfig;

  // Team CRUD
  createTeam: (input: CreateTeamInput) => AgentTeam;
  updateTeam: (teamId: string, updates: Partial<AgentTeam>) => void;
  updateTeamConfig: (teamId: string, config: AgentTeamConfig) => void;
  deleteTeam: (teamId: string) => void;
  setTeamStatus: (teamId: string, status: TeamStatus) => void;

  // Teammate CRUD
  addTeammate: (input: AddTeammateInput) => AgentTeammate;
  updateTeammate: (teammateId: string, updates: Partial<AgentTeammate>) => void;
  removeTeammate: (teammateId: string) => void;
  setTeammateStatus: (teammateId: string, status: TeammateStatus) => void;
  setTeammateProgress: (teammateId: string, progress: number) => void;

  // Task CRUD
  createTask: (input: CreateTaskInput) => AgentTeamTask;
  updateTask: (taskId: string, updates: Partial<AgentTeamTask>) => void;
  deleteTask: (taskId: string) => void;
  setTaskStatus: (taskId: string, status: TeamTaskStatus, result?: string, error?: string) => void;
  claimTask: (taskId: string, teammateId: string) => void;
  assignTask: (taskId: string, teammateId: string) => void;

  // Messages
  addMessage: (input: SendMessageInput) => AgentTeamMessage;
  markMessageRead: (messageId: string) => void;
  markAllMessagesRead: (teammateId: string) => void;

  // Events
  addEvent: (event: AgentTeamEvent) => void;
  clearEvents: (teamId?: string) => void;

  // Templates
  addTemplate: (template: AgentTeamTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  saveAsTemplate: (teamId: string, name: string, category?: AgentTeamTemplate['category']) => AgentTeamTemplate | null;
  updateTemplate: (templateId: string, updates: Partial<AgentTeamTemplate>) => void;
  importTemplates: (templates: AgentTeamTemplate[]) => number;
  exportTemplates: () => AgentTeamTemplate[];

  // UI State
  setActiveTeam: (teamId: string | null) => void;
  setSelectedTeammate: (teammateId: string | null) => void;
  setDisplayMode: (mode: TeamDisplayMode) => void;
  setIsPanelOpen: (open: boolean) => void;

  // Selectors
  getTeam: (teamId: string) => AgentTeam | undefined;
  getTeammate: (teammateId: string) => AgentTeammate | undefined;
  getTeammates: (teamId: string) => AgentTeammate[];
  getTeamTasks: (teamId: string) => AgentTeamTask[];
  getTeamMessages: (teamId: string) => AgentTeamMessage[];
  getUnreadMessages: (teammateId: string) => AgentTeamMessage[];
  getActiveTeam: () => AgentTeam | undefined;

  // Batch operations
  cancelAllTasks: (teamId: string) => void;
  shutdownAllTeammates: (teamId: string) => void;
  cleanupTeam: (teamId: string) => void;

  // Settings
  updateDefaultConfig: (config: Partial<AgentTeamConfig>) => void;

  // Reset
  reset: () => void;
}
