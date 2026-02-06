/**
 * AgentTeam Store Tests
 */

import { act } from '@testing-library/react';
import { useAgentTeamStore } from './agent-team-store';
import { BUILT_IN_TEAM_TEMPLATES, DEFAULT_TEAM_CONFIG } from '@/types/agent/agent-team';

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

    it('should set the new team as active', () => {
      getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      expect(getStore().activeTeamId).not.toBeNull();
    });

    it('should update team', () => {
      const team = getStore().createTeam({ name: 'Test Team', task: 'Test task' });
      getStore().updateTeam(team.id, { name: 'Updated Name' });
      expect(getStore().teams[team.id].name).toBe('Updated Name');
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
