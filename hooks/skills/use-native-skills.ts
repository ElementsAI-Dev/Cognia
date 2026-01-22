/**
 * Native Skills Hook - Integration with Tauri skill service
 *
 * Provides React hooks for interacting with the native skill service
 * for repository-based skill discovery, installation, and management.
 */

import { useState, useCallback, useEffect } from 'react';
import * as nativeSkill from '@/lib/native/skill';
import type {
  SkillRepo,
  DiscoverableSkill,
  InstalledSkill,
  NativeSkill,
  LocalSkill,
} from '@/lib/native/skill';

export type { SkillRepo, DiscoverableSkill, InstalledSkill, NativeSkill, LocalSkill };

interface UseNativeSkillsState {
  repos: SkillRepo[];
  discoverable: DiscoverableSkill[];
  installed: InstalledSkill[];
  local: LocalSkill[];
  allSkills: NativeSkill[];
  isLoading: boolean;
  isDiscovering: boolean;
  error: string | null;
}

interface UseNativeSkillsActions {
  // Repository management
  refreshRepos: () => Promise<void>;
  addRepo: (owner: string, name: string, branch?: string) => Promise<void>;
  removeRepo: (owner: string, name: string) => Promise<void>;
  toggleRepo: (owner: string, name: string, enabled: boolean) => Promise<void>;

  // Discovery
  discover: () => Promise<void>;
  refreshAll: () => Promise<void>;
  scanLocal: () => Promise<void>;

  // Installation
  install: (skill: DiscoverableSkill) => Promise<InstalledSkill>;
  installLocal: (sourcePath: string, name?: string) => Promise<InstalledSkill>;
  registerLocal: (directory: string) => Promise<InstalledSkill>;
  uninstall: (id: string) => Promise<void>;

  // State management
  enable: (id: string) => Promise<void>;
  disable: (id: string) => Promise<void>;
  update: (id: string, category?: string, tags?: string[]) => Promise<void>;

  // Content
  readContent: (directory: string) => Promise<string>;
  listResources: (directory: string) => Promise<string[]>;
  readResource: (directory: string, resourcePath: string) => Promise<string>;
  getSsotDir: () => Promise<string>;

  // Error handling
  clearError: () => void;
}

export type UseNativeSkillsReturn = UseNativeSkillsState & UseNativeSkillsActions;

/**
 * Hook for native skill management
 */
export function useNativeSkills(): UseNativeSkillsReturn {
  const [state, setState] = useState<UseNativeSkillsState>({
    repos: [],
    discoverable: [],
    installed: [],
    local: [],
    allSkills: [],
    isLoading: false,
    isDiscovering: false,
    error: null,
  });

  const isAvailable = nativeSkill.isNativeSkillAvailable();

  // Initialize on mount
  useEffect(() => {
    if (!isAvailable) return;

    const init = async () => {
      try {
        const [repos, installed] = await Promise.all([
          nativeSkill.listSkillRepos(),
          nativeSkill.getInstalledSkills(),
        ]);
        setState((s) => ({ ...s, repos, installed }));
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
      }
    };

    init();
  }, [isAvailable]);

  // Repository management
  const refreshRepos = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const repos = await nativeSkill.listSkillRepos();
      setState((s) => ({ ...s, repos }));
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
    }
  }, [isAvailable]);

  const addRepo = useCallback(
    async (owner: string, name: string, branch?: string) => {
      if (!isAvailable) return;
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        await nativeSkill.addSkillRepo(owner, name, branch);
        await refreshRepos();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshRepos]
  );

  const removeRepo = useCallback(
    async (owner: string, name: string) => {
      if (!isAvailable) return;
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        await nativeSkill.removeSkillRepo(owner, name);
        await refreshRepos();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshRepos]
  );

  const toggleRepo = useCallback(
    async (owner: string, name: string, enabled: boolean) => {
      if (!isAvailable) return;
      try {
        await nativeSkill.toggleSkillRepo(owner, name, enabled);
        await refreshRepos();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      }
    },
    [isAvailable, refreshRepos]
  );

  // Discovery
  const discover = useCallback(async () => {
    if (!isAvailable) return;
    try {
      setState((s) => ({ ...s, isDiscovering: true, error: null }));
      const discoverable = await nativeSkill.discoverSkills();
      setState((s) => ({ ...s, discoverable }));
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
    } finally {
      setState((s) => ({ ...s, isDiscovering: false }));
    }
  }, [isAvailable]);

  const refreshInstalled = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const installed = await nativeSkill.getInstalledSkills();
      setState((s) => ({ ...s, installed }));
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
    }
  }, [isAvailable]);

  const refreshAll = useCallback(async () => {
    if (!isAvailable) return;
    try {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      const allSkills = await nativeSkill.getAllSkills();
      setState((s) => ({ ...s, allSkills }));
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [isAvailable]);

  const scanLocal = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const local = await nativeSkill.scanLocalSkills();
      setState((s) => ({ ...s, local }));
    } catch (error) {
      setState((s) => ({ ...s, error: String(error) }));
    }
  }, [isAvailable]);

  // Installation
  const install = useCallback(
    async (skill: DiscoverableSkill): Promise<InstalledSkill> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        const installed = await nativeSkill.installSkill(skill);
        await refreshInstalled();
        return installed;
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshInstalled]
  );

  const installLocal = useCallback(
    async (sourcePath: string, name?: string): Promise<InstalledSkill> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        const installed = await nativeSkill.installLocalSkill(sourcePath, name);
        await refreshInstalled();
        return installed;
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshInstalled]
  );

  const registerLocal = useCallback(
    async (directory: string): Promise<InstalledSkill> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        const installed = await nativeSkill.registerLocalSkill(directory);
        await refreshInstalled();
        await scanLocal();
        return installed;
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshInstalled, scanLocal]
  );

  const uninstall = useCallback(
    async (id: string) => {
      if (!isAvailable) return;
      try {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        await nativeSkill.uninstallSkill(id);
        await refreshInstalled();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      } finally {
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [isAvailable, refreshInstalled]
  );

  // State management
  const enable = useCallback(
    async (id: string) => {
      if (!isAvailable) return;
      try {
        await nativeSkill.enableSkill(id);
        await refreshInstalled();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      }
    },
    [isAvailable, refreshInstalled]
  );

  const disable = useCallback(
    async (id: string) => {
      if (!isAvailable) return;
      try {
        await nativeSkill.disableSkill(id);
        await refreshInstalled();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      }
    },
    [isAvailable, refreshInstalled]
  );

  const update = useCallback(
    async (id: string, category?: string, tags?: string[]) => {
      if (!isAvailable) return;
      try {
        await nativeSkill.updateSkill(id, category, tags);
        await refreshInstalled();
      } catch (error) {
        setState((s) => ({ ...s, error: String(error) }));
        throw error;
      }
    },
    [isAvailable, refreshInstalled]
  );

  // Content
  const readContent = useCallback(
    async (directory: string): Promise<string> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      return nativeSkill.readSkillContent(directory);
    },
    [isAvailable]
  );

  const listResources = useCallback(
    async (directory: string): Promise<string[]> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      return nativeSkill.listSkillResources(directory);
    },
    [isAvailable]
  );

  const readResource = useCallback(
    async (directory: string, resourcePath: string): Promise<string> => {
      if (!isAvailable) throw new Error('Native skill service not available');
      return nativeSkill.readSkillResource(directory, resourcePath);
    },
    [isAvailable]
  );

  const getSsotDir = useCallback(async (): Promise<string> => {
    if (!isAvailable) throw new Error('Native skill service not available');
    return nativeSkill.getSkillSsotDir();
  }, [isAvailable]);

  // Error handling
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    refreshRepos,
    addRepo,
    removeRepo,
    toggleRepo,
    discover,
    refreshAll,
    scanLocal,
    install,
    installLocal,
    registerLocal,
    uninstall,
    enable,
    disable,
    update,
    readContent,
    listResources,
    readResource,
    getSsotDir,
    clearError,
  };
}

/**
 * Hook for checking native skill availability
 */
export function useNativeSkillAvailable(): boolean {
  // Initialize directly since this is a synchronous check
  return nativeSkill.isNativeSkillAvailable();
}
