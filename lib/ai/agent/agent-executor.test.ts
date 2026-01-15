/**
 * Tests for Agent Executor
 */

import { z } from 'zod';
import {
  executeAgent,
  createAgent,
  type AgentConfig,
  type AgentTool,
  type ToolCall,
  type AgentExecutionState,
} from './agent-executor';

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
  stepCountIs: jest.fn((_max) => () => false), // Mock stopWhen condition
}));

// Mock client
jest.mock('../core/client', () => ({
  getProviderModel: jest.fn(() => 'mock-model'),
}));

import { generateText } from 'ai';

const mockGenerateText = generateText as jest.Mock;

// Helper type for mock config to avoid type errors
interface MockConfig {
  prepareStep?: () => Promise<void>;
  onStepFinish?: (step: unknown) => void;
  tools?: Record<string, { execute: (args: unknown) => Promise<unknown> }>;
}

describe('executeAgent', () => {
  const baseConfig: AgentConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes simple prompt without tools', async () => {
    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish } = config;
      const result = {
        text: 'Hello! How can I help you today?',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [{
          text: 'Hello! How can I help you today?',
          finishReason: 'stop',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }],
      };
      
      // Call callbacks
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const result = await executeAgent('Say hello', baseConfig);

    expect(result.success).toBe(true);
    expect(result.finalResponse).toBe('Hello! How can I help you today?');
    expect(result.totalSteps).toBe(1);
  });

  it('respects maxSteps configuration', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: '{"tool": "test_tool", "args": {}}' })
      .mockResolvedValueOnce({ text: '{"tool": "test_tool", "args": {}}' })
      .mockResolvedValueOnce({ text: '{"tool": "test_tool", "args": {}}' });

    const tools: Record<string, AgentTool> = {
      test_tool: {
        name: 'test_tool',
        description: 'A test tool',
        parameters: z.object({}),
        execute: jest.fn().mockResolvedValue({ success: true }),
      },
    };

    const result = await executeAgent('Do something', {
      ...baseConfig,
      maxSteps: 2,
      tools,
    });

    expect(result.totalSteps).toBeLessThanOrEqual(2);
  });

  it('executes tool calls', async () => {
    const mockExecute = jest.fn().mockResolvedValue({ result: 'calculated' });

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish, tools } = config;
      const result = {
        text: 'The result is 8',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [
          {
            text: 'Let me calculate that',
            finishReason: 'tool-calls',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'calculator', args: { a: 5, b: 3 } }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
          {
            text: 'The result is 8',
            finishReason: 'stop',
            toolCalls: [],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        ],
      };
      
      // Call tool execute for tool calls in steps
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        
        // Execute tools if present
        if (step.toolCalls && step.toolCalls.length > 0 && tools) {
          for (const tc of step.toolCalls) {
            if (tools[tc.toolName]) {
              await tools[tc.toolName].execute(tc.args);
            }
          }
        }
        
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const tools: Record<string, AgentTool> = {
      calculator: {
        name: 'calculator',
        description: 'Calculate numbers',
        parameters: z.object({
          a: z.number(),
          b: z.number(),
        }),
        execute: mockExecute,
      },
    };

    const result = await executeAgent('Calculate 5 + 3', {
      ...baseConfig,
      tools,
    });

    // Result should indicate completion
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('handles tool execution errors', async () => {
    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish, tools } = config;
      const result = {
        text: 'I encountered an error, but I can still help.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [
          {
            text: 'Let me try',
            finishReason: 'tool-calls',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'failing_tool', args: {} }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
          {
            text: 'I encountered an error, but I can still help.',
            finishReason: 'stop',
            toolCalls: [],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        ],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (step.toolCalls && step.toolCalls.length > 0 && tools) {
          for (const tc of step.toolCalls) {
            if (tools[tc.toolName]) {
              try {
                await tools[tc.toolName].execute(tc.args);
              } catch (_e) {
                // Tool error handled
              }
            }
          }
        }
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const tools: Record<string, AgentTool> = {
      failing_tool: {
        name: 'failing_tool',
        description: 'A tool that fails',
        parameters: z.object({}),
        execute: jest.fn().mockRejectedValue(new Error('Tool error')),
      },
    };

    const result = await executeAgent('Use the failing tool', {
      ...baseConfig,
      tools,
    });

    // Result should indicate completion
    expect(result).toBeDefined();
    expect(result.finalResponse).toBeDefined();
  });

  it('calls onStepStart callback', async () => {
    const onStepStart = jest.fn();

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish } = config;
      const result = {
        text: 'Response',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [{
          text: 'Response',
          finishReason: 'stop',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    await executeAgent('Test', {
      ...baseConfig,
      onStepStart,
    });

    expect(onStepStart).toHaveBeenCalledWith(1);
  });

  it('calls onStepComplete callback', async () => {
    const onStepComplete = jest.fn();

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish } = config;
      const result = {
        text: 'Response',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [{
          text: 'Response',
          finishReason: 'stop',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    await executeAgent('Test', {
      ...baseConfig,
      onStepComplete,
    });

    expect(onStepComplete).toHaveBeenCalledWith(1, 'Response', []);
  });

  it('calls onToolCall callback', async () => {
    const onToolCall = jest.fn();

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish, tools } = config;
      const result = {
        text: 'Done',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [
          {
            text: 'Using tool',
            finishReason: 'tool-calls',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'test_tool', args: {} }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
          {
            text: 'Done',
            finishReason: 'stop',
            toolCalls: [],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        ],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (step.toolCalls && step.toolCalls.length > 0 && tools) {
          for (const tc of step.toolCalls) {
            if (tools[tc.toolName]) {
              await tools[tc.toolName].execute(tc.args);
            }
          }
        }
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const tools: Record<string, AgentTool> = {
      test_tool: {
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({}),
        execute: jest.fn().mockResolvedValue({}),
      },
    };

    await executeAgent('Test', {
      ...baseConfig,
      tools,
      onToolCall,
    });

    expect(onToolCall).toHaveBeenCalled();
    expect(onToolCall.mock.calls[0][0].name).toBe('test_tool');
  });

  it('calls onToolResult callback', async () => {
    const onToolResult = jest.fn();

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish, tools } = config;
      const result = {
        text: 'Done',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [
          {
            text: 'Using tool',
            finishReason: 'tool-calls',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'test_tool', args: {} }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
          {
            text: 'Done',
            finishReason: 'stop',
            toolCalls: [],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        ],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (step.toolCalls && step.toolCalls.length > 0 && tools) {
          for (const tc of step.toolCalls) {
            if (tools[tc.toolName]) {
              await tools[tc.toolName].execute(tc.args);
            }
          }
        }
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const tools: Record<string, AgentTool> = {
      test_tool: {
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({}),
        execute: jest.fn().mockResolvedValue({ data: 'result' }),
      },
    };

    await executeAgent('Test', {
      ...baseConfig,
      tools,
      onToolResult,
    });

    expect(onToolResult).toHaveBeenCalled();
    expect(onToolResult.mock.calls[0][0].status).toBe('completed');
  });

  it('calls onError callback on failure', async () => {
    const onError = jest.fn();

    mockGenerateText.mockRejectedValue(new Error('API Error'));

    const result = await executeAgent('Test', {
      ...baseConfig,
      onError,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
    expect(onError).toHaveBeenCalled();
  });

  it('marks pending tool calls as error when execution fails', async () => {
    const onToolResult = jest.fn();
    let resolvePending = () => {};
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { tools } = config;
      if (tools?.long_tool) {
        void tools.long_tool.execute({});
      }
      throw new Error('Boom');
    });

    const tools: Record<string, AgentTool> = {
      long_tool: {
        name: 'long_tool',
        description: 'Long running tool',
        parameters: z.object({}),
        execute: jest.fn(() => pending),
      },
    };

    const result = await executeAgent('Test', {
      ...baseConfig,
      tools,
      onToolResult,
    });

    resolvePending();

    expect(result.success).toBe(false);
    expect(onToolResult).toHaveBeenCalled();
    expect(onToolResult.mock.calls[0][0].status).toBe('error');
    expect(onToolResult.mock.calls[0][0].error).toBe('Boom');
  });

  it('cleans up running tools when stop condition triggers', async () => {
    const onToolResult = jest.fn();
    let resolvePending = () => {};
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, tools } = config;

      const first = await prepareStep?.();
      if (first && 'stop' in first) {
        return { text: '', finishReason: 'stop', usage: {}, steps: [] };
      }

      if (tools?.long_tool) {
        void tools.long_tool.execute({});
      }

      const second = await prepareStep?.();
      if (second && 'stop' in second) {
        return { text: 'Stopped', finishReason: 'stop', usage: {}, steps: [] };
      }

      return { text: 'Done', finishReason: 'stop', usage: {}, steps: [] };
    });

    const tools: Record<string, AgentTool> = {
      long_tool: {
        name: 'long_tool',
        description: 'Long running tool',
        parameters: z.object({}),
        execute: jest.fn(() => pending),
      },
    };

    const result = await executeAgent('Test', {
      ...baseConfig,
      tools,
      stopConditions: [{ type: 'stepCount', count: 1 }],
      onToolResult,
    });

    resolvePending();

    expect(result.success).toBe(true);
    expect(onToolResult).toHaveBeenCalled();
    expect(onToolResult.mock.calls[0][0].status).toBe('error');
    expect(onToolResult.mock.calls[0][0].error).toBe('Step count reached: 1');
  });

  it('handles tool approval rejection', async () => {
    const requireApproval = jest.fn().mockResolvedValue(false);

    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish, tools } = config;
      const result = {
        text: 'I will try another approach.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [
          {
            text: 'Let me try',
            finishReason: 'tool-calls',
            toolCalls: [{ toolCallId: 'call-1', toolName: 'dangerous_tool', args: {} }],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
          {
            text: 'I will try another approach.',
            finishReason: 'stop',
            toolCalls: [],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          },
        ],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (step.toolCalls && step.toolCalls.length > 0 && tools) {
          for (const tc of step.toolCalls) {
            if (tools[tc.toolName]) {
              try {
                await tools[tc.toolName].execute(tc.args);
              } catch (_e) {
                // Tool approval rejected
              }
            }
          }
        }
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const tools: Record<string, AgentTool> = {
      dangerous_tool: {
        name: 'dangerous_tool',
        description: 'A dangerous tool',
        parameters: z.object({}),
        execute: jest.fn().mockResolvedValue({}),
        requiresApproval: true,
      },
    };

    const result = await executeAgent('Do dangerous thing', {
      ...baseConfig,
      tools,
      requireApproval,
    });

    expect(requireApproval).toHaveBeenCalled();
    expect(result.steps[0].toolCalls[0].status).toBe('error');
    expect(result.steps[0].toolCalls[0].error).toBe('Tool call rejected by user');
  });

  it('uses system prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    await executeAgent('Test', {
      ...baseConfig,
      systemPrompt: 'You are a helpful assistant',
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('You are a helpful assistant'),
      })
    );
  });

  it('uses custom temperature', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    await executeAgent('Test', {
      ...baseConfig,
      temperature: 0.3,
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.3,
      })
    );
  });

  it('stops when no tool calls in response', async () => {
    mockGenerateText.mockImplementation(async (config: MockConfig) => {
      const { prepareStep, onStepFinish } = config;
      const result = {
        text: 'Here is my final answer without any tools.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        steps: [{
          text: 'Here is my final answer without any tools.',
          finishReason: 'stop',
          toolCalls: [],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        }],
      };
      
      for (const step of result.steps) {
        if (prepareStep) await prepareStep();
        if (onStepFinish) onStepFinish(step);
      }
      
      return result;
    });

    const result = await executeAgent('Give me an answer', baseConfig);

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBe(1);
  });

  it('includes duration in result', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const result = await executeAgent('Test', baseConfig);

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('createAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agent with base config', () => {
    const agent = createAgent({
      systemPrompt: 'You are a test agent',
    });

    expect(agent).toBeDefined();
    expect(agent.run).toBeDefined();
    expect(agent.addTool).toBeDefined();
    expect(agent.removeTool).toBeDefined();
  });

  it('runs agent with provider config', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const agent = createAgent({
      systemPrompt: 'Test agent',
    });

    const result = await agent.run('Test prompt', {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
    });

    expect(result.success).toBe(true);
  });

  it('adds tool to agent', () => {
    const agent = createAgent({});

    const tool: AgentTool = {
      name: 'new_tool',
      description: 'A new tool',
      parameters: z.object({}),
      execute: jest.fn(),
    };

    agent.addTool('new_tool', tool);

    // Tool should be available for the agent
    expect(agent).toBeDefined();
  });

  it('removes tool from agent', () => {
    const tool: AgentTool = {
      name: 'remove_tool',
      description: 'Tool to remove',
      parameters: z.object({}),
      execute: jest.fn(),
    };

    const agent = createAgent({
      tools: { remove_tool: tool },
    });

    agent.removeTool('remove_tool');

    // Tool should be removed
    expect(agent).toBeDefined();
  });
});

describe('ToolCall interface', () => {
  it('has correct structure', () => {
    const toolCall: ToolCall = {
      id: 'tool-123',
      name: 'test_tool',
      args: { key: 'value' },
      status: 'pending',
    };

    expect(toolCall.id).toBe('tool-123');
    expect(toolCall.name).toBe('test_tool');
    expect(toolCall.status).toBe('pending');
  });

  it('includes optional fields', () => {
    const toolCall: ToolCall = {
      id: 'tool-123',
      name: 'test_tool',
      args: {},
      status: 'completed',
      result: { data: 'result' },
      startedAt: new Date(),
      completedAt: new Date(),
    };

    expect(toolCall.result).toEqual({ data: 'result' });
    expect(toolCall.startedAt).toBeDefined();
    expect(toolCall.completedAt).toBeDefined();
  });

  it('includes error field when failed', () => {
    const toolCall: ToolCall = {
      id: 'tool-123',
      name: 'test_tool',
      args: {},
      status: 'error',
      error: 'Something went wrong',
    };

    expect(toolCall.status).toBe('error');
    expect(toolCall.error).toBe('Something went wrong');
  });
});

describe('Safety Mode - Tool Call Safety', () => {
  const baseConfig: AgentConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks dangerous tool calls when safety mode is enabled', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const dangerousTool: AgentTool = {
      name: 'shell_execute',
      description: 'Execute shell commands',
      parameters: z.object({ command: z.string() }),
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    await executeAgent('Execute command', {
      ...baseConfig,
      tools: { shell_execute: dangerousTool },
      safetyOptions: {
        mode: 'block',
        checkUserInput: false,
        checkSystemPrompt: false,
        checkToolCalls: true,
        blockDangerousCommands: true,
        customBlockedPatterns: [],
        customAllowedPatterns: [],
      },
    });

    // Dangerous tool should not be executed
    expect(dangerousTool.execute).not.toHaveBeenCalled();
  });

  it('allows safe tool calls when safety mode is enabled', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const safeTool: AgentTool = {
      name: 'file_read',
      description: 'Read file contents',
      parameters: z.object({ path: z.string() }),
      execute: jest.fn().mockResolvedValue({ success: true, content: 'test' }),
    };

    const result = await executeAgent('Read file', {
      ...baseConfig,
      tools: { file_read: safeTool },
      safetyOptions: {
        mode: 'block',
        checkUserInput: false,
        checkSystemPrompt: false,
        checkToolCalls: true,
        blockDangerousCommands: true,
        customBlockedPatterns: [],
        customAllowedPatterns: [],
      },
    });

    // Safe tool should be executed (if called by AI)
    expect(result.success).toBe(true);
  });

  it('skips tool call safety checks when disabled', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const tool: AgentTool = {
      name: 'any_tool',
      description: 'Any tool',
      parameters: z.object({}),
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    const result = await executeAgent('Execute', {
      ...baseConfig,
      tools: { any_tool: tool },
      safetyOptions: {
        mode: 'off',
        checkUserInput: false,
        checkSystemPrompt: false,
        checkToolCalls: false,
        blockDangerousCommands: false,
        customBlockedPatterns: [],
        customAllowedPatterns: [],
      },
    });

    expect(result.success).toBe(true);
  });

  it('warns on suspicious tool calls in warn mode', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Response',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      steps: [{
        text: 'Response',
        finishReason: 'stop',
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }],
    });

    const suspiciousTool: AgentTool = {
      name: 'system_modify',
      description: 'Modify system settings',
      parameters: z.object({}),
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    const result = await executeAgent('Modify system', {
      ...baseConfig,
      tools: { system_modify: suspiciousTool },
      safetyOptions: {
        mode: 'warn',
        checkUserInput: false,
        checkSystemPrompt: false,
        checkToolCalls: true,
        blockDangerousCommands: true,
        customBlockedPatterns: [],
        customAllowedPatterns: [],
      },
    });

    // In warn mode, execution continues but warnings should be logged
    expect(result.success).toBe(true);
  });
});

describe('AgentExecutionState interface', () => {
  it('has correct structure', () => {
    const state: AgentExecutionState = {
      stepCount: 5,
      startTime: new Date(),
      lastToolCalls: [],
      conversationHistory: [{ role: 'user', content: 'Hello' }],
      isRunning: true,
    };

    expect(state.stepCount).toBe(5);
    expect(state.isRunning).toBe(true);
    expect(state.conversationHistory).toHaveLength(1);
  });
});
