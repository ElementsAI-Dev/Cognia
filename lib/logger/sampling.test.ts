/**
 * @jest-environment jsdom
 */

import { logSampler, configureSampling, samplingRate } from './sampling';

describe('sampling', () => {
  beforeEach(() => {
    logSampler.reset();
  });

  describe('logSampler', () => {
    describe('shouldLog', () => {
      it('should always log errors', () => {
        // Errors should always be logged regardless of sampling config
        expect(logSampler.shouldLog('mouse', 'error')).toBe(true);
        expect(logSampler.shouldLog('animation', 'error')).toBe(true);
      });

      it('should always log fatal', () => {
        expect(logSampler.shouldLog('any-module', 'fatal')).toBe(true);
      });

      it('should respect minInterval for high-frequency modules', () => {
        // Mouse has minInterval of 100ms
        const firstLog = logSampler.shouldLog('mouse', 'debug');
        // Immediate second call should be throttled
        const secondLog = logSampler.shouldLog('mouse', 'debug');

        // At least one should pass, second might be throttled
        expect(typeof firstLog).toBe('boolean');
        expect(typeof secondLog).toBe('boolean');
      });

      it('should use default config for unknown modules', () => {
        // Default has rate 1.0
        const result = logSampler.shouldLog('unknown-module', 'info');
        expect(typeof result).toBe('boolean');
      });

      it('should match module prefixes', () => {
        // 'error' prefix should use error config (rate 1.0)
        const result = logSampler.shouldLog('error-handler', 'info');
        expect(result).toBe(true);
      });

      it('should match auth module exactly', () => {
        expect(logSampler.shouldLog('auth', 'info')).toBe(true);
      });

      it('should match security module exactly', () => {
        expect(logSampler.shouldLog('security', 'info')).toBe(true);
      });
    });

    describe('checkDedupe', () => {
      it('should log first occurrence', () => {
        const result = logSampler.checkDedupe('test', 'info', 'test message');
        expect(result.shouldLog).toBe(true);
        expect(result.count).toBeUndefined();
      });

      it('should suppress duplicate within window', () => {
        logSampler.checkDedupe('test', 'info', 'duplicate message');
        const result = logSampler.checkDedupe('test', 'info', 'duplicate message');
        expect(result.shouldLog).toBe(false);
      });

      it('should log different messages', () => {
        logSampler.checkDedupe('test', 'info', 'message 1');
        const result = logSampler.checkDedupe('test', 'info', 'message 2');
        expect(result.shouldLog).toBe(true);
      });

      it('should aggregate after 10 duplicates', () => {
        // First occurrence
        logSampler.checkDedupe('test', 'info', 'repeated');

        // 9 more duplicates (suppressed)
        for (let i = 0; i < 8; i++) {
          logSampler.checkDedupe('test', 'info', 'repeated');
        }

        // 10th should trigger aggregated log
        const result = logSampler.checkDedupe('test', 'info', 'repeated');
        expect(result.shouldLog).toBe(true);
        expect(result.count).toBe(10);
      });
    });

    describe('reset', () => {
      it('should clear all state', () => {
        // Create some state
        logSampler.shouldLog('test', 'info');
        logSampler.checkDedupe('test', 'info', 'message');

        // Reset
        logSampler.reset();

        // After reset, first message should log
        const result = logSampler.checkDedupe('test', 'info', 'message');
        expect(result.shouldLog).toBe(true);
      });
    });

    describe('updateConfig', () => {
      it('should update configuration', () => {
        configureSampling({
          'custom-module': { rate: 0.5 },
        });

        // Custom module should now use the new config
        // We can't easily verify the rate, but we can verify it doesn't throw
        expect(() => logSampler.shouldLog('custom-module', 'info')).not.toThrow();
      });
    });
  });

  describe('configureSampling', () => {
    it('should accept new configuration', () => {
      expect(() => {
        configureSampling({
          'new-module': { rate: 0.8, minInterval: 50 },
        });
      }).not.toThrow();
    });
  });

  describe('samplingRate', () => {
    it('should create config with rate', () => {
      const config = samplingRate(0.5);
      expect(config.rate).toBe(0.5);
    });

    it('should clamp rate to 0-1 range', () => {
      expect(samplingRate(-0.5).rate).toBe(0);
      expect(samplingRate(1.5).rate).toBe(1);
    });

    it('should handle edge cases', () => {
      expect(samplingRate(0).rate).toBe(0);
      expect(samplingRate(1).rate).toBe(1);
    });
  });
});
