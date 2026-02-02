/**
 * Tool Step Executor Tests
 * Tests retry logic, timeout handling, and error wrapping
 */

import { executeToolStep, ToolExecutionError } from './tool-executor';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';
import { getGlobalToolRegistry } from '@/lib/ai/tools/registry';
import { withRetry, withTimeout } from '@/lib/utils/retry';

jest.mock('@/lib/ai/tools/registry', () => ({
  getGlobalToolRegistry: jest.fn(),
}));

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  withTimeout: jest.fn((promise) => promise),
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

const mockedGetToolRegistry = getGlobalToolRegistry as jest.MockedFunction<typeof getGlobalToolRegistry>;
const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;
const mockedWithTimeout = withTimeout as jest.MockedFunction<typeof withTimeout>;

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-tool-step',
  name: 'Test Tool Step',
  description: 'Test description',
  type: 'tool',
  inputs: {},
  outputs: {},
  toolName: 'test-tool',
  ...overrides,
} as WorkflowStepDefinition);

const createConfig = (overrides: Partial<StepExecutorConfig> = {}): StepExecutorConfig => ({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
  stepTimeout: 60000,
  maxRetries: 2,
  ...overrides,
});

describe('executeToolStep', () => {
  const mockToolFn = jest.fn();
  const mockRegistry = {
    get: jest.fn(),
    register: jest.fn(),
    unregister: jest.fn(),
    list: jest.fn(),
    has: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetToolRegistry.mockReturnValue(mockRegistry as never);
    mockRegistry.get.mockReturnValue({
      name: 'test-tool',
      description: 'Test tool',
      create: () => mockToolFn,
    });
    mockToolFn.mockResolvedValue({ result: 'success' });
    mockedWithRetry.mockImplementation((fn) => fn());
    mockedWithTimeout.mockImplementation((promise) => promise);
  });

  it('should throw ToolExecutionError when toolName is missing', async () => {
    const step = createStep({ toolName: undefined });

    await expect(executeToolStep(step, {})).rejects.toThrow(ToolExecutionError);
    await expect(executeToolStep(step, {})).rejects.toThrow(
      'Tool step requires toolName'
    );
  });

  it('should throw ToolExecutionError when tool is not found', async () => {
    mockRegistry.get.mockReturnValue(undefined);
    const step = createStep({ toolName: 'unknown-tool' });

    await expect(executeToolStep(step, {})).rejects.toThrow(ToolExecutionError);
    await expect(executeToolStep(step, {})).rejects.toThrow(
      'Tool not found: unknown-tool'
    );
  });

  it('should execute tool successfully', async () => {
    const step = createStep({ toolName: 'test-tool' });
    const input = { param: 'value' };

    const result = await executeToolStep(step, input);

    expect(result).toEqual({ result: 'success' });
    expect(mockToolFn).toHaveBeenCalledWith(input);
  });

  it('should use retry logic', async () => {
    const step = createStep({});
    const config = createConfig({ maxRetries: 4 });

    await executeToolStep(step, {}, config);

    expect(mockedWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxRetries: 4,
      })
    );
  });

  it('should use step-specific retry count', async () => {
    const step = createStep({ retryCount: 5 });

    await executeToolStep(step, {});

    expect(mockedWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxRetries: 5,
      })
    );
  });

  it('should use timeout wrapper', async () => {
    const step = createStep({});
    const config = createConfig({ stepTimeout: 30000 });

    await executeToolStep(step, {}, config);

    expect(mockedWithTimeout).toHaveBeenCalled();
  });

  it('should wrap errors in ToolExecutionError', async () => {
    const originalError = new Error('Tool internal error');
    mockToolFn.mockRejectedValue(originalError);
    const step = createStep({ toolName: 'failing-tool' });

    try {
      await executeToolStep(step, {});
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionError);
      expect((error as ToolExecutionError).toolName).toBe('failing-tool');
      expect((error as ToolExecutionError).stepId).toBe('test-tool-step');
      expect((error as ToolExecutionError).originalError).toBe(originalError);
    }
  });
});

describe('ToolExecutionError', () => {
  it('should have correct name', () => {
    const error = new ToolExecutionError('Test error', 'tool-name', 'step-id');
    expect(error.name).toBe('ToolExecutionError');
  });

  it('should store tool name and step id', () => {
    const error = new ToolExecutionError('Test error', 'my-tool', 'step-123');
    expect(error.toolName).toBe('my-tool');
    expect(error.stepId).toBe('step-123');
  });

  it('should store original error', () => {
    const originalError = new Error('Original');
    const error = new ToolExecutionError('Wrapped', 'tool', 'step', originalError);
    expect(error.originalError).toBe(originalError);
  });
});
