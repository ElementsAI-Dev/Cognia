import type {
  Skill,
  SkillActivationJournal,
  SkillActivationRollbackAction,
  SkillBootstrapFailureSeverity,
  SkillBootstrapPhase,
} from '@/types/system/skill';

export const SKILL_BOOTSTRAP_REQUIRED_PHASES: SkillBootstrapPhase[] = [
  'hydrate',
  'discover',
  'validate',
  'resolve_order',
  'activate',
  'verify',
];

interface SkillOrderResolution {
  ordered: Skill[];
  missingDependencies: Array<{ skillId: string; dependency: string }>;
  cycles: string[];
}

interface SkillActivationFailure {
  code: string;
  message: string;
  severity: SkillBootstrapFailureSeverity;
  phase: SkillBootstrapPhase;
}

interface ActivationResult {
  journal: SkillActivationJournal;
  failure?: SkillActivationFailure;
}

interface ActivateSkillOptions {
  skills: Skill[];
  activate: (skill: Skill) => Promise<void>;
  deactivate: (skill: Skill) => Promise<void>;
  isSafeToKeep?: (skill: Skill) => boolean;
}

function stableSkillKey(skill: Skill): string {
  return skill.canonicalId ?? skill.metadata.name ?? skill.id;
}

function parseYamlLikeList(raw: string | undefined, key: string): string[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);

  const inlinePattern = new RegExp(`^${key}\\s*:\\s*\\[(.*)\\]\\s*$`, 'i');
  for (const line of lines) {
    const match = line.trim().match(inlinePattern);
    if (match?.[1]) {
      return match[1]
        .split(',')
        .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ''))
        .filter(Boolean);
    }
  }

  const startIndex = lines.findIndex((line) => new RegExp(`^${key}\\s*:\\s*$`, 'i').test(line.trim()));
  if (startIndex < 0) return [];

  const dependencies: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('- ')) {
      break;
    }
    dependencies.push(trimmed.slice(2).trim().replace(/^['\"]|['\"]$/g, ''));
  }

  return dependencies;
}

export function extractSkillDependencies(skill: Skill): string[] {
  const dependencyKeys = ['dependencies', 'depends_on', 'dependsOn'];
  const allDeps = new Set<string>();

  for (const key of dependencyKeys) {
    for (const dep of parseYamlLikeList(skill.rawContent, key)) {
      allDeps.add(dep);
    }
  }

  return Array.from(allDeps);
}

export function resolveSkillActivationOrder(skills: Skill[]): SkillOrderResolution {
  const idToSkill = new Map<string, Skill>();
  const nameToId = new Map<string, string>();

  for (const skill of skills) {
    idToSkill.set(skill.id, skill);
    nameToId.set(stableSkillKey(skill), skill.id);
    nameToId.set(skill.metadata.name, skill.id);
  }

  const edges = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  const missingDependencies: Array<{ skillId: string; dependency: string }> = [];

  for (const skill of skills) {
    edges.set(skill.id, new Set<string>());
    indegree.set(skill.id, 0);
  }

  for (const skill of skills) {
    const deps = extractSkillDependencies(skill);
    for (const dep of deps) {
      const depId = idToSkill.has(dep) ? dep : nameToId.get(dep);
      if (!depId) {
        missingDependencies.push({ skillId: skill.id, dependency: dep });
        continue;
      }
      if (depId === skill.id) {
        continue;
      }

      if (!edges.get(depId)?.has(skill.id)) {
        edges.get(depId)?.add(skill.id);
        indegree.set(skill.id, (indegree.get(skill.id) ?? 0) + 1);
      }
    }
  }

  const queue = skills
    .map((skill) => skill.id)
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => {
      const skillA = idToSkill.get(a)!;
      const skillB = idToSkill.get(b)!;
      return stableSkillKey(skillA).localeCompare(stableSkillKey(skillB));
    });

  const orderedIds: string[] = [];

  while (queue.length > 0) {
    const next = queue.shift()!;
    orderedIds.push(next);

    const outgoing = Array.from(edges.get(next) ?? []);
    for (const target of outgoing) {
      indegree.set(target, (indegree.get(target) ?? 0) - 1);
      if ((indegree.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    }

    queue.sort((a, b) => {
      const skillA = idToSkill.get(a)!;
      const skillB = idToSkill.get(b)!;
      return stableSkillKey(skillA).localeCompare(stableSkillKey(skillB));
    });
  }

  const cycles = Array.from(indegree.entries())
    .filter(([, degree]) => degree > 0)
    .map(([id]) => id);

  return {
    ordered: orderedIds.map((id) => idToSkill.get(id)!).filter(Boolean),
    missingDependencies,
    cycles,
  };
}

export function classifyBootstrapFailure(phase: SkillBootstrapPhase, error: unknown): SkillActivationFailure {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalized = rawMessage.trim();

  if (phase === 'discover' && /native|tauri/i.test(normalized)) {
    return {
      code: 'NATIVE_DISCOVERY_UNAVAILABLE',
      message: normalized,
      severity: 'soft',
      phase,
    };
  }

  if (/dependency|cycle|topological/i.test(normalized)) {
    return {
      code: 'DEPENDENCY_RESOLUTION_FAILED',
      message: normalized,
      severity: 'hard',
      phase,
    };
  }

  if (/verify|invariant|ready/i.test(normalized)) {
    return {
      code: 'VERIFICATION_FAILED',
      message: normalized,
      severity: 'hard',
      phase,
    };
  }

  return {
    code: 'BOOTSTRAP_PHASE_FAILED',
    message: normalized,
    severity: 'hard',
    phase,
  };
}

export async function activateSkillsTransactional(options: ActivateSkillOptions): Promise<ActivationResult> {
  const {
    skills,
    activate,
    deactivate,
    isSafeToKeep = () => false,
  } = options;

  const journal: SkillActivationJournal = {
    runId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    attempted: [],
    activated: [],
    failed: [],
    rollbackActions: [],
    outcome: 'committed',
  };

  for (const skill of skills) {
    journal.attempted.push(skill.id);

    try {
      await activate(skill);
      journal.activated.push(skill.id);
    } catch (error) {
      const failure = classifyBootstrapFailure('activate', error);
      journal.failed.push(skill.id);
      journal.outcome = 'rolled_back';
      journal.failureCode = failure.code;
      journal.failureMessage = failure.message;
      journal.failureSeverity = failure.severity;

      const rollbackTargets = [...journal.activated].reverse();
      for (const activatedId of rollbackTargets) {
        const activatedSkill = skills.find((item) => item.id === activatedId);
        if (!activatedSkill) continue;

        const keep = isSafeToKeep(activatedSkill);
        const rollbackAction: SkillActivationRollbackAction = {
          skillId: activatedId,
          action: 'deactivate',
          kept: keep,
          reason: keep ? 'safe-to-keep-policy' : 'activation-failure-rollback',
        };

        if (!keep) {
          await deactivate(activatedSkill);
        }

        journal.rollbackActions.push(rollbackAction);
      }

      return {
        journal,
        failure,
      };
    }
  }

  return { journal };
}

export function assertRequiredPhasesCompleted(phases: Set<SkillBootstrapPhase>): void {
  const missing = SKILL_BOOTSTRAP_REQUIRED_PHASES.filter((phase) => !phases.has(phase));
  if (missing.length > 0) {
    throw new Error(`Missing required phases before ready: ${missing.join(', ')}`);
  }
}
