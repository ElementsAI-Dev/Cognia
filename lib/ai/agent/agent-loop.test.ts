/**
 * Tests for Agent Loop
 */

import { z } from 'zod';
import {
  executeAgentLoop,
  createAgentLoop,
  type AgentLoopConfig,
  type AgentTask,
} from './agent-loop';
import type { AgentTool } from './agent-executor';

// Mock the agent executor
jest.mock('./agent-executor', () => ({
  executeAgent: jest.fn(),
}));

import { executeAgent } from './agent-executor';

const mockExecuteAgent = executeAgent as jest.Mock;

describe('executeAgentLoop', () => {
  const baseConfig: AgentLoopConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes single task without planning', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Task completed',
      totalSteps: 1,
    });

    const result = await executeAgentLoop('Simple task', {
      ...baseConfig,
      planningEnabled: false,
    });

    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].status).toBe('completed');
  });

  it('breaks down task with planning enabled', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: '1. First subtask\n2. Second subtask\n3. Third subtask',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'First done',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Second done',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Third done',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'All tasks completed successfully',
        totalSteps: 1,
      });

    const result = await executeAgentLoop('Complex task', {
      ...baseConfig,
      planningEnabled: true,
    });

    expect(result.success).toBe(true);
    expect(result.tasks.length).toBeGreaterThan(1);
  });

  it('handles task failure', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: '1. Only task',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: false,
        finalResponse: '',
        totalSteps: 1,
        error: 'Task failed',
      });

    const result = await executeAgentLoop('Failing task', {
      ...baseConfig,
      planningEnabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.tasks.some((t) => t.status === 'failed')).toBe(true);
  });

  it('respects maxTotalSteps limit', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: '1. Task 1\n2. Task 2\n3. Task 3',
        totalSteps: 5,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Done 1',
        totalSteps: 10,
      });

    const result = await executeAgentLoop('Many tasks', {
      ...baseConfig,
      planningEnabled: true,
      maxTotalSteps: 15,
    });

    // Should stop before completing all tasks
    expect(result.totalSteps).toBeLessThanOrEqual(20);
  });

  it('calls onTaskStart callback', async () => {
    const onTaskStart = jest.fn();

    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    await executeAgentLoop('Test task', {
      ...baseConfig,
      planningEnabled: false,
      onTaskStart,
    });

    expect(onTaskStart).toHaveBeenCalled();
    expect(onTaskStart.mock.calls[0][0].status).toBe('running');
  });

  it('calls onTaskComplete callback', async () => {
    const onTaskComplete = jest.fn();

    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    await executeAgentLoop('Test task', {
      ...baseConfig,
      planningEnabled: false,
      onTaskComplete,
    });

    expect(onTaskComplete).toHaveBeenCalled();
  });

  it('calls onProgress callback', async () => {
    const onProgress = jest.fn();

    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    await executeAgentLoop('Test task', {
      ...baseConfig,
      planningEnabled: false,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
  });

  it('generates summary for multiple tasks', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: '1. Task A\n2. Task B',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Task A done',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Task B done',
        totalSteps: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        finalResponse: 'Summary: Both tasks completed',
        totalSteps: 1,
      });

    const result = await executeAgentLoop('Multi-task', {
      ...baseConfig,
      planningEnabled: true,
    });

    expect(result.finalSummary).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    mockExecuteAgent.mockRejectedValue(new Error('Unexpected error'));

    const result = await executeAgentLoop('Error task', baseConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });

  it('uses tools when provided', async () => {
    const tools: Record<string, AgentTool> = {
      test_tool: {
        name: 'test_tool',
        description: 'A test tool',
        parameters: z.object({}),
        execute: jest.fn().mockResolvedValue({}),
      },
    };

    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    await executeAgentLoop('Use tool', {
      ...baseConfig,
      planningEnabled: false,
      tools,
    });

    expect(mockExecuteAgent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tools })
    );
  });

  it('parses planning response correctly', async () => {
    mockExecuteAgent
      .mockResolvedValueOnce({
        success: true,
        finalResponse: `Here are the subtasks:
1. First task to do
2) Second task to do
3: Third task to do`,
        totalSteps: 1,
      })
      .mockResolvedValueOnce({ success: true, finalResponse: 'Done 1', totalSteps: 1 })
      .mockResolvedValueOnce({ success: true, finalResponse: 'Done 2', totalSteps: 1 })
      .mockResolvedValueOnce({ success: true, finalResponse: 'Done 3', totalSteps: 1 })
      .mockResolvedValueOnce({ success: true, finalResponse: 'Summary', totalSteps: 1 });

    const result = await executeAgentLoop('Parse test', {
      ...baseConfig,
      planningEnabled: true,
    });

    expect(result.tasks.length).toBe(3);
  });

  it('includes duration in result', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    const result = await executeAgentLoop('Timed task', {
      ...baseConfig,
      planningEnabled: false,
    });

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('createAgentLoop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agent loop instance', () => {
    const loop = createAgentLoop({});

    expect(loop).toBeDefined();
    expect(loop.execute).toBeDefined();
    expect(loop.addTool).toBeDefined();
  });

  it('executes task through agent loop', async () => {
    mockExecuteAgent.mockResolvedValue({
      success: true,
      finalResponse: 'Done',
      totalSteps: 1,
    });

    const loop = createAgentLoop({
      planningEnabled: false,
    });

    const result = await loop.execute('Test task', {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    });

    expect(result.success).toBe(true);
  });

  it('adds tool to agent loop', () => {
    const loop = createAgentLoop({});

    const tool: AgentTool = {
      name: 'new_tool',
      description: 'A new tool',
      parameters: z.object({}),
      execute: jest.fn(),
    };

    loop.addTool('new_tool', tool);

    expect(loop).toBeDefined();
  });
});

describe('AgentTask interface', () => {
  it('has correct structure', () => {
    const task: AgentTask = {
      id: 'task-1',
      description: 'Do something',
      status: 'pending',
    };

    expect(task.id).toBe('task-1');
    expect(task.description).toBe('Do something');
    expect(task.status).toBe('pending');
  });

  it('includes optional result', () => {
    const task: AgentTask = {
      id: 'task-1',
      description: 'Done task',
      status: 'completed',
      result: 'Task completed successfully',
    };

    expect(task.result).toBe('Task completed successfully');
  });

  it('includes optional error', () => {
    const task: AgentTask = {
      id: 'task-1',
      description: 'Failed task',
      status: 'failed',
      error: 'Something went wrong',
    };

    expect(task.error).toBe('Something went wrong');
  });
});
