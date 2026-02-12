/**
 * Jupyter Kernel Store
 *
 * Zustand store for managing Jupyter kernel state across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  JupyterSession,
  KernelInfo,
  KernelStatus,
  VariableInfo,
  KernelSandboxExecutionResult,
  ExecutableCell,
  ExecutionHistoryEntry,
  SessionEnvMapping,
} from '@/types/jupyter';

/** Jupyter store state */
interface JupyterState {
  // Sessions and kernels
  sessions: JupyterSession[];
  kernels: KernelInfo[];
  activeSessionId: string | null;

  // Execution state
  isExecuting: boolean;
  executingCellIndex: number | null;
  lastSandboxExecutionResult: KernelSandboxExecutionResult | null;

  // Variables
  variables: VariableInfo[];
  variablesLoading: boolean;

  // Execution history
  executionHistory: ExecutionHistoryEntry[];

  // Session-environment mappings for chat integration
  sessionEnvMappings: SessionEnvMapping[];

  // Cells for interactive notebooks
  cells: Map<string, ExecutableCell[]>;

  // Error state
  error: string | null;

  // Loading states
  isCreatingSession: boolean;
  isLoadingSessions: boolean;
}

/** Jupyter store actions */
interface JupyterActions {
  // Session management
  setSessions: (sessions: JupyterSession[]) => void;
  addSession: (session: JupyterSession) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<JupyterSession>) => void;
  setActiveSession: (sessionId: string | null) => void;

  // Kernel management
  setKernels: (kernels: KernelInfo[]) => void;
  updateKernelStatus: (kernelId: string, status: KernelStatus) => void;

  // Execution state
  setExecuting: (isExecuting: boolean, cellIndex?: number | null) => void;
  setLastSandboxExecutionResult: (result: KernelSandboxExecutionResult | null) => void;

  // Variables
  setVariables: (variables: VariableInfo[]) => void;
  setVariablesLoading: (loading: boolean) => void;
  clearVariables: () => void;

  // Execution history
  addExecutionHistory: (entry: ExecutionHistoryEntry) => void;
  clearExecutionHistory: (sessionId?: string) => void;

  // Session-environment mappings
  mapChatToJupyter: (chatSessionId: string, jupyterSessionId: string, envPath: string) => void;
  unmapChatSession: (chatSessionId: string) => void;
  getJupyterSessionForChat: (chatSessionId: string) => SessionEnvMapping | undefined;

  // Cells management
  setCells: (sessionId: string, cells: ExecutableCell[]) => void;
  updateCell: (sessionId: string, cellIndex: number, updates: Partial<ExecutableCell>) => void;
  getCells: (sessionId: string) => ExecutableCell[];

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Loading states
  setCreatingSession: (creating: boolean) => void;
  setLoadingSessions: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

/** Initial state */
const initialState: JupyterState = {
  sessions: [],
  kernels: [],
  activeSessionId: null,
  isExecuting: false,
  executingCellIndex: null,
  lastSandboxExecutionResult: null,
  variables: [],
  variablesLoading: false,
  executionHistory: [],
  sessionEnvMappings: [],
  cells: new Map(),
  error: null,
  isCreatingSession: false,
  isLoadingSessions: false,
};

/** Create the Jupyter store */
export const useJupyterStore = create<JupyterState & JupyterActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session management
      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),

      removeSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
          // Also remove from mappings
          sessionEnvMappings: state.sessionEnvMappings.filter(
            (m) => m.jupyterSessionId !== sessionId
          ),
        })),

      updateSession: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)),
        })),

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      // Kernel management
      setKernels: (kernels) => set({ kernels }),

      updateKernelStatus: (kernelId, status) =>
        set((state) => ({
          kernels: state.kernels.map((k) => (k.id === kernelId ? { ...k, status } : k)),
        })),

      // Execution state
      setExecuting: (isExecuting, cellIndex = null) =>
        set({
          isExecuting,
          executingCellIndex: cellIndex,
        }),

      setLastSandboxExecutionResult: (result) => set({ lastSandboxExecutionResult: result }),

      // Variables
      setVariables: (variables) => set({ variables }),

      setVariablesLoading: (loading) => set({ variablesLoading: loading }),

      clearVariables: () => set({ variables: [] }),

      // Execution history
      addExecutionHistory: (entry) =>
        set((state) => ({
          executionHistory: [entry, ...state.executionHistory].slice(0, 1000), // Keep last 1000 entries
        })),

      clearExecutionHistory: (sessionId) =>
        set((state) => ({
          executionHistory: sessionId
            ? state.executionHistory.filter((e) => e.sessionId !== sessionId)
            : [],
        })),

      // Session-environment mappings
      mapChatToJupyter: (chatSessionId, jupyterSessionId, envPath) =>
        set((state) => {
          // Remove existing mapping for this chat session
          const filtered = state.sessionEnvMappings.filter(
            (m) => m.chatSessionId !== chatSessionId
          );
          return {
            sessionEnvMappings: [
              ...filtered,
              {
                chatSessionId,
                jupyterSessionId,
                envPath,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }),

      unmapChatSession: (chatSessionId) =>
        set((state) => ({
          sessionEnvMappings: state.sessionEnvMappings.filter(
            (m) => m.chatSessionId !== chatSessionId
          ),
        })),

      getJupyterSessionForChat: (chatSessionId) => {
        return get().sessionEnvMappings.find((m) => m.chatSessionId === chatSessionId);
      },

      // Cells management
      setCells: (sessionId, cells) =>
        set((state) => {
          const newCells = new Map(state.cells);
          newCells.set(sessionId, cells);
          return { cells: newCells };
        }),

      updateCell: (sessionId, cellIndex, updates) =>
        set((state) => {
          const newCells = new Map(state.cells);
          const sessionCells = newCells.get(sessionId) || [];
          if (cellIndex >= 0 && cellIndex < sessionCells.length) {
            sessionCells[cellIndex] = { ...sessionCells[cellIndex], ...updates };
            newCells.set(sessionId, [...sessionCells]);
          }
          return { cells: newCells };
        }),

      getCells: (sessionId) => {
        return get().cells.get(sessionId) || [];
      },

      // Error handling
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Loading states
      setCreatingSession: (creating) => set({ isCreatingSession: creating }),

      setLoadingSessions: (loading) => set({ isLoadingSessions: loading }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'jupyter-store',
      partialize: (state) => ({
        // Only persist mappings and history
        sessionEnvMappings: state.sessionEnvMappings,
        executionHistory: state.executionHistory.slice(0, 100), // Limit persisted history
      }),
    }
  )
);

/** Selector for active session */
export const useActiveSession = () => {
  const activeSessionId = useJupyterStore((state) => state.activeSessionId);
  const sessions = useJupyterStore((state) => state.sessions);
  return sessions.find((s) => s.id === activeSessionId);
};

/** Selector for active kernel */
export const useActiveKernel = () => {
  const activeSession = useActiveSession();
  const kernels = useJupyterStore((state) => state.kernels);
  if (!activeSession?.kernelId) return null;
  return kernels.find((k) => k.id === activeSession.kernelId);
};

/** Selector for execution state */
export const useExecutionState = () => {
  return useJupyterStore((state) => ({
    isExecuting: state.isExecuting,
    executingCellIndex: state.executingCellIndex,
    lastResult: state.lastSandboxExecutionResult,
  }));
};

/** Selector for session by chat session ID */
export const useJupyterSessionForChat = (chatSessionId: string) => {
  const mappings = useJupyterStore((state) => state.sessionEnvMappings);
  const sessions = useJupyterStore((state) => state.sessions);

  const mapping = mappings.find((m) => m.chatSessionId === chatSessionId);
  if (!mapping) return null;

  return sessions.find((s) => s.id === mapping.jupyterSessionId);
};

export default useJupyterStore;
