/**
 * @jest-environment jsdom
 */

import {
  initializeStronghold,
  isStrongholdAvailable,
  lockStronghold,
  secureStoreProviderApiKey,
  secureGetProviderApiKey,
  secureRemoveProviderApiKey,
  secureStoreProviderApiKeys,
  secureGetProviderApiKeys,
  secureStoreSearchApiKey,
  secureGetSearchApiKey,
  secureStoreCustomProviderApiKey,
  secureGetCustomProviderApiKey,
  migrateApiKeysToStronghold,
  hasSecureApiKey,
  getApiKeyWithFallback,
} from './stronghold-integration';

// Mock the utils module
jest.mock('./utils', () => ({
  isTauri: jest.fn(() => false),
}));

// Mock the stronghold module
jest.mock('./stronghold', () => ({
  initStronghold: jest.fn(),
  isStrongholdReady: jest.fn(() => false),
  closeStronghold: jest.fn(),
  storeProviderApiKey: jest.fn(),
  getProviderApiKey: jest.fn(),
  removeProviderApiKey: jest.fn(),
  storeProviderApiKeys: jest.fn(),
  getProviderApiKeys: jest.fn(),
  storeSearchApiKey: jest.fn(),
  getSearchApiKey: jest.fn(),
  storeCustomProviderApiKey: jest.fn(),
  getCustomProviderApiKey: jest.fn(),
  migrateApiKeyToStronghold: jest.fn(),
}));

describe('Stronghold Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Non-Tauri Environment', () => {
    it('should return false for initialization in non-Tauri environment', async () => {
      const result = await initializeStronghold('password');
      expect(result).toBe(false);
    });

    it('should report Stronghold as unavailable', () => {
      expect(isStrongholdAvailable()).toBe(false);
    });

    it('should return false when storing API key', async () => {
      const result = await secureStoreProviderApiKey('openai', 'sk-test');
      expect(result).toBe(false);
    });

    it('should return null when getting API key', async () => {
      const result = await secureGetProviderApiKey('openai');
      expect(result).toBeNull();
    });

    it('should return false when removing API key', async () => {
      const result = await secureRemoveProviderApiKey('openai');
      expect(result).toBe(false);
    });

    it('should return empty array when getting multiple API keys', async () => {
      const result = await secureGetProviderApiKeys('openai');
      expect(result).toEqual([]);
    });

    it('should return false when storing search API key', async () => {
      const result = await secureStoreSearchApiKey('tavily', 'tvly-test');
      expect(result).toBe(false);
    });

    it('should return null when getting search API key', async () => {
      const result = await secureGetSearchApiKey('tavily');
      expect(result).toBeNull();
    });

    it('should return false when storing custom provider API key', async () => {
      const result = await secureStoreCustomProviderApiKey('custom', 'key');
      expect(result).toBe(false);
    });

    it('should return null when getting custom provider API key', async () => {
      const result = await secureGetCustomProviderApiKey('custom');
      expect(result).toBeNull();
    });
  });

  describe('Migration', () => {
    it('should skip migration when Stronghold not available', async () => {
      const settings = {
        providerSettings: {
          openai: { apiKey: 'sk-test' },
        },
        customProviders: {},
        searchProviders: {},
      };

      const result = await migrateApiKeysToStronghold(settings);
      expect(result.migrated).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });

  describe('Fallback Operations', () => {
    it('should return false for hasSecureApiKey when Stronghold unavailable', async () => {
      const result = await hasSecureApiKey('openai');
      expect(result).toBe(false);
    });

    it('should fall back to plain text key when Stronghold unavailable', async () => {
      const result = await getApiKeyWithFallback('openai', 'plain-text-key');
      expect(result).toBe('plain-text-key');
    });

    it('should return undefined when no key available', async () => {
      const result = await getApiKeyWithFallback('openai', undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('Lock Operation', () => {
    it('should call closeStronghold when locking', async () => {
      const { closeStronghold } = jest.requireMock('./stronghold');
      await lockStronghold();
      expect(closeStronghold).toHaveBeenCalled();
    });
  });
});

describe('Stronghold Integration Service (Tauri Environment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { isTauri } = jest.requireMock('./utils');
    isTauri.mockReturnValue(true);
    
    const stronghold = jest.requireMock('./stronghold');
    stronghold.isStrongholdReady.mockReturnValue(true);
  });

  afterEach(() => {
    const { isTauri } = jest.requireMock('./utils');
    isTauri.mockReturnValue(false);
  });

  it('should report Stronghold as available when initialized', () => {
    expect(isStrongholdAvailable()).toBe(true);
  });

  it('should store provider API key when available', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.storeProviderApiKey.mockResolvedValue(true);

    const result = await secureStoreProviderApiKey('openai', 'sk-test');
    expect(result).toBe(true);
    expect(stronghold.storeProviderApiKey).toHaveBeenCalledWith('openai', 'sk-test');
  });

  it('should get provider API key when available', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.getProviderApiKey.mockResolvedValue('sk-stored-key');

    const result = await secureGetProviderApiKey('openai');
    expect(result).toBe('sk-stored-key');
  });

  it('should store multiple API keys', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.storeProviderApiKeys.mockResolvedValue(true);

    const keys = ['key1', 'key2'];
    const result = await secureStoreProviderApiKeys('openai', keys);
    expect(result).toBe(true);
    expect(stronghold.storeProviderApiKeys).toHaveBeenCalledWith('openai', keys);
  });

  it('should get multiple API keys', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.getProviderApiKeys.mockResolvedValue(['key1', 'key2']);

    const result = await secureGetProviderApiKeys('openai');
    expect(result).toEqual(['key1', 'key2']);
  });

  it('should prefer secure key over plain text fallback', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.getProviderApiKey.mockResolvedValue('secure-key');

    const result = await getApiKeyWithFallback('openai', 'plain-key');
    expect(result).toBe('secure-key');
  });

  it('should migrate API keys successfully', async () => {
    const stronghold = jest.requireMock('./stronghold');
    stronghold.migrateApiKeyToStronghold.mockResolvedValue(true);
    stronghold.storeProviderApiKeys.mockResolvedValue(true);
    stronghold.storeCustomProviderApiKey.mockResolvedValue(true);
    stronghold.storeSearchApiKey.mockResolvedValue(true);

    const settings = {
      providerSettings: {
        openai: { apiKey: 'sk-test', apiKeys: ['key1', 'key2'] },
      },
      customProviders: {
        custom1: { apiKey: 'custom-key' },
      },
      searchProviders: {
        tavily: { apiKey: 'tvly-key' },
      },
      tavilyApiKey: 'legacy-tavily',
    };

    const result = await migrateApiKeysToStronghold(settings);
    
    expect(result.migrated).toContain('provider:openai');
    expect(result.migrated).toContain('provider:openai:multi');
    expect(result.migrated).toContain('custom:custom1');
    expect(result.migrated).toContain('search:tavily');
    expect(result.migrated).toContain('search:tavily:legacy');
    expect(result.failed).toEqual([]);
  });
});
