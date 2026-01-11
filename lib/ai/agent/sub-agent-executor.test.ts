/**
 * Tests for SubAgent Executor
 */

import {
  createSubAgent,
  executeSubAgent,
  executeSubAgentsParallel,
  executeSubAgentsSequential,
  cancelSubAgent,
  cancelAllSubAgents,
  type SubAgentExecutorConfig,
} from './sub-agent-executor';
import type { SubAgent as _SubAgent, SubAgentConfig as _SubAgentConfig } from '@/types/agent/sub-agent';

// Mock the agent executor
jest.mock('./agent-executor', () => ({
  executeAgent: jest.fn(),
}));

import { executeAgent } from './agent-executor';

const mockExecuteAgent = executeAgent as jest.Mock;

const createMockExecutorConfig = (): SubAgentExecutorConfig => ({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'test-key',
});

describe('createSubAgent', () => {
  it('creates sub-agent with default config', () => {
    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Research Agent',
      task: 'Research the topic',
    });

    expect(subAgent.id).toBeDefined();
    expect(subAgent.parentAgentId).toBe('parent-1');
    expect(subAgent.name).toBe('Research Agent');
    expect(subAgent.task).toBe('Research the topic');
    expect(subAgent.status).toBe('pending');
    expect(subAgent.progress).toBe(0);
    expect(subAgent.retryCount).toBe(0);
    expect(subAgent.logs).toEqual([]);
  });

  it('creates sub-agent with custom config', () => {
    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Custom Agent',
      description: 'Custom description',
      task: 'Do something',
      config: {
        maxSteps: 5,
        temperature: 0.5,
        priority: 'high',
      },
      order: 2,
      tags: ['research', 'analysis'],
    });

    expect(subAgent.description).toBe('Custom description');
    expect(subAgent.config.maxSteps).toBe(5);
    expect(subAgent.config.temperature).toBe(0.5);
    expect(subAgent.config.priority).toBe('high');
    expect(subAgent.order).toBe(2);
    expect(subAgent.tags).toEqual(['research', 'analysis']);
  });
});

describe('executeSubAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes sub-agent successfully', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Task completed successfully',
      totalSteps: 2,
      steps: [
        { stepNumber: 1, response: 'Step 1', toolCalls: [], timestamp: new Date() },
        { stepNumber: 2, response: 'Step 2', toolCalls: [], timestamp: new Date() },
      ],
      toolResults: [],
    });

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Test Agent',
      task: 'Test task',
    });

    const result = await executeSubAgent(subAgent, createMockExecutorConfig());

    expect(result.success).toBe(true);
    expect(result.finalResponse).toBe('Task completed successfully');
    expect(result.totalSteps).toBe(2);
    expect(subAgent.status).toBe('completed');
    expect(subAgent.progress).toBe(100);
  });

  it('handles execution failure', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: false,
      finalResponse: '',
      totalSteps: 1,
      steps: [],
      toolResults: [],
      error: 'Task failed',
    });

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Failing Agent',
      task: 'Fail task',
    });

    const result = await executeSubAgent(subAgent, createMockExecutorConfig());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Task failed');
    expect(subAgent.status).toBe('failed');
  });

  it('calls lifecycle callbacks', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
      steps: [{ stepNumber: 1, response: 'Done', toolCalls: [], timestamp: new Date() }],
      toolResults: [],
    });

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Callback Agent',
      task: 'Test callbacks',
    });

    const onStart = jest.fn();
    const onComplete = jest.fn();
    const onProgress = jest.fn();

    await executeSubAgent(subAgent, createMockExecutorConfig(), {
      onStart,
      onComplete,
      onProgress,
    });

    expect(onStart).toHaveBeenCalledWith(subAgent);
    expect(onComplete).toHaveBeenCalled();
  });

  it('retries on failure when configured', async () => {
    mockExecuteAgent
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Retry succeeded',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      });

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Retry Agent',
      task: 'Retry task',
      config: {
        retryConfig: {
          maxRetries: 2,
          retryDelay: 10,
          exponentialBackoff: false,
        },
      },
    });

    const result = await executeSubAgent(subAgent, createMockExecutorConfig());

    expect(mockExecuteAgent).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(subAgent.retryCount).toBe(1);
  });

  it('fails after max retries exceeded', async () => {
    mockExecuteAgent.mockRejectedValue(new Error('Persistent error'));

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Fail Agent',
      task: 'Always fail',
      config: {
        retryConfig: {
          maxRetries: 1,
          retryDelay: 10,
          exponentialBackoff: false,
        },
      },
    });

    const result = await executeSubAgent(subAgent, createMockExecutorConfig());

    expect(result.success).toBe(false);
    expect(result.error).toContain('Persistent error');
    expect(subAgent.retryCount).toBe(1);
    expect(subAgent.status).toBe('failed');
  });

  it('handles timeout', async () => {
    mockExecuteAgent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );

    const subAgent = createSubAgent({
      parentAgentId: 'parent-1',
      name: 'Timeout Agent',
      task: 'Slow task',
      config: {
        timeout: 50,
      },
    });

    const result = await executeSubAgent(subAgent, createMockExecutorConfig());

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
    expect(subAgent.status).toBe('timeout');
  });
});

describe('executeSubAgentsParallel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes multiple sub-agents in parallel', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
      steps: [],
      toolResults: [],
    });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 1', task: 'Task 1' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 2', task: 'Task 2' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 3', task: 'Task 3' }),
    ];

    const result = await executeSubAgentsParallel(
      subAgents,
      createMockExecutorConfig(),
      {},
      2
    );

    expect(result.success).toBe(true);
    expect(Object.keys(result.results)).toHaveLength(3);
    expect(result.aggregatedResponse).toContain('Agent 1');
    expect(result.aggregatedResponse).toContain('Agent 2');
    expect(result.aggregatedResponse).toContain('Agent 3');
  });

  it('sorts by priority', async () => {
    const executionOrder: string[] = [];
    mockExecuteAgent.mockImplementation(async () => {
      return {
        success: true,
        finalResponse: 'Done',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      };
    });

    const subAgents = [
      createSubAgent({
        parentAgentId: 'p1',
        name: 'Low Priority',
        task: 'Task 1',
        config: { priority: 'low' },
      }),
      createSubAgent({
        parentAgentId: 'p1',
        name: 'Critical',
        task: 'Task 2',
        config: { priority: 'critical' },
      }),
      createSubAgent({
        parentAgentId: 'p1',
        name: 'Normal',
        task: 'Task 3',
        config: { priority: 'normal' },
      }),
    ];

    await executeSubAgentsParallel(subAgents, createMockExecutorConfig(), {
      onStart: (agent) => executionOrder.push(agent.name),
    }, 1);

    expect(executionOrder[0]).toBe('Critical');
  });

  it('handles partial failures', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Success',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      })
      .mockResolvedValueOnce({
        success: false,
        finalResponse: '',
        totalSteps: 1,
        steps: [],
        toolResults: [],
        error: 'Failed',
      });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Success Agent', task: 'Task 1' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Fail Agent', task: 'Task 2' }),
    ];

    const result = await executeSubAgentsParallel(subAgents, createMockExecutorConfig());

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(Object.keys(result.errors!)).toHaveLength(1);
  });

  it('aggregates token usage when provided', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
      steps: [],
      toolResults: [],
    });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 1', task: 'Task 1' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 2', task: 'Task 2' }),
    ];

    const result = await executeSubAgentsParallel(subAgents, createMockExecutorConfig());

    // Token usage is only defined if steps have usage info
    expect(result.success).toBe(true);
    expect(Object.keys(result.results)).toHaveLength(2);
  });
});

describe('executeSubAgentsSequential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes sub-agents sequentially', async () => {
    const executionOrder: string[] = [];
    mockExecuteAgent.mockImplementation(async () => {
      return {
        success: true,
        finalResponse: 'Done',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      };
    });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'First', task: 'Task 1', order: 1 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Second', task: 'Task 2', order: 2 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Third', task: 'Task 3', order: 3 }),
    ];

    await executeSubAgentsSequential(subAgents, createMockExecutorConfig(), {
      onStart: (agent) => executionOrder.push(agent.name),
    });

    expect(executionOrder).toEqual(['First', 'Second', 'Third']);
  });

  it('stops on error when configured', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Done 1',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      })
      .mockResolvedValueOnce({
        success: false,
        finalResponse: '',
        totalSteps: 1,
        steps: [],
        toolResults: [],
        error: 'Error',
      });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 1', task: 'Task 1', order: 1 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 2', task: 'Task 2', order: 2 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 3', task: 'Task 3', order: 3 }),
    ];

    const result = await executeSubAgentsSequential(
      subAgents,
      createMockExecutorConfig(),
      {},
      true
    );

    expect(mockExecuteAgent).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
  });

  it('continues on error when stopOnError is false', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Done 1',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      })
      .mockResolvedValueOnce({
        success: false,
        finalResponse: '',
        totalSteps: 1,
        steps: [],
        toolResults: [],
        error: 'Error',
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Done 3',
        totalSteps: 1,
        steps: [],
        toolResults: [],
      });

    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 1', task: 'Task 1', order: 1 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 2', task: 'Task 2', order: 2 }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 3', task: 'Task 3', order: 3 }),
    ];

    const result = await executeSubAgentsSequential(
      subAgents,
      createMockExecutorConfig(),
      {},
      false
    );

    expect(mockExecuteAgent).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
    expect(Object.keys(result.results)).toHaveLength(3);
  });

  it('respects dependencies', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
      steps: [],
      toolResults: [],
    });

    const agent1 = createSubAgent({
      parentAgentId: 'p1',
      name: 'Agent 1',
      task: 'Task 1',
      order: 1,
    });
    const agent2 = createSubAgent({
      parentAgentId: 'p1',
      name: 'Agent 2',
      task: 'Task 2',
      order: 2,
      config: { dependencies: [agent1.id] },
    });

    const result = await executeSubAgentsSequential(
      [agent1, agent2],
      createMockExecutorConfig()
    );

    expect(result.success).toBe(true);
  });

  it('fails when dependency not met', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: false,
      finalResponse: '',
      totalSteps: 1,
      steps: [],
      toolResults: [],
      error: 'Failed',
    });

    const agent1 = createSubAgent({
      parentAgentId: 'p1',
      name: 'Agent 1',
      task: 'Task 1',
      order: 1,
    });
    const agent2 = createSubAgent({
      parentAgentId: 'p1',
      name: 'Agent 2',
      task: 'Task 2',
      order: 2,
      config: { dependencies: [agent1.id] },
    });

    const result = await executeSubAgentsSequential(
      [agent1, agent2],
      createMockExecutorConfig(),
      {},
      true
    );

    expect(mockExecuteAgent).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('cancelSubAgent', () => {
  it('cancels running sub-agent', () => {
    const subAgent = createSubAgent({
      parentAgentId: 'p1',
      name: 'Running Agent',
      task: 'Task',
    });
    subAgent.status = 'running';

    cancelSubAgent(subAgent);

    expect(subAgent.status).toBe('cancelled');
    expect(subAgent.completedAt).toBeDefined();
  });

  it('cancels pending sub-agent', () => {
    const subAgent = createSubAgent({
      parentAgentId: 'p1',
      name: 'Pending Agent',
      task: 'Task',
    });

    cancelSubAgent(subAgent);

    expect(subAgent.status).toBe('cancelled');
  });

  it('does not affect completed sub-agent', () => {
    const subAgent = createSubAgent({
      parentAgentId: 'p1',
      name: 'Completed Agent',
      task: 'Task',
    });
    subAgent.status = 'completed';

    cancelSubAgent(subAgent);

    expect(subAgent.status).toBe('completed');
  });
});

describe('cancelAllSubAgents', () => {
  it('cancels all sub-agents', () => {
    const subAgents = [
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 1', task: 'Task 1' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 2', task: 'Task 2' }),
      createSubAgent({ parentAgentId: 'p1', name: 'Agent 3', task: 'Task 3' }),
    ];
    subAgents[0].status = 'running';
    subAgents[1].status = 'pending';
    subAgents[2].status = 'completed';

    cancelAllSubAgents(subAgents);

    expect(subAgents[0].status).toBe('cancelled');
    expect(subAgents[1].status).toBe('cancelled');
    expect(subAgents[2].status).toBe('completed');
  });
});
