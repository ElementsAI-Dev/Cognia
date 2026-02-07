/**
 * Workflow Store - manages workflow executions and history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowType,
  PPTPresentation,
  WorkflowLog,
} from '@/types/workflow';

interface WorkflowState {
  // Current executions
  executions: Record<string, WorkflowExecution>;
  activeExecutionId: string | null;

  // History (completed/failed executions)
  history: WorkflowExecution[];
  maxHistorySize: number;

  // PPT presentations
  presentations: Record<string, PPTPresentation>;
  activePresentationId: string | null;

  // UI state
  isWorkflowPanelOpen: boolean;
  selectedWorkflowType: WorkflowType | null;
}

interface WorkflowActions {
  // Execution management
  addExecution: (execution: WorkflowExecution) => void;
  updateExecution: (executionId: string, updates: Partial<WorkflowExecution>) => void;
  removeExecution: (executionId: string) => void;
  setActiveExecution: (executionId: string | null) => void;
  getExecution: (executionId: string) => WorkflowExecution | undefined;
  getActiveExecution: () => WorkflowExecution | undefined;
  getExecutionsBySession: (sessionId: string) => WorkflowExecution[];
  getExecutionsByType: (type: WorkflowType) => WorkflowExecution[];

  // Execution status
  startExecution: (executionId: string) => void;
  pauseExecution: (executionId: string) => void;
  resumeExecution: (executionId: string) => void;
  completeExecution: (executionId: string, output?: Record<string, unknown>) => void;
  failExecution: (executionId: string, error: string) => void;
  cancelExecution: (executionId: string) => void;

  // Step management
  updateStepStatus: (
    executionId: string,
    stepId: string,
    status: WorkflowExecution['steps'][0]['status'],
    output?: Record<string, unknown>,
    error?: string
  ) => void;

  // Logging
  addLog: (executionId: string, log: WorkflowLog) => void;

  // History management
  addToHistory: (execution: WorkflowExecution) => void;
  clearHistory: () => void;
  getHistoryByType: (type: WorkflowType) => WorkflowExecution[];

  // PPT management
  addPresentation: (presentation: PPTPresentation) => void;
  updatePresentation: (presentationId: string, updates: Partial<PPTPresentation>) => void;
  deletePresentation: (presentationId: string) => void;
  setActivePresentation: (presentationId: string | null) => void;
  getPresentation: (presentationId: string) => PPTPresentation | undefined;
  getActivePresentation: () => PPTPresentation | undefined;
  getPresentationsBySession: (sessionId: string) => PPTPresentation[];

  // UI actions
  openWorkflowPanel: () => void;
  closeWorkflowPanel: () => void;
  setSelectedWorkflowType: (type: WorkflowType | null) => void;

  // Reset
  reset: () => void;
  clearSessionData: (sessionId: string) => void;
}

const initialState: WorkflowState = {
  executions: {},
  activeExecutionId: null,
  history: [],
  maxHistorySize: 50,
  presentations: {},
  activePresentationId: null,
  isWorkflowPanelOpen: false,
  selectedWorkflowType: null,
};

export const useWorkflowStore = create<WorkflowState & WorkflowActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Execution management
      addExecution: (execution) => {
        set((state) => ({
          executions: { ...state.executions, [execution.id]: execution },
          activeExecutionId: execution.id,
        }));
      },

      updateExecution: (executionId, updates) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution) return state;

          return {
            executions: {
              ...state.executions,
              [executionId]: { ...execution, ...updates },
            },
          };
        });
      },

      removeExecution: (executionId) => {
        set((state) => {
          const { [executionId]: _removed, ...rest } = state.executions;
          return {
            executions: rest,
            activeExecutionId:
              state.activeExecutionId === executionId ? null : state.activeExecutionId,
          };
        });
      },

      setActiveExecution: (executionId) => {
        set({ activeExecutionId: executionId });
      },

      getExecution: (executionId) => {
        return get().executions[executionId];
      },

      getActiveExecution: () => {
        const state = get();
        return state.activeExecutionId ? state.executions[state.activeExecutionId] : undefined;
      },

      getExecutionsBySession: (sessionId) => {
        return Object.values(get().executions).filter((e) => e.sessionId === sessionId);
      },

      getExecutionsByType: (type) => {
        return Object.values(get().executions).filter((e) => e.workflowType === type);
      },

      // Execution status
      startExecution: (executionId) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution) return state;

          return {
            executions: {
              ...state.executions,
              [executionId]: {
                ...execution,
                status: 'executing' as WorkflowExecutionStatus,
                startedAt: new Date(),
              },
            },
          };
        });
      },

      pauseExecution: (executionId) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution || execution.status !== 'executing') return state;

          return {
            executions: {
              ...state.executions,
              [executionId]: {
                ...execution,
                status: 'paused' as WorkflowExecutionStatus,
              },
            },
          };
        });
      },

      resumeExecution: (executionId) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution || execution.status !== 'paused') return state;

          return {
            executions: {
              ...state.executions,
              [executionId]: {
                ...execution,
                status: 'executing' as WorkflowExecutionStatus,
              },
            },
          };
        });
      },

      completeExecution: (executionId, output) => {
        const state = get();
        const execution = state.executions[executionId];
        if (!execution) return;

        const completedExecution: WorkflowExecution = {
          ...execution,
          status: 'completed' as WorkflowExecutionStatus,
          completedAt: new Date(),
          duration: execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0,
          output,
          progress: 100,
        };

        set((state) => ({
          executions: {
            ...state.executions,
            [executionId]: completedExecution,
          },
        }));

        // Add to history
        get().addToHistory(completedExecution);
      },

      failExecution: (executionId, error) => {
        const state = get();
        const execution = state.executions[executionId];
        if (!execution) return;

        const failedExecution: WorkflowExecution = {
          ...execution,
          status: 'failed' as WorkflowExecutionStatus,
          completedAt: new Date(),
          duration: execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0,
          error,
        };

        set((state) => ({
          executions: {
            ...state.executions,
            [executionId]: failedExecution,
          },
        }));

        // Add to history
        get().addToHistory(failedExecution);
      },

      cancelExecution: (executionId) => {
        const state = get();
        const execution = state.executions[executionId];
        if (!execution) return;

        const cancelledExecution: WorkflowExecution = {
          ...execution,
          status: 'cancelled' as WorkflowExecutionStatus,
          completedAt: new Date(),
          duration: execution.startedAt ? Date.now() - execution.startedAt.getTime() : 0,
        };

        set((state) => ({
          executions: {
            ...state.executions,
            [executionId]: cancelledExecution,
          },
        }));

        // Add to history
        get().addToHistory(cancelledExecution);
      },

      // Step management
      updateStepStatus: (executionId, stepId, status, output, error) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution) return state;

          const now = new Date();
          const updatedSteps = execution.steps.map((step) => {
            if (step.stepId !== stepId) return step;

            return {
              ...step,
              status,
              output,
              error,
              completedAt: status === 'completed' || status === 'failed' ? now : step.completedAt,
              duration:
                status === 'completed' || status === 'failed'
                  ? step.startedAt
                    ? now.getTime() - step.startedAt.getTime()
                    : 0
                  : step.duration,
            };
          });

          const completedCount = updatedSteps.filter(
            (s) => s.status === 'completed' || s.status === 'skipped'
          ).length;

          return {
            executions: {
              ...state.executions,
              [executionId]: {
                ...execution,
                steps: updatedSteps,
                currentStepId: status === 'running' ? stepId : execution.currentStepId,
                progress: Math.round((completedCount / updatedSteps.length) * 100),
              },
            },
          };
        });
      },

      // Logging
      addLog: (executionId, log) => {
        set((state) => {
          const execution = state.executions[executionId];
          if (!execution) return state;

          return {
            executions: {
              ...state.executions,
              [executionId]: {
                ...execution,
                logs: [...execution.logs, log],
              },
            },
          };
        });
      },

      // History management
      addToHistory: (execution) => {
        set((state) => {
          const newHistory = [execution, ...state.history].slice(0, state.maxHistorySize);
          return { history: newHistory };
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getHistoryByType: (type) => {
        return get().history.filter((e) => e.workflowType === type);
      },

      // PPT management
      addPresentation: (presentation) => {
        set((state) => ({
          presentations: { ...state.presentations, [presentation.id]: presentation },
          activePresentationId: presentation.id,
        }));
      },

      updatePresentation: (presentationId, updates) => {
        set((state) => {
          const presentation = state.presentations[presentationId];
          if (!presentation) return state;

          return {
            presentations: {
              ...state.presentations,
              [presentationId]: {
                ...presentation,
                ...updates,
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      deletePresentation: (presentationId) => {
        set((state) => {
          const { [presentationId]: _removed, ...rest } = state.presentations;
          return {
            presentations: rest,
            activePresentationId:
              state.activePresentationId === presentationId ? null : state.activePresentationId,
          };
        });
      },

      setActivePresentation: (presentationId) => {
        set({ activePresentationId: presentationId });
      },

      getPresentation: (presentationId) => {
        return get().presentations[presentationId];
      },

      getActivePresentation: () => {
        const state = get();
        return state.activePresentationId
          ? state.presentations[state.activePresentationId]
          : undefined;
      },

      getPresentationsBySession: (sessionId) => {
        return Object.values(get().presentations).filter(
          (p) => p.metadata?.sessionId === sessionId
        );
      },

      // UI actions
      openWorkflowPanel: () => {
        set({ isWorkflowPanelOpen: true });
      },

      closeWorkflowPanel: () => {
        set({ isWorkflowPanelOpen: false });
      },

      setSelectedWorkflowType: (type) => {
        set({ selectedWorkflowType: type });
      },

      // Reset
      reset: () => {
        set(initialState);
      },

      clearSessionData: (sessionId) => {
        set((state) => {
          const executions = Object.fromEntries(
            Object.entries(state.executions).filter(([, e]) => e.sessionId !== sessionId)
          );
          const presentations = Object.fromEntries(
            Object.entries(state.presentations).filter(
              ([, p]) => p.metadata?.sessionId !== sessionId
            )
          );
          const history = state.history.filter((e) => e.sessionId !== sessionId);

          return {
            executions,
            presentations,
            history,
            activeExecutionId:
              state.activeExecutionId && executions[state.activeExecutionId]
                ? state.activeExecutionId
                : null,
            activePresentationId:
              state.activePresentationId && presentations[state.activePresentationId]
                ? state.activePresentationId
                : null,
          };
        });
      },
    }),
    {
      name: 'cognia-workflows',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure presentations field exists
          if (!state.presentations || typeof state.presentations !== 'object') {
            state.presentations = {};
          }
          if (!state.maxHistorySize) {
            state.maxHistorySize = 50;
          }
        }
        return state;
      },
      partialize: (state) => ({
        history: state.history,
        presentations: state.presentations,
        maxHistorySize: state.maxHistorySize,
      }),
    }
  )
);

// Selectors
export const selectActiveExecution = (state: WorkflowState) =>
  state.activeExecutionId ? state.executions[state.activeExecutionId] : undefined;

export const selectExecutionProgress = (state: WorkflowState) => {
  const active = state.activeExecutionId ? state.executions[state.activeExecutionId] : undefined;
  return active?.progress || 0;
};

export const selectIsExecuting = (state: WorkflowState) => {
  const active = state.activeExecutionId ? state.executions[state.activeExecutionId] : undefined;
  return active?.status === 'executing';
};

export const selectActivePresentation = (state: WorkflowState) =>
  state.activePresentationId ? state.presentations[state.activePresentationId] : undefined;

export default useWorkflowStore;
