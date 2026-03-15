/**
 * AgentTeam Store Tests
 */

import { act } from '@testing-library/react';
import { useAgentTeamStore } from './agent-team-store';
import {
  BUILT_IN_TEAM_TEMPLATES,
  DEFAULT_TEAM_CONFIG,
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type AgentTeamMessage,
} from '@/types/agent/agent-team';

const getStore = () => useAgentTeamStore.getState();

// Reset store before each test
beforeEach(() => {
  act(() => {
    getStore().reset();
  });
});

describe('AgentTeamStore', () => {
  describe('initial state', () => {
    it('should have empty teams, teammates, tasks, messages', () => {
      const state = getStore();
      expect(Object.keys(state.teams)).toHaveLength(0);
      expect(Object.keys(state.teammates)).toHaveLength(0);
      expect(Object.keys(state.tasks)).toHaveLength(0);
      expect(Object.keys(state.messages)).toHaveLength(0);
    });

    it('should have built-in templates', () => {
      expect(Object.keys(getStore().templates).length).toBeGreaterThanOrEqual(BUILT_IN_TEAM_TEMPLATES.length);
    });

    it('should have default config', () => {
      expect(getStore().defaultConfig).toMatchObject(DEFAULT_TEAM_CONFIG);
    });

    it('should have no active team', () => {
      expect(getStore().activeTeamId).toBeNull();
      expect(getStore().selectedTeammateId).toBeNull();
    });
  });

  describe('team CRUD', () => {
    it('should create a team with a lead', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });

      const state = getStore();
      expect(state.teams[team.id]).toBeDefined();
      expect(state.teams[team.id].name).toBe('Test Team');
      expect(state.teams[team.id].task).toBe('Test task');
      expect(state.teams[team.id].status).toBe('idle');
      expect(state.teams[team.id].teammateIds).toHaveLength(1);

      const leadId = state.teams[team.id].leadId;
      expect(state.teammates[leadId]).toBeDefined();
      expect(state.teammates[leadId].role).toBe('lead');
      expect(state.teammates[leadId].name).toBe('Team Lead');
    });

    it('should create a team with adaptive orchestration defaults derived from legacy config', () => {
      const team = getStore().createTeam({
        name: 'Adaptive Team',
        task: 'Analyze a complex task',
        config: {
          executionMode: 'coordinated',
          requirePlanApproval: true,
          tokenBudget: 4000,
        },
      });

      const createdTeam = getStore().teams[team.id] as AgentTeam & {
        selectedExecutionPattern?: string;
      };
      const config = createdTeam.config as typeof createdTeam.config & {
        preferredExecutionPattern?: string;
        governancePolicy?: {
          approval?: {
            requirePlanApproval?: boolean;
            requireDelegationApproval?: boolean;
          };
          budget?: {
            tokenBudget?: number;
            onCritical?: string;
          };
          escalation?: {
            allowOperatorPatternOverride?: boolean;
          };
        };
      };

      expect(createdTeam.selectedExecutionPattern).toBe('manager_worker');
      expect(config.preferredExecutionPattern).toBe('manager_worker');
      expect(config.governancePolicy?.approval?.requirePlanApproval).toBe(true);
      expect(config.governancePolicy?.approval?.requireDelegationApproval).toBe(false);
      expect(config.governancePolicy?.budget?.tokenBudget).toBe(4000);
      expect(config.governancePolicy?.budget?.onCritical).toBe('pause_for_review');
      expect(config.governancePolicy?.escalation?.allowOperatorPatternOverride).toBe(true);
    });

    it('should set the new team as active', () => {
      getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      expect(getStore().activeTeamId).not.toBeNull();
    });

    it('should update team', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().updateTeam(team.id, { name: 'Updated Name' });
      expect(getStore().teams[team.id].name).toBe('Updated Name');
    });

    it('should update team config', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      const originalConfig = getStore().teams[team.id].config;
      const newConfig = { ...originalConfig, executionMode: 'autonomous' as const, tokenBudget: 50000 };
      getStore().updateTeamConfig(team.id, newConfig);

      const updated = getStore().teams[team.id];
      expect(updated.config.executionMode).toBe('autonomous');
      expect(updated.config.tokenBudget).toBe(50000);
    });

    it('should normalize legacy config when updating team config', () => {
      const team = getStore().createTeam({ name: 'Config Team', task: 'Config task' });

      getStore().updateTeamConfig(team.id, {
        ...getStore().teams[team.id].config,
        executionMode: 'delegate',
        requirePlanApproval: false,
        tokenBudget: 2500,
      });

      const updated = getStore().teams[team.id] as AgentTeam & {
        selectedExecutionPattern?: string;
      };
      const config = updated.config as typeof updated.config & {
        preferredExecutionPattern?: string;
        governancePolicy?: {
          budget?: {
            tokenBudget?: number;
            onCritical?: string;
          };
        };
      };

      expect(updated.selectedExecutionPattern).toBe('background_handoff');
      expect(config.preferredExecutionPattern).toBe('background_handoff');
      expect(config.governancePolicy?.budget?.tokenBudget).toBe(2500);
      expect(config.governancePolicy?.budget?.onCritical).toBe('pause_for_review');
    });

    it('should not update config for nonexistent team', () => {
      const before = { ...getStore() };
      getStore().updateTeamConfig('nonexistent', { ...DEFAULT_TEAM_CONFIG });
      expect(Object.keys(getStore().teams)).toEqual(Object.keys(before.teams));
    });

    it('should set team status with timestamps', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });

      getStore().setTeamStatus(team.id, 'executing');
      const executing = getStore().teams[team.id];
      expect(executing.status).toBe('executing');
      expect(executing.startedAt).toBeDefined();

      getStore().setTeamStatus(team.id, 'completed');
      const completed = getStore().teams[team.id];
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
      expect(completed.totalDuration).toBeDefined();
    });

    it('should delete team via cleanup', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().cleanupTeam(team.id);

      const state = getStore();
      expect(state.teams[team.id]).toBeUndefined();
      expect(state.activeTeamId).toBeNull();
    });
  });

  describe('upsert operations', () => {
    it('upsertTeam should store an externally-created team with same id (no new id generation)', () => {
      const externalTeam: AgentTeam = {
        id: 'external-team-id',
        name: 'External Team',
        description: 'Imported team',
        task: 'Imported task',
        status: 'idle',
        config: { ...DEFAULT_TEAM_CONFIG },
        leadId: 'external-lead-id',
        teammateIds: ['external-lead-id'],
        taskIds: [],
        messageIds: [],
        progress: 0,
        totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      getStore().upsertTeam(externalTeam);

      const state = getStore();
      expect(state.teams['external-team-id']).toEqual(externalTeam);
      expect(Object.keys(state.teams)).toEqual(['external-team-id']);
    });

    it('upsertTask should be idempotent (same id written twice updates entry without duplicates)', () => {
      const team = getStore().createTeam({ name: 'Team For Upsert', task: 'Validate upsert' });

      const initialTask: AgentTeamTask = {
        id: 'external-task-id',
        teamId: team.id,
        title: 'First title',
        description: 'First description',
        status: 'pending',
        priority: 'normal',
        dependencies: [],
        tags: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        order: 0,
      };

      getStore().upsertTask(initialTask);
      getStore().upsertTask({
        ...initialTask,
        title: 'Updated title',
        description: 'Updated description',
      });

      const state = getStore();
      expect(state.tasks['external-task-id'].title).toBe('Updated title');
      expect(Object.values(state.tasks)).toHaveLength(1);
      expect(state.teams[team.id].taskIds.filter(id => id === 'external-task-id')).toHaveLength(1);
      expect(state.getTeamTasks(team.id).filter(task => task.id === 'external-task-id')).toHaveLength(1);
    });

    it('upsertTask should no-op when target team does not exist', () => {
      const team = getStore().createTeam({ name: 'Task Team', task: 'Task Work' });
      const task = getStore().createTask({ teamId: team.id, title: 'Keep me', description: 'Stay put' });

      getStore().upsertTask({
        ...task,
        teamId: 'missing-team',
        title: 'Moved away',
      });

      const state = getStore();
      expect(state.tasks[task.id].teamId).toBe(team.id);
      expect(state.tasks[task.id].title).toBe('Keep me');
      expect(state.teams[team.id].taskIds.filter(id => id === task.id)).toHaveLength(1);
    });

    it('upsertTeammate should be idempotent and keep teammate references exactly once', () => {
      const team = getStore().createTeam({ name: 'Teammate Team', task: 'Teammate Work' });
      const teammate = getStore().addTeammate({ teamId: team.id, name: 'Idempotent Teammate' });

      const currentTeammate = getStore().teammates[teammate.id];
      getStore().upsertTeammate({ ...currentTeammate, description: 'Updated once' });
      getStore().upsertTeammate({ ...currentTeammate, description: 'Updated twice' });

      const state = getStore();
      expect(state.teammates[teammate.id].description).toBe('Updated twice');
      expect(state.teams[team.id].teammateIds.filter(id => id === teammate.id)).toHaveLength(1);
      expect(state.getTeammates(team.id).filter(tm => tm.id === teammate.id)).toHaveLength(1);
    });

    it('upsertTeammate should no-op when target team does not exist', () => {
      const team = getStore().createTeam({ name: 'Source Team', task: 'Keep teammate stable' });
      const teammate = getStore().addTeammate({ teamId: team.id, name: 'Stable Teammate' });

      const currentTeammate = getStore().teammates[teammate.id];
      getStore().upsertTeammate({
        ...currentTeammate,
        teamId: 'missing-team',
        description: 'Should not apply',
      });

      const state = getStore();
      expect(state.teammates[teammate.id].teamId).toBe(team.id);
      expect(state.teammates[teammate.id].description).toBe(currentTeammate.description);
      expect(state.teams[team.id].teammateIds.filter(id => id === teammate.id)).toHaveLength(1);
    });

    it('upsertTeammate should not move a lead to another team', () => {
      const sourceTeam = getStore().createTeam({ name: 'Source Team', task: 'Source task' });
      const targetTeam = getStore().createTeam({ name: 'Target Team', task: 'Target task' });
      const sourceLeadId = sourceTeam.leadId;
      const sourceLead = getStore().teammates[sourceLeadId] as AgentTeammate;

      getStore().upsertTeammate({
        ...sourceLead,
        teamId: targetTeam.id,
      });

      const state = getStore();
      expect(state.teammates[sourceLeadId].teamId).toBe(sourceTeam.id);
      expect(state.teams[sourceTeam.id].leadId).toBe(sourceLeadId);
      expect(state.teams[sourceTeam.id].teammateIds).toContain(sourceLeadId);
      expect(state.teams[targetTeam.id].teammateIds).not.toContain(sourceLeadId);
    });

    it('upsertMessage should be idempotent and keep message references exactly once', () => {
      const team = getStore().createTeam({ name: 'Message Team', task: 'Message work' });
      const message = getStore().addMessage({
        teamId: team.id,
        senderId: team.leadId,
        content: 'Initial',
      });

      const existingMessage = getStore().messages[message.id];
      getStore().upsertMessage({ ...existingMessage, content: 'Updated once' });
      getStore().upsertMessage({ ...existingMessage, content: 'Updated twice' });

      const state = getStore();
      expect(state.messages[message.id].content).toBe('Updated twice');
      expect(state.teams[team.id].messageIds.filter(id => id === message.id)).toHaveLength(1);
      expect(state.getTeamMessages(team.id).filter(msg => msg.id === message.id)).toHaveLength(1);
    });

    it('upsertMessage should no-op when target team does not exist', () => {
      const team = getStore().createTeam({ name: 'Stable Message Team', task: 'Do not move message' });
      const message = getStore().addMessage({
        teamId: team.id,
        senderId: team.leadId,
        content: 'Stay here',
      });

      const existingMessage = getStore().messages[message.id] as AgentTeamMessage;
      getStore().upsertMessage({
        ...existingMessage,
        teamId: 'missing-team',
        content: 'Should not apply',
      });

      const state = getStore();
      expect(state.messages[message.id].teamId).toBe(team.id);
      expect(state.messages[message.id].content).toBe('Stay here');
      expect(state.teams[team.id].messageIds.filter(id => id === message.id)).toHaveLength(1);
    });
  });

  describe('teammate management', () => {
    let teamId = '';

    beforeEach(() => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      teamId = team.id;
    });

    it('should add a teammate', () => {
      const tm = getStore().addTeammate({
        teamId,
        name: 'Reviewer',
        description: 'Code reviewer',
        config: { specialization: 'security' },
      });

      const state = getStore();
      expect(state.teammates[tm.id]).toBeDefined();
      expect(state.teammates[tm.id].name).toBe('Reviewer');
      expect(state.teammates[tm.id].config.specialization).toBe('security');
      expect(state.teams[teamId].teammateIds).toContain(tm.id);
    });

    it('should remove a teammate (not lead)', () => {
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });
      getStore().removeTeammate(tm.id);

      expect(getStore().teammates[tm.id]).toBeUndefined();
      expect(getStore().teams[teamId].teammateIds).not.toContain(tm.id);
    });

    it('should not remove the lead', () => {
      const leadId = getStore().teams[teamId].leadId;
      getStore().removeTeammate(leadId);
      expect(getStore().teammates[leadId]).toBeDefined();
    });

    it('should update teammate status', () => {
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });
      getStore().setTeammateStatus(tm.id, 'executing');
      expect(getStore().teammates[tm.id].status).toBe('executing');
    });

    it('should update teammate progress', () => {
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });
      getStore().setTeammateProgress(tm.id, 50);
      expect(getStore().teammates[tm.id].progress).toBe(50);
    });

    it('should clamp progress to 0-100', () => {
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });

      getStore().setTeammateProgress(tm.id, 150);
      expect(getStore().teammates[tm.id].progress).toBe(100);

      getStore().setTeammateProgress(tm.id, -10);
      expect(getStore().teammates[tm.id].progress).toBe(0);
    });
  });

  describe('task management', () => {
    let teamId = '';

    beforeEach(() => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      teamId = team.id;
    });

    it('should create a task', () => {
      const task = getStore().createTask({
        teamId,
        title: 'Review code',
        description: 'Review the auth module',
        priority: 'high',
        tags: ['security'],
      });

      const state = getStore();
      expect(state.tasks[task.id]).toBeDefined();
      expect(state.tasks[task.id].title).toBe('Review code');
      expect(state.tasks[task.id].priority).toBe('high');
      expect(state.tasks[task.id].status).toBe('pending');
      expect(state.teams[teamId].taskIds).toContain(task.id);
    });

    it('should hydrate legacy delegation metadata into a first-class delegation record on create', () => {
      const task = getStore().createTask({
        teamId,
        title: 'Background task',
        description: 'Delegate this task',
        metadata: {
          delegationId: 'delegation-1',
          delegationStatus: 'completed',
          delegatedToBackground: true,
          delegatedBackgroundAgentId: 'bg-agent-1',
          delegationError: 'none',
          delegationCompletedAt: '2026-03-14T08:00:00.000Z',
          delegationReason: 'Long-running task',
        },
      });

      const storedTask = getStore().tasks[task.id] as AgentTeamTask & {
        delegationRecord?: {
          id: string;
          status: string;
          targetType: string;
          targetId?: string;
          reason?: string;
          error?: string;
          completedAt?: Date;
        };
      };

      expect(storedTask.delegationRecord).toEqual(
        expect.objectContaining({
          id: 'delegation-1',
          status: 'completed',
          targetType: 'background',
          targetId: 'bg-agent-1',
          reason: 'Long-running task',
          error: 'none',
        })
      );
      expect(storedTask.delegationRecord?.completedAt).toBeInstanceOf(Date);
    });

    it('should hydrate legacy delegation metadata during upsert for externally refreshed tasks', () => {
      const task = getStore().createTask({ teamId, title: 'External task', description: 'Refresh me' });

      getStore().upsertTask({
        ...task,
        metadata: {
          delegationId: 'delegation-2',
          delegationStatus: 'active',
          delegatedToBackground: true,
          delegatedBackgroundAgentId: 'bg-agent-2',
        },
      });

      const storedTask = getStore().tasks[task.id] as AgentTeamTask & {
        delegationRecord?: {
          id: string;
          status: string;
          targetType: string;
          targetId?: string;
        };
      };

      expect(storedTask.delegationRecord).toEqual(
        expect.objectContaining({
          id: 'delegation-2',
          status: 'active',
          targetType: 'background',
          targetId: 'bg-agent-2',
        })
      );
    });

    it('should update task status with timestamps', () => {
      const task = getStore().createTask({ teamId, title: 'Review code', description: 'Review' });

      getStore().setTaskStatus(task.id, 'in_progress');
      expect(getStore().tasks[task.id].startedAt).toBeDefined();

      getStore().setTaskStatus(task.id, 'completed', 'All good');
      const updated = getStore().tasks[task.id];
      expect(updated.status).toBe('completed');
      expect(updated.result).toBe('All good');
      expect(updated.completedAt).toBeDefined();
      expect(updated.actualDuration).toBeDefined();
    });

    it('should claim a task', () => {
      const task = getStore().createTask({ teamId, title: 'Review code', description: 'Review' });
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });

      getStore().claimTask(task.id, tm.id);
      const claimed = getStore().tasks[task.id];
      expect(claimed.claimedBy).toBe(tm.id);
      expect(claimed.status).toBe('claimed');
    });

    it('should not claim non-pending task', () => {
      const task = getStore().createTask({ teamId, title: 'Review code', description: 'Review' });
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });

      getStore().setTaskStatus(task.id, 'completed');
      getStore().claimTask(task.id, tm.id);
      expect(getStore().tasks[task.id].status).toBe('completed');
    });

    it('should delete a task', () => {
      const task = getStore().createTask({ teamId, title: 'Review code', description: 'Review' });
      getStore().deleteTask(task.id);

      expect(getStore().tasks[task.id]).toBeUndefined();
      expect(getStore().teams[teamId].taskIds).not.toContain(task.id);
    });
  });

  describe('messaging', () => {
    let teamId = '';
    let leadId = '';
    let teammateId = '';

    beforeEach(() => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      teamId = team.id;
      leadId = team.leadId;
      const tm = getStore().addTeammate({ teamId, name: 'Reviewer' });
      teammateId = tm.id;
    });

    it('should send a direct message', () => {
      const msg = getStore().addMessage({
        teamId,
        senderId: leadId,
        recipientId: teammateId,
        content: 'Please review the code',
      });

      const state = getStore();
      expect(state.messages[msg.id]).toBeDefined();
      expect(state.messages[msg.id].type).toBe('direct');
      expect(state.messages[msg.id].senderId).toBe(leadId);
      expect(state.messages[msg.id].recipientId).toBe(teammateId);
      expect(state.teams[teamId].messageIds).toContain(msg.id);
    });

    it('should send a broadcast message', () => {
      const msg = getStore().addMessage({
        teamId,
        senderId: leadId,
        content: 'Team update: new task available',
      });
      expect(getStore().messages[msg.id].type).toBe('broadcast');
    });

    it('should mark messages as read', () => {
      const msg = getStore().addMessage({
        teamId,
        senderId: leadId,
        recipientId: teammateId,
        content: 'Hello',
      });

      expect(getStore().messages[msg.id].read).toBe(false);
      getStore().markMessageRead(msg.id);
      expect(getStore().messages[msg.id].read).toBe(true);
    });

    it('should get unread messages for a teammate', () => {
      getStore().addMessage({ teamId, senderId: leadId, recipientId: teammateId, content: 'Message 1' });
      getStore().addMessage({ teamId, senderId: leadId, content: 'Broadcast message' });

      const unread = getStore().getUnreadMessages(teammateId);
      expect(unread.length).toBe(2);
    });
  });

  describe('selectors', () => {
    it('should get teammates for a team', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().addTeammate({ teamId: team.id, name: 'A' });
      getStore().addTeammate({ teamId: team.id, name: 'B' });

      const teammates = getStore().getTeammates(team.id);
      expect(teammates).toHaveLength(3); // lead + 2 teammates
    });

    it('should get tasks sorted by order', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().createTask({ teamId: team.id, title: 'Task C', description: 'C', order: 2 });
      getStore().createTask({ teamId: team.id, title: 'Task A', description: 'A', order: 0 });
      getStore().createTask({ teamId: team.id, title: 'Task B', description: 'B', order: 1 });

      const tasks = getStore().getTeamTasks(team.id);
      expect(tasks[0].title).toBe('Task A');
      expect(tasks[1].title).toBe('Task B');
      expect(tasks[2].title).toBe('Task C');
    });

    it('should get active team', () => {
      getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      const activeTeam = getStore().getActiveTeam();
      expect(activeTeam).toBeDefined();
      expect(activeTeam?.name).toBe('Test Team');
    });
  });

  describe('batch operations', () => {
    it('should cancel all tasks', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().createTask({ teamId: team.id, title: 'Task 1', description: '1' });
      getStore().createTask({ teamId: team.id, title: 'Task 2', description: '2' });

      getStore().cancelAllTasks(team.id);
      const tasks = getStore().getTeamTasks(team.id);
      expect(tasks.every(t => t.status === 'cancelled')).toBe(true);
    });

    it('should shutdown all teammates', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().addTeammate({ teamId: team.id, name: 'A' });
      getStore().addTeammate({ teamId: team.id, name: 'B' });

      getStore().shutdownAllTeammates(team.id);
      const teammates = getStore().getTeammates(team.id);
      expect(teammates.every(t => t.status === 'shutdown')).toBe(true);
    });

    it('should cleanup team completely', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().addTeammate({ teamId: team.id, name: 'A' });
      getStore().createTask({ teamId: team.id, title: 'T', description: 'T' });
      getStore().addMessage({ teamId: team.id, senderId: team.leadId, content: 'Hi' });

      getStore().cleanupTeam(team.id);
      const state = getStore();
      expect(Object.keys(state.teams)).toHaveLength(0);
      expect(Object.keys(state.teammates)).toHaveLength(0);
      expect(Object.keys(state.tasks)).toHaveLength(0);
      expect(state.activeTeamId).toBeNull();
    });
  });

  describe('templates', () => {
    it('should have built-in templates', () => {
      const state = getStore();
      expect(state.templates['parallel-review']).toBeDefined();
      expect(state.templates['competing-hypotheses']).toBeDefined();
      expect(state.templates['research-team']).toBeDefined();
    });

    it('should add custom templates', () => {
      getStore().addTemplate({
        id: 'my-template',
        name: 'My Template',
        description: 'Custom template',
        category: 'general',
        teammates: [{ name: 'Worker', description: 'Does work' }],
        isBuiltIn: false,
      });
      expect(getStore().templates['my-template']).toBeDefined();
    });

    it('should not delete built-in templates', () => {
      getStore().deleteTemplate('parallel-review');
      expect(getStore().templates['parallel-review']).toBeDefined();
    });

    it('should delete custom templates', () => {
      getStore().addTemplate({
        id: 'my-template',
        name: 'My Template',
        description: 'Custom',
        category: 'general',
        teammates: [],
        isBuiltIn: false,
      });
      getStore().deleteTemplate('my-template');
      expect(getStore().templates['my-template']).toBeUndefined();
    });
  });

  describe('settings', () => {
    it('should update default config', () => {
      getStore().updateDefaultConfig({ maxTeammates: 20, executionMode: 'delegate' });
      const config = getStore().defaultConfig;
      expect(config.maxTeammates).toBe(20);
      expect(config.executionMode).toBe('delegate');
      expect(config.maxConcurrentTeammates).toBe(DEFAULT_TEAM_CONFIG.maxConcurrentTeammates);
    });
  });

  describe('UI state', () => {
    it('should set display mode', () => {
      getStore().setDisplayMode('split');
      expect(getStore().displayMode).toBe('split');
    });

    it('should toggle panel open', () => {
      getStore().setIsPanelOpen(true);
      expect(getStore().isPanelOpen).toBe(true);
    });

    it('should set selected teammate', () => {
      getStore().setSelectedTeammate('some-id');
      expect(getStore().selectedTeammateId).toBe('some-id');
    });
  });

  describe('template management', () => {
    it('should save a team as a custom template', () => {
      const team = getStore().createTeam({ name: 'Research Team', task: 'Research AI' });
      getStore().addTeammate({ teamId: team.id, name: 'Researcher', description: 'Primary researcher', config: { specialization: 'research' } });
      getStore().addTeammate({ teamId: team.id, name: 'Analyst', description: 'Data analyst', config: { specialization: 'analysis' } });

      const template = getStore().saveAsTemplate(team.id, 'My Research Template', 'research');

      expect(template).not.toBeNull();
      expect(template!.name).toBe('My Research Template');
      expect(template!.category).toBe('research');
      expect(template!.isBuiltIn).toBe(false);
      expect(template!.teammates).toHaveLength(2);
      expect(template!.teammates[0].name).toBe('Researcher');
      expect(template!.teammates[1].name).toBe('Analyst');
      expect(getStore().templates[template!.id]).toBeDefined();
    });

    it('should return null when saving template for non-existent team', () => {
      const result = getStore().saveAsTemplate('non-existent', 'Test');
      expect(result).toBeNull();
    });

    it('should update a custom template', () => {
      const team = getStore().createTeam({ name: 'Test', task: 'Test' });
      const template = getStore().saveAsTemplate(team.id, 'Original Name');
      expect(template).not.toBeNull();

      getStore().updateTemplate(template!.id, { name: 'Updated Name', description: 'New desc' });
      const updated = getStore().templates[template!.id];
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New desc');
      expect(updated.isBuiltIn).toBe(false);
    });

    it('should not update built-in templates', () => {
      const builtInId = Object.values(getStore().templates).find(t => t.isBuiltIn)?.id;
      if (builtInId) {
        const original = getStore().templates[builtInId];
        getStore().updateTemplate(builtInId, { name: 'Hacked Name' });
        expect(getStore().templates[builtInId].name).toBe(original.name);
      }
    });

    it('should import templates', () => {
      const count = getStore().importTemplates([
        { id: 'imported-1', name: 'Imported A', description: 'Desc A', category: 'general', teammates: [] },
        { id: 'imported-2', name: 'Imported B', description: 'Desc B', category: 'debugging', teammates: [] },
      ]);

      expect(count).toBe(2);
      expect(getStore().templates['imported-1']).toBeDefined();
      expect(getStore().templates['imported-2']).toBeDefined();
      expect(getStore().templates['imported-1'].isBuiltIn).toBe(false);
    });

    it('should not overwrite built-in templates during import', () => {
      const builtIn = Object.values(getStore().templates).find(t => t.isBuiltIn);
      if (builtIn) {
        getStore().importTemplates([
          { id: builtIn.id, name: 'Overwrite Attempt', description: 'X', category: 'general', teammates: [] },
        ]);
        expect(getStore().templates[builtIn.id].name).toBe(builtIn.name);
      }
    });

    it('should export only custom templates', () => {
      const team = getStore().createTeam({ name: 'T', task: 'T' });
      getStore().saveAsTemplate(team.id, 'Custom Template');

      const exported = getStore().exportTemplates();
      expect(exported.length).toBeGreaterThanOrEqual(1);
      expect(exported.every(t => !t.isBuiltIn)).toBe(true);
      expect(exported.some(t => t.name === 'Custom Template')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      expect(Object.keys(getStore().teams).length).toBeGreaterThan(0);

      getStore().reset();
      const state = getStore();
      expect(Object.keys(state.teams)).toHaveLength(0);
      expect(Object.keys(state.teammates)).toHaveLength(0);
      expect(state.activeTeamId).toBeNull();
      expect(Object.keys(state.templates).length).toBeGreaterThan(0);
    });
  });
});
