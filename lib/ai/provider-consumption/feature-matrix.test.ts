import { renderHook, act } from '@testing-library/react';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { createFeatureProviderModelFromRuntimeConfig } from '@/lib/ai/provider-consumption';
import { resolveSubtitleTranscriptionAccess } from '@/lib/ai/provider-consumption/capability-provider';
import { executeAIStep } from '@/lib/ai/workflows/step-executors/ai-executor';
import { optimizePrompt } from '@/lib/ai/prompts/prompt-optimizer';
import { generatePresetFromDescription } from '@/lib/ai/presets/preset-ai-service';
import { executeAgent } from '@/lib/ai/agent/agent-executor';
import { useCanvasSuggestions } from '@/hooks/canvas/use-canvas-suggestions';
import { useVideoSubtitles } from '@/hooks/video-studio/use-video-subtitles';
import type { AgentConfig } from '@/lib/ai/agent/agent-executor';
import type { WorkflowStepDefinition, StepExecutorConfig } from '@/lib/ai/workflows/step-executors/types';

jest.mock('ai', () => ({
  generateText: jest.fn(),
  generateObject: jest.fn(),
  stepCountIs: jest.fn((_max) => () => false),
}));

jest.mock('@/lib/ai/provider-consumption', () => ({
  createFeatureRoutePolicy: jest.fn((routeProfile, overrides) => ({
    routeProfile,
    selectionMode: 'default-provider',
    ...overrides,
  })),
  createProviderSettingsSnapshot: jest.fn((input) => ({
    defaultProvider: input.defaultProvider || '',
    providerSettings: input.providerSettings,
    customProviders: input.customProviders || {},
  })),
  createFeatureProviderModelFromRuntimeConfig: jest.fn(() => 'mock-model'),
}));

jest.mock('@/lib/ai/provider-consumption/capability-provider', () => ({
  resolveSubtitleTranscriptionAccess: jest.fn(),
}));

jest.mock('@/lib/ai/infrastructure/circuit-breaker', () => ({
  withCircuitBreaker: jest.fn(async (_provider, fn) => ({
    success: true,
    data: await fn(),
    rejected: false,
    circuitState: 'closed',
  })),
}));

jest.mock('@/lib/utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  AGENT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
}));

jest.mock('@/lib/agent-trace', () => ({
  recordAgentTraceFromToolCall: jest.fn(),
  recordAgentTraceEvent: jest.fn(),
  safeJsonStringify: (value: unknown, fallback = '{}') => {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: Object.assign(
    jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        providerSettings: {
          openai: { apiKey: 'test-key', defaultModel: 'gpt-4o-mini', enabled: true },
          google: { apiKey: 'test-google-key', defaultModel: 'gemini-2.0-flash-exp', enabled: true },
        },
        defaultProvider: 'openai',
        customProviders: {},
      })
    ),
    {
      getState: jest.fn(() => ({
        agentTraceSettings: { enabled: true },
      })),
    }
  ),
  useSessionStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      getActiveSession: jest.fn(() => ({
        provider: 'openai',
        model: 'gpt-4o-mini',
      })),
    })
  ),
  useArtifactStore: jest.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      addSuggestion: jest.fn(),
      activeCanvasId: 'canvas-1',
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  })),
  createLogRuntimeContext: jest.fn(() => ({
    runtime: 'test',
    origin: 'test',
    tags: ['test'],
  })),
  loggers: {
    ai: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
    agent: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
    native: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
  },
}));

const mockGenerateText = generateText as jest.Mock;
const mockGenerateObject = generateObject as jest.Mock;
const mockCreateFeatureProviderModelFromRuntimeConfig =
  createFeatureProviderModelFromRuntimeConfig as jest.Mock;
const mockResolveSubtitleTranscriptionAccess =
  resolveSubtitleTranscriptionAccess as jest.Mock;

describe('routing feature matrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFeatureProviderModelFromRuntimeConfig.mockReturnValue('mock-model');
  });

  it('covers representative feature entrypoints with shared routing and blocked guidance', async () => {
    const workflowStep = {
      id: 'workflow-step',
      name: 'Workflow AI',
      type: 'ai',
      inputs: {},
      outputs: {},
      aiPrompt: 'Hello {{name}}',
    } as WorkflowStepDefinition;
    const workflowConfig: StepExecutorConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
    };

    mockGenerateText
      .mockResolvedValueOnce({
        text: 'Workflow response',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      })
      .mockResolvedValueOnce({ text: 'Optimized prompt' })
      .mockResolvedValueOnce({ text: '["Clarified intent"]' })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Code Helper',
          description: 'Helps with coding tasks',
          icon: '💻',
          color: '#6366f1',
          mode: 'agent',
          systemPrompt: 'You are an expert programmer.',
          temperature: 0.5,
          webSearchEnabled: false,
          thinkingEnabled: true,
        }),
      })
      .mockResolvedValueOnce({
        text: '',
      })
      .mockImplementationOnce(async (config: { prepareStep?: () => Promise<void>; onStepFinish?: (step: unknown) => void }) => {
        const result = {
          text: 'Agent response',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          steps: [
            {
              text: 'Agent response',
              finishReason: 'stop',
              toolCalls: [],
              usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            },
          ],
        };
        for (const step of result.steps) {
          if (config.prepareStep) await config.prepareStep();
          if (config.onStepFinish) config.onStepFinish(step);
        }
        return result;
      });

    mockResolveSubtitleTranscriptionAccess.mockReturnValue({
      kind: 'blocked',
      routeProfile: 'capability-bound',
      featureId: 'subtitle-transcription',
      capabilityProvider: 'subtitle-transcription',
      settingsProviderId: 'openai',
      code: 'missing_credential',
      reason: 'Add an API key before using this provider at runtime.',
      nextAction: 'add_api_key',
      attemptedProviderIds: ['openai'],
      fallbackProviderIds: [],
      supportedProviderIds: ['subtitle-transcription'],
    });

    const workflowResult = await executeAIStep(workflowStep, { name: 'World' }, workflowConfig);
    expect(workflowResult).toEqual({
      text: 'Workflow response',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    const promptResult = await optimizePrompt({
      prompt: 'Write better docs',
      config: {
        style: 'concise',
        targetProvider: 'openai',
        targetModel: 'gpt-4o-mini',
        preserveIntent: true,
        enhanceClarity: true,
        addContext: false,
      },
      apiKey: 'test-key',
    });
    expect(promptResult.success).toBe(true);

    const presetResult = await generatePresetFromDescription('A coding assistant', {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
    });
    expect(presetResult.success).toBe(true);

    const { result: canvas } = renderHook(() => useCanvasSuggestions());
    await act(async () => {
      const suggestions = await canvas.current.generateSuggestions({
        content: 'const value = 1;',
        language: 'typescript',
      });
      expect(suggestions).toEqual([]);
    });

    const agentConfig: AgentConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      sessionId: 'feature-matrix-session',
    };
    const agentResult = await executeAgent('Say hello', agentConfig);
    expect(agentResult.success).toBe(true);

    const { result: subtitles } = renderHook(() =>
      useVideoSubtitles({ onError: jest.fn() })
    );
    await act(async () => {
      const output = await subtitles.current.transcribeVideo('demo.mp4');
      expect(output).toBeNull();
    });
    expect(subtitles.current.error).toBe('Add an API key before using this provider at runtime.');

    expect(mockCreateFeatureProviderModelFromRuntimeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'workflow-ai-step', routeProfile: 'general-text' }),
      expect.objectContaining({ providerId: 'openai', model: 'gpt-4o-mini' })
    );
    expect(mockCreateFeatureProviderModelFromRuntimeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'prompt-optimizer', routeProfile: 'general-text' }),
      expect.objectContaining({ providerId: 'openai', model: 'gpt-4o-mini' })
    );
    expect(mockCreateFeatureProviderModelFromRuntimeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'preset-ai-service', routeProfile: 'general-text' }),
      expect.objectContaining({ providerId: 'openai', model: 'gpt-4o-mini' })
    );
    expect(mockCreateFeatureProviderModelFromRuntimeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'canvas-suggestions', routeProfile: 'general-text' }),
      expect.objectContaining({ providerId: 'openai', model: 'gpt-4o-mini' })
    );
    expect(mockCreateFeatureProviderModelFromRuntimeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'agent-executor', routeProfile: 'general-text' }),
      expect.objectContaining({ providerId: 'openai', model: 'gpt-4o-mini' })
    );
  });
});
