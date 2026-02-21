import { clearWebCompletionCache, triggerWebCompletion } from './web-completion-provider';

const mockProxyFetch = jest.fn();

jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => mockProxyFetch(...args),
}));

describe('web-completion-provider cache alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearWebCompletionCache();
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'completion text' } }],
      }),
    });
  });

  it('reuses cache for identical structured request', async () => {
    const config = {
      provider: 'openai' as const,
      apiKey: 'test-key',
      modelId: 'gpt-4o-mini',
      mode: 'chat' as const,
      surface: 'chat_input' as const,
      textAfterCursor: ' world',
      cursorOffset: 5,
      conversationDigest: 'user:hello',
    };

    const first = await triggerWebCompletion('hello', config);
    const second = await triggerWebCompletion('hello', config);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(mockProxyFetch).toHaveBeenCalledTimes(1);
  });

  it('separates cache by surface and mode dimensions', async () => {
    const base = {
      provider: 'openai' as const,
      apiKey: 'test-key',
      modelId: 'gpt-4o-mini',
      textAfterCursor: '',
    };

    await triggerWebCompletion('hello', {
      ...base,
      mode: 'chat',
      surface: 'chat_input',
    });

    await triggerWebCompletion('hello', {
      ...base,
      mode: 'code',
      surface: 'latex_editor',
    });

    expect(mockProxyFetch).toHaveBeenCalledTimes(2);
  });
});
