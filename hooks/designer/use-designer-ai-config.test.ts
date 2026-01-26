/**
 * useDesignerAIConfig Tests
 */

import { renderHook } from '@testing-library/react';
import { useDesignerAIConfig } from './use-designer-ai-config';
import { useSettingsStore } from '@/stores';
import { getDesignerAIConfig } from '@/lib/designer';

// Mock the stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

// Mock lib/designer
jest.mock('@/lib/designer', () => ({
  getDesignerAIConfig: jest.fn(),
}));

const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;
const mockGetDesignerAIConfig = getDesignerAIConfig as jest.MockedFunction<
  typeof getDesignerAIConfig
>;

describe('useDesignerAIConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        defaultProvider: 'openai',
        providerSettings: {
          openai: {
            apiKey: 'test-key',
            defaultModel: 'gpt-4o-mini',
          },
          ollama: {
            defaultModel: 'llama2',
          },
        },
      };
      return selector(state as never);
    });

    mockGetDesignerAIConfig.mockImplementation((provider, settings) => ({
      provider: (provider || 'openai') as 'openai',
      model: settings[provider || 'openai']?.defaultModel || 'gpt-4o-mini',
      apiKey: settings[provider || 'openai']?.apiKey,
    }));
  });

  it('should return getConfig function', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    expect(result.current.getConfig).toBeDefined();
    expect(typeof result.current.getConfig).toBe('function');
  });

  it('should return current provider', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    expect(result.current.provider).toBe('openai');
  });

  it('should return hasApiKey as true when API key exists', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    expect(result.current.hasApiKey).toBe(true);
  });

  it('should call getDesignerAIConfig with correct parameters', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    result.current.getConfig();

    expect(mockGetDesignerAIConfig).toHaveBeenCalledWith('openai', {
      openai: {
        apiKey: 'test-key',
        defaultModel: 'gpt-4o-mini',
      },
      ollama: {
        defaultModel: 'llama2',
      },
    });
  });

  it('should return consistent config values', () => {
    const { result, rerender } = renderHook(() => useDesignerAIConfig());

    const firstConfig = result.current.getConfig();
    rerender();
    const secondConfig = result.current.getConfig();

    expect(firstConfig.provider).toBe(secondConfig.provider);
    expect(firstConfig.model).toBe(secondConfig.model);
  });
});

describe('useDesignerAIConfig with ollama provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        defaultProvider: 'ollama',
        providerSettings: {
          ollama: {
            defaultModel: 'llama2',
          },
        },
      };
      return selector(state as never);
    });
  });

  it('should return hasApiKey as true for ollama (no key required)', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    expect(result.current.hasApiKey).toBe(true);
  });
});

describe('useDesignerAIConfig without API key', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        defaultProvider: 'openai',
        providerSettings: {
          openai: {
            defaultModel: 'gpt-4o-mini',
            // No apiKey
          },
        },
      };
      return selector(state as never);
    });
  });

  it('should return hasApiKey as false when no API key', () => {
    const { result } = renderHook(() => useDesignerAIConfig());

    expect(result.current.hasApiKey).toBe(false);
  });
});
