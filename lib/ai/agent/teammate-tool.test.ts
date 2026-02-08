/**
 * TeammateTool Tests
 *
 * Tests for the agent team tools that allow AI to manage teams programmatically.
 */

import {
  createSpawnTeamTool,
  createSpawnTeammateTool,
  createAssignTaskTool,
  createSendTeamMessageTool,
  createGetTeamStatusTool,
  createShutdownTeammateTool,
  createSpawnTeamFromTemplateTool,
  createTeamTools,
  getTeamToolsSystemPrompt,
} from './teammate-tool';
import {
  AgentTeamManager,
  setAgentTeamManager,
  resetAgentTeamManager,
} from './agent-team';
import { BUILT_IN_TEAM_TEMPLATES } from '@/types/agent/agent-team';

// Setup/teardown
let manager: AgentTeamManager;

beforeEach(() => {
  manager = new AgentTeamManager();
  setAgentTeamManager(manager);
});

afterEach(() => {
  resetAgentTeamManager();
});

describe('TeammateTool', () => {
  describe('createTeamTools', () => {
    it('should create all basic team tools', () => {
      const tools = createTeamTools();
      expect(Object.keys(tools)).toContain('spawn_team');
      expect(Object.keys(tools)).toContain('spawn_teammate');
      expect(Object.keys(tools)).toContain('assign_task');
      expect(Object.keys(tools)).toContain('send_team_message');
      expect(Object.keys(tools)).toContain('get_team_status');
      expect(Object.keys(tools)).toContain('shutdown_teammate');
    });

    it('should include template tool when templates are provided', () => {
      const tools = createTeamTools(BUILT_IN_TEAM_TEMPLATES);
      expect(Object.keys(tools)).toContain('spawn_team_from_template');
    });

    it('should not include template tool when no templates', () => {
      const tools = createTeamTools();
      expect(Object.keys(tools)).not.toContain('spawn_team_from_template');
    });
  });

  describe('spawn_team', () => {
    it('should create a team with teammates', async () => {
      const tool = createSpawnTeamTool();
      const result = await tool.execute({
        name: 'Review Team',
        task: 'Review the authentication module',
        teammates: [
          { name: 'Security Reviewer', description: 'Reviews security', specialization: 'security' },
          { name: 'Perf Reviewer', description: 'Reviews performance' },
        ],
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.teamId).toBeDefined();
      expect(result.teamName).toBe('Review Team');
      expect((result.teammates as Array<unknown>)).toHaveLength(2);
    });

    it('should create a team with execution mode', async () => {
      const tool = createSpawnTeamTool();
      const result = await tool.execute({
        name: 'Auto Team',
        task: 'Debug the issue',
        executionMode: 'autonomous',
        teammates: [
          { name: 'Agent A', description: 'First investigator' },
        ],
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      const team = manager.getTeam(result.teamId as string);
      expect(team?.config.executionMode).toBe('autonomous');
    });

    it('should auto-create manager and still work after reset', async () => {
      resetAgentTeamManager();
      const tool = createSpawnTeamTool();
      const result = await tool.execute({
        name: 'Test',
        task: 'Test',
        teammates: [{ name: 'A', description: 'B' }],
      }) as Record<string, unknown>;

      // getAgentTeamManager auto-creates a new manager, so this should succeed
      expect(result.success).toBe(true);
    });
  });

  describe('spawn_teammate', () => {
    it('should add a teammate to an existing team', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tool = createSpawnTeammateTool();

      const result = await tool.execute({
        teamId: team.id,
        name: 'New Teammate',
        description: 'A dynamically added member',
        specialization: 'testing',
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.teammateId).toBeDefined();
      expect(result.name).toBe('New Teammate');
    });

    it('should fail for non-existent team', async () => {
      const tool = createSpawnTeammateTool();
      const result = await tool.execute({
        teamId: 'non-existent',
        name: 'Test',
        description: 'Test',
      }) as Record<string, unknown>;

      expect(result.error).toBeDefined();
    });
  });

  describe('assign_task', () => {
    it('should create a task in the team', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tool = createAssignTaskTool();

      const result = await tool.execute({
        teamId: team.id,
        title: 'Review auth module',
        description: 'Check for security vulnerabilities',
        priority: 'high',
        tags: ['security'],
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.title).toBe('Review auth module');
    });

    it('should create a task with dependencies', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tool = createAssignTaskTool();

      const task1 = await tool.execute({
        teamId: team.id,
        title: 'Step 1',
        description: 'First step',
      }) as Record<string, unknown>;

      const task2 = await tool.execute({
        teamId: team.id,
        title: 'Step 2',
        description: 'Depends on step 1',
        dependencies: [task1.taskId as string],
      }) as Record<string, unknown>;

      expect(task2.success).toBe(true);
      expect(task2.status).toBe('blocked');
    });
  });

  describe('send_team_message', () => {
    it('should send a broadcast message', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tool = createSendTeamMessageTool();

      const result = await tool.execute({
        teamId: team.id,
        senderId: team.leadId,
        content: 'Hello team!',
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.type).toBe('broadcast');
    });

    it('should send a direct message', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tm = manager.addTeammate({ teamId: team.id, name: 'Reviewer', description: 'R' });
      const tool = createSendTeamMessageTool();

      const result = await tool.execute({
        teamId: team.id,
        senderId: team.leadId,
        content: 'Please start reviewing',
        recipientId: tm!.id,
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.type).toBe('direct');
    });
  });

  describe('get_team_status', () => {
    it('should return team status with details', async () => {
      const team = manager.createTeam({ name: 'Status Team', task: 'Test status' });
      manager.addTeammate({ teamId: team.id, name: 'Worker', description: 'Does work' });
      manager.createTask({ teamId: team.id, title: 'Task 1', description: 'Do something' });

      const tool = createGetTeamStatusTool();
      const result = await tool.execute({ teamId: team.id }) as Record<string, unknown>;

      expect(result.team).toBeDefined();
      expect((result.team as Record<string, unknown>).name).toBe('Status Team');
      expect((result.team as Record<string, unknown>).status).toBe('idle');
      expect((result.teammates as Array<unknown>).length).toBeGreaterThanOrEqual(2); // lead + worker
      expect((result.tasks as Array<unknown>)).toHaveLength(1);
      expect((result.summary as Record<string, unknown>).totalTasks).toBe(1);
    });

    it('should return error for non-existent team', async () => {
      const tool = createGetTeamStatusTool();
      const result = await tool.execute({ teamId: 'bad-id' }) as Record<string, unknown>;
      expect(result.error).toBeDefined();
    });
  });

  describe('shutdown_teammate', () => {
    it('should shutdown a teammate', async () => {
      const team = manager.createTeam({ name: 'T', task: 'Test' });
      const tm = manager.addTeammate({ teamId: team.id, name: 'Worker', description: 'W' });
      const tool = createShutdownTeammateTool();

      const result = await tool.execute({ teammateId: tm!.id }) as Record<string, unknown>;
      expect(result.success).toBe(true);
    });
  });

  describe('spawn_team_from_template', () => {
    it('should create a team from a built-in template', async () => {
      const tool = createSpawnTeamFromTemplateTool(BUILT_IN_TEAM_TEMPLATES);

      const result = await tool.execute({
        templateId: 'parallel-review',
        task: 'Review the login module',
      }) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.teamId).toBeDefined();
      expect((result.teammateCount as number)).toBeGreaterThanOrEqual(3);
    });

    it('should return error for non-existent template', async () => {
      const tool = createSpawnTeamFromTemplateTool(BUILT_IN_TEAM_TEMPLATES);

      const result = await tool.execute({
        templateId: 'non-existent-template',
        task: 'Test',
      }) as Record<string, unknown>;

      expect(result.error).toBeDefined();
    });
  });

  describe('getTeamToolsSystemPrompt', () => {
    it('should return a non-empty system prompt', () => {
      const prompt = getTeamToolsSystemPrompt();
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('Agent Team Tools');
      expect(prompt).toContain('spawn_team');
    });
  });
});
