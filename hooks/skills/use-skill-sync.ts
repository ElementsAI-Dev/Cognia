/**
 * Skill Sync Hook - Bridges native skill service with frontend skill store
 *
 * Provides synchronization between the Rust backend skill service and
 * the frontend Zustand skill store for unified skill management.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useNativeSkills, type DiscoverableSkill, type InstalledSkill } from './use-native-skills';
import * as nativeSkill from '@/lib/native/skill';
import type { Skill, CreateSkillInput } from '@/types/system/skill';

interface UseSkillSyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  discoverable: DiscoverableSkill[];
  isDiscovering: boolean;
}

interface UseSkillSyncActions {
  syncFromNative: () => Promise<void>;
  syncToNative: () => Promise<void>;
  installFromRepo: (skill: DiscoverableSkill) => Promise<Skill | null>;
  uninstallNativeSkill: (nativeId: string) => Promise<void>;
  discoverFromRepos: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export type UseSkillSyncReturn = UseSkillSyncState & UseSkillSyncActions;

/**
 * Convert native installed skill to frontend skill format
 */
function nativeToFrontendSkill(native: InstalledSkill, content?: string): CreateSkillInput {
  return {
    name: native.name,
    description: native.description || '',
    content: content || `# ${native.name}\n\n${native.description || 'Skill from repository'}`,
    category: (native.category as CreateSkillInput['category']) || 'custom',
    tags: native.tags,
    version: '1.0.0',
    author: native.repoOwner || undefined,
  };
}

/**
 * Hook for synchronizing skills between native backend and frontend store
 */
export function useSkillSync(): UseSkillSyncReturn {
  const [state, setState] = useState<UseSkillSyncState>({
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
    discoverable: [],
    isDiscovering: false,
  });

  const {
    repos: _repos,
    installed: nativeInstalled,
    discover,
    install: nativeInstall,
    uninstall: nativeUninstall,
    readContent,
    isDiscovering: nativeIsDiscovering,
    discoverable: nativeDiscoverable,
    error: nativeError,
  } = useNativeSkills();

  const {
    skills: frontendSkills,
    createSkill,
    deleteSkill,
    getAllSkills,
  } = useSkillStore();

  const isNativeAvailable = nativeSkill.isNativeSkillAvailable();

  // Update discoverable when native changes
  useEffect(() => {
    setState((s) => ({
      ...s,
      discoverable: nativeDiscoverable,
      isDiscovering: nativeIsDiscovering,
    }));
  }, [nativeDiscoverable, nativeIsDiscovering]);

  // Sync error from native
  useEffect(() => {
    if (nativeError) {
      setState((s) => ({ ...s, syncError: nativeError }));
    }
  }, [nativeError]);

  /**
   * Sync skills from native backend to frontend store
   * Creates frontend skills for any native skills not already present
   */
  const syncFromNative = useCallback(async () => {
    if (!isNativeAvailable) return;

    setState((s) => ({ ...s, isSyncing: true, syncError: null }));

    try {
      const nativeIdMap = new Map<string, InstalledSkill>();

      // Build map of native skills by their ID
      for (const native of nativeInstalled) {
        nativeIdMap.set(native.id, native);
      }

      // Find native skills not in frontend
      for (const native of nativeInstalled) {
        // Check if already exists (by matching native ID in metadata or name)
        const existsInFrontend = Object.values(frontendSkills).some(
          (fs) =>
            fs.metadata.name === native.name ||
            (fs as Skill & { nativeId?: string }).nativeId === native.id
        );

        if (!existsInFrontend && native.enabled) {
          // Read content from native
          let content = '';
          try {
            content = await readContent(native.directory);
          } catch {
            content = `# ${native.name}\n\n${native.description || ''}`;
          }

          // Create in frontend store
          const input = nativeToFrontendSkill(native, content);
          createSkill(input);
        }
      }

      setState((s) => ({
        ...s,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isSyncing: false,
        syncError: String(error),
      }));
    }
  }, [isNativeAvailable, nativeInstalled, frontendSkills, readContent, createSkill]);

  /**
   * Sync skills from frontend store to native backend
   * Installs custom frontend skills to native SSOT
   */
  const syncToNative = useCallback(async () => {
    if (!isNativeAvailable) return;

    setState((s) => ({ ...s, isSyncing: true, syncError: null }));

    try {
      // Note: nativeInstalled is used for comparison below
      const frontendList = getAllSkills();

      // Find custom frontend skills not in native
      for (const skill of frontendList) {
        if (skill.source === 'custom') {
          const existsInNative = nativeInstalled.some(
            (n) => n.name === skill.metadata.name
          );

          if (!existsInNative) {
            // Would need to create in native - but we can't easily do this
            // since native expects a directory with SKILL.md
            // This is a TODO for future implementation
            console.log(`Custom skill ${skill.metadata.name} not synced to native (not implemented)`);
          }
        }
      }

      setState((s) => ({
        ...s,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isSyncing: false,
        syncError: String(error),
      }));
    }
  }, [isNativeAvailable, nativeInstalled, getAllSkills]);

  /**
   * Install a skill from repository via native backend
   */
  const installFromRepo = useCallback(
    async (skill: DiscoverableSkill): Promise<Skill | null> => {
      if (!isNativeAvailable) {
        setState((s) => ({ ...s, syncError: 'Native skill service not available' }));
        return null;
      }

      setState((s) => ({ ...s, isSyncing: true, syncError: null }));

      try {
        // Install via native backend
        const installed = await nativeInstall(skill);

        // Read content
        let content = '';
        try {
          content = await readContent(installed.directory);
        } catch {
          content = `# ${skill.name}\n\n${skill.description}`;
        }

        // Create in frontend store
        const input = nativeToFrontendSkill(installed, content);
        const frontendSkill = createSkill(input);

        setState((s) => ({
          ...s,
          isSyncing: false,
          lastSyncAt: new Date(),
        }));

        return frontendSkill;
      } catch (error) {
        setState((s) => ({
          ...s,
          isSyncing: false,
          syncError: String(error),
        }));
        return null;
      }
    },
    [isNativeAvailable, nativeInstall, readContent, createSkill]
  );

  /**
   * Uninstall a native skill
   */
  const uninstallNativeSkill = useCallback(
    async (nativeId: string) => {
      if (!isNativeAvailable) return;

      setState((s) => ({ ...s, isSyncing: true, syncError: null }));

      try {
        // Find corresponding frontend skill
        const native = nativeInstalled.find((n) => n.id === nativeId);
        if (native) {
          const frontendSkill = Object.values(frontendSkills).find(
            (fs) => fs.metadata.name === native.name
          );
          if (frontendSkill) {
            deleteSkill(frontendSkill.id);
          }
        }

        // Uninstall from native
        await nativeUninstall(nativeId);

        setState((s) => ({
          ...s,
          isSyncing: false,
          lastSyncAt: new Date(),
        }));
      } catch (error) {
        setState((s) => ({
          ...s,
          isSyncing: false,
          syncError: String(error),
        }));
      }
    },
    [isNativeAvailable, nativeInstalled, frontendSkills, deleteSkill, nativeUninstall]
  );

  /**
   * Discover skills from all enabled repositories
   */
  const discoverFromRepos = useCallback(async () => {
    if (!isNativeAvailable) return;
    await discover();
  }, [isNativeAvailable, discover]);

  /**
   * Refresh all - discover and sync
   */
  const refreshAll = useCallback(async () => {
    await discoverFromRepos();
    await syncFromNative();
  }, [discoverFromRepos, syncFromNative]);

  return {
    ...state,
    syncFromNative,
    syncToNative,
    installFromRepo,
    uninstallNativeSkill,
    discoverFromRepos,
    refreshAll,
  };
}

/**
 * Hook to check if native skill sync is available
 */
export function useSkillSyncAvailable(): boolean {
  return nativeSkill.isNativeSkillAvailable();
}
