import {
  selectActiveTeam,
  selectActiveTeamExecutionReport,
  selectActiveTeamRoutingAssessment,
  selectActiveTeamSelectedExecutionPattern,
} from './selectors';
import type { AgentTeamState } from './types';
import { DEFAULT_TEAM_CONFIG } from '@/types/agent/agent-team';

describe('agent team selectors', () => {
  it('returns routing and execution report details for the active team', () => {
    const state = {
      teams: {
        'team-1': {
          id: 'team-1',
          name: 'Active Team',
          description: '',
          task: 'Analyze',
          status: 'idle',
          config: { ...DEFAULT_TEAM_CONFIG },
          routingAssessment: {
            recommendedPattern: 'manager_worker',
            confidence: 0.82,
            reason: 'Needs coordination',
            factors: {
              taskComplexity: 'complex',
              specializationNeeded: true,
              contextIsolationNeeded: true,
              delegationCandidate: false,
              budgetPressure: 'low',
            },
            createdAt: new Date('2026-03-14T10:00:00.000Z'),
          },
          selectedExecutionPattern: 'manager_worker',
          leadId: 'lead-1',
          teammateIds: ['lead-1'],
          taskIds: [],
          messageIds: [],
          progress: 0,
          totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          executionReport: {
            id: 'report-1',
            teamId: 'team-1',
            status: 'running',
            activeExecutionPattern: 'manager_worker',
            checkpoints: [],
            createdAt: new Date('2026-03-14T10:00:00.000Z'),
            updatedAt: new Date('2026-03-14T10:05:00.000Z'),
          },
        },
      },
      teammates: {},
      tasks: {},
      messages: {},
      templates: {},
      events: [],
      activeTeamId: 'team-1',
      selectedTeammateId: null,
      displayMode: 'expanded',
      isPanelOpen: false,
      defaultConfig: { ...DEFAULT_TEAM_CONFIG },
    } as unknown as AgentTeamState;

    expect(selectActiveTeam(state)?.id).toBe('team-1');
    expect(selectActiveTeamRoutingAssessment(state)?.recommendedPattern).toBe('manager_worker');
    expect(selectActiveTeamSelectedExecutionPattern(state)).toBe('manager_worker');
    expect(selectActiveTeamExecutionReport(state)?.id).toBe('report-1');
  });
});
