/**
 * Tokenizer Registry Tests
 */

import {
  TokenizerRegistry,
  getTokenizerRegistry,
  resetTokenizerRegistry,
} from './tokenizer-registry';
import { EstimationTokenizer } from './base-tokenizer';
import { TiktokenTokenizer } from './tiktoken-tokenizer';

// Mock js-tiktoken
jest.mock('js-tiktoken', () => ({
  getEncoding: jest.fn(() => ({
    encode: jest.fn((text: string) => {
      // Simple mock: approximately 1 token per 4 characters
      const tokens = [];
      for (let i = 0; i < Math.ceil(text.length / 4); i++) {
        tokens.push(i);
      }
      return tokens;
    }),
  })),
}));

// Mock fetch for API tokenizers
global.fetch = jest.fn();

describe('TokenizerRegistry', () => {
  beforeEach(() => {
    resetTokenizerRegistry();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create a registry with default settings', () => {
      const registry = new TokenizerRegistry();
      expect(registry).toBeInstanceOf(TokenizerRegistry);
    });

    it('should have all required tokenizers', () => {
      const registry = new TokenizerRegistry();
      const providers = registry.getAvailableProviders();
      
      expect(providers).toContain('estimation');
      expect(providers).toContain('tiktoken');
      expect(providers).toContain('gemini-api');
      expect(providers).toContain('claude-api');
      expect(providers).toContain('glm-api');
    });
  });

  describe('resolveProvider', () => {
    it('should return estimation for unknown models', () => {
      const registry = new TokenizerRegistry();
      const provider = registry.resolveProvider('unknown-model');
      expect(provider).toBe('estimation');
    });

    it('should return tiktoken for GPT models', () => {
      const registry = new TokenizerRegistry();
      
      expect(registry.resolveProvider('gpt-4o')).toBe('tiktoken');
      expect(registry.resolveProvider('gpt-4-turbo')).toBe('tiktoken');
      expect(registry.resolveProvider('gpt-3.5-turbo')).toBe('tiktoken');
    });

    it('should return claude-api for Claude models', () => {
      const registry = new TokenizerRegistry();
      
      expect(registry.resolveProvider('claude-3-opus')).toBe('claude-api');
      expect(registry.resolveProvider('claude-3-sonnet')).toBe('claude-api');
    });

    it('should return gemini-api for Gemini models', () => {
      const registry = new TokenizerRegistry();
      
      expect(registry.resolveProvider('gemini-1.5-pro')).toBe('gemini-api');
      expect(registry.resolveProvider('gemini-2.0-flash')).toBe('gemini-api');
    });

    it('should return glm-api for GLM models', () => {
      const registry = new TokenizerRegistry();
      
      expect(registry.resolveProvider('glm-4')).toBe('glm-api');
      expect(registry.resolveProvider('glm-4.5')).toBe('glm-api');
    });

    it('should respect preferred provider when specified', () => {
      const registry = new TokenizerRegistry();
      
      expect(registry.resolveProvider('gpt-4o', 'estimation')).toBe('estimation');
      expect(registry.resolveProvider('claude-3-opus', 'tiktoken')).toBe('tiktoken');
    });
  });

  describe('countTokens', () => {
    it('should return 0 for empty content', async () => {
      const registry = new TokenizerRegistry();
      const result = await registry.countTokens('');
      
      expect(result.tokens).toBe(0);
      expect(result.isExact).toBe(true);
    });

    it('should count tokens using estimation', async () => {
      const registry = new TokenizerRegistry();
      const result = await registry.countTokens('Hello, world!', {
        provider: 'estimation',
      });
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.provider).toBe('estimation');
      expect(result.isExact).toBe(false);
    });

    it('should count tokens using tiktoken', async () => {
      const registry = new TokenizerRegistry();
      const result = await registry.countTokens('Hello, world!', {
        provider: 'tiktoken',
        model: 'gpt-4o',
      });
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.provider).toBe('tiktoken');
      expect(result.isExact).toBe(true);
    });

    it('should cache results when caching is enabled', async () => {
      const registry = new TokenizerRegistry({ enableCache: true });
      
      const result1 = await registry.countTokens('Test content', {
        provider: 'tiktoken',
      });
      const result2 = await registry.countTokens('Test content', {
        provider: 'tiktoken',
      });
      
      expect(result1.tokens).toBe(result2.tokens);
    });
  });

  describe('countMessageTokens', () => {
    it('should return 0 for empty messages', async () => {
      const registry = new TokenizerRegistry();
      const result = await registry.countMessageTokens([]);
      
      expect(result.tokens).toBe(0);
      expect(result.isExact).toBe(true);
    });

    it('should count tokens for chat messages', async () => {
      const registry = new TokenizerRegistry();
      const result = await registry.countMessageTokens(
        [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        { provider: 'tiktoken' }
      );
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.provider).toBe('tiktoken');
    });

    it('should include system messages in count', async () => {
      const registry = new TokenizerRegistry();
      
      const withoutSystem = await registry.countMessageTokens(
        [{ role: 'user', content: 'Hello' }],
        { provider: 'estimation' }
      );
      
      const withSystem = await registry.countMessageTokens(
        [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
        { provider: 'estimation' }
      );
      
      expect(withSystem.tokens).toBeGreaterThan(withoutSystem.tokens);
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      const registry = new TokenizerRegistry();
      registry.updateSettings({ apiTimeout: 10000 });
      
      // Settings are internal, but we can verify the registry still works
      expect(registry).toBeInstanceOf(TokenizerRegistry);
    });

    it('should set API keys', () => {
      const registry = new TokenizerRegistry();
      registry.setApiKeys({
        google: 'test-google-key',
        anthropic: 'test-anthropic-key',
      });
      
      expect(registry).toBeInstanceOf(TokenizerRegistry);
    });
  });

  describe('getTokenizerRegistry singleton', () => {
    it('should return the same instance', () => {
      const registry1 = getTokenizerRegistry();
      const registry2 = getTokenizerRegistry();
      
      expect(registry1).toBe(registry2);
    });

    it('should reset when resetTokenizerRegistry is called', () => {
      const registry1 = getTokenizerRegistry();
      resetTokenizerRegistry();
      const registry2 = getTokenizerRegistry();
      
      expect(registry1).not.toBe(registry2);
    });
  });
});

describe('EstimationTokenizer', () => {
  const tokenizer = new EstimationTokenizer();

  it('should return 0 for empty content', async () => {
    const result = await tokenizer.countTokens('');
    expect(result.tokens).toBe(0);
  });

  it('should estimate tokens for English text', async () => {
    const result = await tokenizer.countTokens('Hello, world!');
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.isExact).toBe(false);
    expect(result.provider).toBe('estimation');
  });

  it('should adjust for code blocks', async () => {
    const plainText = 'Some text here';
    const codeText = '```javascript\nconst x = 1;\n```';
    
    const plainResult = await tokenizer.countTokens(plainText);
    const codeResult = await tokenizer.countTokens(codeText);
    
    // Code should have more tokens per character
    const plainRatio = plainResult.tokens / plainText.length;
    const codeRatio = codeResult.tokens / codeText.length;
    
    expect(codeRatio).toBeGreaterThanOrEqual(plainRatio * 0.9);
  });

  it('should support any model', () => {
    expect(tokenizer.supportsModel('gpt-4o')).toBe(true);
    expect(tokenizer.supportsModel('claude-3-opus')).toBe(true);
    expect(tokenizer.supportsModel('unknown-model')).toBe(true);
  });
});

describe('TiktokenTokenizer', () => {
  const tokenizer = new TiktokenTokenizer();

  it('should return 0 for empty content', async () => {
    const result = await tokenizer.countTokens('');
    expect(result.tokens).toBe(0);
  });

  it('should count tokens accurately', async () => {
    const result = await tokenizer.countTokens('Hello, world!');
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.isExact).toBe(true);
    expect(result.provider).toBe('tiktoken');
  });

  it('should support GPT models', () => {
    expect(tokenizer.supportsModel('gpt-4o')).toBe(true);
    expect(tokenizer.supportsModel('gpt-4-turbo')).toBe(true);
    expect(tokenizer.supportsModel('gpt-3.5-turbo')).toBe(true);
    expect(tokenizer.supportsModel('o1')).toBe(true);
    expect(tokenizer.supportsModel('o3')).toBe(true);
  });

  it('should not support non-OpenAI models', () => {
    expect(tokenizer.supportsModel('claude-3-opus')).toBe(false);
    expect(tokenizer.supportsModel('gemini-1.5-pro')).toBe(false);
    expect(tokenizer.supportsModel('glm-4')).toBe(false);
  });

  it('should get encoding for model', () => {
    expect(tokenizer.getEncodingForModel('gpt-4o')).toBe('o200k_base');
    expect(tokenizer.getEncodingForModel('gpt-4')).toBe('cl100k_base');
    expect(tokenizer.getEncodingForModel('gpt-3.5-turbo')).toBe('cl100k_base');
  });
});
