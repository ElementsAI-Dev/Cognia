/**
 * Tests for Agent Orchestrator
 */

import {
  AgentOrchestrator,
  createOrchestrator,
  executeOrchestrated,
  type OrchestratorConfig,
  type OrchestratorExecutionOptions,
  type SubAgentPlan,
} from './agent-orchestrator';

// Mock dependencies
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

jest.mock('./sub-agent-executor', () => ({
  createSubAgent: jest.fn((input) => ({
    id: `sub-${Date.now()}-${Math.random()}`,
    parentAgentId: input.parentAgentId,
    name: input.name,
    description: input.description,
    task: input.task,
    status: 'pending',
    config: input.config || {},
    logs: [],
    progress: 0,
    createdAt: new Date(),
    retryCount: 0,
    order: input.order || 0,
  })),
  executeSubAgentsParallel: jest.fn(),
  executeSubAgentsSequential: jest.fn(),
  cancelAllSubAgents: jest.fn(),
}));

import { generateText } from 'ai';
import {
  executeSubAgentsParallel,
  executeSubAgentsSequential,
} from './sub-agent-executor';

const mockGenerateText = generateText as jest.Mock;
const mockExecuteParallel = executeSubAgentsParallel as jest.Mock;
const mockExecuteSequential = executeSubAgentsSequential as jest.Mock;

const createMockConfig = (): OrchestratorConfig => ({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'test-key',
});

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates orchestrator with default config', () => {
      const orchestrator = new AgentOrchestrator(createMockConfig());

      expect(orchestrator).toBeDefined();
      expect(orchestrator.getIsRunning()).toBe(false);
      expect(orchestrator.getSubAgents()).toEqual([]);
    });

    it('creates orchestrator with custom config', () => {
      const config: OrchestratorConfig = {
        ...createMockConfig(),
        maxSubAgents: 5,
        maxConcurrentSubAgents: 2,
        enableAutoPlanning: false,
      };

      const orchestrator = new AgentOrchestrator(config);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('generatePlan', () => {
    it('generates execution plan from task', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          executionMode: 'parallel',
          reasoning: 'Tasks are independent',
          subAgents: [
            { name: 'Agent 1', description: 'First', task: 'Task 1', priority: 'high' },
            { name: 'Agent 2', description: 'Second', task: 'Task 2', priority: 'normal' },
          ],
        }),
      });

      const orchestrator = new AgentOrchestrator(createMockConfig());
      const plan = await orchestrator.generatePlan('Complex task');

      expect(plan).toBeDefined();
      expect(plan.task).toBe('Complex task');
      expect(plan.executionMode).toBe('parallel');
      expect(plan.subAgents).toHaveLength(2);
      expect(plan.reasoning).toBe('Tasks are independent');
    });

    it('handles plan with dependencies', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          executionMode: 'sequential',
          reasoning: 'Tasks have dependencies',
          subAgents: [
            { name: 'Setup', description: 'Setup env', task: 'Setup', priority: 'critical' },
            { name: 'Build', description: 'Build app', task: 'Build', dependencies: ['Setup'] },
          ],
        }),
      });

      const orchestrator = new AgentOrchestrator(createMockConfig());
      const plan = await orchestrator.generatePlan('Deploy application');

      expect(plan.executionMode).toBe('sequential');
      expect(plan.subAgents[1].dependencies).toEqual(['Setup']);
    });

    it('throws error on invalid response', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Invalid response without JSON',
      });

      const orchestrator = new AgentOrchestrator(createMockConfig());

      await expect(orchestrator.generatePlan('Task')).rejects.toThrow('Failed to parse');
    });
  });

  describe('createSubAgentsFromPlan', () => {
    it('creates sub-agents from plan', () => {
      const orchestrator = new AgentOrchestrator(createMockConfig());
      const plan: SubAgentPlan = {
        id: 'plan-1',
        task: 'Main task',
        executionMode: 'parallel',
        reasoning: 'Test',
        subAgents: [
          { name: 'Agent 1', description: 'Desc 1', task: 'Task 1' },
          { name: 'Agent 2', description: 'Desc 2', task: 'Task 2' },
        ],
      };

      const subAgents = orchestrator.createSubAgentsFromPlan(plan, 'parent-1');

      expect(subAgents).toHaveLength(2);
      expect(subAgents[0].name).toBe('Agent 1');
      expect(subAgents[1].name).toBe('Agent 2');
    });

    it('resolves dependencies between sub-agents', () => {
      const orchestrator = new AgentOrchestrator(createMockConfig());
      const plan: SubAgentPlan = {
        id: 'plan-1',
        task: 'Main task',
        executionMode: 'sequential',
        reasoning: 'Test',
        subAgents: [
          { name: 'First', description: 'First agent', task: 'Task 1' },
          { name: 'Second', description: 'Second agent', task: 'Task 2', dependencies: ['First'] },
        ],
      };

      const subAgents = orchestrator.createSubAgentsFromPlan(plan, 'parent-1');

      expect(subAgents).toHaveLength(2);
      expect(subAgents[1].config.dependencies).toBeDefined();
    });
  });

  describe('execute', () => {
    it('executes task with auto-planning', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            executionMode: 'parallel',
            reasoning: 'Independent tasks',
            subAgents: [
              { name: 'Agent 1', description: 'Desc', task: 'Task 1' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          text: 'Aggregated result',
        });

      mockExecuteParallel.mockResolvedValue({
        success: true,
        results: {
          'sub-1': { success: true, finalResponse: 'Done', steps: [], totalSteps: 1 },
        },
        aggregatedResponse: 'Combined results',
        totalDuration: 1000,
      });

      const orchestrator = new AgentOrchestrator({
        ...createMockConfig(),
        enableAutoPlanning: true,
      });

      const result = await orchestrator.execute('Complex task');

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('executes without planning when disabled', async () => {
      mockExecuteSequential.mockResolvedValue({
        success: true,
        results: {
          'sub-1': { success: true, finalResponse: 'Done', steps: [], totalSteps: 1 },
        },
        aggregatedResponse: 'Single agent result',
        totalDuration: 500,
      });

      const orchestrator = new AgentOrchestrator({
        ...createMockConfig(),
        enableAutoPlanning: false,
      });

      const result = await orchestrator.execute('Simple task');

      expect(result.success).toBe(true);
      expect(result.plan?.subAgents).toHaveLength(1);
      expect(result.plan?.subAgents[0].name).toBe('Main Agent');
    });

    it('calls lifecycle callbacks', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          executionMode: 'parallel',
          reasoning: 'Test',
          subAgents: [{ name: 'Agent 1', description: 'Desc', task: 'Task 1' }],
        }),
      });

      mockExecuteParallel.mockResolvedValue({
        success: true,
        results: {},
        aggregatedResponse: '',
        totalDuration: 100,
      });

      const callbacks: OrchestratorExecutionOptions = {
        onStart: jest.fn(),
        onPlanGenerated: jest.fn(),
        onSubAgentCreate: jest.fn(),
        onProgress: jest.fn(),
        onComplete: jest.fn(),
      };

      const orchestrator = new AgentOrchestrator(createMockConfig());
      await orchestrator.execute('Task', callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
      // Other callbacks may or may not be called depending on execution flow
      expect(callbacks.onProgress).toHaveBeenCalled();
    });

    it('handles execution failure', async () => {
      mockGenerateText.mockRejectedValue(new Error('API error'));

      const orchestrator = new AgentOrchestrator(createMockConfig());
      const onError = jest.fn();

      const result = await orchestrator.execute('Failed task', { onError });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
      expect(onError).toHaveBeenCalled();
    });

    it('aggregates results from multiple sub-agents', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: JSON.stringify({
            executionMode: 'parallel',
            reasoning: 'Test',
            subAgents: [
              { name: 'Research', description: 'Research', task: 'Research topic' },
              { name: 'Analyze', description: 'Analyze', task: 'Analyze data' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          text: 'Comprehensive aggregated result',
        });

      mockExecuteParallel.mockResolvedValue({
        success: true,
        results: {
          'sub-1': { success: true, finalResponse: 'Research findings', steps: [], totalSteps: 1 },
          'sub-2': { success: true, finalResponse: 'Analysis results', steps: [], totalSteps: 1 },
        },
        aggregatedResponse: '',
        totalDuration: 2000,
      });

      const orchestrator = new AgentOrchestrator(createMockConfig());
      const result = await orchestrator.execute('Research and analyze');

      expect(result.success).toBe(true);
      expect(result.finalResponse).toBe('Comprehensive aggregated result');
    });

    it('handles partial sub-agent failures', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          executionMode: 'parallel',
          reasoning: 'Test',
          subAgents: [
            { name: 'Agent 1', description: 'Desc', task: 'Task 1' },
            { name: 'Agent 2', description: 'Desc', task: 'Task 2' },
          ],
        }),
      });

      mockExecuteParallel.mockResolvedValue({
        success: false,
        results: {
          'sub-1': { success: true, finalResponse: 'OK', steps: [], totalSteps: 1 },
          'sub-2': { success: false, finalResponse: '', steps: [], totalSteps: 0, error: 'Failed' },
        },
        aggregatedResponse: 'Partial results',
        totalDuration: 1500,
        errors: { 'sub-2': 'Failed' },
      });

      const orchestrator = new AgentOrchestrator(createMockConfig());
      const result = await orchestrator.execute('Multi task');

      expect(result.success).toBe(false);
      expect(result.finalResponse).toContain('failed');
    });
  });

  describe('cancel', () => {
    it('cancels running orchestration', async () => {
      mockGenerateText.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const orchestrator = new AgentOrchestrator(createMockConfig());
      
      const executePromise = orchestrator.execute('Long task');
      
      setTimeout(() => orchestrator.cancel(), 50);
      
      const result = await executePromise;

      // Execution should fail when cancelled or timeout
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getSubAgents', () => {
    it('returns empty array initially', () => {
      const orchestrator = new AgentOrchestrator(createMockConfig());
      expect(orchestrator.getSubAgents()).toEqual([]);
    });
  });

  describe('getSubAgent', () => {
    it('returns undefined for non-existent sub-agent', () => {
      const orchestrator = new AgentOrchestrator(createMockConfig());
      expect(orchestrator.getSubAgent('non-existent')).toBeUndefined();
    });
  });
});

describe('createOrchestrator', () => {
  it('creates orchestrator instance', () => {
    const orchestrator = createOrchestrator(createMockConfig());
    expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
  });
});

describe('executeOrchestrated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes task with new orchestrator', async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        executionMode: 'sequential',
        reasoning: 'Simple',
        subAgents: [{ name: 'Agent', description: 'Desc', task: 'Task' }],
      }),
    });

    mockExecuteSequential.mockResolvedValue({
      success: true,
      results: {},
      aggregatedResponse: 'Done',
      totalDuration: 100,
    });

    const result = await executeOrchestrated('Task', createMockConfig());

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
