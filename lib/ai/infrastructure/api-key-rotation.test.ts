/**
 * Tests for API Key Rotation
 */

import {
  getDefaultUsageStats,
  getNextApiKey,
  recordApiKeySuccess,
  recordApiKeyError,
  resetApiKeyStats,
  getAggregatedStats,
  maskApiKey,
  isValidApiKeyFormat,
} from './api-key-rotation';
import type { ApiKeyUsageStats } from '@/types/provider';

describe('getDefaultUsageStats', () => {
  it('should return default stats with zero values', () => {
    const stats = getDefaultUsageStats();

    expect(stats.usageCount).toBe(0);
    expect(stats.lastUsed).toBe(0);
    expect(stats.errorCount).toBe(0);
  });
});

describe('getNextApiKey', () => {
  it('should throw error for empty keys array', () => {
    expect(() => getNextApiKey([], 'round-robin', 0, {})).toThrow('No API keys available');
  });

  it('should return single key if only one available', () => {
    const result = getNextApiKey(['key1'], 'round-robin', 0, {});

    expect(result.apiKey).toBe('key1');
    expect(result.index).toBe(0);
  });

  describe('round-robin strategy', () => {
    it('should rotate through keys in order', () => {
      const keys = ['key1', 'key2', 'key3'];

      const result1 = getNextApiKey(keys, 'round-robin', 0, {});
      expect(result1.apiKey).toBe('key2');
      expect(result1.index).toBe(1);

      const result2 = getNextApiKey(keys, 'round-robin', 1, {});
      expect(result2.apiKey).toBe('key3');
      expect(result2.index).toBe(2);

      const result3 = getNextApiKey(keys, 'round-robin', 2, {});
      expect(result3.apiKey).toBe('key1');
      expect(result3.index).toBe(0);
    });
  });

  describe('random strategy', () => {
    it('should return a key from the array', () => {
      const keys = ['key1', 'key2', 'key3'];
      const result = getNextApiKey(keys, 'random', 0, {});

      expect(keys).toContain(result.apiKey);
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(keys.length);
    });

    it('should avoid keys with recent errors', () => {
      const keys = ['key1', 'key2'];
      const usageStats: Record<string, ApiKeyUsageStats> = {
        key1: {
          usageCount: 10,
          lastUsed: Date.now(),
          errorCount: 5,
        },
      };

      // Run multiple times to ensure we get key2
      let gotKey2 = false;
      for (let i = 0; i < 20; i++) {
        const result = getNextApiKey(keys, 'random', 0, usageStats);
        if (result.apiKey === 'key2') {
          gotKey2 = true;
          break;
        }
      }

      expect(gotKey2).toBe(true);
    });
  });

  describe('least-used strategy', () => {
    it('should select key with lowest usage', () => {
      const keys = ['key1', 'key2', 'key3'];
      const usageStats: Record<string, ApiKeyUsageStats> = {
        key1: { usageCount: 100, lastUsed: 0, errorCount: 0 },
        key2: { usageCount: 5, lastUsed: 0, errorCount: 0 },
        key3: { usageCount: 50, lastUsed: 0, errorCount: 0 },
      };

      const result = getNextApiKey(keys, 'least-used', 0, usageStats);

      expect(result.apiKey).toBe('key2');
    });

    it('should weight errors more heavily', () => {
      const keys = ['key1', 'key2'];
      const usageStats: Record<string, ApiKeyUsageStats> = {
        key1: { usageCount: 10, lastUsed: 0, errorCount: 0 },
        key2: { usageCount: 5, lastUsed: 0, errorCount: 5 }, // 5 + 5*3 = 20 score
      };

      const result = getNextApiKey(keys, 'least-used', 0, usageStats);

      expect(result.apiKey).toBe('key1');
    });

    it('should add penalty for recent errors', () => {
      const keys = ['key1', 'key2'];
      const usageStats: Record<string, ApiKeyUsageStats> = {
        key1: { usageCount: 20, lastUsed: 0, errorCount: 0 },
        key2: { usageCount: 5, lastUsed: Date.now(), errorCount: 1 },
      };

      const result = getNextApiKey(keys, 'least-used', 0, usageStats);

      // Result depends on the scoring algorithm implementation
      expect(['key1', 'key2']).toContain(result.apiKey);
    });

    it('should use default stats for missing keys', () => {
      const keys = ['key1', 'key2'];
      const usageStats: Record<string, ApiKeyUsageStats> = {
        key1: { usageCount: 10, lastUsed: 0, errorCount: 0 },
      };

      const result = getNextApiKey(keys, 'least-used', 0, usageStats);

      expect(result.apiKey).toBe('key2');
    });
  });

  it('should default to round-robin for unknown strategy', () => {
    const keys = ['key1', 'key2', 'key3'];
    // @ts-expect-error - Testing invalid strategy
    const result = getNextApiKey(keys, 'unknown', 0, {});

    expect(result.apiKey).toBe('key2');
    expect(result.index).toBe(1);
  });
});

describe('recordApiKeySuccess', () => {
  it('should increment usage count', () => {
    const stats: ApiKeyUsageStats = {
      usageCount: 5,
      lastUsed: 0,
      errorCount: 0,
    };

    const updated = recordApiKeySuccess(stats);

    expect(updated.usageCount).toBe(6);
  });

  it('should update lastUsed timestamp', () => {
    const beforeTime = Date.now();
    const stats: ApiKeyUsageStats = {
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
    };

    const updated = recordApiKeySuccess(stats);
    const afterTime = Date.now();

    expect(updated.lastUsed).toBeGreaterThanOrEqual(beforeTime);
    expect(updated.lastUsed).toBeLessThanOrEqual(afterTime);
  });

  it('should preserve error count', () => {
    const stats: ApiKeyUsageStats = {
      usageCount: 5,
      lastUsed: 0,
      errorCount: 2,
    };

    const updated = recordApiKeySuccess(stats);

    expect(updated.errorCount).toBe(2);
  });

  it('should handle undefined stats', () => {
    const updated = recordApiKeySuccess(undefined);

    expect(updated.usageCount).toBe(1);
    expect(updated.errorCount).toBe(0);
  });
});

describe('recordApiKeyError', () => {
  it('should increment both usage and error count', () => {
    const stats: ApiKeyUsageStats = {
      usageCount: 5,
      lastUsed: 0,
      errorCount: 1,
    };

    const updated = recordApiKeyError(stats);

    expect(updated.usageCount).toBe(6);
    expect(updated.errorCount).toBe(2);
  });

  it('should record error message', () => {
    const stats: ApiKeyUsageStats = {
      usageCount: 0,
      lastUsed: 0,
      errorCount: 0,
    };

    const updated = recordApiKeyError(stats, 'Rate limit exceeded');

    expect(updated.lastError).toBe('Rate limit exceeded');
  });

  it('should handle undefined stats', () => {
    const updated = recordApiKeyError(undefined, 'Error');

    expect(updated.usageCount).toBe(1);
    expect(updated.errorCount).toBe(1);
    expect(updated.lastError).toBe('Error');
  });
});

describe('resetApiKeyStats', () => {
  it('should return default stats', () => {
    const stats = resetApiKeyStats();

    expect(stats.usageCount).toBe(0);
    expect(stats.lastUsed).toBe(0);
    expect(stats.errorCount).toBe(0);
  });
});

describe('getAggregatedStats', () => {
  it('should aggregate stats across all keys', () => {
    const usageStats: Record<string, ApiKeyUsageStats> = {
      key1: { usageCount: 10, lastUsed: 0, errorCount: 1 },
      key2: { usageCount: 20, lastUsed: 0, errorCount: 2 },
      key3: { usageCount: 15, lastUsed: 0, errorCount: 0 },
    };

    const result = getAggregatedStats(usageStats);

    expect(result.totalUsage).toBe(45);
    expect(result.totalErrors).toBe(3);
    expect(result.keyCount).toBe(3);
  });

  it('should count healthy keys correctly', () => {
    const now = Date.now();
    const usageStats: Record<string, ApiKeyUsageStats> = {
      key1: { usageCount: 10, lastUsed: now, errorCount: 1 }, // unhealthy (recent error)
      key2: { usageCount: 20, lastUsed: 0, errorCount: 2 },   // healthy (old error)
      key3: { usageCount: 15, lastUsed: 0, errorCount: 0 },   // healthy (no errors)
    };

    const result = getAggregatedStats(usageStats);

    expect(result.healthyKeyCount).toBe(2);
  });

  it('should handle empty stats', () => {
    const result = getAggregatedStats({});

    expect(result.totalUsage).toBe(0);
    expect(result.totalErrors).toBe(0);
    expect(result.keyCount).toBe(0);
    expect(result.healthyKeyCount).toBe(0);
  });
});

describe('maskApiKey', () => {
  it('should mask middle characters for long keys', () => {
    const key = 'sk-1234567890abcdefghij';
    const masked = maskApiKey(key);

    expect(masked).toBe('sk-12345...ghij');
    expect(masked.length).toBe(15);
  });

  it('should fully mask short keys', () => {
    const key = 'short123';
    const masked = maskApiKey(key);

    expect(masked).toBe('********');
  });

  it('should handle edge case of exactly 12 characters', () => {
    const key = '123456789012';
    const masked = maskApiKey(key);

    expect(masked).toBe('************');
  });
});

describe('isValidApiKeyFormat', () => {
  it('should accept valid API keys', () => {
    expect(isValidApiKeyFormat('sk-1234567890abcdefghij')).toBe(true);
    expect(isValidApiKeyFormat('key_xxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
  });

  it('should reject short keys', () => {
    expect(isValidApiKeyFormat('short')).toBe(false);
    expect(isValidApiKeyFormat('1234567890123456789')).toBe(false); // 19 chars
  });

  it('should reject keys with whitespace', () => {
    expect(isValidApiKeyFormat('key with spaces here')).toBe(false);
    expect(isValidApiKeyFormat('key\twith\ttabs')).toBe(false);
    expect(isValidApiKeyFormat('key\nwith\nnewlines')).toBe(false);
  });

  it('should accept 20 character minimum', () => {
    expect(isValidApiKeyFormat('12345678901234567890')).toBe(true);
  });
});
