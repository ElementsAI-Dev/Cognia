/**
 * @jest-environment jsdom
 */
import {
  CHAT_WIDGET_PROVIDERS,
  CHAT_WIDGET_MODELS,
  getProviderShortName,
  getShortModelName,
  exportChatMessages,
} from './constants';
import type { ProviderName } from '@/types';

describe('CHAT_WIDGET_PROVIDERS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CHAT_WIDGET_PROVIDERS)).toBe(true);
    expect(CHAT_WIDGET_PROVIDERS.length).toBeGreaterThan(0);
  });

  it('contains expected providers', () => {
    const providerValues = CHAT_WIDGET_PROVIDERS.map((p) => p.value);
    expect(providerValues).toContain('openai');
    expect(providerValues).toContain('anthropic');
    expect(providerValues).toContain('google');
    expect(providerValues).toContain('ollama');
  });

  it('each entry has value and label', () => {
    CHAT_WIDGET_PROVIDERS.forEach((p) => {
      expect(typeof p.value).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(p.value.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    });
  });
});

describe('CHAT_WIDGET_MODELS', () => {
  it('is an object with provider keys', () => {
    expect(typeof CHAT_WIDGET_MODELS).toBe('object');
    expect(Object.keys(CHAT_WIDGET_MODELS).length).toBeGreaterThan(0);
  });

  it('contains models for openai', () => {
    const openaiModels = CHAT_WIDGET_MODELS['openai'];
    expect(openaiModels).toBeDefined();
    expect(Array.isArray(openaiModels)).toBe(true);
    expect(openaiModels!.length).toBeGreaterThan(0);
  });

  it('each model entry has value and label', () => {
    Object.values(CHAT_WIDGET_MODELS).forEach((models) => {
      if (!models) return;
      models.forEach((m) => {
        expect(typeof m.value).toBe('string');
        expect(typeof m.label).toBe('string');
        expect(m.value.length).toBeGreaterThan(0);
        expect(m.label.length).toBeGreaterThan(0);
      });
    });
  });

  it('has models for all listed providers', () => {
    CHAT_WIDGET_PROVIDERS.forEach((p) => {
      expect(CHAT_WIDGET_MODELS[p.value]).toBeDefined();
    });
  });
});

describe('getProviderShortName', () => {
  it('returns short name for known providers', () => {
    expect(getProviderShortName('openai' as ProviderName)).toBe('GPT');
    expect(getProviderShortName('anthropic' as ProviderName)).toBe('Claude');
    expect(getProviderShortName('google' as ProviderName)).toBe('Gemini');
    expect(getProviderShortName('deepseek' as ProviderName)).toBe('DeepSeek');
    expect(getProviderShortName('groq' as ProviderName)).toBe('Groq');
    expect(getProviderShortName('mistral' as ProviderName)).toBe('Mistral');
    expect(getProviderShortName('xai' as ProviderName)).toBe('Grok');
    expect(getProviderShortName('ollama' as ProviderName)).toBe('Local');
  });

  it('returns provider name for unknown providers', () => {
    expect(getProviderShortName('unknown-provider' as ProviderName)).toBe('unknown-provider');
  });
});

describe('getShortModelName', () => {
  it('returns short name for known models', () => {
    expect(getShortModelName('gpt-4o')).toBe('4o');
    expect(getShortModelName('gpt-4o-mini')).toBe('4o-mini');
    expect(getShortModelName('claude-sonnet-4-20250514')).toBe('Sonnet 4');
    expect(getShortModelName('deepseek-chat')).toBe('Chat');
    expect(getShortModelName('deepseek-reasoner')).toBe('Reasoner');
    expect(getShortModelName('grok-3')).toBe('Grok 3');
    expect(getShortModelName('grok-3-mini')).toBe('Grok Mini');
  });

  it('falls back to last segment for unknown models', () => {
    expect(getShortModelName('some-unknown-model')).toBe('model');
  });

  it('returns full name if no dash separator', () => {
    expect(getShortModelName('singleword')).toBe('singleword');
  });
});

describe('exportChatMessages', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  let mockAnchor: { href: string; download: string; click: jest.Mock };

  beforeEach(() => {
    mockAnchor = { href: '', download: '', click: jest.fn() };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
    URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  const mockTranslate = (key: string) => {
    const map: Record<string, string> = {
      'export.user': 'User',
      'export.assistant': 'Assistant',
    };
    return map[key] || key;
  };

  it('creates a markdown blob and triggers download', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];

    exportChatMessages(messages, mockTranslate);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('formats user and assistant messages correctly', () => {
    const messages = [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer' },
    ];

    exportChatMessages(messages, mockTranslate);

    const blobArg = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/markdown');
  });

  it('handles empty messages array', () => {
    exportChatMessages([], mockTranslate);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('sets correct download filename with date', () => {
    exportChatMessages([{ role: 'user', content: 'test' }], mockTranslate);

    expect(mockAnchor.download).toMatch(/^chat-export-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it('calls click on the anchor element', () => {
    exportChatMessages([{ role: 'user', content: 'test' }], mockTranslate);

    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
  });
});
