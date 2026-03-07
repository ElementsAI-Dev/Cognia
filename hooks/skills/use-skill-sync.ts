/**
 * Skill Sync Hook - Bridges native skill service with frontend skill store
 *
 * Provides synchronization between the Rust backend skill service and
 * the frontend Zustand skill store for unified skill management.
 */

import { useCallback, useEffect, useState } from 'react';
import { createLogger } from '@/lib/logger';
import {
  buildCanonicalSkillId,
  createNativeSkillFingerprint,
  findFrontendSkillForNative,
  normalizeSkillName,
  type ReconciliationDiagnostics,
} from '@/lib/skills/reconciliation';
import { useSkillStore } from '@/stores/skills/skill-store';
import type { SkillSyncDiagnostics, SkillSyncDirection } from '@/stores/skills/skill-store';
import { useNativeSkills, type DiscoverableSkill, type InstalledSkill } from './use-native-skills';
import * as nativeSkill from '@/lib/native/skill';
import type { CreateSkillInput, Skill, SkillSyncOutcome } from '@/types/system/skill';

interface UseSkillSyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  discoverable: DiscoverableSkill[];
  isDiscovering: boolean;
  syncState: 'idle' | 'syncing' | 'ready' | 'error';
  lastSyncOutcome: SkillSyncOutcome;
  lastSyncDirection: SkillSyncDirection;
  syncDiagnostics: SkillSyncDiagnostics;
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

const skillSyncLogger = createLogger('skills:sync');

function toDiagnostics(diag: ReconciliationDiagnostics): SkillSyncDiagnostics {
  return {
    added: diag.added,
    updated: diag.updated,
    skipped: diag.skipped,
    conflicted: diag.conflicted,
  };
}

function resolveSyncOutcome(diag: ReconciliationDiagnostics, failures: number): SkillSyncOutcome {
  if (failures === 0) return 'success';
  if (diag.added > 0 || diag.updated > 0) return 'partial';
  return 'failure';
}

function toI18nErrorKey(fallback: string, value: unknown): string {
  if (typeof value === 'string' && value.startsWith('i18n:')) {
    return value;
  }
  return `i18n:${fallback}`;
}

/**
 * Convert native installed skill to frontend skill format
 */
function nativeToFrontendSkill(native: InstalledSkill, content?: string): CreateSkillInput {
  const normalizedName = normalizeSkillName(native.name);
  const now = new Date();

  return {
    name: normalizedName,
    description: native.description || '',
    content: content || `# ${native.name}\n\n${native.description || 'Skill from repository'}`,
    category: (native.category as CreateSkillInput['category']) || 'custom',
    tags: native.tags,
    version: '1.0.0',
    author: native.repoOwner || undefined,
    source: 'imported',
    status: native.enabled ? 'enabled' : 'disabled',
    nativeSkillId: native.id,
    nativeDirectory: native.directory,
    canonicalId: buildCanonicalSkillId({
      source: 'imported',
      metadata: { name: normalizedName },
      nativeSkillId: native.id,
      nativeDirectory: native.directory,
    }),
    syncOrigin: 'native',
    syncFingerprint: createNativeSkillFingerprint(native),
    lastSyncedAt: now,
    lastSyncError: null,
  };
}

/**
 * Hook for synchronizing skills between native backend and frontend store
 */
export function useSkillSync(): UseSkillSyncReturn {
  const [state, setState] = useState<Pick<UseSkillSyncState, 'isSyncing' | 'discoverable' | 'isDiscovering'>>({
    isSyncing: false,
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
    writeContent,
    writeResource,
    registerLocal,
    update: updateNative,
    isDiscovering: nativeIsDiscovering,
    discoverable: nativeDiscoverable,
    error: nativeError,
  } = useNativeSkills();

  const {
    skills: frontendSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    getAllSkills,
    setSyncMetadata,
    syncState,
    lastSyncAt,
    lastSyncDirection,
    lastSyncOutcome,
    lastSyncError,
    syncDiagnostics,
  } = useSkillStore();

  const isNativeAvailable = nativeSkill.isNativeSkillAvailable();

  const beginSync = useCallback((direction: SkillSyncDirection) => {
    setState((current) => ({ ...current, isSyncing: true }));
    setSyncMetadata({
      syncState: 'syncing',
      lastSyncDirection: direction,
      lastSyncError: null,
      lastSyncOutcome: 'idle',
    });
  }, [setSyncMetadata]);

  const endSync = useCallback((
    direction: SkillSyncDirection,
    diagnostics: ReconciliationDiagnostics,
    failures: number,
    fallbackErrorKey: string
  ) => {
    const outcome = resolveSyncOutcome(diagnostics, failures);
    const error = outcome === 'success' ? null : `i18n:${fallbackErrorKey}`;

    setSyncMetadata({
      syncState: outcome === 'success' ? 'ready' : 'error',
      lastSyncAt: new Date(),
      lastSyncDirection: direction,
      lastSyncOutcome: outcome,
      lastSyncError: error,
      syncDiagnostics: toDiagnostics(diagnostics),
    });

    skillSyncLogger.info('Skill sync completed', {
      action: 'endSync',
      direction,
      outcome,
      failures,
      diagnostics,
    });

    setState((current) => ({ ...current, isSyncing: false }));
  }, [setSyncMetadata]);

  // Update discoverable when native changes
  useEffect(() => {
    setState((current) => ({
      ...current,
      discoverable: nativeDiscoverable,
      isDiscovering: nativeIsDiscovering,
    }));
  }, [nativeDiscoverable, nativeIsDiscovering]);

  // Sync error from native
  useEffect(() => {
    if (nativeError) {
      setSyncMetadata({
        syncState: 'error',
        lastSyncError: toI18nErrorKey('syncFromNativeFailed', nativeError),
      });
    }
  }, [nativeError, setSyncMetadata]);

  /**
   * Sync skills from native backend to frontend store
   * Creates or updates frontend skills based on canonical identity and fallback matching.
   */
  const syncFromNative = useCallback(async () => {
    if (!isNativeAvailable) return;

    beginSync('from-native');

    const diagnostics: ReconciliationDiagnostics = {
      added: 0,
      updated: 0,
      skipped: 0,
      conflicted: 0,
    };
    let failures = 0;

    try {
      const nativeById = new Map(nativeInstalled.map((installed) => [installed.id, installed]));
      const nativeByDirectory = new Map(
        nativeInstalled.map((installed) => [normalizeSkillName(installed.directory), installed])
      );

      for (const native of nativeInstalled) {
        const latestSkills = useSkillStore.getState().skills;
        const match = findFrontendSkillForNative(latestSkills, native);

        // Source-aware conflict: don't hijack a pure custom skill by legacy-name match.
        if (
          match.skill
          && match.reason === 'legacy-name'
          && match.skill.source === 'custom'
          && !match.skill.nativeSkillId
        ) {
          diagnostics.conflicted += 1;
          skillSyncLogger.warn('Skipped native reconciliation due legacy-name conflict', {
            action: 'syncFromNative',
            nativeId: native.id,
            frontendSkillId: match.skill.id,
          });
          continue;
        }

        let content = '';
        try {
          content = await readContent(native.directory);
        } catch {
          content = `# ${native.name}\n\n${native.description || ''}`;
        }

        const now = new Date();

        if (match.skill) {
          updateSkill(match.skill.id, {
            metadata: {
              name: normalizeSkillName(match.skill.metadata.name || native.name),
              description: native.description || match.skill.metadata.description,
            },
            content,
            status: native.enabled ? 'enabled' : 'disabled',
            category: (native.category as Skill['category']) || match.skill.category,
            tags: native.tags,
            source: match.skill.source === 'builtin' ? 'builtin' : 'imported',
            author: native.repoOwner || match.skill.author,
            nativeSkillId: native.id,
            nativeDirectory: native.directory,
            canonicalId: buildCanonicalSkillId({
              source: match.skill.source === 'builtin' ? 'builtin' : 'imported',
              metadata: { name: match.skill.metadata.name },
              nativeSkillId: native.id,
              nativeDirectory: native.directory,
            }),
            syncOrigin: 'native',
            syncFingerprint: createNativeSkillFingerprint(native),
            lastSyncedAt: now,
            lastSyncError: null,
          });
          diagnostics.updated += 1;
          skillSyncLogger.info('Reconciled native skill to existing frontend record', {
            action: 'syncFromNative',
            nativeId: native.id,
            frontendSkillId: match.skill.id,
            reason: match.reason,
          });
          continue;
        }

        const created = createSkill(nativeToFrontendSkill(native, content));
        if (created && created.nativeSkillId === native.id) {
          diagnostics.added += 1;
          skillSyncLogger.info('Imported native skill into frontend store', {
            action: 'syncFromNative',
            nativeId: native.id,
            frontendSkillId: created.id,
          });
        } else {
          diagnostics.conflicted += 1;
          skillSyncLogger.warn('Native skill import produced conflict', {
            action: 'syncFromNative',
            nativeId: native.id,
          });
        }
      }

      // Reconciliation cleanup pass:
      // Remove/downgrade stale native-linked frontend records that no longer exist in native installed set.
      const latestSkills = Object.values(useSkillStore.getState().skills);
      for (const frontendSkill of latestSkills) {
        const hasNativeLink = Boolean(
          frontendSkill.nativeSkillId
          || frontendSkill.nativeDirectory
          || frontendSkill.syncOrigin === 'native'
          || frontendSkill.canonicalId?.startsWith('native:')
          || frontendSkill.canonicalId?.startsWith('native-dir:')
        );

        if (!hasNativeLink) {
          continue;
        }

        const nativeIdMatch = frontendSkill.nativeSkillId
          ? nativeById.has(frontendSkill.nativeSkillId)
          : false;
        const nativeDirectoryMatch = frontendSkill.nativeDirectory
          ? nativeByDirectory.has(normalizeSkillName(frontendSkill.nativeDirectory))
          : false;

        if (nativeIdMatch || nativeDirectoryMatch) {
          continue;
        }

        const now = new Date();
        if (frontendSkill.source === 'imported' || frontendSkill.syncOrigin === 'native') {
          deleteSkill(frontendSkill.id);
          diagnostics.updated += 1;
          skillSyncLogger.info('Removed stale native-owned frontend mirror', {
            action: 'syncFromNative',
            frontendSkillId: frontendSkill.id,
            nativeSkillId: frontendSkill.nativeSkillId,
            nativeDirectory: frontendSkill.nativeDirectory,
          });
          continue;
        }

        const downgradedSource = frontendSkill.source === 'builtin' ? 'builtin' : frontendSkill.source;
        updateSkill(frontendSkill.id, {
          source: downgradedSource,
          nativeSkillId: null,
          nativeDirectory: null,
          canonicalId: buildCanonicalSkillId({
            source: downgradedSource,
            metadata: frontendSkill.metadata,
          }),
          syncOrigin: downgradedSource === 'builtin' ? 'builtin' : 'frontend',
          syncFingerprint: null,
          lastSyncedAt: now,
          lastSyncError: null,
        });
        diagnostics.updated += 1;
        skillSyncLogger.info('Downgraded stale native-linked frontend skill to frontend ownership', {
          action: 'syncFromNative',
          frontendSkillId: frontendSkill.id,
          source: downgradedSource,
        });
      }
    } catch (error) {
      failures += 1;
      skillSyncLogger.error('Failed to sync from native', error as Error, {
        action: 'syncFromNative',
      });
    } finally {
      endSync('from-native', diagnostics, failures, 'syncFromNativeFailed');
    }
  }, [
    isNativeAvailable,
    beginSync,
    nativeInstalled,
    readContent,
    updateSkill,
    deleteSkill,
    createSkill,
    endSync,
  ]);

  /**
   * Sync skills from frontend store to native backend
   * Installs custom frontend skills to native SSOT.
   */
  const syncToNative = useCallback(async () => {
    if (!isNativeAvailable) return;

    beginSync('to-native');

    const diagnostics: ReconciliationDiagnostics = {
      added: 0,
      updated: 0,
      skipped: 0,
      conflicted: 0,
    };
    let failures = 0;

    try {
      const frontendList = getAllSkills();

      for (const skill of frontendList) {
        // Source-aware ownership:
        // - Built-in records are never pushed to native.
        // - Native-origin records are treated as mirrors.
        if (skill.source === 'builtin' || skill.syncOrigin === 'native') {
          diagnostics.skipped += 1;
          continue;
        }

        const directory = normalizeSkillName(skill.nativeDirectory || skill.metadata.name);
        const existsInNative = nativeInstalled.find(
          (native) => native.id === skill.nativeSkillId
            || native.directory === directory
            || normalizeSkillName(native.name) === normalizeSkillName(skill.metadata.name)
        );

        if (existsInNative) {
          if (!skill.nativeSkillId || !skill.nativeDirectory) {
            updateSkill(skill.id, {
              source: 'imported',
              nativeSkillId: existsInNative.id,
              nativeDirectory: existsInNative.directory,
              canonicalId: buildCanonicalSkillId({
                source: 'imported',
                metadata: skill.metadata,
                nativeSkillId: existsInNative.id,
                nativeDirectory: existsInNative.directory,
              }),
              syncOrigin: 'native',
              syncFingerprint: createNativeSkillFingerprint(existsInNative),
              lastSyncedAt: new Date(),
              lastSyncError: null,
            });
            diagnostics.updated += 1;
          } else {
            diagnostics.skipped += 1;
          }
          continue;
        }

        try {
          await writeContent(directory, skill.rawContent);
          for (const resource of skill.resources) {
            if (resource.content) {
              await writeResource(directory, resource.path, resource.content);
            }
          }

          const installed = await registerLocal(directory);
          await updateNative(installed.id, skill.category, skill.tags);

          updateSkill(skill.id, {
            source: 'imported',
            nativeSkillId: installed.id,
            nativeDirectory: installed.directory,
            canonicalId: buildCanonicalSkillId({
              source: 'imported',
              metadata: skill.metadata,
              nativeSkillId: installed.id,
              nativeDirectory: installed.directory,
            }),
            syncOrigin: 'native',
            syncFingerprint: createNativeSkillFingerprint(installed),
            lastSyncedAt: new Date(),
            lastSyncError: null,
          });
          diagnostics.added += 1;
          skillSyncLogger.info('Synced frontend skill to native storage', {
            action: 'syncToNative',
            frontendSkillId: skill.id,
            nativeId: installed.id,
          });
        } catch (error) {
          failures += 1;
          diagnostics.conflicted += 1;
          updateSkill(skill.id, {
            lastSyncError: String(error),
          });
          skillSyncLogger.error('Failed syncing frontend skill to native storage', error as Error, {
            action: 'syncToNative',
            frontendSkillId: skill.id,
          });
        }
      }
    } catch (error) {
      failures += 1;
      skillSyncLogger.error('Failed to run syncToNative', error as Error, {
        action: 'syncToNative',
      });
    } finally {
      endSync('to-native', diagnostics, failures, 'syncToNativeFailed');
    }
  }, [
    isNativeAvailable,
    beginSync,
    getAllSkills,
    nativeInstalled,
    updateSkill,
    writeContent,
    writeResource,
    registerLocal,
    updateNative,
    endSync,
  ]);

  /**
   * Install a skill from repository via native backend
   */
  const installFromRepo = useCallback(
    async (skill: DiscoverableSkill): Promise<Skill | null> => {
      if (!isNativeAvailable) {
        setSyncMetadata({
          syncState: 'error',
          lastSyncError: 'i18n:nativeNotAvailable',
          lastSyncOutcome: 'failure',
        });
        return null;
      }

      beginSync('bidirectional');

      try {
        const installed = await nativeInstall(skill);

        let content = '';
        try {
          content = await readContent(installed.directory);
        } catch {
          content = `# ${skill.name}\n\n${skill.description}`;
        }

        const match = findFrontendSkillForNative(useSkillStore.getState().skills, installed);
        let frontendSkill: Skill;

        if (match.skill) {
          updateSkill(match.skill.id, {
            metadata: {
              name: normalizeSkillName(match.skill.metadata.name || installed.name),
              description: installed.description || match.skill.metadata.description,
            },
            content,
            source: 'imported',
            status: installed.enabled ? 'enabled' : 'disabled',
            nativeSkillId: installed.id,
            nativeDirectory: installed.directory,
            canonicalId: buildCanonicalSkillId({
              source: 'imported',
              metadata: match.skill.metadata,
              nativeSkillId: installed.id,
              nativeDirectory: installed.directory,
            }),
            syncOrigin: 'native',
            syncFingerprint: createNativeSkillFingerprint(installed),
            lastSyncedAt: new Date(),
            lastSyncError: null,
          });
          frontendSkill = useSkillStore.getState().skills[match.skill.id] || match.skill;
        } else {
          frontendSkill = createSkill(nativeToFrontendSkill(installed, content));
        }

        setSyncMetadata({
          syncState: 'ready',
          lastSyncAt: new Date(),
          lastSyncDirection: 'bidirectional',
          lastSyncOutcome: 'success',
          lastSyncError: null,
          syncDiagnostics: {
            added: match.skill ? 0 : 1,
            updated: match.skill ? 1 : 0,
            skipped: 0,
            conflicted: 0,
          },
        });
        setState((current) => ({ ...current, isSyncing: false }));

        return frontendSkill;
      } catch (error) {
        setSyncMetadata({
          syncState: 'error',
          lastSyncAt: new Date(),
          lastSyncDirection: 'bidirectional',
          lastSyncOutcome: 'failure',
          lastSyncError: toI18nErrorKey('installFailed', error),
        });
        setState((current) => ({ ...current, isSyncing: false }));
        return null;
      }
    },
    [
      isNativeAvailable,
      setSyncMetadata,
      beginSync,
      nativeInstall,
      readContent,
      updateSkill,
      createSkill,
    ]
  );

  /**
   * Uninstall a native skill
   */
  const uninstallNativeSkill = useCallback(
    async (nativeId: string) => {
      if (!isNativeAvailable) return;

      beginSync('bidirectional');

      try {
        const native = nativeInstalled.find((installed) => installed.id === nativeId);

        if (native) {
          const frontendSkill = Object.values(frontendSkills).find(
            (skill) => skill.nativeSkillId === native.id || normalizeSkillName(skill.metadata.name) === normalizeSkillName(native.name)
          );

          if (frontendSkill) {
            if (frontendSkill.syncOrigin === 'native' || frontendSkill.source === 'imported') {
              deleteSkill(frontendSkill.id);
            }
          }
        }

        await nativeUninstall(nativeId);

        setSyncMetadata({
          syncState: 'ready',
          lastSyncAt: new Date(),
          lastSyncDirection: 'bidirectional',
          lastSyncOutcome: 'success',
          lastSyncError: null,
        });
      } catch (error) {
        setSyncMetadata({
          syncState: 'error',
          lastSyncAt: new Date(),
          lastSyncDirection: 'bidirectional',
          lastSyncOutcome: 'failure',
          lastSyncError: toI18nErrorKey('syncFromNativeFailed', error),
        });
      } finally {
        setState((current) => ({ ...current, isSyncing: false }));
      }
    },
    [
      isNativeAvailable,
      beginSync,
      nativeInstalled,
      frontendSkills,
      deleteSkill,
      nativeUninstall,
      setSyncMetadata,
    ]
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
    isSyncing: state.isSyncing,
    lastSyncAt,
    syncError: lastSyncError,
    discoverable: state.discoverable,
    isDiscovering: state.isDiscovering,
    syncState,
    lastSyncOutcome,
    lastSyncDirection,
    syncDiagnostics,
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
