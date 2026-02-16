import {
  type BackgroundAgent,
  type BackgroundAgentStatus,
  type BackgroundAgentResult,
  type BackgroundAgentLog,
  type BackgroundAgentStep,
  type BackgroundAgentNotification,
  type BackgroundAgentQueueState,
  type CreateBackgroundAgentInput,
  type UpdateBackgroundAgentInput,
} from '@/types/agent/background-agent';
import type { SubAgent } from '@/types/agent/sub-agent';
export interface BackgroundAgentState {
  agents: Record<string, BackgroundAgent>;
  queue: BackgroundAgentQueueState;
  isPanelOpen: boolean;
  selectedAgentId: string | null;

  // Agent CRUD
  createAgent: (input: CreateBackgroundAgentInput) => BackgroundAgent;
  updateAgent: (id: string, updates: UpdateBackgroundAgentInput) => void;
  deleteAgent: (id: string) => void;

  // Status
  setAgentStatus: (id: string, status: BackgroundAgentStatus) => void;
  setAgentProgress: (id: string, progress: number) => void;
  setAgentResult: (id: string, result: BackgroundAgentResult) => void;
  setAgentError: (id: string, error: string) => void;

  // Queue
  queueAgent: (id: string) => void;
  dequeueAgent: (id: string) => void;
  pauseQueue: () => void;
  resumeQueue: () => void;

  // Steps
  addStep: (
    agentId: string,
    step: Omit<BackgroundAgentStep, 'id' | 'stepNumber'>
  ) => BackgroundAgentStep;
  updateStep: (agentId: string, stepId: string, updates: Partial<BackgroundAgentStep>) => void;

  // Logs
  addLog: (
    agentId: string,
    level: BackgroundAgentLog['level'],
    message: string,
    source: BackgroundAgentLog['source'],
    data?: unknown
  ) => void;

  // Notifications
  addNotification: (
    agentId: string,
    notification: Omit<BackgroundAgentNotification, 'id' | 'timestamp' | 'read'>
  ) => void;
  markNotificationRead: (agentId: string, notificationId: string) => void;
  markAllNotificationsRead: (agentId?: string) => void;

  // SubAgents
  addSubAgent: (agentId: string, subAgent: SubAgent) => void;
  updateSubAgent: (agentId: string, subAgentId: string, updates: Partial<SubAgent>) => void;

  // Selectors
  getAgent: (id: string) => BackgroundAgent | undefined;
  getAgentsBySession: (sessionId: string) => BackgroundAgent[];
  getAgentsByStatus: (status: BackgroundAgentStatus) => BackgroundAgent[];
  getRunningAgents: () => BackgroundAgent[];
  getUnreadNotificationCount: () => number;

  // Batch
  cancelAllAgents: () => void;
  clearCompletedAgents: () => void;

  // UI
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  selectAgent: (id: string | null) => void;

  reset: () => void;
}
