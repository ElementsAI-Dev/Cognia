import type { InstalledSkill } from '@/lib/native/skill';
import * as nativeSkill from '@/lib/native/skill';
import { createLogger } from '@/lib/logger';
import type { Skill, UpdateSkillInput } from '@/types/system/skill';
import {
  buildCanonicalSkillId,
  createNativeSkillFingerprint,
  normalizeSkillName,
} from './reconciliation';

const skillActionsLogger = createLogger('skills:actions');

export type SkillActionOutcomeState = 'success' | 'partial' | 'failure';

export interface SkillActionOutcome<T = void> {
  outcome: SkillActionOutcomeState;
  data?: T;
  error?: string | null;
  retryable?: boolean;
  diagnostics?: Record<string, unknown>;
}

export interface PromoteSkillToNativeInput {
  skill: Skill;
  directory?: string;
}

export interface PromoteSkillToNativeResult extends SkillActionOutcome<InstalledSkill> {
  directory: string;
}

export function isNativeManagedSkill(skill: Skill, isNativeAvailable: boolean): boolean {
  if (!isNativeAvailable) {
    return false;
  }
  return skill.syncOrigin === 'native' || skill.source === 'imported' || !!skill.nativeSkillId;
}

export function buildNativeLinkedSkillUpdate(
  skill: Skill,
  installed: InstalledSkill,
  error: string | null = null
): UpdateSkillInput {
  return {
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
    lastSyncError: error,
  };
}

export async function promoteSkillToNative(
  input: PromoteSkillToNativeInput
): Promise<PromoteSkillToNativeResult> {
  const directory = normalizeSkillName(input.directory || input.skill.nativeDirectory || input.skill.metadata.name);

  if (!nativeSkill.isNativeSkillAvailable()) {
    return {
      outcome: 'failure',
      directory,
      error: 'i18n:nativeNotAvailable',
      retryable: false,
    };
  }

  let wroteContent = false;
  let wroteResources = 0;
  const resourceErrors: string[] = [];

  try {
    await nativeSkill.writeSkillContent(directory, input.skill.rawContent);
    wroteContent = true;
  } catch (error) {
    skillActionsLogger.error('Failed writing skill content during native promotion', error as Error, {
      action: 'promoteSkillToNative',
      skillId: input.skill.id,
      directory,
    });
    return {
      outcome: 'failure',
      directory,
      error: 'i18n:nativePromotionFailed',
      retryable: true,
      diagnostics: {
        wroteContent,
        wroteResources,
      },
    };
  }

  for (const resource of input.skill.resources) {
    if (!resource.content) {
      continue;
    }
    try {
      await nativeSkill.writeSkillResource(directory, resource.path, resource.content);
      wroteResources += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      resourceErrors.push(`${resource.path}:${message}`);
      skillActionsLogger.warn('Failed writing skill resource during native promotion', {
        action: 'promoteSkillToNative',
        skillId: input.skill.id,
        directory,
        resourcePath: resource.path,
      });
    }
  }

  let installed: InstalledSkill | null = null;
  let registerError: Error | null = null;

  try {
    installed = await nativeSkill.registerLocalSkill(directory);
  } catch (error) {
    registerError = error as Error;
    try {
      const existing = await nativeSkill.getInstalledSkills();
      installed = existing.find((item) => item.directory === directory) ?? null;
    } catch (existingError) {
      skillActionsLogger.warn('Failed loading installed skills for native promotion fallback', {
        action: 'promoteSkillToNative',
        skillId: input.skill.id,
        directory,
        reason: String(existingError),
      });
    }
  }

  if (!installed) {
    skillActionsLogger.error('Failed registering native skill during promotion', registerError ?? new Error('registerLocalSkill failed'), {
      action: 'promoteSkillToNative',
      skillId: input.skill.id,
      directory,
      wroteContent,
      wroteResources,
    });
    return {
      outcome: 'partial',
      directory,
      error: 'i18n:nativePromotionPartial',
      retryable: true,
      diagnostics: {
        wroteContent,
        wroteResources,
        resourceErrors,
      },
    };
  }

  try {
    await nativeSkill.updateSkill(installed.id, input.skill.category, input.skill.tags);
  } catch {
    skillActionsLogger.warn('Failed updating native skill metadata during promotion', {
      action: 'promoteSkillToNative',
      skillId: input.skill.id,
      nativeId: installed.id,
      directory,
    });
    return {
      outcome: 'partial',
      directory,
      data: installed,
      error: 'i18n:nativePromotionPartial',
      retryable: true,
      diagnostics: {
        wroteContent,
        wroteResources,
        resourceErrors,
        metadataUpdateFailed: true,
      },
    };
  }

  const outcome: SkillActionOutcomeState = resourceErrors.length > 0 ? 'partial' : 'success';
  return {
    outcome,
    directory,
    data: installed,
    error: outcome === 'success' ? null : 'i18n:nativePromotionPartial',
    retryable: outcome !== 'success',
    diagnostics: {
      wroteContent,
      wroteResources,
      resourceErrors,
    },
  };
}

export async function promoteGeneratedSkillPathToNative(
  sourcePath: string,
  name?: string
): Promise<SkillActionOutcome<InstalledSkill>> {
  if (!nativeSkill.isNativeSkillAvailable()) {
    return {
      outcome: 'failure',
      error: 'i18n:nativeNotAvailable',
      retryable: false,
    };
  }

  try {
    const installed = await nativeSkill.installLocalSkill(sourcePath, name);
    return {
      outcome: 'success',
      data: installed,
      error: null,
      retryable: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    skillActionsLogger.warn('Failed installing generated skill path to native store', {
      action: 'promoteGeneratedSkillPathToNative',
      sourcePath,
      reason: message,
    });
    return {
      outcome: 'failure',
      error: 'i18n:nativePromotionFailed',
      retryable: true,
      diagnostics: {
        sourcePath,
        reason: message,
      },
    };
  }
}
