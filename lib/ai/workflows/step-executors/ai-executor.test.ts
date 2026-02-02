/**
 * AI Step Executor Tests
 * Tests retry logic and circuit breaker integration
 */

import { executeAIStep } from './ai-executor';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';
import { generateText } from 'ai';
import { withCircuitBreaker } from '@/lib/ai/infrastructure/circuit-breaker';
import { withRetry } from '@/lib/utils/retry';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({})),
}));

jest.mock('@/lib/ai/infrastructure/circuit-breaker', () => ({
  withCircuitBreaker: jest.fn((provider, fn) => fn()),
}));

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  AGENT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
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

const mockedGenerateText = generateText as jest.MockedFunction<typeof generateText>;
const mockedWithCircuitBreaker = withCircuitBreaker as jest.MockedFunction<typeof withCircuitBreaker>;
const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-ai-step',
  name: 'Test AI Step',
  description: 'Test description',
  type: 'ai',
  inputs: {},
  outputs: {},
  aiPrompt: 'Hello {{name}}',
  ...overrides,
} as WorkflowStepDefinition);

const createConfig = (overrides: Partial<StepExecutorConfig> = {}): StepExecutorConfig => ({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
  ...overrides,
});

describe('executeAIStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateText.mockResolvedValue({
      text: 'AI response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    } as never);
    mockedWithCircuitBreaker.mockImplementation(async (_provider, fn) => ({
      success: true,
      data: await fn(),
      rejected: false,
      circuitState: 'closed',
    }));
    mockedWithRetry.mockImplementation((fn) => fn());
  });

  it('should execute AI step successfully', async () => {
    const step = createStep({ aiPrompt: 'Hello {{name}}' });
    const input = { name: 'World' };
    const config = createConfig();

    const result = await executeAIStep(step, input, config);

    expect(result).toEqual({
      text: 'AI response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
  });

  it('should replace placeholders in prompt', async () => {
    const step = createStep({ aiPrompt: 'Hello {{name}}, your age is {{age}}' });
    const input = { name: 'Alice', age: 30 };
    const config = createConfig();

    await executeAIStep(step, input, config);

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Hello Alice, your age is 30',
      })
    );
  });

  it('should use circuit breaker protection', async () => {
    const step = createStep({});
    const config = createConfig({ provider: 'anthropic' });

    await executeAIStep(step, {}, config);

    expect(mockedWithCircuitBreaker).toHaveBeenCalledWith(
      'anthropic',
      expect.any(Function)
    );
  });

  it('should use retry logic', async () => {
    const step = createStep({});
    const config = createConfig({ maxRetries: 5 });

    await executeAIStep(step, {}, config);

    expect(mockedWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxRetries: 5,
      })
    );
  });

  it('should throw error when circuit breaker is open', async () => {
    mockedWithCircuitBreaker.mockResolvedValue({
      success: false,
      rejected: true,
      data: undefined,
      error: undefined,
      circuitState: 'open',
    });

    const step = createStep({});
    const config = createConfig();

    await expect(executeAIStep(step, {}, config)).rejects.toThrow(
      'Circuit breaker open for provider'
    );
  });

  it('should throw error when execution fails', async () => {
    mockedWithCircuitBreaker.mockResolvedValue({
      success: false,
      rejected: false,
      data: undefined,
      error: new Error('API rate limit exceeded'),
      circuitState: 'closed',
    });

    const step = createStep({});
    const config = createConfig();

    await expect(executeAIStep(step, {}, config)).rejects.toThrow(
      'API rate limit exceeded'
    );
  });

  it('should use default temperature when not specified', async () => {
    const step = createStep({});
    const config = createConfig();

    await executeAIStep(step, {}, config);

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
      })
    );
  });

  it('should use custom temperature when specified', async () => {
    const step = createStep({});
    const config = createConfig({ temperature: 0.3 });

    await executeAIStep(step, {}, config);

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.3,
      })
    );
  });
});
