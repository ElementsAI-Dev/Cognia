import { AgentTeamManager } from './agent-team';
import type { AgentTeam, AgentTeamTask } from '@/types/agent/agent-team';

describe('AgentTeamManager compatibility mapping', () => {
  it('normalizes legacy config into execution pattern and governance policy on team creation', () => {
    const manager = new AgentTeamManager();

    const team = manager.createTeam({
      name: 'Compat Team',
      task: 'Route complex work',
      config: {
        executionMode: 'autonomous',
        requirePlanApproval: true,
        tokenBudget: 9000,
      },
    });

    const typedTeam = team as typeof team & { selectedExecutionPattern?: string };
    const typedConfig = team.config as typeof team.config & {
      preferredExecutionPattern?: string;
      governancePolicy?: {
        approval?: {
          requirePlanApproval?: boolean;
        };
        budget?: {
          tokenBudget?: number;
          onCritical?: string;
        };
      };
    };

    expect(typedTeam.selectedExecutionPattern).toBe('parallel_specialists');
    expect(typedConfig.preferredExecutionPattern).toBe('parallel_specialists');
    expect(typedConfig.governancePolicy?.approval?.requirePlanApproval).toBe(true);
    expect(typedConfig.governancePolicy?.budget?.tokenBudget).toBe(9000);
    expect(typedConfig.governancePolicy?.budget?.onCritical).toBe('pause_for_review');
  });

  it('hydrates legacy delegation metadata into a delegation record when creating a task', () => {
    const manager = new AgentTeamManager();
    const team = manager.createTeam({
      name: 'Compat Team',
      task: 'Background delegation',
    });

    const task = manager.createTask({
      teamId: team.id,
      title: 'Delegate me',
      description: 'Long-running work',
      metadata: {
        delegationId: 'delegation-legacy',
        delegationStatus: 'active',
        delegatedToBackground: true,
        delegatedBackgroundAgentId: 'background-1',
        delegationReason: 'Needs async execution',
      },
    });

    const typedTask = task as typeof task & {
      delegationRecord?: {
        id: string;
        status: string;
        targetType: string;
        targetId?: string;
        reason?: string;
      };
    };

    expect(typedTask.delegationRecord).toEqual(
      expect.objectContaining({
        id: 'delegation-legacy',
        status: 'active',
        targetType: 'background',
        targetId: 'background-1',
        reason: 'Needs async execution',
      })
    );
  });

  it('assesses routing and records execution pattern overrides on the team', () => {
    const manager = new AgentTeamManager();
    const team = manager.createTeam({
      name: 'Routing Team',
      task: 'Research multiple approaches, compare results, and synthesize a final recommendation with specialist perspectives.',
    });

    manager.addTeammate({
      teamId: team.id,
      name: 'Researcher',
      config: { specialization: 'research' },
    });
    manager.addTeammate({
      teamId: team.id,
      name: 'Analyst',
      config: { specialization: 'analysis' },
    });

    const typedManager = manager as AgentTeamManager & {
      assessTeamRouting?: (teamId: string) => {
        recommendedPattern: string;
        acceptedPattern?: string;
        overridePattern?: string;
      } | null;
      selectExecutionPattern?: (teamId: string, pattern: string) => AgentTeam | null;
    };

    const assessment = typedManager.assessTeamRouting?.(team.id);
    expect(assessment?.recommendedPattern).toBe('parallel_specialists');

    const updatedTeam = typedManager.selectExecutionPattern?.(team.id, 'background_handoff');
    expect(updatedTeam?.selectedExecutionPattern).toBe('background_handoff');
    expect(updatedTeam?.routingAssessment?.acceptedPattern).toBe('background_handoff');
    expect(updatedTeam?.routingAssessment?.overridePattern).toBe('background_handoff');
    expect(updatedTeam?.executionReport?.checkpoints.map(checkpoint => checkpoint.type)).toEqual(
      expect.arrayContaining(['routing_assessed', 'pattern_selected'])
    );
  });

  it('pauses background delegation behind an approval checkpoint when governance requires it', async () => {
    const manager = new AgentTeamManager();
    const team = manager.createTeam({
      name: 'Approval Team',
      task: 'Delegate risky work',
      config: {
        governancePolicy: {
          approval: {
            requirePlanApproval: false,
            requireDelegationApproval: true,
          },
          budget: {
            tokenBudget: 0,
            warningThreshold: 0.8,
            criticalThreshold: 0.95,
            onCritical: 'notify',
          },
          escalation: {
            allowOperatorPatternOverride: true,
            pauseOnHighRisk: true,
          },
        },
      },
    });

    const task = manager.createTask({
      teamId: team.id,
      title: 'Needs approval',
      description: 'Long-running delegated work',
    });

    const delegationId = await manager.delegateTaskToBackground(team.id, task.id, {
      description: 'Manual delegation awaiting approval',
    });

    const refreshedTask = manager.getTask(task.id) as AgentTeamTask & {
      delegationRecord?: {
        id: string;
        status: string;
        targetType: string;
        reason?: string;
      };
    };
    const refreshedTeam = manager.getTeam(team.id);

    expect(delegationId).toBeTruthy();
    expect(refreshedTask.delegationRecord).toEqual(
      expect.objectContaining({
        id: delegationId,
        status: 'awaiting_approval',
        targetType: 'background',
        reason: 'Manual delegation awaiting approval',
      })
    );
    expect(refreshedTeam?.executionReport?.checkpoints.map(checkpoint => checkpoint.type)).toEqual(
      expect.arrayContaining(['approval_requested'])
    );
    expect(refreshedTeam?.executionReport?.summary?.approvalsRequested).toBe(1);
    expect(refreshedTeam?.executionReport?.summary?.delegatedTasks).toBe(1);
  });

  it('records an explicit terminal outcome when delegation approval is denied', async () => {
    const manager = new AgentTeamManager();
    const team = manager.createTeam({
      name: 'Approval Team',
      task: 'Delegate risky work',
      config: {
        governancePolicy: {
          approval: {
            requirePlanApproval: false,
            requireDelegationApproval: true,
          },
          budget: {
            tokenBudget: 0,
            warningThreshold: 0.8,
            criticalThreshold: 0.95,
            onCritical: 'notify',
          },
          escalation: {
            allowOperatorPatternOverride: true,
            pauseOnHighRisk: true,
          },
        },
      },
    });
    const task = manager.createTask({
      teamId: team.id,
      title: 'Needs approval',
      description: 'Long-running delegated work',
    });

    await manager.delegateTaskToBackground(team.id, task.id, {
      description: 'Manual delegation awaiting approval',
    });

    const typedManager = manager as AgentTeamManager & {
      resolveDelegationApproval?: (teamId: string, taskId: string, approved: boolean) => Promise<string | null>;
    };
    await typedManager.resolveDelegationApproval?.(team.id, task.id, false);

    const refreshedTask = manager.getTask(task.id) as AgentTeamTask & {
      delegationRecord?: {
        status: string;
        error?: string;
      };
      error?: string;
      status: string;
    };

    expect(refreshedTask.status).toBe('cancelled');
    expect(refreshedTask.error).toBe('Delegation approval denied');
    expect(refreshedTask.delegationRecord?.status).toBe('cancelled');
    expect(refreshedTask.delegationRecord?.error).toBe('Delegation approval denied');
  });

  it('pauses execution when the critical budget policy requires review', async () => {
    const manager = new AgentTeamManager();
    const team = manager.createTeam({
      name: 'Budget Team',
      task: 'Analyze the codebase',
      config: {
        tokenBudget: 100,
        governancePolicy: {
          approval: {
            requirePlanApproval: false,
            requireDelegationApproval: false,
          },
          budget: {
            tokenBudget: 100,
            warningThreshold: 0.8,
            criticalThreshold: 0.95,
            onCritical: 'pause_for_review',
          },
          escalation: {
            allowOperatorPatternOverride: true,
            pauseOnHighRisk: false,
          },
        },
      },
    });

    const worker = manager.addTeammate({
      teamId: team.id,
      name: 'Worker',
      description: 'Executes tasks',
    });
    manager.createTask({
      teamId: team.id,
      title: 'Already budget bound',
      description: 'Do not start me',
    });

    if (worker) {
      worker.tokenUsage.totalTokens = 100;
    }

    const result = await manager.executeTeam(team.id);
    expect(result.status).toBe('paused');
    expect(result.error).toBe('Team execution paused for budget review');
    expect(result.executionReport?.checkpoints.map(checkpoint => checkpoint.type)).toEqual(
      expect.arrayContaining(['routing_assessed', 'budget_escalated'])
    );
    expect(result.executionReport?.summary?.nextActions).toContain('Review budget policy before resuming execution');
  });
});
