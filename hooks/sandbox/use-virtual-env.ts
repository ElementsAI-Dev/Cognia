/**
 * useVirtualEnv Hook - React hook for virtual environment management
 *
 * Provides a convenient interface for:
 * - Creating/deleting virtual environments
 * - Managing packages
 * - Running commands in environments
 * - Project environment configuration
 */

import { useCallback, useEffect, useRef } from 'react';
import { useVirtualEnvStore, selectActiveEnv } from '@/stores/system';
import {
  virtualEnvService,
  isEnvironmentAvailable,
} from '@/lib/native/environment';
import type {
  VirtualEnvInfo,
  CreateVirtualEnvOptions,
  VirtualEnvProgress,
  PackageInfo,
  ProjectEnvConfig,
  EnvFilterOptions,
  RequirementEntry,
} from '@/types/system/environment';
import {
  createDefaultProjectEnvConfig,
  parseRequirements,
  generateRequirements,
  filterEnvironments,
} from '@/types/system/environment';

export interface UseVirtualEnvReturn {
  // State
  environments: VirtualEnvInfo[];
  filteredEnvironments: VirtualEnvInfo[];
  activeEnv: VirtualEnvInfo | undefined;
  activeEnvId: string | null;
  progress: VirtualEnvProgress | null;
  isCreating: boolean;
  isInstalling: boolean;
  isDeleting: boolean;
  isExporting: boolean;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  availablePythonVersions: string[];
  selectedEnvPackages: PackageInfo[];
  projectConfigs: ProjectEnvConfig[];
  filterOptions: EnvFilterOptions;
  selectedEnvIds: string[];

  // Environment actions
  refreshEnvironments: () => Promise<void>;
  createEnvironment: (options: CreateVirtualEnvOptions) => Promise<VirtualEnvInfo | null>;
  deleteEnvironment: (id: string) => Promise<boolean>;
  deleteEnvironments: (ids: string[]) => Promise<boolean>;
  activateEnvironment: (id: string) => void;
  deactivateEnvironment: () => void;
  cloneEnvironment: (id: string, newName: string) => Promise<VirtualEnvInfo | null>;

  // Package actions
  loadPackages: (envPath: string, useCache?: boolean) => Promise<PackageInfo[]>;
  installPackages: (envPath: string, packages: string[], upgrade?: boolean) => Promise<boolean>;
  uninstallPackages: (envPath: string, packages: string[]) => Promise<boolean>;
  upgradeAllPackages: (envPath: string) => Promise<boolean>;

  // Requirements.txt actions
  exportRequirements: (envPath: string, options?: { pinVersions?: boolean }) => Promise<string>;
  importRequirements: (envPath: string, content: string) => Promise<boolean>;
  parseRequirementsFile: (content: string) => RequirementEntry[];

  // Command execution
  runCommand: (envPath: string, command: string, cwd?: string) => Promise<string>;

  // Python version management
  refreshPythonVersions: () => Promise<void>;
  installPythonVersion: (version: string) => Promise<boolean>;

  // Filter and selection
  setFilter: (options: Partial<EnvFilterOptions>) => void;
  clearFilters: () => void;
  selectEnv: (id: string) => void;
  deselectEnv: (id: string) => void;
  toggleEnvSelection: (id: string) => void;
  selectAllEnvs: () => void;
  deselectAllEnvs: () => void;

  // Project config
  getProjectConfig: (projectPath: string) => ProjectEnvConfig | undefined;
  setProjectEnv: (projectPath: string, envId: string) => void;
  createProjectConfig: (projectPath: string, projectName: string) => ProjectEnvConfig;
  updateProjectConfig: (id: string, updates: Partial<ProjectEnvConfig>) => void;
  removeProjectConfig: (id: string) => void;

  // Error handling
  clearError: () => void;
}

export function useVirtualEnv(): UseVirtualEnvReturn {
  const {
    environments,
    activeEnvId,
    progress,
    isCreating,
    isInstalling,
    isDeleting,
    isExporting,
    isLoading,
    error,
    availablePythonVersions,
    selectedEnvPackages,
    projectConfigs,
    filterOptions,
    selectedEnvIds,
    setEnvironments,
    addEnvironment,
    removeEnvironment,
    removeEnvironments,
    setActiveEnv,
    setProgress,
    setCreating,
    setInstalling,
    setDeleting,
    setExporting,
    setLoading,
    setError,
    clearError,
    setAvailablePythonVersions,
    setSelectedEnvPackages,
    cachePackages,
    getCachedPackages,
    clearPackageCache,
    setFilterOptions,
    clearFilters,
    selectEnv,
    deselectEnv,
    toggleEnvSelection,
    selectAllEnvs,
    deselectAllEnvs,
    addProjectConfig,
    updateProjectConfig,
    removeProjectConfig,
    getProjectConfig,
  } = useVirtualEnvStore();

  const unlistenRef = useRef<(() => void) | null>(null);
  const isAvailable = isEnvironmentAvailable();

  // Get active environment
  const activeEnv = useVirtualEnvStore(selectActiveEnv);

  // Set up progress listener
  useEffect(() => {
    if (!isAvailable) return;

    const setupListener = async () => {
      unlistenRef.current = await virtualEnvService.onProgress(
        (progressEvent: VirtualEnvProgress) => {
          setProgress(progressEvent);

          if (progressEvent.stage === 'done') {
            setCreating(false);
            setInstalling(false);
          } else if (progressEvent.stage === 'error') {
            setCreating(false);
            setInstalling(false);
            setError(progressEvent.error || 'Operation failed');
          }
        }
      );
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [isAvailable, setProgress, setCreating, setInstalling, setError]);

  // Refresh environments list
  const refreshEnvironments = useCallback(async () => {
    if (!isAvailable) return;

    setLoading(true);
    setError(null);

    try {
      const envs = await virtualEnvService.list();
      setEnvironments(envs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAvailable, setLoading, setError, setEnvironments]);

  // Create environment
  const createEnvironment = useCallback(
    async (options: CreateVirtualEnvOptions): Promise<VirtualEnvInfo | null> => {
      if (!isAvailable) return null;

      setCreating(true);
      setError(null);

      try {
        const env = await virtualEnvService.create(options);
        addEnvironment(env);

        // If project path specified, update project config
        if (options.projectPath) {
          const existingConfig = getProjectConfig(options.projectPath);
          if (existingConfig) {
            updateProjectConfig(existingConfig.id, {
              virtualEnvId: env.id,
              virtualEnvPath: env.path,
            });
          }
        }

        return env;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setCreating(false);
      }
    },
    [isAvailable, setCreating, setError, addEnvironment, getProjectConfig, updateProjectConfig]
  );

  // Delete environment
  const deleteEnvironmentFn = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAvailable) return false;

      const env = environments.find((e) => e.id === id);
      if (!env) return false;

      setDeleting(true);
      try {
        await virtualEnvService.delete(env.path);
        removeEnvironment(id);
        clearPackageCache(env.path);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [isAvailable, environments, removeEnvironment, setError, setDeleting, clearPackageCache]
  );

  // Batch delete environments
  const deleteEnvironmentsFn = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (!isAvailable || ids.length === 0) return false;

      setDeleting(true);
      let allSuccess = true;

      try {
        for (const id of ids) {
          const env = environments.find((e) => e.id === id);
          if (env) {
            try {
              await virtualEnvService.delete(env.path);
              clearPackageCache(env.path);
            } catch {
              allSuccess = false;
            }
          }
        }
        removeEnvironments(ids);
        return allSuccess;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [isAvailable, environments, removeEnvironments, setError, setDeleting, clearPackageCache]
  );

  // Clone environment
  const cloneEnvironment = useCallback(
    async (id: string, newName: string): Promise<VirtualEnvInfo | null> => {
      if (!isAvailable) return null;

      const sourceEnv = environments.find((e) => e.id === id);
      if (!sourceEnv) return null;

      try {
        // Load packages from source
        const packages = await virtualEnvService.listPackages(sourceEnv.path);
        const packageNames = packages.map((p) => `${p.name}==${p.version}`);

        // Create new environment with same config
        const newEnv = await createEnvironment({
          name: newName,
          type: sourceEnv.type,
          pythonVersion: sourceEnv.pythonVersion || undefined,
          packages: packageNames,
        });

        return newEnv;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [isAvailable, environments, createEnvironment, setError]
  );

  // Activate environment
  const activateEnvironment = useCallback(
    (id: string) => {
      setActiveEnv(id);
    },
    [setActiveEnv]
  );

  // Deactivate environment
  const deactivateEnvironment = useCallback(() => {
    setActiveEnv(null);
  }, [setActiveEnv]);

  // Load packages with optional caching
  const loadPackages = useCallback(
    async (envPath: string, useCache = false): Promise<PackageInfo[]> => {
      if (!isAvailable) return [];

      // Check cache first
      if (useCache) {
        const cached = getCachedPackages(envPath);
        if (cached) {
          setSelectedEnvPackages(cached);
          return cached;
        }
      }

      try {
        const packages = await virtualEnvService.listPackages(envPath);
        setSelectedEnvPackages(packages);
        cachePackages(envPath, packages);
        return packages;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return [];
      }
    },
    [isAvailable, setSelectedEnvPackages, setError, getCachedPackages, cachePackages]
  );

  // Install packages
  const installPackagesInEnv = useCallback(
    async (envPath: string, packages: string[], upgrade?: boolean): Promise<boolean> => {
      if (!isAvailable) return false;

      setInstalling(true);
      setError(null);

      try {
        await virtualEnvService.installPackages(envPath, packages, upgrade);
        // Refresh packages list and update cache
        clearPackageCache(envPath);
        await loadPackages(envPath);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setInstalling(false);
      }
    },
    [isAvailable, setInstalling, setError, loadPackages, clearPackageCache]
  );

  // Uninstall packages
  const uninstallPackages = useCallback(
    async (envPath: string, packages: string[]): Promise<boolean> => {
      if (!isAvailable || packages.length === 0) return false;

      setInstalling(true);
      setError(null);

      try {
        const command = `pip uninstall -y ${packages.join(' ')}`;
        await virtualEnvService.runCommand(envPath, command);
        // Refresh packages list and update cache
        clearPackageCache(envPath);
        await loadPackages(envPath);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setInstalling(false);
      }
    },
    [isAvailable, setInstalling, setError, loadPackages, clearPackageCache]
  );

  // Upgrade all packages
  const upgradeAllPackages = useCallback(
    async (envPath: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setInstalling(true);
      setError(null);

      try {
        // Get current packages
        const packages = await virtualEnvService.listPackages(envPath);
        const packageNames = packages.map((p) => p.name);
        
        if (packageNames.length > 0) {
          await virtualEnvService.installPackages(envPath, packageNames, true);
        }
        
        // Refresh packages list
        clearPackageCache(envPath);
        await loadPackages(envPath);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setInstalling(false);
      }
    },
    [isAvailable, setInstalling, setError, loadPackages, clearPackageCache]
  );

  // Export requirements.txt
  const exportRequirements = useCallback(
    async (envPath: string, options?: { pinVersions?: boolean }): Promise<string> => {
      if (!isAvailable) return '';

      setExporting(true);
      try {
        const packages = await virtualEnvService.listPackages(envPath);
        const content = generateRequirements(packages, {
          pinVersions: options?.pinVersions ?? true,
          includeComments: true,
        });
        return content;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return '';
      } finally {
        setExporting(false);
      }
    },
    [isAvailable, setExporting, setError]
  );

  // Import requirements.txt
  const importRequirements = useCallback(
    async (envPath: string, content: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setInstalling(true);
      setError(null);

      try {
        const entries = parseRequirements(content);
        const packages = entries
          .filter((e) => !e.isEditable)
          .map((e) => e.version ? `${e.name}${e.version}` : e.name);

        if (packages.length > 0) {
          await virtualEnvService.installPackages(envPath, packages, false);
        }

        clearPackageCache(envPath);
        await loadPackages(envPath);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setInstalling(false);
      }
    },
    [isAvailable, setInstalling, setError, loadPackages, clearPackageCache]
  );

  // Parse requirements file helper
  const parseRequirementsFile = useCallback((content: string): RequirementEntry[] => {
    return parseRequirements(content);
  }, []);

  // Run command
  const runCommand = useCallback(
    async (envPath: string, command: string, cwd?: string): Promise<string> => {
      if (!isAvailable) {
        throw new Error('Virtual environment management requires Tauri environment');
      }

      try {
        return await virtualEnvService.runCommand(envPath, command, cwd);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [isAvailable, setError]
  );

  // Refresh Python versions
  const refreshPythonVersions = useCallback(async () => {
    if (!isAvailable) return;

    try {
      const versions = await virtualEnvService.getAvailablePythonVersions();
      setAvailablePythonVersions(versions);
    } catch {
      // Use default versions on error
      setAvailablePythonVersions(['3.12', '3.11', '3.10', '3.9']);
    }
  }, [isAvailable, setAvailablePythonVersions]);

  // Install Python version
  const installPythonVersionFn = useCallback(
    async (version: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setInstalling(true);
      setError(null);

      try {
        await virtualEnvService.installPythonVersion(version);
        await refreshPythonVersions();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setInstalling(false);
      }
    },
    [isAvailable, setInstalling, setError, refreshPythonVersions]
  );

  // Set project environment
  const setProjectEnv = useCallback(
    (projectPath: string, envId: string) => {
      const config = getProjectConfig(projectPath);
      const env = environments.find((e) => e.id === envId);

      if (config && env) {
        updateProjectConfig(config.id, {
          virtualEnvId: envId,
          virtualEnvPath: env.path,
        });
      }
    },
    [getProjectConfig, environments, updateProjectConfig]
  );

  // Create project config
  const createProjectConfigFn = useCallback(
    (projectPath: string, projectName: string): ProjectEnvConfig => {
      const existing = getProjectConfig(projectPath);
      if (existing) return existing;

      const config = createDefaultProjectEnvConfig(projectPath, projectName);
      addProjectConfig(config);
      return config;
    },
    [getProjectConfig, addProjectConfig]
  );

  // Computed filtered environments
  const filteredEnvironments = filterEnvironments(environments, filterOptions);

  return {
    // State
    environments,
    filteredEnvironments,
    activeEnv,
    activeEnvId,
    progress,
    isCreating,
    isInstalling,
    isDeleting,
    isExporting,
    isLoading,
    error,
    isAvailable,
    availablePythonVersions,
    selectedEnvPackages,
    projectConfigs,
    filterOptions,
    selectedEnvIds,

    // Environment actions
    refreshEnvironments,
    createEnvironment,
    deleteEnvironment: deleteEnvironmentFn,
    deleteEnvironments: deleteEnvironmentsFn,
    activateEnvironment,
    deactivateEnvironment,
    cloneEnvironment,

    // Package actions
    loadPackages,
    installPackages: installPackagesInEnv,
    uninstallPackages,
    upgradeAllPackages,

    // Requirements.txt actions
    exportRequirements,
    importRequirements,
    parseRequirementsFile,

    // Command execution
    runCommand,

    // Python version management
    refreshPythonVersions,
    installPythonVersion: installPythonVersionFn,

    // Filter and selection
    setFilter: setFilterOptions,
    clearFilters,
    selectEnv,
    deselectEnv,
    toggleEnvSelection,
    selectAllEnvs,
    deselectAllEnvs,

    // Project config
    getProjectConfig,
    setProjectEnv,
    createProjectConfig: createProjectConfigFn,
    updateProjectConfig,
    removeProjectConfig,

    // Error handling
    clearError,
  };
}

export default useVirtualEnv;
