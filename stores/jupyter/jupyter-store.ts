/**
 * Jupyter Kernel Store
 *
 * Zustand store for managing Jupyter kernel state across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MAX_NOTEBOOK_INLINE_SNAPSHOT_BYTES,
  MAX_NOTEBOOK_WORKSPACE_SNAPSHOTS,
} from '@/types/jupyter';
import type {
  JupyterSession,
  KernelInfo,
  KernelStatus,
  VariableInfo,
  KernelSandboxExecutionResult,
  ExecutableCell,
  ExecutionHistoryEntry,
  SessionEnvMapping,
  NotebookWorkspaceSnapshot,
  NotebookWorkspaceSnapshotInput,
  NotebookWorkspaceRecoveryStatus,
} from '@/types/jupyter';

function getContentSizeBytes(content: string | null | undefined): number {
  if (!content) return 0;
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).length;
  }
  return content.length;
}

function createWorkspaceSnapshot(
  input: NotebookWorkspaceSnapshotInput,
  existing?: NotebookWorkspaceSnapshot
): NotebookWorkspaceSnapshot {
  const now = input.updatedAt ?? new Date().toISOString();
  const notebookContent = input.notebookContent ?? existing?.notebookContent ?? null;
  const contentSizeBytes = getContentSizeBytes(notebookContent);
  const hasInlineContent = contentSizeBytes <= MAX_NOTEBOOK_INLINE_SNAPSHOT_BYTES;

  return {
    surfaceId: input.surfaceId,
    sessionId: input.sessionId ?? existing?.sessionId ?? null,
    kernelId: input.kernelId ?? existing?.kernelId ?? null,
    selectedEnvPath: input.selectedEnvPath ?? existing?.selectedEnvPath ?? null,
    filePath: input.filePath ?? existing?.filePath ?? null,
    notebookContent: hasInlineContent ? notebookContent : null,
    isDirty: input.isDirty ?? existing?.isDirty ?? false,
    recoveryStatus: input.recoveryStatus ?? existing?.recoveryStatus ?? 'ready',
    recoveryError:
      input.recoveryError !== undefined ? input.recoveryError : (existing?.recoveryError ?? null),
    lastSavedAt:
      input.lastSavedAt !== undefined ? input.lastSavedAt : (existing?.lastSavedAt ?? null),
    lastExecutedAt:
      input.lastExecutedAt !== undefined
        ? input.lastExecutedAt
        : (existing?.lastExecutedAt ?? null),
    updatedAt: now,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    hasInlineContent,
    contentSizeBytes,
    fileInfo: input.fileInfo !== undefined ? input.fileInfo : (existing?.fileInfo ?? null),
  };
}

function pruneWorkspaceSnapshots(
  workspaces: Record<string, NotebookWorkspaceSnapshot>
): Record<string, NotebookWorkspaceSnapshot> {
  const entries = Object.entries(workspaces);
  if (entries.length <= MAX_NOTEBOOK_WORKSPACE_SNAPSHOTS) {
    return workspaces;
  }

  return Object.fromEntries(
    entries
      .sort(
        ([_leftKey, left], [_rightKey, right]) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      )
      .slice(entries.length - MAX_NOTEBOOK_WORKSPACE_SNAPSHOTS)
  );
}

function markWorkspaceForReconnect(
  workspace: NotebookWorkspaceSnapshot,
  recoveryError: string | null = null
): NotebookWorkspaceSnapshot {
  return {
    ...workspace,
    sessionId: null,
    kernelId: null,
    recoveryStatus: 'needs_reconnect',
    recoveryError,
    updatedAt: new Date().toISOString(),
  };
}

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

  // Recoverable notebook workspaces keyed by surface id
  workspaces: Record<string, NotebookWorkspaceSnapshot>;

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

  // Workspace recovery
  upsertWorkspace: (snapshot: NotebookWorkspaceSnapshotInput) => NotebookWorkspaceSnapshot;
  removeWorkspace: (surfaceId: string) => void;
  getWorkspace: (surfaceId: string) => NotebookWorkspaceSnapshot | null;
  setWorkspaceRecoveryState: (
    surfaceId: string,
    recoveryStatus: NotebookWorkspaceRecoveryStatus,
    recoveryError?: string | null
  ) => void;
  markWorkspacesForReconnectByKernelId: (kernelId: string, recoveryError?: string | null) => void;

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
  workspaces: {},
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
      setSessions: (sessions) =>
        set((state) => {
          const sessionIds = new Set(sessions.map((session) => session.id));
          const nextWorkspaces = Object.fromEntries(
            Object.entries(state.workspaces).map(([surfaceId, workspace]) => {
              if (!workspace.sessionId || sessionIds.has(workspace.sessionId)) {
                return [surfaceId, workspace];
              }
              return [surfaceId, markWorkspaceForReconnect(workspace)];
            })
          );

          return {
            sessions,
            activeSessionId:
              state.activeSessionId && sessionIds.has(state.activeSessionId)
                ? state.activeSessionId
                : null,
            workspaces: nextWorkspaces,
          };
        }),

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
        })),

      removeSession: (sessionId) =>
        set((state) => {
          const nextWorkspaces = Object.fromEntries(
            Object.entries(state.workspaces).map(([surfaceId, workspace]) => {
              if (workspace.sessionId !== sessionId) {
                return [surfaceId, workspace];
              }
              return [surfaceId, markWorkspaceForReconnect(workspace)];
            })
          );

          return {
            sessions: state.sessions.filter((s) => s.id !== sessionId),
            activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
            // Also remove from mappings
            sessionEnvMappings: state.sessionEnvMappings.filter(
              (m) => m.jupyterSessionId !== sessionId
            ),
            workspaces: nextWorkspaces,
          };
        }),

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

      // Workspace recovery
      upsertWorkspace: (snapshot) => {
        const nextSnapshot = createWorkspaceSnapshot(snapshot, get().workspaces[snapshot.surfaceId]);
        set((state) => ({
          workspaces: pruneWorkspaceSnapshots({
            ...state.workspaces,
            [snapshot.surfaceId]: nextSnapshot,
          }),
        }));
        return nextSnapshot;
      },

      removeWorkspace: (surfaceId) =>
        set((state) => {
          const nextWorkspaces = { ...state.workspaces };
          delete nextWorkspaces[surfaceId];
          return { workspaces: nextWorkspaces };
        }),

      getWorkspace: (surfaceId) => {
        return get().workspaces[surfaceId] ?? null;
      },

      setWorkspaceRecoveryState: (surfaceId, recoveryStatus, recoveryError = null) =>
        set((state) => {
          const existing = state.workspaces[surfaceId];
          if (!existing) return state;
          return {
            workspaces: {
              ...state.workspaces,
              [surfaceId]: {
                ...existing,
                recoveryStatus,
                recoveryError,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      markWorkspacesForReconnectByKernelId: (kernelId, recoveryError = null) =>
        set((state) => ({
          workspaces: Object.fromEntries(
            Object.entries(state.workspaces).map(([surfaceId, workspace]) => {
              if (workspace.kernelId !== kernelId) {
                return [surfaceId, workspace];
              }
              return [surfaceId, markWorkspaceForReconnect(workspace, recoveryError)];
            })
          ),
        })),

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
        // Only persist mappings, recovery workspaces, and trimmed history
        sessionEnvMappings: state.sessionEnvMappings,
        executionHistory: state.executionHistory.slice(0, 100), // Limit persisted history
        workspaces: state.workspaces,
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

