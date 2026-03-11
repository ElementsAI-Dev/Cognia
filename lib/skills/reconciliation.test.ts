import type { InstalledSkill } from '@/lib/native/skill';
import type { Skill } from '@/types/system/skill';
import {
  buildCanonicalSkillId,
  createBuiltinSkillFingerprint,
  createNativeSkillFingerprint,
  findFrontendSkillForNative,
  getDefaultSyncOrigin,
  normalizeSkillName,
} from './reconciliation';

function createFrontendSkill(partial: Partial<Skill>): Skill {
  return {
    id: partial.id ?? 'skill-id',
    metadata: partial.metadata ?? { name: 'test-skill', description: 'desc' },
    content: partial.content ?? 'content',
    rawContent: partial.rawContent ?? '---\nname: test-skill\n---\ncontent',
    resources: partial.resources ?? [],
    status: partial.status ?? 'enabled',
    source: partial.source ?? 'custom',
    category: partial.category ?? 'custom',
    tags: partial.tags ?? [],
    createdAt: partial.createdAt ?? new Date(0),
    updatedAt: partial.updatedAt ?? new Date(0),
    ...partial,
  };
}

function createNativeSkill(partial: Partial<InstalledSkill> = {}): InstalledSkill {
  return {
    id: partial.id ?? 'native:abc',
    name: partial.name ?? 'Test Skill',
    description: partial.description ?? 'desc',
    directory: partial.directory ?? 'test-skill',
    repoOwner: partial.repoOwner ?? null,
    repoName: partial.repoName ?? null,
    repoBranch: partial.repoBranch ?? null,
    readmeUrl: partial.readmeUrl ?? null,
    installedAt: partial.installedAt ?? 12345,
    enabled: partial.enabled ?? true,
    category: partial.category ?? null,
    tags: partial.tags ?? [],
  };
}

describe('skills reconciliation helpers', () => {
  it('normalizes skill names to hyphen-case', () => {
    expect(normalizeSkillName('My Test Skill')).toBe('my-test-skill');
  });

  it('creates stable built-in fingerprints', () => {
    const first = createBuiltinSkillFingerprint({
      name: 'Test Skill',
      description: 'desc',
      content: 'content',
      version: '1.0.0',
    });
    const second = createBuiltinSkillFingerprint({
      name: 'Test Skill',
      description: 'desc',
      content: 'content',
      version: '1.0.0',
    });
    const changed = createBuiltinSkillFingerprint({
      name: 'Test Skill',
      description: 'desc',
      content: 'content changed',
      version: '1.0.0',
    });

    expect(first).toBe(second);
    expect(first).not.toBe(changed);
  });

  it('creates stable native fingerprints', () => {
    const skill = createNativeSkill();
    expect(createNativeSkillFingerprint(skill)).toBe(createNativeSkillFingerprint(skill));
  });

  it('builds canonical ids based on source and native linkage', () => {
    expect(
      buildCanonicalSkillId({
        source: 'builtin',
        metadata: { name: 'Skill Name' },
      })
    ).toBe('builtin:skill-name');

    expect(
      buildCanonicalSkillId({
        source: 'imported',
        metadata: { name: 'Skill Name' },
        nativeSkillId: 'native:abc',
      })
    ).toBe('native:native:abc');

    expect(
      buildCanonicalSkillId({
        source: 'marketplace',
        metadata: { name: 'Skill Name' },
        marketplaceSkillId: 'owner/repo/skills/test',
      })
    ).toBe('marketplace:owner-repo-skills-test');
  });

  it('maps source to default sync origin', () => {
    expect(getDefaultSyncOrigin('builtin')).toBe('builtin');
    expect(getDefaultSyncOrigin('imported')).toBe('native');
    expect(getDefaultSyncOrigin('custom')).toBe('frontend');
  });

  it('matches native skill by canonical native id first', () => {
    const native = createNativeSkill({ id: 'native:42' });
    const frontend = createFrontendSkill({
      id: 'front-1',
      nativeSkillId: 'native:42',
      metadata: { name: 'another-name', description: 'desc' },
    });

    const result = findFrontendSkillForNative({ [frontend.id]: frontend }, native);
    expect(result.reason).toBe('native-id');
    expect(result.skill?.id).toBe('front-1');
  });

  it('falls back to directory then legacy name matching', () => {
    const native = createNativeSkill({ id: 'native:99', name: 'Repo Skill', directory: 'repo-skill' });
    const byDirectory = createFrontendSkill({
      id: 'front-dir',
      metadata: { name: 'different-name', description: 'desc' },
      nativeDirectory: 'repo-skill',
    });

    const directoryMatch = findFrontendSkillForNative({ [byDirectory.id]: byDirectory }, native);
    expect(directoryMatch.reason).toBe('native-directory');
    expect(directoryMatch.skill?.id).toBe('front-dir');

    const byLegacy = createFrontendSkill({
      id: 'front-name',
      metadata: { name: 'repo-skill', description: 'desc' },
    });
    const legacyMatch = findFrontendSkillForNative({ [byLegacy.id]: byLegacy }, native);
    expect(legacyMatch.reason).toBe('legacy-name');
    expect(legacyMatch.skill?.id).toBe('front-name');
  });
});
