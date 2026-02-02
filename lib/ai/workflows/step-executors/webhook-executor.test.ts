/**
 * Webhook Step Executor Tests
 * Tests retry logic, timeout handling, and security validation
 */

import { executeWebhookStep } from './webhook-executor';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';
import { withRetry } from '@/lib/utils/retry';

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  NETWORK_RETRY_CONFIG: {
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

const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createStep = (overrides: Partial<WorkflowStepDefinition>): WorkflowStepDefinition => ({
  id: 'test-webhook-step',
  name: 'Test Webhook Step',
  description: 'Test description',
  type: 'webhook',
  inputs: {},
  outputs: {},
  webhookUrl: 'https://api.example.com/endpoint',
  method: 'POST',
  ...overrides,
} as WorkflowStepDefinition);

const createConfig = (overrides: Partial<StepExecutorConfig> = {}): StepExecutorConfig => ({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
  stepTimeout: 30000,
  maxRetries: 3,
  ...overrides,
});

describe('executeWebhookStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('{"success": true}'),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    mockedWithRetry.mockImplementation((fn) => fn());
  });

  it('should throw error when webhookUrl is missing', async () => {
    const step = createStep({ webhookUrl: undefined });

    await expect(executeWebhookStep(step, {})).rejects.toThrow(
      'Webhook step requires webhookUrl'
    );
  });

  it('should execute webhook request successfully', async () => {
    const step = createStep({
      webhookUrl: 'https://api.example.com/test',
      method: 'POST',
      body: '{"data": "test"}',
    });

    const result = await executeWebhookStep(step, {});

    expect(result).toEqual(
      expect.objectContaining({
        status: 200,
        statusText: 'OK',
        ok: true,
        data: { success: true },
      })
    );
  });

  it('should replace placeholders in URL', async () => {
    const step = createStep({
      webhookUrl: 'https://api.example.com/users/{{userId}}',
    });
    const input = { userId: '12345' };

    await executeWebhookStep(step, input);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/12345',
      expect.any(Object)
    );
  });

  it('should replace placeholders in body', async () => {
    const step = createStep({
      webhookUrl: 'https://api.example.com/test',
      body: '{"name": "{{name}}"}',
    });
    const input = { name: 'Alice' };

    await executeWebhookStep(step, input);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: '{"name": "Alice"}',
      })
    );
  });

  describe('security validation', () => {
    it('should block localhost URLs', async () => {
      const step = createStep({
        webhookUrl: 'http://localhost:8080/api',
      });

      await expect(executeWebhookStep(step, {})).rejects.toThrow(
        'Blocked host: localhost'
      );
    });

    it('should block 127.x.x.x URLs', async () => {
      const step = createStep({
        webhookUrl: 'http://127.0.0.1:3000/api',
      });

      await expect(executeWebhookStep(step, {})).rejects.toThrow(
        'Blocked host: 127.0.0.1'
      );
    });

    it('should block 192.168.x.x URLs', async () => {
      const step = createStep({
        webhookUrl: 'http://192.168.1.100/api',
      });

      await expect(executeWebhookStep(step, {})).rejects.toThrow(
        'Blocked host: 192.168.1.100'
      );
    });

    it('should block 10.x.x.x URLs', async () => {
      const step = createStep({
        webhookUrl: 'http://10.0.0.5/api',
      });

      await expect(executeWebhookStep(step, {})).rejects.toThrow(
        'Blocked host: 10.0.0.5'
      );
    });

    it('should allow internal URLs when allowInternalNetwork is true', async () => {
      const step = createStep({
        webhookUrl: 'http://localhost:8080/api',
        allowInternalNetwork: true,
      });

      await executeWebhookStep(step, {});

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should block non-HTTP(S) protocols', async () => {
      const step = createStep({
        webhookUrl: 'ftp://files.example.com/data',
      });

      await expect(executeWebhookStep(step, {})).rejects.toThrow(
        'Invalid protocol'
      );
    });
  });

  describe('retry and timeout', () => {
    it('should use retry logic', async () => {
      const step = createStep({});
      const config = createConfig({ maxRetries: 5 });

      await executeWebhookStep(step, {}, config);

      expect(mockedWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxRetries: 5,
        })
      );
    });

    it('should use step-specific retry count', async () => {
      const step = createStep({ retries: 2 });

      await executeWebhookStep(step, {});

      expect(mockedWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxRetries: 2,
        })
      );
    });
  });

  describe('HTTP methods', () => {
    it('should use POST by default', async () => {
      const step = createStep({ method: undefined });

      await executeWebhookStep(step, {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not include body for GET requests', async () => {
      const step = createStep({
        method: 'GET',
        body: '{"should": "not appear"}',
      });

      await executeWebhookStep(step, {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          body: undefined,
        })
      );
    });
  });

  describe('response handling', () => {
    it('should parse JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('{"result": "success"}'),
        headers: new Headers(),
      });

      const step = createStep({});
      const result = await executeWebhookStep(step, {});

      expect(result).toEqual(
        expect.objectContaining({
          data: { result: 'success' },
        })
      );
    });

    it('should return raw text for non-JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('Plain text response'),
        headers: new Headers(),
      });

      const step = createStep({});
      const result = await executeWebhookStep(step, {});

      expect(result).toEqual(
        expect.objectContaining({
          data: 'Plain text response',
        })
      );
    });
  });
});
