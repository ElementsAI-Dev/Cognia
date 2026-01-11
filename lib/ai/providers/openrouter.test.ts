/**
 * Tests for OpenRouter API service
 */

import {
  formatCredits,
  formatUsage,
  maskApiKey,
  isValidOpenRouterKey,
  isProvisioningKey,
  parseModelPricing,
  isModelFree,
  getModelProvider,
  sortModelsByProvider,
  groupModelsByProvider,
  buildChatRequestHeaders,
  buildChatRequestBody,
  getEnabledBYOKProviders,
  OpenRouterError,
} from './openrouter';
import type { OpenRouterModel } from '@/types/provider/openrouter';
import type { BYOKKeyEntry } from '@/types/provider';

describe('OpenRouterError', () => {
  it('creates error with code and metadata', () => {
    const error = new OpenRouterError('Test error', 400, { key: 'value' });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(400);
    expect(error.metadata).toEqual({ key: 'value' });
    expect(error.name).toBe('OpenRouterError');
  });
});

describe('formatCredits', () => {
  it('formats large credits with 2 decimals', () => {
    expect(formatCredits(10.5)).toBe('$10.50');
    expect(formatCredits(100)).toBe('$100.00');
  });

  it('formats medium credits with 4 decimals', () => {
    expect(formatCredits(0.0123)).toBe('$0.0123');
    expect(formatCredits(0.5)).toBe('$0.5000');
  });

  it('formats small credits with 6 decimals', () => {
    expect(formatCredits(0.000123)).toBe('$0.000123');
    expect(formatCredits(0.001)).toBe('$0.001000');
  });
});

describe('formatUsage', () => {
  it('formats millions', () => {
    expect(formatUsage(1500000)).toBe('1.50M');
    expect(formatUsage(1000000)).toBe('1.00M');
  });

  it('formats thousands', () => {
    expect(formatUsage(1500)).toBe('1.5K');
    expect(formatUsage(50000)).toBe('50.0K');
  });

  it('formats small numbers as is', () => {
    expect(formatUsage(999)).toBe('999');
    expect(formatUsage(0)).toBe('0');
  });
});

describe('maskApiKey', () => {
  it('masks long keys', () => {
    const key = 'sk-or-v1-abcdefghijklmnop';
    const masked = maskApiKey(key);
    expect(masked).toBe('sk-or-v1...mnop');
  });

  it('returns **** for short keys', () => {
    expect(maskApiKey('short')).toBe('****');
    expect(maskApiKey('123456789012')).toBe('****');
  });
});

describe('isValidOpenRouterKey', () => {
  it('validates OpenRouter OAuth keys', () => {
    expect(isValidOpenRouterKey('sk-or-abcdefghij')).toBe(true);
    expect(isValidOpenRouterKey('sk-or-v1-abcdefghij')).toBe(true);
  });

  it('validates other sk- keys', () => {
    expect(isValidOpenRouterKey('sk-abcdefghijk')).toBe(true);
  });

  it('rejects invalid keys', () => {
    expect(isValidOpenRouterKey('short')).toBe(false);
    expect(isValidOpenRouterKey('invalid-key')).toBe(false);
  });
});

describe('isProvisioningKey', () => {
  it('identifies provisioning keys', () => {
    expect(isProvisioningKey('sk-or-v1-abcdefghij')).toBe(true);
  });

  it('rejects non-provisioning keys', () => {
    expect(isProvisioningKey('sk-or-abcdefghij')).toBe(false);
    expect(isProvisioningKey('sk-abcdefghij')).toBe(false);
  });
});

describe('parseModelPricing', () => {
  it('parses string pricing to per-million values', () => {
    const model: OpenRouterModel = {
      id: 'test/model',
      name: 'Test Model',
      context_length: 4096,
      pricing: {
        prompt: '0.000001',
        completion: '0.000002',
      },
    };
    
    const pricing = parseModelPricing(model);
    expect(pricing.promptPer1M).toBe(1);
    expect(pricing.completionPer1M).toBe(2);
  });

  it('handles zero pricing', () => {
    const model: OpenRouterModel = {
      id: 'test/free-model',
      name: 'Free Model',
      context_length: 4096,
      pricing: {
        prompt: '0',
        completion: '0',
      },
    };
    
    const pricing = parseModelPricing(model);
    expect(pricing.promptPer1M).toBe(0);
    expect(pricing.completionPer1M).toBe(0);
  });
});

describe('isModelFree', () => {
  it('identifies free models', () => {
    const freeModel: OpenRouterModel = {
      id: 'test/free',
      name: 'Free',
      context_length: 4096,
      pricing: { prompt: '0', completion: '0' },
    };
    expect(isModelFree(freeModel)).toBe(true);
  });

  it('identifies paid models', () => {
    const paidModel: OpenRouterModel = {
      id: 'test/paid',
      name: 'Paid',
      context_length: 4096,
      pricing: { prompt: '0.000001', completion: '0.000002' },
    };
    expect(isModelFree(paidModel)).toBe(false);
  });
});

describe('getModelProvider', () => {
  it('extracts provider from model ID', () => {
    expect(getModelProvider('openai/gpt-4o')).toBe('openai');
    expect(getModelProvider('anthropic/claude-3-opus')).toBe('anthropic');
    expect(getModelProvider('google/gemini-pro')).toBe('google');
  });

  it('handles models without slash', () => {
    expect(getModelProvider('gpt-4')).toBe('gpt-4');
  });
});

describe('sortModelsByProvider', () => {
  it('sorts models by provider then name', () => {
    const models: OpenRouterModel[] = [
      { id: 'openai/gpt-4', name: 'GPT-4', context_length: 8192, pricing: { prompt: '0', completion: '0' } },
      { id: 'anthropic/claude', name: 'Claude', context_length: 100000, pricing: { prompt: '0', completion: '0' } },
      { id: 'openai/gpt-3.5', name: 'GPT-3.5', context_length: 4096, pricing: { prompt: '0', completion: '0' } },
    ];
    
    const sorted = sortModelsByProvider(models);
    expect(sorted[0].id).toBe('anthropic/claude');
    expect(sorted[1].id).toBe('openai/gpt-3.5');
    expect(sorted[2].id).toBe('openai/gpt-4');
  });
});

describe('groupModelsByProvider', () => {
  it('groups models by provider', () => {
    const models: OpenRouterModel[] = [
      { id: 'openai/gpt-4', name: 'GPT-4', context_length: 8192, pricing: { prompt: '0', completion: '0' } },
      { id: 'anthropic/claude', name: 'Claude', context_length: 100000, pricing: { prompt: '0', completion: '0' } },
      { id: 'openai/gpt-3.5', name: 'GPT-3.5', context_length: 4096, pricing: { prompt: '0', completion: '0' } },
    ];
    
    const grouped = groupModelsByProvider(models);
    expect(Object.keys(grouped)).toEqual(['openai', 'anthropic']);
    expect(grouped['openai'].length).toBe(2);
    expect(grouped['anthropic'].length).toBe(1);
  });
});

describe('buildChatRequestHeaders', () => {
  it('builds basic headers with API key', () => {
    const headers = buildChatRequestHeaders('test-api-key');
    expect(headers['Authorization']).toBe('Bearer test-api-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('includes optional site headers', () => {
    const headers = buildChatRequestHeaders('test-api-key', 'https://myapp.com', 'My App');
    expect(headers['HTTP-Referer']).toBe('https://myapp.com');
    expect(headers['X-Title']).toBe('My App');
  });
});

describe('buildChatRequestBody', () => {
  it('builds basic request body', () => {
    const body = buildChatRequestBody({
      apiKey: 'test',
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    
    expect(body.model).toBe('openai/gpt-4o');
    expect(body.messages).toHaveLength(1);
  });

  it('includes optional parameters', () => {
    const body = buildChatRequestBody({
      apiKey: 'test',
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      stream: true,
      providerOrdering: { allow_fallbacks: true, order: ['openai', 'anthropic'] },
    });
    
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(1000);
    expect(body.top_p).toBe(0.9);
    expect(body.stream).toBe(true);
    expect(body.provider).toEqual({ allow_fallbacks: true, order: ['openai', 'anthropic'] });
  });
});

describe('getEnabledBYOKProviders', () => {
  it('returns enabled BYOK providers', () => {
    const byokKeys: BYOKKeyEntry[] = [
      { id: '1', provider: 'openai', config: 'key1', alwaysUse: false, enabled: true },
      { id: '2', provider: 'anthropic', config: 'key2', alwaysUse: false, enabled: false },
      { id: '3', provider: 'google', config: 'key3', alwaysUse: true, enabled: true },
    ];
    
    const enabled = getEnabledBYOKProviders(byokKeys);
    expect(enabled).toEqual(['openai', 'google']);
  });

  it('returns empty array when no BYOK keys', () => {
    expect(getEnabledBYOKProviders([])).toEqual([]);
  });
});
