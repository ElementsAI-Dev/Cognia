import {
  DEFAULT_TEAM_CONFIG,
  type AgentTeamConfig,
  type AgentTeamTask,
  type TeamExecutionMode,
  type TeamExecutionPattern,
  type TeamGovernancePolicy,
  type TeamDelegationRecord,
  type TeamDelegationStatus,
} from '@/types/agent/agent-team';

const DELEGATION_STATUSES: TeamDelegationStatus[] = [
  'pending',
  'awaiting_approval',
  'active',
  'completed',
  'failed',
  'cancelled',
  'timeout',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readDate = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeDelegationStatus = (value: unknown): TeamDelegationStatus => {
  if (typeof value === 'string' && DELEGATION_STATUSES.includes(value as TeamDelegationStatus)) {
    return value as TeamDelegationStatus;
  }

  return 'pending';
};

export const mapExecutionModeToExecutionPattern = (
  mode: TeamExecutionMode = DEFAULT_TEAM_CONFIG.executionMode
): TeamExecutionPattern => {
  switch (mode) {
    case 'autonomous':
      return 'parallel_specialists';
    case 'delegate':
      return 'background_handoff';
    case 'coordinated':
    default:
      return 'manager_worker';
  }
};

export const normalizeGovernancePolicy = (
  governancePolicy: Partial<TeamGovernancePolicy> | undefined,
  config: Partial<AgentTeamConfig>
): TeamGovernancePolicy => {
  const tokenBudget = config.tokenBudget ?? governancePolicy?.budget?.tokenBudget ?? 0;

  return {
    approval: {
      requirePlanApproval:
        config.requirePlanApproval ??
        governancePolicy?.approval?.requirePlanApproval ??
        DEFAULT_TEAM_CONFIG.requirePlanApproval ??
        false,
      requireDelegationApproval:
        governancePolicy?.approval?.requireDelegationApproval ?? false,
    },
    budget: {
      tokenBudget,
      warningThreshold: governancePolicy?.budget?.warningThreshold ?? 0.8,
      criticalThreshold: governancePolicy?.budget?.criticalThreshold ?? 0.95,
      onCritical:
        governancePolicy?.budget?.onCritical ??
        (tokenBudget > 0 ? 'pause_for_review' : 'notify'),
    },
    escalation: {
      allowOperatorPatternOverride:
        governancePolicy?.escalation?.allowOperatorPatternOverride ?? true,
      pauseOnHighRisk: governancePolicy?.escalation?.pauseOnHighRisk ?? false,
    },
  };
};

export const normalizeAgentTeamConfig = (
  config: Partial<AgentTeamConfig> = {}
): AgentTeamConfig => {
  const mergedConfig: AgentTeamConfig = {
    ...DEFAULT_TEAM_CONFIG,
    ...config,
  };

  const preferredExecutionPattern =
    config.preferredExecutionPattern ??
    mapExecutionModeToExecutionPattern(mergedConfig.executionMode);
  const governancePolicy = normalizeGovernancePolicy(config.governancePolicy, mergedConfig);

  return {
    ...mergedConfig,
    preferredExecutionPattern,
    governancePolicy,
    tokenBudget: mergedConfig.tokenBudget ?? governancePolicy.budget.tokenBudget,
  };
};

export const hydrateDelegationRecordFromMetadata = ({
  teamId,
  taskId,
  metadata,
  fallbackCreatedAt = new Date(),
}: {
  teamId: string;
  taskId: string;
  metadata?: Record<string, unknown>;
  fallbackCreatedAt?: Date;
}): TeamDelegationRecord | undefined => {
  if (!isRecord(metadata)) {
    return undefined;
  }

  if (isRecord(metadata.delegationRecord)) {
    const record = metadata.delegationRecord as Record<string, unknown>;
    const createdAt = readDate(record.createdAt, fallbackCreatedAt);
    const completedAt =
      record.completedAt !== undefined ? readDate(record.completedAt, createdAt) : undefined;

    return {
      id: typeof record.id === 'string' ? record.id : 'delegation-record',
      sourceTeamId: typeof record.sourceTeamId === 'string' ? record.sourceTeamId : teamId,
      sourceTaskId: typeof record.sourceTaskId === 'string' ? record.sourceTaskId : taskId,
      targetType: typeof record.targetType === 'string' ? record.targetType as 'sub_agent' | 'team' | 'background' : 'background',
      targetId: typeof record.targetId === 'string' ? record.targetId : undefined,
      status: normalizeDelegationStatus(record.status),
      reason:
        typeof record.reason === 'string' && record.reason.trim().length > 0
          ? record.reason
          : 'Delegated task',
      manual: typeof record.manual === 'boolean' ? record.manual : true,
      createdAt,
      updatedAt: readDate(record.updatedAt, completedAt ?? createdAt),
      completedAt,
      error: typeof record.error === 'string' ? record.error : undefined,
      result: typeof record.result === 'string' ? record.result : undefined,
      metadata: isRecord(record.metadata) ? record.metadata : undefined,
    };
  }

  if (typeof metadata.delegationId !== 'string') {
    return undefined;
  }

  const createdAt = fallbackCreatedAt;
  const completedAt =
    metadata.delegationCompletedAt !== undefined
      ? readDate(metadata.delegationCompletedAt, createdAt)
      : undefined;
  const targetType =
    metadata.delegatedToBackground === true ||
    typeof metadata.delegatedBackgroundAgentId === 'string'
      ? 'background'
      : 'team';

  return {
    id: metadata.delegationId,
    sourceTeamId: teamId,
    sourceTaskId: taskId,
    targetType,
    targetId:
      typeof metadata.delegatedBackgroundAgentId === 'string'
        ? metadata.delegatedBackgroundAgentId
        : typeof metadata.targetId === 'string'
          ? metadata.targetId
          : undefined,
    status: normalizeDelegationStatus(metadata.delegationStatus),
    reason:
      typeof metadata.delegationReason === 'string' && metadata.delegationReason.trim().length > 0
        ? metadata.delegationReason
        : 'Delegated to background agent',
    manual: metadata.autoDelegated === true ? false : true,
    createdAt,
    updatedAt: completedAt ?? createdAt,
    completedAt,
    error: typeof metadata.delegationError === 'string' ? metadata.delegationError : undefined,
    result: typeof metadata.delegationResult === 'string' ? metadata.delegationResult : undefined,
    metadata,
  };
};

export const normalizeAgentTeamTask = (task: AgentTeamTask): AgentTeamTask => {
  const delegationRecord =
    task.delegationRecord ??
    hydrateDelegationRecordFromMetadata({
      teamId: task.teamId,
      taskId: task.id,
      metadata: task.metadata,
      fallbackCreatedAt: task.createdAt,
    });

  if (!delegationRecord) {
    return task;
  }

  return {
    ...task,
    delegationRecord,
  };
};
