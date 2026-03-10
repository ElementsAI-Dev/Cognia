import type { Skill } from '@/types/system/skill';
import {
  activateSkillsTransactional,
  assertRequiredPhasesCompleted,
  classifyBootstrapFailure,
  resolveSkillActivationOrder,
} from './bootstrap-lifecycle';

function buildSkill(overrides: Partial<Skill> & { id: string; name: string }): Skill {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: overrides.id,
    metadata: {
      name: overrides.name,
      description: overrides.metadata?.description ?? `${overrides.name} description`,
    },
    content: overrides.content ?? `# ${overrides.name}`,
    rawContent: overrides.rawContent ?? `---\nname: ${overrides.name}\n---\n# ${overrides.name}`,
    resources: overrides.resources ?? [],
    status: overrides.status ?? 'enabled',
    source: overrides.source ?? 'custom',
    category: overrides.category ?? 'development',
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    version: overrides.version ?? '1.0.0',
    canonicalId: overrides.canonicalId,
    isActive: overrides.isActive,
  };
}

describe('bootstrap-lifecycle', () => {
  describe('resolveSkillActivationOrder', () => {
    it('sorts skills with deterministic tie-break when no dependencies exist', () => {
      const c = buildSkill({ id: 'c', name: 'charlie' });
      const a = buildSkill({ id: 'a', name: 'alpha' });
      const b = buildSkill({ id: 'b', name: 'beta' });

      const result = resolveSkillActivationOrder([c, a, b]);

      expect(result.ordered.map((item) => item.id)).toEqual(['a', 'b', 'c']);
      expect(result.cycles).toHaveLength(0);
      expect(result.missingDependencies).toHaveLength(0);
    });

    it('resolves topological order from dependency declarations', () => {
      const core = buildSkill({ id: 'core', name: 'core' });
      const ui = buildSkill({
        id: 'ui',
        name: 'ui',
        rawContent: '---\nname: ui\ndependencies:\n  - core\n---\n# ui',
      });
      const analytics = buildSkill({
        id: 'analytics',
        name: 'analytics',
        rawContent: '---\nname: analytics\ndependencies: [core, ui]\n---\n# analytics',
      });

      const result = resolveSkillActivationOrder([analytics, ui, core]);

      expect(result.ordered.map((item) => item.id)).toEqual(['core', 'ui', 'analytics']);
      expect(result.cycles).toHaveLength(0);
      expect(result.missingDependencies).toHaveLength(0);
    });

    it('surfaces missing dependencies and cycles', () => {
      const a = buildSkill({
        id: 'a',
        name: 'a',
        rawContent: '---\nname: a\ndependencies:\n  - b\n---\n# a',
      });
      const b = buildSkill({
        id: 'b',
        name: 'b',
        rawContent: '---\nname: b\ndependencies:\n  - a\n  - missing-x\n---\n# b',
      });

      const result = resolveSkillActivationOrder([a, b]);

      expect(result.ordered).toHaveLength(0);
      expect(result.cycles.sort()).toEqual(['a', 'b']);
      expect(result.missingDependencies).toEqual([{ skillId: 'b', dependency: 'missing-x' }]);
    });
  });

  describe('activateSkillsTransactional', () => {
    it('commits activation journal on success', async () => {
      const a = buildSkill({ id: 'a', name: 'a' });
      const b = buildSkill({ id: 'b', name: 'b' });

      const activated: string[] = [];
      const deactivated: string[] = [];

      const result = await activateSkillsTransactional({
        skills: [a, b],
        activate: async (skill) => {
          activated.push(skill.id);
        },
        deactivate: async (skill) => {
          deactivated.push(skill.id);
        },
      });

      expect(result.failure).toBeUndefined();
      expect(result.journal.outcome).toBe('committed');
      expect(result.journal.attempted).toEqual(['a', 'b']);
      expect(result.journal.activated).toEqual(['a', 'b']);
      expect(result.journal.rollbackActions).toHaveLength(0);
      expect(deactivated).toHaveLength(0);
    });

    it('rolls back run-scoped activations on failure', async () => {
      const a = buildSkill({ id: 'a', name: 'a' });
      const b = buildSkill({ id: 'b', name: 'b' });
      const c = buildSkill({ id: 'c', name: 'c' });

      const deactivated: string[] = [];

      const result = await activateSkillsTransactional({
        skills: [a, b, c],
        activate: async (skill) => {
          if (skill.id === 'c') {
            throw new Error('activation failed for c');
          }
        },
        deactivate: async (skill) => {
          deactivated.push(skill.id);
        },
      });

      expect(result.failure?.severity).toBe('hard');
      expect(result.journal.outcome).toBe('rolled_back');
      expect(result.journal.failed).toEqual(['c']);
      expect(result.journal.rollbackActions.map((item) => item.skillId)).toEqual(['b', 'a']);
      expect(deactivated).toEqual(['b', 'a']);
    });

    it('respects safe-to-keep policy during rollback', async () => {
      const a = buildSkill({ id: 'a', name: 'a' });
      const b = buildSkill({ id: 'b', name: 'b' });

      const deactivated: string[] = [];
      const result = await activateSkillsTransactional({
        skills: [a, b],
        activate: async (skill) => {
          if (skill.id === 'b') {
            throw new Error('activation failed for b');
          }
        },
        deactivate: async (skill) => {
          deactivated.push(skill.id);
        },
        isSafeToKeep: (skill) => skill.id === 'a',
      });

      expect(result.journal.outcome).toBe('rolled_back');
      expect(result.journal.rollbackActions).toEqual([
        expect.objectContaining({ skillId: 'a', kept: true, reason: 'safe-to-keep-policy' }),
      ]);
      expect(deactivated).toHaveLength(0);
    });
  });

  describe('assertRequiredPhasesCompleted', () => {
    it('throws when required phases are missing', () => {
      expect(() => assertRequiredPhasesCompleted(new Set(['hydrate', 'discover']))).toThrow(
        'Missing required phases before ready'
      );
    });

    it('passes when all required phases are present', () => {
      const phases = new Set([
        'hydrate',
        'discover',
        'validate',
        'resolve_order',
        'activate',
        'verify',
      ] as const);

      expect(() => assertRequiredPhasesCompleted(phases)).not.toThrow();
    });
  });

  describe('classifyBootstrapFailure', () => {
    it('classifies native discovery issues as soft failures', () => {
      const result = classifyBootstrapFailure('discover', new Error('native service unavailable'));
      expect(result.severity).toBe('soft');
      expect(result.code).toBe('NATIVE_DISCOVERY_UNAVAILABLE');
    });

    it('classifies dependency failures as hard failures', () => {
      const result = classifyBootstrapFailure('resolve_order', new Error('dependency cycle detected'));
      expect(result.severity).toBe('hard');
      expect(result.code).toBe('DEPENDENCY_RESOLUTION_FAILED');
    });
  });
});
