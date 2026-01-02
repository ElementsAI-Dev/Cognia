/**
 * Virtual Environment Store - Zustand store for managing Python virtual environments
 *
 * Manages state for:
 * - Virtual environment list
 * - Active environment
 * - Creation/installation progress
 * - Project environment configurations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  VirtualEnvInfo,
  VirtualEnvProgress,
  PackageInfo,
  ProjectEnvConfig,
  VirtualEnvStatus,
  VirtualEnvType,
  EnvFilterOptions,
  EnvHealthCheck,
} from '@/types/environment';
import { filterEnvironments } from '@/types/environment';

export interface VirtualEnvState {
  // Virtual environments
  environments: VirtualEnvInfo[];
  activeEnvId: string | null;

  // Progress tracking
  progress: VirtualEnvProgress | null;
  isCreating: boolean;
  isInstalling: boolean;
  isDeleting: boolean;
  isExporting: boolean;

  // Package management
  selectedEnvPackages: PackageInfo[];
  packageCache: Record<string, PackageInfo[]>;

  // Project configurations
  projectConfigs: ProjectEnvConfig[];

  // Available Python versions
  availablePythonVersions: string[];

  // Health checks
  healthChecks: Record<string, EnvHealthCheck>;

  // Filter state
  filterOptions: EnvFilterOptions;

  // Selection state for batch operations
  selectedEnvIds: string[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Last refresh timestamp
  lastRefreshed: string | null;
}

export interface VirtualEnvActions {
  // Environment management
  setEnvironments: (envs: VirtualEnvInfo[]) => void;
  addEnvironment: (env: VirtualEnvInfo) => void;
  updateEnvironment: (id: string, updates: Partial<VirtualEnvInfo>) => void;
  removeEnvironment: (id: string) => void;
  removeEnvironments: (ids: string[]) => void;
  setActiveEnv: (id: string | null) => void;

  // Progress
  setProgress: (progress: VirtualEnvProgress | null) => void;
  setCreating: (isCreating: boolean) => void;
  setInstalling: (isInstalling: boolean) => void;
  setDeleting: (isDeleting: boolean) => void;
  setExporting: (isExporting: boolean) => void;

  // Package management
  setSelectedEnvPackages: (packages: PackageInfo[]) => void;
  cachePackages: (envPath: string, packages: PackageInfo[]) => void;
  getCachedPackages: (envPath: string) => PackageInfo[] | null;
  clearPackageCache: (envPath?: string) => void;

  // Project configs
  setProjectConfigs: (configs: ProjectEnvConfig[]) => void;
  addProjectConfig: (config: ProjectEnvConfig) => void;
  updateProjectConfig: (id: string, updates: Partial<ProjectEnvConfig>) => void;
  removeProjectConfig: (id: string) => void;
  getProjectConfig: (projectPath: string) => ProjectEnvConfig | undefined;

  // Python versions
  setAvailablePythonVersions: (versions: string[]) => void;

  // Health checks
  setHealthCheck: (envId: string, check: EnvHealthCheck) => void;
  getHealthCheck: (envId: string) => EnvHealthCheck | null;
  clearHealthChecks: () => void;

  // Filter
  setFilterOptions: (options: Partial<EnvFilterOptions>) => void;
  clearFilters: () => void;

  // Selection for batch operations
  selectEnv: (id: string) => void;
  deselectEnv: (id: string) => void;
  selectAllEnvs: () => void;
  deselectAllEnvs: () => void;
  toggleEnvSelection: (id: string) => void;

  // Loading and error
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Refresh
  setLastRefreshed: (timestamp: string) => void;

  // Reset
  reset: () => void;
}

const initialState: VirtualEnvState = {
  environments: [],
  activeEnvId: null,
  progress: null,
  isCreating: false,
  isInstalling: false,
  isDeleting: false,
  isExporting: false,
  selectedEnvPackages: [],
  packageCache: {},
  projectConfigs: [],
  availablePythonVersions: ['3.12', '3.11', '3.10', '3.9'],
  healthChecks: {},
  filterOptions: {},
  selectedEnvIds: [],
  isLoading: false,
  error: null,
  lastRefreshed: null,
};

export const useVirtualEnvStore = create<VirtualEnvState & VirtualEnvActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Environment management
      setEnvironments: (environments) =>
        set({
          environments,
          lastRefreshed: new Date().toISOString(),
        }),

      addEnvironment: (env) =>
        set((state) => ({
          environments: [...state.environments, env],
        })),

      updateEnvironment: (id, updates) =>
        set((state) => ({
          environments: state.environments.map((env) =>
            env.id === id ? { ...env, ...updates } : env
          ),
        })),

      removeEnvironment: (id) =>
        set((state) => ({
          environments: state.environments.filter((env) => env.id !== id),
          activeEnvId: state.activeEnvId === id ? null : state.activeEnvId,
          selectedEnvIds: state.selectedEnvIds.filter((eid) => eid !== id),
        })),

      removeEnvironments: (ids) =>
        set((state) => ({
          environments: state.environments.filter((env) => !ids.includes(env.id)),
          activeEnvId: ids.includes(state.activeEnvId || '') ? null : state.activeEnvId,
          selectedEnvIds: state.selectedEnvIds.filter((eid) => !ids.includes(eid)),
        })),

      setActiveEnv: (activeEnvId) =>
        set((state) => {
          // Update status of environments
          const environments: VirtualEnvInfo[] = state.environments.map((env) => ({
            ...env,
            status: (env.id === activeEnvId ? 'active' : 'inactive') as VirtualEnvStatus,
            lastUsedAt: env.id === activeEnvId ? new Date().toISOString() : env.lastUsedAt,
          }));
          return { activeEnvId, environments };
        }),

      // Progress
      setProgress: (progress) => set({ progress }),

      setCreating: (isCreating) => set({ isCreating }),

      setInstalling: (isInstalling) => set({ isInstalling }),

      setDeleting: (isDeleting) => set({ isDeleting }),

      setExporting: (isExporting) => set({ isExporting }),

      // Package management
      setSelectedEnvPackages: (selectedEnvPackages) => set({ selectedEnvPackages }),

      cachePackages: (envPath, packages) =>
        set((state) => ({
          packageCache: { ...state.packageCache, [envPath]: packages },
        })),

      getCachedPackages: (envPath) => {
        const state = get();
        return state.packageCache[envPath] || null;
      },

      clearPackageCache: (envPath) =>
        set((state) => {
          if (envPath) {
            const { [envPath]: _, ...rest } = state.packageCache;
            return { packageCache: rest };
          }
          return { packageCache: {} };
        }),

      // Project configs
      setProjectConfigs: (projectConfigs) => set({ projectConfigs }),

      addProjectConfig: (config) =>
        set((state) => ({
          projectConfigs: [...state.projectConfigs, config],
        })),

      updateProjectConfig: (id, updates) =>
        set((state) => ({
          projectConfigs: state.projectConfigs.map((config) =>
            config.id === id
              ? { ...config, ...updates, updatedAt: new Date().toISOString() }
              : config
          ),
        })),

      removeProjectConfig: (id) =>
        set((state) => ({
          projectConfigs: state.projectConfigs.filter((config) => config.id !== id),
        })),

      getProjectConfig: (projectPath) => {
        const state = get();
        return state.projectConfigs.find((config) => config.projectPath === projectPath);
      },

      // Python versions
      setAvailablePythonVersions: (availablePythonVersions) =>
        set({ availablePythonVersions }),

      // Health checks
      setHealthCheck: (envId, check) =>
        set((state) => ({
          healthChecks: { ...state.healthChecks, [envId]: check },
        })),

      getHealthCheck: (envId) => {
        const state = get();
        return state.healthChecks[envId] || null;
      },

      clearHealthChecks: () => set({ healthChecks: {} }),

      // Filter
      setFilterOptions: (options) =>
        set((state) => ({
          filterOptions: { ...state.filterOptions, ...options },
        })),

      clearFilters: () => set({ filterOptions: {} }),

      // Selection for batch operations
      selectEnv: (id) =>
        set((state) => ({
          selectedEnvIds: state.selectedEnvIds.includes(id)
            ? state.selectedEnvIds
            : [...state.selectedEnvIds, id],
        })),

      deselectEnv: (id) =>
        set((state) => ({
          selectedEnvIds: state.selectedEnvIds.filter((eid) => eid !== id),
        })),

      selectAllEnvs: () =>
        set((state) => ({
          selectedEnvIds: state.environments.map((env) => env.id),
        })),

      deselectAllEnvs: () => set({ selectedEnvIds: [] }),

      toggleEnvSelection: (id) =>
        set((state) => ({
          selectedEnvIds: state.selectedEnvIds.includes(id)
            ? state.selectedEnvIds.filter((eid) => eid !== id)
            : [...state.selectedEnvIds, id],
        })),

      // Loading and error
      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Refresh
      setLastRefreshed: (lastRefreshed) => set({ lastRefreshed }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'virtual-env-store',
      partialize: (state) => ({
        environments: state.environments,
        activeEnvId: state.activeEnvId,
        projectConfigs: state.projectConfigs,
        availablePythonVersions: state.availablePythonVersions,
        filterOptions: state.filterOptions,
        lastRefreshed: state.lastRefreshed,
      }),
    }
  )
);

// Selectors
export const selectActiveEnv = (state: VirtualEnvState) =>
  state.environments.find((env) => env.id === state.activeEnvId);

export const selectEnvById = (state: VirtualEnvState, id: string) =>
  state.environments.find((env) => env.id === id);

export const selectEnvsByProject = (state: VirtualEnvState, projectPath: string) =>
  state.environments.filter((env) => env.projectPath === projectPath);

export const selectProjectConfigByPath = (state: VirtualEnvState, projectPath: string) =>
  state.projectConfigs.find((config) => config.projectPath === projectPath);

// Filtered selectors
export const selectFilteredEnvironments = (state: VirtualEnvState) =>
  filterEnvironments(state.environments, state.filterOptions);

export const selectEnvsByType = (state: VirtualEnvState, type: VirtualEnvType) =>
  state.environments.filter((env) => env.type === type);

export const selectEnvsByStatus = (state: VirtualEnvState, status: VirtualEnvStatus) =>
  state.environments.filter((env) => env.status === status);

export const selectSelectedEnvs = (state: VirtualEnvState) =>
  state.environments.filter((env) => state.selectedEnvIds.includes(env.id));

export const selectEnvCount = (state: VirtualEnvState) => state.environments.length;

export const selectActiveEnvCount = (state: VirtualEnvState) =>
  state.environments.filter((env) => env.status === 'active').length;

export const selectTotalPackages = (state: VirtualEnvState) =>
  state.environments.reduce((sum, env) => sum + env.packages, 0);

export const selectEnvsByPythonVersion = (state: VirtualEnvState, version: string) =>
  state.environments.filter((env) => env.pythonVersion?.startsWith(version));

export const selectRecentEnvs = (state: VirtualEnvState, limit = 5) =>
  [...state.environments]
    .sort((a, b) => {
      const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);

export const selectHasSelection = (state: VirtualEnvState) => state.selectedEnvIds.length > 0;

export const selectSelectionCount = (state: VirtualEnvState) => state.selectedEnvIds.length;

export const selectIsEnvSelected = (state: VirtualEnvState, id: string) =>
  state.selectedEnvIds.includes(id);

// Hook selectors for better performance
export const useFilteredEnvironments = () =>
  useVirtualEnvStore(selectFilteredEnvironments);

export const useSelectedEnvs = () =>
  useVirtualEnvStore(selectSelectedEnvs);

export const useEnvStats = () =>
  useVirtualEnvStore((state) => ({
    total: selectEnvCount(state),
    active: selectActiveEnvCount(state),
    packages: selectTotalPackages(state),
  }));

export const useRecentEnvs = (limit = 5) =>
  useVirtualEnvStore((state) => selectRecentEnvs(state, limit));

export default useVirtualEnvStore;
