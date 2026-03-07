'use client';

import { useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import {
  buildNativeLinkedSkillUpdate,
  isNativeManagedSkill,
  promoteGeneratedSkillPathToNative,
  promoteSkillToNative,
  type SkillActionOutcome,
} from '@/lib/skills/skill-actions';
import { useSkillStore } from '@/stores/skills';
import type { CreateSkillInput, Skill } from '@/types/system/skill';
import { useNativeSkills, type DiscoverableSkill } from './use-native-skills';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';

const skillActionsLogger = createLogger('skills:actions');

export interface UseSkillActionsReturn {
  createSkill: (
    input: CreateSkillInput,
    options?: { promoteOnDesktop?: boolean }
  ) => Promise<SkillActionOutcome<Skill>>;
  duplicateSkill: (skill: Skill) => Promise<SkillActionOutcome<Skill>>;
  toggleSkillEnabled: (skill: Skill) => Promise<SkillActionOutcome<Skill>>;
  setSkillActive: (skill: Skill, active: boolean) => SkillActionOutcome<Skill>;
  updateSkillContent: (skill: Skill, rawContent: string) => Promise<SkillActionOutcome<Skill>>;
  deleteSkill: (skill: Skill) => Promise<SkillActionOutcome>;
  installDiscoveredSkill: (skill: DiscoverableSkill) => Promise<SkillActionOutcome<Skill>>;
  promoteSkill: (skill: Skill, directory?: string) => Promise<SkillActionOutcome<Skill>>;
  promoteGeneratedSkillPath: (
    sourcePath: string,
    name?: string
  ) => Promise<SkillActionOutcome<Skill>>;
}

export function useSkillActions(): UseSkillActionsReturn {
  const {
    createSkill,
    updateSkill,
    deleteSkill: deleteFromStore,
    enableSkill,
    disableSkill,
    activateSkill,
    deactivateSkill,
    setSyncMetadata,
  } = useSkillStore();
  const {
    enable: enableNativeSkill,
    disable: disableNativeSkill,
    writeContent,
  } = useNativeSkills();
  const {
    installFromRepo,
    uninstallNativeSkill,
    syncFromNative,
  } = useSkillSync();
  const isNativeAvailable = useSkillSyncAvailable();

  const markOutcome = useCallback(<T,>(
    outcome: SkillActionOutcome<T>,
    direction: 'bidirectional' | 'to-native' | 'from-native' = 'bidirectional'
  ) => {
    setSyncMetadata({
      syncState: outcome.outcome === 'success' ? 'ready' : 'error',
      lastSyncAt: new Date(),
      lastSyncDirection: direction,
      lastSyncOutcome: outcome.outcome,
      lastSyncError: outcome.outcome === 'success' ? null : outcome.error ?? 'i18n:syncPartial',
    });
  }, [setSyncMetadata]);

  const promoteSkill = useCallback(async (skill: Skill, directory?: string): Promise<SkillActionOutcome<Skill>> => {
    const promotion = await promoteSkillToNative({
      skill,
      directory,
    });

    if (promotion.data) {
      const update = buildNativeLinkedSkillUpdate(skill, promotion.data, promotion.error ?? null);
      updateSkill(skill.id, update);
      const updated = useSkillStore.getState().skills[skill.id];
      const outcome: SkillActionOutcome<Skill> = {
        ...promotion,
        data: updated ?? skill,
      };
      markOutcome(outcome, 'to-native');
      return outcome;
    }

    updateSkill(skill.id, {
      lastSyncError: promotion.error ?? 'i18n:nativePromotionFailed',
    });

    const fallback: SkillActionOutcome<Skill> = {
      outcome: promotion.outcome,
      data: useSkillStore.getState().skills[skill.id] ?? skill,
      error: promotion.error ?? 'i18n:nativePromotionFailed',
      retryable: promotion.retryable,
      diagnostics: promotion.diagnostics,
    };
    markOutcome(fallback, 'to-native');
    return fallback;
  }, [markOutcome, updateSkill]);

  const createSkillAction = useCallback(async (
    input: CreateSkillInput,
    options: { promoteOnDesktop?: boolean } = {}
  ): Promise<SkillActionOutcome<Skill>> => {
    const created = createSkill(input);

    if (!options.promoteOnDesktop || !isNativeAvailable) {
      const outcome: SkillActionOutcome<Skill> = {
        outcome: 'success',
        data: created,
        error: null,
      };
      markOutcome(outcome);
      return outcome;
    }

    return promoteSkill(created);
  }, [createSkill, isNativeAvailable, markOutcome, promoteSkill]);

  const duplicateSkill = useCallback(async (skill: Skill): Promise<SkillActionOutcome<Skill>> => {
    const duplicate = createSkill({
      name: `${skill.metadata.name}-copy`,
      description: skill.metadata.description,
      content: skill.content,
      category: skill.category,
      tags: skill.tags,
      resources: skill.resources,
    });

    const outcome: SkillActionOutcome<Skill> = {
      outcome: 'success',
      data: duplicate,
      error: null,
    };
    markOutcome(outcome);
    return outcome;
  }, [createSkill, markOutcome]);

  const toggleSkillEnabled = useCallback(async (skill: Skill): Promise<SkillActionOutcome<Skill>> => {
    const nextEnabled = skill.status !== 'enabled';

    if (isNativeManagedSkill(skill, isNativeAvailable) && skill.nativeSkillId) {
      try {
        if (nextEnabled) {
          await enableNativeSkill(skill.nativeSkillId);
          enableSkill(skill.id);
        } else {
          await disableNativeSkill(skill.nativeSkillId);
          disableSkill(skill.id);
        }
        updateSkill(skill.id, { lastSyncedAt: new Date(), lastSyncError: null });
        const updated = useSkillStore.getState().skills[skill.id];
        const outcome: SkillActionOutcome<Skill> = {
          outcome: 'success',
          data: updated ?? skill,
          error: null,
        };
        markOutcome(outcome, 'bidirectional');
        return outcome;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        skillActionsLogger.warn('Failed toggling native-managed skill state', {
          action: 'toggleSkillEnabled',
          skillId: skill.id,
          nativeSkillId: skill.nativeSkillId,
          reason: message,
        });
        const failure: SkillActionOutcome<Skill> = {
          outcome: 'failure',
          data: skill,
          error: 'i18n:syncToNativeFailed',
          retryable: true,
        };
        markOutcome(failure, 'to-native');
        return failure;
      }
    }

    if (nextEnabled) {
      enableSkill(skill.id);
    } else {
      disableSkill(skill.id);
    }
    const updated = useSkillStore.getState().skills[skill.id];
    const outcome: SkillActionOutcome<Skill> = {
      outcome: 'success',
      data: updated ?? skill,
      error: null,
    };
    markOutcome(outcome);
    return outcome;
  }, [
    disableNativeSkill,
    disableSkill,
    enableNativeSkill,
    enableSkill,
    isNativeAvailable,
    markOutcome,
    updateSkill,
  ]);

  const setSkillActive = useCallback((skill: Skill, active: boolean): SkillActionOutcome<Skill> => {
    if (active) {
      activateSkill(skill.id);
    } else {
      deactivateSkill(skill.id);
    }
    const updated = useSkillStore.getState().skills[skill.id];
    return {
      outcome: 'success',
      data: updated ?? skill,
      error: null,
    };
  }, [activateSkill, deactivateSkill]);

  const updateSkillContent = useCallback(async (skill: Skill, rawContent: string): Promise<SkillActionOutcome<Skill>> => {
    updateSkill(skill.id, { content: rawContent, lastSyncError: null });
    const localUpdated = useSkillStore.getState().skills[skill.id];

    if (!isNativeManagedSkill(skill, isNativeAvailable) || !skill.nativeDirectory) {
      const outcome: SkillActionOutcome<Skill> = {
        outcome: 'success',
        data: localUpdated ?? skill,
        error: null,
      };
      markOutcome(outcome);
      return outcome;
    }

    try {
      await writeContent(skill.nativeDirectory, useSkillStore.getState().skills[skill.id]?.rawContent ?? rawContent);
      updateSkill(skill.id, { lastSyncedAt: new Date(), lastSyncError: null });
      const synced = useSkillStore.getState().skills[skill.id];
      const outcome: SkillActionOutcome<Skill> = {
        outcome: 'success',
        data: synced ?? localUpdated ?? skill,
        error: null,
      };
      markOutcome(outcome, 'to-native');
      return outcome;
    } catch (error) {
      skillActionsLogger.warn('Failed syncing edited skill content to native storage', {
        action: 'updateSkillContent',
        skillId: skill.id,
        nativeDirectory: skill.nativeDirectory,
        reason: String(error),
      });
      updateSkill(skill.id, { lastSyncError: 'i18n:syncToNativeFailed' });
      const partial: SkillActionOutcome<Skill> = {
        outcome: 'partial',
        data: useSkillStore.getState().skills[skill.id] ?? localUpdated ?? skill,
        error: 'i18n:syncToNativeFailed',
        retryable: true,
      };
      markOutcome(partial, 'to-native');
      return partial;
    }
  }, [isNativeAvailable, markOutcome, updateSkill, writeContent]);

  const deleteSkill = useCallback(async (skill: Skill): Promise<SkillActionOutcome> => {
    if (isNativeManagedSkill(skill, isNativeAvailable) && skill.nativeSkillId) {
      try {
        await uninstallNativeSkill(skill.nativeSkillId);
        const outcome: SkillActionOutcome = {
          outcome: 'success',
          error: null,
        };
        markOutcome(outcome, 'bidirectional');
        return outcome;
      } catch (error) {
        skillActionsLogger.warn('Failed uninstalling native-managed skill', {
          action: 'deleteSkill',
          skillId: skill.id,
          nativeSkillId: skill.nativeSkillId,
          reason: String(error),
        });
        const failure: SkillActionOutcome = {
          outcome: 'failure',
          error: 'i18n:syncFromNativeFailed',
          retryable: true,
        };
        markOutcome(failure, 'from-native');
        return failure;
      }
    }

    deleteFromStore(skill.id);
    const outcome: SkillActionOutcome = {
      outcome: 'success',
      error: null,
    };
    markOutcome(outcome);
    return outcome;
  }, [deleteFromStore, isNativeAvailable, markOutcome, uninstallNativeSkill]);

  const installDiscoveredSkill = useCallback(async (skill: DiscoverableSkill): Promise<SkillActionOutcome<Skill>> => {
    const installed = await installFromRepo(skill);
    if (!installed) {
      const failure: SkillActionOutcome<Skill> = {
        outcome: 'failure',
        error: 'i18n:installFailed',
        retryable: true,
      };
      markOutcome(failure, 'bidirectional');
      return failure;
    }

    const outcome: SkillActionOutcome<Skill> = {
      outcome: 'success',
      data: installed,
      error: null,
    };
    markOutcome(outcome, 'bidirectional');
    return outcome;
  }, [installFromRepo, markOutcome]);

  const promoteGeneratedSkillPath = useCallback(async (
    sourcePath: string,
    name?: string
  ): Promise<SkillActionOutcome<Skill>> => {
    const promotion = await promoteGeneratedSkillPathToNative(sourcePath, name);
    if (promotion.outcome === 'failure') {
      const failure: SkillActionOutcome<Skill> = {
        outcome: 'failure',
        error: promotion.error ?? 'i18n:nativePromotionFailed',
        retryable: promotion.retryable,
        diagnostics: promotion.diagnostics,
      };
      markOutcome(failure, 'to-native');
      return failure;
    }

    await syncFromNative();

    if (!promotion.data) {
      const partial: SkillActionOutcome<Skill> = {
        outcome: 'partial',
        error: 'i18n:nativePromotionPartial',
        retryable: true,
      };
      markOutcome(partial, 'to-native');
      return partial;
    }

    const matched = Object.values(useSkillStore.getState().skills).find(
      (skill) =>
        skill.nativeSkillId === promotion.data?.id || skill.nativeDirectory === promotion.data?.directory
    );

    const outcome: SkillActionOutcome<Skill> = {
      outcome: 'success',
      data: matched,
      error: null,
    };
    markOutcome(outcome, 'from-native');
    return outcome;
  }, [markOutcome, syncFromNative]);

  return {
    createSkill: createSkillAction,
    duplicateSkill,
    toggleSkillEnabled,
    setSkillActive,
    updateSkillContent,
    deleteSkill,
    installDiscoveredSkill,
    promoteSkill,
    promoteGeneratedSkillPath,
  };
}
