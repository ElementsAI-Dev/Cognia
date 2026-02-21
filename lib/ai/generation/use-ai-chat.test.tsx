/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { generateText, streamText } from 'ai';
import { useAIChat, type ChatToolEvent } from './use-ai-chat';

const mockSettingsState = {
  providerSettings: {
    openai: {
      apiKey: 'test-key',
      enabled: true,
      apiKeyRotationEnabled: false,
    },
  },
  streamResponses: true,
  compressionSettings: { enabled: false },
  customInstructions: '',
  customInstructionsEnabled: false,
  aboutUser: '',
  responsePreferences: '',
  safetyModeSettings: { enabled: false },
  recordApiKeyUsage: jest.fn(),
};

const mockMemoryState = {
  getMemoriesForPrompt: jest.fn(() => []),
  detectMemoryFromText: jest.fn(() => null),
  createMemory: jest.fn(),
  settings: { enabled: false },
};

const mockUsageState = {
  canMakeRequest: jest.fn(() => ({ allowed: true })),
};

const mockSessionState = {
  getSession: jest.fn(() => undefined),
};

const mockVectorState = {
  settings: {},
};

const mockAddUsageRecord = jest.fn();
const mockPluginIntegration = {
  notifyStreamStart: jest.fn(),
  notifyStreamChunk: jest.fn(),
  notifyStreamEnd: jest.fn(),
  notifyTokenUsage: jest.fn(),
  notifyChatError: jest.fn(),
};

jest.mock('ai', () => ({
  streamText: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock('../core/proxy-client', () => ({
  getProxyProviderModel: jest.fn(() => ({})),
}));

jest.mock('@/stores', () => {
  const useSettingsStore = jest.fn((selector: (state: typeof mockSettingsState) => unknown) =>
    selector(mockSettingsState)
  );
  (useSettingsStore as unknown as { getState: () => typeof mockSettingsState }).getState = () =>
    mockSettingsState;

  const useMemoryStore = jest.fn((selector: (state: typeof mockMemoryState) => unknown) =>
    selector(mockMemoryState)
  );

  const useUsageStore = jest.fn(
    (selector: (state: { addUsageRecord: typeof mockAddUsageRecord }) => unknown) =>
      selector({ addUsageRecord: mockAddUsageRecord })
  );
  (useUsageStore as unknown as { getState: () => typeof mockUsageState }).getState = () =>
    mockUsageState;

  const useSessionStore = jest.fn((selector: (state: typeof mockSessionState) => unknown) =>
    selector(mockSessionState)
  );

  const useVectorStore = jest.fn((selector: (state: typeof mockVectorState) => unknown) =>
    selector(mockVectorState)
  );

  return {
    useSettingsStore,
    useMemoryStore,
    useUsageStore,
    useSessionStore,
    useVectorStore,
  };
});

jest.mock('../infrastructure', () => ({
  circuitBreakerRegistry: {
    get: jest.fn(() => ({
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    })),
  },
  recordApiUsage: jest.fn(),
  isProviderAvailable: jest.fn(() => true),
  calculateRequestCost: jest.fn(() => 0),
}));

jest.mock('@/lib/plugin', () => ({
  getPluginWorkflowIntegration: jest.fn(() => mockPluginIntegration),
}));

jest.mock('../embedding/compression', () => ({
  filterMessagesForContext: jest.fn((messages: unknown) => messages),
  filterMessagesForContextAsync: jest.fn(async (messages: unknown) => messages),
  mergeCompressionSettings: jest.fn((settings: unknown) => settings),
}));

jest.mock('../embedding/provider-cache-profile', () => ({
  shouldPrioritizePrefixStability: jest.fn(() => false),
}));

jest.mock('../core/middleware', () => ({
  checkSafety: jest.fn(async () => ({ safe: true })),
  getSafetyWarningMessage: jest.fn(() => ''),
}));

jest.mock('@/hooks/ai/use-chat-observability', () => ({
  useChatObservabilityConfig: jest.fn(() => ({
    enabled: false,
    enableLangfuse: false,
    enableOpenTelemetry: false,
  })),
}));

jest.mock('@/lib/vector/embedding', () => ({
  assertEmbeddingProviderRuntimeAvailable: jest.fn(),
  isEmbeddingProviderConfigured: jest.fn(() => false),
  isTransformersRuntimeUnavailableError: jest.fn(() => false),
  resolveEmbeddingApiKey: jest.fn(() => undefined),
}));

describe('useAIChat tool events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsState.streamResponses = true;
  });

  it('emits streaming tool lifecycle events in order', async () => {
    const stepEvents: ChatToolEvent[] = [];
    const stepFinish = jest.fn();
    const chunkSpy = jest.fn();

    const fullStream = async function* () {
      yield { type: 'tool-input-start', id: 'tc-1', toolName: 'display_flashcard' };
      yield {
        type: 'tool-input-delta',
        id: 'tc-1',
        delta: '{"flashcard":{"front":"Q","back":"A"}}',
      };
      yield {
        type: 'tool-call',
        toolCallId: 'tc-1',
        toolName: 'display_flashcard',
        input: { flashcard: { front: 'Q', back: 'A' } },
      };
      yield {
        type: 'tool-result',
        toolCallId: 'tc-1',
        toolName: 'display_flashcard',
        input: { flashcard: { front: 'Q', back: 'A' } },
        output: { flashcard: { front: 'Q', back: 'A' } },
      };
      yield { type: 'text-delta', text: '完成' };
    };

    (streamText as jest.Mock).mockResolvedValue({
      fullStream: fullStream(),
      usage: Promise.resolve({ promptTokens: 10, completionTokens: 5 }),
      finishReason: Promise.resolve('stop'),
    });

    const { result } = renderHook(() =>
      useAIChat({
        provider: 'openai',
        model: 'gpt-test',
        onToolEvent: (event) => stepEvents.push(event),
        onStepFinish: stepFinish,
      })
    );

    let response = '';
    await act(async () => {
      response = await result.current.sendMessage(
        {
          messages: [{ role: 'user', content: '请生成闪卡' }],
          streaming: true,
        },
        chunkSpy
      );
    });

    expect(response).toBe('完成');
    expect(chunkSpy).toHaveBeenCalledWith('完成');
    expect(stepEvents.map((event) => event.type)).toEqual(['start', 'update', 'update', 'finish']);
    expect(stepFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCalls: [
          expect.objectContaining({
            toolCallId: 'tc-1',
            toolName: 'display_flashcard',
          }),
        ],
        toolResults: [
          expect.objectContaining({
            toolCallId: 'tc-1',
            toolName: 'display_flashcard',
          }),
        ],
      })
    );
  });

  it('emits tool events for non-streaming responses', async () => {
    mockSettingsState.streamResponses = false;
    const toolEvents: ChatToolEvent[] = [];

    (generateText as jest.Mock).mockResolvedValue({
      text: '已完成',
      usage: { promptTokens: 8, completionTokens: 4 },
      finishReason: 'stop',
      toolCalls: [
        {
          toolCallId: 'tc-2',
          toolName: 'display_quiz',
          input: { quiz: { id: 'q-1' } },
        },
      ],
      toolResults: [
        {
          toolCallId: 'tc-2',
          toolName: 'display_quiz',
          input: { quiz: { id: 'q-1' } },
          output: { id: 'q-1', questions: [] },
        },
      ],
    });

    const { result } = renderHook(() =>
      useAIChat({
        provider: 'openai',
        model: 'gpt-test',
        onToolEvent: (event) => toolEvents.push(event),
      })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: 'user', content: '请生成测验' }],
        streaming: false,
      });
    });

    expect(toolEvents.map((event) => event.type)).toEqual(['start', 'update', 'finish']);
    expect(toolEvents[2]).toEqual(
      expect.objectContaining({
        type: 'finish',
        toolCallId: 'tc-2',
        toolName: 'display_quiz',
      })
    );
  });
});
