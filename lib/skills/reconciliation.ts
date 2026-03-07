import type { InstalledSkill } from '@/lib/native/skill';
import type { CreateSkillInput, Skill, SkillSource, SkillSyncOrigin } from '@/types/system/skill';
import { toHyphenCase } from './parser';

export type NativeMatchReason = 'native-id' | 'native-directory' | 'legacy-name' | 'none';

export interface NativeMatchResult {
  skill?: Skill;
  reason: NativeMatchReason;
}

export interface ReconciliationDiagnostics {
  added: number;
  updated: number;
  skipped: number;
  conflicted: number;
}

export const EMPTY_RECONCILIATION_DIAGNOSTICS: ReconciliationDiagnostics = {
  added: 0,
  updated: 0,
  skipped: 0,
  conflicted: 0,
};

function stableHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function normalizeSkillName(name: string): string {
  return toHyphenCase(name);
}

export function createBuiltinSkillFingerprint(input: CreateSkillInput): string {
  return stableHash([
    normalizeSkillName(input.name),
    input.description ?? '',
    input.content ?? '',
    input.version ?? '1.0.0',
  ].join('|'));
}

export function createNativeSkillFingerprint(input: InstalledSkill): string {
  return stableHash([
    input.id,
    input.directory,
    input.name,
    input.description ?? '',
    input.enabled ? '1' : '0',
    input.category ?? '',
    input.tags.join(','),
    String(input.installedAt),
  ].join('|'));
}

export function getDefaultSyncOrigin(source: SkillSource): SkillSyncOrigin {
  if (source === 'builtin') return 'builtin';
  if (source === 'imported') return 'native';
  return 'frontend';
}

export function buildCanonicalSkillId(skill: {
  source?: SkillSource;
  metadata?: { name?: string };
  nativeSkillId?: string;
  nativeDirectory?: string;
}): string {
  if (skill.nativeSkillId) return `native:${skill.nativeSkillId}`;
  if (skill.source === 'builtin') {
    return `builtin:${normalizeSkillName(skill.metadata?.name ?? '')}`;
  }
  if (skill.nativeDirectory) return `native-dir:${normalizeSkillName(skill.nativeDirectory)}`;
  return `frontend:${normalizeSkillName(skill.metadata?.name ?? '')}`;
}

export function findFrontendSkillForNative(
  frontendSkills: Record<string, Skill>,
  nativeSkill: InstalledSkill
): NativeMatchResult {
  const skills = Object.values(frontendSkills);

  const byNativeId = skills.find((skill) =>
    skill.nativeSkillId === nativeSkill.id || skill.canonicalId === `native:${nativeSkill.id}`
  );
  if (byNativeId) {
    return { skill: byNativeId, reason: 'native-id' };
  }

  const normalizedDirectory = normalizeSkillName(nativeSkill.directory);
  const byDirectory = skills.find((skill) =>
    normalizeSkillName(skill.nativeDirectory ?? '') === normalizedDirectory ||
    skill.canonicalId === `native-dir:${normalizedDirectory}`
  );
  if (byDirectory) {
    return { skill: byDirectory, reason: 'native-directory' };
  }

  const normalizedName = normalizeSkillName(nativeSkill.name);
  const byLegacyName = skills.find((skill) => normalizeSkillName(skill.metadata.name) === normalizedName);
  if (byLegacyName) {
    return { skill: byLegacyName, reason: 'legacy-name' };
  }

  return { reason: 'none' };
}
