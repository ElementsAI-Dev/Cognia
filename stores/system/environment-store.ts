/**
 * Environment Store - Zustand store for managing development environment tools
 *
 * Manages state for:
 * - uv (Python package manager)
 * - nvm (Node.js version manager)
 * - Docker (container runtime)
 * - Podman (container runtime)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EnvironmentTool,
  ToolStatus,
  InstallProgress,
  Platform,
  PythonEnvironment,
  NodeEnvironment,
} from '@/types/system/environment';
import { createDefaultToolStatus } from '@/types/system/environment';

export interface EnvironmentState {
  // Platform info
  platform: Platform;

  // Tool statuses
  tools: Record<EnvironmentTool, ToolStatus>;

  // Installation progress (when installing)
  installProgress: InstallProgress | null;

  // Python environment (managed by uv)
  pythonEnv: PythonEnvironment | null;

  // Node.js environment (managed by nvm)
  nodeEnv: NodeEnvironment | null;

  // Loading states
  isRefreshing: boolean;
  isInstalling: boolean;

  // Error state
  globalError: string | null;

  // Last refresh timestamp
  lastRefreshed: string | null;
}

export interface EnvironmentActions {
  // Platform
  setPlatform: (platform: Platform) => void;

  // Tool status actions
  setToolStatus: (tool: EnvironmentTool, status: Partial<ToolStatus>) => void;
  setAllToolStatuses: (statuses: Record<EnvironmentTool, ToolStatus>) => void;

  // Installation actions
  setInstallProgress: (progress: InstallProgress | null) => void;
  startInstallation: (tool: EnvironmentTool) => void;
  completeInstallation: (tool: EnvironmentTool, success: boolean, error?: string) => void;

  // Environment info
  setPythonEnv: (env: PythonEnvironment | null) => void;
  setNodeEnv: (env: NodeEnvironment | null) => void;

  // Loading states
  setRefreshing: (isRefreshing: boolean) => void;
  setInstalling: (isInstalling: boolean) => void;

  // Error handling
  setGlobalError: (error: string | null) => void;
  clearError: () => void;

  // Refresh
  setLastRefreshed: (timestamp: string) => void;

  // Reset
  reset: () => void;
}

const initialState: EnvironmentState = {
  platform: 'unknown',
  tools: {
    uv: createDefaultToolStatus('uv'),
    nvm: createDefaultToolStatus('nvm'),
    docker: createDefaultToolStatus('docker'),
    podman: createDefaultToolStatus('podman'),
    ffmpeg: createDefaultToolStatus('ffmpeg'),
  },
  installProgress: null,
  pythonEnv: null,
  nodeEnv: null,
  isRefreshing: false,
  isInstalling: false,
  globalError: null,
  lastRefreshed: null,
};

export const useEnvironmentStore = create<EnvironmentState & EnvironmentActions>()(
  persist(
    (set) => ({
      ...initialState,

      setPlatform: (platform) => set({ platform }),

      setToolStatus: (tool, status) =>
        set((state) => ({
          tools: {
            ...state.tools,
            [tool]: {
              ...state.tools[tool],
              ...status,
              lastChecked: new Date().toISOString(),
            },
          },
        })),

      setAllToolStatuses: (statuses) =>
        set({
          tools: statuses,
          lastRefreshed: new Date().toISOString(),
        }),

      setInstallProgress: (progress) => set({ installProgress: progress }),

      startInstallation: (tool) =>
        set((state) => ({
          isInstalling: true,
          installProgress: {
            tool,
            stage: 'downloading',
            progress: 0,
            message: `Starting ${tool} installation...`,
            error: null,
          },
          tools: {
            ...state.tools,
            [tool]: {
              ...state.tools[tool],
              status: 'installing',
              error: null,
            },
          },
        })),

      completeInstallation: (tool, success, error) =>
        set((state) => ({
          isInstalling: false,
          installProgress: success
            ? {
                tool,
                stage: 'done',
                progress: 100,
                message: `${tool} installed successfully!`,
                error: null,
              }
            : {
                tool,
                stage: 'error',
                progress: 0,
                message: `Failed to install ${tool}`,
                error: error || 'Unknown error',
              },
          tools: {
            ...state.tools,
            [tool]: {
              ...state.tools[tool],
              status: success ? 'installed' : 'error',
              installed: success,
              error: success ? null : error || 'Installation failed',
            },
          },
        })),

      setPythonEnv: (pythonEnv) => set({ pythonEnv }),

      setNodeEnv: (nodeEnv) => set({ nodeEnv }),

      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      setInstalling: (isInstalling) => set({ isInstalling }),

      setGlobalError: (globalError) => set({ globalError }),

      clearError: () =>
        set((state) => ({
          globalError: null,
          tools: Object.fromEntries(
            Object.entries(state.tools).map(([key, tool]) => [key, { ...tool, error: null }])
          ) as Record<EnvironmentTool, ToolStatus>,
        })),

      setLastRefreshed: (lastRefreshed) => set({ lastRefreshed }),

      reset: () => set(initialState),
    }),
    {
      name: 'environment-store',
      partialize: (state) => ({
        platform: state.platform,
        tools: state.tools,
        pythonEnv: state.pythonEnv,
        nodeEnv: state.nodeEnv,
        lastRefreshed: state.lastRefreshed,
      }),
    }
  )
);

// Selector hooks for better performance
export const useEnvironmentPlatform = () => useEnvironmentStore((state) => state.platform);

export const useToolStatus = (tool: EnvironmentTool) =>
  useEnvironmentStore((state) => state.tools[tool]);

export const useInstallProgress = () => useEnvironmentStore((state) => state.installProgress);

export const useIsToolInstalled = (tool: EnvironmentTool) =>
  useEnvironmentStore((state) => state.tools[tool].installed);

export const useEnvironmentRefreshing = () => useEnvironmentStore((state) => state.isRefreshing);

export const useEnvironmentInstalling = () => useEnvironmentStore((state) => state.isInstalling);
